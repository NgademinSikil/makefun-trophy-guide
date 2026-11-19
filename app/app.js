// Leonida Trophy Guide: checklist, filters, spoiler setting, roadmap and
// sourced per-trophy guides for all 55 GTA VI PS5 trophies. Everything runs
// offline from app/data/trophies.json; progress lives in localStorage only.
const STORAGE_KEY = 'leonida-trophy-guide-v1';
const KIND_LABELS = {
  all: 'All kinds', story: 'Story', missable: 'Missable', collectibles: 'Collectibles',
  activities: 'Activities', robbery: 'Robbery', exploration: 'Exploration',
  completion: '100% & Platinum', platinum: 'Platinum', online: 'Online',
};
const KIND_ORDER = ['all', 'story', 'missable', 'collectibles', 'activities', 'robbery', 'exploration', 'completion', 'online'];

const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sources = doc.sources ?? {};

const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
const state = {
  earned: new Set(Array.isArray(saved.earned) ? saved.earned.filter((n) => trophies.some((t) => t.name === n)) : []),
  hideSpoilers: saved.hideSpoilers ?? (params.get('spoilers') !== 'off'),
  hideEarned: saved.hideEarned ?? false,
  kind: params.get('kind') && KIND_LABELS[params.get('kind')] ? params.get('kind') : 'all',
  grade: 'all',
  query: '',
  selectedId: Number(params.get('open')) || 28,
  view: params.get('view') && ['checklist', 'roadmap', 'missable', 'sources'].includes(params.get('view')) ? params.get('view') : 'checklist',
};

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailEl = $('detail');

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    earned: [...state.earned], hideSpoilers: state.hideSpoilers, hideEarned: state.hideEarned,
  }));
}

function isStorySpoiler(t) {
  return t.hidden && t.kind === 'story' && !state.earned.has(t.name);
}
function spoilerHidden(t) {
  return state.hideSpoilers && isStorySpoiler(t);
}
function gradeLabel(t) {
  return t.grade === 'platinum' ? 'Platinum' : t.grade[0].toUpperCase() + t.grade.slice(1);
}

function visibleTrophies() {
  const q = state.query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind === 'online') return false;
    if (state.kind === 'missable' && !t.missable && !t.time_sensitive) return false;
    if (state.kind !== 'all' && state.kind !== 'missable' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.hideEarned && state.earned.has(t.name)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderProgress() {
  const n = state.earned.size;
  const total = trophies.length;
  $('progressText').textContent = `${n} of ${total} earned`;
  $('progressPct').textContent = `${Math.round((n / total) * 100)}%`;
  $('progressFill').style.width = `${(n / total) * 100}%`;
  const counts = {};
  for (const t of trophies) counts[t.grade] = (counts[t.grade] ?? 0) + (state.earned.has(t.name) ? 1 : 0);
  $('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${counts[g] ?? 0}/${trophies.filter((t) => t.grade === g).length} ${g}`)
    .join(' · ');
}

function renderChips() {
  const box = $('kindChips');
  box.replaceChildren();
  for (const kind of KIND_ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.kind === kind ? ' active' : '');
    b.textContent = KIND_LABELS[kind];
    b.setAttribute('aria-pressed', String(state.kind === kind));
    b.addEventListener('click', () => { state.kind = kind; renderChips(); renderList(); });
    box.append(b);
  }
}

function renderList() {
  const shown = visibleTrophies();
  $('onlineNote').hidden = state.kind !== 'online';
  $('listMeta').textContent = state.kind === 'online'
    ? '0 trophies — Grand Theft Auto VI has no online trophies.'
    : `Showing ${shown.length} of ${trophies.length} trophies` +
      (state.hideSpoilers ? ' · story spoilers hidden until earned' : ' · spoilers shown');
  listEl.replaceChildren();
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy' + (state.earned.has(t.name) ? ' earned' : '') + (state.selectedId === t.id ? ' selected' : '');
    const hidden = spoilerHidden(t);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${hidden ? 'hidden story trophy' : t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) state.earned.add(t.name); else state.earned.delete(t.name);
      persist(); renderProgress(); renderList(); renderDetail();
    });

    const body = document.createElement('button');
    body.type = 'button';
    body.className = 'trophy-body';
    body.addEventListener('click', () => { state.selectedId = t.id; renderList(); renderDetail(); });

    const name = document.createElement('span');
    name.className = 'trophy-name';
    name.textContent = hidden ? 'Hidden story trophy' : t.name;
    const desc = document.createElement('span');
    desc.className = 'trophy-desc';
    desc.textContent = hidden ? 'Hidden until earned — spoiler setting is on.' : t.description;
    const meta = document.createElement('span');
    meta.className = 'trophy-meta';
    const grade = document.createElement('span');
    grade.className = `grade grade-${t.grade}`;
    grade.textContent = gradeLabel(t);
    meta.append(grade);
    const kind = document.createElement('span');
    kind.className = 'kind-tag';
    kind.textContent = KIND_LABELS[t.kind] ?? t.kind;
    meta.append(kind);
    if (t.gamerscore > 0) {
      const gs = document.createElement('span');
      gs.className = 'gamerscore';
      gs.textContent = `${t.gamerscore}G`;
      meta.append(gs);
    }
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'flag flag-missable';
      m.textContent = '⚠ Missable';
      meta.append(m);
    }
    if (t.time_sensitive) {
      const m = document.createElement('span');
      m.className = 'flag flag-time';
      m.textContent = '◷ Time-sensitive';
      meta.append(m);
    }
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'flag flag-hidden';
      h.textContent = 'Hidden';
      meta.append(h);
    }
    body.append(name, desc, meta);
    li.append(box, body);
    listEl.append(li);
  }
  if (!shown.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No trophies match these filters.';
    listEl.append(li);
  }
}

