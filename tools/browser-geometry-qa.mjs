import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const input = args.find((arg) => !arg.startsWith('--'));
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
const screenshotIndex = args.indexOf('--screenshot');
const screenshotPath = screenshotIndex >= 0 ? args[screenshotIndex + 1] : null;
const montageIndex = args.indexOf('--montage');
const montagePath = montageIndex >= 0 ? args[montageIndex + 1] : null;
const motionFramesIndex = args.indexOf('--motion-frames');
const motionFramesPrefix = motionFramesIndex >= 0 ? args[motionFramesIndex + 1] : null;
const motionIndex = args.indexOf('--motion');
const motionMode = motionIndex >= 0 ? args[motionIndex + 1] : 'reduce';
if (!['reduce', 'normal'].includes(motionMode)) throw new Error('--motion 只接受 reduce 或 normal。');
if (!input) throw new Error('Usage: node tools/browser-geometry-qa.mjs <html-path> [--output receipt.json] [--screenshot image.png] [--montage image.png] [--motion reduce|normal] [--motion-frames path-prefix]');

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
    this.listeners = new Map();
  }
  async open() {
    await new Promise((resolveOpen, reject) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method) {
        for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
        return;
      }
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
  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }
  close() { this.socket.close(); }
}

const geometryExpression = String.raw`(async () => {
  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 1300));
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
    const slideBox = box(slide);
    if (slideBox.width > innerWidth + 1 || slideBox.height > innerHeight + 1) {
      issues.push({ code: 'VIEWPORT_OVERFLOW', slideId: slide.id, slideBox, viewport: { width: innerWidth, height: innerHeight } });
    }
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
      const fontMetricTolerance = element.matches('h1,h2,h3,h4,h5,h6,strong,b,em,p,span,li,blockquote,td,th')
        ? Math.max(8, Number.parseFloat(getComputedStyle(element).fontSize) * 0.3)
        : 8;
      if (element.scrollWidth > element.clientWidth + 8 || element.scrollHeight > element.clientHeight + fontMetricTolerance) {
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
  const bodyText = document.body?.innerText || '';
  const visibleTraceback = /Traceback|Unhandled|Exception/.test(bodyText)
    ? bodyText.split('\n').filter((line) => /Traceback|Unhandled|Exception/.test(line)).slice(0, 5)
    : null;
  const semanticBoxes = Object.fromEntries([
    ['title', '[data-effect-title]'],
    ['visualAnchor', '[data-effect-visual-anchor]'],
    ['supportingCopy', '.subtitle'],
  ].map(([role, selector]) => [role, document.querySelector(selector) ? box(document.querySelector(selector)) : null]));
  const primarySlide = slides[0];
  const relativeBox = (element) => {
    if (!primarySlide || !element) return null;
    const stage = box(primarySlide);
    const rect = box(element);
    return {
      x: Number(((rect.left - stage.left) / stage.width).toFixed(4)),
      y: Number(((rect.top - stage.top) / stage.height).toFixed(4)),
      width: Number((rect.width / stage.width).toFixed(4)),
      height: Number((rect.height / stage.height).toFixed(4)),
    };
  };
  const titleElement = document.querySelector('[data-effect-title]');
  const anchorElement = document.querySelector('[data-effect-visual-anchor]');
  const titleBox = titleElement ? box(titleElement) : null;
  const anchorBox = anchorElement ? box(anchorElement) : null;
  const overlap = titleBox && anchorBox ? intersects(titleBox, anchorBox) : false;
  const quadrantMap = (rect) => {
    if (!rect || !primarySlide) return [];
    const stage = box(primarySlide);
    const middleX = stage.left + stage.width / 2;
    const middleY = stage.top + stage.height / 2;
    return [
      rect.left < middleX && rect.top < middleY ? 'q1' : null,
      rect.right > middleX && rect.top < middleY ? 'q2' : null,
      rect.left < middleX && rect.bottom > middleY ? 'q3' : null,
      rect.right > middleX && rect.bottom > middleY ? 'q4' : null,
    ].filter(Boolean);
  };
  const dominantAxis = (() => {
    if (!titleBox || !anchorBox) return null;
    const dx = Math.abs((titleBox.left + titleBox.right) / 2 - (anchorBox.left + anchorBox.right) / 2);
    const dy = Math.abs((titleBox.top + titleBox.bottom) / 2 - (anchorBox.top + anchorBox.bottom) / 2);
    if (dx > dy * 1.35) return 'horizontal';
    if (dy > dx * 1.35) return 'vertical';
    return 'diagonal';
  })();
  const compositionContract = primarySlide ? {
    titleRegion: primarySlide.dataset.titleRegion || null,
    anchorRegion: primarySlide.dataset.anchorRegion || null,
    overlap: primarySlide.dataset.overlap || null,
    dominantAxis: primarySlide.dataset.dominantAxis || null,
    occupiedQuadrants: primarySlide.dataset.occupiedQuadrants || null,
    anchorCopyRelation: primarySlide.dataset.anchorCopyRelation || null,
    silhouette: primarySlide.dataset.silhouette || null,
  } : null;
  const computedStructure = {
    titleRegion: relativeBox(titleElement),
    anchorRegion: relativeBox(anchorElement),
    overlap,
    dominantAxis,
    occupiedQuadrants: [...new Set([...quadrantMap(titleBox), ...quadrantMap(anchorBox)])],
  };
  return { slideCount: slides.length, slideBoxes: slides.map(box), semanticBoxes, compositionContract, computedStructure, issues, visibleTraceback };
})()`;

