/**
 * Terminal - Core terminal component
 *
 * A minimal shell that:
 * - Renders terminal container with input
 * - Manages history (TerminalLine array)
 * - Handles Enter key to submit commands
 * - Shows "Bad command or file name" for unknown commands
 */

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import type {
  TerminalLine,
  TerminalTheme,
  PartialTheme,
  TerminalPlugin,
  TerminalContext,
  CommandHandler,
  TerminalProgram,
} from './types'
import { themePresets, type ThemePresetName } from '../themes'
import './terminal.css'

// ============================================================================
// Utilities
// ============================================================================

/** useLayoutEffect warns during server rendering on React 18, where it can't run anyway */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Shared default so an omitted plugins prop keeps a stable reference */
const NO_PLUGINS: TerminalPlugin[] = []

/** Generate unique ID for terminal lines */
let lineIdCounter = 0
function generateLineId(): string {
  // Counter + timestamp ensures uniqueness across instances and time
  return `line-${++lineIdCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Parse command line input, respecting quoted strings
 * Example: `echo "hello world"` -> { cmd: 'echo', args: ['hello world'] }
 */
export function parseCommandLine(input: string): { cmd: string; args: string[] } {
  const parts: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    // Only double quotes group words in DOS; apostrophes are literal (echo it's)
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) parts.push(current)

  // DOS accepted "cd..", "cd\" and "dir/w" with no space after the command
  const glued = parts[0]?.match(/^([^\\/.:]+)(\.\..*|[\\/].*)$/)
  if (glued) {
    parts.splice(0, 1, glued[1], glued[2])
  }

  return {
    cmd: parts[0]?.toLowerCase() || '',
    args: parts.slice(1),
  }
}

// ============================================================================
// Theme
// ============================================================================

/** Default theme - classic DOS look */
const DEFAULT_THEME: TerminalTheme = {
  colors: {
    background: '#000000',
    text: '#aaaaaa',
    prompt: '#aaaaaa',
    error: '#ff5555',
    command: '#ffffff',
    selection: '#444444',
  },
  cursor: {
    style: 'block',
    blink: true,
    blinkSpeed: 530,
  },
  promptFormat: '{cwd}>',
  font: {
    family: '"DOS VGA", "Consolas", "Courier New", monospace',
    size: '16px',
    lineHeight: 1.2,
  },
}

/** Merge partial theme with defaults, filtering out undefined values */
function mergeTheme(base: TerminalTheme, partial?: PartialTheme): TerminalTheme {
  if (!partial) return base

  // Helper to merge objects while filtering undefined values
  const mergeObjects = <T extends object>(
    baseObj: T,
    partialObj?: Partial<T>
  ): T => {
    if (!partialObj) return baseObj
    const result = { ...baseObj }
    for (const key of Object.keys(partialObj) as Array<keyof T>) {
      if (partialObj[key] !== undefined) {
        result[key] = partialObj[key] as T[keyof T]
      }
    }
    return result
  }

  return {
    colors: mergeObjects(base.colors, partial.colors),
    cursor: mergeObjects(base.cursor, partial.cursor),
    promptFormat: partial.promptFormat ?? base.promptFormat,
    font: base.font ? mergeObjects(base.font, partial.font) : undefined,
    effects: base.effects ? mergeObjects(base.effects, partial.effects) : undefined,
  }
}

// ============================================================================
// Component
// ============================================================================

export interface TerminalProps {
  /** Theme preset name or partial theme overrides */
  theme?: ThemePresetName | PartialTheme
  /** Initial working directory (default: 'C:\\') */
  initialCwd?: string
  /** Called when EXIT command runs */
  onExit?: () => void
  /** Welcome message lines shown on mount */
  welcomeMessage?: string[]
  /** Plugins to load */
  plugins?: TerminalPlugin[]
  /** Additional CSS class */
  className?: string
  /** Maximum history lines to keep (default: 1000, 0 = unlimited) */
  maxHistoryLines?: number
}

/** Imperative handle for controlling terminal from parent */
export interface TerminalHandle {
  /** Print output lines */
  print: (text: string | string[]) => void
  /** Print error lines */
  printError: (text: string | string[]) => void
  /** Clear terminal screen */
  clear: () => void
  /** Focus the terminal input */
  focus: () => void
  /** Execute a command programmatically */
  executeCommand: (command: string) => void
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal(
    {
      theme: themeOverrides,
      initialCwd = 'C:\\',
      onExit,
      welcomeMessage,
      plugins = NO_PLUGINS,
      className,
      maxHistoryLines = 1000,
    },
    ref
  ) {
    // Resolve theme - can be a preset name or partial overrides
    const resolvedThemeOverrides =
      typeof themeOverrides === 'string'
        ? themePresets[themeOverrides]
        : themeOverrides
    const theme = useMemo(
      () => mergeTheme(DEFAULT_THEME, resolvedThemeOverrides),
      [resolvedThemeOverrides]
    )

    // State
    const [history, setHistory] = useState<TerminalLine[]>(() => {
      if (welcomeMessage) {
        return welcomeMessage.map((text) => ({
          id: generateLineId(),
          type: 'output' as const,
          text,
        }))
      }
      return []
    })
    const [cwd, setCwd] = useState(initialCwd)
    const [input, setInput] = useState('')
    // Caret index within input, so the drawn cursor follows arrow keys/clicks
    const [caret, setCaret] = useState(0)
    // Shared state lives in a ref so plugins always read the latest value,
    // even within the same event (e.g. setup order, before/afterCommand)
    const sharedStateRef = useRef<Map<string, unknown>>(new Map())
    const [sharedStateVersion, setSharedStateVersion] = useState(0)
    const [activeProgram, setActiveProgram] = useState<TerminalProgram | null>(
      null
    )

    // Refs
    const viewportRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const pluginCleanupRef = useRef<Array<() => void>>([])

    const syncCaret = useCallback(() => {
      const el = inputRef.current
      if (el) setCaret(el.selectionStart ?? el.value.length)
    }, [])

    // Programmatic input changes (e.g. DOSKEY recall) move the caret too
    useIsomorphicLayoutEffect(syncCaret, [input, syncCaret])

    // Scroll to bottom when history changes
    useEffect(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight
      }
    }, [history])

    // Focus input on click
    const handleContainerClick = useCallback(() => {
      inputRef.current?.focus()
    }, [])

    // Format prompt string
    const prompt = theme.promptFormat?.replace('{cwd}', cwd) ?? `${cwd}>`

    // Helper to trim history to max lines (always returns new array to prevent mutation)
    const trimHistory = useCallback(
      (lines: TerminalLine[]): TerminalLine[] => {
        // Ensure non-negative (0 = unlimited)
        const limit = Math.max(0, maxHistoryLines)
        if (limit === 0 || lines.length <= limit) {
          return [...lines] // Always return new array to prevent mutation risk
        }
        return lines.slice(-limit)
      },
      [maxHistoryLines]
    )

    // Print helper
    const print = useCallback(
      (lines: string | string[]) => {
        const arr = Array.isArray(lines) ? lines : [lines]
        setHistory((prev) =>
          trimHistory([
            ...prev,
            ...arr.map((text) => ({
              id: generateLineId(),
              type: 'output' as const,
              text,
            })),
          ])
        )
      },
      [trimHistory]
    )

    // Print error helper
    const printError = useCallback(
      (lines: string | string[]) => {
        const arr = Array.isArray(lines) ? lines : [lines]
        setHistory((prev) =>
          trimHistory([
            ...prev,
            ...arr.map((text) => ({
              id: generateLineId(),
              type: 'error' as const,
              text,
            })),
          ])
        )
      },
      [trimHistory]
    )

    // Clear helper
    const clear = useCallback(() => {
      setHistory([])
    }, [])

    // Update last line helper (for progress bars)
    const updateLastLine = useCallback((text: string) => {
      setHistory((prev) => {
        if (prev.length === 0) return prev
        const newHistory = [...prev]
        const lastLine = newHistory[newHistory.length - 1]
        newHistory[newHistory.length - 1] = { ...lastLine, text }
        return newHistory
      })
    }, [])

    // Shared state helpers
    const getSharedState = useCallback(
      <T,>(key: string): T | undefined => {
        return sharedStateRef.current.get(key) as T | undefined
      },
      []
    )

    const setSharedStateValue = useCallback((key: string, value: unknown) => {
      sharedStateRef.current.set(key, value)
      // Re-render so plugin render() output reflects the change
      setSharedStateVersion((v) => v + 1)
    }, [])

    // Collect and memoize commands from plugins (with collision warning)
    const commands = useMemo(() => {
      const result: Record<string, CommandHandler> = {}
      for (const plugin of plugins) {
        if (plugin.commands) {
          for (const [name, handler] of Object.entries(plugin.commands)) {
            // Input is lowercased before lookup, so register lowercase too
            const cmd = name.toLowerCase()
            if (result[cmd]) {
              console.warn(
                `[react-dos-terminal] Command "${cmd}" from plugin "${plugin.name}" overrides existing command`
              )
            }
            result[cmd] = handler
          }
        }
      }
      return result
    }, [plugins])

    const commandNames = useMemo(() => Object.keys(commands).sort(), [commands])

    // Memoized context object
    const ctx: TerminalContext = useMemo(
      () => ({
        cwd,
        setCwd,
        print,
        printError,
        updateLastLine,
        clear,
        exit: onExit ?? (() => {}),
        get: getSharedState,
        set: setSharedStateValue,
        history,
        setActiveProgram,
        input,
        setInput,
        commands: commandNames,
      }),
      [
        cwd,
        setCwd,
        print,
        printError,
        updateLastLine,
        clear,
        onExit,
        getSharedState,
        setSharedStateValue,
        history,
        setActiveProgram,
        input,
        setInput,
        commandNames,
        sharedStateVersion,
      ]
    )

    // setup() runs once, but plugins often keep its ctx for later (e.g. in
    // closures). Hand them a view that always reads the latest render's ctx.
    const ctxRef = useRef(ctx)
    useIsomorphicLayoutEffect(() => {
      ctxRef.current = ctx
    }, [ctx])
    const liveCtx = useMemo(
      () =>
        new Proxy({} as TerminalContext, {
          get: (_target, key) => ctxRef.current[key as keyof TerminalContext],
        }),
      []
    )

    // Track initial plugins reference for change detection
    const initialPluginsRef = useRef(plugins)

    // Warn if plugins change (they should be memoized)
    useEffect(() => {
      if (plugins !== initialPluginsRef.current) {
        console.warn(
          '[react-dos-terminal] plugins prop changed after mount. ' +
            'Plugins should be memoized with useMemo to prevent re-initialization issues. ' +
            'New plugins will not have setup() called.'
        )
      }
    }, [plugins])

    // Plugin lifecycle - setup and cleanup
    // IMPORTANT: Runs only on mount. Plugins must be memoized to prevent issues.
    useEffect(() => {
      const cleanupFns: Array<() => void> = []

      // Run setup for each plugin
      for (const plugin of plugins) {
        if (plugin.setup) {
          const result = plugin.setup(liveCtx)
          // Handle async setup
          if (result instanceof Promise) {
            result.catch((err) =>
              console.error(
                `[react-dos-terminal] Plugin "${plugin.name}" setup error:`,
                err
              )
            )
          }
        }
        if (plugin.cleanup) {
          cleanupFns.push(plugin.cleanup)
        }
      }

      pluginCleanupRef.current = cleanupFns

      // Cleanup on unmount
      return () => {
        for (const cleanup of pluginCleanupRef.current) {
          try {
            cleanup()
          } catch (err) {
            console.error('[react-dos-terminal] Plugin cleanup error:', err)
          }
        }
      }
      // Only run on mount/unmount - plugins array reference MUST be stable (use useMemo)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Execute a parsed command with plugin hooks
    const runCommand = useCallback(
      (cmd: string, args: string[]) => {
        // Run beforeCommand hooks
        let handled = false
        for (const plugin of plugins) {
          if (plugin.beforeCommand) {
            try {
              const result = plugin.beforeCommand(cmd, args, ctx)
              if (result?.handled) {
                handled = true
                if (result.output) {
                  print(result.output)
                }
                break
              }
            } catch (err) {
              console.error(`[react-dos-terminal] Plugin "${plugin.name}" beforeCommand error:`, err)
            }
          }
        }

        // Try to execute command
        if (!handled) {
          const handler = commands[cmd]
          if (handler) {
            try {
              const result = handler(args, ctx)
              if (result && result.output) {
                print(result.output)
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err)
              printError(`Error: ${message}`)
              console.error(`[react-dos-terminal] Command "${cmd}" error:`, err)
            }
          } else {
            // Unknown command
            printError('Bad command or file name')
          }
        }

        // Run afterCommand hooks
        for (const plugin of plugins) {
          if (plugin.afterCommand) {
            try {
              plugin.afterCommand(cmd, args, ctx)
            } catch (err) {
              console.error(`[react-dos-terminal] Plugin "${plugin.name}" afterCommand error:`, err)
            }
          }
        }
      },
      [plugins, ctx, commands, print, printError]
    )

    // Handle command submission from input
    const handleSubmit = useCallback(() => {
      const trimmed = input.trim()

      // If there's an active program, route input to it
      if (activeProgram?.handleInput) {
        // Add input to history (no prompt when in program mode)
        setHistory((prev) =>
          trimHistory([
            ...prev,
            { id: generateLineId(), type: 'command', text: trimmed },
          ])
        )

        const result = activeProgram.handleInput(trimmed, ctx)
        if (result?.output) {
          print(result.output)
        }

        setInput('')
        return
      }

      // Add command to history
      setHistory((prev) =>
        trimHistory([
          ...prev,
          { id: generateLineId(), type: 'command', text: `${prompt}${trimmed}` },
        ])
      )

      // Parse and run command
      if (trimmed) {
        const { cmd, args } = parseCommandLine(trimmed)
        runCommand(cmd, args)
      }

      setInput('')
    }, [input, prompt, runCommand, trimHistory, activeProgram, ctx, print])

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        print,
        printError,
        clear,
        focus: () => inputRef.current?.focus(),
        executeCommand: (command: string) => {
          const { cmd, args } = parseCommandLine(command)

          // Add command to history
          setHistory((prev) =>
            trimHistory([
              ...prev,
              {
                id: generateLineId(),
                type: 'command',
                text: `${prompt}${command}`,
              },
            ])
          )

          // Run the command
          runCommand(cmd, args)
        },
      }),
      [print, printError, clear, prompt, runCommand, trimHistory]
    )

    // Handle keydown
    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        // An active program gets first pick of keys (e.g. arrows for games)
        if (activeProgram?.handleKeyDown) {
          try {
            if (activeProgram.handleKeyDown(e.key, ctx, e)) {
              e.preventDefault()
              return
            }
          } catch (err) {
            console.error('[react-dos-terminal] Program onKeyDown error:', err)
          }
        }

        // Then let plugins handle key events
        for (const plugin of plugins) {
          if (plugin.onKeyDown) {
            try {
              const handled = plugin.onKeyDown(e.key, ctx, e)
              if (handled) {
                e.preventDefault()
                return
              }
            } catch (err) {
              console.error(`[react-dos-terminal] Plugin "${plugin.name}" onKeyDown error:`, err)
            }
          }
        }

        if (e.key === 'Enter') {
          e.preventDefault()
          handleSubmit()
        }
      },
      [handleSubmit, plugins, ctx, activeProgram]
    )

    // CSS custom properties from theme
    const cssVars = useMemo(
      () =>
        ({
          '--terminal-bg': theme.colors.background,
          '--terminal-text': theme.colors.text,
          '--terminal-prompt': theme.colors.prompt,
          '--terminal-error': theme.colors.error,
          '--terminal-command': theme.colors.command,
          '--terminal-selection': theme.colors.selection ?? theme.colors.text,
          '--terminal-cursor-color': theme.cursor.color ?? theme.colors.text,
          '--terminal-font-family':
            theme.font?.family ?? DEFAULT_THEME.font!.family,
          '--terminal-font-size': theme.font?.size ?? DEFAULT_THEME.font!.size,
          '--terminal-line-height':
            theme.font?.lineHeight ?? DEFAULT_THEME.font!.lineHeight,
          '--terminal-cursor-blink-speed': `${theme.cursor.blinkSpeed ?? 530}ms`,
          ...Object.assign({}, ...plugins.map((p) => p.cssVariables)),
        }) as CSSProperties,
      [theme, plugins]
    )

    // Cursor class
    const cursorClass = `dos-terminal__cursor dos-terminal__cursor--${theme.cursor.style}${
      theme.cursor.blink ? ' dos-terminal__cursor--blink' : ''
    }`

    return (
      <div
        className={`dos-terminal ${className ?? ''}`}
        style={cssVars}
        onClick={handleContainerClick}
        role="application"
        aria-label="DOS Terminal"
      >
        {/* Scrolls independently so plugin overlays stay pinned to the frame */}
        <div ref={viewportRef} className="dos-terminal__viewport">
          {/* History */}
          <div className="dos-terminal__history" role="log" aria-live="polite">
            {history.map((line) => (
              <div
                key={line.id}
                className={`dos-terminal__line dos-terminal__line--${line.type}`}
              >
                {line.text}
              </div>
            ))}
          </div>

          {/* Input line */}
          <div className="dos-terminal__input-line">
            {!activeProgram && (
              <span className="dos-terminal__prompt" aria-hidden="true">
                {prompt}
              </span>
            )}
            <div className="dos-terminal__input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="dos-terminal__input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onSelect={syncCaret}
                onKeyDown={handleKeyDown}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                aria-label={`Command input. Current directory: ${cwd}`}
              />
              {/* Mirror text before the caret to position the cursor */}
              <span className="dos-terminal__input-mirror" aria-hidden="true">
                {input.slice(0, caret)}
              </span>
              <span className={cursorClass} aria-hidden="true" />
            </div>
          </div>

          {/* Active program render */}
          {activeProgram?.render?.()}
        </div>

        {/* Plugin renders */}
        {plugins.map((plugin) =>
          plugin.render ? (
            <div key={plugin.name}>{plugin.render(ctx)}</div>
          ) : null
        )}
      </div>
    )
  }
)
