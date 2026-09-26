// Audio-Realitätstest ohne Autoplay-Flag: node tools_audiotest.mjs [url]
import { loadPlaywright } from "/Users/wohnzimmer/dev/koboldkeller/tools/pw.mjs";

const pw = loadPlaywright();
const URL = process.argv[2] || "http://localhost:8732/";
const browser = await pw.chromium.launch({ channel: "chromium", args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { window.__osc = 0; const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
const page = await ctx.newPage(); const errs = []; page.on("pageerror", e => errs.push(e.message));
await page.goto(URL + "index.html?tier=lady"); await page.waitForTimeout(4000); console.log("game?", await page.evaluate(() => !!window.__game), await page.evaluate(() => window.__errors));
const st = () => page.evaluate(() => ({ ac: window.__game && window.__game.ac ? window.__game.ac() : "?", osc: window.__osc }));
console.log("start", JSON.stringify(await st()));
await page.touchscreen.tap(206, 450); await page.waitForTimeout(500);
console.log("tap  ", JSON.stringify(await st()));
for (let i = 0; i < 20; i++) { await page.touchscreen.tap(60 + (i % 3) * 140, 700); await page.waitForTimeout(300); }
console.log("play ", JSON.stringify(await st()), "errors", JSON.stringify(errs));
await browser.close();
