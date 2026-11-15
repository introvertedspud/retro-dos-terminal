import { describe, expect, it } from 'vitest'
import { parseCommandLine } from '../src/core/terminal'

describe('parseCommandLine', () => {
  it('splits command and arguments, lowercasing the command only', () => {
    expect(parseCommandLine('TYPE README.TXT')).toEqual({ cmd: 'type', args: ['README.TXT'] })
  })

  it('collapses repeated spaces', () => {
    expect(parseCommandLine('echo   a    b')).toEqual({ cmd: 'echo', args: ['a', 'b'] })
  })

  it('keeps double-quoted strings together', () => {
    expect(parseCommandLine('echo "a  b" c')).toEqual({ cmd: 'echo', args: ['a  b', 'c'] })
  })

  it('treats apostrophes as ordinary characters, like DOS', () => {
    expect(parseCommandLine("echo it's what I'm after")).toEqual({
      cmd: 'echo',
      args: ["it's", 'what', "I'm", 'after'],
    })
  })

  it('returns an empty command for empty input', () => {
    expect(parseCommandLine('')).toEqual({ cmd: '', args: [] })
  })

  it.each([
    ['cd..', 'cd', ['..']],
    ['cd..\\games', 'cd', ['..\\games']],
    ['cd\\', 'cd', ['\\']],
    ['cd\\games', 'cd', ['\\games']],
    ['dir/w /p', 'dir', ['/w', '/p']],
  ])('splits DOS shorthand %s', (line, cmd, args) => {
    expect(parseCommandLine(line)).toEqual({ cmd, args })
  })

  it.each(['snake.exe', 'c:\\games', 'd:', '\\games\\snake.exe'])(
    'does not split %s',
    (line) => {
      expect(parseCommandLine(line)).toEqual({ cmd: line, args: [] })
    }
  )
})
