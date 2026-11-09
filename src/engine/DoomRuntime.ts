import frameCode from "doom-frame?text";
import wasmBase64 from "../../vendor/doom-wasm/web/public/engine/chocolate-doom.wasm?base64";
import dataBase64 from "../../vendor/doom-wasm/web/public/engine/chocolate-doom.data?base64";
import { isEngineEvent, type RuntimeState } from "./protocol";
import { validateSelection, type WadSelection } from "./WadManager";

function decode(value: string): ArrayBuffer {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

export class DoomRuntime {
  state: RuntimeState = "idle";
  private frame?: HTMLIFrameElement;
  private timer?: number;
  private removeListener?: () => void;
  private token = "";
  private selection: WadSelection = { addons: [] };
  private volume = 1;
  private logs: string[] = [];
  private pauseRequested = false;
  constructor(
    private readonly host: HTMLElement,
    private readonly changed: (state: RuntimeState, message?: string) => void,
    private readonly logChanged?: (text: string) => void,
  ) {}

  private setState(state: RuntimeState, message?: string) {
    this.state = state;
    this.changed(state, message);
  }

  start() {
    if (this.frame || this.state === "loading") return;
    this.setState("loading");
    this.pauseRequested = false;
    this.logs = [];
    this.logChanged?.("");
    this.token = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const frame = this.host.ownerDocument.createElement("iframe");
    this.frame = frame;
    frame.className = "doom-frame";
    frame.title = "DOOM game";
    frame.setAttribute("sandbox", "allow-scripts allow-pointer-lock");
    const owner = this.host.ownerDocument.defaultView!;
    let startSent = false;
    const listener = (event: MessageEvent) => {
      if (
        event.source !== frame.contentWindow ||
        event.origin !== "null" ||
        !isEngineEvent(event.data, this.token)
      )
        return;
      const { type, message } = event.data;
      if (type === "ready") {
        if (startSent) return;
        startSent = true;
        try {
          const wasm = decode(wasmBase64),
            data = decode(dataBase64);
          const iwad = this.selection.iwad
            ? {
                path: `/uploads/${this.selection.iwad.info.canonicalName}`,
                bytes: this.selection.iwad.bytes.slice().buffer,
              }
            : undefined;
          const addons = this.selection.addons.map((wad, i) => ({
            path: `/uploads/addon-${i}.wad`,
            bytes: wad.bytes.slice().buffer,
          }));
          frame.contentWindow?.postMessage(
            {
              token: this.token,
              type: "start",
              wasm,
              data,
              iwad,
              addons,
              volume: this.volume,
              startPaused: this.pauseRequested,
            },
            "*",
            [
              wasm,
              data,
              ...(iwad ? [iwad.bytes] : []),
              ...addons.map((addon) => addon.bytes),
            ],
          );
        } catch (error) {
          this.stop();
          this.setState(
            "error",
            error instanceof Error ? error.message : String(error),
          );
        }
      } else if (type === "log") {
        this.logs.push((message ?? "").slice(0, 2000));
        this.logs = this.logs.slice(-60);
        this.logChanged?.(this.logs.join("\n"));
      } else if (type === "running" || type === "paused" || type === "error") {
        owner.clearTimeout(this.timer);
        if (type === "error") this.stop();
        this.setState(type, message);
        if (type === "running" && this.pauseRequested) this.send("pause");
      }
    };
    owner.addEventListener("message", listener);
    this.removeListener = () => owner.removeEventListener("message", listener);
    frame.srcdoc = `<!doctype html><html data-token="${this.token}"><head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; connect-src 'none'">
      <style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}body{display:flex;align-items:center;justify-content:center}canvas{width:640px!important;height:480px!important;flex:none;image-rendering:pixelated;outline:none;transform-origin:center}</style>
      </head><body><canvas id="canvas" width="640" height="480" tabindex="0" aria-label="DOOM game canvas"></canvas>
      <script nonce="${nonce}">${frameCode.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
    this.timer = owner.setTimeout(() => {
      this.stop();
      this.setState(
        "error",
        "The engine did not start within 60 seconds. Try Restart.",
      );
    }, 60_000);
    this.host.appendChild(frame);
  }

  pause() {
    if (this.state === "running" || this.state === "loading") {
      this.pauseRequested = true;
      this.send("pause");
    }
  }
  get wadLabel() {
    return this.selection.iwad?.name ?? "Freedoom Phase 2";
  }
  loadWads(selection: WadSelection) {
    validateSelection(selection);
    this.stop();
    this.selection = selection;
    this.setState(
      "idle",
      `${this.wadLabel} + ${selection.addons.length} add-on(s). Press Play.`,
    );
  }
  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    this.frame?.contentWindow?.postMessage(
      { token: this.token, type: "volume", volume: this.volume },
      "*",
    );
  }
  resume() {
    this.pauseRequested = false;
    if (this.state === "paused" || this.state === "loading")
      this.send("resume");
    else if (!this.frame) this.start();
  }
  private send(type: string) {
    this.frame?.contentWindow?.postMessage({ token: this.token, type }, "*");
  }
  restart() {
    this.stop();
    this.start();
  }
  stop() {
    this.host.ownerDocument.defaultView?.clearTimeout(this.timer);
    this.removeListener?.();
    this.removeListener = undefined;
    this.frame?.remove();
    this.frame = undefined;
    this.setState("stopped");
  }
}