function sourceLink(key) {
  const s = sources[key];
  if (!s) return document.createTextNode(key);
  const a = document.createElement('a');
  a.href = s.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = s.name;
  return a;
}

function renderDetail() {
  const t = trophies.find((x) => x.id === state.selectedId) ?? trophies[0];
  detailEl.replaceChildren();
  const hidden = spoilerHidden(t);
  const h = document.createElement('h2');
  h.textContent = hidden ? 'Hidden story trophy' : t.name;
  detailEl.append(h);

  const badges = document.createElement('p');
  badges.className = 'detail-badges';
  const grade = document.createElement('span');
  grade.className = `grade grade-${t.grade}`;
  grade.textContent = gradeLabel(t) + (t.gamerscore > 0 ? ` · ${t.gamerscore}G` : '');
  badges.append(grade);
  detailEl.append(badges);

  if (hidden) {
    const p = document.createElement('p');
    p.className = 'spoiler-note';
    p.textContent = 'This is a hidden story trophy. Its name, description and guide stay hidden until you earn it — turn “Hide story spoilers” off to reveal it, or tick it off once earned.';
    detailEl.append(p);
    return;
  }

  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = `Official description: “${t.description}”`;
  detailEl.append(official);

  const srcLine = document.createElement('p');
  srcLine.className = 'detail-sources-line';
  srcLine.textContent = 'Sources: ';
  (t.sources ?? []).forEach((key, i) => {
    if (i > 0) srcLine.append(document.createTextNode(' · '));
    srcLine.append(sourceLink(key));
  });
  detailEl.append(srcLine);

  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = `⚠ Missable — ${t.missable_note ?? 'this trophy can be missed.'}`;
    detailEl.append(warn);
  }
  if (t.time_sensitive) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = '◷ Time-sensitive — do the Yago race the moment it appears in Chapter 3 (hourglass icon).';
    detailEl.append(warn);
  }

  const guideTitle = document.createElement('h3');
  guideTitle.textContent = 'How to earn it';
  detailEl.append(guideTitle);
  const guide = document.createElement('p');
  guide.textContent = t.guide;
  detailEl.append(guide);

  if (Array.isArray(t.steps) && t.steps.length) {
    const ol = document.createElement('ol');
    ol.className = 'steps';
    for (const s of t.steps) {
      const li = document.createElement('li');
      li.textContent = s;
      ol.append(li);
    }
    detailEl.append(ol);
  }

  const meta = document.createElement('p');
  meta.className = 'detail-meta';
  meta.textContent = `Kind: ${KIND_LABELS[t.kind] ?? t.kind} · Roadmap stage ${t.stage} of 5 · ${t.hidden ? 'Hidden on PlayStation until earned' : 'Visible on PlayStation from the start'}`;
  detailEl.append(meta);

  const srcTitle = document.createElement('h3');
  srcTitle.textContent = 'Sources for this guide';
  detailEl.append(srcTitle);
  const srcList = document.createElement('ul');
  srcList.className = 'detail-sources';
  for (const key of t.sources ?? []) {
    const li = document.createElement('li');
    li.append(sourceLink(key));
    srcList.append(li);
  }
  const note = document.createElement('li');
  note.textContent = 'Trophy name, description and grade: the official PS5 list, cross-checked on all four sources (see Sources tab).';
  srcList.append(note);
  detailEl.append(srcList);

  const earn = document.createElement('button');
  earn.type = 'button';
  earn.className = 'earn-btn';
  earn.textContent = state.earned.has(t.name) ? '✓ Earned — tick off' : 'Mark as earned';
  earn.addEventListener('click', () => {
    if (state.earned.has(t.name)) state.earned.delete(t.name); else state.earned.add(t.name);
    persist(); renderProgress(); renderList(); renderDetail();
  });
  detailEl.append(earn);
}

