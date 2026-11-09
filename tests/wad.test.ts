import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  inspectWad,
  validateSelection,
  type SelectedWad,
} from "../src/engine/WadManager";
const map = [
  "THINGS",
  "LINEDEFS",
  "SIDEDEFS",
  "VERTEXES",
  "SEGS",
  "SSECTORS",
  "NODES",
  "SECTORS",
  "REJECT",
  "BLOCKMAP",
];
function wad(names: string[], kind = "PWAD") {
  const bytes = new Uint8Array(12 + names.length * 16),
    view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode(kind));
  view.setInt32(4, names.length, true);
  view.setInt32(8, 12, true);
  names.forEach((name, i) =>
    bytes.set(new TextEncoder().encode(name), 12 + i * 16 + 8),
  );
  return bytes;
}
function selected(bytes: Uint8Array): SelectedWad {
  return { name: "test.wad", bytes, info: inspectWad(bytes) };
}
test("real bundled Freedoom is a complete commercial-style IWAD", () => {
  const info = inspectWad(
    readFileSync("vendor/doom-wasm/engine/assets/freedoom2.wad"),
  );
  assert.equal(info.kind, "IWAD");
  assert.equal(info.family, "commercial");
  assert.equal(info.freedoom, true);
  assert.equal(info.maps, 32);
});
test("rejects truncated headers, wrong signature and out-of-range directory", () => {
  assert.throws(() => inspectWad(new Uint8Array(3)), /header/);
  assert.throws(() => inspectWad(new Uint8Array(16)), /signature/);
  const bytes = wad(["TEST"]);
  new DataView(bytes.buffer).setInt32(8, 100, true);
  assert.throws(() => inspectWad(bytes), /directory/);
});
test("rejects invalid data ranges and negative lump sizes", () => {
  const bytes = wad(["TEST"]),
    view = new DataView(bytes.buffer);
  view.setInt32(16, -1, true);
  assert.throws(() => inspectWad(bytes), /bounds/);
  view.setInt32(12, 1000, true);
  view.setInt32(16, 12, true);
  assert.throws(() => inspectWad(bytes), /bounds/);
});
test("distinguishes PWADs from IWADs without trusting the filename", () => {
  assert.equal(inspectWad(wad(["RESOURCE"])).kind, "PWAD");
  assert.throws(() => inspectWad(wad(["RESOURCE"], "IWAD")), /Incomplete IWAD/);
});
test("rejects incomplete maps and incompatible engine formats", () => {
  assert.throws(() => inspectWad(wad(["MAP01", "THINGS"])), /incomplete/);
  for (const format of ["TEXTMAP", "BEHAVIOR", "ZNODES"])
    assert.throws(() => inspectWad(wad([format])), /different engine/);
});
test("checks episode versus commercial add-on compatibility before restart", () => {
  const episode = selected(wad(["E1M1", ...map]));
  assert.throws(
    () => validateSelection({ addons: [episode] }),
    /different base game/,
  );
  const commercial = selected(wad(["MAP01", ...map]));
  assert.doesNotThrow(() => validateSelection({ addons: [commercial] }));
  assert.throws(
    () => validateSelection({ iwad: commercial, addons: [] }),
    /base game/,
  );
});
test("rejects PWADs with the shareware base before starting the engine", () => {
  const base = selected(
    wad(["PLAYPAL", "COLORMAP", "PNAMES", "TEXTURE1", "E1M1", ...map], "IWAD"),
  );
  const addon = selected(wad(["E1M1", ...map]));
  assert.throws(
    () => validateSelection({ iwad: base, addons: [addon] }),
    /shareware/,
  );
});
