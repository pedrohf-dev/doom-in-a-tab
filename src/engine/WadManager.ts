export const MAX_WAD_BYTES = 128 * 1024 * 1024;
export type WadInfo = {
  kind: "IWAD" | "PWAD";
  family: "episode" | "commercial" | null;
  canonicalName: string;
  maps: number;
  freedoom: boolean;
};
export type SelectedWad = { name: string; bytes: Uint8Array; info: WadInfo };
export type WadSelection = { iwad?: SelectedWad; addons: SelectedWad[] };
const mapLumps = [
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
export function inspectWad(bytes: Uint8Array): WadInfo {
  if (bytes.byteLength < 12)
    throw new Error("WAD is truncated: missing header.");
  if (bytes.byteLength > MAX_WAD_BYTES)
    throw new Error("WAD exceeds the 128 MB limit.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length))
      .replace(/\0.*$/s, "")
      .toUpperCase();
  const kind = String.fromCharCode(...bytes.subarray(0, 4));
  if (kind !== "IWAD" && kind !== "PWAD")
    throw new Error("Invalid WAD: expected IWAD or PWAD signature.");
  const count = view.getInt32(4, true),
    directory = view.getInt32(8, true);
  if (
    count <= 0 ||
    count > 200000 ||
    directory < 12 ||
    directory + count * 16 > bytes.byteLength
  )
    throw new Error("Invalid WAD directory or lump count.");
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const entry = directory + i * 16,
      offset = view.getInt32(entry, true),
      size = view.getInt32(entry + 4, true);
    if (
      offset < 0 ||
      size < 0 ||
      offset + size > bytes.byteLength ||
      (size > 0 && offset < 12)
    )
      throw new Error(`Invalid WAD lump bounds at entry ${i}.`);
    const name = text(entry + 8, 8);
    if (!/^[\x20-\x7e]*$/.test(name))
      throw new Error("Invalid characters in WAD directory.");
    names.push(name);
  }
  const resources = new Set(names);
  if (["BEHAVIOR", "TEXTMAP", "ZNODES"].some((name) => resources.has(name)))
    throw new Error(
      "This WAD requires a different engine (Hexen, UDMF or ZDoom format). Use vanilla-compatible DOOM maps.",
    );
  let family: WadInfo["family"] = null,
    maps = 0;
  for (let i = 0; i < names.length; i++) {
    const candidate = /^E[1-4]M[1-9]$/.test(names[i])
      ? "episode"
      : /^MAP\d\d$/.test(names[i])
        ? "commercial"
        : null;
    if (!candidate) continue;
    if (family && family !== candidate)
      throw new Error("Mixed DOOM and DOOM II map naming is not supported.");
    if (!mapLumps.every((name, j) => names[i + j + 1] === name))
      throw new Error(
        `Map ${names[i]} is incomplete or not in vanilla DOOM format.`,
      );
    family = candidate;
    maps++;
  }
  if (
    kind === "IWAD" &&
    (!maps ||
      !["PLAYPAL", "COLORMAP", "PNAMES", "TEXTURE1"].every((name) =>
        resources.has(name),
      ))
  )
    throw new Error(
      "Incomplete IWAD: missing DOOM maps or required graphics resources.",
    );
  const freedoom = resources.has("FREEDOOM");
  const canonicalName =
    family === "commercial"
      ? freedoom
        ? "freedoom2.wad"
        : "doom2.wad"
      : freedoom
        ? "freedoom1.wad"
        : resources.has("E3M1")
          ? "doom.wad"
          : "doom1.wad";
  return { kind, family, canonicalName, maps, freedoom };
}
export function validateSelection(selection: WadSelection) {
  if (selection.iwad && selection.iwad.info.kind !== "IWAD")
    throw new Error("The base game must be an IWAD, not an add-on PWAD.");
  const family = selection.iwad?.info.family ?? "commercial";
  if (
    selection.iwad?.info.canonicalName === "doom1.wad" &&
    selection.addons.length
  )
    throw new Error(
      "DOOM shareware does not support add-on PWADs. Use a registered IWAD or Freedoom.",
    );
  if (selection.addons.length > 16)
    throw new Error("Choose at most 16 add-on WADs.");
  let total = selection.iwad?.bytes.byteLength ?? 0;
  for (const addon of selection.addons) {
    total += addon.bytes.byteLength;
    if (addon.info.kind !== "PWAD")
      throw new Error("Only one IWAD can be loaded.");
    if (addon.info.family && addon.info.family !== family)
      throw new Error(
        "This add-on uses map names for a different base game. Choose a matching DOOM or DOOM II IWAD.",
      );
  }
  if (total > 192 * 1024 * 1024)
    throw new Error("The selected WADs exceed the 192 MB combined limit.");
}
