#!/usr/bin/env python3
"""build_deck.py — 把一疊 1280x720 的 slide HTML 打包成單檔演示文稿。

做三件事：
  1. 字體子集化：只取這份 deck 真正用到的字，40-60KB，base64 內嵌
     （原始字體 8-13MB，且 Google Fonts 在離線 / 內網 / 中國大陸常拉不到）
  2. 修正字形地區：內容是繁體中文時套用 TC 字體，而非 skill 預設的 JP/SC
  3. 導覽：--nav scroll（滾一下翻一頁）或 --nav buttons（上一頁/下一頁）

投影片放在 sandbox="allow-same-origin allow-scripts" 的 iframe 裡。兩個旗標要一起給：
少了 allow-scripts，投影片裡的互動示範（Three.js/Vanta）不會執行；少了
allow-same-origin，theme 產生的投影片會整頁空白（實測 mocha/glass 都是，只換這個
旗標就會壞）。兩個一起給等於 sandbox 形同虛設 —— 被框住的內容可以自己把
sandbox 拿掉。對「自己寫的投影片」來說可以接受，但不要拿這個管線去框別人的 HTML。

用法:
  python3 build_deck.py slides/ -o out/deck.html --font wenkai --nav scroll \\
      --title "標題" --bg "#efe9de" --ink "#2c2826"

字體:
  wenkai — LXGW WenKai TC 霞鶩文楷（楷體，溫潤、手寫感；適合文化/茶道/人文）
  serif  — Noto Serif TC 思源宋體（明體，銳利、編輯感；適合商務/技術/正式）
  none   — 不內嵌，沿用 slide 原本的字體堆疊

兩款字體皆為 SIL OFL 1.1，可商用、可內嵌。
"""
import argparse
import base64
import html as html_module
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONT_DIR = HERE / "fonts"

FONTS = {
    "wenkai": {
        "file": "LXGWWenKaiTC-Regular.ttf",
        "label": "LXGW WenKai TC 霞鶩文楷",
        "url": "https://github.com/lxgw/LxgwWenKaiTC/releases/download/"
               "v1.320/LXGWWenKaiTC-Regular.ttf",
    },
    "serif": {
        "file": "NotoSerifTC-CJKcommon.otf",
        "label": "Noto Serif TC 思源宋體",
        "url": None,  # 隨工具箱附帶（已裁到常用 CJK 區段，21,696 字）
    },
}

GF_IMPORT = re.compile(
    r"@import\s+url\(['\"]https://fonts\.googleapis\.com[^)]*\);?", re.I)


# ---------------------------------------------------------------- font embed

def deck_charset(slide_files):
    """抓出這份 deck 真正出現的字元。"""
    chars = set()
    for f in slide_files:
        s = f.read_text(encoding="utf-8")
        s = re.sub(r"<style.*?</style>", " ", s, flags=re.S)
        s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
        s = re.sub(r"<[^>]+>", " ", s)
        s = re.sub(r"&[a-z]+;", " ", s)
        chars |= set(s)
    chars |= set("0123456789/·—－ ")
    return "".join(sorted(c for c in chars if c.isprintable()))


def ensure_font(key):
    spec = FONTS[key]
    path = FONT_DIR / spec["file"]
    if path.exists():
        return path
    if not spec["url"]:
        sys.exit(f"缺少字體檔 {path}\n（此字體隨工具箱附帶，請確認 fonts/ 目錄完整）")
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"  下載 {spec['label']} ...")
    subprocess.run(["curl", "-sSL", "--retry", "2", "-o", str(path), spec["url"]],
                   check=True)
    return path


