import { createRoot } from 'react-dom/client'
import { useMemo } from 'react'
import { Terminal, type FileSystem, type ThemePresetName } from '../../src/index'
import { filesystem } from '../../src/plugins/filesystem'
import { doskey } from '../../src/plugins/doskey'
import { cd, cls, dir, echo, exit, help, type, ver } from '../../src/plugins/commands'
import { crt } from '../../src/plugins/effects'
import { programs, defineProgram } from '../../src/plugins/programs'
import { BIOSBoot } from '../../src/boot'
import '../../src/plugins/effects/crt.css'

const d = (y: number, m: number, day: number, h = 6, min = 22) => new Date(y, m - 1, day, h, min)

const files: FileSystem = {
  'C:\\': [
    { type: 'folder', name: 'DOS', modified: d(1994, 5, 31) },
    { type: 'folder', name: 'GAMES', modified: d(1995, 3, 12, 21, 4) },
    { type: 'file', name: 'COMMAND.COM', size: 54645, modified: d(1994, 5, 31) },
    { type: 'file', name: 'AUTOEXEC.BAT', size: 112, modified: d(1995, 3, 12, 20, 41), content: ['@ECHO OFF', 'PROMPT $P$G', 'PATH C:\\DOS;C:\\GAMES', 'DOSKEY'] },
    { type: 'file', name: 'CONFIG.SYS', size: 64, modified: d(1995, 3, 12, 20, 40), content: ['FILES=40', 'BUFFERS=20', 'DEVICE=C:\\DOS\\HIMEM.SYS'] },
    { type: 'file', name: 'README.TXT', size: 233, modified: d(1995, 3, 14, 9, 15), content: [
      'retro-dos-terminal',
      '==================',
      '',
      'A DOS-style terminal emulator for React.',
      'Because not everything needs to be Unix.',
      '',
      'Try: DIR, CD GAMES, GUESS, HELP, DIR /?',
    ] },
  ],
  'C:\\DOS': [
    { type: 'file', name: 'HIMEM.SYS', size: 29136, modified: d(1994, 5, 31) },
    { type: 'file', name: 'EDIT.COM', size: 413, modified: d(1994, 5, 31) },
    { type: 'file', name: 'QBASIC.EXE', size: 194309, modified: d(1994, 5, 31) },
    { type: 'file', name: 'DOSKEY.COM', size: 5883, modified: d(1994, 5, 31) },
  ],
  'C:\\GAMES': [
    { type: 'file', name: 'GUESS.EXE', size: 18432, modified: d(1995, 3, 12, 21, 4), executable: true },
    { type: 'file', name: 'SCORES.DAT', size: 512, modified: d(1995, 3, 13, 22, 47) },
  ],
}

let secret = 42
const guess = defineProgram({
  commands: ['guess', 'guess.exe'],
  onStart: (ctx) => {
    secret = 42
    ctx.print(['', 'GUESS v1.0 - (C) 1995 Spud Software', 'I am thinking of a number from 1 to 100.', ''])
  },
  onInput: (input, ctx) => {
    const n = Number(input)
    if (!Number.isInteger(n)) {
      ctx.print('Numbers only, please.')
    } else if (n < secret) {
      ctx.print(`${n}? Too low.`)
    } else if (n > secret) {
      ctx.print(`${n}? Too high.`)
    } else {
      ctx.print([`${n}! You got it. Returning to DOS...`, ''])
      ctx.get<() => void>('exitProgram')?.()
    }
    return { handled: true }
  },
})

type Scene = {
  theme?: ThemePresetName
  crt?: boolean
  boot?: boolean
  welcome?: boolean
  width?: number
  height?: number
}
const scene: Scene = JSON.parse(decodeURIComponent(location.hash.slice(1) || '{}'))

function Showcase() {
  const plugins = useMemo(() => [
    filesystem({ files }),
    doskey(),
    cd(), cls(), dir({ pageSize: 21 }), echo(), exit(), help(), type(), ver(),
    programs([guess]),
    ...(scene.crt ? [crt({ scanlines: true, glow: true, curvature: true, scanlineOpacity: 0.12 })] : []),
  ], [])

  const terminal = (
    <Terminal
      theme={scene.theme ?? 'dos'}
      plugins={plugins}
      welcomeMessage={scene.welcome === false ? [] : ['Starting MS-DOS...', '', 'MS-DOS Version 6.22', '']}
    />
  )

  return (
    <div className="frame" style={{ width: scene.width ?? 720, height: scene.height ?? 420 }}>
      {scene.boot ? (
        <BIOSBoot preset="award" speed="authentic" fullscreen={false} height="100%" skippable={false}>
          {terminal}
        </BIOSBoot>
      ) : terminal}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Showcase />)