function renderRoadmap() {
  const ol = $('roadmapList');
  ol.replaceChildren();
  for (const stage of doc.roadmap ?? []) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.textContent = stage.title;
    const p = document.createElement('p');
    p.textContent = stage.text;
    li.append(h, p);
    ol.append(li);
  }
}

function renderMissable() {
  const box = $('missableList');
  box.replaceChildren();
  for (const t of trophies.filter((x) => x.missable || x.time_sensitive)) {
    const card = document.createElement('article');
    card.className = 'missable-card';
    const h = document.createElement('h3');
    h.textContent = `${t.missable ? '⚠ Missable' : '◷ Time-sensitive'} — ${t.name}`;
    const p = document.createElement('p');
    p.textContent = t.guide;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Open its guide';
    btn.addEventListener('click', () => { state.selectedId = t.id; showView('checklist'); renderList(); renderDetail(); });
    card.append(h, p, btn);
    box.append(card);
  }
}

function renderSources() {
  const ul = $('sourceList');
  ul.replaceChildren();
  for (const [key, s] of Object.entries(sources)) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    const p = document.createElement('p');
    p.textContent = s.verifies;
    li.append(a, p);
    ul.append(li);
  }
}

function showView(view) {
  state.view = view;
  for (const v of ['checklist', 'roadmap', 'missable', 'sources']) {
    $(`view-${v}`).hidden = v !== view;
    $(`tab-${v}`).classList.toggle('active', v === view);
  }
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => showView(tab.dataset.view));
}
$('search').addEventListener('input', (e) => { state.query = e.target.value; renderList(); });
$('gradeFilter').addEventListener('change', (e) => { state.grade = e.target.value; renderList(); });
$('hideEarned').checked = state.hideEarned;
$('hideEarned').addEventListener('change', (e) => { state.hideEarned = e.target.checked; persist(); renderList(); });
$('hideSpoilers').checked = state.hideSpoilers;
$('hideSpoilers').addEventListener('change', (e) => { state.hideSpoilers = e.target.checked; persist(); renderList(); renderDetail(); });

$('exportBtn').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', platform: 'PlayStation 5', exported: new Date().toISOString(), earned: [...state.earned] };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('bad file');
    const valid = names.filter((n) => trophies.some((t) => t.name === n));
    if (!valid.length && names.length) throw new Error('no known trophies');
    state.earned = new Set(valid);
    persist(); renderProgress(); renderList(); renderDetail();
    $('listMeta').textContent = `Imported ${valid.length} earned trophies from ${file.name}.`;
  } catch {
    $('listMeta').textContent = `Could not import ${file.name}: not a progress file from this guide.`;
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies in this browser?')) return;
  state.earned = new Set();
  persist(); renderProgress(); renderList(); renderDetail();
});

renderProgress();
renderChips();
renderList();
renderDetail();
renderRoadmap();
renderMissable();
renderSources();
showView(state.view);
window.__shotReady = true;
