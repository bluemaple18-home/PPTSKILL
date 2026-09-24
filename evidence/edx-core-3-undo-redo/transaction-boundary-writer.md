# Core3 交易邊界 Writer receipt

起點：`65d6894c1e34d1d648d64512d81507401ad78879`，branch `codex/edx-core-3-undo-redo`。
授權：`tasks/edx-core-3-transaction-boundary-replan.md`，shared sequential 唯一 Writer。工作樹起始無 tracked 修改；四個 protected untracked 保留。程序列表因 sandbox 禁止，未宣稱程序層排他驗證。

## 改前事實／固定契約

- CodeGraph 已實際查詢 executeOperation／syncText／move／replayHistory／finish，回傳 generation-plan／style-candidates 無關符號；依已知 embedded closure 缺口使用 rg／原始碼 fallback。
- 呼叫邊界：Node createDeckEditor API、portable public API／DOM event、component interaction vendor gesture；僅修改 deck-editor、component-interaction 與 Core3 regression。
- 既有 authority 是 DeckSpec＋operation executor＋editor-history。不得新增 writer／history／scene graph。
- 固定反例源為 review-round-05-repro.mjs；新測試期待正確拒絕重入／完整 rollback。
- 可證偽假說：共同同步 owner 能拒絕 callback 的 public mutation，同時 private text sync／paste-style 可進既有 executor；preview 前 attribute checkpoint 能在 projector 連續失敗時提供獨立 bounded rollback。
- Mainline 精化：可 throw 的終態 controls/status 必須持 owner 完成；終態 rendering 與 finishing/mutation guard 分離，釋放後只 return。禁止回到「已提交卻向外報失敗」。
- 回退：明確路徑 commit，可由主線 git revert；不改歷史 evidence、ZIP、AI Core、不啟 browser／PGQ、不 merge／push／deploy。

## 最終實作與決策

- Node／portable 公開 mutation 先取得 closure-local owner，再讀 request；Undo／Redo 重入回 false，其餘 API 拒絕。public layout facade 不提供 private 呼叫權。
- 既有 executor 保留為 private 同步延伸：syncText、paste-style 與 layout 提交不經 public facade，也沒有 ambient allowNested。DeckSpec 與既有 history 仍是唯一 canonical／歷史來源。
- reorder 從 pending text 之前建立回退基線；component patch 在 text sync 後更新該操作的 checkpoint，保留既有 invalid patch 仍保存使用者文字的語意。syncText 換 spec 後重新解析 component patch 的 slide，避免操作舊引用。
- gesture 在 begin、首次 preview 之前記錄 target／group members／geometryTarget 的 style／geometry marker 與 controls；finish 全程維持 finishing。projector 故障後使用 attribute checkpoint bounded fallback，逐項驗證 DOM 身份、順序、文字、attributes、selection、mode、history controls／status；驗證失敗或驗證讀取拋錯均 fail-closed，後續公開 mutation／gesture 拒絕直到 remount。
- 最終 enabled controls 以 private rendering 參數呈現，真實 owner／finishing 未解除。可拋錯的 status／controls／vendor 收尾與 rollback 在 owner 內完成，釋放後只 return。第一次 finish identity read 亦已移入 owner。
- async asset adapter 在同步準備及完成段持 owner，不跨 await；完成時重驗 captured target，終態通知拋錯回退該次完成段。
- 純 viewport／pointer observation、composition flag、取消／blur 與 MutationObserver 使用既有 previewEvent 的 bounded entry guard；沒有全 spec／全 DOM snapshot。click／keydown 等實際寫入保留交易 checkpoint。未新增第二套 manager、history、writer 或 scene graph。
- 最少必要性：只改兩個 runtime 與直接覆蓋此邊界的 Core2／Core3 測試。既有 mounted helper 最終沒有改動；未吸收 ZIP、其他 runtime、AI Core、full suite 或 reviewer 工作。

