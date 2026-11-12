import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BIOSBoot } from '../src/boot'

describe('BIOSBoot', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the POST screen, then the children', () => {
    const onComplete = vi.fn()
    render(<BIOSBoot preset="ami" onComplete={onComplete}><div>DOS READY</div></BIOSBoot>)

    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByText('AMIBIOS (C) 1995 American Megatrends, Inc.')).toBeTruthy()
    expect(screen.queryByText('DOS READY')).toBeNull()

    // Long enough for the whole fast boot sequence
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.getByText('DOS READY')).toBeTruthy()
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('renders children immediately at instant speed', () => {
    render(<BIOSBoot speed="instant"><div>DOS READY</div></BIOSBoot>)
    expect(screen.getByText('DOS READY')).toBeTruthy()
  })

  it('calls onSkip and onComplete exactly once when skipped by a key', () => {
    const onComplete = vi.fn()
    const onSkip = vi.fn()
    const { container } = render(
      <BIOSBoot onComplete={onComplete} onSkip={onSkip}><div>DOS READY</div></BIOSBoot>
    )
    // Let the window-level skip listener attach too
    act(() => { vi.advanceTimersByTime(600) })

    fireEvent.keyDown(container.firstElementChild!, { key: 'a' })
    act(() => { vi.advanceTimersByTime(5000) })

    expect(screen.getByText('DOS READY')).toBeTruthy()
    expect(onSkip).toHaveBeenCalledOnce()
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('ignores input when not skippable', () => {
    const onSkip = vi.fn()
    const { container } = render(
      <BIOSBoot skippable={false} onSkip={onSkip}><div>DOS READY</div></BIOSBoot>
    )
    act(() => { vi.advanceTimersByTime(600) })
    fireEvent.click(container.firstElementChild!)
    expect(onSkip).not.toHaveBeenCalled()
    expect(screen.queryByText('DOS READY')).toBeNull()
  })

  it('uses custom BIOS details over the preset', () => {
    render(<BIOSBoot biosName="SpudBIOS" biosVersion="v1" cpu="Spud 486"><div /></BIOSBoot>)
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByText('SpudBIOS v1')).toBeTruthy()
    expect(screen.getByText('Spud 486')).toBeTruthy()
  })
})
