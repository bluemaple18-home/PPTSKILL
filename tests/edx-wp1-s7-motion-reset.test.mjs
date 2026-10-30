import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMotionCss } from '../runtime/motion-primitives.js';

// CSS 輸出契約；不以字串測試宣稱已驗證 browser cascade／handle 幾何。
const css = buildMotionCss();
const rules = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
for (const mode of ['motion-ready', 'motion-static']) {
  const root = `html.${mode} .motion-root `;
  const reset = rules.filter(r => r.selector.startsWith(root) && r.body.includes('animation:none!important'));
  test(`${mode} 保留全體節點及 pseudo-element 的停動畫契約`, () => {
    assert.equal(reset.length, 1);
    assert.equal(reset[0].selector, [root + '*', root + '*::before', root + '*::after'].join(','));
    for (const declaration of ['animation:none!important', 'transition:none!important', 'opacity:1!important', 'clip-path:none!important']) assert.ok(reset[0].body.includes(declaration));
  });
  test(`${mode} transform reset 隔離 editor root／後代，並保留內容與 pseudo-element reset`, () => {
    assert.equal(reset[0].body.includes('transform:'), false, '全體 reset 不得再抹除 vendor 定位');
    const transforms = rules.filter(r => r.selector.startsWith(root) && r.body.includes('transform:none!important'));
    assert.equal(transforms.length, 1);
    const exclusion = ':not(:where([data-pptskill-editor-chrome],[data-pptskill-editor-chrome] *,.moveable-control-box,.moveable-control-box *))';
    const target = root + '*' + exclusion;
    assert.equal(transforms[0].selector, [target, target + '::before', target + '::after'].join(','));
    assert.equal(transforms[0].body, 'transform:none!important');
  });
}
