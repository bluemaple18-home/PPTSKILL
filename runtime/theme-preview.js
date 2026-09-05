import { executiveClear } from '../themes/executive-clear.js';
import { productBlueprint } from '../themes/product-blueprint.js';
import { salesMomentum } from '../themes/sales-momentum.js';
import { brandStory } from '../themes/brand-story.js';

export const themes = [executiveClear, productBlueprint, salesMomentum, brandStory];

export function buildThemePreview(theme, content) {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${theme.name}</title><style>${theme.styles}</style></head><body>${theme.markup(content)}</body></html>`;
}

export function buildThemePreviews(content) {
  return themes.map((theme) => ({ ...theme, html: buildThemePreview(theme, content) }));
}
