/**
 * ECHO - Display message command
 *
 * Prints text to the terminal.
 * Classic DOS command for displaying messages.
 */

import type { TerminalPlugin } from '../../core/types'

/**
 * Creates an ECHO command plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'retro-dos-terminal'
 * import { echo } from 'retro-dos-terminal/plugins/commands'
 *
 * <Terminal plugins={[echo()]} />
 * // Type "echo Hello World" to print "Hello World"
 * // Type "echo" with no args to print blank line
 * ```
 */
export function echo(): TerminalPlugin {
  return {
    name: 'echo',
    commands: {
      echo: (args) => {
        // ECHO with no args prints a blank line (DOS behavior)
        if (args.length === 0) {
          return {
            output: [''],
            handled: true,
          }
        }

        // Join all arguments with spaces
        const message = args.join(' ')

        return {
          output: [message],
          handled: true,
        }
      },
    },
  }
}
