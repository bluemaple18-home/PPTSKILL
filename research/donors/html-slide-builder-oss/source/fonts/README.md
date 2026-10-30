# fonts/

| 檔案 | 大小 | 版控 | 來源 |
|------|------|------|------|
| `LXGWWenKaiTC-Regular.ttf` | 12MB | 否 | `build_deck.py` 的 `ensure_font()` 會在第一次 `--font wenkai` 時自動下載 |
| `NotoSerifTC-CJKcommon.otf` | 7.5MB | 是 | 已裁到常用 CJK 區段（21,696 字），**沒有下載來源**，必須留在版控裡 |

兩款皆為 SIL OFL 1.1，可商用、可內嵌。授權全文見 `fonts/OFL.txt`
（取自 notofonts/noto-cjk）。Noto Serif CJK **沒有宣告 Reserved Font Name**，
所以裁過的子集沿用原檔名不受 OFL 第 3 條限制。

子集化靠 `pyftsubset`（fonttools）：

```bash
pip install fonttools brotli
```
