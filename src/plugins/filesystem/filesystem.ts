/**
 * Filesystem Plugin
 *
 * Provides a virtual DOS-style filesystem for the terminal.
 * Other plugins can access the filesystem via ctx.get('filesystem').
 */

import type { TerminalPlugin, FileNode, FileSystem } from '../../core/types'

/** Filesystem API available to other plugins via ctx.get('filesystem') */
export interface FilesystemAPI {
  /** Get all nodes in a directory */
  readDir: (path: string) => FileNode[] | null
  /** Get a specific file by name from a directory */
  getFile: (dir: string, name: string) => FileNode | null
  /** Check if a path exists (file or folder) */
  exists: (path: string) => boolean
  /** Check if a path is a directory */
  isDirectory: (path: string) => boolean
  /** Resolve a relative path from a base directory */
  resolvePath: (from: string, to: string) => string
  /** Normalize a path (uppercase, proper slashes, trailing slash for dirs) */
  normalizePath: (path: string) => string
  /** Get the raw filesystem data */
  getFiles: () => FileSystem
}

export interface FilesystemOptions {
  /** The virtual filesystem structure */
  files: FileSystem
}

/**
 * Normalize a DOS path:
 * - Uppercase everything
 * - Use backslashes
 * - Remove trailing backslash (except for root)
 */
function normalizePath(path: string): string {
  let normalized = path.toUpperCase().replace(/\//g, '\\')

  // Remove trailing backslash unless it's root (e.g., "C:\")
  if (normalized.length > 3 && normalized.endsWith('\\')) {
    normalized = normalized.slice(0, -1)
  }

  return normalized
}

/**
 * Resolve a relative path from a base directory
 *
 * Handles:
 * - Absolute paths (C:\...)
 * - Root-relative paths (\GAMES)
 * - Parent directory (..)
 * - Current directory (.)
 * - Simple relative paths (GAMES, GAMES\SNAKE.EXE)
 */
function resolvePath(from: string, to: string): string {
  const normalizedTo = normalizePath(to)

  // If `to` is an absolute path (starts with drive letter), return it
  if (/^[A-Z]:\\/.test(normalizedTo)) {
    return normalizedTo
  }

  // Start from the normalized base, or the drive root for "\GAMES"-style paths
  let result = normalizePath(from)
  if (normalizedTo.startsWith('\\')) {
    result = result.slice(0, 3)
  }

  // Split the relative path into parts
  const parts = normalizedTo.split('\\').filter(Boolean)

  for (const part of parts) {
    if (part === '.') {
      // Current directory - do nothing
      continue
    } else if (part === '..') {
      // Parent directory - go up one level, stopping at the root (C:\)
      const lastSlash = result.lastIndexOf('\\')
      result = lastSlash > 2 ? result.slice(0, lastSlash) : result.slice(0, 3)
    } else {
      // Regular directory/file name - append
      result = result.endsWith('\\') ? result + part : result + '\\' + part
    }
  }

  return result
}

/**
 * Creates a filesystem plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'retro-dos-terminal'
 * import { filesystem } from 'retro-dos-terminal/plugins/filesystem'
 *
 * const files = {
 *   'C:\\': [
 *     { type: 'folder', name: 'GAMES' },
 *     { type: 'file', name: 'README.TXT', content: ['Hello!'] }
 *   ],
 *   'C:\\GAMES': [
 *     { type: 'file', name: 'SNAKE.EXE', executable: true }
 *   ]
 * }
 *
 * <Terminal plugins={[filesystem({ files })]} />
 * ```
 */
export function filesystem(options: FilesystemOptions): TerminalPlugin {
  const { files } = options

  // Normalize all keys in the filesystem
  const normalizedFiles: FileSystem = {}
  for (const [path, nodes] of Object.entries(files)) {
    normalizedFiles[normalizePath(path)] = nodes
  }

  // Create the API object
  const api: FilesystemAPI = {
    readDir: (path: string): FileNode[] | null => {
      const normalized = normalizePath(path)
      return normalizedFiles[normalized] ?? null
    },

    getFile: (dir: string, name: string): FileNode | null => {
      const nodes = api.readDir(dir)
      if (!nodes) return null

      const upperName = name.toUpperCase()
      return nodes.find((n) => n.name.toUpperCase() === upperName) ?? null
    },

    exists: (path: string): boolean => {
      const normalized = normalizePath(path)

      // Check if it's a directory
      if (normalizedFiles[normalized]) {
        return true
      }

      // Check if it's a file in a parent directory
      const lastSlash = normalized.lastIndexOf('\\')
      if (lastSlash >= 2) {
        // For root files (C:\FILE.TXT), lastSlash is 2, parentDir is "C:\"
        // For nested files (C:\DIR\FILE.TXT), lastSlash is > 2
        const parentDir = lastSlash === 2 ? normalized.slice(0, 3) : normalized.slice(0, lastSlash)
        const fileName = normalized.slice(lastSlash + 1)
        const file = api.getFile(parentDir, fileName)
        return file !== null
      }

      // No backslash - this is a relative filename only (e.g., "README.TXT")
      // This shouldn't happen with proper path resolution, but handle it gracefully
      if (lastSlash === -1) {
        return false
      }

      return false
    },

    isDirectory: (path: string): boolean => {
      const normalized = normalizePath(path)
      return normalizedFiles[normalized] !== undefined
    },

    resolvePath,
    normalizePath,

    getFiles: () => normalizedFiles,
  }

  return {
    name: 'filesystem',

    setup: (ctx) => {
      // Store the filesystem API in shared state for other plugins
      ctx.set('filesystem', api)
    },

    // No commands - this plugin just provides data to other plugins
  }
}
