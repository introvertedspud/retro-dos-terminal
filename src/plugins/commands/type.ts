/**
 * TYPE - Display file contents command
 *
 * Displays the contents of a text file.
 * Classic DOS command since the beginning.
 */

import type { TerminalPlugin } from '../../core/types'
import type { FilesystemAPI } from '../filesystem/filesystem'

/**
 * Creates a TYPE command plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'retro-dos-terminal'
 * import { filesystem } from 'retro-dos-terminal/plugins/filesystem'
 * import { type } from 'retro-dos-terminal/plugins/commands'
 *
 * <Terminal plugins={[filesystem({ files }), type()]} />
 * // Type "type README.TXT" to display file contents
 * ```
 */
export function type(): TerminalPlugin {
  return {
    name: 'type',
    commands: {
      type: (args, ctx) => {
        const fs = ctx.get<FilesystemAPI>('filesystem')

        if (!fs) {
          return {
            output: ['TYPE requires the filesystem plugin'],
            handled: true,
          }
        }

        // TYPE requires a filename argument
        if (args.length === 0) {
          return {
            output: ['Required parameter missing'],
            handled: true,
          }
        }

        const filename = args[0]

        // Resolve the path
        const filePath = fs.resolvePath(ctx.cwd, filename)

        // Check if it exists
        if (!fs.exists(filePath)) {
          return {
            output: ['File not found'],
            handled: true,
          }
        }

        // Check if it's a directory
        if (fs.isDirectory(filePath)) {
          return {
            output: ['Access denied'],
            handled: true,
          }
        }

        // Get the file from the directory
        const parentPath = getParentPath(filePath)
        const fileName = getFileName(filePath)
        const file = fs.getFile(parentPath, fileName)

        if (!file) {
          return {
            output: ['File not found'],
            handled: true,
          }
        }

        // Check if it's an executable (DOS wouldn't TYPE .exe/.com files nicely)
        if (file.executable) {
          return {
            output: ['Access denied'],
            handled: true,
          }
        }

        // Check if file has content
        if (!file.content || file.content.length === 0) {
          // Empty file - return nothing (DOS did this)
          return {
            output: [],
            handled: true,
          }
        }

        // Return file contents
        return {
          output: file.content,
          handled: true,
        }
      },
    },
  }
}

/**
 * Get parent directory path from a full path
 * C:\DOCS\README.TXT -> C:\DOCS
 * C:\README.TXT -> C:\
 */
function getParentPath(path: string): string {
  const lastSlash = path.lastIndexOf('\\')

  // If last slash is at position 2 (e.g., C:\FILE.TXT), return root
  if (lastSlash === 2) {
    return path.slice(0, 3) // "C:\"
  }

  return path.slice(0, lastSlash)
}

/**
 * Get filename from a full path
 * C:\DOCS\README.TXT -> README.TXT
 */
function getFileName(path: string): string {
  const lastSlash = path.lastIndexOf('\\')
  return path.slice(lastSlash + 1)
}
