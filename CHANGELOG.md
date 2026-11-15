# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-11-15

### Added

- `DIR /P` pauses after each screen with "Press any key to continue . . .". Page size is set with `dir({ pageSize })`. Ctrl+C stops the listing, and browser shortcuts such as copy still work while paused.
- `HELP command` and `command /?` show usage for built-in commands. Custom commands can be documented with `help({ descriptions, usage })`.
- DOS shorthand without a space: `cd..`, `cd\`, `dir/w`.
- Root-relative paths such as `cd \GAMES`.
- `ctx.commands` lists the registered command names.
- Key handlers (`onKeyDown` on plugins and programs) receive the keyboard event as a third argument, for checking Ctrl, Alt and Meta.
- Plugins can set CSS custom properties on the terminal root with `cssVariables`.
- Built files start with a `'use client'` directive, so they work in React Server Components apps such as the Next.js App Router without a wrapper.
- `HELP` adds a `beforeCommand` hook so that `command /?` shows usage for any installed command it knows about.
- Root exports for `PartialTheme`, `TerminalProgram`, `FileNode`, `FileSystem`, `TerminalColors`, `TerminalCursor`, `TerminalFont` and `TerminalEffects`. The commands entry also exports `DirOptions`, `HelpOptions` and `VerOptions`.

### Changed

- **Layout:** history and input now scroll inside a new `.dos-terminal__viewport` element, which also has the 8px padding. If you styled scrolling or padding on `.dos-terminal`, move those styles to `.dos-terminal__viewport`.
- **Programs:** the active program now receives key presses directly from the terminal, before other plugins. The programs plugin no longer defines its own `onKeyDown`.
- **Program UI:** an active program's `render()` output now sits inside the scrolling viewport, after the input line, so it scrolls with the output.
- **`TerminalContext`:** `commands` is a new required member. Code that builds its own context object, such as test mocks, needs to add it.
- The context passed to a plugin's `setup` now always reads current values, so plugins that keep it for later see the latest `cwd`, `input` and `commands`.
- Built files are now `.js` and `.d.ts` instead of `.mjs` and `.d.mts`, and shared code moved to `dist/chunks/`. Imports through the package's entry points are unaffected; only deep imports of `dist/` files need updating.
- `HELP` lists only the commands that are installed.
- The cursor follows the text caret instead of always sitting at the end of the line. The block cursor is one character wide and inverts the character under it.
- Plugin command names are matched case-insensitively.
- The package now builds for the browser (ES2020) and marks only CSS files as having side effects, so unused plugins can be tree-shaken.

### Fixed

- Programs could not exit: the `exitProgram` helper read stale shared state. Plugins now always read the current shared state, including in `setup`.
- DOSKEY consumed arrow keys while a program was running.
- `BIOSBoot` called `onComplete` up to three times when skipped.
- `BIOSBoot` never called `onComplete` with `speed="instant"`.
- `BIOSBoot` replaced the bundled VGA font with system fonts, and its blank lines collapsed.
- CRT overlays scrolled out of view once output filled the terminal.
- The CRT `glowColor` and `glowIntensity` options had no effect.
- `..` from a top-level folder did not reach the root, which broke commands like `dir ..` and `type ..\FILE.TXT` from `C:\GAMES`.
- `.` and `..` inside absolute paths (such as `C:\GAMES\..`) were not resolved.
- Rendering `<Terminal />` without plugins logged a warning on every re-render.
- The cursor did not dim when the terminal lost focus.
- DOSKEY dropped the quotes from recalled arguments that contained spaces.
- Apostrophes were treated as quotes, so `echo it's` printed `its`. Only double quotes group words now, as in DOS.
- The README documented APIs that do not exist, some examples did not type-check, and JSDoc examples imported from the wrong package name or used options that do not exist.

## [0.1.0] - 2025-12-13

- Initial release.

[0.2.0]: https://github.com/introvertedspud/retro-dos-terminal/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/introvertedspud/retro-dos-terminal/releases/tag/v0.1.0
