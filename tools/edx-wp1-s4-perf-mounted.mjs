import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { buildDeckEditorRuntimeScript } from '../runtime/deck-editor.js';
import { sanitizeDeckSpec, resolveSlideElementIdentities } from '../runtime/deck-spec.js';

export const target = { slideId: 'portable', elementId: 'component-portable-quote' };
export const box = { x: 800, y: 280, width: 640, height: 480 };
export const request = (operation, value, destination = target) => ({ operation, target: destination, value });
export const geometry = spec => spec.slides.find(s => s.id === target.slideId)?.composition.geometryOverrides?.['portable-quote'];
export function fixture(mib = 1) {
  const spec = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  spec.slides = spec.slides.filter(s => s.id === 'portable');
  spec.slides[0].composition.geometryOverrides = { 'portable-quote': { ...box } };
  spec.slides[0].content.components.push({ id: 'perf-image', type: 'image', alt: '成本探針', dataUri: 'data:image/png;base64,' + 'A'.repeat(mib * 1024 * 1024) });
  return sanitizeDeckSpec(spec);
}

// 最小 DOM double 只驗 mounted/public runtime；不宣稱瀏覽器排版或 vendor pointer 驗收。
const attrName = key => 'data-' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
// 同步 declaration 與 style attribute，讓 clone/export 替身維持 DOM 語意。
function elementStyle(element) {
  const read = () => Object.fromEntries((element.attrs.style || '').split(';').filter(Boolean).map(part => { const i = part.indexOf(':'); return [part.slice(0, i).trim(), part.slice(i + 1).trim()]; }));
  const write = values => { element.attrs.style = Object.entries(values).map(([k, v]) => k + ':' + v).join(';'); };
  const methods = {
    setProperty(k, v, p = '') { write({ ...read(), [k]: v + (p ? '!important' : '') }); },
    getPropertyValue(k) { return (read()[k] || '').replace(/!important$/, ''); },
    getPropertyPriority(k) { return /!important$/.test(read()[k] || '') ? 'important' : ''; },
    removeProperty(k) { const values = read(); delete values[k]; write(values); },
  };
  return new Proxy(methods, { get: (target, k) => target[k] || methods.getPropertyValue(k), set: (_, k, v) => { methods.setProperty(k, v); return true; } });
}
class Element {
  constructor(tag = 'div', attrs = {}, text = '') {
    this.tag = tag; this.attrs = { ...attrs }; this.children = []; this.text = text; this.style = elementStyle(this); this.listeners = {};
    this.dataset = new Proxy({}, { get: (_, key) => this.attrs[attrName(key)], set: (_, key, value) => { this.attrs[attrName(key)] = String(value); return true; } });
  }
  get textContent() { return this.text + this.children.map(c => c.textContent).join(''); }
  set textContent(value) { this.text = String(value); this.children = []; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  get isConnected() { return this.tag === 'html' || Boolean(this.parentElement?.isConnected); }
  get parentNode() { return this.parentElement; }
  append(node) { node.remove(); this.children.push(node); node.parentElement = this; }
  remove() { if (this.parentElement) { const p = this.parentElement; p.children.splice(p.children.indexOf(this), 1); this.parentElement = null; } }
  after(node) { const p = this.parentElement; node.remove(); p.children.splice(p.children.indexOf(this) + 1, 0, node); node.parentElement = p; }
  replaceWith(node) { this.after(node); this.remove(); }
  insertBefore(node, other) { node.remove(); this.children.splice(this.children.indexOf(other), 0, node); node.parentElement = this; }
  get nextElementSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1]; }
  get previousElementSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) - 1]; }
  matches(selector) {
    if (selector.includes(',')) return selector.split(',').some(s => this.matches(s.trim()));
    const parts = selector.split(' '); if (parts.length > 1) return this.matches(parts.pop()) && Boolean(this.parentElement?.closest(parts.join(' ')));
    if (selector.startsWith('#')) return this.attrs.id === selector.slice(1);
    const tag = selector.match(/^[a-z][\w-]*/)?.[0]; if (tag && this.tag !== tag) return false;
    for (const [, cls] of selector.split('[')[0].matchAll(/\.([\w-]+)/g)) if (!(this.attrs.class || '').split(' ').includes(cls)) return false;
    for (const [, key, value] of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) if (!(key in this.attrs) || (value !== undefined && this.attrs[key] !== value)) return false;
    return true;
  }
  closest(s) { return this.matches(s) ? this : this.parentElement?.closest(s); }
  querySelectorAll(s) { return this.children.flatMap(c => [...(c.matches(s) ? [c] : []), ...c.querySelectorAll(s)]); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  getBoundingClientRect() { return { width: 1600 }; }
  scrollIntoView() {}
  cloneNode() { const node = new Element(this.tag, this.attrs, this.text); for (const c of this.children) node.append(c.cloneNode()); return node; }
  get outerHTML() { return '<' + this.tag + Object.entries(this.attrs).map(([k, v]) => ` ${k}="${escape(v)}"`).join('') + '>' + (this.tag === 'script' ? this.text : escape(this.text)) + this.children.map(c => c.outerHTML).join('') + '</' + this.tag + '>'; }
  set innerHTML(html) {
    const match = html.match(/^<([\w-]+)([^>]*)>([\s\S]*)<\/\1>$/);
    if (!match) throw new Error('DOM double 不支援此 markup');
    const attrs = Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    this.content = { firstElementChild: new Element(match[1], attrs, match[3].replace(/<[^>]*>/g, '')) };
  }
}

