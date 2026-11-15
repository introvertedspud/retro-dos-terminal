/**
 * Verifies the built package the way a consumer sees it: every export target
 * exists, each JS entry imports through the exports map, every runtime export
 * is also visible to TypeScript, and url()s inside the CSS point at shipped files.
 *
 * Run after `npm run build`.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const failures = []
const runtimeExports = {}
const fail = (message) => failures.push(message)

const targets = [pkg.main, pkg.module, pkg.types]
for (const [subpath, target] of Object.entries(pkg.exports)) {
  targets.push(...(typeof target === 'string' ? [target] : Object.values(target)))

  if (typeof target === 'object' && target.import) {
    const specifier = pkg.name + subpath.slice(1)
    try {
      const mod = await import(specifier)
      runtimeExports[specifier] = Object.keys(mod)
      if (runtimeExports[specifier].length === 0) fail(`${specifier} has no exports`)
    } catch (err) {
      fail(`import('${specifier}') failed: ${err.message}`)
    }
  }
}

for (const target of targets) {
  if (!existsSync(join(ROOT, target))) fail(`missing ${target}`)
}

for (const css of targets.filter((t) => t.endsWith('.css'))) {
  const file = join(ROOT, css)
  if (!existsSync(file)) continue
  for (const [, url] of readFileSync(file, 'utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (url.startsWith('data:')) continue
    if (!existsSync(join(dirname(file), url))) fail(`${css} references missing ${url}`)
  }
}

// Typecheck a consumer that imports every runtime export by name, so types
// that resolve to the wrong declaration file fail here
const dir = mkdtempSync(join(ROOT, '.check-exports-'))
try {
  writeFileSync(
    join(dir, 'consumer.ts'),
    Object.entries(runtimeExports).map(([specifier, names], i) =>
      `import { ${names.map((n) => `${n} as m${i}_${n}`).join(', ')} } from '${specifier}'\n` +
      `void [${names.map((n) => `m${i}_${n}`).join(', ')}]`
    ).join('\n')
  )
  execFileSync(
    join(ROOT, 'node_modules/.bin/tsc'),
    ['--noEmit', '--ignoreConfig', '--strict', '--skipLibCheck', '--module', 'esnext',
      '--moduleResolution', 'bundler', '--jsx', 'react-jsx', join(dir, 'consumer.ts')],
    { stdio: 'pipe' }
  )
} catch (err) {
  fail(`types did not resolve:\n${err.stdout?.toString() ?? err.message}`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'))
  process.exit(1)
}
console.log(`✓ ${Object.keys(pkg.exports).length} exports resolve, import, and typecheck`)
