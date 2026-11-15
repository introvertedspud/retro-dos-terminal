import { act, fireEvent, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import type { TerminalContext, TerminalPlugin } from '../src/core/types'
import { echo } from '../src/plugins/commands'
import { filesystem } from '../src/plugins/filesystem'
import { crt } from '../src/plugins/effects'
import { cd } from '../src/plugins/commands'
import { doskey } from '../src/plugins/doskey'
import { Terminal } from '../src/core/terminal'
import { files, renderTerminal } from './helpers'

describe('Terminal', () => {
  it('shows the welcome message and default prompt', () => {
    const t = renderTerminal({ welcomeMessage: ['Welcome!'] })
    expect(t.lines()).toEqual(['Welcome!'])
    expect(t.prompt()).toBe('C:\\>')
  })

  it('echoes the command line with the prompt and clears the input', async () => {
    const t = renderTerminal({ plugins: [echo()] })
    await t.run('echo hi')
    expect(t.lines()).toEqual(['C:\\>echo hi', 'hi'])
    expect(t.input().value).toBe('')
  })

  it('reports unknown commands', async () => {
    const t = renderTerminal()
    await t.run('frobnicate')
    expect(t.errors()).toEqual(['Bad command or file name'])
  })

  it('prints thrown command errors instead of crashing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const boom: TerminalPlugin = { name: 'boom', commands: { boom: () => { throw new Error('kaboom') } } }
    const t = renderTerminal({ plugins: [boom] })
    await t.run('boom')
    expect(t.errors()).toEqual(['Error: kaboom'])
    error.mockRestore()
  })

  it('matches plugin command names case-insensitively', async () => {
    const shout: TerminalPlugin = { name: 'shout', commands: { SHOUT: () => ({ output: ['HEY'] }) } }
    const t = renderTerminal({ plugins: [shout] })
    await t.run('Shout')
    expect(t.lines()).toContain('HEY')
  })

  it('trims history to maxHistoryLines', async () => {
    const t = renderTerminal({ plugins: [echo()], maxHistoryLines: 3 })
    await t.run('echo one')
    await t.run('echo two')
    expect(t.lines()).toEqual(['one', 'C:\\>echo two', 'two'])
  })

  it('uses a custom prompt format', () => {
    const t = renderTerminal({ theme: { promptFormat: '[{cwd}]$ ' } })
    expect(t.prompt()).toBe('[C:\\]$ ')
  })

  describe('imperative handle', () => {
    it('prints, executes commands and clears', () => {
      const t = renderTerminal({ plugins: [echo()] })
      act(() => t.ref.current!.print(['a', 'b']))
      act(() => t.ref.current!.printError('bad'))
      act(() => t.ref.current!.executeCommand('echo c'))
      expect(t.lines()).toEqual(['a', 'b', 'bad', 'C:\\>echo c', 'c'])
      expect(t.errors()).toEqual(['bad'])
      act(() => t.ref.current!.clear())
      expect(t.lines()).toEqual([])
    })
  })

  describe('plugins', () => {
    it('does not warn about changed plugins when none are passed', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const t = renderTerminal()
      // Re-render the same Terminal; the default plugins array must stay stable
      t.rerender(<Terminal className="changed" />)
      expect(t.container.querySelector('.dos-terminal.changed')).not.toBeNull()
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
    })

    it('lets setup read state set by an earlier plugin', () => {
      let seen: unknown
      const reader: TerminalPlugin = { name: 'reader', setup: (ctx) => { seen = ctx.get('filesystem') } }
      renderTerminal({ plugins: [filesystem({ files }), reader] })
      expect(seen).toBeDefined()
    })

    it('gives setup a context that stays current after later changes', async () => {
      let saved: TerminalContext | undefined
      const keeper: TerminalPlugin = {
        name: 'keeper',
        setup: (ctx) => { saved = ctx },
        commands: { where: () => ({ output: [`saved cwd: ${saved!.cwd}`] }) },
      }
      const t = renderTerminal({ plugins: [filesystem({ files }), cd(), keeper] })
      await t.run('cd games')
      await t.run('where')
      expect(t.lastLine()).toBe('saved cwd: C:\\GAMES')
    })

    it('works under StrictMode double-invoked effects', async () => {
      const user = userEvent.setup()
      const plugins = [filesystem({ files }), doskey(), cd(), echo()]
      const { container } = render(<StrictMode><Terminal plugins={plugins} /></StrictMode>)
      const input = container.querySelector('input')!
      await user.click(input)
      await user.keyboard('cd games{Enter}echo hi{Enter}{ArrowUp}')
      expect(container.querySelector('.dos-terminal__prompt')?.textContent).toBe('C:\\GAMES>')
      expect(input.value).toBe('echo hi')
    })

    it('runs before/after hooks and lets beforeCommand handle a command', async () => {
      const calls: string[] = []
      const hooks: TerminalPlugin = {
        name: 'hooks',
        beforeCommand: (cmd) => {
          calls.push(`before:${cmd}`)
          if (cmd === 'intercept') return { output: ['intercepted'], handled: true }
        },
        afterCommand: (cmd) => { calls.push(`after:${cmd}`) },
      }
      const t = renderTerminal({ plugins: [hooks] })
      await t.run('intercept')
      expect(t.lines()).toContain('intercepted')
      expect(t.errors()).toEqual([])
      expect(calls).toEqual(['before:intercept', 'after:intercept'])
    })

    it('exposes registered command names on the context', async () => {
      let names: string[] = []
      const spy: TerminalPlugin = { name: 'spy', commands: { names: (_args, ctx) => { names = ctx.commands } } }
      const t = renderTerminal({ plugins: [echo(), spy] })
      await t.run('names')
      expect(names).toEqual(['echo', 'names'])
    })

    it('applies plugin cssVariables to the terminal root', () => {
      const t = renderTerminal({ plugins: [crt({ glowColor: '#ff00ff', glowIntensity: 1 })] })
      const root = t.container.querySelector('.dos-terminal') as HTMLElement
      expect(root.style.getPropertyValue('--crt-glow-color')).toBe('#ff00ff')
      expect(root.style.getPropertyValue('--crt-glow-intensity')).toBe('1')
    })

    it('renders plugin overlays outside the scrolling viewport', () => {
      const t = renderTerminal({ plugins: [crt()] })
      const overlay = t.container.querySelector('.dos-terminal-crt')!
      expect(overlay.closest('.dos-terminal__viewport')).toBeNull()
      expect(overlay.closest('.dos-terminal')).not.toBeNull()
    })
  })

  describe('cursor', () => {
    it('follows the caret when moving left', async () => {
      const t = renderTerminal()
      await t.user.click(t.input())
      await t.user.keyboard('HELLO{ArrowLeft}{ArrowLeft}')
      const mirror = t.container.querySelector('.dos-terminal__input-mirror')!
      expect(mirror.textContent).toBe('HEL')
    })

    it('moves with the input when long text scrolls it', async () => {
      const t = renderTerminal()
      await t.user.click(t.input())
      await t.user.keyboard('x'.repeat(200))
      // jsdom has no layout, so stand in for the browser scrolling the input
      Object.defineProperty(t.input(), 'scrollLeft', { configurable: true, value: 40 })
      fireEvent.scroll(t.input())
      const mirror = t.container.querySelector<HTMLElement>('.dos-terminal__input-mirror')!
      expect(mirror.style.marginLeft).toBe('-40px')
    })
  })
})
