/**
 * HELP - Display available commands
 *
 * Lists common DOS commands.
 * Classic DOS command for getting help.
 */

import type { TerminalPlugin } from '../../core/types'

/**
 * Creates a HELP command plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'react-dos-terminal'
 * import { help } from 'react-dos-terminal/plugins/commands'
 *
 * <Terminal plugins={[help()]} />
 * // Type "help" to see available commands
 * ```
 */
export function help(): TerminalPlugin {
  return {
    name: 'help',
    commands: {
      help: () => {
        const output: string[] = []

        output.push('')
        output.push('For more information on a specific command, type HELP command-name.')
        output.push('')
        output.push('CD         Change directory')
        output.push('CHDIR      Change directory')
        output.push('CLS        Clear screen')
        output.push('DIR        List directory contents')
        output.push('ECHO       Display message')
        output.push('EXIT       Exit terminal')
        output.push('HELP       Display this help')
        output.push('TYPE       Display file contents')
        output.push('VER        Display version')
        output.push('')

        return { output, handled: true }
      },
    },
  }
}
