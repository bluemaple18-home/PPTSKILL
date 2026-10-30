# Host04 resize handle 遮擋

runtime/ZIP仍2bb1aaf，81fd409只增原生vendor事件wrapper與hit-test觀测，原assertions不變。1280真marquee/group/drag/preview export通過；resize仍未改canonical。

實體native gesture diagnostic：目標se handle為14×14、center(640,424)，elementFromPoint為DIV class=moveable-line moveable-direction，未命中se control。trace沒有resizeGroupStart/update/end，沒有console/page errors；故不是已證實的geometry演算法錯誤。截圖circle可見但被子Moveable線遮住。

Pinned react-moveable0.56.0 types明示hideChildMoveableDefaultLines可隱藏群組子Moveable邊線，預設false。下一個bounded產品修復擬採group-only既有選項，不加CSS pointer engine，不換vendor、不放寬assertion。Reviewer仍審固定2bb，主線先等CODE findings再一次修復。

host04仍NOT_PASS；Browser.close/supervisor0、11scans0I/O、owned root／marker absent。PGQ未啟動。這是不同於前兩輪CSS工具列的第二個已定位UI阻斷；禁止未修復原問題就直接同樣重播。
