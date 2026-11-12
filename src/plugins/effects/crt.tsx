/**
 * CRT Effects Plugin - Retro CRT monitor visual effects
 *
 * Adds optional visual effects to make the terminal look like an old CRT monitor:
 * - Scanlines: Horizontal lines that simulate CRT display
 * - Phosphor glow: Soft glow around text
 * - Screen flicker: Subtle brightness variation
 * - CRT curvature: Barrel distortion effect (coming soon)
 *
 * @example
 * ```tsx
 * import { crt } from 'retro-dos-terminal/plugins/effects'
 *
 * // Enable all effects
 * <Terminal plugins={[crt()]} />
 *
 * // Enable specific effects
 * <Terminal plugins={[crt({ scanlines: true, glow: true })]} />
 *
 * // Customize effect intensity
 * <Terminal plugins={[crt({
 *   scanlines: true,
 *   scanlineOpacity: 0.15,
 *   glow: true,
 *   glowIntensity: 0.5,
 *   flicker: true,
 *   flickerIntensity: 0.03
 * })]} />
 * ```
 */

import type { CSSProperties } from 'react'
import type { TerminalPlugin, TerminalContext } from '../../core/types'
import './crt.css'

export interface CRTOptions {
  /** Enable scanline effect (default: true) */
  scanlines?: boolean
  /** Scanline opacity 0-1 (default: 0.1) */
  scanlineOpacity?: number
  /** Scanline spacing in pixels (default: 2) */
  scanlineSpacing?: number

  /** Enable phosphor glow effect (default: true) */
  glow?: boolean
  /** Glow intensity 0-1 (default: 0.4) */
  glowIntensity?: number
  /** Glow color - defaults to terminal text color */
  glowColor?: string

  /** Enable screen flicker effect (default: false) */
  flicker?: boolean
  /** Flicker intensity 0-1 (default: 0.02) */
  flickerIntensity?: number

  /** Enable CRT screen curvature (default: false) */
  curvature?: boolean
  /** Curvature amount 0-1 (default: 0.1) */
  curvatureAmount?: number
}

const DEFAULT_OPTIONS: Required<CRTOptions> = {
  scanlines: true,
  scanlineOpacity: 0.1,
  scanlineSpacing: 2,
  glow: true,
  glowIntensity: 0.4,
  glowColor: '',
  flicker: false,
  flickerIntensity: 0.02,
  curvature: false,
  curvatureAmount: 0.1,
}

/**
 * Creates a CRT effects plugin
 *
 * @param options - Configuration for which effects to enable
 * @returns Terminal plugin that renders CRT overlay effects
 */
export function crt(options: CRTOptions = {}): TerminalPlugin {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return {
    name: 'crt',

    render: (_ctx: TerminalContext) => {
      // Build CSS variables for customization (values must be strings)
      const cssVars: CSSProperties & Record<string, string> = {
        '--crt-scanline-opacity': String(opts.scanlineOpacity),
        '--crt-scanline-spacing': `${opts.scanlineSpacing}px`,
        '--crt-glow-intensity': String(opts.glowIntensity),
        '--crt-glow-color': opts.glowColor || 'currentColor',
        '--crt-flicker-intensity': String(opts.flickerIntensity),
        '--crt-curvature-amount': String(opts.curvatureAmount),
      }

      // Build class list
      const classes = ['dos-terminal-crt']
      if (opts.scanlines) classes.push('dos-terminal-crt--scanlines')
      if (opts.glow) classes.push('dos-terminal-crt--glow')
      if (opts.flicker) classes.push('dos-terminal-crt--flicker')
      if (opts.curvature) classes.push('dos-terminal-crt--curvature')

      return (
        <div className={classes.join(' ')} style={cssVars} aria-hidden="true">
          {/* Scanlines overlay */}
          {opts.scanlines && <div className="dos-terminal-crt__scanlines" />}

          {/* Screen flicker overlay */}
          {opts.flicker && <div className="dos-terminal-crt__flicker" />}

          {/* Vignette effect for curvature */}
          {opts.curvature && <div className="dos-terminal-crt__vignette" />}
        </div>
      )
    },
  }
}
