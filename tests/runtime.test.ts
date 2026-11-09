import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { DoomRuntime } from "../src/engine/DoomRuntime";

function fixture() {
  const dom = new JSDOM("<main></main>");
  const host = dom.window.document.querySelector("main")!;
  const runtime = new DoomRuntime(host, () => {});
  function event(
    type: string,
    source?: Window | null,
    token?: string,
    origin = "null",
  ) {
    const frame = host.querySelector("iframe")!;
    const currentToken = /data-token="([^"]+)"/.exec(frame.srcdoc)![1];
    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: { token: token ?? currentToken, type },
        origin,
        source: source === undefined ? frame.contentWindow : source,
      }),
    );
  }
  return { dom, host, runtime, event };
}

test("duplicate starts reuse one isolated iframe and closing removes it", () => {
  const { host, runtime, dom } = fixture();
  try {
    runtime.start();
    runtime.start();
    assert.equal(host.querySelectorAll("iframe").length, 1);
    assert.equal(runtime.state, "loading");
    assert.equal(
      host.querySelector("iframe")!.getAttribute("sandbox"),
      "allow-scripts allow-pointer-lock",
    );
    assert.match(host.querySelector("iframe")!.srcdoc, /connect-src 'none'/);
    assert.match(host.querySelector("iframe")!.srcdoc, /<canvas id="canvas"/);
    runtime.stop();
    assert.equal(runtime.state, "stopped");
    assert.equal(host.querySelectorAll("iframe").length, 0);
  } finally {
    runtime.stop();
    dom.window.close();
  }
});

test("wrong window and stale tokens cannot update runtime state", () => {
  const { event, runtime, dom } = fixture();
  try {
    runtime.start();
    event("running", null);
    event("running", undefined, "stale");
    event("running", undefined, undefined, "https://example.invalid");
    assert.equal(runtime.state, "loading");
    event("running");
    assert.equal(runtime.state, "running");
    event("paused");
    assert.equal(runtime.state, "paused");
  } finally {
    runtime.stop();
    dom.window.close();
  }
});
test("a focus-loss pause during loading is carried into the start handshake", () => {
  const { host, event, runtime, dom } = fixture();
  try {
    runtime.start();
    const messages: Array<{ type?: string; startPaused?: boolean }> = [];
    host.querySelector("iframe")!.contentWindow!.postMessage = (message) =>
      messages.push(message);
    runtime.pause();
    event("ready");
    event("ready");
    assert.equal(messages.filter((message) => message.type === "start").length, 1);
    assert.equal(
      messages.find((message) => message.type === "start")?.startPaused,
      true,
    );
  } finally {
    runtime.stop();
    dom.window.close();
  }
});

test("restart replaces the frame, ignores late old messages and errors release resources", () => {
  const { host, event, runtime, dom } = fixture();
  try {
    runtime.start();
    event("running");
    const old = host.querySelector("iframe")!;
    const oldWindow = old.contentWindow;
    runtime.restart();
    assert.notEqual(host.querySelector("iframe"), old);
    event("running", oldWindow);
    assert.equal(runtime.state, "loading");
    event("error");
    assert.equal(runtime.state, "error");
    assert.equal(host.querySelector("iframe"), null);
    runtime.resume();
    assert.equal(runtime.state, "loading");
  } finally {
    runtime.stop();
    dom.window.close();
  }
});
