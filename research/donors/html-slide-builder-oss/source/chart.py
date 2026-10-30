# -*- coding: utf-8 -*-
"""chart.py — 產生內嵌 SVG 圖表。不依賴任何圖表函式庫。

    import chart
    svg = chart.render("lollipop", [("重定向", 121), ("EDM", 94)], highlight="重定向")

回傳一段 `<svg>…</svg>` 字串，可以直接插進投影片的 HTML。

三個設計前提：

1. **顏色走 CSS 變數，不寫死。** mocha 叫 `--ink-primary`、glass 叫 `--ink`，
   所以用巢狀 var() fallback：`--chart-*`（可覆寫）→ mocha 的名字 → glass 的名字
   → 字面值。同一張圖丟進不同 theme 會自己變色，丟進沒有 theme 的頁面也不會壞。

2. **字體用 `var(--body-font)`。** build_deck.py 打包時只改寫這幾個變數，不會動
   元素上的 font-family；寫死字體名稱的圖，匯出後中文會掉字。

3. **標題／副標／出處不在 SVG 裡。** 那些是投影片上獨立的文字元素，
   在編輯器裡可以直接雙擊修改、用 TYPE 面板改樣式。SVG 只負責繪圖區本身。

配色只有「強調式」：被 highlight 指到的一筆用重色，其餘一律中性灰。
不做多色類別配色 —— 暖色近單色的 palette 撐不住多類別（相鄰色差低於可辨識門檻），
這類編輯風格圖表本來就靠形狀與註記區分，不靠色相。
"""
from __future__ import annotations

import html
import unicodedata

__all__ = ["render", "FORMS", "suggest", "families", "vocabulary"]

FORMS = ("slope", "line", "column", "bar", "ordered_bar", "lollipop",
         "diverging_bar", "stacked_column", "bullet")

# --------------------------------------------------------------------- tokens
# 巢狀 fallback：自訂 → mocha → glass → 字面值
T = {
    "ink":       "var(--chart-ink, var(--ink-primary, var(--ink, #221008)))",
    "ink_soft":  "var(--chart-ink-soft, var(--ink-soft, var(--ink-2, #463429)))",
    "ink_light": "var(--chart-ink-light, var(--ink-light, var(--ink-3, #6b5a4d)))",
    "hairline":  "var(--chart-hairline, var(--hairline, var(--edge-2, rgba(34,16,8,.14))))",
    "surface":   "var(--chart-surface, var(--paper, #f3ebde))",
    "accent":    "var(--chart-accent, var(--brick, var(--hot, #c1502e)))",
    "muted":     "var(--chart-muted, var(--ink-faint, var(--ink-4, #b09a86)))",
    "font":      "var(--body-font, Georgia, serif)",
    "label":     "var(--label-font, -apple-system, sans-serif)",
}

# 記號規格（照 CHART_BRIEF，不要隨手調）
BAR_MAX = 24        # 長條最粗 24px
DOT_R = 4.5         # 端點圓半徑
LINE_W = 2
HAIR_W = 1

FS_LABEL = 13       # 類別名稱
FS_VALUE = 13       # 數值
FS_AXIS = 11        # 軸刻度


def _esc(s) -> str:
    return html.escape(str(s), quote=True)


def _text_w(s: str, size: float) -> float:
    """粗估文字寬度。CJK 與全形算一個字寬，其餘算半個。

    沒有字體度量可用，但只要估得夠準就能決定留多寬的標籤欄位，
    避免中文標籤被裁掉 —— 寧可多留一點也不要切字。
    """
    w = 0.0
    for ch in str(s):
        w += 1.0 if unicodedata.east_asian_width(ch) in ("W", "F", "A") else 0.5
    return w * size


def _nice_ticks(lo: float, hi: float, count: int = 4):
    """挑好看的刻度值。"""
    if hi <= lo:
        hi = lo + 1
    raw = (hi - lo) / count
    mag = 10 ** (len(str(int(abs(raw)))) - 1) if abs(raw) >= 1 else 0.1
    for m in (1, 2, 2.5, 5, 10):
        step = mag * m
        if step >= raw:
            break
    start = (int(lo / step)) * step
    ticks = []
    v = start
    while v <= hi + step * 0.001:
        if v >= lo - step * 0.001:
            ticks.append(round(v, 6))
        v += step
    return ticks