def subset_and_embed(slide_files, out_dir, key):
    """子集化字體並內嵌進每一頁，回傳新的 slide 檔案清單。"""
    spec = FONTS[key]
    src = ensure_font(key)
    charset = deck_charset(slide_files)

    with tempfile.TemporaryDirectory() as td:
        cs_file = Path(td) / "charset.txt"
        cs_file.write_text(charset, encoding="utf-8")
        woff2 = Path(td) / "sub.woff2"
        r = subprocess.run(
            ["pyftsubset", str(src), f"--text-file={cs_file}",
             f"--output-file={woff2}", "--flavor=woff2",
             "--layout-features=kern,liga,palt,vert,vrt2",
             "--no-hinting", "--desubroutinize"],
            capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit("pyftsubset 失敗：\n" + (r.stderr or r.stdout))

        b64 = base64.b64encode(woff2.read_bytes()).decode()
        print(f"  {spec['label']}: {len(charset)} 字 -> "
              f"{woff2.stat().st_size // 1024} KB (原始 {src.stat().st_size // 1024 // 1024} MB)")

    face = (f"@font-face{{font-family:'DeckCJK';"
            f"src:url(data:font/woff2;charset=utf-8;base64,{b64}) format('woff2');"
            f"font-weight:100 900;font-style:normal;font-display:block;}}")

    out_dir.mkdir(parents=True, exist_ok=True)
    made = []
    for f in slide_files:
        s = f.read_text(encoding="utf-8")
        s = GF_IMPORT.sub(face, s, count=1) if GF_IMPORT.search(s) \
            else s.replace("<style>", "<style>\n" + face, 1)
        s = re.sub(r"--display-font:[^;]+;", "--display-font:'DeckCJK',serif;", s)
        s = re.sub(r"--body-font:[^;]+;", "--body-font:'DeckCJK',serif;", s)
        s = re.sub(r"--label-font:[^;]+;",
                   "--label-font:-apple-system,BlinkMacSystemFont,'Segoe UI',"
                   "'Helvetica Neue',Arial,sans-serif;", s)
        p = out_dir / f.name
        p.write_text(s, encoding="utf-8")
        made.append(p)
    return made


# ------------------------------------------------------------------ packager

EDITOR_META = re.compile(r'\s*data-ed(?:-editing)?="[^"]*"')


def strip_editor_meta(html_content):
    """slide_editor 把每個元素的編輯數值存在 data-ed 屬性裡讓下次讀得回來。
    那是編輯期的中繼資料，打包出去的檔案不需要，拿掉讓輸出乾淨一點。"""
    return EDITOR_META.sub("", html_content)


# 副檔名 -> MIME。以前只有圖片、其餘一律 fallback 成 image/{ext}，於是
# 內嵌的 .mp4 變成 image/mp4、.js 變成 image/js —— 瀏覽器會拒絕執行或播放。
MIME = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "svg": "image/svg+xml", "webp": "image/webp",
    "avif": "image/avif", "ico": "image/x-icon",
    "mp4": "video/mp4", "m4v": "video/mp4", "webm": "video/webm",
    "mov": "video/quicktime", "mp3": "audio/mpeg", "wav": "audio/wav",
    "ogg": "audio/ogg",
    "woff2": "font/woff2", "woff": "font/woff", "ttf": "font/ttf", "otf": "font/otf",
    "wasm": "application/wasm", "json": "application/json",
    "css": "text/css", "js": "text/javascript", "mjs": "text/javascript",
    "txt": "text/plain", "csv": "text/csv",
}

SCRIPT_SRC = re.compile(
    r'<script([^>]*?)\ssrc=["\']([^"\']+)["\']([^>]*)>\s*</script>', re.I)


def inline_scripts(html_content, html_dir):
    """把本機的 <script src="…"> 換成內聯的 <script>本文</script>。

    不走 data: URI，因為 data URI 的 MIME 一錯瀏覽器就整個不執行，而且 base64
    會胖 33%。內聯本文沒有這兩個問題。外部網址（CDN）維持原樣 —— 那本來就需要
    連線，跟「單一檔案可離線」互相矛盾，留給作者自己決定。
    """
    def repl(m):
        pre, path_str, post = m.group(1), m.group(2), m.group(3)
        if path_str[:8].lower().startswith(("data:", "http:", "https", "//")):
            return m.group(0)
        try:
            f = Path(path_str)
            if not f.is_absolute():
                f = html_dir / path_str
            if not f.is_file():
                return m.group(0)
            code = f.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            return m.group(0)
        # 本文裡若出現 </script> 會提前結束標籤，必須拆開
        code = code.replace("</script>", "<\\/script>")
        return f"<script{pre}{post}>\n{code}\n</script>"

    return SCRIPT_SRC.sub(repl, html_content)


