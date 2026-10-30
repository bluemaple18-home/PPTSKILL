export const executiveClear = {
  id: 'executive-clear',
  name: 'Executive Clear',
  description: '以瑞士網格與決策路徑呈現結論先行的管理摘要。',
  styles: `
    :root { color: #171917; background: #f1efe8; font-family: Arial, 'PingFang TC', 'Noto Sans TC', sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; width: 1600px; height: 900px; overflow: hidden; background: #f1efe8; }
    main { width: 100%; height: 100%; padding: 54px 64px 48px; display: grid; grid-template-rows: 58px 1fr 94px; }
    header { display: grid; grid-template-columns: 8fr 3fr 1fr; align-items: start; border-top: 2px solid #171917; padding-top: 13px; font-size: 14px; line-height: 1; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
    header .theme { color: #d6402c; }
    header .folio { justify-self: end; font-variant-numeric: tabular-nums; }
    .hero { display: grid; grid-template-columns: minmax(0, 8fr) minmax(350px, 4fr); gap: 54px; align-items: center; }
    .copy { padding: 22px 0 12px; }
    .eyebrow { margin: 0 0 32px; display: flex; align-items: center; gap: 14px; color: #d6402c; font-size: 15px; font-weight: 800; letter-spacing: .14em; }
    .eyebrow::before { content: ''; width: 42px; height: 5px; background: #d6402c; }
    h1 { max-width: 900px; margin: 0; font-size: 78px; line-height: 1.08; letter-spacing: -.055em; font-weight: 760; text-wrap: balance; }
    .subtitle { max-width: 760px; margin: 34px 0 0; color: #565852; font-size: 27px; line-height: 1.48; letter-spacing: -.015em; }
    .decision-map { align-self: stretch; border-left: 1px solid #aaa9a2; padding: 72px 0 56px 38px; display: grid; align-content: center; }
    .decision-map h2 { margin: 0 0 32px; color: #6d6f68; font-size: 13px; letter-spacing: .18em; text-transform: uppercase; }
    .decision-map ol { list-style: none; padding: 0; margin: 0; counter-reset: steps; }
    .decision-map li { counter-increment: steps; min-height: 68px; display: grid; grid-template-columns: 36px 1fr; align-items: start; gap: 16px; position: relative; font-size: 19px; font-weight: 700; }
    .decision-map li::before { content: '0' counter(steps); color: #d6402c; font: 800 13px/24px Arial, sans-serif; }
    .decision-map li::after { content: ''; position: absolute; left: 7px; top: 27px; bottom: 8px; width: 1px; background: #c9c7bf; }
    .decision-map li:last-child::after { display: none; }
    footer { display: grid; grid-template-columns: 8fr 4fr; gap: 54px; align-items: end; border-bottom: 12px solid #171917; padding-bottom: 16px; }
    footer .promise { font-size: 15px; font-weight: 700; letter-spacing: .06em; }
    footer .stamp { color: #6d6f68; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; }
  `,
  markup: (content) => `<main><header><span>${content.identity}</span><span class="theme">Executive Clear</span><span class="folio">01</span></header><section class="hero"><div class="copy"><p class="eyebrow">DECISION READY</p><h1>${content.title}</h1><p class="subtitle">${content.subtitle}</p></div><aside class="decision-map"><h2>Workflow / four moves</h2><ol><li>釐清需求</li><li>確認架構</li><li>選定風格</li><li>交付 HTML</li></ol></aside></section><footer><span class="promise">ASK → STRUCTURE → DESIGN → DELIVER</span><span class="stamp">Portable presentation system</span></footer></main>`,
};
