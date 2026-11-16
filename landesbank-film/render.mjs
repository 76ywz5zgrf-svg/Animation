// Usage: node render.mjs preview 10,200,...   |   node render.mjs range <from> <to> <outdir>
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const root = path.dirname(new URL(import.meta.url).pathname);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
const [mode, a, b, out] = process.argv.slice(2);
const W = 720, H = 1280;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE', m.type(), m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('PAGEERR', e.message));
await page.goto(`http://localhost:${port}/index.html?w=${W}&h=${H}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
const frames = mode === 'preview' ? a.split(',').map(Number) : Array.from({ length: +b - +a }, (_, i) => +a + i);
const dir = mode === 'preview' ? path.join(root, 'build/preview') : out; fs.mkdirSync(dir, { recursive: true });
let t0 = Date.now(), n = 0;
for (const f of frames) {
  const url = await page.evaluate((f) => window.renderFrame(f), f);
  fs.writeFileSync(path.join(dir, `${String(f).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  n++; if (n % 50 === 0) console.log(`${out || ''} ${n}/${frames.length} ${((Date.now() - t0) / n / 1000).toFixed(2)}s/frame`);
}
console.log('done', n, ((Date.now() - t0) / n / 1000).toFixed(2), 's/frame');
await browser.close(); srv.close();
