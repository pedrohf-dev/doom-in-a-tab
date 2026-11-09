type Key = { key: string; code: string; keyCode?: number };
const aliases: Record<string, Key> = {
  ArrowUp: { key: "w", code: "KeyW", keyCode: 87 },
  ArrowDown: { key: "s", code: "KeyS", keyCode: 83 },
  Space: { key: "e", code: "KeyE", keyCode: 69 },
};
export class InputManager {
  private readonly held = new Map<string, Key>();
  private readonly buttons = new Set<number>();
  private readonly frameDocument: Document;
  private forwarding = false;
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly paused: () => boolean,
    activateAudio: () => void,
    blur: () => void,
    private readonly gameplay: () => boolean,
  ) {
    const doc = (this.frameDocument = canvas.ownerDocument);
    window.addEventListener("keydown", (e) => this.keyboard(e), true);
    window.addEventListener("keyup", (e) => this.keyboard(e), true);
    window.addEventListener("blur", blur);
    doc.addEventListener("visibilitychange", () => {
      if (doc.hidden) blur();
    });
    doc.addEventListener("pointerlockchange", () => {
      if (!doc.pointerLockElement) this.release();
    });
    canvas.addEventListener("pointerdown", () => {
      canvas.focus();
      if (!this.paused()) activateAudio();
    });
    canvas.addEventListener("click", () => {
      canvas.focus();
      if (!this.paused() && doc.pointerLockElement !== canvas) {
        try {
          void canvas.requestPointerLock()?.catch(() => {});
        } catch {
          /* Keyboard remains available if denied. */
        }
      }
    });
    window.addEventListener(
      "mousedown",
      (e) => {
        if (this.paused() || doc.pointerLockElement !== canvas) {
          e.stopImmediatePropagation();
          e.preventDefault();
          return;
        }
        this.buttons.add(e.button);
      },
      true,
    );
    window.addEventListener(
      "mouseup",
      (e) => this.buttons.delete(e.button),
      true,
    );
    doc.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  private emit(type: string, key: Key) {
    this.forwarding = true;
    try {
      this.canvas.dispatchEvent(
        new KeyboardEvent(type, {
          ...key,
          which: key.keyCode,
          bubbles: true,
          cancelable: true,
        }),
      );
    } finally {
      this.forwarding = false;
    }
  }
  private keyboard(event: KeyboardEvent) {
    if (this.forwarding) return;
    if (this.frameDocument.activeElement !== this.canvas || this.paused()) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    const key = this.held.get(event.code) ??
      (this.gameplay() ? aliases[event.code] : undefined) ?? {
        key: event.key,
        code: event.code,
      };
    const sharedKey = [...this.held].some(
      ([code, held]) => code !== event.code && held.code === key.code,
    );
    if (event.type === "keydown") this.held.set(event.code, key);
    else this.held.delete(event.code);
    // An alias and its physical counterpart can be held at the same time.
    if (sharedKey) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    if (key.code !== event.code) {
      event.stopImmediatePropagation();
      event.preventDefault();
      this.emit(event.type, key);
    }
  }
  release() {
    for (const key of this.held.values()) this.emit("keyup", key);
    this.held.clear();
    for (const button of this.buttons)
      this.canvas.dispatchEvent(
        new MouseEvent("mouseup", { button, bubbles: true }),
      );
    this.buttons.clear();
    if (this.frameDocument.pointerLockElement)
      this.frameDocument.exitPointerLock();
  }
}