def _decollide(ys, min_gap, lo, hi):
    """把重疊的標籤沿著 Y 軸推開。

    坡度圖的標籤畫在資料點的高度上，值一接近標籤就會疊在一起 —— 疊字比裁字更糟。
    這裡先由上而下推開，再由下而上收回邊界，維持原本的順序。
    回傳與輸入等長的新 Y 座標。
    """
    order = sorted(range(len(ys)), key=lambda i: ys[i])
    out = list(ys)
    prev = None
    for i in order:                      # 由上往下：不夠遠就往下推
        if prev is not None and out[i] - prev < min_gap:
            out[i] = prev + min_gap
        prev = out[i]
    over = out[order[-1]] - hi if order else 0
    if over > 0:                         # 推爆下界就整體上移，再往上收一次
        for i in order:
            out[i] -= over
        prev = None
        for i in reversed(order):
            if prev is not None and prev - out[i] < min_gap:
                out[i] = prev - min_gap
            prev = out[i]
        if out[order[0]] < lo:
            shift = lo - out[order[0]]
            for i in order:
                out[i] += shift
    return out


def _fmt(v: float) -> str:
    if v == int(v):
        return str(int(v))
    return f"{v:.1f}"


class _Canvas:
    """收集 SVG 片段。所有繪圖函式共用同一套字體與顏色設定。"""

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.parts = []

    def add(self, s: str):
        self.parts.append(s)

    def text(self, x, y, s, size=FS_LABEL, fill=None, anchor="start",
             weight=None, font=None, opacity=None):
        attrs = [f'x="{x:.1f}"', f'y="{y:.1f}"',
                 f'font-size="{size}"', f'fill="{fill or T["ink_soft"]}"']
        if anchor != "start":
            attrs.append(f'text-anchor="{anchor}"')
        if weight:
            attrs.append(f'font-weight="{weight}"')
        if font:
            attrs.append(f'font-family="{font}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<text {" ".join(attrs)}>{_esc(s)}</text>')

    def line(self, x1, y1, x2, y2, stroke=None, width=HAIR_W, cap=None):
        a = [f'x1="{x1:.1f}"', f'y1="{y1:.1f}"', f'x2="{x2:.1f}"', f'y2="{y2:.1f}"',
             f'stroke="{stroke or T["hairline"]}"', f'stroke-width="{width}"']
        if cap:
            a.append(f'stroke-linecap="{cap}"')
        self.add(f'<line {" ".join(a)}/>')

    def rect(self, x, y, w, h, fill, rx=0):
        r = f' rx="{rx}"' if rx else ""
        self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{max(w,0):.1f}" '
                 f'height="{max(h,0):.1f}" fill="{fill}"{r}/>')

    def dot(self, cx, cy, fill, r=DOT_R, ring=True):
        # 端點圓加 surface 色描邊，兩點靠近或重疊時才分得出來
        s = f' stroke="{T["surface"]}" stroke-width="2"' if ring else ""
        self.add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{fill}"{s}/>')

    def out(self) -> str:
        return (f'<svg width="{self.w}" height="{self.h}" '
                f'viewBox="0 0 {self.w} {self.h}" xmlns="http://www.w3.org/2000/svg" '
                f'font-family="{T["font"]}" role="img">'
                + "".join(self.parts) + "</svg>")


def _colors(labels, highlight, color):
    """強調式配色：重點那一筆用重色，其餘中性。"""
    strong = T["accent"] if color == "accent" else T["ink"]
    if highlight is None:
        return {k: strong for k in labels}
    return {k: (strong if k == highlight else T["muted"]) for k in labels}


# ------------------------------------------------------------------- 排序長條
def _ordered_bar(data, w, h, highlight, color, value_fmt, descending=True):
    rows = sorted(data, key=lambda d: d[1], reverse=descending)
    return _hbars(rows, w, h, highlight, color, value_fmt, lollipop=False)


def _lollipop(data, w, h, highlight, color, value_fmt):
    rows = sorted(data, key=lambda d: d[1], reverse=True)
    return _hbars(rows, w, h, highlight, color, value_fmt, lollipop=True)


