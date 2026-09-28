# R2 canonical 已整合；Core3 驗收執行器 NO_GO

日期：2026-09-28。Mainline 為本 Codex task；Owner 明示「那做吧」後已執行整合，沒有轉交完整 Mainline 責任。

## 已完成

- AI Core canonical 從 c23e46555b73a29f16319c657622acb1acc51e7a cherry-pick 已審 R2 4edd0747a25b13920b3ab1ead99895a99dbe8964，成為 **28cad2d3beaaf32de2f62d0c08396aaba789ea01**。
- delta 精確 scanner／tests／docs 三檔，reviewed bytes 相同；正式環境 fresh scanner **33/33 PASS**。launcher、sensor、policy 及原 untracked 不變。整合證據見 `observer-r2-integration-verification.json`、`observer-r2-canonical-regression.log`；PPT checkpoint **e24eeb6a7f91aac185cabbd896e38ce49b85d741**。
- 新 controller 沿用既有 browser lifecycle、observer 與 canonical process-group APIs。Worker offline 21/21，Mainline fresh 21/21，A/B 各自 fresh 21/21。這些通過不代表 host readiness；兩名獨立 reviewer 的定向反例抓到下列 P1。

## 阻擋與裁決

1. **中斷訊號競態**：child 退出邊界收到 SIGTERM，exit 0／group 收斂時沒有保留停止原因，仍可啟動 PGQ。A/B 各自離線重現；沒有發真訊號或啟動真產品。
2. **共用 tmp 的程序歸屬不完整**：產品以另一個 session/group 執行，共用 browser owned root/tmp；產品未收斂或 anchor 未成立，外層仍呼叫可能清 root 的 supervisor 收尾。A/B 各自 full-flow mock 重現。實測證明調度缺口，未宣稱發生真 host 刪除事故。

主線另讀 canonical 實際呼叫鏈：`run_child` 的 runtime failure／TTL 可停止 browser group，`command_run` 在 operation_complete 後會呼叫 `cleanup`；其範圍沒有外部產品 group。`preserve_unknown_isolation` 不提供外部 cleanup inhibit。故即使修掉 controller 的顯式 finish 呼叫，仍不能防止 supervisor 自動收尾與外部 writer 競態。B 與原 Worker 另行唯讀確認此結論。

**controller／host execution readiness：NO_GO。** manifest 保持 `PREPARED_PENDING_MAINLINE_FINAL`；凍結三檔原 bytes，不做沒有完整解法的 signal 單項修補。這不是 scanner 缺陷或已消耗的新 R2 host smoke，不觸發也不開 R3；canonical 整合驗證已通過，沒有理由回退該整合。不得藉此修改 scanner、提高 ceiling、移至 unmanaged TMP、建立另一套 launcher/supervisor 或偽造 cleanup PASS。

後續須先裁決**所有共用 tmp 寫入程序由誰統一管理、何時能證明全部停止、何者才可清理**，再決定既有執行接點的最小改動。此裁決尚未完成，本輪沒有自動擴充 runtime。

## 最終狀態與證據

| 項目 | 狀態 |
| --- | --- |
| R2 採用／canonical | GO／INTEGRATED_VERIFIED，28cad2d3 |
| 歷史 R2 host applicability | PASS／RECOVERY_NOT_OBSERVED，引用原 smoke，不重跑 |
| 新產品驗收 controller | A NO_GO／B NO_GO，兩項 P1 |
| 本輪 browser／PGQ | NOT_RUN；host-acceptance-r2 目錄未建立 |
| Core3 | CODE_GO／ACCEPTANCE_EXECUTION_OWNERSHIP_BLOCKED／WHOLE_CARD_NOT_CLOSED，核心2/6 |
| 產品身分 | 75 source、4 protected、ZIP 再次核對 MATCH |

ZIP 2,329,758 bytes，SHA256 `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`。未新增本輪 browser 程序或 owned tmp root；isolation marker 不存在是未啟動證據，不冒稱本輪 cleanup 成功。原四個 untracked 保留；未 push／deploy、未 merge PPT 產品、未開 Core4。既有 Crop F2/P2 仍 OPEN。

固定 SHA、產品核對及未啟動證據：`host-controller-r2-mainline-verification.json`。兩份 blind review：`host-controller-r2-review-a.md`、`host-controller-r2-review-b.md`；各自 probes、JSON／log 同前綴。B probes 的 2/2 通過代表缺陷被成功重現，不是修復成功。A 同樣保留 signal／nonconvergence 兩反例。原 controller／test／manifest 均保留，供獨立重播。
