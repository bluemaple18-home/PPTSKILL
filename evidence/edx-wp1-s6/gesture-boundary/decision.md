# S6 最終 architecture validation

決策：S6研究收斂；採用「短生命editor-only geometry target＋vendor指定吸附邊」為S7實作架構。這是Mainline architecture decision，非production Independent GO。

48組fresh真pointer：2viewport×3static transform×drag/SE×negative/zero/multi/cancel。使用既有createComponentInteraction（toString注入fixture），canonical/executeOperation為測試替身；vendor候選轉成controller update的座標輸入，preview只改geometry target，並未串正式DeckSpec/export。

結果：preview全部0提交；negative與multi release各1筆，zero/cancel含release0筆。Multi為+10,+20,-10：drag最終(792,272,637,477)，SE最終(803,283,629,469)，與單次-10一致。24對viewport結果一致、presentation transform未改、每case proxy/control/overlay均0殘留。verify.mjs重播48組assertion，verification.json PASS。
Console/page/network/HTTP/remote全部0；targetClosed=true；Browser.close→supervisor exit0→root absent／marker absent。

first-receipt.json保留fixture重複destroy錯誤：teardown後引用未清，下次setup第二次destroy造成__CROACT__ TypeError；清空window.m後48組通過。這是fixture修正；production必須destroy一次並清引用，不宣稱vendor destroy可重複。

已足以停止泛化研究，轉S7實作。尚待production卡驗收：正式operation原子validator、visible target hit routing、真motion播放、safe-area/zero-return/cancel/stale、export cleanup/offline reopen、keyboard/IME guard、效能與ZIP。原S5 code5/ZIP及四untracked未改。
