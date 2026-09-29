// 僅檢查 Core3 的 title 與 A/B fixture 元素框；不是 OCR 或 glyph ink gate。
export function measureFixtureVisual() {
  const elements = {};
  for (const [key, id] of Object.entries({ title: 'role-title', A: 'component-history-a', B: 'component-history-b', rightquote: 'component-portable-quote' })) {
    const node = document.querySelector(`[data-pptskill-element-id="${id}"]`);
    if (!node) { elements[key] = null; continue; }
    const rect = node.getBoundingClientRect(), css = getComputedStyle(node);
    let visible = node.getClientRects().length > 0;
    for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) !== 1) visible = false;
    }
    elements[key] = { text: node.textContent, visible, inlineStyle: node.getAttribute('style'),
      top: css.top, font: css.font, tracking: css.letterSpacing,
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  }
  return { viewport: { width: innerWidth, height: innerHeight }, elements };
}

export function fixtureVisualGate(measurement) {
  const issues = [], intersections = {};
  const finite = values => values.every(v => typeof v === 'number' && Number.isFinite(v));
  const viewport = measurement?.viewport;
  if (!viewport || !finite([viewport.width, viewport.height]) || viewport.width <= 0 || viewport.height <= 0) return { pass: false, issues: ['invalid-viewport'], intersections };
  for (const key of ['title', 'A', 'B']) {
    const element = measurement?.elements?.[key], rect = element?.bounds;
    if (!rect || !finite([rect.x, rect.y, rect.width, rect.height]) || rect.width <= 0 || rect.height <= 0) { issues.push('invalid-bounds:' + key); continue; }
    if (element.visible !== true) issues.push('not-visible:' + key);
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > viewport.width || rect.y + rect.height > viewport.height) issues.push('outside-viewport:' + key);
    if ((key === 'A' || key === 'B') ? element.text !== key : typeof element.text !== 'string' || !element.text.trim()) issues.push('unexpected-text:' + key);
  }
  if (issues.some(issue => issue.startsWith('invalid-bounds:'))) return { pass: false, issues, intersections };
  const title = measurement.elements.title.bounds;
  for (const key of ['A', 'B']) {
    const rect = measurement.elements[key].bounds;
    const width = Math.max(0, Math.min(title.x + title.width, rect.x + rect.width) - Math.max(title.x, rect.x));
    const height = Math.max(0, Math.min(title.y + title.height, rect.y + rect.height) - Math.max(title.y, rect.y));
    intersections[key] = { width, height, area: width * height };
    if (width > 0 && height > 0) issues.push('title-overlap:' + key);
  }
  return { pass: issues.length === 0, issues, intersections };
}
