/**
 * Programs Plugin - Interactive .EXE program support
 *
 * Enables running interactive programs that take over terminal input.
 * Programs can handle their own input, render custom UI, and exit back to DOS.
 *
 * IMPORTANT: Programs require matching executable files in the filesystem.
 * The file must exist in the current directory and have `executable: true`.
 */

import type { TerminalPlugin, TerminalContext, TerminalProgram, CommandResult, FileNode } from '../../core/types'
import type { FilesystemAPI } from '../filesystem/filesystem'

export interface ProgramDefinition {
  /** Commands that launch this program (e.g., ['snake', 'snake.exe']) */
  commands: string[]
  /** Called when program starts */
  onStart: (ctx: TerminalContext) => void
  /** Called when program stops */
  onStop?: (ctx: TerminalContext) => void
  /** Handle text input while active - return handled: true to consume */
  onInput?: (input: string, ctx: TerminalContext) => CommandResult
  /** Handle key events while active - return true to consume */
  onKeyDown?: (key: string, ctx: TerminalContext) => boolean
  /** Render custom UI while active */
  render?: () => React.ReactNode
}

// State keys
const ACTIVE_PROGRAM_KEY = 'programs:active'

/**
 * Check if a filename matches any of the program's commands
 * Handles both with and without extension (e.g., 'HELLO' matches 'hello.exe')
 */
function matchesProgram(filename: string, commands: string[]): boolean {
  const upperFilename = filename.toUpperCase()
  const nameWithoutExt = upperFilename.replace(/\.(EXE|COM|BAT)$/i, '')

  for (const cmd of commands) {
    const upperCmd = cmd.toUpperCase()
    const cmdWithoutExt = upperCmd.replace(/\.(EXE|COM|BAT)$/i, '')

    // Match exact filename or name without extension
    if (upperFilename === upperCmd || nameWithoutExt === cmdWithoutExt) {
      return true
    }
  }
  return false
}

/**
 * Creates a programs plugin for running interactive .EXE files
 *
 * Programs are filesystem-aware: they only run if a matching executable
 * file exists in the current directory. The file must have `executable: true`.
 *
 * @example
 * ```tsx
 * import { programs, defineProgram } from 'react-dos-terminal/plugins/programs'
 * import { filesystem } from 'react-dos-terminal/plugins/filesystem'
 *
 * const helloProgram = defineProgram({
 *   commands: ['hello', 'hello.exe'],
 *   onStart: (ctx) => ctx.print('Hello! Type EXIT to quit.'),
 *   onInput: (input, ctx) => {
 *     if (input.toLowerCase() === 'exit') {
 *       ctx.get<() => void>('exitProgram')?.()
 *       return { handled: true }
 *     }
 *     ctx.print(`You said: ${input}`)
 *     return { handled: true }
 *   }
 * })
 *
 * // Filesystem must have a matching executable file
 * const files = {
 *   'C:\\': [
 *     { type: 'file', name: 'HELLO.EXE', executable: true }
 *   ]
 * }
 *
 * <Terminal plugins={[filesystem({ files }), programs([helloProgram])]} />
 * ```
 */
export function programs(programDefs: ProgramDefinition[]): TerminalPlugin {
  // Convert definitions to TerminalProgram objects
  const programMap = new Map<string, ProgramDefinition>()

  // Build command -> program mapping
  for (const def of programDefs) {
    for (const cmd of def.commands) {
      programMap.set(cmd.toLowerCase(), def)
    }
  }

  return {
    name: 'programs',

    beforeCommand: (cmd: string, args: string[], ctx: TerminalContext): CommandResult | void => {
      // Provide exitProgram helper fresh each time (so it has current ctx reference)
      ctx.set('exitProgram', () => {
        const activeDef = ctx.get<ProgramDefinition>(ACTIVE_PROGRAM_KEY)
        if (activeDef) {
          activeDef.onStop?.(ctx)
          ctx.set(ACTIVE_PROGRAM_KEY, null)
          ctx.setActiveProgram(null)
        }
      })

      // Check if a program is currently active
      const activeDef = ctx.get<ProgramDefinition>(ACTIVE_PROGRAM_KEY)

      if (activeDef) {
        // Route input to active program
        const fullInput = args.length > 0 ? `${cmd} ${args.join(' ')}` : cmd

        if (activeDef.onInput) {
          return activeDef.onInput(fullInput, ctx)
        }

        // Default: just print what they typed
        return { handled: true }
      }

      // Check if this command launches a program
      const programDef = programMap.get(cmd.toLowerCase())
      if (!programDef) {
        return // Not a program command, let normal processing continue
      }

      // Get filesystem API - required for program execution
      const fs = ctx.get<FilesystemAPI>('filesystem')
      if (!fs) {
        // No filesystem - can't run programs
        return
      }

      // Look for an executable file in the current directory that matches this program
      const dirContents = fs.readDir(ctx.cwd)
      if (!dirContents) {
        return // Directory doesn't exist
      }

      // Find a matching executable file
      const executableFile = dirContents.find((file: FileNode) => {
        if (file.type !== 'file') return false
        if (!file.executable) return false
        return matchesProgram(file.name, programDef.commands)
      })

      if (!executableFile) {
        // No matching executable found - let normal command processing continue
        // (will result in "Bad command or file name")
        return
      }

      // Create and activate the program
      const program: TerminalProgram = {
        commands: programDef.commands,
        isActive: true,
        start: (c) => programDef.onStart(c),
        stop: () => programDef.onStop?.(ctx),
        handleInput: programDef.onInput
          ? (input, c) => programDef.onInput!(input, c)
          : undefined,
        handleKeyDown: programDef.onKeyDown,
        render: programDef.render,
      }

      // Store in context and activate
      ctx.set(ACTIVE_PROGRAM_KEY, programDef)
      ctx.setActiveProgram(program)

      // Start the program
      programDef.onStart(ctx)

      return { handled: true }
    },

    onKeyDown: (key: string, ctx: TerminalContext): boolean => {
      const activeDef = ctx.get<ProgramDefinition>(ACTIVE_PROGRAM_KEY)

      if (!activeDef) {
        return false // No active program
      }

      // Let program handle special keys
      if (activeDef.onKeyDown) {
        return activeDef.onKeyDown(key, ctx)
      }

      return false
    },
  }
}
