import { build } from "esbuild";
import { readFile, mkdir, copyFile, cp, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const assets = "vendor/doom-wasm/web/public/engine/";
const files = [
  "chocolate-doom.js",
  "chocolate-doom.wasm",
  "chocolate-doom.data",
];
const hashes = JSON.parse(await readFile("vendor/checksums.json", "utf8"));
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
for (const file of files) {
  const data = await readFile(assets + file);
  if (createHash("sha256").update(data).digest("hex") !== hashes[file])
    throw new Error(`Engine integrity mismatch: ${file}`);
}
const frame = await build({
  entryPoints: ["src/engine/frame.ts"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  // A hierarchical identity is required by Emscripten's URL constructor even
  // though WASM/data are supplied from memory. This path is never read.
  define: {
    "import.meta.url": '"file:///__obsidian_doom__/engine/chocolate-doom.js"',
  },
  logLevel: "warning",
});
const frameCode = frame.outputFiles[0].text;
if (/\beval\s*\(|new\s+Function\s*\(/.test(frameCode))
  throw new Error("Dynamic code execution in engine");
const noticeFiles = [
  "LICENSE",
  "vendor/doom-wasm/licenses/THIRD_PARTY_NOTICES.md",
  "vendor/doom-wasm/licenses/FREEDOOM-COPYING.txt",
  "vendor/doom-wasm/licenses/CREDITS.txt",
  "vendor/doom-wasm/licenses/CREDITS-MUSIC.txt",
  "vendor/doom-wasm/licenses/SDL2-LICENSE.txt",
  "vendor/doom-wasm/licenses/SDL2-MIXER-LICENSE.txt",
  "vendor/doom-wasm/licenses/EMSCRIPTEN-LICENSE.txt",
];
const notices = (
  await Promise.all(
    noticeFiles.map(async (path) => {
      const text = await readFile(path, "utf8");
      return `${path}\n${text.replace(/\r\n/g, "\n")}`;
    }),
  )
).join("\n\n");
await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  format: "cjs",
  platform: "browser",
  target: "es2022",
  external: ["obsidian"],
  logLevel: "info",
  banner: {
    js: `/*! Doom in a Tab — GPL-2.0-or-later\n${notices.replace(/\*\//g, "* /")}\n*/`,
  },
  plugins: [
    {
      name: "local-assets",
      setup(b) {
        b.onResolve({ filter: /\?(base64|text)$/ }, (args) => ({
          path: args.path,
          namespace: "assets",
        }));
        b.onLoad({ filter: /.*/, namespace: "assets" }, async (args) => {
          if (args.path === "doom-frame?text")
            return { contents: frameCode, loader: "text" };
          const name = args.path.split("/").pop().replace("?base64", "");
          return {
            contents: (await readFile(assets + name)).toString("base64"),
            loader: "text",
          };
        });
      },
    },
  ],
});
const destination = `dist/${manifest.id}`;
await mkdir(destination, { recursive: true });
for (const file of [
  "main.js",
  "manifest.json",
  "styles.css",
  "LICENSE",
  "README.md",
])
  await copyFile(file, `${destination}/${file}`);
await cp("vendor/doom-wasm/licenses", `${destination}/licenses`, {
  recursive: true,
});
await cp("docs", `${destination}/docs`, { recursive: true });
await writeFile(
  `${destination}/ENGINE-SOURCE.txt`,
  "Engine source and build scripts: vendor/doom-wasm in the accompanying source distribution.\nSee docs/engine-research.md for pinned revisions and licenses.\n",
);
