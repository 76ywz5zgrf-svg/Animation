// Rendert Einzelbilder des Videos mit Headless-Chromium.
//   node render.mjs stills 1.5,8.2,30     -> build/stills/*.jpg (Kontrollbilder)
//   node render.mjs frames <von> <bis>    -> build/frames/f_00000.jpg … (Bildnummern, bis exklusiv)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] ?? 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url);
await page.waitForFunction('window.ready === true', null, { timeout: 60000 });
const tl = await page.evaluate('window.TL');
const stage = page.locator('#stage');

const [mode, a, b] = process.argv.slice(2);
if (mode === 'stills') {
  fs.mkdirSync(path.join(ROOT, 'build/stills'), { recursive: true });
  for (const t of a.split(',').map(Number)) {
    await page.evaluate((x) => window.renderFrame(x), t);
    await stage.screenshot({ path: path.join(ROOT, `build/stills/t_${t.toFixed(2).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
} else {
  const dir = path.join(ROOT, 'build/frames'); fs.mkdirSync(dir, { recursive: true });
  const total = Math.round(tl.duration * tl.fps), from = Number(a ?? 0), to = Math.min(Number(b ?? total), total);
  for (let i = from; i < to; i++) {
    await page.evaluate((x) => window.renderFrame(x), (i + 0.5) / tl.fps);
    await stage.screenshot({ path: path.join(dir, `f_${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
    if ((i - from) % 50 === 0) console.log(`Bild ${i}/${to}`);
  }
}
await browser.close(); server.close();
