import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const outputIndex = process.argv.indexOf('--output');
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : 'evidence/pgq-wp3-s2/underline-sweep-browser.html');
const style = {
  id: 'sweep-editorial', name: 'Sweep editorial',
  layout: { primaryMove: 'editorial-rail', compositionLanguage: 'editorial' }, density: 'medium',
  typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' },
  palette: { canvas: '#ffffff', text: '#111111', muted: '#666666', accent: '#0066cc', surface: '#eeeeee' },
  spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 0, borderWidth: 1 },
  motion: { personality: 'corporate', durationMs: 320, easing: 'ease-out', reducedMotion: true },
  assetTreatment: 'content-led',
};
const spec = {
  schemaVersion: '1.0', deckId: 'wp3-underline-sweep', title: 'Underline sweep acceptance', language: 'zh-Hant', style,
  slides: [{
    id: 'opening',
    content: { title: 'Role-aware entrance', subtitle: 'Supporting copy follows', keyPoints: ['一條既有 seam', '精確終態', '離線可攜'], components: [] },
    composition: {
      primitive: 'cover', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle' },
      motion: {
        effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 120,
        targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }],
      },
    },
  }],
};
const rendered = renderFullDeck(spec);
if (rendered.status !== 'pass') throw new Error(rendered.errors.join(' '));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, rendered.html);
console.log(JSON.stringify({ status: 'built', output, bytes: Buffer.byteLength(rendered.html) }, null, 2));
