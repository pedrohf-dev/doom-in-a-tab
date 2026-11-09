declare module "*?base64" {
  const data: string;
  export default data;
}
declare module "*?text" {
  const data: string;
  export default data;
}
declare module "*chocolate-doom.js" {
  const factory: (
    options: Record<string, unknown>,
  ) => Promise<import("./engine/protocol").EngineModule>;
  export default factory;
}
