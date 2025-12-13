/**
 * Filesystem Plugin
 *
 * Provides a virtual DOS-style filesystem for the terminal.
 * Other plugins can access the filesystem via ctx.get('filesystem').
 */

export { filesystem } from './filesystem'
export type { FilesystemAPI, FilesystemOptions } from './filesystem'
export type { FileNode, FileSystem } from '../../core/types'
