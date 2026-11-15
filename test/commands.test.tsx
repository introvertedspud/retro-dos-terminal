import { act, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { cd, cls, dir, echo, exit, help, type, ver } from '../src/plugins/commands'
import { filesystem } from '../src/plugins/filesystem'
import type { FileSystem, TerminalPlugin } from '../src/core/types'
import { files, renderTerminal } from './helpers'

const withFs = (...plugins: TerminalPlugin[]) =>
  renderTerminal({ plugins: [filesystem({ files }), ...plugins] })

describe('CD', () => {
  it('prints the current directory with no arguments', async () => {
    const t = withFs(cd())
    await t.run('cd')
    expect(t.lastLine()).toBe('C:\\')
  })

  it.each([
    ['cd games', 'C:\\GAMES>'],
    ['chdir GAMES', 'C:\\GAMES>'],
    ['cd C:\\DOCS', 'C:\\DOCS>'],
  ])('%s changes the prompt to %s', async (line, prompt) => {
    const t = withFs(cd())
    await t.run(line)
    expect(t.prompt()).toBe(prompt)
  })

  it('handles .., \\, root-relative paths and shorthand', async () => {
    const t = withFs(cd())
    await t.run('cd games')
    await t.run('cd ..')
    expect(t.prompt()).toBe('C:\\>')
    await t.run('cd games')
    await t.run('cd \\DOCS')
    expect(t.prompt()).toBe('C:\\DOCS>')
    await t.run('cd..')
    expect(t.prompt()).toBe('C:\\>')
    await t.run('cd games')
    await t.run('cd\\')
    expect(t.prompt()).toBe('C:\\>')
  })

  it('rejects missing directories and files', async () => {
    const t = withFs(cd())
    await t.run('cd nope')
    await t.run('cd readme.txt')
    expect(t.lines().filter((l) => l === 'Invalid directory')).toHaveLength(2)
    expect(t.prompt()).toBe('C:\\>')
  })

  it('switches drives', async () => {
    const t = withFs(cd())
    await t.run('d:')
    expect(t.prompt()).toBe('D:\\>')
    await t.run('q:')
    expect(t.lastLine()).toBe('Invalid drive specification')
  })

  it('explains when the filesystem plugin is missing', async () => {
    const t = renderTerminal({ plugins: [cd()] })
    await t.run('cd games')
    expect(t.lastLine()).toBe('CD requires the filesystem plugin')
  })
})

describe('DIR', () => {
  it('lists entries in 8.3 format with totals', async () => {
    const t = withFs(dir())
    await t.run('dir')
    const out = t.lines()
    expect(out).toContain(' Directory of C:\\')
    expect(out.some((l) => /^GAMES\s+<DIR>/.test(l))).toBe(true)
    expect(out.some((l) => /^README {3}TXT\s+1,234 05-31-94 {3}6:22a$/.test(l))).toBe(true)
    expect(out).toContain('        2 file(s)      3,282 bytes')
    expect(out).toContain('        2 dir(s)       104,857,600 bytes free')
  })

  it('shows . and .. outside the root', async () => {
    const t = withFs(dir())
    await t.run('dir games')
    expect(t.lines().some((l) => l.startsWith('.  '))).toBe(true)
    expect(t.lines().some((l) => l.startsWith('.. '))).toBe(true)
  })

  it('supports wide format', async () => {
    const t = withFs(dir())
    await t.run('dir/w')
    expect(t.lines().some((l) => l.includes('[GAMES]') && l.includes('README.TXT'))).toBe(true)
  })

  it('reports missing directories', async () => {
    const t = withFs(dir())
    await t.run('dir nope')
    expect(t.lastLine()).toBe('Directory not found')
  })

  describe('/P', () => {
    const many: FileSystem = {
      'C:\\': Array.from({ length: 30 }, (_, i) => ({ type: 'file' as const, name: `FILE${i}.TXT` })),
    }

    it('pauses after each page until a key is pressed', async () => {
      const t = renderTerminal({ plugins: [filesystem({ files: many }), dir({ pageSize: 10 }), echo()] })
      await t.run('dir /p')
      expect(t.lastLine()).toBe('Press any key to continue . . .')
      expect(t.prompt()).toBeNull()

      // Modifier keys alone don't advance
      await t.press('{Shift}')
      expect(t.lastLine()).toBe('Press any key to continue . . .')

      await t.press('a')
      expect(t.lines()).toContain('(continuing C:\\)')
      expect(t.input().value).toBe('')

      // Keep paging until DIR finishes and the prompt returns
      for (let i = 0; i < 10 && t.prompt() === null; i++) {
        await t.press(' ')
      }
      expect(t.prompt()).toBe('C:\\>')
      expect(t.lines().slice(-2)[0]).toContain('bytes free')

      await t.run('echo done')
      expect(t.lastLine()).toBe('done')

      // Every file was shown exactly once across all pages
      for (let i = 0; i < 30; i++) {
        expect(t.lines().filter((l) => l.startsWith(`FILE${i} `))).toHaveLength(1)
      }
    })

    it('lets Tab through while paused', async () => {
      const t = renderTerminal({ plugins: [filesystem({ files: many }), dir({ pageSize: 10 })] })
      await t.run('dir /p')
      const before = t.lines().length
      // fireEvent returns false when a handler called preventDefault
      expect(fireEvent.keyDown(t.input(), { key: 'Tab' })).toBe(true)
      expect(t.lines()).toHaveLength(before)
      expect(t.prompt()).toBeNull()
    })

    it('leaves browser shortcuts alone while paused', async () => {
      const t = renderTerminal({ plugins: [filesystem({ files: many }), dir({ pageSize: 10 })] })
      await t.run('dir /p')
      const before = t.lines().length
      expect(fireEvent.keyDown(t.input(), { key: 'c', metaKey: true })).toBe(true)
      expect(fireEvent.keyDown(t.input(), { key: 'v', ctrlKey: true })).toBe(true)
      expect(fireEvent.keyDown(t.input(), { key: 'r', altKey: true })).toBe(true)
      expect(t.lines()).toHaveLength(before)
      expect(t.prompt()).toBeNull()
    })

    it('stops the listing on Ctrl+C', async () => {
      const t = renderTerminal({ plugins: [filesystem({ files: many }), dir({ pageSize: 10 })] })
      await t.run('dir /p')
      fireEvent.keyDown(t.input(), { key: 'c', ctrlKey: true })
      expect(t.lastLine()).toBe('^C')
      expect(t.lines()).not.toContain('(continuing C:\\)')
      expect(t.prompt()).toBe('C:\\>')
    })

    it('does not pause when only blank lines spill over', async () => {
      // The root listing is 12 lines ending in a blank one; with 11 per page
      // only that blank line spills over
      const t = renderTerminal({ plugins: [filesystem({ files }), dir({ pageSize: 11 })] })
      await t.run('dir /p')
      expect(t.lines()).toHaveLength(13)
      expect(t.lines()).not.toContain('Press any key to continue . . .')
      expect(t.prompt()).toBe('C:\\>')
    })

    it('does not pause when everything fits', async () => {
      const t = withFs(dir())
      await t.run('dir /p')
      expect(t.lines()).not.toContain('Press any key to continue . . .')
      expect(t.prompt()).toBe('C:\\>')
    })
  })
})

describe('TYPE', () => {
  it('prints file contents', async () => {
    const t = withFs(type())
    await t.run('type readme.txt')
    expect(t.lastLine()).toBe('Hello from README')
  })

  it.each([
    ['type', 'Required parameter missing'],
    ['type nope.txt', 'File not found'],
    ['type games', 'Access denied'],
    ['type hello.exe', 'Access denied'],
  ])('%s -> %s', async (line, message) => {
    const t = withFs(type())
    await t.run(line)
    expect(t.lastLine()).toBe(message)
  })

  it('prints nothing for an empty file', async () => {
    const t = withFs(type())
    await t.run('type docs\\empty.txt')
    expect(t.lines()).toEqual(['C:\\>type docs\\empty.txt'])
  })
})

describe('HELP', () => {
  it('lists only installed commands', async () => {
    const t = renderTerminal({ plugins: [echo(), cls(), help()] })
    await t.run('help')
    const out = t.lines()
    expect(out.some((l) => l.startsWith('ECHO'))).toBe(true)
    expect(out.some((l) => l.startsWith('CLS'))).toBe(true)
    expect(out.some((l) => l.startsWith('DIR'))).toBe(false)
  })

  it('shows usage via HELP command and command /?', async () => {
    const t = withFs(dir(), help())
    await t.run('help dir')
    expect(t.lines()).toContain('DIR [drive:][path] [/P] [/W]')
    act(() => t.ref.current!.clear())
    await t.run('dir /?')
    expect(t.lines()).toContain('DIR [drive:][path] [/P] [/W]')
    expect(t.lines()).not.toContain(' Directory of C:\\')
  })

  it('describes custom commands', async () => {
    const date = { name: 'date', commands: { date: () => ({ output: ['today'] }) } }
    const t = renderTerminal({
      plugins: [date, help({ descriptions: { DATE: 'Displays the date.' }, usage: { date: ['DATE'] } })],
    })
    await t.run('help')
    expect(t.lines()).toContain('DATE       Displays the date.')
    await t.run('date /?')
    expect(t.lines()).toContain('DATE')
    expect(t.lines()).not.toContain('today')
  })

  it('handles unknown topics', async () => {
    const plain = { name: 'plain', commands: { plain: () => {} } }
    const t = renderTerminal({ plugins: [plain, help()] })
    await t.run('help nope')
    expect(t.lastLine()).toBe('Bad command or file name')
    await t.run('help plain')
    expect(t.lastLine()).toBe('Help not available for this command.')
  })
})

describe('simple commands', () => {
  it('ECHO prints arguments, or a blank line', async () => {
    const t = renderTerminal({ plugins: [echo()] })
    await t.run('echo "spaced  out" text')
    expect(t.lastLine()).toBe('spaced  out text')
    await t.run('echo')
    expect(t.lastLine()).toBe('')
  })

  it('CLS clears the screen', async () => {
    const t = renderTerminal({ plugins: [echo(), cls()], welcomeMessage: ['hi'] })
    await t.run('cls')
    expect(t.lines()).toEqual([])
  })

  it('VER prints the configured version', async () => {
    const t = renderTerminal({ plugins: [ver({ version: 'SpudOS 1.0' })] })
    await t.run('ver')
    expect(t.lines()).toContain('SpudOS 1.0')
  })

  it('EXIT calls onExit', async () => {
    const onExit = vi.fn()
    const t = renderTerminal({ plugins: [exit()], onExit })
    await t.run('exit')
    expect(onExit).toHaveBeenCalledOnce()
  })
})
