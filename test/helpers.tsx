import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { Terminal, type TerminalHandle, type TerminalProps } from '../src/core/terminal'
import type { FileSystem } from '../src/core/types'

export const files: FileSystem = {
  'C:\\': [
    { type: 'folder', name: 'GAMES' },
    { type: 'folder', name: 'DOCS' },
    { type: 'file', name: 'README.TXT', size: 1234, content: ['Hello from README'] },
    { type: 'file', name: 'HELLO.EXE', size: 2048, executable: true },
  ],
  'C:\\GAMES': [{ type: 'file', name: 'SNAKE.EXE', size: 40960, executable: true }],
  'C:\\DOCS': [{ type: 'file', name: 'EMPTY.TXT', size: 0 }],
  'D:\\': [],
}

/** Render a terminal and return helpers for driving it like a user */
export function renderTerminal(props: TerminalProps = {}) {
  const user = userEvent.setup()
  const ref = createRef<TerminalHandle>()
  const utils = render(<Terminal ref={ref} {...props} />)
  const input = () => utils.container.querySelector('input') as HTMLInputElement

  return {
    ...utils,
    user,
    ref,
    input,
    /** Type a command line and press Enter */
    run: async (line: string) => {
      await user.click(input())
      // user-event treats { and [ as key descriptors
      await user.keyboard(line.replace(/[{[]/g, (c) => c + c) + '{Enter}')
    },
    press: (key: string) => user.keyboard(key),
    lines: () =>
      [...utils.container.querySelectorAll('.dos-terminal__line')].map((el) => el.textContent ?? ''),
    lastLine: () => {
      const lines = utils.container.querySelectorAll('.dos-terminal__line')
      return lines[lines.length - 1]?.textContent ?? ''
    },
    errors: () =>
      [...utils.container.querySelectorAll('.dos-terminal__line--error')].map((el) => el.textContent ?? ''),
    prompt: () => utils.container.querySelector('.dos-terminal__prompt')?.textContent ?? null,
  }
}
