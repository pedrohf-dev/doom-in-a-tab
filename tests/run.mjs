import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: [
    "tests/protocol.test.ts",
    "tests/runtime.test.ts",
    "tests/config.test.ts",
    "tests/wad.test.ts",
  ],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: ".test-build",
  outExtension: { ".js": ".cjs" },
  external: ["jsdom"],
  plugins: [
    {
      name: "test-assets",
      setup(b) {
        b.onResolve({ filter: /\?(base64|text)$/ }, (args) => ({
          path: args.path,
          namespace: "test-assets",
        }));
        b.onLoad({ filter: /.*/, namespace: "test-assets" }, (args) => ({
          contents: args.path.endsWith("?base64") ? "AA==" : "",
          loader: "text",
        }));
      },
    },
  ],
});
const result = spawnSync(
  process.execPath,
  [
    "--test",
    ".test-build/protocol.test.cjs",
    ".test-build/runtime.test.cjs",
    ".test-build/config.test.cjs",
    ".test-build/wad.test.cjs",
  ],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
