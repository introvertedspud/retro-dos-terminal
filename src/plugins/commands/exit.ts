/**
 * EXIT - Exit terminal command
 *
 * Exits the terminal by calling the onExit callback.
 * Classic DOS command for leaving COMMAND.COM.
 */

import type { TerminalPlugin } from '../../core/types'

/**
 * Creates an EXIT command plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'retro-dos-terminal'
 * import { exit } from 'retro-dos-terminal/plugins/commands'
 *
 * <Terminal
 *   plugins={[exit()]}
 *   onExit={() => console.log('Terminal closed')}
 * />
 * // Type "exit" to trigger onExit callback
 * ```
 */
export function exit(): TerminalPlugin {
  return {
    name: 'exit',
    commands: {
      exit: (_args, ctx) => {
        ctx.exit()
        return { handled: true }
      },
    },
  }
}