const motionTraceExpression = String.raw`(async () => {
  await document.fonts.ready;
  const roots = [...document.querySelectorAll('.motion-root')];
  const roleElements = new Map();
  for (const element of document.querySelectorAll('[data-effect-role]')) {
    const role = element.dataset.effectRole;
    if (!roleElements.has(role)) roleElements.set(role, element);
  }
  const component = document.querySelector('.primitive-component-focus .asset');
  if (component) roleElements.set('componentFocus', component);
  const probeFor = (element) => {
    if (element.dataset.effectRole === 'metric') return element.querySelector('.metric-value') || element;
    if (element.dataset.effectRole === 'process') return element.querySelector('article') || element;
    if (element.classList.contains('chart-asset')) return element.querySelector('.bar-row i') || element;
    return element;
  };
  const snapshot = () => Object.fromEntries([...roleElements].map(([role, element]) => {
    const probe = probeFor(element);
    const style = getComputedStyle(probe);
    return [role, {
      treatment: element.dataset.effectTreatment,
      opacity: style.opacity,
      transform: style.transform,
      clipPath: style.clipPath,
      transitionDuration: style.transitionDuration,
      layoutBox: { left: probe.offsetLeft, top: probe.offsetTop, width: probe.offsetWidth, height: probe.offsetHeight },
    }];
  }));
  if (${JSON.stringify(motionMode)} === 'normal') {
    roots.forEach((root) => root.classList.remove('is-visible'));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
  const initial = snapshot();
  roots.forEach((root) => root.classList.add('is-visible'));
  await new Promise((resolve) => setTimeout(resolve, ${motionMode === 'normal' ? 1300 : 20}));
  const resting = snapshot();
  const changedRoles = Object.keys(initial).filter((role) => ['opacity', 'transform', 'clipPath'].some((field) => initial[role][field] !== resting[role][field]));
  const layoutStable = Object.keys(initial).every((role) => JSON.stringify(initial[role].layoutBox) === JSON.stringify(resting[role].layoutBox));
  const restingVisible = Object.values(resting).every(({ opacity, clipPath }) => Number(opacity) > 0 && !/100%/.test(clipPath));
  return { mode: ${JSON.stringify(motionMode)}, initial, resting, changedRoles, layoutStable, restingVisible };
})()`;

