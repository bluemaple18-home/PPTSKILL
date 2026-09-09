const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const cloneSlide = (slide) => ({ ...slide });

export function createDeckState(fixture) {
  const slides = fixture.slides.map(cloneSlide);
  let currentIndex = 0;
  let duplicateCount = 0;

  const normalizeCurrent = () => {
    currentIndex = Math.max(0, Math.min(currentIndex, slides.length - 1));
  };

  return {
    get slides() {
      return slides;
    },
    current() {
      return slides[currentIndex];
    },
    next() {
      currentIndex = Math.min(currentIndex + 1, slides.length - 1);
      return this.current();
    },
    previous() {
      currentIndex = Math.max(currentIndex - 1, 0);
      return this.current();
    },
    reorder(from, to) {
      const [slide] = slides.splice(from, 1);
      slides.splice(to, 0, slide);
      currentIndex = to;
      return this.current();
    },
    duplicate(index) {
      const original = slides[index];
      duplicateCount += 1;
      const copy = { ...original, id: `${original.id}-copy-${duplicateCount}` };
      slides.splice(index + 1, 0, copy);
      currentIndex = index + 1;
      return copy;
    },
    delete(index) {
      if (slides.length === 1) return this.current();
      slides.splice(index, 1);
      normalizeCurrent();
      return this.current();
    },
  };
}

export function buildDeckHtml(fixture) {
  const data = JSON.stringify(fixture).replaceAll('<', '\\u003c');
  const initialSlides = fixture.slides.map((slide, index) => `
      <article class="slide${index === 0 ? ' active' : ''}" data-slide-id="${escapeHtml(slide.id)}">
        <p class="eyebrow">${String(index + 1).padStart(2, '0')} / ${fixture.slides.length}</p>
        <h1 contenteditable="false">${escapeHtml(slide.title)}</h1>
        <p class="body" contenteditable="false">${escapeHtml(slide.body)}</p>
      </article>`).join('');

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fixture.title)}</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #121827; color: #f6f7fb; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; grid-template-rows: 1fr auto; }
    .slide { display: none; min-height: 76vh; padding: clamp(2rem, 8vw, 8rem); background: radial-gradient(circle at top right, #2b4d7a, #121827 55%); }
    .slide.active { display: block; }
    .eyebrow { color: #93c5fd; letter-spacing: .12em; }
    h1 { max-width: 18ch; font-size: clamp(2.5rem, 7vw, 6.5rem); margin: 14vh 0 1rem; }
    .body { max-width: 52ch; font-size: clamp(1.15rem, 2vw, 1.7rem); line-height: 1.6; }
    #controls, #editor { display: flex; gap: .6rem; flex-wrap: wrap; padding: 1rem; background: #0b1020; }
    button { border: 1px solid #4b638a; border-radius: .4rem; background: #1f3355; color: inherit; padding: .55rem .8rem; cursor: pointer; }
    body[data-mode="edit"] h1, body[data-mode="edit"] .body { outline: 1px dashed #93c5fd; outline-offset: .25rem; }
    body[data-mode="edit"] #editor { display: flex; }
    body[data-mode="play"] #editor { display: none; }
  </style>
</head>
<body data-mode="play">
  <main id="slides">${initialSlides}
  </main>
  <nav id="controls" aria-label="播放控制">
    <button data-action="previous">上一頁</button><button data-action="next">下一頁</button>
    <button data-action="edit">編輯模式</button>
  </nav>
  <section id="editor" aria-label="投影片管理">
    <button data-action="move-up">上移</button><button data-action="move-down">下移</button>
    <button data-action="duplicate">複製</button><button data-action="delete">刪除</button>
    <button data-action="save">另存 HTML</button>
  </section>
  <script type="application/json" id="deck-data">${data}</script>
  <script>
    (() => {
      const fixture = JSON.parse(document.querySelector('#deck-data').textContent);
      const slides = fixture.slides;
      let current = 0;
      let copyCount = 0;
      const root = document.body;
      const view = document.querySelector('#slides');
      const render = () => {
        view.innerHTML = slides.map((slide, index) => '<article class="slide' + (index === current ? ' active' : '') + '" data-slide-id="' + slide.id + '"><p class="eyebrow">' + String(index + 1).padStart(2, '0') + ' / ' + slides.length + '</p><h1 contenteditable="' + (root.dataset.mode === 'edit') + '"></h1><p class="body" contenteditable="' + (root.dataset.mode === 'edit') + '"></p></article>').join('');
        view.querySelectorAll('.slide').forEach((element, index) => {
          element.querySelector('h1').textContent = slides[index].title;
          element.querySelector('.body').textContent = slides[index].body;
        });
      };
      const saveEdits = () => {
        view.querySelectorAll('.slide').forEach((element, index) => {
          slides[index].title = element.querySelector('h1').textContent;
          slides[index].body = element.querySelector('.body').textContent;
        });
      };
      const download = () => {
        saveEdits();
        const data = document.documentElement.outerHTML.replace(document.querySelector('#deck-data').textContent, JSON.stringify(fixture).replaceAll('<', '\\u003c'));
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([data], { type: 'text/html;charset=utf-8' }));
        link.download = 'deck.html';
        link.click();
        URL.revokeObjectURL(link.href);
      };
      document.addEventListener('click', (event) => {
        const action = event.target.dataset.action;
        if (!action) return;
        saveEdits();
        if (action === 'next') current = Math.min(current + 1, slides.length - 1);
        if (action === 'previous') current = Math.max(current - 1, 0);
        if (action === 'edit') root.dataset.mode = root.dataset.mode === 'edit' ? 'play' : 'edit';
        if (action === 'move-up' && current > 0) { [slides[current - 1], slides[current]] = [slides[current], slides[current - 1]]; current -= 1; }
        if (action === 'move-down' && current < slides.length - 1) { [slides[current], slides[current + 1]] = [slides[current + 1], slides[current]]; current += 1; }
        if (action === 'duplicate') { copyCount += 1; slides.splice(current + 1, 0, { ...slides[current], id: slides[current].id + '-copy-' + copyCount }); current += 1; }
        if (action === 'delete' && slides.length > 1) { slides.splice(current, 1); current = Math.min(current, slides.length - 1); }
        if (action === 'save') download();
        render();
      });
      document.addEventListener('keydown', (event) => {
        if (root.dataset.mode === 'edit') return;
        if (event.key === 'ArrowRight') { current = Math.min(current + 1, slides.length - 1); render(); }
        if (event.key === 'ArrowLeft') { current = Math.max(current - 1, 0); render(); }
      });
      render();
    })();
  </script>
</body>
</html>`;
}
