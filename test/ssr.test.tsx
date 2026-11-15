// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DOSTerminal } from '../src/presets/dos'
import { BIOSBoot } from '../src/boot'
import { crt } from '../src/plugins/effects'
import { Terminal } from '../src/core/terminal'
import { files } from './helpers'

describe('server rendering', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders without warnings', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const html = renderToString(
      <>
        <DOSTerminal filesystem={files} welcomeMessage={['Welcome!']} />
        <Terminal plugins={[crt()]} />
        <BIOSBoot speed="fast">
          <Terminal />
        </BIOSBoot>
      </>
    )
    expect(html).toContain('Welcome!')
    expect(html).toContain('C:\\&gt;')
    expect(error).not.toHaveBeenCalled()
  })
})