def inline_images(html_content, html_dir):
    def replace_src(m):
        attr, path_str, closing = m.group(1), m.group(2), m.group(3)
        # data:/http(s): 不是檔案路徑。上游 html_packager.py 少了這道判斷，
        # 內嵌 base64 字體時會 OSError(36) File name too long。
        if path_str[:12].lower().startswith(("data:", "http:", "https:", "//", "#")):
            return m.group(0)
        try:
            p = Path(path_str)
            if not p.is_absolute():
                p = html_dir / path_str
            ok = p.exists() and p.is_file()
        except OSError:
            return m.group(0)
        if ok:
            ext = p.suffix.lower().lstrip(".")
            mime = MIME.get(ext, "application/octet-stream")
            return f'{attr}data:{mime};base64,{base64.b64encode(p.read_bytes()).decode()}{closing}'
        return m.group(0)

    html_content = re.sub(r'(src=["\'])([^"\']+?)(["\'])', replace_src, html_content)
    html_content = re.sub(r'(url\(["\']?)([^"\')\s]+?)(["\']?\))', replace_src, html_content)
    return html_content


NAV_JS_SCROLL = """
  const MIN_LOCK = 620, QUIET = 140, DEADZONE = 6;
  let locked = false, lockUntil = 0, quietTimer = null;

  function releaseWhenQuiet(){
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => {
      const remain = lockUntil - Date.now();
      if(remain > 0){ quietTimer = setTimeout(releaseWhenQuiet, remain); return; }
      locked = false;
    }, QUIET);
  }
  /* 一次手勢 = 一頁。原生 scroll-snap 做不到：滾動量不足會被吸回原頁，
     一次慣性滑動又會連跳數頁，所以改用軌道 + 手勢鎖。*/
  deck.addEventListener('wheel', e => {
    e.preventDefault();
    if(Math.abs(e.deltaY) < DEADZONE) return;
    if(locked){ releaseWhenQuiet(); return; }
    locked = true; lockUntil = Date.now() + MIN_LOCK;
    go(cur + (e.deltaY > 0 ? 1 : -1));
    releaseWhenQuiet();
  }, {passive:false});

  let touchY = null;
  deck.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, {passive:true});
  deck.addEventListener('touchend', e => {
    if(touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY;
    if(Math.abs(dy) > 50) go(cur + (dy > 0 ? 1 : -1));
    touchY = null;
  }, {passive:true});
"""