def _hbars(rows, w, h, highlight, color, value_fmt, lollipop):
    """橫向的長條／棒棒糖共用同一套版面。"""
    c = _Canvas(w, h)
    labels = [r[0] for r in rows]
    col = _colors(labels, highlight, color)
    fmt = value_fmt or _fmt

    gutter = min(max(_text_w(max(labels, key=lambda s: _text_w(s, FS_LABEL)),
                             FS_LABEL) + 14, 60), w * 0.42)
    vals = [r[1] for r in rows]
    hi = max(vals + [0])
    # 量值軸從 0 起，右邊留出數值標籤的空間
    val_pad = _text_w(fmt(hi), FS_VALUE) + 14
    plot_l, plot_r = gutter, w - val_pad
    plot_w = max(plot_r - plot_l, 10)
    top, bot = 6, h - 6
    n = len(rows)
    step = (bot - top) / n
    thick = min(BAR_MAX, step * 0.62)

    x = lambda v: plot_l + (v / hi if hi else 0) * plot_w

    for i, (lab, v) in enumerate(rows):
        cy = top + step * i + step / 2
        c.text(gutter - 10, cy + FS_LABEL * 0.35, lab, FS_LABEL,
               T["ink_soft"], anchor="end")
        if lollipop:
            c.line(plot_l, cy, x(v), cy, col[lab], LINE_W, cap="round")
            c.dot(x(v), cy, col[lab])
        else:
            # 資料端圓角、基線端方角：長度從單一基線長出來
            c.add(f'<path d="M{plot_l:.1f} {cy-thick/2:.1f} H{x(v)-4:.1f} '
                  f'a4 4 0 0 1 4 4 V{cy+thick/2-4:.1f} a4 4 0 0 1 -4 4 '
                  f'H{plot_l:.1f} Z" fill="{col[lab]}"/>')
        c.text(x(v) + (DOT_R + 6 if lollipop else 8), cy + FS_VALUE * 0.35,
               fmt(v), FS_VALUE,
               T["ink"] if lab == highlight else T["ink_light"],
               weight="600" if lab == highlight else None)

    c.line(plot_l, top, plot_l, bot, T["hairline"])        # 零基線
    return c.out()


# ----------------------------------------------------------------------- 坡度
def _slope(data, w, h, highlight, color, value_fmt, end_labels=("前", "後")):
    c = _Canvas(w, h)
    labels = [r[0] for r in data]
    col = _colors(labels, highlight, color)
    fmt = value_fmt or _fmt

    lgut = min(_text_w(max(labels, key=lambda s: _text_w(s, FS_LABEL)),
                       FS_LABEL) + 14, w * 0.3)
    vals = [v for r in data for v in r[1:3]]
    lo, hi = min(vals), max(vals)
    pad = (hi - lo) * 0.12 or 1
    lo, hi = lo - pad, hi + pad
    rgut = _text_w(fmt(hi), FS_VALUE) + 16
    top, bot = 26, h - 8
    xl, xr = lgut, w - rgut
    y = lambda v: bot - (v - lo) / (hi - lo) * (bot - top)

    c.text(xl, top - 12, end_labels[0], FS_AXIS, T["ink_light"], anchor="middle",
           font=T["label"])
    c.text(xr, top - 12, end_labels[1], FS_AXIS, T["ink_light"], anchor="middle",
           font=T["label"])

    # 線畫在真正的資料高度上，標籤另外推開，兩者才不會互相牽制
    ly = _decollide([y(r[1]) for r in data], FS_LABEL + 3, top, bot)
    ry = _decollide([y(r[2]) for r in data], FS_VALUE + 3, top, bot)

    for i, (lab, a, b) in enumerate(data):
        cl = col[lab]
        c.line(xl, y(a), xr, y(b), cl, LINE_W, cap="round")
        c.dot(xl, y(a), cl)
        c.dot(xr, y(b), cl)
        # 標籤被推離資料點時補一段細引線，看得出來是哪一筆
        if abs(ly[i] - y(a)) > 1.5:
            c.line(xl - 7, ly[i], xl - 3, y(a), T["hairline"])
        if abs(ry[i] - y(b)) > 1.5:
            c.line(xr + 3, y(b), xr + 7, ry[i], T["hairline"])
        c.text(xl - 10, ly[i] + FS_LABEL * 0.35, lab, FS_LABEL,
               T["ink"] if lab == highlight else T["ink_soft"], anchor="end",
               weight="600" if lab == highlight else None)
        c.text(xr + 10, ry[i] + FS_VALUE * 0.35, fmt(b), FS_VALUE,
               T["ink"] if lab == highlight else T["ink_light"],
               weight="600" if lab == highlight else None)
    return c.out()




