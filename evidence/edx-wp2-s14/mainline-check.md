# S14 Mainline 整合檢查

Worker Fermat僅六檔實作，已STOP/close。Worker把self-validated狀態稱REVIEW_CANDIDATE，主線此時僅視為等待正式驗收，不能提前宣稱Independent candidate/GO。

主線讀實際diff：S13與S14共用validateTextValue；edit-text envelope/target exact data descriptors，role原值政策不收緊；私有component type guard。Node分流保留clone/commit。Portable component API先validate candidate／唯一connected canonical DOM與純文字，變更時原地set textContent；before/after throw回復舊子節點、commit前不改spec/revision/gesture。same value回傳前仍驗identity，不呼叫setter；成功後一次revision、cancel/clear。S1 directUI不擴，S9File nonenumerable未改。

原WP1-S2 tests只修改已明訂擴張的component API正負向與descriptor，保留其他target及immutable負向。Worker RED 11/26pass與中間23/26均保留；中間修正是fixture citation public flag、Node subtitle既有schema政策，不是改產品讓fail消失。Final scoped122/122（新S14 29），Mainline全71explicit檔763/763、build/installedZIP lifecycle PASS；正式host另外驗，不拿mounted double代替。