## 測試 fault seam 調整授權與逐項紀錄

Mainline 在本 task 明示允許必要 Core2 測試調整，要求保留同等 after-effect 與回退斷言。public facade 分離後，原 public method monkeypatch 不再代表內部 projector，改接實際 DOM／vendor 接點：

1. Core2「refresh 已生效後拋錯」：改由 status.textContent setter 寫入「已鎖定」後拋出同一原始 error，確認一次觸發；保留 canonical、revision、selection、target、舊 vendor destroyed／新 vendor 可用與 group handler 斷言。
2. Core2「rollback 投影再拋錯」：同一 status after-effect fault 加 Moveable.on 完成 resizeGroupEnd handler 註冊後的第二次 fault；確認兩處確實觸發，保留原始 error 身份與 canonical／selection／target／vendor 復原斷言。
3. Core3「direct patch selection cleanup」：Selecto.setSelectedTargets([]) 寫入後拋錯；保留 throws、canonical／revision、原 node 身份與 selection 斷言。
4. Core3「reorder／replay fault」：reorder insertBefore fault 不變；replay 改由 Selecto.setSelectedTargets([]) after-effect 拋錯，保留原錯誤、selection 與 target 復原斷言。

沒有移除 throws、改 expected 來掩蓋失敗，亦沒有以 helper 繞過產品的 public guard。

## 實測紀錄

- `transaction-boundary-red.log`：原始四個正確行為 regression，0/4、四項均因指定缺陷失敗。
- `transaction-boundary-focused-01.log`：首次程式組裝的括號 syntax error，屬實作中間錯誤，非合格 RED；修正後 focused-02 為 4/4。
- `transaction-boundary-core-01.log`：45/54；core-02 為 54/58，剩四項是舊 fault injection 接縫；core-03 為 64/64。
- `transaction-boundary-focused-03.log`：7/10，含新測試 payload／typography 欄位假設修正與 patch 舊 slide 引用；focused-04 為 Core3＋S4 67/67，focused-05 為 12/12。
- `transaction-boundary-identity-red.log`：finish 的第一次 identity read 曾在 owner 前，最小正確行為 regression 失敗；移入 owner 後由最終測試證明關閉。
- `transaction-boundary-observation-red.log`：scroll／resize／pointerdown 的全量 snapshot 成本三項 RED；切至 bounded entry guard 後，8 MiB payload probe 三條路徑 payloadReads=0、wholeSpecSerializations=0。
- **最終 `transaction-boundary-final.log`：96/96，exit 0。** 指令：`node --test --test-concurrency=1 tests/edx-core-2-group-lock.test.mjs tests/edx-core-3-undo-redo.test.mjs tests/edx-core-3-transaction-boundary.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s4-interaction.test.mjs`。
- 最終覆蓋：正常 group drag／resize、reorder pending text、Node／portable paste-style、undo／redo、public operation／patch／selection／mode／export／async 重入、單／雙 projector fault、fallback 失敗 fail-closed、最後 controls/status fault、失敗後可再次操作與純 observation 大 payload 成本。
- `transaction-boundary-protected-before.sha256`／`transaction-boundary-protected-after.sha256` 相同；`transaction-boundary-protected-check.log` 四項 OK。

## 交付邊界／疑慮

狀態：`WRITER_SCOPED_GREEN / MAINLINE_REVIEW_PENDING`。這是 Node 與 mounted synthetic 證據，不是 browser 或正式 vendor pointer 證據，不宣稱產品／ZIP GO。full non-browser、ZIP lifecycle／byte-match、固定 commit 雙盲 review 由主線接手；原產品 NO-GO 歷史保留。唯一 Writer 期間未觀察到外來 tracked 變更，四個 protected untracked 保持未追蹤。

提交前 staged diff check 發現 Node test reporter 的空白行含尾端空白；僅將本輪四份 log 的行尾空白正規化，斷言、錯誤、數量與時間原樣保留。
