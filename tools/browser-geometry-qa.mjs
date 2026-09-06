import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const input = args.find((arg) => !arg.startsWith('--'));
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
if (!input) throw new Error('Usage: node tools/browser-geometry-qa.mjs <html-path> [--output receipt.json]');

const chromeCandidates = [
  process.env.PPTSKILL_CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome',
  'chromium',
].filter(Boolean);

let chromeBin;
for (const candidate of chromeCandidates) {
  try {
    if (candidate.includes('/')) await access(candidate);
    chromeBin = candidate;
    break;
  } catch {}
}
if (!chromeBin) throw new Error('找不到 Chrome/Chromium；可用 PPTSKILL_CHROME_BIN 指定。');

const htmlPath = resolve(input);
await access(htmlPath);
const htmlUrl = pathToFileURL(htmlPath).href;

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
  }
  async open() {
    await new Promise((resolveOpen, reject) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolveMessage, rejectMessage } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) rejectMessage(new Error(message.error.message));
      else resolveMessage(message.result);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolveMessage, rejectMessage) => {
      this.pending.set(id, { resolveMessage, rejectMessage });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const geometryExpression = String.raw`(async () => {
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const issues = [];
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
  };
  const box = (element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  };
  const label = (element) => element.getAttribute('data-edit-target') || element.id || element.getAttribute('data-slide-id') || [element.tagName.toLowerCase(), ...element.classList].join('.');
  const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const slides = [...document.querySelectorAll('.slide')];
  for (const slide of slides) {
    if (box(slide).width > innerWidth + 1) issues.push({ code: 'VIEWPORT_OVERFLOW', slideId: slide.id, slideWidth: box(slide).width, viewportWidth: innerWidth });
  }
  for (const slide of slides) {
    const slideBox = box(slide);
    const elements = [...slide.querySelectorAll('*')].filter(visible);
    const leaves = elements.filter((element) => element.childElementCount === 0 && element.textContent.trim());
    const images = elements.filter((element) => ['IMG', 'SVG', 'CANVAS', 'VIDEO'].includes(element.tagName));
    const inspected = [...new Set([...leaves, ...images, ...slide.querySelectorAll('[data-edit-target]')])].filter(visible);
    for (const element of inspected) {
      const rect = box(element);
      if (rect.left < slideBox.left - 1 || rect.top < slideBox.top - 1 || rect.right > slideBox.right + 1 || rect.bottom > slideBox.bottom + 1) {
        issues.push({ code: 'OFF_CANVAS', slideId: slide.id, target: label(element), box: rect });
      }
      if (element.scrollWidth > element.clientWidth + 8 || element.scrollHeight > element.clientHeight + 8) {
        issues.push({ code: 'OVERFLOW', slideId: slide.id, target: label(element), scroll: [element.scrollWidth, element.scrollHeight], client: [element.clientWidth, element.clientHeight] });
      }
    }
    for (const element of leaves) {
      const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
      if (fontSize < 14) issues.push({ code: 'FONT_TOO_SMALL', slideId: slide.id, target: label(element), fontSize });
    }
    for (let left = 0; left < leaves.length; left += 1) {
      for (let right = left + 1; right < leaves.length; right += 1) {
        if (intersects(box(leaves[left]), box(leaves[right]))) issues.push({ code: 'TEXT_TEXT', slideId: slide.id, targets: [label(leaves[left]), label(leaves[right])] });
      }
    }
    for (const text of leaves) for (const image of images) {
      if (intersects(box(text), box(image))) issues.push({ code: 'TEXT_IMAGE', slideId: slide.id, targets: [label(text), label(image)] });
    }
    for (let left = 0; left < images.length; left += 1) {
      for (let right = left + 1; right < images.length; right += 1) {
        if (intersects(box(images[left]), box(images[right]))) issues.push({ code: 'IMAGE_IMAGE', slideId: slide.id, targets: [label(images[left]), label(images[right])] });
      }
    }
  }
  return { slideCount: slides.length, slideWidths: slides.map((slide) => box(slide).width), issues };
})()`;

const runAtViewport = async ({ width, height }, offset) => {
  const profileDir = await mkdtemp(`${tmpdir()}/pptskill-geometry-`);
  const port = 9430 + offset + Math.floor(Math.random() * 100);
  const browser = spawn(chromeBin, [
    '--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, `--window-size=${width},${height}`, htmlUrl,
  ], { stdio: 'ignore' });
  try {
    let pages;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        pages = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
        if (pages.some(({ type }) => type === 'page')) break;
      } catch {}
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    const page = pages?.find(({ type }) => type === 'page');
    if (!page) throw new Error('Chrome DevTools target 未就緒。');
    const cdp = new CdpClient(page.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const result = await cdp.send('Runtime.evaluate', { expression: geometryExpression, awaitPromise: true, returnByValue: true });
    cdp.close();
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return { viewport: { width, height }, ...result.result.value };
  } finally {
    browser.kill('SIGTERM');
    if (browser.exitCode === null) {
      await Promise.race([
        new Promise((resolveExit) => browser.once('exit', resolveExit)),
        new Promise((resolveWait) => setTimeout(resolveWait, 2000)),
      ]);
    }
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
};

const viewports = [{ width: 1600, height: 900 }, { width: 1280, height: 720 }];
const runs = [];
for (let index = 0; index < viewports.length; index += 1) runs.push(await runAtViewport(viewports[index], index * 100));
const receipt = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  artifact: basename(htmlPath),
  status: runs.every(({ issues, slideCount }) => slideCount > 0 && issues.length === 0) ? 'pass' : 'fail',
  runs,
};
if (outputPath) await writeFile(resolve(outputPath), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exitCode = receipt.status === 'pass' ? 0 : 1;
