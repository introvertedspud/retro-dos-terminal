# retro-dos-terminal

DOS-style terminal emulator for React. Because not everything needs to be Unix.

## Features

- Authentic DOS look and feel with bundled VGA font
- Plugin architecture for commands, filesystem, and effects
- Theme support (DOS gray, phosphor green, phosphor amber)
- Virtual filesystem with DIR, CD, TYPE commands
- DOSKEY-style command history (up/down arrows)
- Optional CRT effects (scanlines, glow, flicker)
- BIOS boot screen simulation
- Tree-shakeable - only bundle what you use

## Installation

```bash
npm install retro-dos-terminal
```

## Quick Start

```tsx
import { Terminal } from 'retro-dos-terminal'
import { commands } from 'retro-dos-terminal/plugins/commands'
import { filesystem } from 'retro-dos-terminal/plugins/filesystem'
import 'retro-dos-terminal/styles.css'

const files = {
  'C:\\': {
    'README.TXT': 'Welcome to my terminal!',
    'PROGRAMS': {
      'HELLO.EXE': '[executable]',
    },
  },
}

function App() {
  return (
    <Terminal
      theme="phosphor-green"
      plugins={[
        filesystem({ files }),
        commands(),
      ]}
      welcomeMessage={[
        'Welcome to DOS Terminal',
        'Type HELP for available commands.',
      ]}
    />
  )
}
```

## Themes

Three built-in themes:

```tsx
// Classic DOS gray
<Terminal theme="dos" />

// Green phosphor (default)
<Terminal theme="phosphor-green" />

// Amber phosphor
<Terminal theme="phosphor-amber" />

// Custom theme
<Terminal theme={{
  background: '#1a1a2e',
  text: '#00ff88',
  prompt: '#00ff88',
  command: '#ffffff',
}} />
```

## Plugins

### Commands Plugin

Provides built-in DOS commands:

```tsx
import { commands } from 'retro-dos-terminal/plugins/commands'

<Terminal plugins={[commands()]} />
```

Built-in commands: `CLS`, `DIR`, `CD`, `TYPE`, `ECHO`, `VER`, `HELP`, `EXIT`

### Filesystem Plugin

Virtual filesystem for DIR, CD, TYPE:

```tsx
import { filesystem } from 'retro-dos-terminal/plugins/filesystem'

const files = {
  'C:\\': {
    'AUTOEXEC.BAT': '@echo off',
    'CONFIG.SYS': 'FILES=40',
    'DOS': {
      'COMMAND.COM': '[system]',
    },
  },
}

<Terminal plugins={[filesystem({ files })]} />
```

### DOSKEY Plugin

Command history with arrow keys:

```tsx
import { doskey } from 'retro-dos-terminal/plugins/doskey'

<Terminal plugins={[doskey({ maxHistory: 50 })]} />
```

### CRT Effects Plugin

Retro CRT monitor effects:

```tsx
import { crt } from 'retro-dos-terminal/plugins/effects'
import 'retro-dos-terminal/plugins/effects/styles.css'

<Terminal plugins={[crt({
  scanlines: true,
  scanlineOpacity: 0.1,
  glow: true,
  glowIntensity: 0.4,
  flicker: false,
})]} />
```

### Programs Plugin

Run interactive programs:

```tsx
import { programs, type TerminalProgram } from 'retro-dos-terminal/plugins/programs'

const myProgram: TerminalProgram = {
  name: 'hello',
  run: async (ctx) => {
    ctx.print('Hello, World!')
    ctx.print('Press any key to exit...')
    await ctx.waitForKey()
  },
}

<Terminal plugins={[programs({ programs: [myProgram] })]} />
```

## BIOS Boot Screen

Optional retro BIOS POST screen:

```tsx
import { BIOSBoot } from 'retro-dos-terminal/boot'

<BIOSBoot
  preset="award"  // 'award', 'ami', or 'phoenix'
  speed="fast"    // 'instant', 'fast', or 'authentic'
  onComplete={() => console.log('Boot complete!')}
>
  <Terminal ... />
</BIOSBoot>

// Custom BIOS configuration
<BIOSBoot
  biosName="MyOS BIOS"
  biosVersion="v1.0"
  cpu="Intel Pentium 133MHz"
  memory={640}
  drives={{ primaryMaster: 'QUANTUM FIREBALL 540MB' }}
>
  <Terminal ... />
</BIOSBoot>
```

## Imperative Handle

Control the terminal programmatically:

```tsx
import { useRef } from 'react'
import { Terminal, type TerminalHandle } from 'retro-dos-terminal'

function App() {
  const terminalRef = useRef<TerminalHandle>(null)

  const runCommand = () => {
    terminalRef.current?.executeCommand('DIR')
  }

  return (
    <>
      <button onClick={runCommand}>Run DIR</button>
      <Terminal ref={terminalRef} />
    </>
  )
}
```

Available methods:
- `print(text)` - Print output lines
- `printError(text)` - Print error lines
- `clear()` - Clear the screen
- `focus()` - Focus the input
- `executeCommand(cmd)` - Execute a command

## DOS Preset

For a quick DOS-like setup with all plugins:

```tsx
import { DOSTerminal } from 'retro-dos-terminal/presets/dos'

<DOSTerminal
  filesystem={files}
  programs={[myProgram]}
  crt={{ scanlines: true }}
  onExit={() => console.log('Goodbye!')}
/>
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type {
  TerminalProps,
  TerminalHandle,
  TerminalPlugin,
  TerminalContext,
  TerminalProgram,
  CommandHandler,
  CommandResult,
} from 'retro-dos-terminal'
```

## Browser Support

Works in all modern browsers. The bundled DOS VGA font provides authentic rendering.

## License

MIT
