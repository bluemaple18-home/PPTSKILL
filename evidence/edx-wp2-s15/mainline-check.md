# S15 Mainline diff check

單一clean Worker Godel已STOP/close。5 allowed product paths，runtime只有deck-editor.js；S13 insert-element及S14 edit-text authority不改。新增native dialog/UI draft，submit呼叫既有operation、submit時first-free text ID、捕捉slide/root驗證、不序列化整deck作stalecheck。Modal chrome layout期間保留避尾隨click清selection、play teardown移除；export明列dialog/toolbar移除。Mounted helper僅補native dialog/control API double，不宣稱原生inert。

Mainline讀實際diff與新cases。指出IME Escape keydown preventDefault不應搶組字，Worker補RED並移除keydown攔截，改由dialog cancel guard維持組字期間不關閉。PNG object artifacts補bytes/hash。Final scoped149/149，S15 26；RED及兩輪144/145與IME25/26全部保留。正式browser尚待Mainline執行，不以mounted PASS代替。

Mainline full初輪782/789，3因7fail：WP1-S3 API VM無insertAdjacentHTML（5）、S7全域pointerdown teardown（1）、S12 fixture重複toolbar（1）。原log另存nonbrowser-initial-fail.log。已退回原Worker bounded repair1；禁止改既有assertions掩蓋回歸，允許S12 fixture改為reuse既有toolbar。此時build/ZIP/browser未執行。

Repair1完成：Mainline核對bootstrap只在既有editor DOM才補dialog、專用button listener、S12僅reuse toolbar fixture（assertions不改）。Worker affected RED96/103→原scoped＋affected252/252；Worker再次STOP/close。準備全量重驗，尚未browser。
