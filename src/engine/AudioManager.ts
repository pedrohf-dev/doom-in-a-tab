import type { EngineModule } from "./protocol";
export class AudioManager {
  private context?: AudioContext;
  private processor?: AudioNode;
  private gain?: GainNode;
  private volume = 1;
  bind(engine?: EngineModule) {
    const context = engine?.SDL2?.audioContext;
    const processor = engine?.SDL2?.audio?.scriptProcessorNode;
    if (!context || !processor || this.processor === processor) return;
    this.gain?.disconnect();
    this.context = context;
    this.processor = processor;
    this.gain = context.createGain();
    this.gain.gain.value = this.volume;
    processor.disconnect();
    processor.connect(this.gain);
    this.gain.connect(context.destination);
  }
  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.min(1, Math.max(0, value));
    if (this.gain && this.context)
      this.gain.gain.setValueAtTime(this.volume, this.context.currentTime);
  }
  activate(engine?: EngineModule) {
    this.bind(engine);
    if (this.context?.state === "suspended")
      void this.context.resume().catch(() => {});
  }
  pause() {
    if (this.context?.state === "running")
      void this.context.suspend().catch(() => {});
  }
  dispose() {
    if (this.context && this.context.state !== "closed")
      void this.context.close().catch(() => {});
  }
}
