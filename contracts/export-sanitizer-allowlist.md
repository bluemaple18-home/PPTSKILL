# Portable Export Sanitizer Allowlist

`deck.html` 的 `script#deck-spec[type="application/json"]` 只能包含：

- Deck：`schemaVersion`、`deckId`、`title`、`language`、`style`、`slides`。
- StyleSpec：字體角色、palette roles、spacing、geometry、motion、asset treatment。
- Slide：`id`、`content`、`composition`。
- Content：`title`、`subtitle`、3～5 個 `keyPoints` 與支援的 `components`。
- Components：text、內嵌 data URI image、table、chart、明確標為 public 的 citation。
- CompositionSpec：`primitive`、`variant`、指向 content 的 `slots` 與可選 `order`。

所有未列欄位一律移除，包括 source 文件全文、Grill Me transcript、profile、local path、prompt、hidden reasoning、rejected draft、私有 notes、runtime/session ID。Sanitizer 採 allowlist，不採「猜敏感字串」的 denylist。

CompositionSpec 不得內嵌內容；所有 slot 只能引用 `content.*`。因此「換一個排版」可只替換 CompositionSpec，並保持 content hash 不變。
