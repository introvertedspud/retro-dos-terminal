import { describe, expect, it } from 'vitest'
import { filesystem, type FilesystemAPI } from '../src/plugins/filesystem'
import type { TerminalContext } from '../src/core/types'
import { files } from './helpers'

/** Run the plugin's setup against a minimal context and capture its API */
function getApi(): FilesystemAPI {
  let api: FilesystemAPI | undefined
  const ctx = { set: (_key: string, value: unknown) => { api = value as FilesystemAPI } }
  filesystem({ files }).setup?.(ctx as unknown as TerminalContext)
  return api!
}

describe('filesystem plugin', () => {
  const fs = getApi()

  describe('resolvePath', () => {
    it.each([
      ['C:\\', 'GAMES', 'C:\\GAMES'],
      ['C:\\GAMES', '..', 'C:\\'],
      ['C:\\', '..', 'C:\\'],
      ['C:\\GAMES', '.\\SNAKE.EXE', 'C:\\GAMES\\SNAKE.EXE'],
      ['C:\\GAMES', '..\\DOCS', 'C:\\DOCS'],
      ['C:\\GAMES', '\\DOCS', 'C:\\DOCS'],
      ['C:\\GAMES', '\\', 'C:\\'],
      ['C:\\', 'd:\\', 'D:\\'],
      ['C:\\', 'games/', 'C:\\GAMES'],
      ['C:\\', 'C:\\GAMES\\..', 'C:\\'],
      ['D:\\', 'c:\\games\\..\\docs', 'C:\\DOCS'],
      ['C:\\GAMES', 'C:\\.\\DOCS', 'C:\\DOCS'],
    ])('from %s to %s is %s', (from, to, expected) => {
      expect(fs.resolvePath(from, to)).toBe(expected)
    })
  })

  it('reads directories case-insensitively', () => {
    expect(fs.readDir('c:\\games')?.map((n) => n.name)).toEqual(['SNAKE.EXE'])
    expect(fs.readDir('C:\\NOPE')).toBeNull()
  })

  it('finds files case-insensitively', () => {
    expect(fs.getFile('C:\\', 'readme.txt')?.name).toBe('README.TXT')
  })

  it('distinguishes files, directories and missing paths', () => {
    expect(fs.exists('C:\\README.TXT')).toBe(true)
    expect(fs.isDirectory('C:\\README.TXT')).toBe(false)
    expect(fs.exists('C:\\GAMES')).toBe(true)
    expect(fs.isDirectory('C:\\GAMES')).toBe(true)
    expect(fs.exists('C:\\GAMES\\NOPE.EXE')).toBe(false)
  })
})
