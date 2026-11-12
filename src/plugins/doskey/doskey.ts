/**
 * DOSKEY - Command history and line editing
 *
 * Provides DOS-style command history navigation with arrow keys.
 * In real DOS, DOSKEY was a TSR (terminate-and-stay-resident) program
 * that enhanced the command line with history and macros.
 *
 * This plugin implements:
 * - ArrowUp: Recall previous command
 * - ArrowDown: Recall next command
 * - Command history tracking
 */

import type { TerminalPlugin, TerminalContext } from '../../core/types'

export interface DoskeyOptions {
  /** Maximum number of commands to remember (default: 50) */
  maxHistory?: number
}

// State keys used in shared context
const HISTORY_KEY = 'doskey:history'
const INDEX_KEY = 'doskey:index'
const SAVED_INPUT_KEY = 'doskey:savedInput'

/**
 * Creates a DOSKEY plugin for command history
 *
 * @example
 * ```tsx
 * import { Terminal } from 'react-dos-terminal'
 * import { doskey } from 'react-dos-terminal/plugins/doskey'
 *
 * <Terminal plugins={[doskey()]} />
 * // Type commands, then use Up/Down arrows to recall them
 * ```
 */
export function doskey(options?: DoskeyOptions): TerminalPlugin {
  const maxHistory = options?.maxHistory ?? 50

  return {
    name: 'doskey',

    setup: (ctx: TerminalContext) => {
      // Initialize history array if not exists
      if (!ctx.get<string[]>(HISTORY_KEY)) {
        ctx.set(HISTORY_KEY, [])
      }
      // Index starts at -1 (not navigating)
      ctx.set(INDEX_KEY, -1)
      ctx.set(SAVED_INPUT_KEY, '')
    },

    afterCommand: (cmd: string, args: string[], ctx: TerminalContext) => {
      // Rebuild the command line, re-quoting args that contained spaces
      const quoted = args.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg))
      const fullCommand = [cmd, ...quoted].join(' ')

      // Don't add empty commands or duplicates of the last command
      if (!fullCommand.trim()) return

      const history = ctx.get<string[]>(HISTORY_KEY) ?? []

      // Don't add if it's the same as the last command
      if (history.length > 0 && history[history.length - 1] === fullCommand) {
        return
      }

      // Add to history
      const newHistory = [...history, fullCommand]

      // Trim to max size
      if (newHistory.length > maxHistory) {
        newHistory.shift()
      }

      ctx.set(HISTORY_KEY, newHistory)

      // Reset navigation index
      ctx.set(INDEX_KEY, -1)
      ctx.set(SAVED_INPUT_KEY, '')
    },

    onKeyDown: (key: string, ctx: TerminalContext): boolean => {
      const history = ctx.get<string[]>(HISTORY_KEY) ?? []

      if (history.length === 0) {
        return false
      }

      let index = ctx.get<number>(INDEX_KEY) ?? -1

      if (key === 'ArrowUp') {
        // Save current input if starting to navigate
        if (index === -1) {
          ctx.set(SAVED_INPUT_KEY, ctx.input)
        }

        // Move up in history (towards older commands)
        if (index < history.length - 1) {
          index++
          ctx.set(INDEX_KEY, index)

          // Set input to historical command (from end of array)
          const historyIndex = history.length - 1 - index
          ctx.setInput(history[historyIndex])
        }

        return true // Handled
      }

      if (key === 'ArrowDown') {
        if (index > 0) {
          // Move down in history (towards newer commands)
          index--
          ctx.set(INDEX_KEY, index)

          // Set input to historical command
          const historyIndex = history.length - 1 - index
          ctx.setInput(history[historyIndex])
        } else if (index === 0) {
          // Return to saved input
          index = -1
          ctx.set(INDEX_KEY, index)
          ctx.setInput(ctx.get<string>(SAVED_INPUT_KEY) ?? '')
        }

        return true // Handled
      }

      return false // Not handled
    },
  }
}