def _wrap_cjk(label, max_w, size):
    """標籤太寬就折成兩行。中文沒有空白可斷，所以直接對半切。

    寧可折行也不要裁切；還是放不下時由呼叫端縮字級，最低到 10px。
    """
    if _text_w(label, size) <= max_w or len(str(label)) < 2:
        return [str(label)]
    t = str(label)
    mid = len(t) // 2
    if " " in t:                       # 有空白就沿空白斷，比較自然
        best = min((i for i, ch in enumerate(t) if ch == " "),
                   key=lambda i: abs(i - mid), default=mid)
        return [t[:best].strip(), t[best:].strip()]
    return [t[:mid], t[mid:]]


def _shade(base, i, n):
    """同一個顏色的深淺階。

    顏色是 CSS 變數，Python 端算不出實際色值，所以用不透明度做單色相的
    有序階 —— 剛好也是這類圖表唯一能用的多段配色方式。
    """
    if n <= 1:
        return base, 1.0
    return base, round(1.0 - 0.62 * (i / (n - 1)), 3)


# ------------------------------------------------------------------- 直式柱狀
def _column(data, w, h, highlight, color, value_fmt, zero_base=True):
    c = _Canvas(w, h)
    labels = [d[0] for d in data]
    col = _colors(labels, highlight, color)
    fmt = value_fmt or _fmt
    vals = [d[1] for d in data]
    hi = max(vals + [0])
    lo = min(vals + [0]) if not zero_base else 0

    n = len(data)
    lab_h = 34
    top, bot = FS_VALUE + 12, h - lab_h
    left, right = 8, w - 8
    step = (right - left) / n
    thick = min(BAR_MAX, step * 0.55)
    y = lambda v: bot - (v - lo) / ((hi - lo) or 1) * (bot - top)

    c.line(left, bot, right, bot, T["hairline"])          # 零基線
    fs = FS_LABEL
    if max(_text_w(l, fs) for l in labels) > step * 1.9:
        fs = max(10, int(fs * step * 1.9 / max(_text_w(l, fs) for l in labels)))

    for i, (lab, v) in enumerate(data):
        cx = left + step * i + step / 2
        c.add(f'<path d="M{cx-thick/2:.1f} {bot:.1f} V{y(v)+4:.1f} '
              f'a4 4 0 0 1 4 -4 H{cx+thick/2-4:.1f} a4 4 0 0 1 4 4 '
              f'V{bot:.1f} Z" fill="{col[lab]}"/>')
        c.text(cx, y(v) - 7, fmt(v), FS_VALUE,
               T["ink"] if lab == highlight else T["ink_light"], anchor="middle",
               weight="600" if lab == highlight else None)
        for j, ln in enumerate(_wrap_cjk(lab, step * 1.9, fs)):
            c.text(cx, bot + 16 + j * (fs + 2), ln, fs, T["ink_soft"], anchor="middle")
    return c.out()


# ------------------------------------------------------ 橫條（不排序，保留順序）
def _bar(data, w, h, highlight, color, value_fmt):
    return _hbars(list(data), w, h, highlight, color, value_fmt, lollipop=False)


