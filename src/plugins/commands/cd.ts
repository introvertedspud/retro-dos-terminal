/**
 * CD/CHDIR - Change Directory command
 *
 * Changes the current working directory.
 * Classic DOS command since the beginning.
 * Both CD and CHDIR are supported (DOS had both).
 */

import type { CommandHandler, TerminalPlugin } from '../../core/types'
import type { FilesystemAPI } from '../filesystem/filesystem'

/**
 * Creates a CD command plugin (also registers CHDIR alias)
 *
 * @example
 * ```tsx
 * import { Terminal } from 'react-dos-terminal'
 * import { filesystem } from 'react-dos-terminal/plugins/filesystem'
 * import { cd } from 'react-dos-terminal/plugins/commands'
 *
 * <Terminal plugins={[filesystem({ files }), cd()]} />
 * // Type "cd" or "chdir" to see current directory
 * // Type "cd GAMES" to change to GAMES folder
 * // Type "cd .." to go up one level
 * // Type "cd \" to go to root of current drive
 * // Type "cd C:\GAMES" for absolute path
 * // Type "D:" to switch to drive D
 * ```
 */
export function cd(): TerminalPlugin {
  // Shared handler for both cd and chdir
  const cdHandler: CommandHandler = (args, ctx) => {
    const fs = ctx.get<FilesystemAPI>('filesystem')

    if (!fs) {
      return {
        output: ['CD requires the filesystem plugin'],
        handled: true,
      }
    }

    // No arguments - print current directory
    if (args.length === 0) {
      return {
        output: [ctx.cwd],
        handled: true,
      }
    }

    const target = args[0]

    // Handle ".." - go up one level
    if (target === '..') {
      const newPath = goUpOneLevel(ctx.cwd)
      ctx.setCwd(newPath)
      return { handled: true }
    }

    // Handle "\" - go to root of current drive
    if (target === '\\') {
      const driveLetter = ctx.cwd.charAt(0).toUpperCase()
      ctx.setCwd(`${driveLetter}:\\`)
      return { handled: true }
    }

    // Resolve the path (handles both relative and absolute)
    const newPath = fs.resolvePath(ctx.cwd, target)

    // Check if it exists and is a directory
    if (!fs.exists(newPath)) {
      return {
        output: ['Invalid directory'],
        handled: true,
      }
    }

    if (!fs.isDirectory(newPath)) {
      return {
        output: ['Invalid directory'],
        handled: true,
      }
    }

    // Change to the new directory
    ctx.setCwd(newPath)
    return { handled: true }
  }

  return {
    name: 'cd',
    // Intercept drive letter commands (e.g., "D:" to switch drives)
    beforeCommand: (cmd, _args, ctx) => {
      // Check if command is a drive letter (e.g., "c:" or "D:")
      if (/^[a-z]:$/i.test(cmd)) {
        const fs = ctx.get<FilesystemAPI>('filesystem')
        if (!fs) {
          return {
            output: ['Drive switching requires the filesystem plugin'],
            handled: true,
          }
        }

        const driveLetter = cmd.charAt(0).toUpperCase()
        const newPath = `${driveLetter}:\\`

        // Check if drive exists in filesystem
        if (!fs.exists(newPath)) {
          return {
            output: ['Invalid drive specification'],
            handled: true,
          }
        }

        ctx.setCwd(newPath)
        return { handled: true }
      }
    },
    commands: {
      cd: cdHandler,
      chdir: cdHandler,
    },
  }
}

/**
 * Go up one level from a path
 * C:\GAMES -> C:\
 * C:\ -> C:\ (can't go above root)
 */
function goUpOneLevel(path: string): string {
  // Already at root (e.g., "C:\")
  if (path.match(/^[A-Z]:\\$/i)) {
    return path
  }

  // Remove trailing backslash if present
  const normalized = path.replace(/\\$/, '')

  // Find last backslash
  const lastSlash = normalized.lastIndexOf('\\')

  if (lastSlash === -1) {
    return path // No backslash, return as-is
  }

  // If last slash is at position 2 (e.g., "C:\GAMES"), return "C:\"
  if (lastSlash === 2) {
    return normalized.slice(0, 3) // "C:\"
  }

  // Otherwise, return everything before the last backslash
  return normalized.slice(0, lastSlash)
}
