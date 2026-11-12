import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'plugins/commands/index': 'src/plugins/commands/index.ts',
    'plugins/filesystem/index': 'src/plugins/filesystem/index.ts',
    'plugins/doskey/index': 'src/plugins/doskey/index.ts',
    'plugins/programs/index': 'src/plugins/programs/index.ts',
    'plugins/effects/index': 'src/plugins/effects/index.ts',
    'presets/dos': 'src/presets/dos.tsx',
    'boot/index': 'src/boot/index.ts',
  },
  format: ['esm'],
  platform: 'browser',
  target: 'es2020',
  dts: true,
  sourcemap: true,
  clean: true,
  deps: { neverBundle: ['react', 'react-dom'] },
  // Keep the core and effects stylesheets separate (exposed via package exports)
  css: { splitting: true },
  // Disable content hashing for predictable filenames
  hash: false,
  // The CSS transformer leaves url() untouched, so mirror src/core/fonts next to the CSS
  copy: [{ from: 'src/core/fonts/dos-vga.woff', to: 'dist/fonts' }],
})