# ----------------------------------------------------------------- 分向長條
def _diverging_bar(data, w, h, highlight, color, value_fmt, baseline_label=None):
    c = _Canvas(w, h)
    labels = [d[0] for d in data]
    col = _colors(labels, highlight, color)
    fmt = value_fmt or _fmt
    vals = [d[1] for d in data]
    span = max(abs(min(vals)), abs(max(vals))) or 1

    gutter = min(max(_text_w(max(labels, key=lambda s: _text_w(s, FS_LABEL)),
                             FS_LABEL) + 14, 60), w * 0.34)
    # 正負兩側各自留出數值標籤的寬度。不留的話負值標籤會往左壓進類別欄位，
    # 變成「重定28」這種疊字。
    neg = [v for v in vals if v < 0]
    pos = [v for v in vals if v >= 0]
    neg_pad = (_text_w(fmt(min(neg)), FS_VALUE) + 12) if neg else 4
    pos_pad = (_text_w(fmt(max(pos)), FS_VALUE) + 12) if pos else 4
    plot_l, plot_r = gutter + neg_pad, w - pos_pad
    zero = (plot_l + plot_r) / 2
    half = (plot_r - plot_l) / 2
    top, bot = (20 if baseline_label else 6), h - 6
    step = (bot - top) / len(data)
    thick = min(BAR_MAX, step * 0.62)

    for i, (lab, v) in enumerate(data):
        cy = top + step * i + step / 2
        x0, x1 = (zero, zero + v / span * half)
        c.rect(min(x0, x1), cy - thick / 2, abs(x1 - x0), thick, col[lab], rx=3)
        c.text(gutter - 10, cy + FS_LABEL * 0.35, lab, FS_LABEL,
               T["ink_soft"], anchor="end")
        # 數值放在長條外側，正負各自朝外，不會壓到基線
        tx = max(x0, x1) + 8 if v >= 0 else min(x0, x1) - 8
        c.text(tx, cy + FS_VALUE * 0.35, fmt(v), FS_VALUE,
               T["ink"] if lab == highlight else T["ink_light"],
               anchor="start" if v >= 0 else "end",
               weight="600" if lab == highlight else None)

    c.line(zero, top, zero, bot, T["hairline"])
    if baseline_label:
        c.text(zero, top - 7, baseline_label, FS_AXIS, T["ink_light"],
               anchor="middle", font=T["label"])
    return c.out()


# --------------------------------------------------------------- 堆疊柱狀
def _stacked_column(data, w, h, highlight, color, value_fmt, segments=None):
    c = _Canvas(w, h)
    fmt = value_fmt or _fmt
    nseg = max(len(d[1]) for d in data)
    if nseg > 5:
        raise ValueError(f"堆疊柱狀圖有 {nseg} 段，超過 5 段就看不出來了；"
                         "請合併尾段成「其他」，或改用小倍數圖")
    base = T["accent"] if color == "accent" else T["ink"]
    totals = [sum(d[1]) for d in data]
    hi = max(totals) or 1

    n = len(data)
    lab_h = 34
    top, bot = 14, h - lab_h
    left, right = 8, w - 8
    step = (right - left) / n
    thick = min(BAR_MAX * 1.6, step * 0.55)
    fs = FS_LABEL
    labels = [d[0] for d in data]
    if max(_text_w(l, fs) for l in labels) > step * 1.9:
        fs = max(10, int(fs * step * 1.9 / max(_text_w(l, fs) for l in labels)))

    for i, (lab, segs) in enumerate(data):
        cx = left + step * i + step / 2
        yb = bot
        for j, v in enumerate(segs):
            hgt = v / hi * (bot - top)
            fill, op = _shade(base, j, nseg)
            # 段與段之間留 2px surface 空隙，不用邊框分隔
            c.add(f'<rect x="{cx-thick/2:.1f}" y="{yb-hgt:.1f}" width="{thick:.1f}" '
                  f'height="{max(hgt-2,0):.1f}" fill="{fill}" opacity="{op}"/>')
            yb -= hgt
        c.text(cx, yb - 6, fmt(totals[i]), FS_VALUE, T["ink_light"], anchor="middle")
        for j, ln in enumerate(_wrap_cjk(lab, step * 1.9, fs)):
            c.text(cx, bot + 16 + j * (fs + 2), ln, fs, T["ink_soft"], anchor="middle")

    c.line(left, bot, right, bot, T["hairline"])
    if segments:
        lx = left
        for j, name in enumerate(segments[:nseg]):
            fill, op = _shade(base, j, nseg)
            c.add(f'<rect x="{lx:.1f}" y="1" width="9" height="9" fill="{fill}" '
                  f'opacity="{op}" rx="2"/>')
            c.text(lx + 13, 9.5, name, FS_AXIS, T["ink_light"], font=T["label"])
            lx += 13 + _text_w(name, FS_AXIS) + 14
    return c.out()


