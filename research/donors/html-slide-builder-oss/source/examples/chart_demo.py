# -*- coding: utf-8 -*-
"""建置時產生 inline SVG 圖表 — 示範「編輯級視覺」不需要圖表函式庫。

配色經 dataviz validator 驗證（surface #efe9de, ordinal ramp 全數 PASS）：
    #c096a0  #b07f8c  #9c6878  #855263  #6b3d4e
"""
import pathlib

W, H = 1280, 720
SURFACE = "#efe9de"
INK, INK_SOFT, INK_LIGHT, HAIR = "#2c2826", "#4a423d", "#7a6f66", "rgba(44,40,38,0.16)"
RAMP_LIGHT, RAMP_DARK = "#c096a0", "#6b3d4e"          # 驗證過的同色相兩端
MUTED = "#a9a094"

DATA = [  # (產品線, 前季, 本季)
    ("影音廣告",  182, 214),
    ("原生廣告",  156, 188),
    ("開屏廣告",  240, 268),
    ("關鍵字",    98, 121),
    ("聯播網",    134, 165),
    ("社群",      112, 149),
    ("EDM",       76,  94),
    ("重定向",    168, 121),   # 唯一下降的
]

TITLE = "八條產品線裡，只有重定向把單次轉換成本壓下來"
SUB = "每一條線是一個產品線 · 左端前季、右端本季 · 單位 NT$／轉換"
SOURCE = "資料來源：內部成效報表 · 2026 Q2 → Q3"

# 版面
L, R, T, B = 210, 150, 232, 96
plot_w, plot_h = W - L - R, H - T - B
vals = [v for _, a, b in DATA for v in (a, b)]
lo, hi = 60, 290
x = lambda v: L + (v - lo) / (hi - lo) * plot_w
rows = len(DATA)
step = plot_h / rows
y = lambda i: T + step * i + step / 2

p = []
add = p.append
add(f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" '
    f'font-family="\'DeckCJK\',\'Noto Serif CJK TC\',serif">')
add(f'<rect width="{W}" height="{H}" fill="{SURFACE}"/>')

# 標題區 — 標題寫結論，不寫題目
add(f'<text x="{L-130}" y="86" font-size="30" font-weight="500" fill="{INK}" '
    f'letter-spacing="1.6">{TITLE}</text>')
add(f'<text x="{L-130}" y="122" font-size="13.5" fill="{INK_LIGHT}" letter-spacing="0.6">{SUB}</text>')
add(f'<line x1="{L-130}" y1="152" x2="{W-70}" y2="152" stroke="{HAIR}" stroke-width="1"/>')

# 座標軸刻度 — 細髮絲線，退到背景
for v in (100, 150, 200, 250):
    add(f'<line x1="{x(v):.1f}" y1="{T-14}" x2="{x(v):.1f}" y2="{T+plot_h+6}" '
        f'stroke="{HAIR}" stroke-width="1"/>')
    add(f'<text x="{x(v):.1f}" y="{T-24}" font-size="10.5" fill="{INK_LIGHT}" '
        f'text-anchor="middle" letter-spacing="1.4">{v}</text>')

for i, (name, a, b) in enumerate(DATA):
    yy = y(i)
    improved = b < a
    add(f'<text x="{L-26}" y="{yy+4.5:.1f}" font-size="14" fill="{INK_SOFT}" '
        f'text-anchor="end" letter-spacing="1.2">{name}</text>')
    # 連接線 2px
    add(f'<line x1="{x(a):.1f}" y1="{yy:.1f}" x2="{x(b):.1f}" y2="{yy:.1f}" '
        f'stroke="{RAMP_DARK if improved else MUTED}" stroke-width="2" '
        f'stroke-linecap="round" opacity="{1 if improved else 0.5}"/>')
    # 端點：>=8px，2px surface ring
    add(f'<circle cx="{x(a):.1f}" cy="{yy:.1f}" r="5" fill="{RAMP_LIGHT}" '
        f'stroke="{SURFACE}" stroke-width="2"/>')
    add(f'<circle cx="{x(b):.1f}" cy="{yy:.1f}" r="5.5" fill="{RAMP_DARK if improved else MUTED}" '
        f'stroke="{SURFACE}" stroke-width="2"/>')
    # 只標重點那一條，不是每一點都標
    if improved:
        add(f'<text x="{x(b)-14:.1f}" y="{yy+4.5:.1f}" font-size="13" font-weight="600" '
            f'fill="{INK}" text-anchor="end" letter-spacing="0.6">−28%</text>')

# 兩端一次性標示，取代圖例
first_y = y(0)
add(f'<text x="{x(DATA[0][1]):.1f}" y="{first_y-18:.1f}" font-size="10.5" fill="{INK_LIGHT}" '
    f'text-anchor="middle" letter-spacing="1.4">前季</text>')
add(f'<text x="{x(DATA[0][2]):.1f}" y="{first_y-18:.1f}" font-size="10.5" fill="{INK_LIGHT}" '
    f'text-anchor="middle" letter-spacing="1.4">本季</text>')

# 註記 — 編輯級圖表的重點在說明，不在裝飾
ry = y(7)
add(f'<line x1="{x(121)+40:.1f}" y1="{ry:.1f}" x2="{W-150}" y2="{ry:.1f}" '
    f'stroke="{HAIR}" stroke-width="1"/>')
add(f'<text x="{W-144}" y="{ry-6:.1f}" font-size="12" fill="{INK_SOFT}" letter-spacing="0.6">頻次上限</text>')
add(f'<text x="{W-144}" y="{ry+12:.1f}" font-size="12" fill="{INK_SOFT}" letter-spacing="0.6">從 8 降到 3</text>')

add(f'<line x1="{L-130}" y1="{H-62}" x2="{W-70}" y2="{H-62}" stroke="{HAIR}" stroke-width="1"/>')
add(f'<text x="{L-130}" y="{H-40}" font-size="10.5" fill="{INK_LIGHT}" letter-spacing="1.4">{SOURCE}</text>')
add('</svg>')

svg = "\n".join(p)
pathlib.Path("chart_demo.html").write_text(
    f'<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><style>'
    f'html,body{{width:{W}px;height:{H}px;margin:0;overflow:hidden}}</style></head>'
    f'<body>{svg}</body></html>', encoding="utf-8")
print(f"chart_demo.html  |  SVG payload {len(svg)/1024:.1f} KB  |  runtime JS: none")
