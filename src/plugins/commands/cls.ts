/**
 * CLS - Clear Screen command
 *
 * Clears all text from the terminal screen.
 * Classic DOS command since the beginning.
 */

import type { TerminalPlugin } from '../../core/types'

/**
 * Creates a CLS command plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'retro-dos-terminal'
 * import { cls } from 'retro-dos-terminal/plugins/commands'
 *
 * <Terminal plugins={[cls()]} />
 * // Type "cls" to clear the screen
 * ```
 */
export function cls(): TerminalPlugin {
  return {
    name: 'cls',
    commands: {
      cls: (_args, ctx) => {
        ctx.clear()
        // No output - screen is now empty
        return { handled: true }
      },
    },
  }
}