# ------------------------------------------------------------------- 子彈圖
def _bullet(data, w, h, highlight, color, value_fmt, target_label="目標"):
    c = _Canvas(w, h)
    labels = [d[0] for d in data]
    col = _colors(labels, highlight, color)
    fmt = value_fmt or _fmt
    hi = max([max(d[1], d[2]) for d in data]) or 1

    gutter = min(max(_text_w(max(labels, key=lambda s: _text_w(s, FS_LABEL)),
                             FS_LABEL) + 14, 60), w * 0.38)
    val_pad = _text_w(fmt(hi), FS_VALUE) + 16
    plot_l, plot_r = gutter, w - val_pad
    plot_w = max(plot_r - plot_l, 10)
    top, bot = 14, h - 6
    step = (bot - top) / len(data)
    thick = min(BAR_MAX * 0.7, step * 0.4)
    x = lambda v: plot_l + v / hi * plot_w

    for i, (lab, actual, target) in enumerate(data):
        cy = top + step * i + step / 2
        c.rect(plot_l, cy - thick, plot_w, thick * 2, T["hairline"], rx=2)   # 量程底
        c.rect(plot_l, cy - thick / 2, x(actual) - plot_l, thick, col[lab], rx=2)
        # 目標值畫成一根垂直記號，跟實際值的長度分得開
        c.line(x(target), cy - thick * 1.1, x(target), cy + thick * 1.1,
               T["ink"], 2, cap="round")
        c.text(gutter - 10, cy + FS_LABEL * 0.35, lab, FS_LABEL,
               T["ink_soft"], anchor="end")
        c.text(plot_r + 8, cy + FS_VALUE * 0.35, fmt(actual), FS_VALUE,
               T["ink"] if lab == highlight else T["ink_light"],
               weight="600" if lab == highlight else None)
    c.text(plot_l, 9, target_label + "＝直線", FS_AXIS, T["ink_light"], font=T["label"])
    return c.out()


# --------------------------------------------------------------------- 折線
def _line(data, w, h, highlight, color, value_fmt, x_labels=None):
    """單數列 [(x, v)]，或多數列 [(名稱, [v, ...])] 搭配 x_labels。"""
    multi = isinstance(data[0][1], (list, tuple))
    c = _Canvas(w, h)
    fmt = value_fmt or _fmt
    if multi:
        series = [(nm, list(vs)) for nm, vs in data]
        xs = x_labels or [str(i + 1) for i in range(len(series[0][1]))]
    else:
        series = [("", [v for _, v in data])]
        xs = [str(k) for k, _ in data]
    col = _colors([s[0] for s in series], highlight, color)

    allv = [v for _, vs in series for v in vs]
    lo, hi = min(allv), max(allv)
    pad = (hi - lo) * 0.14 or 1
    lo, hi = lo - pad, hi + pad
    # 多數列右邊放數列名稱，單數列右邊放端點數值 —— 兩種都要留寬度，
    # 不留的話標籤會畫到 viewBox 外面被裁掉。
    name_pad = (max([_text_w(nm, FS_LABEL) for nm, _ in series]) + 16 if multi
                else _text_w(fmt(max(allv)), FS_VALUE) + 16)
    left, right = 44, w - name_pad
    top, bot = 10, h - 30
    X = lambda i: left + (i / max(len(xs) - 1, 1)) * (right - left)
    Y = lambda v: bot - (v - lo) / (hi - lo) * (bot - top)

    for t in _nice_ticks(lo, hi, 3):
        c.line(left, Y(t), right, Y(t), T["hairline"])
        c.text(left - 8, Y(t) + 4, fmt(t), FS_AXIS, T["ink_light"], anchor="end",
               font=T["label"])
    for i, lb in enumerate(xs):
        c.text(X(i), bot + 18, lb, FS_AXIS, T["ink_light"], anchor="middle",
               font=T["label"])

    for nm, vs in series:
        cl = col[nm]
        pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(vs))
        c.add(f'<polyline points="{pts}" fill="none" stroke="{cl}" '
              f'stroke-width="{LINE_W}" stroke-linejoin="round" stroke-linecap="round"/>')
        # 只標端點，不是每一點都標
        c.dot(X(len(vs) - 1), Y(vs[-1]), cl)
        if multi:
            c.text(right + 8, Y(vs[-1]) + 4, nm, FS_LABEL,
                   T["ink"] if nm == highlight else T["ink_light"],
                   weight="600" if nm == highlight else None)
        else:
            c.text(X(len(vs) - 1) + 8, Y(vs[-1]) + 4, fmt(vs[-1]), FS_VALUE, T["ink"],
                   weight="600")
    return c.out()

