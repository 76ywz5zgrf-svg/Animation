// Usage: node render.js <scene.html> <out.mp4> [timing.json] [audio] [--preview t1,t2,...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
(async () => {
  const [html, out, timingFile, audio] = process.argv.slice(2);
  const prevIdx = process.argv.indexOf('--preview');
  const timing = timingFile && timingFile !== '-' && fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile)) : null;
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  if (timing) await page.addInitScript(`window.TIMING=${JSON.stringify(timing)}`);
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => window.ready);
  const total = await page.evaluate(() => window.TOTAL);
  const grab = async t => Buffer.from((await page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.95); }, t)).split(',')[1], 'base64');
  if (prevIdx > 0) {
    const ts = process.argv[prevIdx + 1].split(',').map(Number);
    for (const t of ts) fs.writeFileSync(`${out}_${t.toFixed(1)}.jpg`, await grab(t));
    await browser.close(); return;
  }
  const fps = 30, n = Math.ceil(total * fps);
  const args = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
  if (audio) args.push('-i', audio, '-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = 0; i < n; i++) {
    const buf = await grab(i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await browser.close(); console.log('done', out, total.toFixed(2) + 's');
})();
