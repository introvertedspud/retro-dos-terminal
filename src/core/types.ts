/**
 * Core types for react-dos-terminal
 */

import type { ReactNode } from 'react'

// ============================================================================
// Terminal Output
// ============================================================================

/** A single line of terminal output */
export interface TerminalLine {
  /** Unique identifier for React keys */
  id: string
  /** Type of line - affects styling */
  type: 'command' | 'output' | 'error'
  /** The text content */
  text: string
}

// ============================================================================
// Theming
// ============================================================================

/** Cursor style options */
export type CursorStyle = 'block' | 'underline' | 'line'

/** Terminal color configuration */
export interface TerminalColors {
  /** Background color */
  background: string
  /** Default text color */
  text: string
  /** Prompt text color */
  prompt: string
  /** Error text color */
  error: string
  /** Command text color (what user typed) */
  command: string
  /** Text selection color */
  selection?: string
}

/** Cursor configuration */
export interface TerminalCursor {
  /** Cursor shape */
  style: CursorStyle
  /** Whether cursor blinks */
  blink: boolean
  /** Blink interval in ms (default: 530) */
  blinkSpeed?: number
  /** Cursor color (defaults to text color) */
  color?: string
}

/** Font configuration */
export interface TerminalFont {
  /** Font family */
  family: string
  /** Font size */
  size: string
  /** Line height multiplier */
  lineHeight: number
}

/** Optional visual effects */
export interface TerminalEffects {
  /** CRT scanline effect */
  scanlines?: boolean
  /** Phosphor glow effect */
  glow?: boolean
  /** Screen flicker effect */
  flicker?: boolean
  /** CRT screen curvature */
  crtCurvature?: boolean
}

/** Complete theme configuration */
export interface TerminalTheme {
  /** Color scheme */
  colors: TerminalColors
  /** Cursor settings */
  cursor: TerminalCursor
  /** Prompt format - use {cwd} for current directory */
  promptFormat?: string
  /** Font settings */
  font?: TerminalFont
  /** Visual effects */
  effects?: TerminalEffects
}

/** Partial theme for overrides */
export type PartialTheme = {
  colors?: Partial<TerminalColors>
  cursor?: Partial<TerminalCursor>
  promptFormat?: string
  font?: Partial<TerminalFont>
  effects?: Partial<TerminalEffects>
}

// ============================================================================
// Commands
// ============================================================================

/** Result returned by a command handler */
export interface CommandResult {
  /** Lines to output */
  output?: string[]
  /** If true, command was handled (stops further processing) */
  handled?: boolean
}

/** Command handler function */
export type CommandHandler = (
  args: string[],
  ctx: TerminalContext
) => CommandResult | void

// ============================================================================
// Plugins
// ============================================================================

/** Context provided to plugins */
export interface TerminalContext {
  /** Current working directory */
  cwd: string
  /** Update current working directory */
  setCwd: (path: string) => void
  /** Print output lines */
  print: (lines: string | string[]) => void
  /** Print error lines */
  printError: (lines: string | string[]) => void
  /** Update the last line of output (for progress bars) */
  updateLastLine: (text: string) => void
  /** Clear terminal screen */
  clear: () => void
  /** Exit terminal (calls onExit prop) */
  exit: () => void
  /** Get shared state by key */
  get: <T>(key: string) => T | undefined
  /** Set shared state */
  set: (key: string, value: unknown) => void
  /** Current terminal history */
  history: TerminalLine[]
  /** Set the active program (takes over input) */
  setActiveProgram: (program: TerminalProgram | null) => void
  /** Current input value */
  input: string
  /** Set input value */
  setInput: (value: string) => void
}

/** Plugin interface */
export interface TerminalPlugin {
  /** Unique plugin identifier */
  name: string

  /** Called when terminal initializes */
  setup?: (ctx: TerminalContext) => void | Promise<void>

  /** Called when terminal unmounts */
  cleanup?: () => void

  /** Commands this plugin provides */
  commands?: Record<string, CommandHandler>

  /** Intercept commands before execution (middleware style) */
  beforeCommand?: (
    cmd: string,
    args: string[],
    ctx: TerminalContext
  ) => CommandResult | void

  /** Intercept after command execution */
  afterCommand?: (
    cmd: string,
    args: string[],
    ctx: TerminalContext
  ) => void

  /** Handle keyboard events - return true to prevent default handling */
  onKeyDown?: (key: string, ctx: TerminalContext) => boolean

  /** Render additional UI (for effects, overlays, etc.) */
  render?: (ctx: TerminalContext) => ReactNode
}

// ============================================================================
// Programs
// ============================================================================

/** Interactive program that takes over the terminal */
export interface TerminalProgram {
  /** Commands that launch this program (e.g., ['snake', 'snake.exe']) */
  commands: string[]
  /** Whether the program is currently active */
  isActive: boolean
  /** Start the program */
  start: (ctx: TerminalContext) => void
  /** Stop the program */
  stop: () => void
  /** Handle text input while active */
  handleInput?: (input: string, ctx: TerminalContext) => CommandResult
  /** Handle key events while active */
  handleKeyDown?: (key: string, ctx: TerminalContext) => boolean
  /** Render custom UI while active */
  render?: () => ReactNode
}

// ============================================================================
// Filesystem
// ============================================================================

/** A node in the virtual filesystem */
export interface FileNode {
  /** Type of node */
  type: 'file' | 'folder'
  /** Name (e.g., 'README.TXT', 'GAMES') */
  name: string
  /** File size in bytes (files only) */
  size?: number
  /** File contents as lines (text files only) */
  content?: string[]
  /** Whether this is an executable */
  executable?: boolean
  /** Associated program (for executables) */
  program?: TerminalProgram
  /** Last modified date (shown in DIR listing) */
  modified?: Date
}

/** Virtual filesystem structure */
export type FileSystem = Record<string, FileNode[]>