# ---------------------------------------------------------------------- 進入點
_RENDERERS = {
    "lollipop": _lollipop,
    "ordered_bar": _ordered_bar,
    "bar": _bar,
    "slope": _slope,
    "line": _line,
    "column": _column,
    "diverging_bar": _diverging_bar,
    "stacked_column": _stacked_column,
    "bullet": _bullet,
}


def render(form: str, data, width: int = 560, height: int = 330,
           highlight=None, color: str = "mono", value_fmt=None, **kw) -> str:
    """產生一張圖的 inline SVG。

    form      lollipop / ordered_bar / slope
    data      [(標籤, 值)]；slope 是 [(標籤, 前, 後)]
    highlight 要強調的那一筆標籤，其餘轉中性色
    color     "mono"（預設，重點用墨色）或 "accent"（重點用 theme 的強調色）
    """
    if form not in _RENDERERS:
        raise ValueError(f"未知的圖形 {form!r}，可用：{', '.join(sorted(_RENDERERS))}")
    if not data:
        raise ValueError("data 是空的，沒有東西可以畫")
    if color not in ("mono", "accent"):
        raise ValueError("color 只能是 'mono' 或 'accent'")
    return _RENDERERS[form](data, width, height, highlight, color, value_fmt, **kw)


# ─────────────────────────────────────────────────────────── 選型：suggest()
# references/chart-vocabulary.yaml 是「問題 → 圖表形式」的決策表，之前沒有任何
# 程式讀它，只能靠人翻。改由 LLM 寫投影片之後這件事更要緊：叫模型「讀完這份
# 146 行 YAML 再挑一個」，它會挑出第十種我們沒實作的形式；叫它呼叫一個回傳
# 2~3 個候選、而且已經濾掉做不出來的函式，它就只能挑對的。
#
# 自己解析而不是 pip install pyyaml：這個專案的前提是「編輯不需要安裝任何東西」。
# 而且這份檔案用到的 YAML 子集很窄 —— 實際掃過：縮排只有 0/2/4/6 四級、沒有任何
# 引號、值裡沒有 ASCII 逗號也沒有冒號、序列一律是 `- {k: v, ...}` 這種行內映射。
# 所以下面這個解析器對「這一份檔案」是正確的，對一般 YAML 不是，也不打算是。
# 換成 JSON 就不必解析，但會多一份要同步的檔案，而且 JSON 放不下檔頭那段解釋
# ready/planned/skip 的說明。

import re as _re
from pathlib import Path as _Path

VOCAB_PATH = _Path(__file__).parent / "references" / "chart-vocabulary.yaml"


def _parse_vocab(text: str) -> dict:
    """只支援這份檔案用到的 YAML 子集，見上方註解。"""
    root: dict = {}
    stack = [(-1, root)]                      # (縮排, 容器)
    for raw in text.split("\n"):
        line = raw.split(" #")[0].rstrip() if " #" in raw else raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        body = line.strip()

        if body.startswith("- "):
            # 序列項目掛在最近一個「只有 key」的容器上（forms:）
            while stack and stack[-1][0] >= indent:
                stack.pop()
            holder = stack[-1][1]
            item = body[2:].strip()
            seq = holder.setdefault("__seq__", [])
            seq.append(_flow(item) if item.startswith("{") else item)
            continue

        while stack and stack[-1][0] >= indent:
            stack.pop()
        parent = stack[-1][1]
        key, _, val = body.partition(":")
        # shortcuts: 的 key 是帶引號的中文問句，值又是行內映射 —— 兩者都要處理
        key, val = _unquote(key.strip()), val.strip()
        if val:
            parent[key] = _flow(val) if val.startswith("{") else _unquote(val)
        else:
            child: dict = {}
            parent[key] = child
            stack.append((indent, child))
    return _unwrap(root)


def _unquote(s: str) -> str:
    return s[1:-1] if len(s) > 1 and s[0] == s[-1] and s[0] in "\"'" else s


