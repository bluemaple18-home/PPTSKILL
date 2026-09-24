import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const repo = '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical';
const { fixture, mountedEditor } = await import(pathToFileURL(repo + '/tools/edx-wp1-s4-perf-mounted.mjs'));
const state = h => JSON.stringify({ spec: h.getSpec(), revision: h.getRevision(), history: h.api.getHistoryState(), mode: h.document.body.dataset.editorMode, selection: h.api.layout.getSelectionState(), target: h.api.layout.getState().target });
const controls = h => ['edit', 'layout', 'initialize-layout'].map(action => { const node = h.document.querySelector('[data-action="' + action + '"]'); return [node.textContent, node.getAttribute('aria-pressed'), node.hidden]; });
const inject = (h, match) => { const node = h.document.querySelector('[data-editor-status]'); let text = node.textContent, once = true; const error = Error('reviewer final status fault'); Object.defineProperty(node, 'textContent', { configurable: true, get() { return text; }, set(next) { text = next; if (once && next === match) { once = false; throw error; } } }); return { error, hit: () => !once }; };
{
  const h = mountedEditor(fixture(0)); h.action('edit');
  const title = h.document.querySelector('[data-pptskill-element-id="role-title"]');
  title.textContent = 'pending layout text';
  const before = state(h), ui = controls(h), pending = title.textContent, editable = title.contentEditable;
  const fault = inject(h, '點選元件或拖曳空白區框選多個元件');
  assert.throws(() => h.api.layout.setMode(true), error => error === fault.error);
  assert.equal(fault.hit(), true); assert.equal(state(h), before); assert.deepEqual(controls(h), ui);
  assert.equal(title.textContent, pending); assert.equal(title.contentEditable, editable);
  h.api.layout.setMode(true); assert.equal(h.getSpec().slides[0].content.title, pending);
  h.click(h.component()); h.begin(); h.update(8, 0); h.finish();
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
  console.log('original P1 public layout CLOSED');
}
{
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components.push({ id: 'group-text', type: 'text', text: 'G' });
  Object.assign(slide.composition.geometryOverrides, { 'group-text': { x: 120, y: 120, width: 200, height: 160 }, 'perf-image': { x: 420, y: 320, width: 300, height: 200 } });
  const h = mountedEditor(spec); h.api.layout.setMode(true);
  h.click(h.document.querySelector('[data-pptskill-element-id="component-group-text"]'));
  h.click(h.document.querySelector('[data-pptskill-element-id="component-perf-image"]'), { shiftKey: true });
  const before = state(h), ui = controls(h), nodes = h.document.querySelectorAll('[data-pptskill-element-id]'), styles = nodes.map(node => node.getAttribute('style'));
  const fault = inject(h, '已群組'); h.action('group-elements');
  assert.equal(fault.hit(), true); assert.match(h.document.querySelector('[data-editor-status]').textContent, /未套用/);
  assert.equal(state(h), before); assert.deepEqual(controls(h), ui);
  assert.deepEqual(nodes.map(node => node.getAttribute('style')), styles);
  h.action('group-elements'); assert.equal(h.getRevision(), 1);
  h.begin('dragGroup'); h.update(8, 0, 'dragGroup'); h.finish('dragGroup'); assert.equal(h.getRevision(), 2);
  console.log('original P1 group terminal notify CLOSED');
}
