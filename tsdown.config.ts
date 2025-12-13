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
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  // Disable content hashing for predictable filenames
  hash: false,
  // Handle font files as assets (copies to dist/assets/)
  loader: {
    '.woff': 'asset',
  },
})