def _flow(s: str) -> dict:
    """`{k: v, k: v}` 行內映射。值裡不會有 ASCII 逗號或冒號（已掃過整份檔案），
    所以直接切就對；這是為這一份檔案寫的，不是通用 YAML。"""
    out = {}
    for part in s.strip()[1:-1].split(","):
        if ":" in part:
            k, v = part.split(":", 1)
            out[_unquote(k.strip())] = _unquote(v.strip())
    return out


def _unwrap(node):
    """把 {'__seq__': [...]} 這種佔位容器收斂回真正的 list。"""
    if isinstance(node, dict):
        if set(node) == {"__seq__"}:
            return node["__seq__"]
        return {k: _unwrap(v) for k, v in node.items()}
    return node


_VOCAB = None


def vocabulary() -> dict:
    global _VOCAB
    if _VOCAB is None:
        _VOCAB = _parse_vocab(VOCAB_PATH.read_text(encoding="utf-8"))
    return _VOCAB


def families() -> dict:
    return vocabulary().get("families", {})


# 中文沒有詞界，所以用字元 bigram 的重疊度當相似度。粗糙但夠用，而且不需要
# 斷詞套件 —— 這裡要的只是把 9 個 family 排個序，不是做語意檢索。
def _bigrams(s: str) -> set:
    s = _re.sub(r"\s+", "", s or "")
    return {s[i:i + 2] for i in range(len(s) - 1)} if len(s) > 1 else {s}


def _shortcut(question: str):
    """問句命中了 shortcuts: 的哪一條？

    分母用捷徑本身的長度，不是兩者取大 —— 問的是「這個問句涵蓋了多少捷徑」。
    取大的話，「預算怎麼分配到各個部門」對上「預算怎麼分配」只有 0.5，明明是
    同一個問題卻漏掉。門檻 0.8：要幾乎整條捷徑都被涵蓋才算數。"""
    qb = _bigrams(question)
    if not qb:
        return None
    best, score = None, 0.0
    for k, v in (vocabulary().get("shortcuts") or {}).items():
        kb = _bigrams(k)
        s = len(qb & kb) / len(kb) if kb else 0.0
        if s > score:
            best, score = v, s
    return best if score >= 0.8 else None


def suggest(question: str = "", family: str = None, ready_only: bool = True,
            top: int = 2) -> list:
    """問題 → 候選圖表形式。

        chart.suggest("這些值相對於目標是高還是低")
        chart.suggest(family="deviation", ready_only=False)

    回傳 [{family, zh, ask, score, forms: [...]}]。`ready_only` 預設 True，
    只留 `status: ready`（chart.py 真的畫得出來的 9 種）—— 這正是這個函式
    存在的理由：不要讓呼叫端挑到一個沒有 renderer 的形式。
    """
    fams = families()
    if family:
        picked = [(1.0, family, fams[family])] if family in fams else []
    elif question and _shortcut(question):
        # 檔案裡的 shortcuts: 是人寫好的問句→形式對照，比 bigram 猜測可靠得多。
        # 命中就直接用它指定的 family，不要再讓相似度去覆蓋一個明確的答案。
        sc = _shortcut(question)
        picked = [(1.0, sc["family"], fams.get(sc["family"], {}))]
    else:
        qb = _bigrams(question)
        scored = []
        for name, f in fams.items():
            if not isinstance(f, dict):
                continue
            hay = " ".join(str(f.get(k, "")) for k in ("zh", "ask", "when", "ft_examples"))
            hb = _bigrams(hay)
            scored.append(((len(qb & hb) / len(qb)) if qb else 0.0, name, f))
        scored.sort(key=lambda t: -t[0])
        # 0 分就是這份表回答不了這個問題。回一個 0 分的 family 只是把雜訊
        # 包裝成答案，呼叫端會照著用。寧可回空的，讓人自己去讀那份 YAML。
        picked = [s for s in scored[:top] if s[0] > 0.05]

    out = []
    for score, name, f in picked:
        forms = [x for x in (f.get("forms") or [])
                 if not ready_only or x.get("status") == "ready"]
        # ready_only 時，一個一種形式都畫不出來的 family 是雜訊 —— 呼叫端只會
        # 從給出來的東西裡挑，給它一個空清單只是浪費它的判斷力
        if ready_only and not forms:
            continue
        out.append({"family": name, "zh": f.get("zh", ""), "ask": f.get("ask", ""),
                    "score": round(score, 3), "forms": forms})
    return out
