export const layoutRepairSequence = Object.freeze([
  'safer-composition',
  'explicit-content-shortening',
  'split-slide',
]);

export function nextLayoutRepair({ completed = [], shorteningApprovedBy = null } = {}) {
  if (!completed.includes('safer-composition')) return { status: 'action', action: 'safer-composition' };
  if (!completed.includes('explicit-content-shortening')) {
    return shorteningApprovedBy === 'human'
      ? { status: 'action', action: 'explicit-content-shortening' }
      : { status: 'blocked', action: 'request-content-shortening-approval' };
  }
  if (!completed.includes('split-slide')) return { status: 'action', action: 'split-slide' };
  return { status: 'blocked', action: 'manual-redesign', reason: '核准的修復序列已用盡；不得以持續縮字隱藏問題。' };
}
