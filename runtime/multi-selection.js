export function applyBoundedSelection({ all, current = [], candidates = [], mode = 'replace' }) {
  if (!Array.isArray(all) || !Array.isArray(current) || !Array.isArray(candidates) || !['replace', 'toggle'].includes(mode)) {
    throw new Error('multi-selection contract 無效。');
  }
  const allowed = new Set(all);
  const next = mode === 'replace' ? new Set() : new Set(current.filter(id => allowed.has(id)));
  for (const id of new Set(candidates)) {
    if (!allowed.has(id)) continue;
    if (mode === 'toggle' && next.has(id)) next.delete(id);
    else next.add(id);
  }
  return all.filter(id => next.has(id));
}

export function createMultiSelectionState({ listTargets, onChange = () => {} }) {
  if (typeof listTargets !== 'function' || typeof onChange !== 'function') throw new Error('multi-selection state contract 無效。');
  let enabled = false, selected = [];
  const commit = next => {
    if (next.length === selected.length && next.every((id, index) => id === selected[index])) return false;
    selected = next;
    onChange([...selected]);
    return true;
  };
  const mutate = (candidates, mode) => {
    if (!enabled) return false;
    return commit(applyBoundedSelection({ all: listTargets(), current: selected, candidates, mode }));
  };
  return {
    setMode(on) {
      const nextEnabled = Boolean(on);
      if (enabled === nextEnabled) return false;
      enabled = nextEnabled;
      if (!enabled) commit([]);
      return true;
    },
    replace: candidates => mutate(candidates, 'replace'),
    toggle: candidates => mutate(candidates, 'toggle'),
    clear: () => enabled ? commit([]) : false,
    getState: () => ({ enabled, selected: [...selected] }),
  };
}

export const buildMultiSelectionRuntime = () => `${applyBoundedSelection.toString()}\n${createMultiSelectionState.toString()}`;
