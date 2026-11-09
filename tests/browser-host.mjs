import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export async function createHost() {
  const { chromium } = await import(
    process.env.DOOM_PLAYWRIGHT_MODULE
      ? pathToFileURL(resolve(process.env.DOOM_PLAYWRIGHT_MODULE)).href
      : "playwright-core"
  );
  const { version } = JSON.parse(await readFile("manifest.json", "utf8"));
  const browser = await chromium.launch({
    headless: true,
    timeout: 15000,
    ...(process.env.DOOM_BROWSER_PATH
      ? { executablePath: process.env.DOOM_BROWSER_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1000, height: 800 },
  });
  page.setDefaultTimeout(15000);
  const errors = [],
    requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.context().setOffline(true);
  await page.addInitScript(() => {
    const instantiate = WebAssembly.instantiate.bind(WebAssembly);
    WebAssembly.instantiate = async (...args) => {
      const result = await instantiate(...args),
        instance = result.instance ?? result;
      if (instance.exports?.DB_ReadState)
        window.__doomState = () =>
          Array.from({ length: 20 }, (_, i) =>
            instance.exports.DB_ReadState(i),
          );
      return result;
    };
    window.__audio = [];
    if (!window.AudioContext) return;
    const contexts = new WeakMap(),
      connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination, ...args) {
      const analyser = contexts.get(this.context);
      return connect.call(
        this,
        analyser &&
          this !== analyser &&
          destination === this.context.destination
          ? analyser
          : destination,
        ...args,
      );
    };
    const Native = AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        const analyser = this.createAnalyser();
        analyser.fftSize = 2048;
        connect.call(analyser, this.destination);
        contexts.set(this, analyser);
        window.__audio.push({ context: this, analyser });
      }
    };
  });
  await mkdir(".local/browser-smoke", { recursive: true });
  await writeFile(
    ".local/browser-smoke/index.html",
    '<!doctype html><html><head><style>body{margin:0}#view{height:780px}</style></head><body><main id="view"></main></body></html>',
  );
  await page.goto(
    pathToFileURL(resolve(".local/browser-smoke/index.html")).href,
  );
  requests.length = 0;
  await page.addStyleTag({ path: "styles.css" });
  await page.addScriptTag({
    content: `
    window.module={exports:{}};window.exports=window.module.exports;
    HTMLElement.prototype.empty=function(){this.replaceChildren()};
    HTMLElement.prototype.addClass=function(value){this.classList.add(value)};
    HTMLElement.prototype.setText=function(value){this.textContent=value};
    HTMLElement.prototype.createEl=function(tag,options={}){const node=document.createElement(tag);if(options.cls)node.className=options.cls;if(options.text)node.textContent=options.text;this.append(node);return node};
    HTMLElement.prototype.createDiv=function(options){return this.createEl('div',options)};
    HTMLElement.prototype.createSpan=function(options){return this.createEl('span',options)};
    window.leaves=[];window.commands={};window.events={};window.notices=[];
    class Notice{constructor(message){window.notices.push(message)}}
    class ItemView{constructor(leaf){this.leaf=leaf;this.contentEl=document.querySelector('#view');this.app=window.app}registerDomEvent(el,type,callback){el.addEventListener(type,callback)}registerEvent(){}}
    class Plugin{constructor(){this.app=window.app;this.manifest={version:${JSON.stringify(version)}}}registerView(type,factory){window.viewFactory=factory}addRibbonIcon(){}addCommand(command){window.commands[command.id]=command.callback}}
    window.app={workspace:{getLeavesOfType(){return window.leaves},getLeaf(){const leaf={async setViewState(){leaf.view=window.viewFactory(leaf);window.leaves.push(leaf);await leaf.view.onOpen()}};return leaf},async revealLeaf(){},on(type,callback){window.events[type]=callback;return callback}}};
    window.require=name=>{if(name==='obsidian')return{Plugin,ItemView,Notice};throw new Error('Unexpected import '+name)};
  `,
  });
  await page.addScriptTag({ path: "main.js" });
  await page.evaluate(async () => {
    window.plugin = new window.module.exports.default();
    await window.plugin.onload();
    await window.commands["open-doom"]();
  });
  const launch = async () => {
    await page.getByRole("button", { name: "Play / Resume" }).click();
    await page.waitForFunction(
      () =>
        /^(running|error)/.test(
          document.querySelector(".doom-status").textContent,
        ),
      {},
      { timeout: 60000 },
    );
    const status = await page.locator(".doom-status").textContent();
    if (!status.startsWith("running"))
      throw new Error(
        status + "\n" + (await page.locator(".doom-log pre").textContent()),
      );
    const frame = page.frames().find((frame) => frame.parentFrame());
    await frame.waitForFunction(
      () => window.__doomState && window.__doomState()[6] > 0,
      {},
      { timeout: 30000 },
    );
    return frame;
  };
  return { page, browser, errors, requests, version, launch };
}
