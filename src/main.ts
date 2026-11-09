import { Plugin } from "obsidian";
import { DoomView, VIEW_TYPE } from "./views/DoomView";

export default class ObsidianDoomPlugin extends Plugin {
  private opening?: Promise<void>;
  async onload() {
    this.registerView(
      VIEW_TYPE,
      (leaf) => new DoomView(leaf, this.manifest.version),
    );
    this.addRibbonIcon("gamepad-2", "Open DOOM", () => void this.openDoom());
    this.addCommand({
      id: "open-doom",
      name: "Open DOOM",
      callback: () => this.openDoom(),
    });
    this.addCommand({
      id: "restart-doom",
      name: "Restart DOOM",
      callback: () => this.current()?.runtime?.restart(),
    });
    this.addCommand({
      id: "pause-resume-doom",
      name: "Pause/Resume DOOM",
      callback: () => {
        const runtime = this.current()?.runtime;
        if (runtime?.state === "running") runtime.pause();
        else runtime?.resume();
      },
    });
  }
  private current() {
    return this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view as
      DoomView | undefined;
  }
  private openDoom(): Promise<void> {
    if (this.opening) return this.opening;
    this.opening = this.activate().finally(() => {
      this.opening = undefined;
    });
    return this.opening;
  }
  private async activate() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof DoomView) leaf.view.disposeGame();
    }
  }
}
