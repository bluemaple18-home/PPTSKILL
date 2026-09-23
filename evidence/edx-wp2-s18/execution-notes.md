# S18 執行紀錄

接續既有 S18，未重開切片或另派 Worker。實際 branch codex/edx-wp2-s18-delete-element；HEAD/main/origin-main=e3b90a8969f6d25416e746feefecba718d8d8931。Goodall 為唯一 product writer，Mainline 僅準備驗收與核對。

驗收沿既有 host-controller。已讀目前 tmp-session lifecycle 更新：新增 host root-count/budget admission，不變更或規避；CODEX_SANDBOX=seatbelt，browser只使用原生允許的主機流程。

14檔 scoped、75檔 nonbrowser manifests 已核對實體存在及無重複；task/host卡在驗收前鎖定。

Mainline 在開發中mounted探針重現原卡同步reentry缺口：刪除text的node.remove內呼叫applyLocalPatch修改另一image alt，nested被接受，revisionDelta=2，canonicalAlt仍為成本探針、DOM alt為S18_REENTRY_PROBE。已把步驟和實測結果交回同一Worker，在原generation內修正既有入口guard並加regression；此診斷不等於固定candidate驗收，詳mainline-reentry-initial.json。

一次包含tmp目錄掃描的狀態工具被平台安全判定攔下；改為只查本卡已知檔案的bounded read，成功取得GREEN42，不改安全設定。

原生 close_agent 回報 Worker 前態 errored: stream disconnected；現已關閉。Mainline 接續原卡，沒有第二 writer。S2 exact operations 清單僅加入 delete-element literal，其餘 assertions 不變；原 FAIL logs 全部無損 gzip 封存，逐一 round-trip 與 hash 核對。

Mainline 完整測試首輪943/945：兩個FAIL來自 S3 Node/API VM 共用的 exact operations 舊清單，僅補delete-element literal；未改immutable/allowlist或權限assertions，runtime不變。原nonbrowser-mainline.tap無損封存為.tap.gz並核對round-trip/hash；原summary保留，結果仍FAIL。重測使用mainline-02獨立檔案，source8前後hash綁定。
