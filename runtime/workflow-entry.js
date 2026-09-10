import { extractDeckSpec } from './deck-spec.js';
import { renderFullDeck } from './full-deck-renderer.js';
import { validateOutline } from './grill-outline.js';

const humanConfirmed = (approval, status) => approval?.status === status && approval?.approvedBy === 'human';
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const blocked = (reason, details = []) => ({ status: 'blocked', reason, details });

const validStyleSelection = (selection, styleId) => humanConfirmed(selection, 'selected') && selection.styleId === styleId;

const contentChanges = (source, candidate) => {
  const changes = [];
  for (const sourceSlide of source.slides) {
    const candidateSlide = candidate.slides.find(({ id }) => id === sourceSlide.id);
    if (!candidateSlide) continue;
    const fields = new Set([...Object.keys(sourceSlide.content || {}), ...Object.keys(candidateSlide.content || {})]);
    for (const field of fields) {
      if (!same(sourceSlide.content?.[field], candidateSlide.content?.[field])) changes.push({
        operation: 'content', slideId: sourceSlide.id, field,
        expected: sourceSlide.content?.[field], replacement: candidateSlide.content?.[field],
      });
    }
  }
  return changes;
};

const approvedChangesMatch = (actualChanges, orderChange, changeSet) => {
  if (!actualChanges.length && !orderChange) return true;
  if (!humanConfirmed(changeSet?.approval, 'confirmed') || !Array.isArray(changeSet?.changes)) return false;
  const expectedChanges = [...actualChanges];
  if (orderChange) expectedChanges.push(orderChange);
  return same(changeSet.changes, expectedChanges);
};

export function renderExistingDeckWithGate({ sourceHtml, candidateSpec, gate = {} } = {}) {
  let source;
  try { source = extractDeckSpec(sourceHtml); } catch (error) { return { status: 'fail', reason: error.message }; }
  if (typeof gate.pressureTestAnswer !== 'string' || !gate.pressureTestAnswer.trim()) return blocked('既有 HTML 仍需完成一次核心主張壓力測試。');
  if (!humanConfirmed(gate.outlineApproval, 'confirmed')) return blocked('既有 HTML 的 outline 尚未經人類確認。');
  if (!validStyleSelection(gate.styleSelection, candidateSpec?.style?.id)) return blocked('Style 尚未由人類選定。');
  const sourceIds = source.slides.map(({ id }) => id);
  const candidateIds = candidateSpec?.slides?.map(({ id }) => id) || [];
  if (sourceIds.length !== candidateIds.length || sourceIds.some((id) => !candidateIds.includes(id))) return blocked('restyle-existing 不允許新增、刪除或改寫 slide ID。');
  const orderChange = same(sourceIds, candidateIds) ? null : { operation: 'reorder', expectedOrder: sourceIds, replacementOrder: candidateIds };
  const changes = contentChanges(source, candidateSpec);
  if (!approvedChangesMatch(changes, orderChange, gate.changeSet)) return blocked('偵測到未經人工核准的內容或頁序變更。', [...changes, ...(orderChange ? [orderChange] : [])]);
  const rendered = renderFullDeck(candidateSpec);
  return rendered.status === 'pass' ? { ...rendered, mode: 'restyle-existing', preservation: { contentChanges: changes, orderChange } } : rendered;
}

export function renderNewDeckWithGate({ deckSpec, outline, styleSelection, grill } = {}) {
  if (grill?.status !== 'complete' || grill?.materialsReviewed !== true || typeof grill?.pressureTestAnswer !== 'string' || !grill.pressureTestAnswer.trim()) return blocked('Grill Me 尚未完成。');
  const outlineResult = validateOutline(outline);
  if (outlineResult.status !== 'pass') return blocked(outlineResult.reason || 'Outline gate 尚未通過。', outlineResult.errors || []);
  if (!validStyleSelection(styleSelection, deckSpec?.style?.id)) return blocked('Style 尚未由人類選定。');
  const outlineIds = outline.slides.map(({ id }) => id);
  const deckIds = deckSpec?.slides?.map(({ id }) => id) || [];
  if (!same(outlineIds, deckIds)) return blocked('產出頁序或 slide ID 與已核准 outline 不一致。');
  const mismatch = outline.slides.find((slide, index) => !same(
    { title: slide.title, subtitle: slide.subtitle, keyPoints: slide.keyPoints },
    { title: deckSpec.slides[index].content.title, subtitle: deckSpec.slides[index].content.subtitle, keyPoints: deckSpec.slides[index].content.keyPoints },
  ));
  if (mismatch) return blocked(`投影片 ${mismatch.id} 的內容與已核准 outline 不一致。`);
  return renderFullDeck(deckSpec);
}
