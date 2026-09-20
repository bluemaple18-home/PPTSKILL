# EDX-WP1-S6 — 8px snap bounded integration spike

Status: COMPLETE — CONDITIONAL ADAPT / production snap pending
Base: 8dd76cc；branch codex/edx-wp1-s6-snap-spike。
traces_to: BACKLOG.md §10.1 guided direct manipulation／invisible snap grid、§10.2 prior-art-first、§10.3 WP1、§10.4 operation authority。
Dependencies：S3/S4/S4-PERF/S3-MOTION/S5均Independent GO，無未解blocking edge。trace preflight：references存在、單一ID、無新schema、驗證見下；無Critical。無取代。

## Frontier與界線

先判定 pinned Moveable snappable/snapGridWidth/Height 是否存在於既有離線bundle，以及本runtime raw pointer update是否會忽略vendor修正。這是新snap實作的必要authority mapping，不直接手刻通用primitive。
Prior Art：Moveable0.53.0 MIT（既有metadata／metafile／license）、donor8px grid reference。Classification候選ADAPT；不新增dependency、不更新版本、不吸收其他transform/history/multiselect。
Why Custom：只容許vendor結果到canonical1600×900 bounded operation的adapter；未量測前不實作quantizer。Bundle+Portable Cost：量測既有bundle/hash/input與能力，不自行增重。why_not_less：僅打開snappable不能證明raw pointer authority會採用snap；why_not_more：不需新schema或第二套geometry authority。

## 驗收

1. 核對pinned vendor source/types/bundle與license，列出snap事件payload與座標語意的來源行號。
2. 核對目前begin/update/finish、zoom換算、keyboard nudge，列出需要的唯一adapter seam。
3. 可執行bounded probe驗證vendor包含snap能力與現行raw pointer映射，不得把static/projection冒稱真browser；若尚未取得真browser snap evidence，決策只准conditional ADAPT／implementation pending，不能說snap已可用。
4. 決策列acceptance gaps、後續實作的測試矩陣、canonical authority、safe-area、modifier/focus/IME、gesture單次提交、export/cancel與雙viewport要求；bundle/ZIP/runtime均保持不變。

## 執行

standard唯讀spike；native clean Worker只唯讀查vendor能力/metadata，回報證據，禁修改repo/安裝/啟動browser/開agent。Mainline唯一writer，做control／probe／decision；派工繼承主對話模型（工具不可指定Terra，且規則禁止未經Owner自行override），不建立visible task。
停止：同類兩次無進展或第三次同blocker停止；不merge/push/deploy；結束為研究決策，非runtime feature GO。

## Decision

見 `evidence/edx-wp1-s6/decision.md`。既有vendor Snappable可保留；需真browser座標映射probe才能決定production adapter。Public controller probe4組PASS，vendor驗證PASS；production/runtime/ZIP均未改，沒有snap feature GO宣稱。

## Browser mapping follow-up

Owner「繼續」承接fixture-only frontier；主線直接執行一次性bounded harness。固定slide1600×900、container/snapContainer=slide、rootContainer=body；viewport1280×720/1600×900，off-grid(803,283,637,477)，grid0/8、drag/SE resize、identity/scale(.8)/translateY(20px)。收真CDP pointer與vendor beforeTranslate/translate/width/height/drag payload；不假設payload單位、不修改production/runtime/ZIP，不將synthetic transform視為實際motion suite。成功為採集完整且無console/page/network/HTTP/remote錯誤；mapping不符必須寫入決策。

Browser follow-up COMPLETE：24組採集PASS、errors0、cleanupPASS；直接payload映射REJECT，非runtime功能PASS。決策與限制：`evidence/edx-wp1-s6/browser-mapping/decision.md`。
