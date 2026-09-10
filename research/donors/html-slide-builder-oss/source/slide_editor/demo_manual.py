# -*- coding: utf-8 -*-
"""投影片 live demo 用的「工具說明書」樣本。

有一頁在講：每一輪對話都要重讀一次 system prompt 與 tools，使用者還沒開口，
這筆錢就已經花掉了。示範就是把這件事**實際量出來**。

放在伺服器端而不是投影片裡，有兩個理由：
  1. 這份說明書有好幾千 token，塞進 slide HTML 會讓檔案膨脹，而且打包後每一份
     deck 都要背著它。
  2. 投影片只需要拿到數字，不需要知道說明書長什麼樣。

內容是「一間有在用內部系統的公司」會長出來的樣子 —— CRM、訂單、退款、發票、
庫存、物流、工單、報表、總帳。不是真實系統，但形狀是真的。
"""
from __future__ import annotations

SYSTEM = (
    "你是公司內部的 AI 助理。回答時務必遵守下列規範："
    "一律使用繁體中文；引用資料時附上來源系統與時間；涉及個資的欄位需遮罩；"
    "金額一律標示幣別；不確定時明說不確定，不要臆測。"
) * 8

_TOOLS = [
    ("crm_search_customer", "依姓名、電話、email 或客戶編號搜尋 CRM 中的客戶主檔"),
    ("crm_get_customer", "取得單一客戶的完整主檔，含聯絡方式、標籤與生命週期階段"),
    ("order_list", "列出指定期間內的訂單，可依狀態、通路、金額區間篩選"),
    ("order_detail", "取得單筆訂單的品項、折扣、稅額與出貨紀錄"),
    ("refund_list", "列出退款單，可依期間、原因碼、處理狀態、金額篩選"),
    ("refund_detail", "取得單筆退款的原因、審核紀錄與退款方式"),
    ("invoice_lookup", "依發票號碼或訂單編號查詢電子發票開立與作廢狀態"),
    ("inventory_check", "查詢指定 SKU 在各倉庫的可用庫存與在途數量"),
    ("shipment_track", "以物流單號查詢配送狀態與歷程"),
    ("ticket_search", "搜尋客服工單，可依關鍵字、優先級、負責人篩選"),
    ("report_run", "執行預先定義的報表並回傳彙總結果"),
    ("finance_ledger", "查詢總帳科目餘額與傳票明細"),
]

_TAIL = ("。使用前請先確認使用者的查詢期間與範圍；若參數不足，請向使用者澄清而不是"
         "猜測。回傳欄位可能包含個資，輸出時需依規範遮罩。此工具僅供內部查詢使用，"
         "不得用於外部揭露。")

TOOLS = [{
    "name": name,
    "description": desc + _TAIL,
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "查詢關鍵字或識別碼"},
            "start_date": {"type": "string", "description": "起始日期，格式 YYYY-MM-DD"},
            "end_date": {"type": "string", "description": "結束日期，格式 YYYY-MM-DD"},
            "status": {"type": "string",
                       "enum": ["pending", "approved", "rejected", "done"],
                       "description": "狀態篩選"},
            "limit": {"type": "integer", "description": "最多回傳幾筆，預設 20，上限 200"},
        },
        "required": ["query"],
    },
} for name, desc in _TOOLS]

# 這一頁的成本試算用的模型。價格是輸入 $/1M token —— 只算輸入，因為這一頁講的
# 就是「使用者還沒開口就花掉的錢」，跟模型生成多少字無關。
MODEL = "claude-opus-5"
INPUT_USD_PER_MTOK = 5.0
CACHE_READ_RATIO = 0.1     # 快取命中約為原價一成（官方定價，不是估的）

# 曾經有第三條「需要時再去查」，用 defer_loading + tool search，已經拿掉。
# 實測（/v1/messages，不是 count_tokens —— 那個端點不收 server tool）：
#   全部工具塞進去              input 5,327
#   defer_loading + tool search input 5,675   ← 反而多 348
# 這份說明書的重量幾乎都在工具的**描述文字**，不在 schema；defer 只藏得住 schema，
# 名稱與描述還是得送出去給搜尋用，再加上搜尋工具本身的成本，就變成倒賺。
# defer_loading 要在「工具很多」或「schema 很大」時才划算，12 支這種形狀不適用。
