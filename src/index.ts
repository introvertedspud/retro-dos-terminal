/**
 * react-dos-terminal
 *
 * DOS-style terminal emulator for React.
 * Because not everything needs to be Unix.
 */

// Core types
export type {
  TerminalLine,
  TerminalTheme,
  TerminalPlugin,
  TerminalContext,
  CommandHandler,
  CommandResult,
  CursorStyle,
} from './core/types'

// Core component
export { Terminal } from './core/terminal'
export type { TerminalProps, TerminalHandle } from './core/terminal'

// Utilities
export { parseCommandLine } from './core/terminal'

// Theme presets
export {
  dosTheme,
  phosphorGreenTheme,
  phosphorAmberTheme,
  themePresets,
} from './themes'
export type { ThemePresetName } from './themes'

// BIOS Boot
export { BIOSBoot } from './boot'
export type { BIOSBootProps, BIOSConfig, BIOSPresetName } from './boot'
export { getBIOSPreset, AWARD_BIOS, AMI_BIOS, PHOENIX_BIOS } from './boot'

export const VERSION = '0.1.0'
