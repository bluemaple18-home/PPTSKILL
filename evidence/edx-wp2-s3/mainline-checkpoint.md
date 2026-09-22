# EDX-WP2-S3 Mainline checkpoint

Status: NON_BROWSER_PASS / BROWSER_BLOCKED / NOT_REVIEW_CANDIDATE
Product initial: `645ee52b581767d33f91bdd059623f6971b831b4`
Current candidate (含三個 harness 修正): `c5897e81a79735f848f58e2c9ace04e4e769444b`
Branch: `codex/edx-wp2-s3-copy-font-size`

## 已完成

WP2-S2 已快轉合併並推送 main 與 S2 branch 至 `ed5b34ef357bf158dd1fbd379fda9156f23a1155`。S3 另開 branch，未 merge/push/deploy。

單一 clean-context Worker 完成 explicit fontSize 16–160 的 session copy-style/paste-style；title/subtitle only；paste 沿 set-typography，不新增 canonical authority、schema 或 dependency。clipboard 不寫入 DeckSpec/export；default/invalid copy 保留 snapshot；IME、current text target guards。

Worker scoped 59/59 PASS；full non-browser 初輪與最後各 441/441 PASS，不相加。ZIP lifecycle PASS；ZIP 2,287,435 bytes，SHA-256 `d8847ff6b72c6cb70d7f43d3e5372a0e75c7299a0cedad8fc9bf94128bbcdb4f`。source 9/9、protected 4/4 MATCH。後續三個 commit 只改 browser harness，runtime 與 ZIP 未變。

## Browser 實測與停損

所有四輪均為正式 AI Core host lifecycle，hostSandbox=null，readiness PASS；Browser.close/supervisor exit0，owned root absent、isolation marker absent、protected/source/ZIP 前後一致。

1. host-acceptance：1280×720 base 10 checks 後 FAIL；input 未全選，64 後插入88成為6488。未進入產品套用；PGQ未跑。
2. host-input-retry：使用 CDP selectAll 後前述步驟通過；跨頁 title pointer 命中 FAIL；PGQ未跑。
3. host-pointer-retry：加入最多60次雙frame命中等待，跨頁流程通過；12 checks 後 delete 可見尺寸 FAIL；PGQ未跑。
4. host-final：改在 layout 模式操作 delete，仍於同一 delete 可見尺寸 assertion FAIL。12 checks；尚未完成1280驗收、1600未開始、PGQ未跑。

不能以部分 checks 宣稱 browser PASS；連續兩輪 delete blocker 沒有前進，依停損規則停止 launch。尚無 rect/display/hidden/mode 的完整診斷，不能確定是產品 regression、模式切換行為或 harness 前置條件。先前「只在layout可用」是依CSS推論，尚未經live mode/rect證據確認。

下一步只針對 delete seam 收集 bounded 診斷：操作前後 editorMode、按鈕 hidden/disabled/computed display/rect、elementFromPoint、selected slide、layout session。確認後才修最小範圍，不直接重跑相同 harness。卡見 tasks/edx-wp2-s3-host-acceptance.md。

## Evidence 限制

IME 僅 synthetic CompositionEvent lifecycle，非原生 OS IME。獨立 Review 尚未開始。worker RED 與中間 fixture FAIL、所有browser FAIL完整保存；可讀log只去行尾空白，若有改動原bytes保存在 .gz 與 hash manifest。未清理四個protected untracked。
