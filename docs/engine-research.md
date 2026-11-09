# Engine decision — M0, 2026-10-28

## Compared implementations

1. [Cloudflare doom-wasm](https://github.com/cloudflare/doom-wasm): Chocolate
   Doom, GPL-2.0, Emscripten/SDL, working browser port with WebSocket additions.
   Its historical toolchain and network additions increase M0 integration work.
2. [DoomGeneric](https://github.com/ozkl/doomgeneric): GPL-2.0 engine exposing
   framebuffer, ticks and key hooks, with an Emscripten target. Attractive for
   a small custom host, but audio needs more platform work.
3. [gabrielbotandev/doom-wasm](https://github.com/gabrielbotandev/doom-wasm):
   chosen for M0. Chocolate Doom with asynchronous browser main loop, exported
   pause/resume, modern Emscripten module, source, build script and Freedoom data.

## Pinned provenance

- Port commit: `64de0924591dec59a7d49a7d10467e125b50ea99`.
- Chocolate Doom commit stated by port:
  `3e0cd5dc0cd0d5b6788100a2fbc1cdd4ce014b35`.
- Emscripten version requested by upstream build script: `4.0.14`.
- Freedoom 0.13.0 Phase 2: bundled by port, with credits and copying notice.
- SHA-256 artifact digests: `vendor/checksums.json`; build checks them before use.
- C source and unchanged upstream build script: `vendor/doom-wasm/engine/`.

Precompiled artifacts are reused, not rebuilt locally in this iteration. The
source-to-binary correspondence is asserted by upstream and not independently
reproduced. A reproducible rebuild and provenance audit are publication gates.

## Integration decisions

Use a sandboxed iframe with scripts enabled and **without same-origin access**.
Bundle the engine factory at build time into the frame bootstrap; do not use
upstream web UI, which loads the factory through eval. The selected engine glue
contains no eval or new Function. Fail build if either appears in bundled code.

Embed WASM and data as base64 in main.js to fit the three standard Community
plugin release files. Decode and transfer buffers only on explicit Play. This
increases package size and startup allocations; measure before publication.
Supply wasmBinary and getPreloadedPackage to avoid fetching any engine assets.
Also supply `locateFile` to return the package identifier directly: Emscripten
resolves the WASM filename even with supplied binary bytes, and its default
relative URL construction fails against `about:blank` inside the srcdoc frame.
Frame CSP denies connections and all unlisted resources. WASM compilation uses
the narrow wasm-unsafe-eval permission; JavaScript eval is not enabled.

Messages require both the iframe WindowProxy identity and a per-instance random
token. Engine callbacks, keyboard listeners and memory belong to the iframe.
Restart/close removes it, with no Emscripten listeners in the Obsidian document.
Blur releases held keys and pauses the native Emscripten main loop. A workspace
leaf change also requests pause; explicit Resume restores gameplay focus.

The M0 forces SDL's software renderer and disables sound. Native engine config
binds WASD; no remapping by global Obsidian keyboard handlers. Rendering uses
the engine's 640×480, 4:3 canvas with pixel scaling and containment.

Only the plugin engine runs in WASM. Build tools execute locally during
development; the installed plugin launches no native binaries or servers.

## Staged acceptance

M0 must show an actual level and keyboard movement in Obsidian before M1.
M1 adds validated IWAD/PWAD input, audio, mouse and full-level validation.
M2 adds settings, fullscreen and durable saves separated by IWAD content hash.
M3 adds Windows/Linux/macOS checks, memory/FPS evidence, source rebuild,
screenshots, license audit and Community submission preparation.