def build_html(slide_files, title, bg, ink, nav, src_dir=None):
    sections, dots = [], []
    for i, f in enumerate(slide_files):
        content = strip_editor_meta(f.read_text(encoding="utf-8"))
        # 先內聯 script 本文，再處理其餘 src= —— 順序不能反，否則 <script src>
        # 會先被 inline_images 轉成 data: URI，就沒機會變成內聯本文了。
        content = inline_scripts(content, src_dir or f.parent)
        # 相對路徑（編輯器插入的 ../assets/…）要以**原始** slides 目錄為基準。
        # 這時 f 通常已經是暫存目錄裡的副本，用 f.parent 會找不到檔案。
        content = inline_images(content, src_dir or f.parent)
        sections.append(
            f'<section class="slide" data-idx="{i}"><div class="stage">'
            f'<iframe class="slide-frame" srcdoc="{html_module.escape(content, quote=True)}" '
            f'sandbox="allow-same-origin allow-scripts" frameborder="0" scrolling="no"></iframe>'
            f'</div></section>')
        dots.append(f'<button class="dot" data-go="{i}" aria-label="第 {i+1} 頁"></button>')

    total = len(sections)
    buttons = ("" if nav == "scroll" else
               '<div class="bar"><button id="p" onclick="go(cur-1)">←</button>'
               '<button id="n" onclick="go(cur+1)">→</button></div>')
    hint = ("Scroll or ← → · F for fullscreen" if nav == "scroll"
            else "← → or click · F for fullscreen")

    return f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html_module.escape(title)}</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box;}}
  :root{{--bg:{bg}; --ink:{ink};}}
  html,body{{height:100%;}}
  body{{background:var(--bg); color:var(--ink); overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;}}
  .deck{{height:100vh; height:100dvh; overflow:hidden; position:relative;}}
  .track{{height:100%; will-change:transform;
    transition:transform .62s cubic-bezier(.22,.61,.36,1);}}
  .slide{{height:100vh; height:100dvh; display:flex; align-items:center; justify-content:center;}}
  .stage{{width:min(92vw, calc(90vh * 16 / 9)); aspect-ratio:16/9;
    position:relative; overflow:hidden;
    box-shadow:0 18px 50px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05);}}
  .slide-frame{{width:1280px; height:720px; border:none; position:absolute; top:0; left:0;
    transform-origin:top left; pointer-events:none;}}
  .rail{{position:fixed; top:50%; right:26px; transform:translateY(-50%);
    display:flex; flex-direction:column; gap:12px; z-index:100;}}
  .dot{{width:7px; height:7px; padding:0; border-radius:50%; cursor:pointer;
    background:transparent; border:1px solid var(--ink); opacity:0.28;
    transition:opacity .25s, background .25s, transform .25s;}}
  .dot:hover{{opacity:0.6;}}
  .dot.on{{background:var(--ink); opacity:0.75; transform:scale(1.25);}}
  .bar{{position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
    display:flex; gap:10px; z-index:100;}}
  .bar button{{width:34px; height:28px; cursor:pointer; font-size:13px;
    color:var(--ink); background:transparent; opacity:0.5;
    border:1px solid var(--ink); border-radius:2px;}}
  .bar button:hover{{opacity:0.9;}}
  .bar button:disabled{{opacity:0.15; cursor:not-allowed;}}
  .counter{{position:fixed; bottom:22px; right:26px; z-index:100; font-size:10px;
    letter-spacing:0.34em; opacity:0.4; font-variant-numeric:tabular-nums;
    pointer-events:none;}}
  .hint{{position:fixed; bottom:22px; left:26px; z-index:100; font-size:10px;
    letter-spacing:0.28em; text-transform:uppercase; opacity:0.32;
    transition:opacity .6s; pointer-events:none;}}
  .hint.gone{{opacity:0;}}
  @media (prefers-reduced-motion: reduce){{ .track{{transition:none;}} }}
