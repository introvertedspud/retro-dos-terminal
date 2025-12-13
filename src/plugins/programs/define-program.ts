/**
 * defineProgram - Helper to create program definitions
 *
 * Provides type-safe creation of interactive DOS programs.
 */

import type { ProgramDefinition } from './programs'

/**
 * Creates a program definition for use with the programs plugin
 *
 * @example
 * ```tsx
 * const echoProgram = defineProgram({
 *   commands: ['myecho', 'myecho.exe'],
 *   onStart: (ctx) => {
 *     ctx.print('ECHO Program v1.0')
 *     ctx.print('Type something and press Enter. Type EXIT to quit.')
 *     ctx.print('')
 *   },
 *   onInput: (input, ctx) => {
 *     if (input.toLowerCase() === 'exit') {
 *       ctx.print('Goodbye!')
 *       ctx.get<() => void>('exitProgram')?.()
 *       return { handled: true }
 *     }
 *     ctx.print(`> ${input}`)
 *     return { handled: true }
 *   },
 * })
 * ```
 *
 * @example With directory restriction
 * ```tsx
 * const gameProgram = defineProgram({
 *   commands: ['snake', 'snake.exe'],
 *   directories: ['C:\\GAMES'],  // Only runs from C:\GAMES
 *   onStart: (ctx) => ctx.print('Starting Snake...'),
 *   onInput: (input, ctx) => {
 *     // Handle game input
 *     return { handled: true }
 *   },
 *   onKeyDown: (key, ctx) => {
 *     // Handle arrow keys for game
 *     if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
 *       // Move snake
 *       return true  // Consume the key
 *     }
 *     return false
 *   },
 * })
 * ```
 */
export function defineProgram(definition: ProgramDefinition): ProgramDefinition {
  return definition
}
