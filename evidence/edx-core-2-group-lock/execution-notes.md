# Core2 執行紀錄

Base a3fd195；單一工作樹codex/edx-core-2-group-lock。開卡時source/ZIP及protected4綁定baseline.json。

Worker Turing（01a0d0ce-87bc-7b71-80df-0173da27818d）首個checkpoint：19筆exec已結束，18成功／1讀取exit1，零delivery／零tests；停在重複前置讀取，不是已證實的連線或模型故障。Mainline要求原線resume先做RED，之後關閉該agent；close回previous_status=running，wait回not_found。關閉後發現初始focused test，保留並承接，不能把此前零修改checkpoint當作最後檔案狀態。

首次Mainlineclose請求曾被工具安全檢查阻擋；後續先取得completed checkpoint並resume，狀態改變後才再次close成功。沒有改用kill或平行寫入繞過。未merge/push/deploy，未啟browser；沒有Independent GO。

## 2026-09-24 新接手實作

實際重播handoff focused為10/10；CodeGraph仍只回無關symbols，採bounded rg讀既有interaction/selection/operation，不重新研究架構。沿既有Mainline唯一writer裁決，未建立新Worker。新增6個mounted cases後16/16；再加locked mutation table、partial projection throw/reentry、pending gesture/dialog，與原operation compatibility合計44/44。

保留本輪中間FAIL：首次UI guard插入點錯誤造成selectedImageTarget未初始化變數，當輪立即修正；mounted RED initially對selection順序作錯誤假設，改依既有canonical排序按成員set比對；之後14/16抓到locked click被transform resolve擋掉，改可選清單判定後16/16。新增fault probe原注入style attribute未經實際projector，改注入canonical geometry marker；reset-image-crop fixture補既有confirm:true。沒有放寬鎖定或原子性assertions。

full第一輪985/988，3FAIL均舊exact descriptor清單少6個本卡operation；按契約只補literal。第二輪full、ZIP、browser與Review尚待實際gate結果；不提前宣稱Independent GO。
