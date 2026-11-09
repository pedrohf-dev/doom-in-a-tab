# Validation

## 0.1.0 — M1 gameplay development

The user reported that the real game opened and other controls worked inside
Obsidian, while WASD did not. On that report the M0 experiment was extended into
an M1 candidate; M1 full-level acceptance is still pending. M2 and M3 remain
uncompleted. No completion of a whole level, desktop audio listening test or
cross-platform acceptance is claimed.

The WASD cause was reproduced in the engine source: `m_config.c` translates
configuration values through the DOS `scantokey[]` table. Earlier builds wrote
ASCII (119/115/97/100), which was wrong. Native config now uses DOS scancodes
17/31/30/32. E is native use; Space and Up/Down aliases apply only during gameplay,
so menu navigation and save-name text keep native behavior.

The original pixel-difference browser test combined W and ArrowRight; a turn
could satisfy it while W was broken. It has been replaced with a read-only
native-state test. On the rebuilt engine it independently observed:

- W: forward command 25 and 14.07 map units of player displacement.
- S: forward command -25 and 8.08 units of displacement.
- A/D: sidemove commands -24/+24 and 14.32/7.82 units respectively.
- Shift+W: original run command 50; E/Space: native use bit.
- Native arrow turn, Tab automap, title -> New Game -> skill -> MAP01.
- Nonzero Web Audio output from native OPL music. With music set to zero using
  the real F4 menu, firing consumed ammo and generated nonzero digital SFX output.
- Real browser pointer lock, mouse yaw and left-button pistol fire.
- Master mute, suspended audio and frozen native tics during pause, release of
  held W after leaving/resuming the game, single view, restart and close cleanup.
- Uploaded IWAD loading; invalid WAD rejection without destroying the current
  engine. Structural parser tests include the real bundled Freedoom IWAD.

All these browser checks ran with offline networking and zero asset requests or
uncaught errors. The test uses the production bundle, real WASM and Freedoom,
with an Obsidian UI adapter. Native diagnostics do not write game state or move
the player. They also determine when convenience aliases should yield to menus.

The mouse/rendering bug was a missing `id="canvas"`: SDL 2.32.8 registers its
canvas input/size callbacks against `#canvas`. The corrected canvas has that ID
and keeps a stable layout size with CSS scaling around the 4:3 game display.
Video options now go in the extra config rather than the DOS defaults file.

The engine has been rebuilt from C with Emscripten 4.0.14 and SDL2_mixer enabled.
The WASM/C build and ordinary plugin build have both executed locally. The
corresponding source, checksums and new SDL_mixer license are included.
Automated unit coverage now also checks real DOS scancode translation, WAD
directory/range checks, unsupported formats and base/add-on compatibility.
The latest check run passed TypeScript, lint, 13 unit tests and the offline
production-bundle browser regression. The browser upload check also mounts a
real resource PWAD containing Freedoom's palette and verifies both -iwad and
-file paths in the native engine log. Loading-time focus loss is carried through
the start handshake so the engine does not start running behind another tab.

Outstanding M1 acceptance: play a complete level in Obsidian with audio and mouse;
exercise provided DOOM/DOOM II/shareware/Phase 1 IWADs (only bundled Freedoom 2 was
executed here). Saves remain volatile; settings persistence/fullscreen remain M2.

## 0.0.3 — installed version identification and valid module base

After another report of the same URL error, the local test vault was found to
still contain 0.0.1 (`main.js` 40,891,628 bytes). It was updated from the corrected
build and its SHA-256 was compared successfully. The user's currently tested
computer/vault has not yet been identified, so this is not proof of the cause
of the second report. The local Obsidian test vault still shows its first-open
trust prompt; automation has not accepted it.

The build now also uses an inert hierarchical `file:///__obsidian_doom__/...`
module identity instead of `about:blank`, so Emscripten's default URL resolution
is valid even if invoked. This identity is never accessed: WASM/data still come
from memory and CSP denies asset connections. The view displays the actual
plugin manifest version next to Play, to identify an old loaded main.js.
The browser regression checks this label as well as real offline gameplay.

## 0.0.2 — invalid URL startup correction

