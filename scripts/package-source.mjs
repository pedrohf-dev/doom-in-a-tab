import { mkdir, cp, copyFile, readFile } from "node:fs/promises";
const { id } = JSON.parse(await readFile("manifest.json", "utf8"));
const destination = `dist/${id}-source`;
await mkdir(destination, { recursive: true });
for (const file of [
  "package.json",
  "package-lock.json",
  "manifest.json",
  "versions.json",
  "styles.css",
  "LICENSE",
  "README.md",
  "tsconfig.json",
  "eslint.config.mjs",
  "esbuild.config.mjs",
  ".gitignore",
  ".gitattributes",
]) {
  await copyFile(file, `${destination}/${file}`);
}
for (const folder of ["src", "tests", "docs", "scripts", "vendor"]) {
  await cp(folder, `${destination}/${folder}`, { recursive: true });
}
console.log(`Corresponding source and build inputs: ${destination}`);
