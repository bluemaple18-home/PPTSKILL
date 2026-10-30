# 出處與第三方授權

本專案自身採用 MIT，見 `LICENSE`。以下是它用到、或衍生自的第三方成果。

## 隨附的字體

`fonts/NotoSerifTC-CJKcommon.otf` 是 **Noto Serif TC 的子集版本**（裁到常用 CJK
區段），依 **SIL Open Font License 1.1** 釋出。

授權全文隨附在 `fonts/OFL.txt`（取自 notofonts/noto-cjk），符合 OFL 1.1 要求
「授權全文必須隨字體一起散布」。Noto Serif CJK 並**未宣告 Reserved Font Name**
（授權檔開頭沒有 `with Reserved Font Name` 那一行），因此第 3 條的改名限制不適用，
裁過的子集沿用原檔名沒有問題。

`LXGWWenKaiTC-Regular.ttf` 不在版控裡，`build_deck.py` 會在需要時下載；同為
SIL OFL 1.1。

## 執行期才下載的函式庫

編輯器在你第一次使用 Vanta 背景時才下載這些檔案；它們不在本 repo 內：

| 專案 | 授權 | 用途 |
|---|---|---|
| [Vanta.js](https://www.vantajs.com/) | 見上游 | 背景效果 |
| [three.js](https://threejs.org/) | MIT | 十二種效果的相依 |
| [p5.js](https://p5js.org/) | **LGPL-2.1** | TOPOLOGY / TRUNK 的相依 |

`slide_editor/static/editor.html` 裡的 `VANTA_SCHEMA` 參數表是從各效果自己的
`defaultOptions` 整理出來的，出處為 Vanta.js。

> **打包後的 deck 會把用到的函式庫內嵌進去。** 用了 TOPOLOGY 或 TRUNK 的 deck，
> 打包出來的單一 HTML 檔裡就含有 **LGPL 授權的 p5.js**。要散布那個檔案時，這件
> 事是你的責任，不是本工具的。

## 參考資料

- `references/chart-vocabulary.yaml` 整理自 **FT Visual Vocabulary**
  （Financial-Times/chart-doctor，MIT）。
