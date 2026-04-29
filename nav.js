/* Board Gaming Hub — global sticky nav with search + Games dropdown.
 * Single self-contained file. Drop a `<script src="/nav.js" defer></script>`
 * before `</body>` on every page. Builds DOM at runtime so we don't have to
 * maintain a `<header>` block in every game's HTML.
 */
(function () {
  'use strict';

  const GAMES = [
    // Puzzles & Classics
    { slug:'Solitaire',                 name:'Solitaire',           cat:'puzzles', desc:'Klondike — the classic card game',     keys:['cards','klondike','patience','solitaire','classic'] },
    { slug:'Wordform',                  name:'Wordform',            cat:'puzzles', desc:'Daily 5-letter word puzzle',            keys:['word','wordle','letter','daily','vocabulary'] },
    { slug:'Drift',                     name:'Drift',               cat:'puzzles', desc:'Daily word ladder',                     keys:['word','ladder','daily','vocabulary','original'] },
    { slug:'Sudoku',                    name:'Sudoku',              cat:'puzzles', desc:'Place 1–9, easy to expert',             keys:['logic','number','grid','classic'] },
    { slug:'Mahjong',                   name:'Mahjong',             cat:'puzzles', desc:'Solitaire tile matching',               keys:['tile','matching','asian','solitaire'] },
    { slug:'Chess',                     name:'Chess',               cat:'puzzles', desc:'The royal game',                        keys:['chess','board','strategy','classic','royal'] },
    { slug:'2048',                      name:'2048',                cat:'puzzles', desc:'Slide & merge tiles',                   keys:['merge','tile','number','slide','arcade'] },
    { slug:'Minesweeper',               name:'Minesweeper',         cat:'puzzles', desc:'Find the mines, beginner to expert',    keys:['mines','grid','flag','classic'] },

    // Board Games
    { slug:'Agora',                     name:'Agora',               cat:'board',   desc:'Mediterranean trade',                   keys:['ancient','greek','trade','strategy','original'] },
    { slug:'Aresia',                    name:'Aresia',              cat:'board',   desc:'Colonize the Red Frontier',             keys:['mars','colony','strategy','original'] },
    { slug:'Backgammon',                name:'Backgammon',          cat:'board',   desc:'Classic dice & race',                   keys:['dice','race','classic'] },
    { slug:'Bisque',                    name:'Bisque',              cat:'board',   desc:'Battle for the Bay',                    keys:['naval','strategy','original','war'] },
    { slug:'Convergence',               name:'Convergence',         cat:'board',   desc:'Rival civilizations, shared economy',   keys:['civilization','strategy','original','economy'] },
    { slug:'Go',                        name:'Go',                  cat:'board',   desc:'Territory & influence, 19×19',          keys:['go','asian','classic','territory','baduk'] },
    { slug:'Mancala',                   name:'Mancala',             cat:'board',   desc:'Ancient count-and-capture',             keys:['ancient','african','count','classic'] },
    { slug:'Odyssey',                   name:'Odyssey',             cat:'board',   desc:'Upon the wine-dark sea',                keys:['ancient','greek','sea','original','homer'] },
    { slug:'Othello',                   name:'Othello',             cat:'board',   desc:'Flip to claim the board',               keys:['othello','reversi','classic','flip'] },
    { slug:'PenteGrammai',              name:'Pente Grammai',       cat:'board',   desc:'Ancient Greek five-lines game',         keys:['ancient','greek','classic','five lines'] },
    { slug:'Senet',                     name:'Senet',               cat:'board',   desc:'Ancient Egyptian racing',               keys:['egyptian','ancient','classic','race'] },
    { slug:'Tidelands',                 name:'Tidelands',           cat:'board',   desc:'Bronze-age maritime trade',             keys:['ancient','bronze','sea','original','trade'] },
    { slug:'Ur',                        name:'Ur',                  cat:'board',   desc:'The Royal Game of Ur',                  keys:['mesopotamian','royal','ancient','race','classic'] },

    // Simulations
    { slug:'Apoapsis',                  name:'Apoapsis',            cat:'sims',    desc:'3D rocket flight sim',                  keys:['rocket','space','3d','simulation','orbital'] },
    { slug:'BiosphereBlue',             name:'Biosphere Blue',      cat:'sims',    desc:'Planet-scale geosim',                   keys:['planet','climate','geosim','simulation','earth'] },
    { slug:'BonnevilleSpillwayOperator',name:'Bonneville Spillway', cat:'sims',    desc:'Columbia River dam operator',           keys:['dam','spillway','river','engineering','simulation','hydraulic'] },
    { slug:'Cliffwalkers',              name:'Cliffwalkers',        cat:'sims',    desc:'Save the wee folk',                     keys:['lemmings','puzzle','arcade'] },
    { slug:'Doctrine',                  name:'Doctrine',            cat:'sims',    desc:'Geopolitical sim 1990–2050',            keys:['geopolitical','history','simulation','war','strategy'] },
    { slug:'Floodline',                 name:'Floodline',           cat:'sims',    desc:'California flood defense',              keys:['flood','defense','engineering','simulation','water'] },
    { slug:'Tower',                     name:'Tower',               cat:'sims',    desc:'High-rise operations',                  keys:['tower','building','simulation','tycoon','skyscraper'] }
  ];

  const CATS = [
    { id:'puzzles', label:'Puzzles & Classics' },
    { id:'board',   label:'Board Games' },
    { id:'sims',    label:'Simulations' }
  ];

  // ─── styles (parchment / dark-navy aesthetic, matches existing site) ───
  const css = `
.bgh-head{position:sticky;top:0;z-index:200;background:linear-gradient(180deg,#0c1016 0%,#10161f 100%);border-bottom:1px solid #2a3540;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-family:Georgia,'Times New Roman',serif;}
.bgh-head-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:18px;padding:10px 24px;flex-wrap:wrap;}
.bgh-logo{color:#f0d89c;font-weight:700;font-size:1.05em;letter-spacing:5px;text-decoration:none;flex:0 0 auto;text-transform:uppercase;}
.bgh-logo:hover{color:#f7e6b8;text-decoration:none;}
.bgh-search-wrap{flex:1 1 260px;position:relative;min-width:200px;max-width:440px;}
.bgh-search{width:100%;padding:7px 12px 7px 32px;background:#141c28 url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238098a8' stroke-width='2.5'><circle cx='11' cy='11' r='7'/><path d='m20 20-3.5-3.5'/></svg>") 10px center / 14px no-repeat;border:1px solid #2a3540;border-radius:4px;color:#d8d0c0;font:inherit;font-size:0.9em;font-family:Georgia,'Times New Roman',serif;}
.bgh-search::placeholder{color:#8098a8;font-style:italic;}
.bgh-search:focus{outline:none;border-color:#f0d89c;background-color:#1a2434;}
.bgh-results{display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#141c28;border:1px solid #2a3540;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,0.5);max-height:420px;overflow-y:auto;z-index:300;}
.bgh-hit{display:block;padding:9px 14px;border-bottom:1px solid #1f2a36;text-decoration:none;color:#d8d0c0;}
.bgh-hit:last-child{border-bottom:none;}
.bgh-hit:hover,.bgh-hit.active{background:#1e2838;color:#f0d89c;text-decoration:none;}
.bgh-hit-name{display:block;font-weight:700;font-size:0.95em;color:#f0d89c;letter-spacing:1px;}
.bgh-hit-cat{display:block;font-size:0.7em;color:#5a7090;text-transform:uppercase;letter-spacing:2px;margin-top:1px;}
.bgh-hit-desc{display:block;font-size:0.82em;color:#a8b0c0;margin-top:2px;font-style:italic;}
.bgh-nav{display:flex;align-items:center;gap:6px;flex:0 0 auto;}
.bgh-nav>a{color:#d8d0c0;font-size:0.88em;letter-spacing:1px;text-decoration:none;padding:6px 12px;border-radius:4px;}
.bgh-nav>a:hover{color:#f0d89c;background:#1a2434;text-decoration:none;}
.bgh-dd{position:relative;}
.bgh-dd>summary{list-style:none;cursor:pointer;color:#d8d0c0;font-size:0.88em;letter-spacing:1px;padding:6px 12px;border-radius:4px;transition:background 0.12s,color 0.12s;user-select:none;font-weight:500;}
.bgh-dd>summary::-webkit-details-marker{display:none;}
.bgh-dd>summary:hover{background:#1a2434;color:#f0d89c;}
.bgh-dd[open]>summary{background:#1a2434;color:#f0d89c;}
.bgh-dd-caret{display:inline-block;margin-left:4px;font-size:0.85em;transition:transform 0.12s;}
.bgh-dd[open] .bgh-dd-caret{transform:rotate(180deg);}
.bgh-dd-panel{position:absolute;top:calc(100% + 8px);right:0;background:#141c28;border:1px solid #2a3540;border-radius:4px;box-shadow:0 12px 32px rgba(0,0,0,0.55);padding:18px 20px;display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:18px 24px;min-width:600px;max-width:90vw;z-index:300;}
.bgh-dd-col h4{margin:0 0 8px;color:#f0d89c;font-size:0.7em;letter-spacing:3px;text-transform:uppercase;font-weight:600;border-bottom:1px solid #2a3540;padding-bottom:6px;}
.bgh-dd-col a{display:block;padding:5px 0;color:#d8d0c0;text-decoration:none;font-size:0.92em;letter-spacing:0.5px;}
.bgh-dd-col a:hover{color:#f0d89c;text-decoration:none;}
@media (max-width:780px){
  .bgh-head-inner{padding:9px 14px;gap:10px;}
  .bgh-search-wrap{flex:1 1 100%;order:3;max-width:none;}
  .bgh-dd-panel{grid-template-columns:1fr 1fr;min-width:340px;}
  .bgh-logo{font-size:0.95em;letter-spacing:3px;}
}
@media (max-width:480px){
  .bgh-dd-panel{grid-template-columns:1fr;min-width:240px;}
}
@media print{ .bgh-head{display:none;} }
`;

  function elt(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of children) {
      if (c == null) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

  function score(game, q) {
    if (!q) return 0;
    const Q = q.toLowerCase();
    const name = game.name.toLowerCase();
    if (name === Q) return 1000;
    if (name.startsWith(Q)) return 500;
    if (name.includes(Q)) return 200;
    let s = 0;
    for (const k of game.keys) {
      const K = k.toLowerCase();
      if (K === Q) s += 80;
      else if (K.startsWith(Q)) s += 40;
      else if (K.includes(Q)) s += 15;
    }
    if (game.desc.toLowerCase().includes(Q)) s += 10;
    return s;
  }

  function search(q) {
    if (!q || q.length < 1) return [];
    return GAMES
      .map(g => ({ game: g, s: score(g, q) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map(x => x.game);
  }

  function buildHeader() {
    const styleEl = elt('style', null);
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const searchInput = elt('input', { type:'search', class:'bgh-search', placeholder:'Search games — try "chess" or "ancient"…', 'aria-label':'Search games' });
    const resultsBox = elt('div', { class:'bgh-results', role:'listbox' });
    const searchWrap = elt('div', { class:'bgh-search-wrap' }, searchInput, resultsBox);

    let activeIdx = -1;
    let lastHits = [];
    function renderHits(q) {
      const hits = search(q);
      lastHits = hits;
      activeIdx = -1;
      if (!hits.length) { resultsBox.style.display = 'none'; resultsBox.innerHTML = ''; return; }
      resultsBox.innerHTML = '';
      hits.forEach((g, i) => {
        const cat = (CATS.find(c => c.id === g.cat) || {}).label || '';
        const row = elt('a', { class:'bgh-hit', href:'/' + g.slug + '.html', role:'option' });
        row.appendChild(elt('span', { class:'bgh-hit-name' }, g.name));
        row.appendChild(elt('span', { class:'bgh-hit-cat' }, cat));
        row.appendChild(elt('span', { class:'bgh-hit-desc' }, g.desc));
        resultsBox.appendChild(row);
      });
      resultsBox.style.display = 'block';
    }
    function setActive(i) {
      const items = resultsBox.querySelectorAll('.bgh-hit');
      items.forEach(it => it.classList.remove('active'));
      if (i >= 0 && i < items.length) {
        items[i].classList.add('active');
        items[i].scrollIntoView({ block:'nearest' });
      }
      activeIdx = i;
    }
    searchInput.addEventListener('input', e => renderHits(e.target.value));
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, lastHits.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
      else if (e.key === 'Enter') {
        if (activeIdx >= 0 && lastHits[activeIdx]) {
          window.location.href = '/' + lastHits[activeIdx].slug + '.html';
        } else if (lastHits[0]) {
          window.location.href = '/' + lastHits[0].slug + '.html';
        }
      } else if (e.key === 'Escape') {
        resultsBox.style.display = 'none'; searchInput.blur();
      }
    });
    document.addEventListener('click', e => {
      if (!searchWrap.contains(e.target)) resultsBox.style.display = 'none';
    });
    // "/" keyboard shortcut to focus search (skip when typing in inputs / textareas)
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement && document.activeElement.tagName)) {
        e.preventDefault(); searchInput.focus();
      }
    });

    // Games dropdown — categorized
    const ddSummary = elt('summary', null, 'Games ', elt('span', { class:'bgh-dd-caret' }, '▾'));
    const ddPanel = elt('div', { class:'bgh-dd-panel' });
    CATS.forEach(c => {
      const col = elt('div', { class:'bgh-dd-col' });
      col.appendChild(elt('h4', null, c.label));
      GAMES.filter(g => g.cat === c.id).forEach(g => {
        col.appendChild(elt('a', { href:'/' + g.slug + '.html' }, g.name));
      });
      ddPanel.appendChild(col);
    });
    const dd = elt('details', { class:'bgh-dd' }, ddSummary, ddPanel);
    // Auto-close on outside click
    document.addEventListener('click', e => { if (!dd.contains(e.target)) dd.removeAttribute('open'); });

    const nav = elt('nav', { class:'bgh-nav' }, dd, elt('a', { href:'/about.html' }, 'About'));

    const inner = elt('div', { class:'bgh-head-inner' },
      elt('a', { class:'bgh-logo', href:'/' }, 'Board Gaming'),
      searchWrap,
      nav
    );
    return elt('header', { class:'bgh-head' }, inner);
  }

  function inject() {
    if (document.querySelector('.bgh-head')) return;     // idempotent
    const header = buildHeader();
    document.body.insertBefore(header, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
