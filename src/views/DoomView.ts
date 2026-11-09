import { ItemView, Notice, type WorkspaceLeaf } from "obsidian";
import { DoomRuntime } from "../engine/DoomRuntime";
import {
  MAX_WAD_BYTES,
  inspectWad,
  validateSelection,
  type WadSelection,
  type SelectedWad,
} from "../engine/WadManager";

export const VIEW_TYPE = "obsidian-doom-game";
export class DoomView extends ItemView {
  runtime?: DoomRuntime;
  private selection: WadSelection = { addons: [] };
  private selectionRequest = 0;
  constructor(
    leaf: WorkspaceLeaf,
    private readonly version: string,
  ) {
    super(leaf);
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "DOOM";
  }
  getIcon() {
    return "gamepad-2";
  }
  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("doom-view");
    const toolbar = root.createDiv({ cls: "doom-toolbar" });
    toolbar.createSpan({
      cls: "doom-version",
      text: `DOOM ${this.version}`,
    });
    const button = (label: string, action: () => void) => {
      const el = toolbar.createEl("button", { text: label });
      this.registerDomEvent(el, "click", action);
      return el;
    };
    button("Play / Resume", () => this.runtime?.resume());
    const pause = button("Pause", () => this.runtime?.pause());
    button("Restart", () => this.runtime?.restart());
    const files = root.createEl("input");
    files.type = "file";
    files.accept = ".wad";
    files.multiple = true;
    files.hidden = true;
    button("Load WAD", () => files.click());
    button("Freedoom 2", () => {
      this.selectionRequest++;
      this.selection = { addons: [] };
      this.runtime?.loadWads(this.selection);
    });
    this.registerDomEvent(
      files,
      "change",
      () => {
        const picked = Array.from(files.files ?? []);
        files.value = "";
        void this.loadFiles(picked);
      },
    );
    const volumeLabel = toolbar.createEl("label", { text: "Volume " });
    const volume = volumeLabel.createEl("input");
    volume.type = "range";
    volume.min = "0";
    volume.max = "100";
    volume.value = "100";
    volume.setAttribute("aria-label", "Master volume");
    this.registerDomEvent(volume, "input", () =>
      this.runtime?.setVolume(Number(volume.value) / 100),
    );
    let muted = false;
    const mute = button("Mute", () => {
      muted = !muted;
      mute.setText(muted ? "Unmute" : "Mute");
      this.runtime?.setVolume(muted ? 0 : Number(volume.value) / 100);
    });
    this.registerDomEvent(volume, "input", () => {
      muted = false;
      mute.setText("Mute");
    });
    const status = root.createEl("p", {
      cls: "doom-status",
      text: "idle — Freedoom Phase 2",
    });
    status.setAttribute("role", "status");
    const host = root.createDiv({ cls: "doom-viewport" });
    root.createEl("p", {
      cls: "doom-help",
      text: "Classic DOOM • WASD / ↑↓: move · ←→ / mouse: turn · Ctrl / left click: fire · E / Space: use · Shift: run · 1–7: weapons · Tab: map · Esc: menu / release pointer. Click the game for sound and mouse capture. Saves are temporary in this version.",
    });
    const details = root.createEl("details", { cls: "doom-log" });
    details.createEl("summary", { text: "Engine log" });
    const log = details.createEl("pre");
    this.runtime = new DoomRuntime(
      host,
      (state, message) => {
        status.setText(
          `${state}${message ? ` — ${message}` : ` — ${this.runtime?.wadLabel ?? "Freedoom Phase 2"}`}`,
        );
        pause.disabled = state !== "running";
      },
      (text) => log.setText(text),
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf !== this.leaf) this.runtime?.pause();
      }),
    );
  }
  private async loadFiles(files: File[]) {
    const runtime = this.runtime;
    if (!files.length || !runtime) return;
    const request = ++this.selectionRequest;
    try {
      const wads: SelectedWad[] = [];
      if (files.length > 17)
        throw new Error("Choose one IWAD and at most 16 add-ons.");
      if (files.reduce((sum, file) => sum + file.size, 0) > 192 * 1024 * 1024)
        throw new Error("Selected WADs exceed the 192 MB limit.");
      for (const file of files) {
        if (!/\.wad$/i.test(file.name))
          throw new Error("Choose .wad files only.");
        if (file.size > MAX_WAD_BYTES)
          throw new Error("Each WAD must be at most 128 MB.");
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (request !== this.selectionRequest) return;
        wads.push({ name: file.name, bytes, info: inspectWad(bytes) });
      }
      const iwads = wads.filter((wad) => wad.info.kind === "IWAD");
      if (iwads.length > 1) throw new Error("Choose only one base IWAD.");
      const selection = {
        iwad: iwads[0] ?? this.selection.iwad,
        addons: wads.filter((wad) => wad.info.kind === "PWAD"),
      };
      validateSelection(selection);
      runtime.loadWads(selection);
      this.selection = selection;
    } catch (error) {
      if (request === this.selectionRequest)
        new Notice(error instanceof Error ? error.message : String(error), 10000);
    }
  }
  async onClose() {
    this.disposeGame();
    this.contentEl.empty();
  }
  disposeGame() {
    this.selectionRequest++;
    this.selection = { addons: [] };
    this.runtime?.stop();
    this.runtime = undefined;
  }
}
