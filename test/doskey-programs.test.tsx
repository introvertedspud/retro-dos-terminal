import { describe, expect, it, vi } from 'vitest'
import { echo } from '../src/plugins/commands'
import { doskey } from '../src/plugins/doskey'
import { filesystem } from '../src/plugins/filesystem'
import { defineProgram, programs } from '../src/plugins/programs'
import { files, renderTerminal } from './helpers'

describe('DOSKEY', () => {
  it('recalls previous commands with the arrow keys', async () => {
    const t = renderTerminal({ plugins: [doskey(), echo()] })
    await t.run('echo one')
    await t.run('echo two')
    await t.user.keyboard('dra')
    await t.press('{ArrowUp}')
    expect(t.input().value).toBe('echo two')
    await t.press('{ArrowUp}')
    expect(t.input().value).toBe('echo one')
    await t.press('{ArrowUp}')
    expect(t.input().value).toBe('echo one')
    await t.press('{ArrowDown}')
    expect(t.input().value).toBe('echo two')
    // Back past the newest entry restores the unfinished input
    await t.press('{ArrowDown}')
    expect(t.input().value).toBe('dra')
  })

  it('skips consecutive duplicates and respects maxHistory', async () => {
    const t = renderTerminal({ plugins: [doskey({ maxHistory: 2 }), echo()] })
    await t.run('echo a')
    await t.run('echo b')
    await t.run('echo b')
    await t.run('echo c')
    await t.press('{ArrowUp}{ArrowUp}{ArrowUp}')
    expect(t.input().value).toBe('echo b')
  })

  it('keeps quotes around arguments containing spaces', async () => {
    const t = renderTerminal({ plugins: [doskey(), echo()] })
    await t.run('echo "a  b"')
    await t.press('{ArrowUp}')
    expect(t.input().value).toBe('echo "a  b"')
  })
})

describe('programs', () => {
  function setup() {
    const onStop = vi.fn()
    const keys: string[] = []
    const hello = defineProgram({
      commands: ['hello', 'hello.exe'],
      onStart: (ctx) => ctx.print('HELLO STARTED'),
      onStop,
      onInput: (input, ctx) => {
        if (input.toLowerCase() === 'quit') {
          ctx.get<() => void>('exitProgram')?.()
          return { handled: true }
        }
        ctx.print(`You said: ${input}`)
        return { handled: true }
      },
      onKeyDown: (key) => {
        keys.push(key)
        return key === 'ArrowUp'
      },
    })
    const t = renderTerminal({ plugins: [filesystem({ files }), doskey(), echo(), programs([hello])] })
    return { t, onStop, keys }
  }

  it('starts when a matching executable is in the current directory', async () => {
    const { t } = setup()
    await t.run('hello')
    expect(t.lines()).toContain('HELLO STARTED')
  })

  it('reports Bad command when the executable is not present', async () => {
    const snake = defineProgram({ commands: ['snake'], onStart: (ctx) => ctx.print('SNAKE') })
    const t = renderTerminal({ plugins: [filesystem({ files }), programs([snake])] })
    await t.run('snake')
    expect(t.errors()).toEqual(['Bad command or file name'])
  })

  it('routes input to the program and hides the prompt', async () => {
    const { t } = setup()
    await t.run('hello.exe')
    expect(t.prompt()).toBeNull()
    await t.run('echo hi')
    expect(t.lines()).toContain('You said: echo hi')
    expect(t.lines()).not.toContain('hi')
  })

  it('gives the program first pick of keys, ahead of DOSKEY', async () => {
    const { t, keys } = setup()
    await t.run('echo before')
    await t.run('hello')
    await t.press('{ArrowUp}')
    // Delivered once, and DOSKEY didn't recall "echo before"
    expect(keys.filter((k) => k === 'ArrowUp')).toHaveLength(1)
    expect(t.input().value).toBe('')
  })

  it('returns to the prompt via exitProgram', async () => {
    const { t, onStop } = setup()
    await t.run('hello')
    await t.run('quit')
    expect(onStop).toHaveBeenCalledOnce()
    expect(t.prompt()).toBe('C:\\>')
    await t.run('echo back')
    expect(t.lastLine()).toBe('back')
  })
})
