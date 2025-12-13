/**
 * BIOS Boot Presets
 *
 * Pre-configured BIOS settings for different manufacturers.
 * Based on real 486/Pentium era BIOS screens.
 */

export interface BIOSConfig {
  /** BIOS manufacturer/name */
  biosName: string
  /** BIOS version string */
  biosVersion: string
  /** Copyright notice */
  copyright: string
  /** CPU description */
  cpu: string
  /** Memory in KB to count (default: 640) */
  memory: number
  /** IDE drives to detect */
  drives: {
    primaryMaster?: string
    primarySlave?: string
    secondaryMaster?: string
    secondarySlave?: string
  }
  /** Floppy drive */
  floppy?: string
  /** Show "Press DEL to enter SETUP" */
  showSetupPrompt: boolean
  /** Date format for display */
  dateFormat?: string
}

/**
 * Award BIOS preset - Most common in 90s PCs
 */
export const AWARD_BIOS: BIOSConfig = {
  biosName: 'Award Modular BIOS',
  biosVersion: 'v4.51PG',
  copyright: 'Copyright (C) 1984-95, Award Software, Inc.',
  cpu: 'Intel Pentium-S CPU at 75MHz',
  memory: 640,
  drives: {
    primaryMaster: 'QUANTUM FIREBALL 540MB',
    secondaryMaster: 'CREATIVE CD-ROM CR-563',
  },
  floppy: '1.44M, 3.5 in.',
  showSetupPrompt: true,
}

/**
 * AMI BIOS preset - American Megatrends
 */
export const AMI_BIOS: BIOSConfig = {
  biosName: 'AMIBIOS',
  biosVersion: '(C) 1995 American Megatrends, Inc.',
  copyright: 'BIOS Date: 01/15/95',
  cpu: '80486DX-33 CPU at 33MHz',
  memory: 640,
  drives: {
    primaryMaster: 'MAXTOR 7131AT 131MB',
    secondaryMaster: 'NEC CDR-260 CD-ROM',
  },
  floppy: '1.44M, 3.5 in.',
  showSetupPrompt: true,
}

/**
 * Phoenix BIOS preset
 */
export const PHOENIX_BIOS: BIOSConfig = {
  biosName: 'PhoenixBIOS 4.0 Release 6.0',
  biosVersion: '',
  copyright: 'Copyright 1985-1995 Phoenix Technologies Ltd.',
  cpu: 'Intel Pentium(R) Processor 100MHz',
  memory: 640,
  drives: {
    primaryMaster: 'WESTERN DIGITAL WD2540 540MB',
    secondaryMaster: 'SONY CDU33A CD-ROM',
  },
  floppy: '1.44M, 3.5 in.',
  showSetupPrompt: true,
}

/**
 * Preset name type
 */
export type BIOSPresetName = 'award' | 'ami' | 'phoenix'

/**
 * Get a BIOS preset by name
 */
export function getBIOSPreset(name: BIOSPresetName): BIOSConfig {
  switch (name) {
    case 'award':
      return AWARD_BIOS
    case 'ami':
      return AMI_BIOS
    case 'phoenix':
      return PHOENIX_BIOS
    default:
      return AWARD_BIOS
  }
}
