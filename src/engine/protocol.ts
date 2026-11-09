export type RuntimeState =
  "idle" | "loading" | "running" | "paused" | "error" | "stopped";
export type EngineEvent = {
  token: string;
  type: "ready" | "running" | "paused" | "error" | "log";
  message?: string;
};
export interface EngineModule {
  SDL2?: {
    audioContext?: AudioContext;
    audio?: { scriptProcessorNode?: AudioNode };
  };
  FS: {
    mkdir(path: string): void;
    writeFile(path: string, data: string | Uint8Array): void;
  };
  callMain(args: string[]): void;
  _DB_PauseMainLoop(): void;
  _DB_ResumeMainLoop(): void;
  _DB_ReadState(field: number): number;
}

export function isEngineEvent(
  data: unknown,
  token: string,
): data is EngineEvent {
  if (typeof data !== "object" || data === null) return false;
  const event = data as Partial<EngineEvent>;
  return (
    event.token === token &&
    ["ready", "running", "paused", "error", "log"].includes(event.type ?? "") &&
    (event.message === undefined || typeof event.message === "string")
  );
}
