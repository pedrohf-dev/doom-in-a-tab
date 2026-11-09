# Upstream Provenance

## Obsidian DOOM 0.1.0 rebuild

The original vendored source below is now built through
`../../../scripts/build-wasm.mjs` with SDL2_mixer enabled and SDL2_net disabled.
Local C additions are the read-only `src/browser_observer.c` state observer and
a read-only window-focus getter in `src/i_video.c`; CMake includes the observer
for the browser DOOM executable. Game rules and rendering algorithms are not
reimplemented. Artifact hashes are in `../../checksums.json`.

## Chocolate Doom

- Upstream: `https://github.com/chocolate-doom/chocolate-doom`
- Vendored commit: `3e0cd5dc0cd0d5b6788100a2fbc1cdd4ce014b35`
- License: GPL-2.0-or-later
- Local changes:
  - Emscripten runtime exports fixed for modern builds
  - Browser pause/resume entry points added
  - Doom main loop switched to `emscripten_set_main_loop_arg()`

## Freedoom

- Upstream: `https://github.com/freedoom/freedoom`
- Source tree commit inspected for provenance: `d7ad12f26d644aedc4d94b598087223d3e4a38dd`
- Bundled release asset: `freedoom-0.13.0.zip`
- Default IWAD shipped here: `freedoom2.wad`
- License: see `licenses/FREEDOOM-COPYING.txt`
