import assert from "node:assert/strict";
import { test } from "node:test";
import { isEngineEvent } from "../src/engine/protocol";

test("only valid events for the current instance are accepted", () => {
  assert.equal(
    isEngineEvent({ token: "instance", type: "running" }, "instance"),
    true,
  );
  assert.equal(
    isEngineEvent({ token: "old-instance", type: "running" }, "instance"),
    false,
  );
  assert.equal(
    isEngineEvent({ token: "instance", type: "start" }, "instance"),
    false,
  );
  assert.equal(
    isEngineEvent(
      { token: "instance", type: "error", message: {} },
      "instance",
    ),
    false,
  );
  assert.equal(isEngineEvent(null, "instance"), false);
});
