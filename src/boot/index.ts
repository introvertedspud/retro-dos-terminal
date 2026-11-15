/**
 * BIOS Boot Module
 *
 * Provides fake BIOS POST screen components for nostalgic boot experiences.
 *
 * @example
 * ```tsx
 * import { BIOSBoot } from 'retro-dos-terminal/boot'
 * import { DOSTerminal } from 'retro-dos-terminal/presets/dos'
 *
 * <BIOSBoot preset="award" onComplete={() => console.log('Ready!')}>
 *   <DOSTerminal filesystem={files} />
 * </BIOSBoot>
 * ```
 */

export { BIOSBoot, type BIOSBootProps } from './bios-boot'
export {
  getBIOSPreset,
  AWARD_BIOS,
  AMI_BIOS,
  PHOENIX_BIOS,
  type BIOSConfig,
  type BIOSPresetName,
} from './presets'