The 0.0.1 production bundle was run with real WASM and Freedoom in Chromium
156.0.8078.4, using a minimal Obsidian UI host. It reproduced the reported
`Failed to construct 'URL': Invalid URL` error. The Emscripten glue evaluates
`findWasmBinary()` even when `wasmBinary` has been supplied. Its default relative
URL resolution cannot use the iframe's `about:blank` module base.

The 0.0.2 frame supplies `locateFile`, preserving package names as identifiers
while obtaining WASM/data exclusively from memory. No vendored engine bytes or
hashes changed. The same browser smoke test now starts real DOOM and exercises
frame rendering, a frozen framebuffer while paused, keyboard movement/turning,
single-tab reuse, restart and closing. The browser context is offline, with zero
asset requests and zero uncaught browser errors.

The extended pause assertion also exposed an Asyncify race: a pending SDL delay
can resume the loop after a native pause. A `preMainLoop` guard now re-applies
pause before another game tick. The test allows the in-flight frame to finish
and then verifies a stable framebuffer. Typecheck, lint, build, all four unit
tests and the real-browser regression passed with the final correction.

Run the optional regression with `node tests/browser-smoke.mjs` after building;
it requires Playwright and an installed Chromium. `DOOM_PLAYWRIGHT_MODULE` and
`DOOM_BROWSER_PATH` can select existing local installations. Evidence is written
to `.local/browser-smoke/` and is not included in releases.

This is a real browser-engine integration check, not an Obsidian Desktop
acceptance test: the UI host is a test adapter. M0 still awaits the user's
Obsidian validation; M1–M3 remain unstarted.

## M0

Run on Windows, 2026-10-28. Obsidian Desktop 1.14.5 was opened with an isolated
vault at `.local/test-vault`. The first-open trust prompt appeared. The user
chose to perform the gameplay validation manually later; the prompt was not
accepted by automation. No actual game frame or movement has been observed.

| Check                                            | Result                                   |
| ------------------------------------------------ | ---------------------------------------- |
| `npm run check`                                  | Passed                                   |
| `npm run lint`                                   | Passed, no warnings                      |
| `npm test`                                       | 4 passed                                 |
| `npm run build`                                  | Passed, bundled engine integrity checked |
| `npm run package:source`                         | Passed, corresponding source copied      |
| Open test vault in Obsidian                      | Confirmed, stopped at trust prompt       |
| Engine rendering and player movement in Obsidian | Pending manual validation                |
| Offline gameplay, FPS, memory, Linux, macOS      | Pending                                  |

The automated tests exercise the message validator and runtime lifecycle using
JSDOM, substituting tiny test payloads for the game assets. They verify duplicate
start prevention, the sandbox/CSP, rejection of wrong message sources and stale
tokens, replacement on restart and cleanup on error/close. They do **not** execute
DOOM or establish the gameplay acceptance criterion. Production builds use the
real vendored WASM/data and reject changed artifact hashes or eval/new Function.

Dependency installation was not repeated in a clean checkout: checks used the
existing parent workspace's tool installation. A dedicated lockfile was generated
for clean installation with `npm ci`. A clean-checkout build remains to verify.

M0 acceptance remains **pending**. M1, M2 and M3 have not been started.

Acceptance requires showing MAP01 in an Obsidian ItemView and observing keyboard
movement. A build success, a running callback or an isolated browser run is not
enough to mark M0 complete. No later milestone is complete.

Manual checklist:

- Open via Ribbon and palette; repeated commands reuse one leaf.
- Play: real Freedoom map appears; WASD moves and arrows rotate.
- Switch notes: no stuck keys or game hotkey capture; resume works.
- Pause and restart; close/reopen; unload plugin without background game.
- Repeat offline. Record OS, Obsidian version, evidence and limitations.

## Manual handoff

1. In the open `test-vault`, trust the author and enable plugins if you wish to
   continue testing the development build. The personal vault is unaffected.
2. Click the gamepad Ribbon icon, then Play / Resume. MAP01 should render.
3. Click inside the game. Hold W briefly and use the arrow keys. Confirm that
   the player's viewpoint changes; an animated scene alone is not sufficient.
4. Pause/resume, switch to Welcome, and return. Confirm no stuck movement.
5. Run Open DOOM repeatedly, restart twice, then close/reopen the DOOM tab.
6. Report whether the level renders, movement works, and any visible errors.

If startup fails, record the status text. This integration is an unvalidated
M0 candidate and may still need changes to suit the Electron renderer/CSP.
