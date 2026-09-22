# S8 主線前置核對

目前root question：把已review S7整合後，補最小image insert operation閉環。S7 remote main/branch 74d63cc確認完成；四protected沿source-hashes紀錄保護。
Measured gap：DeckSpec已有image／geometryOverrides，full-deck-renderer renderSlide會append non-slot canonical geometry components；既有executeOperation無insert-element。故reuse既有asset/geometry/identity/render，不新增schema/vendor或UI。
Critical invariants：明示stable component ID，duplicate拒絕；比較既有resolved IDs防collision改名；target slide唯一DOM root；既有node identity及slot內容保留；DOM append前/後throw rollback；invalid不取消gesture，成功一筆revision並取消preview。
Full selection沿S7的64個nonbrowser檔追加S8新檔；四支browser PGQ另列串行。host controller不改AI Core閘門，source freeze前不執行。
