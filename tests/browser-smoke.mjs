import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { createHost } from "./browser-host.mjs";
const { page, browser, errors, requests, version, launch } = await createHost();
const proof = [];
let frame;
const state = () => frame.evaluate(() => window.__doomState());
const waitTics = async (count) => {
  const before = (await state())[6];
  await frame.waitForFunction(
    (target) => window.__doomState()[6] >= target,
    before + count,
    { timeout: 8000 },
  );
};
const audio = () =>
  frame.evaluate(() =>
    window.__audio.map(({ context, analyser }) => {
      const data = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(data);
      return {
        state: context.state,
        rms: Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length),
      };
    }),
  );
const audible = () =>
  frame.waitForFunction(
    () =>
      window.__audio.some(({ context, analyser }) => {
        if (context.state !== "running") return false;
        const p = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(p);
        return p.some((v) => Math.abs(v) > 0.001);
      }),
    {},
    { timeout: 10000 },
  );
const focus = () => frame.locator("canvas").click();
const unlock = () =>
  frame.evaluate(() =>
    document.pointerLockElement ? document.exitPointerLock() : undefined,
  );
try {
  assert.equal(
    await page.getByText(`DOOM ${version}`, { exact: true }).isVisible(),
    true,
  );
  console.log("Launching production WASM and original title/menu");
  await page.getByRole("button", { name: "Play / Resume" }).click();
  await page.evaluate(() => window.leaves[0].view.runtime.pause());
  await page.waitForFunction(
    () =>
      document.querySelector(".doom-status").textContent.startsWith("paused"),
    {},
    { timeout: 60000 },
  );
  frame = page.frames().find((frame) => frame.parentFrame());
  await frame.waitForFunction(() => window.__doomState, {}, { timeout: 30000 });
  await page.waitForTimeout(750);
  const loadingPause = (await state())[6];
  await page.waitForTimeout(250);
  assert.equal((await state())[6], loadingPause);
  proof.push("pause requested during loading prevents background gameplay");
  frame = await launch();
  await focus();
  await unlock();
  await page.keyboard.press("Escape");
  await frame.waitForFunction(() => window.__doomState()[7] !== 0);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await frame.waitForFunction(
    () => window.__doomState()[0] === 0 && window.__doomState()[4] === 100,
    {},
    { timeout: 20000 },
  );
  await waitTics(35);
  await focus();
  await page.screenshot({ path: ".local/browser-smoke/map-before.png" });
  proof.push("native title -> New Game -> skill -> MAP01");
  console.log("Testing W/A/S/D separately using native tic commands");
  for (const [key, field, value] of [
    ["w", 8, 25],
    ["s", 8, -25],
    ["a", 9, -24],
    ["d", 9, 24],
  ]) {
    await waitTics(10);
    const before = await state();
    await page.keyboard.down(key);
    await frame.waitForFunction(
      ([field, value]) => window.__doomState()[field] === value,
      [field, value],
      { timeout: 3000 },
    );
    await waitTics(5);
    const after = await state();
    await page.keyboard.up(key);
    assert.equal(after[field], value, key + " native command");
    if (key === "w")
      assert.ok(
        Math.hypot(after[1] - before[1], after[2] - before[2]) > 65536,
        "W must move the actual player",
      );
    assert.equal(after[3], before[3], key + " must not rotate");
    proof.push({
      key,
      command: after[field],
      distance: Math.hypot(after[1] - before[1], after[2] - before[2]) / 65536,
    });
  }
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await frame.waitForFunction(() => window.__doomState()[8] === 50);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  proof.push("Shift+W native run command 50");
  await page.keyboard.down("w");
  await page.keyboard.down("ArrowUp");
  await page.keyboard.up("w");
  await waitTics(3);
  assert.equal((await state())[8], 25);
  await page.keyboard.up("ArrowUp");
  await frame.waitForFunction(() => window.__doomState()[8] === 0);
  proof.push("releasing W keeps movement active while ArrowUp is held");
  for (const key of ["e", "Space"]) {
    await page.keyboard.down(key);
    await frame.waitForFunction(() => (window.__doomState()[10] & 2) !== 0);
    await page.keyboard.up(key);
    await waitTics(2);
    proof.push(key + " native use button");
  }
  const angle = (await state())[3];
  await page.keyboard.down("ArrowRight");
  await waitTics(5);
  await page.keyboard.up("ArrowRight");
  assert.notEqual((await state())[3], angle);
  proof.push("arrow turning");
  await page.keyboard.press("Tab");
  await frame.waitForFunction(() => window.__doomState()[12] !== 0);
  await page.keyboard.press("Tab");
  await frame.waitForFunction(() => window.__doomState()[12] === 0);
  proof.push("native automap");
  await audible();
  proof.push({ music: await audio() });
  console.log("Testing native sound menu and digital SFX with music muted");
  await unlock();
  await page.keyboard.press("F4");
  await frame.waitForFunction(() => window.__doomState()[7] !== 0);
  await page.keyboard.press("ArrowDown");
  for (let i = 0; i < 15; i++) await page.keyboard.press("ArrowLeft");
  await frame.waitForFunction(() => window.__doomState()[14] === 0);
  assert.equal((await state())[14], 0, "native music slider reaches zero");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  if ((await state())[7]) await page.keyboard.press("Escape");
  await frame.waitForFunction(() => window.__doomState()[7] === 0);
  await focus();
  await waitTics(35);
  const ammo = (await state())[5];
  await page.keyboard.down("Control");
  await frame.waitForFunction(
    (before) => window.__doomState()[5] < before,
    ammo,
  );
  await audible();
  await page.keyboard.up("Control");
  proof.push(
    "pistol consumes ammo and generates digital audio with music at zero",
  );
  console.log("Testing mouse yaw and left-click pistol fire");
  await focus();
  await frame.waitForFunction(
    () => document.pointerLockElement === document.querySelector("canvas"),
    {},
    { timeout: 3000 },
  );
  const mouseAngle = (await state())[3];
  await page.mouse.move(600, 400);
  await page.mouse.move(720, 400);
  await waitTics(4);
  console.log(
    "Native mouse diagnostics",
    JSON.stringify((await state()).slice(16)),
    await frame.evaluate(() => ({
      canvas: [
        document.querySelector("canvas").width,
        document.querySelector("canvas").height,
        document.querySelector("canvas").clientWidth,
        document.querySelector("canvas").clientHeight,
      ],
      focus: document.hasFocus(),
      active: document.activeElement?.tagName,
    })),
  );
  assert.notEqual((await state())[3], mouseAngle, "mouse rotates player");
  const mouseAmmo = (await state())[5];
  await page.mouse.down();
  await waitTics(25);
  await page.mouse.up();
  assert.ok((await state())[5] < mouseAmmo, "left mouse fires");
  proof.push("pointer lock, mouse yaw and left-click fire");
  await unlock();
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.getByRole("button", { name: "Play / Resume" }).click();
  await focus();
  await page.keyboard.down("Control");
  await waitTics(20);
  await page.keyboard.up("Control");
  assert.ok(
    (await audio()).every((a) => a.rms < 0.00001),
    "master mute silences output",
  );
  await unlock();
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await page.getByRole("button", { name: "Play / Resume" }).click();
  await focus();
  await page.keyboard.down("w");
  await waitTics(4);
  await unlock();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.keyboard.up("w");
  await page.waitForFunction(() =>
    document.querySelector(".doom-status").textContent.startsWith("paused"),
  );
  await page.waitForTimeout(750);
  const paused = await state();
  await page.waitForTimeout(250);
  assert.equal((await state())[6], paused[6]);
  assert.ok((await audio()).every((a) => a.state === "suspended"));
  await page.getByRole("button", { name: "Play / Resume" }).click();
  await waitTics(3);
  assert.equal((await state())[8], 0, "held W released");
  proof.push(
    "master mute, audio suspended and native tics frozen during pause; no stuck W",
  );
  await page.screenshot({ path: ".local/browser-smoke/map-after.png" });
  console.log("Testing real IWAD upload and invalid WAD rejection");
  // A real resource PWAD reuses Freedoom's own palette to test the -file path.
  const base = await readFile("vendor/doom-wasm/engine/assets/freedoom2.wad");
  const baseView = new DataView(base.buffer, base.byteOffset, base.byteLength),
    count = baseView.getInt32(4, true),
    directory = baseView.getInt32(8, true);
  let palette;
  for (let i = 0; i < count; i++) {
    const entry = directory + i * 16;
    if (
      base
        .subarray(entry + 8, entry + 16)
        .toString("ascii")
        .replace(/\0.*$/s, "") === "PLAYPAL"
    )
      palette = base.subarray(
        baseView.getInt32(entry, true),
        baseView.getInt32(entry, true) + baseView.getInt32(entry + 4, true),
      );
  }
  assert.ok(palette);
  const addon = Buffer.alloc(12 + palette.length + 16);
  addon.write("PWAD");
  addon.writeInt32LE(1, 4);
  addon.writeInt32LE(12 + palette.length, 8);
  palette.copy(addon, 12);
  addon.writeInt32LE(12, 12 + palette.length);
  addon.writeInt32LE(palette.length, 16 + palette.length);
  addon.write("PLAYPAL", 20 + palette.length);
  await writeFile(".local/browser-smoke/palette.wad", addon);
  await page
    .locator("input[type=file]")
    .setInputFiles([
      "vendor/doom-wasm/engine/assets/freedoom2.wad",
      ".local/browser-smoke/palette.wad",
    ]);
  await page.waitForFunction(() =>
    document.querySelector(".doom-status").textContent.startsWith("idle"),
  );
  assert.equal(await page.locator("iframe").count(), 0);
  frame = await launch();
  const wadLog = await page.locator(".doom-log pre").textContent();
  assert.match(wadLog, /adding \/uploads\/freedoom2\.wad/);
  assert.match(wadLog, /adding \/uploads\/addon-0\.wad/);
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.wad",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("not a WAD"),
  });
  await page.waitForFunction(() => window.notices.length > 0);
  assert.match(
    (await page.evaluate(() => window.notices)).at(-1),
    /header|signature/,
  );
  assert.equal(await page.locator("iframe").count(), 1);
  proof.push("real IWAD upload; invalid WAD rejected without destroying game");
  await page.evaluate(() => window.commands["open-doom"]());
  assert.equal(await page.locator("iframe").count(), 1);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".doom-status").textContent.startsWith("running"),
    {},
    { timeout: 60000 },
  );
  assert.equal(await page.locator("iframe").count(), 1);
  await page.evaluate(() => window.leaves[0].view.onClose());
  assert.equal(await page.locator("iframe").count(), 0);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  const result = {
    status: "passed",
    version,
    browser: browser.version(),
    offline: true,
    requests,
    errors,
    proof,
  };
  await writeFile(
    ".local/browser-smoke/result.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} catch (error) {
  await page
    .screenshot({ path: ".local/browser-smoke/failure.png" })
    .catch(() => {});
  console.error(
    JSON.stringify({
      errors,
      requests,
      proof,
      status: await page
        .locator(".doom-status")
        .textContent()
        .catch(() => ""),
      log: await page
        .locator(".doom-log pre")
        .textContent()
        .catch(() => ""),
      state: frame ? await state().catch(() => null) : null,
    }),
  );
  throw error;
} finally {
  await browser.close();
}
