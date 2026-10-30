# Mainline fixture preflight repair

主線對S10 runner --fixture-only做實際preflight，原版exit1／renderFullDeck FAIL，還沒啟動browser。無圖fixture沿portable clone刪除components，但仍保留component-focus/quote-monument及component slot指向portable-quote；直接診斷errors為「insert-empty 的 slot 指向不存在的 component：portable-quote」。

最小修補僅runner無圖fixture：使用既有title-points/default與title/subtitle/points slots，仍然components空陣列，不創造新圖或弱化斷言。runtime、S8/S9契約與已build ZIP不改。原fixture-preflight.log保留。改後fixture-only重驗為同一路徑，與未啟browser事實分開；source hash freeze需包含主線這一小段harness修正。
