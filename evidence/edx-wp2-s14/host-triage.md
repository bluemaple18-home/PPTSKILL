# S14 首輪 FAIL 與 bounded harness repair

host-acceptance：readiness0、base/S8/S13 63records PASS，S14既有/新增/crossslide API與IME/setter rollback assertions先通過；第一次建立真pointer gesture時gesturing=false。targetClosed、Browser.close/supervisor0、ownedroot/marker absent，source/protected/ZIP前後MATCH；PGQ未開始。

主線唯讀 source.html embedded DeckSpec確認portable geometryOverrides只有asset-first/asset-second，無portable-quote。component-interaction resolve使用getComponentGeometry，缺rect不能begin gesture；此為fixture precondition缺漏，尚不是S14產品更新失敗。既有base acceptance也須先用initialize-layout。

唯一修正tools/edx-wp2-s14-browser-cases：layout mode點quote再點既有initialize-layout，斷言canonical defaultBox 800/280/640/480，再沿原真pointer/noop/invalid/update/cancel assertions。未改runtime/tests/ZIP、未放寬assertion。一次harness修正後重驗，source新版manifest與初版分存；再失敗先停，不盲重試。
