/**
 * Theme presets for react-dos-terminal
 */

import type { TerminalTheme } from '../core/types'

/** Classic DOS - gray text on black */
export const dosTheme: TerminalTheme = {
  colors: {
    background: '#000000',
    text: '#aaaaaa',
    prompt: '#aaaaaa',
    error: '#ff5555',
    command: '#ffffff',
    selection: '#444444',
  },
  cursor: {
    style: 'block',
    blink: true,
    blinkSpeed: 530,
  },
  promptFormat: '{cwd}>',
  font: {
    family: '"DOS VGA", "Consolas", "Courier New", monospace',
    size: '16px',
    lineHeight: 1.2,
  },
}

/** Green phosphor - classic green terminal */
export const phosphorGreenTheme: TerminalTheme = {
  colors: {
    background: '#0a1a0a',
    text: '#33ff33',
    prompt: '#33ff33',
    error: '#ff3333',
    command: '#66ff66',
    selection: '#1a4a1a',
  },
  cursor: {
    style: 'block',
    blink: true,
    blinkSpeed: 530,
    color: '#33ff33',
  },
  promptFormat: '{cwd}>',
  font: {
    family: '"DOS VGA", "Consolas", "Courier New", monospace',
    size: '16px',
    lineHeight: 1.2,
  },
}

/** Amber phosphor - warm amber terminal */
export const phosphorAmberTheme: TerminalTheme = {
  colors: {
    background: '#1a1400',
    text: '#ffb000',
    prompt: '#ffb000',
    error: '#ff4444',
    command: '#ffc832',
    selection: '#4a3a00',
  },
  cursor: {
    style: 'block',
    blink: true,
    blinkSpeed: 530,
    color: '#ffb000',
  },
  promptFormat: '{cwd}>',
  font: {
    family: '"DOS VGA", "Consolas", "Courier New", monospace',
    size: '16px',
    lineHeight: 1.2,
  },
}

/** All available theme presets */
export const themePresets = {
  dos: dosTheme,
  'phosphor-green': phosphorGreenTheme,
  'phosphor-amber': phosphorAmberTheme,
} as const

/** Valid preset names */
export type ThemePresetName = keyof typeof themePresets
