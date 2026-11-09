# Building the actual DOOM engine

The engine is Chocolate Doom 3.1.1 with the vendored browser main-loop port.
Version 0.1.0 rebuilds it locally, rather than reusing the upstream silent binary.
No engine game rules, enemy behavior, weapon logic, collisions or map logic were
rewritten. Browser glue remains isolated in the sandboxed iframe.

## Windows recipe used for this release

Requires Git, Python 3, Node.js 22+ and a working internet connection for the first
SDK/port download. Commands run from the Obsidian DOOM directory:

```sh
git clone --depth 1 https://github.com/emscripten-core/emsdk.git .local/emsdk
python .local/emsdk/emsdk.py install 4.0.14
python .local/emsdk/emsdk.py activate 4.0.14
python -m pip install --target .local/build-tools cmake==3.31.6 ninja==1.11.1.3
npm run build:wasm
npm run build
```

The SDK installer checkout used here was
`d7b4130688bfa348392b921ab04015aa15c4f154`. Preserve that installer revision
when reproducing its exact bundled Python/Node paths; future emsdk revisions
may change those dependency versions even when selecting the same compiler.

The Node script uses the SDK's own Python on Windows, local CMake/Ninja and the
SDK configuration under `.local`. It does not register tools globally. On POSIX,
activate the same SDK and supply CMake/Ninja on PATH. `DOOM_EMSDK`, `DOOM_CMAKE`
and `DOOM_NINJA` can override paths. Only the Windows recipe has been executed.

The build enables SDL2_mixer and disables SDL2_net. Digital sound effects come
from WAD samples through the engine's SDL mixer; native OPL synthesis plays the
MUS/MIDI music. External audio decoders and remote music are not required.
Emscripten 4.0.14 selects SDL 2.32.8 and SDL_mixer 2.8.0; their copying notices
are preserved under `vendor/doom-wasm/licenses/`.

Link options include Asyncify, memory growth, `DYNAMIC_EXECUTION=0` and `-g3`.
The latter preserves export names for read-only diagnostics; this increases the
WASM size and limits some Binaryen optimizations. The C code still uses -O3.
Emscripten's POSIX header probes are set explicitly for its sysroot so an earlier
Windows configure attempt cannot cache incorrect host-header results.

## Source changes and verification

- Existing browser pause/resume exports and browser main loop are retained.
- `src/browser_observer.c` exposes a read-only snapshot of player coordinates,
  tic commands, ammo, menus, volumes and SDL focus for integration tests.
- A read-only focus getter in `i_video.c` supports that snapshot.
- CMake includes the observer only in the browser DOOM executable.
- The plugin uses the menu state to limit convenience key aliases to gameplay;
  menus and save-name text retain native keyboard behavior.

The build copies JS/WASM/data into `vendor/doom-wasm/web/public/engine/` and
updates `vendor/checksums.json`. Plugin builds verify those hashes and reject
eval/new Function in the generated engine wrapper. Neither `.local` SDK files
nor local test vaults are included in source or plugin distributions.

Run `npm test` for config/WAD/lifecycle checks and `npm run test:browser` for real
engine checks. The latter needs Playwright plus Chromium; paths can be selected
with `DOOM_PLAYWRIGHT_MODULE` and `DOOM_BROWSER_PATH`. It loads production main.js
with a small Obsidian UI adapter, runs offline and reads native state without
changing game state. This is distinct from acceptance inside Obsidian Desktop.
