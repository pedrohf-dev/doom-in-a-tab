import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nativeConfig } from "../src/engine/config";

test("configured controls translate through the real engine DOS scancode table", () => {
  const source = readFileSync(
    "vendor/doom-wasm/engine/vendor/chocolate-doom/src/m_config.c",
    "utf8",
  );
  const body = /static const int scantokey\[128\]\s*=\s*\{([\s\S]*?)\};/
    .exec(source)![1]
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const table = body.match(/'(?:\\.|[^'\\])'|KEY[A-Z0-9_]+|\b\d+\b/g)!;
  const bindings = Object.fromEntries(
    nativeConfig()
      .trim()
      .split("\n")
      .map((line) => line.split(" ")),
  );
  const expected = {
    key_up: "'w'",
    key_down: "'s'",
    key_strafeleft: "'a'",
    key_straferight: "'d'",
    key_use: "'e'",
    key_fire: "KEY_RCTRL",
    key_speed: "KEY_RSHIFT",
    key_left: "KEY_LEFTARROW",
    key_right: "KEY_RIGHTARROW",
  };
  for (const [action, key] of Object.entries(expected))
    assert.equal(
      table[Number(bindings[action])],
      key,
      `${action} must use a DOS scancode rather than ASCII`,
    );
});
