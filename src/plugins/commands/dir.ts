/**
 * DIR - Directory listing command
 *
 * Lists files and folders in the current or specified directory.
 * Classic DOS command since the beginning.
 *
 * Supports flags:
 * - /W - Wide format (5 columns, no details)
 * - /P - Pause after each screenful
 */

import type { FileNode, TerminalContext, TerminalPlugin, TerminalProgram } from '../../core/types'
import type { FilesystemAPI } from '../filesystem/filesystem'

export interface DirOptions {
  /** Lines per screen for DIR /P (default: 23, a 25-row screen minus the prompt) */
  pageSize?: number
}

const PAUSE_PROMPT = 'Press any key to continue . . .'

/** Keys that shouldn't count as "any key" for the /P pause */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'])

/** Parsed DIR arguments */
interface DirArgs {
  path: string | null
  wide: boolean
  pause: boolean
}

/**
 * Parse DIR arguments to extract path and flags
 */
function parseDirArgs(args: string[]): DirArgs {
  const options: DirArgs = {
    path: null,
    wide: false,
    pause: false,
  }

  for (const arg of args) {
    const upper = arg.toUpperCase()
    if (upper === '/W') {
      options.wide = true
    } else if (upper === '/P') {
      options.pause = true
    } else if (!arg.startsWith('/')) {
      // Not a flag, must be a path
      options.path = arg
    }
    // Ignore unknown flags (DOS did too)
  }

  return options
}

/**
 * Creates a DIR command plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'retro-dos-terminal'
 * import { filesystem } from 'retro-dos-terminal/plugins/filesystem'
 * import { dir } from 'retro-dos-terminal/plugins/commands'
 *
 * <Terminal plugins={[filesystem({ files }), dir()]} />
 * // Type "dir" to list current directory
 * // Type "dir GAMES" to list the GAMES folder
 * // Type "dir /w" for wide format (5 columns)
 * // Type "dir /p" to pause after each screenful
 * ```
 */
export function dir(dirOptions?: DirOptions): TerminalPlugin {
  const pageSize = Math.max(2, dirOptions?.pageSize ?? 23)

  return {
    name: 'dir',
    commands: {
      dir: (args, ctx) => {
        const fs = ctx.get<FilesystemAPI>('filesystem')

        if (!fs) {
          return {
            output: ['DIR requires the filesystem plugin'],
            handled: true,
          }
        }

        // Parse arguments
        const options = parseDirArgs(args)

        // Determine which path to list
        let targetPath = ctx.cwd
        if (options.path) {
          targetPath = fs.resolvePath(ctx.cwd, options.path)
        }

        // Get directory contents
        const nodes = fs.readDir(targetPath)

        if (!nodes) {
          return {
            output: ['Directory not found'],
            handled: true,
          }
        }

        // Use wide or standard format
        const output = options.wide
          ? formatWide(targetPath, nodes)
          : formatStandard(targetPath, nodes)

        if (options.pause && output.length > pageSize) {
          return { output: startPager(output, pageSize, targetPath, ctx), handled: true }
        }

        return { output, handled: true }
      },
    },
  }
}

/**
 * Show the first page and hand keyboard control to a pager that prints the
 * rest a page at a time, like DOS's "Press any key to continue . . ."
 * Returns the lines for the first page.
 */
function startPager(
  lines: string[],
  pageSize: number,
  targetPath: string,
  ctx: TerminalContext
): string[] {
  let position = pageSize

  const pager: TerminalProgram = {
    commands: [],
    isActive: true,
    start: () => {},
    stop: () => {},
    handleKeyDown: (key, keyCtx) => {
      if (MODIFIER_KEYS.has(key)) return true

      // The "(continuing ...)" header takes one line of the page
      const chunk = lines.slice(position, position + pageSize - 1)
      position += pageSize - 1
      const hasMore = position < lines.length

      keyCtx.print([`(continuing ${targetPath})`, ...chunk, ...(hasMore ? [PAUSE_PROMPT] : [])])
      if (!hasMore) {
        keyCtx.setActiveProgram(null)
      }
      return true
    },
  }

  ctx.setActiveProgram(pager)
  return [...lines.slice(0, position), PAUSE_PROMPT]
}

/**
 * Standard DIR format with full details
 */
