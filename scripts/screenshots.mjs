/**
 * Regenerates the README images in docs/images from docs/showcase.
 *
 * Requires Google Chrome and ffmpeg (for the animated hero GIF).
 * Usage: npm run screenshots [-- <name>]   e.g. npm run screenshots -- hero
 */

import { build } from 'esbuild'
import { chromium } from 'playwright-core'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join(ROOT, 'docs/images')
const only = process.argv[2]

// Bundle the showcase page into a temp directory
const site = mkdtempSync(join(tmpdir(), 'retro-dos-showcase-'))
await build({
  entryPoints: [join(ROOT, 'docs/showcase/showcase.tsx')],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  minify: true,
  loader: { '.woff': 'dataurl' },
  define: { 'process.env.NODE_ENV': '"production"' },
  outdir: site,
  logLevel: 'error',
})
copyFileSync(join(ROOT, 'docs/showcase/index.html'), join(site, 'index.html'))
const PAGE = 'file://' + join(site, 'index.html')

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] })

try {

  /** Open the showcase with a scene config; the viewport leaves a 24px margin around the frame */
  async function open(scene, { scale = 2 } = {}) {
    const width = (scene.width ?? 720) + 48
    const height = (scene.height ?? 420) + 48
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
    await page.goto(PAGE + '#' + encodeURIComponent(JSON.stringify(scene)))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForSelector('.frame')
    return page
  }

  async function run(page, line, delay = 0) {
    await page.locator('.dos-terminal__input').click()
    await page.keyboard.type(line, { delay })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(delay ? 500 : 50)
  }

  async function still(name, scene, steps) {
    if (only && only !== name) return
    const page = await open(scene)
    await page.waitForSelector('.dos-terminal__input')
    for (const line of steps) await run(page, line)
    // Freeze the blinking cursor in its visible state
    await page.addStyleTag({ content: '.dos-terminal__cursor { animation: none !important; }' })
    await page.locator('.frame').screenshot({ path: join(OUT, `${name}.png`) })
    await page.close()
    console.log(`wrote ${name}.png`)
  }

  const themeScene = { width: 480, height: 300, welcome: false }
  await still('theme-dos', themeScene, ['ver', 'type readme.txt'])
  await still('theme-green', { ...themeScene, theme: 'phosphor-green' }, ['ver', 'type readme.txt'])
  await still('theme-amber', { ...themeScene, theme: 'phosphor-amber' }, ['ver', 'type readme.txt'])
  await still('program', { theme: 'phosphor-green', crt: true, welcome: false, height: 480 },
    ['cd games', 'guess', '50', '30', '45', '42', 'type ..\\readme.txt'])
  await still('help', { theme: 'phosphor-amber', crt: true, welcome: false, height: 440 }, ['help', 'type /?'])

  if (!only || only === 'bios') {
    const page = await open({ boot: true })
    await page.waitForTimeout(3600)
    await page.locator('.frame').screenshot({ path: join(OUT, 'bios.png') })
    await page.close()
    console.log('wrote bios.png')
  }

  if (!only || only === 'hero') {
    // Capture lossless frames over CDP (video encoding blurs the bitmap font),
    // then let ffmpeg turn them into a GIF using each frame's real duration
    const frames = join(site, 'frames')
    mkdirSync(frames)
    const page = await open({ boot: true, crt: true }, { scale: 1 })
    const cdp = await page.context().newCDPSession(page)
    const shots = []
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const file = join(frames, `f${String(shots.length).padStart(5, '0')}.png`)
      writeFileSync(file, Buffer.from(data, 'base64'))
      shots.push({ file, t: metadata.timestamp })
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
    })
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })

    await page.waitForSelector('.dos-terminal__input', { timeout: 30000 })
    await page.waitForTimeout(900)
    await run(page, 'dir', 110)
    await page.waitForTimeout(1600)
    await run(page, 'cd games', 90)
    await run(page, 'guess', 110)
    await page.waitForTimeout(700)
    for (const n of ['50', '25', '42']) {
      await run(page, n, 160)
      await page.waitForTimeout(350)
    }
    await page.waitForTimeout(600)
    await run(page, 'cd..', 110)
    await run(page, 'type readme.txt', 70)
    await page.waitForTimeout(2500)

    await cdp.send('Page.stopScreencast')
    await page.close()

    const list = shots.map((shot, i) => {
      const next = shots[i + 1]?.t ?? shot.t + 1
      return `file '${shot.file}'\nduration ${Math.max(0.02, next - shot.t).toFixed(3)}`
    })
    list.push(`file '${shots[shots.length - 1].file}'`)
    writeFileSync(join(frames, 'list.txt'), list.join('\n'))

    // Crop away the page margin; no dithering keeps the pixel font crisp
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(frames, 'list.txt'),
      '-vf', 'crop=720:420:24:24,fps=12,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none',
      '-loop', '0', join(OUT, 'hero.gif'),
    ])
    console.log(`wrote hero.gif (${shots.length} frames)`)
  }

} finally {
  // Don't leave Chrome or the temp site behind if a capture fails
  await browser.close()
  rmSync(site, { recursive: true, force: true })
}
