import { describe, expect, it } from 'vitest'
import { parseCommandLine } from '../src/core/terminal'

describe('parseCommandLine', () => {
  it('splits command and arguments, lowercasing the command only', () => {
    expect(parseCommandLine('TYPE README.TXT')).toEqual({ cmd: 'type', args: ['README.TXT'] })
  })

  it('collapses repeated spaces', () => {
    expect(parseCommandLine('echo   a    b')).toEqual({ cmd: 'echo', args: ['a', 'b'] })
  })

  it('keeps quoted strings together', () => {
    expect(parseCommandLine(`echo "a  b" 'c d'`)).toEqual({ cmd: 'echo', args: ['a  b', 'c d'] })
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
