# WP2-S13 Independent Review Handoff

Status: INDEPENDENT_REVIEW_PENDING
Candidate: `9b7767d88411e9e9a14e72d011726d67f74371a6`
Runtime product: `d4d83ac5daeba30a861404dff78d401ca618c700`
Base: `18b1029c13444f6b40989f421098a9496ef7db0d`
Branch: codex/edx-wp2-s13-insert-text
Repo: `<repo-root>` = PPTSKILL-canonical

唯讀審查實體task／host卡、evidence/edx-wp2-s13/receipt.md與source-hashes.json；candidate→handoff只能control/evidence，不得有runtime/tests/tools/ZIP drift。禁止改candidate／ZIP／protected4，禁止merge/push/deploy／開S14。給GO或bounded finding與fresh可重現證據。

## 重點

insert-element精確oneOf text/image；text code-point1–500／不normalize／getter0／hidden／prototype／混搭；image與S9 non-enumerable File options保持舊契約。共用preflight/update、stable identities/collisions、canonical geometry、detached renderer安全escape與atomic append-before/after rollback、gesturecancel不提交preview、跨頁explicit identity／oldnodes／revision／selection。Node/portable descriptor一致；export offline重開還可layout／reinsert。S1保持text component不可directeditable，開卡最初假設已明確裁決，不把文字toolbar／nativeIME等列作本卡已交付。

## Fresh可重現

```sh
node --test tests/edx-wp2-s13-insert-text.test.mjs tests/edx-wp2-s8-insert-image.test.mjs tests/edx-wp2-s9-insert-image-file.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {spawnSync} from 'node:child_process'; const files=readFileSync('evidence/edx-wp2-s13/nonbrowser-files.txt','utf8').trim().split(/\r?\n/); process.exit(spawnSync(process.execPath,['--test',...files],{stdio:'inherit'}).status??1);"
git diff --check
```

Mainline83/83 scoped，734/734 full具名PASS。Source6/protected4/ZIP MATCH；ZIP 2,295,428 bytes、SHA256 `d6ffe2e65d16280ef0eea8d62eee6f6519a9e8e2ef2d02dd1cdab5bbcd8ba3cd`。不要為review重建ZIP；ZIP生命周期／archive runtime byte-match有獨立receipt。

## Browser與PGQ

最終正式host `evidence/edx-wp2-s13/host-harness-repair/`：兩viewport63records＝base10＋S8 image40＋S13 text13；errors0、targetClosed；PGQ單輪16；cleanup全PASS。逐record／artifacts hashes／screens在host-final-verification.json及acceptance.json。圖像長字串裁切／與舊文字重疊如實標在visual-check.md，不宣稱自動layout。

若review環境沒有managed attachment，只核對committed evidence並明示沒有fresh重跑browser/PGQ，禁止裸開Chrome。若fresh，須先對exact候選驗hash、正式managed lifecycle；不要修改AI Core/sensor或清除sandbox旗標。

歷史兩輪host FAIL完整保留：首輪I/O未知、checks0；retry1 Escape bubble observer漏收（60checks），只改harness capture再通過。Worker usage中斷／contract revision／21/22 serializer test／82/83S9 regression均在mainline-recovery及rawlogs，沒有洗成一次全綠。

輸出：reviewed完整SHA、P0-P3 counts、fresh tests與evidence-only清楚拆分；只有完成Independent GO後才回Mainline closure／整合。
