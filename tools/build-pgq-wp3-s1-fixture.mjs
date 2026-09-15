import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const outputIndex = process.argv.indexOf('--output');
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : 'evidence/pgq-wp3-s1/number-flow-browser.html');
const style = {
  id: 'motion-technical', name: 'Motion technical',
  layout: { primaryMove: 'asymmetric-grid', compositionLanguage: 'technical' }, density: 'high',
  typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' },
  palette: { canvas: '#ffffff', text: '#111111', muted: '#666666', accent: '#0066cc', surface: '#eeeeee' },
  spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 0, borderWidth: 1 },
  motion: { personality: 'corporate', durationMs: 320, easing: 'ease-out', reducedMotion: true },
  assetTreatment: 'content-led',
};
const spec = {
  schemaVersion: '1.0', deckId: 'wp3-number-flow', title: 'NumberFlow acceptance', language: 'zh-Hant', style,
  slides: [{
    id: 'metrics',
    content: { title: '成效', subtitle: '核准數字', keyPoints: ['1,240｜完成件數', '72.5%｜採用率', '$18｜單位成本'], components: [] },
    composition: {
      primitive: 'metric-grid', variant: 'default',
      slots: { title: 'content.title', subtitle: 'content.subtitle', points: 'content.keyPoints' },
      motion: {
        effect: 'number-flow-odometer', role: 'metric', replay: 'slide-visible', staggerMs: 80,
        targets: [{ ref: 'content.keyPoints.0', from: 0 }, { ref: 'content.keyPoints.1', from: 50 }],
      },
    },
  }],
};
const rendered = renderFullDeck(spec);
if (rendered.status !== 'pass') throw new Error(rendered.errors.join(' '));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, rendered.html);
console.log(JSON.stringify({ status: 'built', output, bytes: Buffer.byteLength(rendered.html) }, null, 2));
