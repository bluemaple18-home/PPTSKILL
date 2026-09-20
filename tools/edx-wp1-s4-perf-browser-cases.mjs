import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// 由既有 S4 attach-only runner 呼叫，保留其雙 viewport、真 pointer、export/reopen 與錯誤 listener。
export async function runPerfBrowserCases({ evaluate, navigate, sourcePath, click, selector, startGesture, endGesture, assertExport, run }) {
  const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const getSpec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const reset = async () => {
    await navigate(sourcePath); await click('[data-action="layout"]'); await click(selector); await click('[data-action="initialize-layout"]');
  };
  const rect = spec => spec.slides.find(s => s.id === 'portable').composition.geometryOverrides['portable-quote'];
  await reset();
  let pointer = await startGesture('drag', 20, 10), before = await getSpec();
  await evaluate(`(()=>{const e=window.PPTSKILLEditor,s=e.getDeckSpec().slides[0],t={slideId:s.id,elementId:'component-portable-quote'};
    e.executeOperation({operation:'move-element',target:t,value:{x:800,y:280}});
    e.applyLocalPatch({slideId:s.id,region:'content.components.portable-quote',value:{text:s.content.components[0].text}});
    let rejected=false;try{e.executeOperation({operation:'move-element',target:t,value:{x:-1,y:280}})}catch{rejected=true}
    if(!rejected)throw new Error('invalid operation 未拒絕');
    e.getDeckSpec();e.prepareExport();e.getSizeReport();return true})()`);
  await assertExport('perf-preview-readonly', before);
  assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
  await endGesture(pointer);
  assert.deepEqual(rect(await getSpec()), { x: 820, y: 290, width: 640, height: 480 });
  run.checks.push('PERF readonly/noop/invalid/export 換 object 後真 pointer release');

  const cases = [
    ['public-text', `e.executeOperation({operation:'edit-text',target:{slideId:'portable',elementId:'role-title'},value:'PERF 新標題'})`],
    ['legacy-text', `e.applyLocalPatch({slideId:'portable',region:'content.subtitle',value:'PERF 新副標'})`],
    ['legacy-component', `e.applyLocalPatch({slideId:'portable',region:'content.components.portable-quote',value:{text:'PERF 新元件'}})`],
    ['sync-export', `document.querySelector('[data-pptskill-element-id="role-title"]').textContent='PERF DOM 新標題';e.exportHtml()`],
    ['geometry', `e.executeOperation({operation:'move-element',target:{slideId:'portable',elementId:'component-portable-quote'},value:{x:850,y:300}})`],
    ['asset-after-export', `const pending=e.replaceImageFile(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="red"/></svg>'],'perf.svg',{type:'image/svg+xml'}));e.exportHtml();await pending`],
  ];
  for (const [label, mutation] of cases) {
    await reset(); pointer = await startGesture('drag', 20, 10);
    before = await getSpec();
    await evaluate(`(async()=>{const e=window.PPTSKILLEditor;${mutation};return true})()`);
    const expected = await getSpec(); assert.notEqual(digest(expected), digest(before), label + ' 必須真的改變 canonical');
    await endGesture(pointer); assert.equal(digest(await getSpec()), digest(expected), label + ' stale 不覆寫');
    assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false);
    await assertExport('perf-stale-' + label, expected); run.checks.push('PERF stale 真 pointer ' + label);
  }
}