function formatStandard(targetPath: string, nodes: FileNode[]): string[] {
  const output: string[] = []

  // Header - Volume info (DOS 6.22 style)
  const driveLetter = targetPath.charAt(0)
  output.push('')
  output.push(` Volume in drive ${driveLetter} is MS-DOS_622`)
  output.push(` Volume Serial Number is 1A2B-3C4D`)
  output.push(` Directory of ${targetPath}`)
  output.push('')

  // Track file and directory counts separately (DOS 6.22 style)
  let fileCount = 0
  let dirCount = 0
  let totalSize = 0

  // Add . and .. entries (DOS showed these in every dir except root)
  // These don't count toward file/dir totals
  const isRoot = /^[A-Z]:\\$/i.test(targetPath)
  if (!isRoot) {
    const defaultDateStr = formatDate()
    output.push(`.            <DIR>       ${defaultDateStr}`)
    output.push(`..           <DIR>       ${defaultDateStr}`)
  }

  // List entries
  for (const node of nodes) {
    const dateStr = formatDate(node.modified)
    if (node.type === 'folder') {
      dirCount++
      // Format: DOS          <DIR>       11-23-17  12:07a
      const name = formatFilename(node.name)
      output.push(`${name}<DIR>       ${dateStr}`)
    } else {
      fileCount++
      const size = node.size ?? 0
      totalSize += size
      // Format: COMMAND  COM     54,645 05-31-94   6:22a
      const name = formatFilename(node.name)
      const sizeStr = formatSize(size).padStart(10)
      output.push(`${name}${sizeStr} ${dateStr}`)
    }
  }

  // Footer (DOS 6.22 style - separate file and dir counts)
  output.push(`        ${fileCount} file(s)      ${formatSize(totalSize)} bytes`)
  output.push(`        ${dirCount} dir(s)       ${formatSize(104857600)} bytes free`)
  output.push('')

  return output
}

/**
 * Wide DIR format (/W) - 5 columns, directories in brackets
 */
function formatWide(targetPath: string, nodes: FileNode[]): string[] {
  const output: string[] = []

  // Header - Volume info (DOS 6.22 style)
  const driveLetter = targetPath.charAt(0)
  output.push('')
  output.push(` Volume in drive ${driveLetter} is MS-DOS_622`)
  output.push(` Volume Serial Number is 1A2B-3C4D`)
  output.push(` Directory of ${targetPath}`)
  output.push('')

  // Build list of formatted entries
  const entries: string[] = []
  let fileCount = 0
  let dirCount = 0
  let totalSize = 0
  const isRoot = /^[A-Z]:\\$/i.test(targetPath)

  // Add . and .. (DOS showed these in brackets too)
  // These don't count toward file/dir totals
  if (!isRoot) {
    entries.push('[.]')
    entries.push('[..]')
  }

  // Format each entry
  for (const node of nodes) {
    if (node.type === 'folder') {
      dirCount++
      // Directories in brackets: [GAMES]
      entries.push(`[${node.name}]`)
    } else {
      fileCount++
      // Files without brackets
      entries.push(node.name)
      totalSize += node.size ?? 0
    }
  }

  // Output in 5 columns, 15 chars each (DOS used ~15 char columns)
  const COLS = 5
  const COL_WIDTH = 15

  for (let i = 0; i < entries.length; i += COLS) {
    const row = entries.slice(i, i + COLS)
    const line = row.map((entry) => entry.padEnd(COL_WIDTH)).join('')
    output.push(line)
  }

  // Footer (DOS 6.22 style - separate file and dir counts)
  output.push(`        ${fileCount} file(s)      ${formatSize(totalSize)} bytes`)
  output.push(`        ${dirCount} dir(s)       ${formatSize(104857600)} bytes free`)
  output.push('')

  return output
}

/**
 * Format filename in DOS 8.3 style with proper spacing
 * Real DOS showed: NAME     EXT (8 chars + space + 3 chars, no dot)
 * Input: "README.TXT" -> "README   TXT"
 * Input: "AUTOEXEC.BAT" -> "AUTOEXEC BAT"
 * Input: "GAMES" -> "GAMES       "
 */
function formatFilename(name: string): string {
  const dotIndex = name.lastIndexOf('.')

  if (dotIndex === -1) {
    // No extension - pad to 12 chars (8 name + space + 3 ext space)
    return name.slice(0, 8).padEnd(12)
  }

  const baseName = name.slice(0, dotIndex).slice(0, 8) // Truncate to 8 chars
  const ext = name.slice(dotIndex + 1).slice(0, 3) // Truncate to 3 chars

  // Format: 8 chars for name + space + 3 chars for extension (no dot)
  return `${baseName.padEnd(8)} ${ext.padEnd(3)}`
}

/**
 * Format file size with thousands separator (DOS 6.22 style)
 */
function formatSize(size: number): string {
  return size.toLocaleString('en-US')
}

/**
 * Default date for files without a modified date (MS-DOS 6.22 release)
 */
const DEFAULT_DATE = new Date(1994, 4, 31, 6, 22) // May 31, 1994 6:22am

/**
 * Format a date in DOS style: MM-DD-YY  HH:MMa/p
 * Examples: "05-31-94   6:22a", "11-23-17  12:07p"
 */
function formatDate(date?: Date): string {
  const d = date ?? DEFAULT_DATE
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)

  let hours = d.getHours()
  const ampm = hours >= 12 ? 'p' : 'a'
  hours = hours % 12 || 12 // Convert to 12-hour, 0 becomes 12

  const minutes = String(d.getMinutes()).padStart(2, '0')

  // DOS format: hours not padded, right-aligned in 2 chars
  const timeStr = `${String(hours).padStart(2)}:${minutes}${ampm}`

  return `${month}-${day}-${year}  ${timeStr}`
}
