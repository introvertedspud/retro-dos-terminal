/**
 * DOS Preset - Batteries included terminal
 *
 * A ready-to-use DOS terminal with all standard commands pre-configured.
 * Just add your filesystem and go!
 */

import { forwardRef, useMemo } from 'react'
import { Terminal, type TerminalHandle } from '../core/terminal'
import type { FileSystem } from '../core/types'
import type { ThemePresetName } from '../themes'
import type { PartialTheme } from '../core/types'

// Plugins
import { filesystem } from '../plugins/filesystem'
import { doskey } from '../plugins/doskey'
import { cls } from '../plugins/commands/cls'
import { dir } from '../plugins/commands/dir'
import { cd } from '../plugins/commands/cd'
import { type as typeCmd } from '../plugins/commands/type'
import { help } from '../plugins/commands/help'
import { echo } from '../plugins/commands/echo'
import { ver } from '../plugins/commands/ver'
import { exit } from '../plugins/commands/exit'

export interface DOSTerminalProps {
  /** Virtual filesystem structure */
  filesystem?: FileSystem
  /** Theme preset name or partial theme overrides (default: 'dos') */
  theme?: ThemePresetName | PartialTheme
  /** Initial working directory (default: 'C:\\') */
  initialCwd?: string
  /** Called when EXIT command runs */
  onExit?: () => void
  /** Welcome message lines shown on mount */
  welcomeMessage?: string[]
  /** Version string for VER command (default: 'MS-DOS Version 6.22') */
  version?: string
  /** Maximum command history entries for DOSKEY (default: 50) */
  maxHistory?: number
  /** Additional CSS class */
  className?: string
  /** Maximum history lines to keep in display (default: 1000, 0 = unlimited) */
  maxHistoryLines?: number
}

/**
 * DOSTerminal - Ready-to-use DOS terminal with all standard commands
 *
 * Includes: CLS, DIR, CD, TYPE, HELP, ECHO, VER, EXIT, and DOSKEY (arrow key history)
 *
 * @example Basic usage
 * ```tsx
 * import { DOSTerminal } from 'retro-dos-terminal/presets/dos'
 * import type { FileSystem } from 'retro-dos-terminal'
 *
 * const files: FileSystem = {
 *   'C:\\': [
 *     { type: 'folder', name: 'GAMES' },
 *     { type: 'file', name: 'README.TXT', content: ['Hello!'] },
 *   ],
 * }
 *
 * <DOSTerminal
 *   filesystem={files}
 *   welcomeMessage={['Welcome to DOS!', '']}
 *   onExit={() => console.log('Bye!')}
 * />
 * ```
 *
 * @example With all options
 * ```tsx
 * <DOSTerminal
 *   filesystem={files}
 *   theme="phosphor-green"        // 'dos' | 'phosphor-green' | 'phosphor-amber' | custom
 *   initialCwd="C:\\GAMES"        // Starting directory
 *   welcomeMessage={['SpudOS v1.0']}
 *   version="SpudOS Version 1.0"  // Custom VER output
 *   maxHistory={100}              // DOSKEY history limit
 *   maxHistoryLines={500}         // Display history limit
 *   onExit={() => navigate('/')}
 *   className="my-terminal"
 * />
 * ```
 */
export const DOSTerminal = forwardRef<TerminalHandle, DOSTerminalProps>(
  function DOSTerminal(
    {
      filesystem: files,
      theme = 'dos',
      initialCwd = 'C:\\',
      onExit,
      welcomeMessage,
      version,
      maxHistory,
      className,
      maxHistoryLines,
    },
    ref
  ) {
    // Memoize plugins array to prevent recreation on every render
    const plugins = useMemo(
      () => [
        // Core plugins
        ...(files ? [filesystem({ files })] : []),
        doskey({ maxHistory }),

        // Standard DOS commands
        cls(),
        dir(),
        cd(),
        typeCmd(),
        help(),
        echo(),
        ver({ version }),
        exit(),
      ],
      [files, maxHistory, version]
    )

    return (
      <Terminal
        ref={ref}
        theme={theme}
        initialCwd={initialCwd}
        onExit={onExit}
        welcomeMessage={welcomeMessage}
        plugins={plugins}
        className={className}
        maxHistoryLines={maxHistoryLines}
      />
    )
  }
)
