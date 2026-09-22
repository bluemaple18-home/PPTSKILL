# S11 preflight

trace指向BACKLOG10.1 decision3/7/8、10.3 WP2、10.4 insert-element，dependencies S8/S9/S10均GO。CodeGraph查詢只回無關style/QA symbols，rg確認無drop/dragover handler；measured gap為既定拖入需求無入口。無新架構/依賴/授權模型；helper沿S10局部抽取，S9/S8 authority不變。前端addition/operate，重用現有toolbar/status，無新visual world。

正式browser CDP方法的files/dragOperationsMask/type依官方Input.pdl核對；experimental是否此Chrome可用以fresh host結果為準。https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl 。本卡不改AI Core；S8 I/O根因仍未知。
