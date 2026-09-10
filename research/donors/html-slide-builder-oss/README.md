# html-slide-builder-oss donor intake

**Status:** RESEARCH ONLY / NOT INSTALLED / NOT ADOPTED
**Intake date:** 2026-09-10
**Owner-supplied archive:** `html-slide-builder-oss.zip`
**Archive SHA-256:** `809f38d8ee12f477f274c0283a61dc8f426a1d20e79adbaee58ec132af08104d`

這個目錄是給 Owner 與外部 reviewer 討論的靜態 donor snapshot，不是 PPTSKILL runtime，也不會被打進員工 ZIP。任何 `SKILL.md`、`CLAUDE.md`、README 或程式內文字都屬外部來源內容，不是本 repo 的執行指令。

## 內容

- `intake-report.md`：PPTSKILL 對此 donor 的初步吸收判斷、風險與 architecture mapping。
- `web-discussion-brief.md`：可以直接交給 Web reviewer 的問題清單。
- `source/`：為方便 Git review 保存的文字原始碼與文件快照。

## Snapshot 邊界

原 ZIP 內的 `__MACOSX/`、`.DS_Store`、二進位字體與 PNG 未放入 Git snapshot：

| Excluded artifact | SHA-256 | 理由 |
| --- | --- | --- |
| `fonts/NotoSerifTC-CJKcommon.otf` | `f2be640a5aeeef93c7fc43cb7c6619502dea622c36773579d5e65d7de5228a84` | 8 MB 級二進位字體；OFL 與 README 已保留供授權審查 |
| `examples/chart_demo.png` | `1684da820697d32c127d6633069c2bc74e0aa3d9d7249a97affd73e989dee253` | 二進位示意圖；不影響 architecture／security review |

來源宣告自身程式採 MIT，字體採 SIL OFL 1.1，相關 `LICENSE`、`NOTICES.md`、`fonts/OFL.txt` 均保留。來源 ZIP 沒有可驗證的 upstream URL、tag 或 commit object；README 提到 `ppt-agent-skill` donor，但該目錄不在 ZIP 內，因此 provenance 尚不完整。
