/**
 * VER - Display version command
 *
 * Shows the DOS version.
 * Classic DOS command since the beginning.
 */

import type { TerminalPlugin } from '../../core/types'

export interface VerOptions {
  /** Version string to display (default: "MS-DOS Version 6.22") */
  version?: string
}

/**
 * Creates a VER command plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'react-dos-terminal'
 * import { ver } from 'react-dos-terminal/plugins/commands'
 *
 * // Default MS-DOS 6.22 version
 * <Terminal plugins={[ver()]} />
 *
 * // Custom version
 * <Terminal plugins={[ver({ version: 'SpudOS Version 1.0' })]} />
 * ```
 */
export function ver(options?: VerOptions): TerminalPlugin {
  const version = options?.version ?? 'MS-DOS Version 6.22'

  return {
    name: 'ver',
    commands: {
      ver: () => {
        return {
          output: ['', version, ''],
          handled: true,
        }
      },
    },
  }
}