const runAtViewport = async ({ width, height }) => {
  const profileDir = await mkdtemp(`${tmpdir()}/pptskill-geometry-`);
  const browser = spawn(chromeBin, [
    '--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' });
  try {
    let port;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const [activePort] = (await readFile(`${profileDir}/DevToolsActivePort`, 'utf8')).trim().split('\n');
        port = Number(activePort);
        if (Number.isInteger(port) && port > 0) break;
      } catch {}
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    if (!port) throw new Error('Chrome DevTools port 未就緒。');
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
    const consoleMessages = [];
    const pageErrors = [];
    const networkFailures = [];
    const httpErrors = [];
    cdp.on('Runtime.consoleAPICalled', ({ type, args: values = [] }) => consoleMessages.push({
      type,
      text: values.map(({ value, description }) => value ?? description ?? '').join(' '),
    }));
    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => pageErrors.push({
      text: exceptionDetails?.text,
      description: exceptionDetails?.exception?.description,
    }));
    cdp.on('Network.loadingFailed', ({ requestId, errorText, canceled }) => networkFailures.push({ requestId, errorText, canceled }));
    cdp.on('Network.responseReceived', ({ response }) => {
      if (response?.status >= 400) httpErrors.push({ url: response.url, status: response.status, statusText: response.statusText });
    });
    await Promise.all([
      cdp.send('Page.enable'),
      cdp.send('Runtime.enable'),
      cdp.send('Network.enable'),
    ]);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: motionMode === 'reduce' ? 'reduce' : 'no-preference' }] });
    const loaded = new Promise((resolveLoad) => cdp.on('Page.loadEventFired', resolveLoad));
    await cdp.send('Page.navigate', { url: htmlUrl });
    await Promise.race([loaded, new Promise((_, reject) => setTimeout(() => reject(new Error('頁面載入逾時。')), 5000))]);
    if (motionFramesPrefix && motionMode === 'normal' && width === 1280 && height === 720) {
      await cdp.send('Runtime.evaluate', { expression: `(() => { document.querySelectorAll('.motion-root').forEach((root) => root.classList.remove('is-visible')); return document.body.offsetWidth; })()` });
      await new Promise((resolveFrame) => setTimeout(resolveFrame, 40));
      const frameDelays = [0, 80, 100, 140, 180, 260];
      for (let index = 0; index < frameDelays.length; index += 1) {
        if (index === 1) await cdp.send('Runtime.evaluate', { expression: `(() => document.querySelectorAll('.motion-root').forEach((root) => root.classList.add('is-visible')))()` });
        if (frameDelays[index]) await new Promise((resolveFrame) => setTimeout(resolveFrame, frameDelays[index]));
        const frame = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(resolve(`${motionFramesPrefix}-${String(index).padStart(2, '0')}.png`), Buffer.from(frame.data, 'base64'));
      }
    }
    const motionTraceResult = await cdp.send('Runtime.evaluate', { expression: motionTraceExpression, awaitPromise: true, returnByValue: true });
    if (motionTraceResult.exceptionDetails) throw new Error(motionTraceResult.exceptionDetails.text);
    const result = await cdp.send('Runtime.evaluate', { expression: geometryExpression, awaitPromise: true, returnByValue: true });
    if (screenshotPath && width === 1280 && height === 720) {
      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(resolve(screenshotPath), Buffer.from(screenshot.data, 'base64'));
    }
    if (montagePath && width === 1280 && height === 720) {
      await cdp.send('Runtime.evaluate', { expression: `(() => {
        document.documentElement.style.background = '#171116';
        document.body.style.cssText = 'margin:0;width:1280px;height:720px;overflow:hidden;background:#171116;padding:24px;';
        const deck = document.querySelector('.deck');
        deck.style.cssText = 'zoom:1;display:grid;grid-template-columns:repeat(4,288px);grid-auto-rows:162px;gap:28px 26px;justify-content:center;align-content:center;width:1232px;height:672px;';
        for (const slide of [...deck.querySelectorAll('.slide')]) {
          const frame = document.createElement('div');
          frame.style.cssText = 'width:288px;height:162px;overflow:hidden;position:relative;box-shadow:0 8px 28px rgba(0,0,0,.28);';
          slide.before(frame);
          frame.append(slide);
          slide.style.transform = 'scale(.18)';
          slide.style.transformOrigin = 'top left';
        }
      })()` });
      await new Promise((resolveFrame) => setTimeout(resolveFrame, 100));
      const montage = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(resolve(montagePath), Buffer.from(montage.data, 'base64'));
    }
    cdp.close();
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return {
      viewport: { width, height },
      traceback: result.result.value.visibleTraceback || null,
      console: consoleMessages,
      pageErrors,
      networkFailures,
      httpErrors,
      motionTrace: motionTraceResult.result.value,
      ...result.result.value,
    };
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
for (const viewport of viewports) runs.push(await runAtViewport(viewport));
const receipt = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  artifact: basename(htmlPath),
  motionMode,
  status: runs.every(({ issues, slideCount, pageErrors, networkFailures, httpErrors, motionTrace }) => (
    slideCount > 0 && issues.length === 0 && pageErrors.length === 0 && networkFailures.length === 0 && httpErrors.length === 0
    && motionTrace.layoutStable && motionTrace.restingVisible
    && (motionMode === 'reduce' || motionTrace.changedRoles.length >= 4)
  )) ? 'pass' : 'fail',
  runs,
};
if (outputPath) await writeFile(resolve(outputPath), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exitCode = receipt.status === 'pass' ? 0 : 1;
