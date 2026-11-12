/**
 * BIOS Boot Component
 *
 * Displays a fake BIOS POST screen before rendering the terminal.
 * Supports multiple BIOS presets (Award, AMI, Phoenix) or custom configuration.
 *
 * @example
 * ```tsx
 * import { BIOSBoot } from 'retro-dos-terminal/boot'
 *
 * // Using a preset (fullscreen)
 * <BIOSBoot preset="award" onComplete={() => console.log('Ready!')}>
 *   <DOSTerminal filesystem={files} />
 * </BIOSBoot>
 *
 * // Inline (contained within parent)
 * <BIOSBoot biosName="SpudOS" fullscreen={false} onComplete={() => setReady(true)}>
 *   <DOSTerminal filesystem={files} />
 * </BIOSBoot>
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { getBIOSPreset, type BIOSPresetName, type BIOSConfig } from './presets'

export interface BIOSBootProps {
  /** Children to render after boot completes */
  children: ReactNode

  /** Use a preset BIOS configuration */
  preset?: BIOSPresetName

  /** Custom BIOS name (overrides preset) */
  biosName?: string
  /** Custom BIOS version (overrides preset) */
  biosVersion?: string
  /** Custom copyright (overrides preset) */
  copyright?: string
  /** Custom CPU string (overrides preset) */
  cpu?: string
  /** Memory in KB to count to (overrides preset) */
  memory?: number
  /** Custom drives configuration (overrides preset) */
  drives?: {
    primaryMaster?: string
    primarySlave?: string
    secondaryMaster?: string
    secondarySlave?: string
  }
  /** Floppy drive string */
  floppy?: string
  /** Show "Press DEL to enter SETUP" prompt */
  showSetupPrompt?: boolean

  /** Boot speed - 'instant' skips animation, 'fast' is quick, 'authentic' is slow */
  speed?: 'instant' | 'fast' | 'authentic'
  /** Allow pressing any key to skip boot sequence */
  skippable?: boolean

  /** Called when boot sequence completes */
  onComplete?: () => void
  /** Called if user skips the boot sequence */
  onSkip?: () => void

  /** Additional lines to show during boot */
  customLines?: string[]

  /** Custom CSS class for the boot screen container */
  className?: string

  /** If true (default), covers entire viewport. If false, contained within parent */
  fullscreen?: boolean

  /** Text color (default: #aaaaaa) */
  textColor?: string
  /** Background color (default: #000000) */
  backgroundColor?: string
  /** Height when not fullscreen (default: 460px) */
  height?: string | number
  /** Font family (default: monospace) */
  fontFamily?: string
  /** Font size (default: 16px) */
  fontSize?: string | number
  /** Line height (default: 1.2) */
  lineHeight?: string | number
}

type BootStage =
  | 'bios-header'
  | 'memory-test'
  | 'hardware-detect'
  | 'complete'

interface BootLine {
  text: string
  highlight?: boolean
}

/**
 * BIOSBoot - Fake BIOS POST screen wrapper component
 */