export function mountedEditor(input = fixture()) {
  const state = sanitizeDeckSpec(input), root = new Element('html'), body = new Element('body'), deck = new Element('main', { class: 'deck' });
  root.append(body); body.append(deck);
  const tag = new Element('script', { id: 'deck-spec', type: 'application/json' }, JSON.stringify(state)); body.append(tag);
  for (const action of ['layout', 'snap-layout', 'initialize-layout', 'edit', 'move-up', 'move-down', 'duplicate', 'delete']) body.append(new Element('button', { 'data-action': action }));
  const alignToolbar = new Element('span', { 'data-pptskill-context-toolbar': '', hidden: '' }); alignToolbar.hidden = true; body.append(alignToolbar);
  for (const action of ['align-left', 'align-center-x', 'align-right', 'align-top', 'align-center-y', 'align-bottom']) alignToolbar.append(new Element('button', { 'data-action': action }));
  for (const action of ['distribute-horizontal-centers', 'distribute-vertical-centers', 'distribute-horizontal-gaps', 'distribute-vertical-gaps']) { const control = new Element('button', { 'data-action': action, 'data-distribute-control': '', hidden: '' }); control.hidden = true; alignToolbar.append(control); }
  const typographyToolbar = new Element('span', { 'data-pptskill-typography-toolbar': '', hidden: '' }); typographyToolbar.hidden = true; body.append(typographyToolbar);
  typographyToolbar.append(new Element('input', { 'data-typography-size': '', type: 'number' }));
  for (const action of ['apply-typography', 'reset-typography', 'copy-style', 'paste-style']) typographyToolbar.append(new Element('button', { 'data-action': action }));
  const imageToolbar = new Element('span', { 'data-pptskill-selected-image-toolbar': '' });
  const imageButton = new Element('button', { 'data-action': 'replace-selected-image', hidden: '' }); imageButton.hidden = true;
  imageToolbar.append(imageButton);
  imageToolbar.append(new Element('input', { id: 'pptskill-selected-image-input', type: 'file' })); body.append(imageToolbar);
  body.append(new Element('span', { 'data-editor-status': '' }));
  for (const slide of state.slides) {
    const node = new Element('section', { class: 'slide', 'data-slide-id': slide.id }); deck.append(node);
    const ids = resolveSlideElementIdentities(slide);
    const add = (id, field, value, kind = 'text') => node.append(new Element('blockquote', { 'data-pptskill-element-id': id, 'data-edit-target': `slides.${slide.id}.content.${field}`, ...(kind ? { 'data-edit-kind': kind } : {}) }, value));
    add(ids.title, 'title', slide.content.title); add(ids.subtitle, 'subtitle', slide.content.subtitle);
    slide.content.keyPoints.forEach((p, i) => add(ids.keyPoints[i], 'keyPoints.' + i, p));
    slide.content.components.forEach((c, i) => {
      add(ids.components[i], 'components.' + c.id, c.text || c.label || '', ['text', 'citation'].includes(c.type) ? 'text' : '');
      if (c.type === 'image') node.children.at(-1).append(new Element('img', { src: c.dataUri, alt: c.alt, style: 'object-fit:' + (c.fit || 'contain') }));
    });
  }
  const counts = { payloadReads: 0, serializations: 0, wholeSpecSerializations: 0 };
  const observedJSON = {
    parse(text) {
      const value = JSON.parse(text);
      if (text === tag.textContent && value.slides) for (const s of value.slides) for (const c of s.content.components) if (c.dataUri) {
        let data = c.dataUri;
        Object.defineProperty(c, 'dataUri', { enumerable: true, configurable: true, get() { counts.payloadReads++; return data; }, set(value) { data = value; } });
      }
      return value;
    },
    stringify(value, ...args) { counts.serializations++; if (value?.slides) counts.wholeSpecSerializations++; return JSON.stringify(value, ...args); },
  };
  let vendor, selectoVendor; const observers = new Set();
  class Moveable {
    constructor(overlay, options) { this.handlers = {}; this.options = options; this.destroyed = false; vendor = this; }
    on(name, fn) { this.handlers[name] = fn; }
    destroy() { if (this.destroyed) throw new Error('重複 destroy'); this.destroyed = true; } stopDrag() {} updateRect() { if (this.destroyed) throw new Error('destroy 後 updateRect'); }
  }
  class Selecto {
    constructor(options) {
      this.options = options; this.handlers = {}; this.selected = []; this.destroyed = false;
      this.chrome = new Element('div', { class: 'selecto-selection selecto-test' });
      this.styleNode = new Element('style', { 'data-styled-id': 'selecto-test' }, '.selecto-selection{}');
      body.append(this.styleNode); body.append(this.chrome); selectoVendor = this;
    }
    on(name, fn) { this.handlers[name] = fn; return this; }
    setSelectedTargets(nodes) { this.selected = [...nodes]; return this; }
    destroy() { if (this.destroyed) return; this.destroyed = true; this.chrome.remove(); this.styleNode.remove(); }
  }
  const document = Object.assign(root, { body, documentElement: root, readyState: 'complete', createElement: tag => new Element(tag) });
  const window = { PPTSKILLMoveable: { default: Moveable }, PPTSKILLSelecto: { default: Selecto }, listeners: {}, addEventListener: Element.prototype.addEventListener, removeEventListener: Element.prototype.removeEventListener,
    PPTSKILLSizeGuard: { prepare: html => ({ status: 'pass', html, report: {} }) },
    PPTSKILLAssets: { optimizeFile: async file => ({ dataUri: file.dataUri, warnings: [], optimized: false }) },
  };
  vm.runInNewContext(buildDeckEditorRuntimeScript().replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '').replace('window.PPTSKILLEditor={', 'window.__testRevision=()=>revision;window.__testMutateSpec=fn=>fn(spec);window.PPTSKILLEditor={'), {
    document, window, JSON: observedJSON, CSS: { escape: v => v }, MutationObserver: class { constructor(fn) { this.fn = fn; } observe() { observers.add(this); } disconnect() { observers.delete(this); } }, console,
  });
  const api = window.PPTSKILLEditor;
  const click = (node, fields = {}) => { for (const fn of document.listeners.click || []) fn({ target: node, shiftKey: false, preventDefault() {}, ...fields }); };
  const component = () => document.querySelector(`[data-pptskill-element-id="${target.elementId}"]`);
  const ready = () => { api.layout.setMode(true); click(component()); };
  const event = (x = 0, y = 0) => ({ inputEvent: { clientX: x, clientY: y }, set() {}, stop() { throw new Error('gesture 未啟動'); } });
  const begin = (kind = 'drag') => vendor.handlers[kind + 'Start'](event());
  const update = (x, y, kind = 'drag') => vendor.handlers[kind](event(x, y));
  const finish = (kind = 'drag') => vendor.handlers[kind + 'End']();
  const getSpec = () => JSON.parse(JSON.stringify(api.getDeckSpec()));
  return { api, document, window, getRevision: () => window.__testRevision(), flushMutations() { for (const observer of [...observers]) observer.fn(); }, get vendor() { return vendor; }, get selecto() { return selectoVendor; }, click, assets: window.PPTSKILLAssets, counts, component, ready, begin, update, finish, getSpec,
    resetCounts() { for (const key of Object.keys(counts)) counts[key] = 0; },
    action(name) { click(document.querySelector(`[data-action="${name}"]`)); },
  };
}
