# Publication Safety

`pnpm qa:public` 是公開面 deterministic guard。`pnpm test` 也會自動執行同一 guard 的 repository acceptance test。

目前檢查：

- 真實 user home path 與 machine-specific temp path；
- private internal-tooling 名稱／實作細節；
- raw evidence logs／session metadata；
- high-signal credentials／private key patterns；
- 已知私人品牌素材與 33 筆 Golden raw reference removal evidence 的 SHA-256 identity；rename、未知副檔名、nested path 與 data URI 不改變判定；
- 公開 Company Style asset 必須符合 guard 內已審核的 synthetic fixture digest；
- 根目錄必須保留 `LICENSE`；`THIRD_PARTY_NOTICES.md` 對目前 bundled runtime matrix 做 exact component/version/license/evidence validation；
- `.DS_Store`、`.codegraph/`、本機 `CLAUDE.md`／`HANDOFF-*` 等不應進公開 tree 的檔案。

測試 fixture 可使用 synthetic path。Guard 只輸出 finding 類型與檔案路徑，不輸出可能的 secret value。

本 guard 只檢查目前 tracked/index public surface，不掃 Git history；history sanitation 留到申請前最後階段。