export function BIOSBoot({
  children,
  preset = 'award',
  biosName,
  biosVersion,
  copyright,
  cpu,
  memory,
  drives,
  floppy,
  showSetupPrompt,
  speed = 'fast',
  skippable = true,
  onComplete,
  onSkip,
  customLines,
  className,
  fullscreen = true,
  textColor = '#aaaaaa',
  backgroundColor = '#000000',
  height = 460,
  fontFamily = '"DOS VGA", Consolas, "Courier New", monospace',
  fontSize = '16px',
  lineHeight = 1.2,
}: BIOSBootProps) {
  // Memoize config to prevent effect re-runs
  const config = useMemo<BIOSConfig>(() => {
    const presetConfig = getBIOSPreset(preset)
    return {
      ...presetConfig,
      ...(biosName !== undefined && { biosName }),
      ...(biosVersion !== undefined && { biosVersion }),
      ...(copyright !== undefined && { copyright }),
      ...(cpu !== undefined && { cpu }),
      ...(memory !== undefined && { memory }),
      ...(drives !== undefined && { drives }),
      ...(floppy !== undefined && { floppy }),
      ...(showSetupPrompt !== undefined && { showSetupPrompt }),
    }
  }, [preset, biosName, biosVersion, copyright, cpu, memory, drives, floppy, showSetupPrompt])

  const [bootComplete, setBootComplete] = useState(speed === 'instant')
  const [stage, setStage] = useState<BootStage>(speed === 'instant' ? 'complete' : 'bios-header')
  const [lines, setLines] = useState<BootLine[]>([])
  const [memoryCount, setMemoryCount] = useState(0)
  const [showCursor, setShowCursor] = useState(true)

  // Track if boot sequence has been initialized
  const bootInitialized = useRef(false)
  // Guards against completing twice (skip via click/key/window listener, or timers)
  const finishedRef = useRef(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-focus container on mount so keyboard skip works
  useEffect(() => {
    if (!bootComplete) {
      containerRef.current?.focus()
    }
  }, [bootComplete])

  // Speed multipliers
  const getDelay = useCallback((base: number) => {
    switch (speed) {
      case 'instant': return 0
      case 'fast': return base * 0.3
      case 'authentic': return base
      default: return base * 0.3
    }
  }, [speed])

  // Handle skip
  const handleSkip = useCallback(() => {
    if (!skippable || finishedRef.current) return
    finishedRef.current = true
    timeoutsRef.current.forEach(t => clearTimeout(t))
    setBootComplete(true)
    setStage('complete')
    onSkip?.()
    onComplete?.()
  }, [skippable, onSkip, onComplete])

  // Keyboard listener for skip
  useEffect(() => {
    if (bootComplete || !skippable) return

    const handleKeyDown = () => {
      handleSkip()
    }

    // Small delay before allowing skip
    const timeout = setTimeout(() => {
      window.addEventListener('keydown', handleKeyDown)
    }, 500)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [bootComplete, skippable, handleSkip])

  // Cursor blink
  useEffect(() => {
    if (bootComplete) return
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [bootComplete])

  // Boot sequence - only run once
  useEffect(() => {
    if (speed === 'instant' || bootComplete || bootInitialized.current) return

    // Mark as initialized to prevent re-runs
    bootInitialized.current = true

    const addLine = (text: string, highlight = false) => {
      setLines(prev => [...prev, { text, highlight }])
    }

    let cancelled = false
    const timeouts: ReturnType<typeof setTimeout>[] = []
    timeoutsRef.current = timeouts

    const schedule = (fn: () => void, delay: number) => {
      const timeout = setTimeout(() => {
        if (!cancelled) fn()
      }, getDelay(delay))
      timeouts.push(timeout)
    }

    // Stage 1: BIOS Header
    schedule(() => {
      addLine(config.biosName + (config.biosVersion ? ` ${config.biosVersion}` : ''))
      addLine(config.copyright)
      addLine('')
    }, 100)

    schedule(() => {
      addLine(config.cpu)
      addLine('')
      setStage('memory-test')
    }, 500)

    // Stage 2: Memory Test
    const memoryTarget = config.memory
    const memorySteps = speed === 'authentic' ? 20 : 8
    const memoryStepSize = Math.ceil(memoryTarget / memorySteps)
    const memoryStepDelay = speed === 'authentic' ? 100 : 30

    for (let i = 1; i <= memorySteps; i++) {
      schedule(() => {
        const current = Math.min(i * memoryStepSize, memoryTarget)
        setMemoryCount(current)
      }, 700 + (i * memoryStepDelay))
    }

    // After memory test
    schedule(() => {
      addLine(`Memory Test: ${memoryTarget}K OK`)
      addLine('')
      if (config.showSetupPrompt) {
        addLine('Press DEL to enter SETUP')
        addLine('')
      }
      setStage('hardware-detect')
    }, 700 + ((memorySteps + 1) * memoryStepDelay))

    // Stage 3: Hardware Detection
    const hardwareDelay = 700 + ((memorySteps + 3) * memoryStepDelay)

    if (config.floppy) {
      schedule(() => {
        addLine(`Floppy Disk(s): ${config.floppy}`)
      }, hardwareDelay)
    }

    let driveDelay = hardwareDelay + 200

    if (config.drives.primaryMaster) {
      schedule(() => {
        addLine(`Detecting IDE Primary Master... ${config.drives.primaryMaster}`)
      }, driveDelay)
      driveDelay += 300
    }

    if (config.drives.primarySlave) {
      schedule(() => {
        addLine(`Detecting IDE Primary Slave... ${config.drives.primarySlave}`)
      }, driveDelay)
      driveDelay += 300
    } else {
      schedule(() => {
        addLine('Detecting IDE Primary Slave... None')
      }, driveDelay)
      driveDelay += 200
    }

    if (config.drives.secondaryMaster) {
      schedule(() => {
        addLine(`Detecting IDE Secondary Master... ${config.drives.secondaryMaster}`)
      }, driveDelay)
      driveDelay += 300
    }

    if (config.drives.secondarySlave) {
      schedule(() => {
        addLine(`Detecting IDE Secondary Slave... ${config.drives.secondarySlave}`)
      }, driveDelay)
      driveDelay += 300
    } else {
      schedule(() => {
        addLine('Detecting IDE Secondary Slave... None')
      }, driveDelay)
      driveDelay += 200
    }

    // Custom lines
    if (customLines && customLines.length > 0) {
      customLines.forEach((line, i) => {
        schedule(() => {
          addLine(line)
        }, driveDelay + (i * 200))
      })
      driveDelay += customLines.length * 200
    }

    // Complete
    schedule(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      addLine('')
      setStage('complete')
      setBootComplete(true)
      onComplete?.()
    }, driveDelay + 500)

    return () => {
      cancelled = true
      timeouts.forEach(t => clearTimeout(t))
      // Reset so StrictMode remount works
      bootInitialized.current = false
    }
  // Only depend on stable values - config is memoized
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If boot complete, render children
  if (bootComplete && stage === 'complete') {
    return <>{children}</>
  }

  // Container styles based on fullscreen prop
  const containerStyle: CSSProperties = fullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
      }
    : {
        position: 'relative',
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
      }

  // Render BIOS screen
  return (
    <div
      ref={containerRef}
      className={className}
      tabIndex={0}
      onClick={skippable ? handleSkip : undefined}
      onKeyDown={skippable ? handleSkip : undefined}
      style={{
        ...containerStyle,
        backgroundColor,
        color: textColor,
        fontFamily,
        fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
        lineHeight,
        padding: '20px',
        overflow: 'hidden',
        cursor: skippable ? 'pointer' : undefined,
        outline: 'none',
      }}
    >
      {/* BIOS content */}
      <div style={{ maxWidth: '80ch' }}>
        {/* Header lines */}
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              color: line.highlight ? '#ffffff' : textColor,
              whiteSpace: 'pre',
            }}
          >
            {/* With white-space: pre, a space keeps blank lines from collapsing
                (U+00A0 would render as "á" in the CP437-mapped VGA font) */}
            {line.text || ' '}
          </div>
        ))}

        {/* Memory counter (during memory test stage) */}
        {stage === 'memory-test' && memoryCount > 0 && memoryCount < config.memory && (
          <div style={{ color: textColor }}>
            Memory Test: {memoryCount}K{showCursor ? '_' : ' '}
          </div>
        )}

        {/* Blinking cursor */}
        {stage !== 'complete' && stage !== 'memory-test' && (
          <div style={{ color: textColor }}>
            {showCursor ? '_' : ' '}
          </div>
        )}
      </div>

      {/* Skip hint */}
      {skippable && !bootComplete && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            color: '#666666',
            fontSize: '12px',
          }}
        >
          Click or press any key to skip...
        </div>
      )}

    </div>
  )
}

export default BIOSBoot
