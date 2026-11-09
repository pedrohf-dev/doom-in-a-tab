import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, readFile, writeFile } from "node:fs/promises";
import { resolve, delimiter, join } from "node:path";
import { createHash } from "node:crypto";

const sdk = resolve(process.env.DOOM_EMSDK ?? ".local/emsdk");
const win = process.platform === "win32";
const python = win ? join(sdk, "python/3.13.3_64bit/python.exe") : "python3";
const cmake =
  process.env.DOOM_CMAKE ??
  (win ? resolve(".local/build-tools/cmake/data/bin/cmake.exe") : "cmake");
const ninja =
  process.env.DOOM_NINJA ??
  (win ? resolve(".local/build-tools/bin/ninja.exe") : "ninja");
const env = {
  ...process.env,
  EM_CONFIG: join(sdk, ".emscripten"),
  ...(win ? { EMSDK_PYTHON: python } : {}),
  PATH: [
    join(sdk, "upstream/emscripten"),
    resolve(".local/build-tools/bin"),
    process.env.PATH,
  ].join(delimiter),
};
if (!existsSync(join(sdk, ".emscripten")))
  throw new Error(
    "Activate Emscripten 4.0.14 first; see docs/engine-build.md.",
  );
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Build step failed (${result.status})`);
}
const buildDir = resolve(".local/wasm-build");
const wad = resolve("vendor/doom-wasm/engine/assets/freedoom2.wad").replaceAll(
  "\\",
  "/",
);
run(python, [
  join(sdk, "upstream/emscripten/emcmake.py"),
  cmake,
  "-S",
  resolve("vendor/doom-wasm/engine/vendor/chocolate-doom"),
  "-B",
  buildDir,
  "-G",
  "Ninja",
  `-DCMAKE_MAKE_PROGRAM=${ninja}`,
  "-DCMAKE_BUILD_TYPE=Release",
  "-DCMAKE_EXECUTABLE_SUFFIX=.js",
  "-DHAVE_DECL_STRCASECMP=1",
  "-DHAVE_DECL_STRNCASECMP=1",
  "-DHAVE_DIRENT_H=1",
  "-DENABLE_SDL2_MIXER=ON",
  "-DENABLE_SDL2_NET=OFF",
  `-DCMAKE_EXE_LINKER_FLAGS=-g3 -sALLOW_MEMORY_GROWTH=1 -sASYNCIFY=1 -sDYNAMIC_EXECUTION=0 -sSDL2_MIXER_FORMATS=[] --preload-file ${wad}@/iwads/freedoom2.wad`,
]);
run(cmake, [
  "--build",
  buildDir,
  "--target",
  "chocolate-doom",
  "--parallel",
  "4",
]);
const hashes = {};
for (const name of [
  "chocolate-doom.js",
  "chocolate-doom.wasm",
  "chocolate-doom.data",
]) {
  const target = `vendor/doom-wasm/web/public/engine/${name}`;
  await cp(join(buildDir, "src", name), target);
  hashes[name] = createHash("sha256")
    .update(await readFile(target))
    .digest("hex");
}
await writeFile(
  "vendor/checksums.json",
  JSON.stringify(hashes, null, 2) + "\n",
);
console.log(
  "Rebuilt engine with digital SFX, native OPL synthesis and read-only state diagnostics.",
);
