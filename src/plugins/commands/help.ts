/**
 * HELP - Display available commands
 *
 * Lists the commands installed in this terminal, and shows usage for a
 * single command via "HELP command" or the DOS-style "command /?".
 */

import type { TerminalPlugin } from '../../core/types'

export interface HelpOptions {
  /** One-line descriptions for custom commands, keyed by command name */
  descriptions?: Record<string, string>
  /** Detailed usage lines for custom commands, keyed by command name */
  usage?: Record<string, string[]>
}

/** One-line descriptions for the built-in commands */
const BUILTIN_DESCRIPTIONS: Record<string, string> = {
  cd: 'Displays the name of or changes the current directory.',
  chdir: 'Displays the name of or changes the current directory.',
  cls: 'Clears the screen.',
  dir: 'Displays a list of files and subdirectories in a directory.',
  echo: 'Displays messages.',
  exit: 'Quits the command interpreter.',
  help: 'Provides help information for commands.',
  type: 'Displays the contents of a text file.',
  ver: 'Displays the version.',
}

const CD_USAGE = [
  'Displays the name of or changes the current directory.',
  '',
  'CHDIR [drive:][path]',
  'CHDIR[..]',
  'CD [drive:][path]',
  'CD[..]',
  '',
  '  ..   Specifies that you want to change to the parent directory.',
  '',
  'Type CD without parameters to display the current drive and directory.',
  'Type drive: (for example, D:) to change drives.',
]

/** Detailed usage for the built-in commands (MS-DOS 6.22 style) */
const BUILTIN_USAGE: Record<string, string[]> = {
  cd: CD_USAGE,
  chdir: CD_USAGE,
  cls: ['Clears the screen.', '', 'CLS'],
  dir: [
    'Displays a list of files and subdirectories in a directory.',
    '',
    'DIR [drive:][path] [/P] [/W]',
    '',
    '  [drive:][path]',
    '              Specifies drive and directory to list.',
    '  /P          Pauses after each screenful of information.',
    '  /W          Uses wide list format.',
  ],
  echo: ['Displays messages.', '', 'ECHO [message]'],
  exit: ['Quits the command interpreter.', '', 'EXIT'],
  help: [
    'Provides help information for commands.',
    '',
    'HELP [command]',
    '',
    '  command - displays help information on that command.',
    '',
    'You can also type a command followed by /? (for example, DIR /?).',
  ],
  type: ['Displays the contents of a text file.', '', 'TYPE [drive:][path]filename'],
  ver: ['Displays the version.', '', 'VER'],
}

/**
 * Creates a HELP command plugin
 *
 * @example
 * ```tsx
 * import { Terminal } from 'retro-dos-terminal'
 * import { help } from 'retro-dos-terminal/plugins/commands'
 *
 * <Terminal plugins={[help()]} />
 * // Type "help" to list installed commands
 * // Type "help dir" or "dir /?" for usage
 *
 * // Describe your own commands
 * help({
 *   descriptions: { date: 'Displays the date.' },
 *   usage: { date: ['Displays the date.', '', 'DATE'] },
 * })
 * ```
 */
export function help(options?: HelpOptions): TerminalPlugin {
  const descriptions = { ...BUILTIN_DESCRIPTIONS, ...lowercaseKeys(options?.descriptions) }
  const usage = { ...BUILTIN_USAGE, ...lowercaseKeys(options?.usage) }

  return {
    name: 'help',

    // "command /?" shows usage for any installed command HELP knows about
    beforeCommand: (cmd, args, ctx) => {
      if (args.includes('/?') && usage[cmd] && ctx.commands.includes(cmd)) {
        return { output: ['', ...usage[cmd], ''], handled: true }
      }
    },

    commands: {
      help: (args, ctx) => {
        if (args.length > 0) {
          const topic = args[0].toLowerCase()
          if (!ctx.commands.includes(topic)) {
            return { output: ['Bad command or file name'], handled: true }
          }
          if (!usage[topic]) {
            return { output: ['Help not available for this command.'], handled: true }
          }
          return { output: ['', ...usage[topic], ''], handled: true }
        }

        const output: string[] = [
          '',
          'For more information on a specific command, type HELP command-name.',
          '',
        ]
        for (const name of ctx.commands) {
          const description = descriptions[name]
          output.push(description ? `${name.toUpperCase().padEnd(11)}${description}` : name.toUpperCase())
        }
        output.push('')

        return { output, handled: true }
      },
    },
  }
}

function lowercaseKeys<T>(record?: Record<string, T>): Record<string, T> {
  if (!record) return {}
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k.toLowerCase(), v]))
}