</style>
</head>
<body>
<div class="deck" id="deck"><div class="track" id="track">
{chr(10).join(sections)}
</div></div>
<div class="rail">{''.join(dots)}</div>
{buttons}
<div class="counter" id="counter">01 / {total:02d}</div>
<div class="hint" id="hint">{hint}</div>
<script>
(function(){{
  const deck = document.getElementById('deck'), track = document.getElementById('track');
  const slides = Array.from(track.querySelectorAll('.slide'));
  const frames = Array.from(track.querySelectorAll('.slide-frame'));
  const dots = Array.from(document.querySelectorAll('.dot'));
  const counter = document.getElementById('counter'), hint = document.getElementById('hint');
  const total = slides.length;
  let cur = 0, hidden = false;
  const pad = n => String(n).padStart(2,'0');

  function resize(){{
    slides.forEach((s,i) => {{
      const st = s.querySelector('.stage');
      frames[i].style.transform =
        'scale(' + Math.min(st.clientWidth/1280, st.clientHeight/720) + ')';
    }});
  }}
  window.go = function(i){{
    const n = Math.max(0, Math.min(total-1, i));
    if(n === cur) return;
    cur = n;
    /* 用 % 而非 vh：手機瀏覽器網址列收放時 vh 會跳動 */
    track.style.transform = 'translate3d(0,' + (-n * 100) + '%,0)';
    counter.textContent = pad(n+1) + ' / ' + pad(total);
    dots.forEach((d,idx) => d.classList.toggle('on', idx === n));
    const p = document.getElementById('p'), q = document.getElementById('n');
    if(p) p.disabled = n === 0;
    if(q) q.disabled = n === total-1;
    if(!hidden){{ hidden = true; hint.classList.add('gone'); }}
  }};
  Object.defineProperty(window, 'cur', {{get: () => cur}});
{NAV_JS_SCROLL if nav == 'scroll' else ''}
  dots.forEach(d => d.addEventListener('click', () => go(Number(d.dataset.go))));
  document.addEventListener('keydown', e => {{
    const k = e.key;
    if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '){{ e.preventDefault(); go(cur+1); }}
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'){{ e.preventDefault(); go(cur-1); }}
    else if(k==='Home'){{ e.preventDefault(); go(0); }}
    else if(k==='End'){{ e.preventDefault(); go(total-1); }}
    else if(k==='f'||k==='F'){{
      if(!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }}
  }});
  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', () => setTimeout(resize, 60));
  resize(); dots[0].classList.add('on');
  const p = document.getElementById('p'); if(p) p.disabled = true;
}})();
</script>
</body>
</html>"""


def apply_overrides(slide_files, out_dir, ovr_path, assets_dir):
    """把 slide_editor 存的 overrides.json 合成進來。

    產生物永遠不被寫入，合成只發生在打包當下的暫存目錄。
    圖片用絕對路徑，後面 inline_images 才找得到並轉成 base64。
    """
    sys.path.insert(0, str(HERE))
    from slide_editor import overrides as ovr

    data = ovr.load(ovr_path)
    prefix = str(Path(assets_dir).resolve()) + "/"
    out_dir.mkdir(parents=True, exist_ok=True)
    made, n_p, n_i = [], 0, 0
    for f in slide_files:
        entry = data["slides"].get(f.name, {"patches": [], "inserts": []})
        n_p += len(entry.get("patches", []))
        n_i += len(entry.get("inserts", []))
        p = out_dir / f.name
        p.write_text(ovr.apply_to_html(f.read_text(encoding="utf-8"), entry, prefix),
                     encoding="utf-8")
        made.append(p)
    if n_p or n_i:
        print(f"  套用 overrides: {n_p} 項調整, {n_i} 個插入元素")
    return made


def main():
    ap = argparse.ArgumentParser(description="打包 1280x720 slide HTML 成單檔演示文稿")
    ap.add_argument("slides_dir")
    ap.add_argument("-o", "--output", default="out/deck.html")
    ap.add_argument("--title", default="Deck")
    ap.add_argument("--font", choices=["wenkai", "serif", "none"], default="wenkai")
    ap.add_argument("--nav", choices=["scroll", "buttons"], default="scroll")
    ap.add_argument("--bg", default="#efe9de")
    ap.add_argument("--ink", default="#2c2826")
    ap.add_argument("--overrides", default=None,
                    help="預設 <slides_dir>/../overrides.json；傳 none 可略過")
    ap.add_argument("--assets", default=None, help="預設 <slides_dir>/../assets")
    a = ap.parse_args()

    slides_dir = Path(a.slides_dir)
    files = sorted(slides_dir.glob("*.html"))
    if not files:
        sys.exit(f"{a.slides_dir} 裡沒有 .html")
    print(f"讀入 {len(files)} 頁")

    root = slides_dir.resolve().parent
    if a.overrides == "none":
        ovr_path = None
    else:
        ovr_path = Path(a.overrides) if a.overrides else root / "overrides.json"
        if not ovr_path.exists():
            ovr_path = None
    assets_dir = Path(a.assets) if a.assets else root / "assets"

    with tempfile.TemporaryDirectory() as td:
        if ovr_path:
            files = apply_overrides(files, Path(td) / "ovr", ovr_path, assets_dir)
        if a.font != "none":
            files = subset_and_embed(files, Path(td) / "embedded", a.font)
        out = Path(a.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(build_html(files, a.title, a.bg, a.ink, a.nav,
                                  src_dir=slides_dir.resolve()), encoding="utf-8")

    print(f"完成: {out}  ({out.stat().st_size // 1024} KB, nav={a.nav}, font={a.font})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
