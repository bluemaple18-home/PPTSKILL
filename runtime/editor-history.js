// 僅儲存同一 editor instance 的成功提交；估算採雙快照上界，字串只讀長度。
export function createEditorHistory(maxEntries = 20, maxBytes = 64 * 1024 * 1024) {
  const entries = [];
  let cursor = 0;
  let bytes = 0;
  let oversized = false;
  const sizeOf = value => {
    if (typeof value === 'string') return value.length * 2;
    if (value === null || typeof value !== 'object') return 8;
    if (Array.isArray(value)) return 16 + value.reduce((n, item) => n + sizeOf(item), 0);
    return 16 + Object.entries(value).reduce((n, [key, item]) => n + key.length * 2 + sizeOf(item), 0);
  };
  const clear = () => { entries.length = 0; cursor = 0; bytes = 0; oversized = false; };
  const state = () => ({ canUndo: cursor > 0, canRedo: cursor < entries.length, entries: entries.length, bytes, oversized });
  const record = (before, after, undoable) => {
    if (!undoable) { clear(); return state(); }
    const size = sizeOf(before) + sizeOf(after);
    if (size > maxBytes) { clear(); oversized = true; return state(); }
    while (entries.length > cursor) bytes -= entries.pop().bytes;
    entries.push({ before, after, bytes: size });
    bytes += size;
    cursor = entries.length;
    while (entries.length > maxEntries || bytes > maxBytes) { bytes -= entries.shift().bytes; cursor--; }
    oversized = false;
    return state();
  };
  // apply 必須先完成 canonical 與 UI 的 atomic replay，失敗時 cursor 原封不動。
  const replay = (direction, apply) => {
    if (direction !== 'undo' && direction !== 'redo') throw new Error('history direction 無效。');
    const index = direction === 'undo' ? cursor - 1 : cursor;
    if (index < 0 || index >= entries.length) return false;
    const value = entries[index][direction === 'undo' ? 'before' : 'after'];
    apply(value);
    cursor += direction === 'undo' ? -1 : 1;
    return true;
  };
  return { clear, record, replay, state };
}
