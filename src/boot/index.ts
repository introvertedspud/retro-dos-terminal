/**
 * BIOS Boot Module
 *
 * Provides fake BIOS POST screen components for nostalgic boot experiences.
 *
 * @example
 * ```tsx
 * import { BIOSBoot } from 'react-dos-terminal/boot'
 *
 * <BIOSBoot preset="award" onComplete={() => console.log('Ready!')}>
 *   <Terminal plugins={[filesystem]} />
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
