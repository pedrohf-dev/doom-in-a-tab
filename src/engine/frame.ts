import createDoomModule from "../../vendor/doom-wasm/web/public/engine/chocolate-doom.js";
import type { EngineModule } from "./protocol";
import { InputManager } from "./InputManager";
import { AudioManager } from "./AudioManager";
import { nativeConfig, videoConfig } from "./config";

// This entire module, including the engine glue, runs only in the sandbox frame.
const doc = window.document;
const token = doc.documentElement.dataset.token ?? "";
const element = doc.querySelector("canvas");
if (!element) throw new Error("Missing game canvas");
const canvas: HTMLCanvasElement = element;
const resize = () => {
  canvas.style.transform = `scale(${Math.min(window.innerWidth / 640, window.innerHeight / 480)})`;
};
window.addEventListener("resize", resize);
resize();
let engine: EngineModule | undefined;
let started = false;
let paused = false;
let loopStarted = false;
const audio = new AudioManager();
const report = (type: string, message?: string) =>
  window.parent.postMessage({ token, type, message }, "*");

const input = new InputManager(
  canvas,
  () => paused,
  () => audio.activate(engine),
  pause,
  () =>
    Boolean(
      engine && engine._DB_ReadState(0) === 0 && engine._DB_ReadState(7) === 0,
    ),
);
window.addEventListener("pagehide", () => audio.dispose());
window.addEventListener("unload", () => audio.dispose());
function pause() {
  input.release();
  audio.pause();
  const wasPaused = paused;
  paused = true;
  if (engine && !wasPaused) {
    engine._DB_PauseMainLoop();
    report("paused");
  }
}
type Upload = { path: string; bytes: ArrayBuffer };
function isUpload(value: unknown, path: RegExp): value is Upload {
  if (typeof value !== "object" || value === null) return false;
  const upload = value as Record<string, unknown>;
  return (
    typeof upload.path === "string" &&
    path.test(upload.path) &&
    upload.bytes instanceof ArrayBuffer
  );
}
async function start(
  wasm: ArrayBuffer,
  data: ArrayBuffer,
  iwad?: Upload,
  addons: Upload[] = [],
  volume = 1,
) {
  try {
    engine = await createDoomModule({
      canvas,
      noInitialRun: true,
      // Emscripten resolves the WASM filename even when wasmBinary is provided.
      // srcdoc/about:blank cannot resolve relative URLs. These names are only
      // identifiers: both packages are supplied from memory, never fetched.
      locateFile: (path: string) => path,
      // Asyncify can resume a pending SDL delay after the native pause call.
      // Stop that resumed loop before it starts another game tick.
      preMainLoop: () => {
        loopStarted = true;
        if (!paused) return true;
        audio.bind(engine);
        audio.pause();
        engine?._DB_PauseMainLoop();
        return false;
      },
      postMainLoop: () => audio.bind(engine),
      wasmBinary: new Uint8Array(wasm),
      getPreloadedPackage: () => data,
      print: (line: string) => report("log", line),
      printErr: (line: string) => report("log", line),
      onAbort: (reason: unknown) => report("error", String(reason)),
      preRun: [
        (mod: EngineModule) => {
          mod.FS.mkdir("/config");
          mod.FS.mkdir("/savegames");
          mod.FS.mkdir("/uploads");
          mod.FS.writeFile("/config/default.cfg", nativeConfig());
          mod.FS.writeFile("/config/chocolate-doom.cfg", videoConfig());
          for (const upload of [...(iwad ? [iwad] : []), ...addons])
            mod.FS.writeFile(upload.path, new Uint8Array(upload.bytes));
        },
      ],
    });
    try {
      engine.callMain([
        "-window",
        "-iwad",
        iwad?.path ?? "/iwads/freedoom2.wad",
        "-config",
        "/config/default.cfg",
        "-extraconfig",
        "/config/chocolate-doom.cfg",
        "-savedir",
        "/savegames",
        "-width",
        "640",
        "-height",
        "480",
        ...(addons.length
          ? ["-file", ...addons.map((addon) => addon.path)]
          : []),
      ]);
    } catch (error) {
      // Emscripten transfers control to the asynchronous SDL main loop.
      if (error !== "unwind" && error !== "SimulateInfiniteLoop") throw error;
    }
    audio.setVolume(volume);
    audio.bind(engine);
    if (paused) {
      engine._DB_PauseMainLoop();
      audio.pause();
      report("paused");
    } else {
      canvas.focus();
      report("running");
    }
  } catch (error) {
    report("error", error instanceof Error ? error.message : String(error));
  }
}
window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (
    event.source !== window.parent ||
    typeof event.data !== "object" ||
    event.data === null
  ) return;
  const {
    token: receivedToken, type, wasm, data, iwad, addons, volume, startPaused,
  } = event.data as Record<string, unknown>;
  if (receivedToken !== token) return;
  if (
    type === "start" &&
    !started &&
    wasm instanceof ArrayBuffer &&
    data instanceof ArrayBuffer &&
    (iwad === undefined ||
      isUpload(iwad, /^\/uploads\/(?:doom[12]?|freedoom[12])\.wad$/)) &&
    Array.isArray(addons) &&
    addons.length <= 16 &&
    addons.every((addon: unknown): addon is Upload =>
      isUpload(addon, /^\/uploads\/addon-(?:[0-9]|1[0-5])\.wad$/),
    ) &&
    typeof volume === "number" &&
    typeof startPaused === "boolean"
  ) {
    started = true;
    paused = paused || startPaused;
    void start(wasm, data, iwad, addons, volume);
  } else if (type === "pause") pause();
  else if (type === "volume" && typeof volume === "number")
    audio.setVolume(volume);
  else if (type === "resume" && paused) {
    paused = false;
    if (loopStarted) engine?._DB_ResumeMainLoop();
    audio.activate(engine);
    if (engine) {
      canvas.focus();
      report("running");
    }
  }
});
report("ready");
