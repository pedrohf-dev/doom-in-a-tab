# Doom in a Tab

Play Doom in a desktop Obsidian tab. The plugin runs Chocolate Doom in WebAssembly and includes Freedoom Phase 2. You can also load your own Doom WAD files.

## Support development

Enjoy playing Doom in your vault? [Support my work on Ko-fi](https://ko-fi.com/pedrohlf). Donations are optional and help me maintain the plugin.

## Install

Requires Obsidian Desktop 1.8.0 or later and a keyboard. Get `main.js`, `manifest.json`, and `styles.css` from [GitHub Releases](https://github.com/pedrohf-dev/doom-in-a-tab/releases). Put all three in `<vault>/.obsidian/plugins/doom-in-a-tab/`, then enable **Doom in a Tab** under **Settings → Community plugins**. For a vault with a custom configuration folder, use that folder in place of `.obsidian`.

If you installed an earlier preview, disable **Obsidian DOOM** and install this release in the new `doom-in-a-tab` folder. The plugin ID changed before Community directory submission.

## Play

Open the game from the gamepad ribbon icon or the **Open DOOM** command. Click **Play / Resume**, then choose **New Game** and a skill level. Click the canvas to enable sound and capture the mouse.

- **WASD** to move and strafe. **Up/Down** move and **Left/Right** or the mouse turn.
- **Ctrl** or left click fires. **E** or **Space** interacts. **Shift** runs.
- **1–7** select weapons. **Tab** opens the automap. **Esc** releases the mouse or opens the game menu.
- Use the toolbar for master volume and mute. **F4** opens the game's sound menu.

Switching tabs pauses the game. **Restart** starts a new engine session. Saves and settings are temporary and disappear when you restart or close the game.

### Use your own WADs

**Load WAD** opens a file picker. Select one base IWAD and up to 16 vanilla-compatible PWAD add-ons. Select all add-ons together, since each new selection replaces the previous add-on list. The plugin checks WAD directory bounds, map structure, and base-game compatibility before handing the files to the engine. Individual files are limited to 128 MiB and the selected files to 192 MiB in total.

The engine supports Freedoom Phase 1 and 2, Doom, Doom II, and Doom Shareware IWADs. Shareware does not support add-ons. Select **Play / Resume** after loading files. **Freedoom 2** restores the bundled game. Reselect custom WADs after closing the tab or Obsidian.

## Privacy and file access

Gameplay is offline. The plugin makes no network requests, collects no telemetry, displays no ads, and requires no account or payment to play. The file picker can read WAD files outside the vault only when you select them. The plugin keeps those files in memory and does not read or write notes. The game runs in an isolated iframe with network access blocked. WebAssembly and game data ship inside `main.js`.

## Build and verify

Use Node.js 22.13+ or 24+ and npm.

```sh
npm ci
npm run check
npm run lint
npm test
npm run build
npm run package:source
```

The installable files are in `dist/doom-in-a-tab/`. Corresponding source and notices are in `dist/doom-in-a-tab-source/`. The plugin build verifies the SHA-256 hashes of the vendored engine artifacts. See the [engine build instructions](docs/engine-build.md) for rebuilding the WebAssembly engine from the included C source.

For the browser smoke test, set `DOOM_BROWSER_PATH` to a Chrome, Chromium, or Edge executable and run `npm run test:browser` after building. The test runs the release bundle in an offline Chromium test host.

## Licensing

The plugin and [Chocolate Doom](https://github.com/chocolate-doom/chocolate-doom) use the [GPL-2.0-or-later license](LICENSE). [Freedoom Phase 2](https://github.com/freedoom/freedoom) uses its [permissive license](vendor/doom-wasm/licenses/FREEDOOM-COPYING.txt). The [third-party notices](vendor/doom-wasm/licenses/THIRD_PARTY_NOTICES.md) cover the engine, game assets, SDL, and Emscripten. No commercial Doom assets are bundled. Doom in a Tab is an unofficial project.

## Sync and source downloads

The bundled game makes main.js about 43 MiB. This exceeds the 5 MB per-file limit reported by Obsidian Sync Standard. Install the plugin separately on each desktop. Saves remain temporary.

GitHub provides corresponding source as the automatic source-code archives on each release, including the vendored engine source, build scripts and licenses. Release assets are built and attested by GitHub Actions.
