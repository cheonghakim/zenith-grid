import { EXAMPLES } from './examples.js';

// ── Syntax highlighter ────────────────────────────────────────────
function highlight(code) {
  const KEYWORDS = /\b(import|export|from|const|let|var|function|return|async|await|new|if|else|for|of|in|true|false|null|undefined|class|extends|this)\b/g;
  const escape = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Process char-by-char to handle strings & comments first, then keywords
  let result = '';
  let i = 0;
  const src = code;

  while (i < src.length) {
    // single-line comment
    if (src[i] === '/' && src[i+1] === '/') {
      let end = src.indexOf('\n', i);
      if (end === -1) end = src.length;
      result += `<span class="tk-cmt">${escape(src.slice(i, end))}</span>`;
      i = end;
      continue;
    }
    // template literal
    if (src[i] === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\') j++;
        j++;
      }
      result += `<span class="tk-str">${escape(src.slice(i, j + 1))}</span>`;
      i = j + 1;
      continue;
    }
    // string ' or "
    if (src[i] === "'" || src[i] === '"') {
      const q = src[i];
      let j = i + 1;
      while (j < src.length && src[j] !== q) {
        if (src[j] === '\\') j++;
        j++;
      }
      result += `<span class="tk-str">${escape(src.slice(i, j + 1))}</span>`;
      i = j + 1;
      continue;
    }
    // number
    if (/[0-9]/.test(src[i]) && (i === 0 || /\W/.test(src[i-1]))) {
      let j = i;
      while (j < src.length && /[\d._]/.test(src[j])) j++;
      result += `<span class="tk-num">${escape(src.slice(i, j))}</span>`;
      i = j;
      continue;
    }
    // word boundary — check for keyword or function call
    if (/[a-zA-Z_$]/.test(src[i])) {
      let j = i;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const isKw = KEYWORDS.test(word); KEYWORDS.lastIndex = 0;
      const isFn = src[j] === '(';
      const isProp = i > 0 && src[i-1] === '.';
      if (isKw)       result += `<span class="tk-kw">${escape(word)}</span>`;
      else if (isFn)  result += `<span class="tk-fn">${escape(word)}</span>`;
      else if (isProp)result += `<span class="tk-prop">${escape(word)}</span>`;
      else            result += escape(word);
      i = j;
      continue;
    }
    result += escape(src[i]);
    i++;
  }
  return result;
}

// ── State ─────────────────────────────────────────────────────────
let currentGrid = null;
let currentExample = null;

// ── DOM refs ──────────────────────────────────────────────────────
const sidebarNav  = document.getElementById('sidebar-nav');
const titleEl     = document.getElementById('example-title');
const descEl      = document.getElementById('example-desc');
const gridHost    = document.getElementById('grid-host');
const codeDisplay = document.getElementById('code-display');
const copyBtn     = document.getElementById('copy-btn');
const themeBtn    = document.getElementById('theme-btn');

// ── Sidebar build ─────────────────────────────────────────────────
function buildSidebar() {
  const categories = [];
  const seen = new Set();
  for (const ex of EXAMPLES) {
    if (!seen.has(ex.category)) { categories.push(ex.category); seen.add(ex.category); }
  }

  for (const cat of categories) {
    const catEl = document.createElement('div');
    catEl.className = 'nav-category';
    catEl.textContent = cat;
    sidebarNav.appendChild(catEl);

    for (const ex of EXAMPLES.filter(e => e.category === cat)) {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.textContent = ex.label;
      btn.dataset.id = ex.id;
      btn.addEventListener('click', () => loadExample(ex.id));
      sidebarNav.appendChild(btn);
    }
  }
}

// ── Example loader ────────────────────────────────────────────────
function destroyCurrent() {
  if (currentGrid) {
    currentGrid._showcaseCleanup?.();
    currentGrid.destroy?.();
    currentGrid = null;
  }
  // clear any buttons injected before grid-host
  const host = gridHost;
  while (host.previousElementSibling && !host.previousElementSibling.classList.contains('preview-wrap')) {
    host.previousElementSibling.remove();
  }
  host.innerHTML = '';
}

function loadExample(id) {
  const ex = EXAMPLES.find(e => e.id === id);
  if (!ex || ex === currentExample) return;

  destroyCurrent();
  currentExample = ex;

  // sidebar active
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.id === id);
  });

  // header
  titleEl.textContent = ex.label;
  descEl.textContent  = ex.desc;

  // code
  codeDisplay.innerHTML = highlight(ex.code);

  // grid
  const el = document.createElement('div');
  el.style.cssText = 'width:100%;height:100%;';
  gridHost.appendChild(el);

  try {
    currentGrid = ex.setup(el);
  } catch (err) {
    el.textContent = `Error: ${err.message}`;
    console.error(err);
  }

  // update URL hash
  history.replaceState(null, '', `#${id}`);
}

// ── Copy button ───────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  const code = currentExample?.code ?? '';
  navigator.clipboard.writeText(code).then(() => {
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
      copyBtn.classList.remove('copied');
    }, 1500);
  });
});

// ── Theme toggle ──────────────────────────────────────────────────
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  themeBtn.textContent = theme === 'dark' ? '☀' : '☾';
  localStorage.setItem('hg-showcase-theme', theme);
  // gridHost를 조상으로 두면 .ck-zenith-grid-theme-dark .ck-zenith-grid-row-odd 등
  // 모든 하위 선택자가 올바르게 동작한다.
  gridHost.classList.toggle('ck-zenith-grid-theme-dark', theme === 'dark');
}

themeBtn.addEventListener('click', () => {
  const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

// ── Init ──────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('hg-showcase-theme') || 'dark';
applyTheme(savedTheme);

buildSidebar();

const initialId = location.hash.slice(1) || EXAMPLES[0].id;
loadExample(initialId);
