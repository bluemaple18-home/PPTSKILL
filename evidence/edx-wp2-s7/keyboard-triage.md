# S7 native Enter harness triage

Root question：原生button Enter是否被產品攔截，或CDP送鍵不完整？首輪1280完成base10＋5次pointer-fit，Space變更已驗過，第二次Enter後canonical仍contain、expected cover，tools/edx-wp2-s7-browser-cases.mjs:57。console/page errors0，PGQ未開始，cleanup PASS。原FAIL完整保留host-acceptance。

假說1（優先）：CDP Enter keyDown缺text/unmodifiedText carriage return，未形成button activation。既有tools/edx-wp1-s7-browser-cases.mjs:47已補此欄位，S7新helper漏掉。Primary source https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/crInput.ts keydown同時送text及unmodifiedText；CDP Input.dispatchKeyEvent也把text分列。若補同一欄位後原preservation assertion通過，支持harness原因。
假說2：第二次Tab未聚焦cover；補明確activeElement assertion辨別。假說3：產品吞掉Enter；runtime沒有Enter handler，Space已PASS，仍由retry的trusted-click與fit assertion驗證，不能先宣稱排除。

裁決：CONTINUE，一次minimal harness修復；runtime/ZIP不改。主線直接修單檔與自驗，不新增Worker／review／repair線。保留首輪與original source freeze；retry使用同一正式controller，12秒deadline與capacity/cleanup不變。若同類再次失敗，停triage，不盲開下一輪。
