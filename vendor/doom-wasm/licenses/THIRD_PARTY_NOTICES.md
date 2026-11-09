# Third-Party Notices

## Obsidian DOOM 0.1.0 audio rebuild

The engine is rebuilt from its included C source with Emscripten 4.0.14,
SDL 2.32.8 and SDL_mixer 2.8.0. SDL_mixer's zlib license is preserved in
`SDL2-MIXER-LICENSE.txt`. Its external-format decoders are not required by the
final link: the native engine mixes WAD sound effects and synthesizes OPL music.
The previous silent upstream build recipe is not the production build recipe;
see the repository's `docs/engine-build.md` and `scripts/build-wasm.mjs`.

## Engine

### Chocolate Doom

- Source path: `engine/vendor/chocolate-doom`
- Upstream: `https://github.com/chocolate-doom/chocolate-doom`
- License: GPL-2.0-or-later
- License text: `licenses/CHOCOLATE-DOOM-GPL-2.0.md`

## Default Game Data

### Freedoom 0.13.0

- Asset path: `engine/assets/freedoom2.wad`
- Release asset: `https://github.com/freedoom/freedoom/releases/tag/v0.13.0`
- License text: `licenses/FREEDOOM-COPYING.txt`
- Additional attribution: `licenses/CREDITS.txt`, `licenses/CREDITS-MUSIC.txt`

## WebAssembly Toolchain

### Emscripten

- Usage: compile Chocolate Doom to JavaScript + WebAssembly
- License text: `licenses/EMSCRIPTEN-LICENSE.txt`

### SDL2

- Usage: browser-targeted SDL2 compatibility layer through Emscripten ports
- License text: `licenses/SDL2-LICENSE.txt`
