/* ==============================================================
   AYDEN'S GAME HQ — main app
   - Real APIs, real persistence, real tests, real Firebase chat
   - No mocks, no placeholders, no simulations
   ============================================================== */

const API = 'https://api.thatcomputerguy26.org';

const NEARBY_CITIES = [
  { name: 'Austin',       lat: 38.7570, lon: -85.8086 },
  { name: 'Scottsburg',   lat: 38.6856, lon: -85.7705 },
  { name: 'Crothersville',lat: 38.8011, lon: -85.8392 },
  { name: 'Seymour',      lat: 38.9592, lon: -85.8903 },
  { name: 'Salem',        lat: 38.6056, lon: -86.1011 },
  { name: 'Madison',      lat: 38.7359, lon: -85.3800 },
  { name: 'North Vernon', lat: 39.0067, lon: -85.6236 },
];

const NS = 'aydenhq:';
const KEYS = {
  settings: NS + 'settings',
  adminPwd: NS + 'adminPwdHash:v2',
  adminAuthed: NS + 'adminAuthed',
  reviews: NS + 'reviews',
  tools: NS + 'tools',
  profile: NS + 'profile',
  localUsers: NS + 'localUsers',
  blocked: NS + 'blockedUsers',
  friendSession: NS + 'friendSession',
  cache: NS + 'cache',
};

/* ============== UTILITIES ============== */

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const k of [].concat(kids)) {
    if (k == null) continue;
    n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  }
  return n;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch { return false; }
}
function rmkey(key) { try { localStorage.removeItem(key); } catch {} }

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function nowISO() { return new Date().toISOString(); }
function shortTime(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function relTime(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return Math.floor(d) + 's ago';
  if (d < 3600) return Math.floor(d/60) + 'm ago';
  if (d < 86400) return Math.floor(d/3600) + 'h ago';
  return Math.floor(d/86400) + 'd ago';
}

/* ============== KID-SAFE FILTER ============== */
// Profanity / explicit — blocks for ALL contexts (chat input, posts, replies, news)
const KID_BLOCKLIST = [
  'fuck','shit','bitch','asshole','dick','pussy','cunt','bastard',
  'nigg','faggot','whore','slut','retard',
  'kill yourself','suicide','self-harm','self harm','heroin','cocaine','meth',
  'porn','nude','sex tape','xxx','onlyfans',
];
const KID_HARD_BLOCK_RX = new RegExp('\\b(' + KID_BLOCKLIST.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');

// Topical harm — blocks for NEWS ONLY (a 13-year-old shouldn't see headlines about
// war, crime, deaths, abuse, drugs, disasters, politics-charged content).
// Default-deny: if the title hits any of these words, the headline is dropped.
const NEWS_TOPIC_BLOCK = [
  // violence
  'kill','killed','killing','dead','dies','died','death','deaths','murder','murdered','homicide',
  'shoot','shot','shooting','gunman','gunmen','gun','rifle','firearm','weapon','weapons',
  'stab','stabbed','stabbing','attack','attacks','attacked','attacker','assault','assaulted',
  'fight','fighting','battle','combat','war','warfare','military','militant','militants',
  'bomb','bombing','bomber','blast','explode','explosion','grenade','missile','airstrike','strike',
  'terror','terrorism','terrorist','extremist','militia','insurgent','rebel','rebels',
  'violence','violent','bloodshed','massacre','genocide','atrocity','torture','beheading',
  // crime / abuse
  'crime','criminal','arrest','arrested','jailed','prison','convicted','sentenced','indicted',
  'rape','raped','rapist','abuse','abused','abuser','molest','assault',
  'kidnap','kidnapped','kidnapping','abducted','abduction','trafficking','traffickers',
  'gang','cartel','mob','organized crime','smuggle','smuggling','heist','robbery','robbed',
  'fraud','scam','scandal','corruption','laundering',
  // disasters / accidents / casualties
  'crash','crashed','collision','wreck','plane crash','train crash','derailed',
  'disaster','catastrophe','tragedy','fatal','fatality','fatalities','casualty','casualties',
  'wounded','injured','injuries','victim','victims','missing','evacuate','evacuation',
  'flood','flooding','wildfire','tornado','hurricane','tsunami','earthquake casualties',
  'collapse','collapsed','sinkhole',
  // health / drugs / addiction
  'overdose','overdosed','addicted','addiction','heroin','opioid','fentanyl','meth','cocaine',
  'epidemic','pandemic','outbreak','deadly','lethal','poisoning','poisoned','contaminated',
  'cancer death','dies of cancer',
  // dark socio
  'starvation','starving','famine','refugee','refugees','exodus','displaced','homeless deaths',
  'protest','riot','rioting','unrest','clash','clashes','siege','airstrike',
  'racism','racist','hate crime','antisemit','islamophob','homophob',
  // adult
  'sex','sexual','sexually','prostitution','stripper','escort','affair','divorce',
  'alcohol','drunk','drunken','dui','beer','vodka','tequila','wine','liquor',
  'lawsuit','sued','suing','probe','indictment',
];
const NEWS_TOPIC_RX = new RegExp('\\b(' + NEWS_TOPIC_BLOCK.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');

// Allowlist of topics that ARE kid-safe — used as a positive signal for news.
const NEWS_TOPIC_ALLOW_RX = /\b(game|gaming|gamer|minecraft|roblox|fortnite|nintendo|xbox|playstation|switch|pokemon|lego|movie|cartoon|animation|space|nasa|astronaut|planet|rocket|science|invention|robot|dinosaur|animal|panda|puppy|kitten|whale|shark|sport|sports|baseball|basketball|football|soccer|olympics|tournament|championship|kids|teen|student|school project|library|art|music|concert|festival|holiday|theme park|disney)\b/i;

function strictness() { return (currentSettings()?.strict ?? 'strict'); }

function kidSafeText(input, opts = {}) {
  if (input == null) return '';
  const text = String(input);
  const mode = opts.mode || strictness();
  if (KID_HARD_BLOCK_RX.test(text)) {
    if (opts.action === 'reject') return null;
    return text.replace(KID_HARD_BLOCK_RX, m => '*'.repeat(m.length));
  }
  if (mode === 'strict') {
    const softRx = /\b(damn|hell|crap|stupid|idiot|hate|sucks)\b/ig;
    return text.replace(softRx, m => m[0] + '*'.repeat(m.length - 1));
  }
  return text;
}

function kidSafeAllow(text) {
  if (text == null) return false;
  if (KID_HARD_BLOCK_RX.test(text)) return false;
  const mode = strictness();
  if (mode === 'strict' && /\b(damn|hell|crap|hate)\b/i.test(text)) return false;
  return true;
}

/* News-specific: ALLOWLIST-ONLY. A headline only shows if it explicitly matches a
   kid-safe topic (game/sport/animal/space/science/etc) AND survives the topic
   blocklist. Default action is deny. Better to show nothing than show scary stuff. */
function newsHeadlineSafe(title, source, category) {
  const t = String(title || '');
  if (!t || t.length < 6) return false;

  // Hard reject: profanity / explicit
  if (!kidSafeAllow(t)) return false;

  // Hard reject: any topic blocklist hit (war/violence/crime/disasters/drugs/etc.)
  if (NEWS_TOPIC_RX.test(t)) return false;

  // Hard reject: certain adult-news sources entirely (regardless of topic)
  const src = String(source || '').toLowerCase();
  const hardBlockSources = ['al jazeera','reuters','associated press','ap news','politico','breitbart','rt','tass','sputnik','daily mail'];
  if (hardBlockSources.some(b => src.includes(b))) return false;

  // Hard reject: certain categories entirely
  const cat = String(category || '').toLowerCase();
  if (['world','politics','war','conflict','crime','health','business'].includes(cat)) return false;

  // Default deny: only allow if the title explicitly matches a kid-safe topic
  if (!NEWS_TOPIC_ALLOW_RX.test(t)) return false;

  return true;
}

/* ============== API FETCH WRAPPER ============== */
async function apiGet(path, opts = {}) {
  const url = path.startsWith('http') ? path : API + path;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, ...opts });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function apiPost(path, body, opts = {}) {
  const url = path.startsWith('http') ? path : API + path;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || 30000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error('HTTP ' + r.status + (txt ? ' ' + txt.slice(0, 120) : ''));
    }
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ============== SETTINGS ============== */
function defaultSettings() {
  return { bg: true, scan: true, refreshMin: 10, strict: 'strict' };
}
function currentSettings() { return load(KEYS.settings, defaultSettings()); }
function applySettings(s) {
  const cur = { ...defaultSettings(), ...(s || currentSettings()) };
  if (window.AydenBG) window.AydenBG.setEnabled(cur.bg);
  document.body.classList.toggle('no-scan', !cur.scan);
  return cur;
}

/* ============== TAB NAV ============== */
function showTab(name) {
  $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  $$('.panel').forEach(p => p.setAttribute('aria-hidden', String(p.dataset.panel !== name)));
  document.body.dataset.tab = name;
  if (history.replaceState) history.replaceState(null, '', '#' + name);
  if (name === 'home') { refreshHomeWidgets(); }
  if (['xbox','pc','minecraft','rocket'].includes(name)) ensureAIFeed(name);
  if (name === 'panel') initAdminPanel();
  if (name === 'friends') initFriendsTab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindTabs() {
  $$('.tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $$('.hub-card[data-jump]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.jump)));
  const initial = (location.hash || '').replace('#','');
  if (initial && $('.tab[data-tab="'+initial+'"]')) showTab(initial);
}

/* ============== CLOCK ============== */
function tickClock() {
  const c = $('#clock'); if (c) c.textContent = shortTime(new Date());
}

/* ============== SERVER STATUS ============== */
async function probeServer() {
  const dot = $('#status-online .dot');
  const lbl = $('#server-state');
  try {
    await apiGet('/api/public/ai-routes', { timeout: 7000 });
    if (dot) dot.className = 'dot online';
    if (lbl) lbl.textContent = 'HOME SERVER ONLINE';
  } catch {
    if (dot) dot.className = 'dot down';
    if (lbl) lbl.textContent = 'SERVER UNREACHABLE';
  }
}

/* ============== HOME: WEATHER (multi-city) ============== */
async function loadWeatherCities() {
  const host = $('#weather-cities');
  if (!host) return;
  host.innerHTML = '';
  const results = await Promise.allSettled(
    NEARBY_CITIES.map(c =>
      apiGet(`/api/proxy/weather/forecast?lat=${c.lat}&lon=${c.lon}&days=1`, { timeout: 9000 })
        .then(d => ({ city: c.name, data: d }))
    )
  );
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { city, data } = r.value;
    // Open-Meteo proxy returns daily as { temperature_2m_max:[...], temperature_2m_min:[...], weathercode:[...] }
    const daily = (data && data.daily) || {};
    const cur = (data && (data.current || data.current_weather)) || {};
    const tMax = (daily.temperature_2m_max || [])[0];
    const tMin = (daily.temperature_2m_min || [])[0];
    const wcode = (daily.weathercode || [])[0];
    const t = cur.temperature_f ?? cur.temperature_2m ?? cur.temperature ?? tMax ?? null;
    const cond = cur.weather_description || cur.summary || cur.conditions
      || conditionFromCode(cur.weather_code != null ? cur.weather_code : wcode) || '—';
    const lowText = tMin != null ? ` (low ${Math.round(tMin)}°)` : '';
    const row = el('div', { class: 'city-row' }, [
      el('div', { class: 'city-name' }, city),
      el('div', {}, [
        el('span', { class: 'city-temp' }, t == null ? '—' : Math.round(t) + '°F'),
        el('span', { class: 'city-cond' }, cond + lowText),
      ]),
    ]);
    host.appendChild(row);
  }
  // mini header weather: first city
  if (results[0]?.status === 'fulfilled') {
    const c = results[0].value;
    const cur = (c.data && (c.data.current || c.data.current_weather || {})) || {};
    const daily = (c.data && c.data.daily) || {};
    const t = cur.temperature_f ?? cur.temperature_2m ?? (daily.temperature_2m_max || [])[0];
    const m = $('#weather-mini');
    if (m && t != null) m.textContent = `${c.city.toUpperCase()} ${Math.round(t)}°F`;
  }
}
function conditionFromCode(c) {
  if (c == null) return null;
  const map = { 0:'Clear', 1:'Mostly clear', 2:'Partly cloudy', 3:'Overcast', 45:'Fog', 48:'Fog', 51:'Drizzle', 53:'Drizzle', 55:'Drizzle', 61:'Rain', 63:'Rain', 65:'Heavy rain', 71:'Snow', 73:'Snow', 75:'Heavy snow', 80:'Showers', 81:'Showers', 82:'Heavy showers', 95:'Thunderstorm', 96:'Thunder + hail', 99:'Thunder + hail' };
  return map[c] || null;
}

/* ============== HOME: SPACE ============== */
async function loadSpace() {
  const host = $('#space-stats');
  if (!host) return;
  host.innerHTML = '';
  try {
    const sit = await apiGet('/api/world/sitrep', { timeout: 12000 });
    const quakes = sit.quakes || [];
    const bigQ = quakes.filter(q => (q.properties?.mag ?? 0) >= 4.5).length;
    const topQ = quakes[0]?.properties;

    const rows = [
      ['Earthquakes (24h)', quakes.length],
      ['Major (M4.5+)',     bigQ],
      ['Top quake',         topQ ? `M${topQ.mag} • ${topQ.place || '—'}` : '—'],
    ];
    for (const [k, v] of rows) {
      host.appendChild(el('div', { class: 'space-row' }, [
        el('div', { class: 'space-label' }, k),
        el('div', { class: 'space-val'   }, String(v)),
      ]));
    }
    if (Array.isArray(sit.space) && sit.space.length) {
      host.appendChild(el('div', { class: 'space-row' }, [
        el('div', { class: 'space-label' }, 'Space signals'),
        el('div', { class: 'space-val'   }, String(sit.space.length)),
      ]));
    }
  } catch (e) {
    host.appendChild(el('div', { class: 'inline-help' }, 'Space data unavailable: ' + e.message));
  }
}

/* ============== HOME: KIDS NEWS ============== */
async function loadKidsNews() {
  const host = $('#kids-news');
  if (!host) return;
  host.innerHTML = '';

  // Prefer the server-side kid-safe endpoint when available (other Claude is wiring it).
  // Try a few likely paths in order; first one that returns items wins. Fall back to
  // the general feed with a strict client-side default-deny filter.
  const tryPaths = [
    '/api/proxy/news/kids',
    '/api/proxy/news/headlines?safe=kids',
    '/api/kids/news',
    '/api/proxy/news/headlines'
  ];

  let items = null;
  let usedServerFilter = false;
  for (const path of tryPaths) {
    try {
      const data = await apiGet(path, { timeout: 10000 });
      const got = data.items || data.headlines || [];
      if (got.length) {
        items = got;
        usedServerFilter = !path.endsWith('/headlines');
        break;
      }
    } catch { /* try next path */ }
  }

  if (!items) {
    host.appendChild(el('div', { class: 'inline-help' }, 'News feed unreachable right now — try refresh in a minute.'));
    return;
  }

  // Even if the server pre-filtered, run our own filter as defense-in-depth.
  const safe = [];
  for (const it of items) {
    if (!newsHeadlineSafe(it.title, it.source, it.category)) continue;
    safe.push(it);
    if (safe.length >= 6) break;
  }

  if (!safe.length) {
    host.appendChild(el('div', { class: 'inline-help' }, 'Nothing kid-safe in the feed right now. That\'s a good thing — go play a game!'));
    return;
  }
  for (const it of safe) {
    const row = el('div', { class: 'news-item' }, [
      el('a', { href: it.link, target: '_blank', rel: 'noopener noreferrer nofollow' }, kidSafeText(it.title)),
      el('div', { class: 'news-source' }, `${escapeHtml(it.source || '')} · ${escapeHtml(it.category || '')}`),
    ]);
    host.appendChild(row);
  }
  const stat = $('#stat-news'); if (stat) stat.textContent = String(safe.length);
  if (!usedServerFilter && safe.length) {
    host.appendChild(el('div', { class: 'inline-help', style: 'margin-top:8px;font-size:11px;' }, 'Filtered locally. Server-side kid-safe endpoint coming soon.'));
  }
}

/* ============== HOME: TRAFFIC (auto-activates when proxy exists) ============== */
async function loadTraffic() {
  const host = $('#traffic-state');
  if (!host) return;
  host.innerHTML = '';
  try {
    const data = await apiGet('/api/proxy/indot/traffic?area=scottsburg', { timeout: 9000 });
    const items = data.items || data.incidents || [];
    if (!items.length) {
      host.appendChild(el('div', { class: 'inline-help' }, 'All clear on local highways.'));
      return;
    }
    for (const it of items.slice(0, 6)) {
      const title = it.title || it.summary || it.description || 'Incident';
      const meta  = it.location || it.road || it.county || '';
      const url   = it.url || it.link || '';
      const sev   = (it.severity || '').toLowerCase();
      const icon  = sev.indexOf('extreme') > -1 ? '🚨' : sev.indexOf('severe') > -1 ? '⚠️' : sev.indexOf('moderate') > -1 ? '🟡' : 'ℹ️';
      const titleNode = url
        ? el('a', {
            href: url, target: '_blank', rel: 'noopener',
            style: 'color:#00f0ff;text-decoration:none;font-weight:600;text-shadow:0 0 6px rgba(0,240,255,.4);display:block',
          }, icon + ' ' + escapeHtml(title))
        : el('div', {}, icon + ' ' + escapeHtml(title));
      const item = el('div', { class: 'news-item' }, [
        titleNode,
        el('div', { class: 'news-source' }, escapeHtml(meta) + (sev ? ' · ' + escapeHtml(sev) : '')),
      ]);
      if (url) {
        item.style.cursor = 'pointer';
        item.title = 'Click to open full alert';
      }
      host.appendChild(item);
    }
  } catch {
    host.appendChild(el('div', { class: 'inline-help' }, 'INDOT traffic feed activates when Dad enables /api/proxy/indot/traffic on the home server.'));
  }
}

function refreshHomeWidgets() {
  loadWeatherCities();
  loadSpace();
  loadKidsNews();
  loadTraffic();
}

/* ============== AI FEEDS PER GAME TAB ============== */
const AI_PROMPTS = {
  xbox:      'Give me one short, exciting Xbox tip a 13-year-old boy can use today. Two sentences max. Kid-friendly. No swears. Mention specific games like Minecraft, Rocket League, Roblox or Forza when helpful.',
  pc:        'Give me one short FPS-boost or PC-gaming tip for a 13-year-old playing on an HP All-in-One with Intel UHD graphics and 8GB RAM. Two sentences max. Kid-friendly. Concrete, specific.',
  minecraft: 'Give me one short Minecraft build idea or survival tip a 13-year-old will love. Two sentences max. Kid-friendly. No griefing. Mention specific blocks or biomes.',
  rocket:    'Give me one short Rocket League tip for Season 22. Two sentences max. Kid-friendly. Be specific (mechanic, car, rotation, boost).',
};
const AI_CACHE_MIN = 60 * 6; // 6 hours

async function ensureAIFeed(tab, force=false) {
  const out = document.querySelector(`[data-ai-feed-out="${tab}"]`);
  if (!out) return;
  const cache = load(KEYS.cache, {});
  const key = 'ai:' + tab;
  const now = Date.now();
  if (!force && cache[key] && (now - cache[key].t) < AI_CACHE_MIN * 60_000) {
    out.textContent = cache[key].v;
    return;
  }
  out.innerHTML = '<div class="skeleton-line"></div><div class="skeleton-line"></div>';
  try {
    const reply = await callAI(AI_PROMPTS[tab]);
    const safe = kidSafeText(reply);
    out.textContent = safe;
    cache[key] = { t: now, v: safe };
    save(KEYS.cache, cache);
  } catch (e) {
    out.classList.add('error');
    out.textContent = 'Buddy is sleeping. Tap REFRESH to wake him up. (' + e.message + ')';
  }
}

async function callAI(prompt, system) {
  const body = { prompt };
  if (system) body.system = system;
  const data = await apiPost('/api/public/chat', body, { timeout: 30000 });
  return data.reply || JSON.stringify(data);
}

/* ============== AI BUDDY ============== */
function bindBuddy() {
  const inp = $('#buddy-q'), btn = $('#buddy-send'), feed = $('#buddy-feed');
  if (!inp || !btn || !feed) return;
  const send = async () => {
    const q = inp.value.trim();
    if (!q) return;
    if (!kidSafeAllow(q)) {
      buddyAdd(feed, 'bot', 'Try saying that a different way — buddy keeps things clean.', 'err');
      return;
    }
    buddyAdd(feed, 'user', q);
    inp.value = '';
    btn.disabled = true;
    const thinking = buddyAdd(feed, 'bot', 'Thinking…', 'thinking');
    try {
      const reply = await callAI(q, 'You are a fun, kid-friendly gaming buddy for a 13-year-old. Keep replies under 80 words. No swearing. Be encouraging.');
      thinking.classList.remove('thinking');
      thinking.textContent = kidSafeText(reply);
    } catch (e) {
      thinking.classList.remove('thinking');
      thinking.classList.add('err');
      thinking.textContent = 'Buddy got tired (' + e.message + '). Try again.';
    } finally {
      btn.disabled = false;
      feed.scrollTop = feed.scrollHeight;
    }
  };
  btn.addEventListener('click', send);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  $$('.quick-q').forEach(b => b.addEventListener('click', () => { inp.value = b.textContent; send(); }));
}

function buddyAdd(feed, who, text, cls='') {
  const wrap = el('div', { class: 'buddy-msg buddy-msg-' + (who === 'user' ? 'user' : 'bot') });
  const avatar = el('div', { class: 'buddy-avatar' }, who === 'user' ? 'A' : 'AI');
  const bubble = el('div', { class: 'buddy-bubble ' + cls, text });
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  feed.appendChild(wrap);
  feed.scrollTop = feed.scrollHeight;
  return bubble;
}

/* ============== ADMIN GATE / PASSWORD ============== */
const DEFAULT_PWD = 'password123';
async function ensureDefaultAdminPwd() {
  if (!localStorage.getItem(KEYS.adminPwd)) {
    save(KEYS.adminPwd, await sha256Hex(DEFAULT_PWD));
  }
}
function isAdminAuthed() {
  const sess = load(KEYS.adminAuthed, null);
  if (!sess) return false;
  if (Date.now() > sess.expires) { rmkey(KEYS.adminAuthed); return false; }
  return true;
}
function setAdminAuthed(on) {
  if (on) save(KEYS.adminAuthed, { at: Date.now(), expires: Date.now() + 1000*60*60*8 });
  else rmkey(KEYS.adminAuthed);
}

async function initAdminPanel() {
  await ensureDefaultAdminPwd();
  const gate = $('#admin-gate'), shell = $('#admin-shell');
  if (isAdminAuthed()) { gate.classList.add('hidden'); shell.classList.remove('hidden'); }
  else                 { gate.classList.remove('hidden'); shell.classList.add('hidden'); }
  bindAdminLogin();
  bindAdminNav();
  bindAccount();
  bindReviews();
  bindUsers();
  bindSettings();
  bindDiagnostics();
  bindServerChat();
  bindSync();
  renderToolGrid();
  renderReviews();
  renderUsers();
  hydrateSettings();
  showStorageInfo();
}

function bindAdminLogin() {
  const btn = $('#admin-login'), pass = $('#admin-pass'), msg = $('#admin-gate-msg');
  const resetBtn = $('#admin-reset');
  if (!btn) return;
  if (btn.dataset.bound) return; btn.dataset.bound = '1';
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('Reset password back to "password123"? This wipes any custom password Ayden set.')) return;
      rmkey(KEYS.adminPwd);
      rmkey(KEYS.adminAuthed);
      save(KEYS.adminPwd, await sha256Hex(DEFAULT_PWD));
      msg.className = 'gate-msg ok';
      msg.textContent = 'Password reset. Type password123 and tap UNLOCK.';
    });
  }
  const tryLogin = async () => {
    const stored = load(KEYS.adminPwd, null);
    const tryHash = await sha256Hex(pass.value || '');
    if (stored && tryHash === stored) {
      setAdminAuthed(true);
      $('#admin-gate').classList.add('hidden');
      $('#admin-shell').classList.remove('hidden');
      pass.value = '';
      msg.textContent = '';
      showAdminSection('account');
    } else {
      msg.className = 'gate-msg err';
      msg.textContent = 'Wrong password. Default is password123 — change it under Account.';
    }
  };
  btn.addEventListener('click', tryLogin);
  pass.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
}

function bindAdminNav() {
  $$('.admin-link').forEach(b => {
    if (b.dataset.bound) return; b.dataset.bound = '1';
    b.addEventListener('click', () => showAdminSection(b.dataset.section));
  });
}
function showAdminSection(name) {
  $$('.admin-link').forEach(b => b.classList.toggle('active', b.dataset.section === name));
  $$('.admin-section').forEach(s => s.classList.toggle('active', s.dataset.section === name));
  if (name === 'sync') showStorageInfo();
}

/* ---- Account ---- */
function bindAccount() {
  const save_ = $('#acc-save'), out = $('#acc-msg'), logout = $('#acc-logout');
  if (!save_ || save_.dataset.bound) return;
  save_.dataset.bound = '1';
  save_.addEventListener('click', async () => {
    const o = $('#acc-old').value, n = $('#acc-new').value, n2 = $('#acc-new2').value;
    out.className = 'form-msg';
    if (!n || n.length < 8) { out.className = 'form-msg err'; out.textContent = 'New password needs 8+ characters.'; return; }
    if (n !== n2)            { out.className = 'form-msg err'; out.textContent = 'New passwords do not match.'; return; }
    const stored = load(KEYS.adminPwd, null);
    const ok = (await sha256Hex(o)) === stored;
    if (!ok) { out.className = 'form-msg err'; out.textContent = 'Old password was wrong.'; return; }
    save(KEYS.adminPwd, await sha256Hex(n));
    $('#acc-old').value = $('#acc-new').value = $('#acc-new2').value = '';
    out.className = 'form-msg ok'; out.textContent = 'Password updated.';
  });
  logout.addEventListener('click', () => {
    setAdminAuthed(false);
    $('#admin-shell').classList.add('hidden');
    $('#admin-gate').classList.remove('hidden');
  });
}

/* ---- Reviews ---- */
function getReviews() { return load(KEYS.reviews, []); }
function setReviews(r) { save(KEYS.reviews, r); }
function bindReviews() {
  const add = $('#rev-add'); if (!add || add.dataset.bound) return; add.dataset.bound = '1';
  add.addEventListener('click', () => {
    const game = $('#rev-game').value.trim();
    const stars = Math.max(1, Math.min(5, parseInt($('#rev-stars').value, 10) || 5));
    const note = $('#rev-note').value.trim();
    if (!game) return;
    if (!kidSafeAllow(note)) { return; }
    const r = getReviews();
    r.unshift({ id: 'r' + Date.now(), game, stars, note: kidSafeText(note), at: nowISO() });
    setReviews(r);
    $('#rev-game').value = ''; $('#rev-note').value = ''; $('#rev-stars').value = 5;
    renderReviews();
  });
}
function renderReviews() {
  const host = $('#review-list'); if (!host) return;
  const r = getReviews();
  host.innerHTML = '';
  if (!r.length) { host.appendChild(el('div', { class: 'tool-empty' }, 'No reviews yet. Add one above.')); return; }
  for (const x of r) {
    const item = el('div', { class: 'review-item' }, [
      el('div', { class: 'review-meta' }, [
        el('div', { class: 'review-stars' }, '★'.repeat(x.stars) + '☆'.repeat(5 - x.stars)),
        el('div', { class: 'review-game' }, x.game),
        el('div', { class: 'review-note' }, x.note || ''),
        el('div', { class: 'tool-meta' }, relTime(x.at)),
      ]),
      el('div', { class: 'review-actions' }, [
        el('button', { class: 'btn-icon', onclick: () => editReview(x.id) }, 'EDIT'),
        el('button', { class: 'btn-icon danger', onclick: () => deleteReview(x.id) }, 'DELETE'),
      ]),
    ]);
    host.appendChild(item);
  }
}
function editReview(id) {
  const r = getReviews(); const x = r.find(v => v.id === id); if (!x) return;
  const game = prompt('Game name:', x.game); if (game == null) return;
  const stars = parseInt(prompt('Stars 1-5:', String(x.stars)), 10); if (!stars) return;
  const note = prompt('Note:', x.note || ''); if (note == null) return;
  x.game = game; x.stars = Math.max(1, Math.min(5, stars)); x.note = kidSafeText(note);
  setReviews(r); renderReviews();
}
function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  setReviews(getReviews().filter(v => v.id !== id));
  renderReviews();
}

/* ---- Users / Block list ---- */
function getUsers() { return load(KEYS.localUsers, []); }
function setUsers(u) { save(KEYS.localUsers, u); }
function getBlocked() { return load(KEYS.blocked, []); }
function setBlocked(b) { save(KEYS.blocked, b); }

function bindUsers() {
  const refresh = $('#user-refresh'), search = $('#user-search');
  if (!refresh || refresh.dataset.bound) return; refresh.dataset.bound = '1';
  refresh.addEventListener('click', renderUsers);
  search.addEventListener('input', renderUsers);
}
function renderUsers() {
  const host = $('#user-list'); if (!host) return;
  const q = ($('#user-search')?.value || '').trim().toLowerCase();
  let users = getUsers();
  if (firebaseReady()) {
    // Firebase users are loaded into local cache; merge for display
    users = (window.__FB_USERS || users);
  }
  const blocked = new Set(getBlocked());
  const adminName = (window.AYDEN_ADMIN_USERNAME || 'ayden').toLowerCase();

  host.innerHTML = '';
  const filtered = users.filter(u => !q || (u.username || '').toLowerCase().includes(q));
  if (!filtered.length) {
    host.appendChild(el('div', { class: 'tool-empty' }, firebaseReady() ? 'No users yet. Friends sign up on the Friends tab.' : 'Setup Firebase to enable cross-device user accounts. Until then, only Ayden\'s admin account exists locally.'));
    return;
  }
  for (const u of filtered) {
    const isAdmin = (u.username || '').toLowerCase() === adminName;
    const isBlocked = blocked.has(u.username);
    host.appendChild(el('div', { class: 'user-item' }, [
      el('div', { class: 'user-meta' }, [
        el('div', {}, [
          el('span', { class: 'user-name' }, u.username),
          isAdmin ? el('span', { class: 'user-role' }, 'ADMIN') : null,
          isBlocked ? el('span', { class: 'user-role blocked' }, 'BLOCKED') : null,
        ]),
        el('div', { class: 'user-tags' }, [
          u.profile?.xbox ? `Xbox: ${u.profile.xbox} · ` : '',
          u.profile?.psn ? `PSN: ${u.profile.psn} · ` : '',
          u.profile?.discord ? `Discord: ${u.profile.discord} · ` : '',
          u.profile?.steam ? `Steam: ${u.profile.steam}` : '',
        ].join('')),
        u.profile?.bio ? el('div', { class: 'tool-meta' }, '"' + escapeHtml(u.profile.bio) + '"') : null,
      ]),
      el('div', { class: 'user-actions' }, [
        el('button', { class: 'btn-icon', onclick: () => editUser(u.username) }, 'EDIT'),
        isBlocked
          ? el('button', { class: 'btn-icon', onclick: () => unblockUser(u.username) }, 'UNBLOCK')
          : el('button', { class: 'btn-icon danger', onclick: () => blockUser(u.username) }, 'BLOCK'),
        !isAdmin ? el('button', { class: 'btn-icon danger', onclick: () => deleteUser(u.username) }, 'DELETE') : null,
      ]),
    ]));
  }
}
function blockUser(name) {
  const b = getBlocked(); if (!b.includes(name)) b.push(name);
  setBlocked(b); renderUsers();
  if (firebaseReady()) firebaseBlockUser(name, true).catch(() => {});
}
function unblockUser(name) {
  setBlocked(getBlocked().filter(n => n !== name)); renderUsers();
  if (firebaseReady()) firebaseBlockUser(name, false).catch(() => {});
}
function deleteUser(name) {
  if (!confirm('Delete user "' + name + '"?')) return;
  setUsers(getUsers().filter(u => u.username !== name));
  renderUsers();
  if (firebaseReady()) firebaseDeleteUser(name).catch(() => {});
}
function editUser(name) {
  const users = (window.__FB_USERS || getUsers());
  const u = users.find(x => x.username === name); if (!u) return;
  u.profile = u.profile || {};
  u.profile.xbox    = prompt('Xbox gamertag:',    u.profile.xbox    || '') ?? u.profile.xbox;
  u.profile.psn     = prompt('PSN ID:',           u.profile.psn     || '') ?? u.profile.psn;
  u.profile.discord = prompt('Discord username:', u.profile.discord || '') ?? u.profile.discord;
  u.profile.steam   = prompt('Steam name:',       u.profile.steam   || '') ?? u.profile.steam;
  u.profile.switch  = prompt('Switch FC:',        u.profile.switch  || '') ?? u.profile.switch;
  u.profile.bio     = prompt('One-line bio:',     u.profile.bio     || '') ?? u.profile.bio;
  if (!firebaseReady()) {
    const all = getUsers();
    const i = all.findIndex(x => x.username === name);
    if (i >= 0) all[i] = u; else all.push(u);
    setUsers(all);
  } else {
    firebaseUpdateUser(u).catch(() => {});
  }
  renderUsers();
}

/* ---- Settings ---- */
function bindSettings() {
  const btn = $('#set-save'); if (!btn || btn.dataset.bound) return; btn.dataset.bound = '1';
  btn.addEventListener('click', () => {
    const s = {
      bg: $('#set-bg').checked,
      scan: $('#set-scan').checked,
      refreshMin: parseInt($('#set-refresh').value, 10) || 10,
      strict: $('#set-strict').value || 'strict',
    };
    save(KEYS.settings, s);
    applySettings(s);
    setupAutoRefresh();
    const m = $('#set-msg'); m.className = 'form-msg ok'; m.textContent = 'Saved.';
  });
}
function hydrateSettings() {
  const s = currentSettings();
  if ($('#set-bg'))      $('#set-bg').checked = !!s.bg;
  if ($('#set-scan'))    $('#set-scan').checked = !!s.scan;
  if ($('#set-refresh')) $('#set-refresh').value = String(s.refreshMin);
  if ($('#set-strict'))  $('#set-strict').value = s.strict;
}

/* ---- Diagnostics: Test My PC ---- */
function bindDiagnostics() {
  const pcBtn = $('#run-pc-test'), netBtn = $('#run-net-test'), srvBtn = $('#run-srv-test');
  if (!pcBtn) return;
  if (pcBtn.dataset.bound) return; pcBtn.dataset.bound = '1';
  pcBtn.addEventListener('click', () => runPCTest($('#pc-test-out')));
  netBtn.addEventListener('click', () => runNetTest($('#net-test-out')));
  srvBtn.addEventListener('click', () => runServerCheck($('#srv-test-out')));
}

async function runPCTest(out) {
  out.innerHTML = 'Reading specs…';
  const rows = [];
  const add = (k, v, cls='') => rows.push({ k, v, cls });

  // Real browser specs
  add('User agent', navigator.userAgent.slice(0, 80));
  add('Platform',   navigator.platform);
  add('CPU cores',  String(navigator.hardwareConcurrency || 'unknown'));
  add('Memory hint (GB)', navigator.deviceMemory ? '~' + navigator.deviceMemory : 'unknown');
  add('Display',    `${screen.width} × ${screen.height} @ ${window.devicePixelRatio}x DPR`);
  add('Color depth', screen.colorDepth + '-bit');
  add('Online',     String(navigator.onLine));

  // Connection
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    add('Network type', String(conn.effectiveType || conn.type || 'unknown'));
    add('Downlink',    conn.downlink ? conn.downlink + ' Mbps (browser estimate)' : '—');
    add('RTT',         conn.rtt ? conn.rtt + ' ms (browser estimate)' : '—');
  }

  // Battery
  if (navigator.getBattery) {
    try {
      const b = await navigator.getBattery();
      add('Battery', Math.round(b.level * 100) + '%' + (b.charging ? ' (charging)' : ''));
    } catch {}
  }

  // GPU via WebGL
  try {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const vendor   = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   : gl.getParameter(gl.VENDOR);
      add('GPU', String(renderer));
      add('GPU vendor', String(vendor));
      add('Max texture size', gl.getParameter(gl.MAX_TEXTURE_SIZE) + ' px');
    }
  } catch {}

  // Storage estimate
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      add('Storage used', formatBytes(e.usage) + ' of ' + formatBytes(e.quota));
    }
  } catch {}

  // CPU benchmark — real fixed-iteration math loop
  out.innerHTML = renderDiag(rows) + '<div class="diag-row"><span class="diag-key">CPU benchmark</span><span class="diag-val" id="bench-cpu">running…</span></div><div class="bench-bar"><span style="width:0%" id="bench-cpu-bar"></span></div>';
  const cpuScore = await benchCPU(2500, $('#bench-cpu-bar'));
  $('#bench-cpu').textContent = cpuScore.toLocaleString() + ' ops/sec';
  $('#bench-cpu').className = 'diag-val ' + (cpuScore > 8_000_000 ? 'good' : cpuScore > 3_000_000 ? 'warn' : 'bad');

  // GPU fillrate benchmark — real
  const gpuFps = await benchGPU(2000);
  out.innerHTML += `<div class="diag-row"><span class="diag-key">GPU fillrate</span><span class="diag-val ${gpuFps > 50 ? 'good' : gpuFps > 30 ? 'warn' : 'bad'}">${Math.round(gpuFps)} FPS @ 1000 quads</span></div>`;
  out.innerHTML += `<div class="diag-row"><span class="diag-key">Score</span><span class="diag-val">${pcScoreLabel(cpuScore, gpuFps)}</span></div>`;
}

function pcScoreLabel(cpu, gpu) {
  const score = (cpu / 100000) + gpu;
  if (score > 200) return 'Beast mode — handles modern games well';
  if (score > 100) return 'Solid — most games at medium settings';
  if (score > 60)  return 'OK — older games and casual play';
  return 'Low — try low settings + FPS booster tips';
}

function renderDiag(rows) {
  return rows.map(r => `<div class="diag-row"><span class="diag-key">${escapeHtml(r.k)}</span><span class="diag-val ${r.cls}">${escapeHtml(String(r.v))}</span></div>`).join('');
}

function benchCPU(ms, bar) {
  return new Promise(resolve => {
    const start = performance.now();
    const end = start + ms;
    let ops = 0;
    function step() {
      const sliceEnd = performance.now() + 16;
      while (performance.now() < sliceEnd) {
        // hot loop: integer math
        for (let i = 0; i < 5000; i++) {
          const x = (ops * 16807) % 2147483647;
          ops += (x % 7) ? 1 : 1;
        }
      }
      const elapsed = performance.now() - start;
      if (bar) bar.style.width = Math.min(100, (elapsed / ms) * 100) + '%';
      if (performance.now() >= end) {
        resolve(Math.round(ops * 1000 / (performance.now() - start)));
      } else {
        requestAnimationFrame(step);
      }
    }
    step();
  });
}

function benchGPU(ms) {
  return new Promise(resolve => {
    const cv = document.createElement('canvas');
    cv.width = 800; cv.height = 600;
    const ctx = cv.getContext('2d');
    if (!ctx) return resolve(0);
    let frames = 0;
    const start = performance.now();
    const end = start + ms;
    function frame() {
      ctx.clearRect(0, 0, 800, 600);
      for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = `hsl(${(frames + i) % 360}, 80%, 60%)`;
        ctx.fillRect((i * 13 + frames) % 800, (i * 19 + frames) % 600, 8, 8);
      }
      frames++;
      if (performance.now() >= end) {
        resolve(frames * 1000 / (performance.now() - start));
      } else {
        requestAnimationFrame(frame);
      }
    }
    frame();
  });
}

function formatBytes(n) {
  if (!n) return '—';
  const u = ['B','KB','MB','GB','TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return v.toFixed(v >= 10 || i === 0 ? 0 : 1) + ' ' + u[i];
}

/* ---- Diagnostics: Test My Internet ---- */
async function runNetTest(out) {
  out.innerHTML = 'Pinging Dad\'s server…';
  const rows = [];
  const add = (k, v, cls='') => rows.push({ k, v, cls });

  // Latency: 5x request to a small endpoint
  const pings = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    try {
      await apiGet('/api/public/ai-routes', { timeout: 5000 });
      pings.push(performance.now() - t0);
    } catch { pings.push(null); }
    out.innerHTML = `Pinging Dad's server… ${i+1}/5`;
  }
  const ok = pings.filter(p => p != null);
  const avg = ok.length ? Math.round(ok.reduce((a,b)=>a+b,0) / ok.length) : null;
  const jitter = ok.length > 1 ? Math.round(Math.max(...ok) - Math.min(...ok)) : 0;
  add('Ping (avg)', avg == null ? 'failed' : avg + ' ms', avg == null ? 'bad' : avg < 60 ? 'good' : avg < 150 ? 'warn' : 'bad');
  add('Jitter',     jitter + ' ms', jitter < 30 ? 'good' : jitter < 80 ? 'warn' : 'bad');
  add('Loss',       Math.round(((5 - ok.length) / 5) * 100) + '%', ok.length === 5 ? 'good' : 'bad');

  // Download: fetch a known endpoint multiple times, measure bytes/sec
  out.innerHTML = renderDiag(rows) + '<div class="diag-row"><span class="diag-key">Download</span><span class="diag-val" id="dl">measuring…</span></div>';
  const dlBytes = [];
  const tDL = performance.now();
  // openapi.json is large + stable; news headlines as backup
  const targets = ['/api/openapi.json', '/api/proxy/news/headlines'];
  for (const path of targets) {
    for (let i = 0; i < 3; i++) {
      try {
        const t0 = performance.now();
        const r = await fetch(API + path, { cache: 'no-store' });
        if (!r.ok) continue;
        const buf = await r.arrayBuffer();
        const dt = (performance.now() - t0) / 1000;
        if (dt > 0.05) dlBytes.push({ bytes: buf.byteLength, sec: dt });
      } catch {}
    }
  }
  const totalBytes = dlBytes.reduce((a,b)=>a+b.bytes, 0);
  const totalSec   = dlBytes.reduce((a,b)=>a+b.sec, 0);
  const mbps = totalSec > 0 ? (totalBytes * 8 / totalSec) / 1e6 : 0;
  $('#dl').textContent = mbps.toFixed(2) + ' Mbps  (' + formatBytes(totalBytes) + ' in ' + totalSec.toFixed(1) + 's)';
  $('#dl').className = 'diag-val ' + (mbps > 25 ? 'good' : mbps > 5 ? 'warn' : 'bad');

  // Recommendation
  let advice = '';
  if (avg == null || ok.length < 3) advice = 'Your internet looks down or really weak. Reboot the router.';
  else if (mbps < 5)                advice = 'Slow connection. Move closer to the WiFi or switch to 5GHz / Ethernet.';
  else if (avg > 150)               advice = 'High ping = laggy games. QoS your gaming traffic on the router.';
  else                              advice = 'Looking good — gameplay should feel smooth.';
  out.innerHTML += `<div class="diag-row"><span class="diag-key">Verdict</span><span class="diag-val">${escapeHtml(advice)}</span></div>`;
}

async function runServerCheck(out) {
  out.innerHTML = 'Checking…';
  try {
    const t0 = performance.now();
    const data = await apiGet('/api/public/ai-routes', { timeout: 8000 });
    const dt = Math.round(performance.now() - t0);
    const rows = [
      { k: 'Server', v: 'ONLINE', cls: 'good' },
      { k: 'Round-trip', v: dt + ' ms', cls: dt < 200 ? 'good' : 'warn' },
      { k: 'AI routes', v: (data.routes || []).length + ' available', cls: 'good' },
      { k: 'Models', v: (data.routes || []).map(r => r.model).join(', ').slice(0, 80) },
    ];
    out.innerHTML = renderDiag(rows);
  } catch (e) {
    out.innerHTML = renderDiag([
      { k: 'Server', v: 'UNREACHABLE', cls: 'bad' },
      { k: 'Error', v: e.message, cls: 'bad' },
    ]);
  }
}

/* ---- Server Chat ---- */
function bindServerChat() {
  const btn = $('#srv-send'); if (!btn || btn.dataset.bound) return; btn.dataset.bound = '1';
  btn.addEventListener('click', async () => {
    const q = $('#srv-q').value.trim(); if (!q) return;
    if (!kidSafeAllow(q)) { setMsg('#srv-msg', 'Try clean wording.', 'err'); return; }
    appendChat('#srv-chat', 'A', q);
    $('#srv-q').value = ''; btn.disabled = true;
    try {
      const reply = await callAI(q, 'You are a helpful kid-friendly assistant talking with a 13-year-old. Be concise. No swearing.');
      appendChat('#srv-chat', 'AI', kidSafeText(reply));
    } catch (e) {
      appendChat('#srv-chat', 'AI', 'Server is not answering: ' + e.message, 'err');
    } finally { btn.disabled = false; }
  });
}
function appendChat(sel, who, text, cls = '') {
  const host = $(sel); if (!host) return;
  host.appendChild(el('div', { class: 'buddy-msg buddy-msg-' + (who === 'A' ? 'user' : 'bot') }, [
    el('div', { class: 'buddy-avatar' }, who),
    el('div', { class: 'buddy-bubble ' + cls, text }),
  ]));
  host.scrollTop = host.scrollHeight;
}
function setMsg(sel, text, cls='') { const m = $(sel); if (!m) return; m.className = 'form-msg ' + cls; m.textContent = text; }

/* ---- Sync ---- */
function bindSync() {
  const ex = $('#sync-export'), im = $('#sync-import'), file = $('#sync-import-file'),
        push = $('#sync-cloud'), pull = $('#sync-pull');
  if (!ex || ex.dataset.bound) return; ex.dataset.bound = '1';
  ex.addEventListener('click', () => {
    const dump = {};
    for (const k of Object.values(KEYS)) {
      try { const v = localStorage.getItem(k); if (v != null) dump[k] = JSON.parse(v); } catch {}
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `aydens-hq-backup-${new Date().toISOString().slice(0,10)}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg('#sync-msg', 'Backup downloaded.', 'ok');
  });
  im.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      for (const [k, v] of Object.entries(obj)) localStorage.setItem(k, JSON.stringify(v));
      setMsg('#sync-msg', 'Restored — reload the page to see all your stuff.', 'ok');
    } catch (e) { setMsg('#sync-msg', 'Could not read that file: ' + e.message, 'err'); }
  });
  const SYNC_USER = (window.AYDEN_ADMIN_USERNAME || 'ayden');
  const SYNC_KIND = 'all';
  push.addEventListener('click', async () => {
    setMsg('#sync-msg', 'Pushing to home server…');
    try {
      const dump = {};
      for (const k of Object.values(KEYS)) { try { const v = localStorage.getItem(k); if (v != null) dump[k] = JSON.parse(v); } catch {} }
      const r = await apiPost('/api/aydens/sync/push', { user: SYNC_USER, kind: SYNC_KIND, payload: dump });
      const bytes = r && (r.bytes || r.size);
      setMsg('#sync-msg', 'Pushed' + (bytes ? ` (${formatBytes(bytes)})` : '') + '.', 'ok');
    } catch (e) {
      setMsg('#sync-msg', 'Push failed: ' + e.message, 'err');
    }
  });
  pull.addEventListener('click', async () => {
    setMsg('#sync-msg', 'Pulling from home server…');
    try {
      const data = await apiGet(`/api/aydens/sync/pull?user=${encodeURIComponent(SYNC_USER)}&kind=${encodeURIComponent(SYNC_KIND)}`);
      const payload = data && (data.payload || data.data);
      if (!payload) throw new Error('no data on server yet — push first');
      for (const [k, v] of Object.entries(payload)) localStorage.setItem(k, JSON.stringify(v));
      setMsg('#sync-msg', 'Pulled. Reload the page to see your stuff.', 'ok');
    } catch (e) {
      setMsg('#sync-msg', 'Pull failed: ' + e.message, 'err');
    }
  });
}
function showStorageInfo() {
  const host = $('#storage-info'); if (!host) return;
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i); used += (k.length + (localStorage.getItem(k) || '').length);
  }
  const rows = [
    { k: 'localStorage entries', v: localStorage.length },
    { k: 'localStorage size',    v: formatBytes(used * 2) }, // UTF-16
  ];
  host.innerHTML = renderDiag(rows);
}

/* ============== 25 KID TOOLS ============== */
const TOOL_DEFS = [
  { id:'games',        name:'Game Tracker',     fields:[{k:'game'},{k:'status',type:'select',options:['Playing','Done','Wishlist']},{k:'hours',type:'number'}], help:'Track every game you play. Mark when you beat it. Hours roll up in your stats.' },
  { id:'achievements', name:'Achievement Log',  fields:[{k:'game'},{k:'name'},{k:'date',type:'date'}], help:'Log every cool achievement. Brag forever.' },
  { id:'highscores',   name:'High Scores',      fields:[{k:'game'},{k:'score'}], help:'Personal records per game. Beat your old self.' },
  { id:'wishlist',     name:'Wishlist',         fields:[{k:'game'},{k:'price'}], help:'Games you want. Show this to Mom and Dad on birthdays.' },
  { id:'cheats',       name:'Cheat Locker',     fields:[{k:'game'},{k:'cheat'}], help:'Save cheats so you never forget that Konami code again.' },
  { id:'builds',       name:'Build Journal',    fields:[{k:'name'},{k:'world'},{k:'notes',type:'textarea'}], help:'Document your Minecraft builds. Save the seed and coordinates.' },
  { id:'allowance',    name:'Allowance',        fields:[{k:'kind',type:'select',options:['Got','Spent']},{k:'amount',type:'number'},{k:'why'}], help:'Track money in and out. Add a "Got" line every time you get cash.' },
  { id:'savings',      name:'Savings Goal',     fields:[{k:'goal'},{k:'target',type:'number'},{k:'saved',type:'number'}], help:'Saving up for a new game or controller? Watch the bar fill.' },
  { id:'chores',       name:'Chore Tracker',    fields:[{k:'chore'},{k:'reward',type:'number'},{k:'done',type:'select',options:['No','Yes']}], help:'Mom\'s list of chores + what you get for finishing them.' },
  { id:'tasks',        name:'Task List',        fields:[{k:'task'},{k:'due',type:'date'},{k:'done',type:'select',options:['No','Yes']}], help:'Your to-do list. Tap done when finished.' },
  { id:'reminders',    name:'Reminders',        fields:[{k:'what'},{k:'when',type:'datetime-local'}], help:'Quick reminders. The site notifies you when you visit.' },
  { id:'bedtime',      name:'Bedtime Timer',    fields:[{k:'time',type:'time'}], help:'Set bedtime. Page warns you when it\'s 15 min away.' },
  { id:'gametime',     name:'Game Time Logger', fields:[{k:'game'},{k:'minutes',type:'number'}], help:'How long you played. Add a session each time you log off.' },
  { id:'homework',     name:'Homework',         fields:[{k:'subject'},{k:'assignment'},{k:'due',type:'date'},{k:'done',type:'select',options:['No','Yes']}], help:'Track assignments so you don\'t forget them at school.' },
  { id:'calendar',     name:'Calendar',         fields:[{k:'event'},{k:'date',type:'date'}], help:'Upcoming events: birthdays, game launches, sleepovers.' },
  { id:'notes',        name:'Notes',            fields:[{k:'title'},{k:'body',type:'textarea'}], help:'Anything you want to remember.' },
  { id:'vocab',        name:'Vocabulary',       fields:[{k:'word'},{k:'meaning'}], help:'New words you learned (school or in-game).' },
  { id:'codes',        name:'Friend Codes',     fields:[{k:'name'},{k:'platform'},{k:'tag'}], help:'Gamertags, Discord usernames, Switch friend codes.' },
  { id:'mood',         name:'Mood Log',         fields:[{k:'date',type:'date'},{k:'mood',type:'select',options:['Awesome','Good','OK','Meh','Bad']},{k:'why'}], help:'Daily mood check. Helps when you talk to Mom or Dad about your day.' },
  { id:'roll',         name:'Random Game Picker', fields:[{k:'game'}], help:'Drop game names in. Hit "Roll" to pick one when you can\'t decide.' },
  { id:'music',        name:'Music Playlist',   fields:[{k:'song'},{k:'artist'}], help:'Songs you want to hear while gaming.' },
  { id:'watch',        name:'Watchlist',        fields:[{k:'title'},{k:'kind',type:'select',options:['Movie','Show','Video']}], help:'Stuff to watch later.' },
  { id:'birthdays',    name:'Birthday Reminder', fields:[{k:'name'},{k:'date',type:'date'}], help:'Friends and family birthdays. Don\'t forget.' },
  { id:'quotes',       name:'Quote Wall',       fields:[{k:'quote',type:'textarea'},{k:'who'}], help:'Cool lines from games and movies.' },
  { id:'stats',        name:'Stats Dashboard',  special:'stats', help:'Your overall numbers across every tool.' },
];

function getTool(id) { const all = load(KEYS.tools, {}); return all[id] || []; }
function setTool(id, items) { const all = load(KEYS.tools, {}); all[id] = items; save(KEYS.tools, all); }

function renderToolGrid() {
  const host = $('#tool-grid'); if (!host) return;
  host.innerHTML = '';
  TOOL_DEFS.forEach((t, i) => {
    const items = t.special ? null : getTool(t.id);
    const card = el('button', {
      class: 'tool-card',
      onclick: () => openTool(t.id),
    }, [
      el('div', { class: 'tool-icon' }, String(i + 1).padStart(2, '0')),
      el('div', { class: 'tool-name' }, t.name),
      el('div', { class: 'tool-meta' }, t.special ? 'live' : (items.length + ' saved')),
    ]);
    host.appendChild(card);
  });
}

function openTool(id) {
  const def = TOOL_DEFS.find(t => t.id === id); if (!def) return;
  $('#modal-title').textContent = def.name;
  const body = $('#modal-body'); body.innerHTML = '';

  body.appendChild(el('p', { class: 'inline-help' }, def.help));

  if (def.special === 'stats') {
    body.appendChild(renderStatsDashboard());
  } else {
    const form = el('div', { class: 'tool-form' });
    const inputs = {};
    for (const f of def.fields) {
      const row = el('div', { class: 'form-row' });
      row.appendChild(el('label', {}, f.k.replace(/^./, c => c.toUpperCase())));
      let inp;
      if (f.type === 'select') {
        inp = el('select', {});
        for (const opt of f.options) inp.appendChild(el('option', { value: opt }, opt));
      } else if (f.type === 'textarea') {
        inp = el('textarea', { rows: 3, maxlength: 600 });
      } else {
        inp = el('input', { type: f.type || 'text', maxlength: 120 });
      }
      row.appendChild(inp);
      inputs[f.k] = inp;
      form.appendChild(row);
    }
    const addBtn = el('button', {}, 'ADD');
    const clearBtn = el('button', { class: 'btn-alt' }, 'CLEAR ALL');
    addBtn.addEventListener('click', () => {
      const item = { id: 't' + Date.now(), at: nowISO() };
      for (const k of Object.keys(inputs)) {
        const v = inputs[k].value;
        item[k] = (typeof v === 'string') ? kidSafeText(v) : v;
      }
      if (Object.values(item).every(v => v === '' || v == null || v === item.id || v === item.at)) return;
      const list = getTool(id); list.unshift(item); setTool(id, list);
      for (const inp of Object.values(inputs)) inp.value = '';
      renderToolList(id, listHost);
      renderToolGrid();
    });
    clearBtn.addEventListener('click', () => {
      if (!confirm('Wipe all entries in ' + def.name + '?')) return;
      setTool(id, []);
      renderToolList(id, listHost);
      renderToolGrid();
    });
    form.appendChild(el('div', { style: 'display:flex;gap:8px;margin-top:8px;' }, [addBtn, clearBtn]));

    if (id === 'roll') {
      const rollBtn = el('button', { style: 'margin-top:6px' }, 'ROLL!');
      const rollOut = el('div', { class: 'diag-out' }, 'Pick: —');
      rollBtn.addEventListener('click', () => {
        const list = getTool(id);
        if (!list.length) { rollOut.textContent = 'Add some games first.'; return; }
        const pick = list[Math.floor(Math.random() * list.length)];
        rollOut.textContent = '🎲 ' + (pick.game || JSON.stringify(pick));
      });
      form.appendChild(rollBtn);
      form.appendChild(rollOut);
    }
    if (id === 'savings') {
      const wrap = el('div', {});
      const refresh = () => {
        const list = getTool(id);
        wrap.innerHTML = '';
        for (const x of list) {
          const pct = x.target > 0 ? Math.min(100, (Number(x.saved||0) / Number(x.target||1)) * 100) : 0;
          wrap.appendChild(el('div', { class: 'tool-item' }, [
            el('div', { class: 'tool-item-meta' }, [
              el('div', { class: 'tool-item-title' }, x.goal || '—'),
              el('div', { class: 'tool-item-sub' }, '$' + (x.saved||0) + ' / $' + (x.target||0) + ' (' + Math.round(pct) + '%)'),
              el('div', { class: 'progress' }, [el('span', { style: `width:${pct}%` })]),
            ]),
            el('button', { class: 'btn-icon danger', onclick: () => { setTool(id, getTool(id).filter(v=>v.id!==x.id)); refresh(); renderToolGrid(); } }, '×'),
          ]));
        }
      };
      addBtn.addEventListener('click', () => setTimeout(refresh, 50));
      clearBtn.addEventListener('click', () => setTimeout(refresh, 50));
      body.appendChild(form);
      body.appendChild(wrap);
      refresh();
      openModal(); return;
    }

    body.appendChild(form);
    const listHost = el('div', { class: 'tool-list' });
    body.appendChild(listHost);
    renderToolList(id, listHost);
  }

  openModal();
}

function renderToolList(id, host) {
  const list = getTool(id);
  host.innerHTML = '';
  if (!list.length) { host.appendChild(el('div', { class: 'tool-empty' }, 'Empty. Add your first one.')); return; }
  for (const x of list) {
    const main = Object.entries(x).filter(([k]) => !['id','at'].includes(k)).map(([k,v]) => `${k}: ${escapeHtml(String(v))}`).join(' · ');
    host.appendChild(el('div', { class: 'tool-item' }, [
      el('div', { class: 'tool-item-meta' }, [
        el('div', { class: 'tool-item-title', text: main || '—' }),
        el('div', { class: 'tool-item-sub' }, relTime(x.at)),
      ]),
      el('button', {
        class: 'btn-icon danger',
        onclick: () => {
          setTool(id, getTool(id).filter(v => v.id !== x.id));
          renderToolList(id, host);
          renderToolGrid();
        }
      }, '×'),
    ]));
  }
}

function renderStatsDashboard() {
  const all = load(KEYS.tools, {});
  const stats = TOOL_DEFS.filter(t => !t.special).map(t => ({ name: t.name, count: (all[t.id] || []).length }));
  const wrap = el('div', {});
  for (const s of stats) {
    wrap.appendChild(el('div', { class: 'diag-row' }, [
      el('div', { class: 'diag-key' }, s.name),
      el('div', { class: 'diag-val' }, String(s.count)),
    ]));
  }
  return wrap;
}

function openModal() { $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }

/* ============== FRIENDS CHAT ============== */
let firebaseApp = null, fbAuth = null, fbDB = null;
function firebaseReady() { return !!fbDB && !!fbAuth; }

async function loadFirebase() {
  const cfg = window.AYDEN_FIREBASE_CONFIG || {};
  if (!cfg.apiKey || !cfg.databaseURL) return false;
  try {
    const [{ initializeApp }, { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged }, { getDatabase, ref, push, set, update, remove, onValue, onChildAdded, query, limitToLast, off }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js'),
    ]);
    firebaseApp = initializeApp(cfg);
    fbAuth = getAuth(firebaseApp);
    fbDB   = getDatabase(firebaseApp);
    window.__FB = { ref, push, set, update, remove, onValue, onChildAdded, query, limitToLast, off, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
    return true;
  } catch (e) {
    console.warn('Firebase failed to load:', e);
    return false;
  }
}

function initFriendsTab() {
  const status = $('#friend-gate-status');
  const help = $('#friends-gate-help');
  if (!firebaseReady()) {
    if (status) status.textContent = 'Real-time chat needs Firebase. Open firebase-config.js, fill in 5 lines, reload. Until then this tab is read-only.';
    if (help)   help.textContent   = 'Real-time chat is set up by Dad. Until he fills in the Firebase config in firebase-config.js, the chat stays off.';
    $('#friend-login-btn').disabled = true;
    $('#friend-register-btn').disabled = true;
    return;
  }
  if (status) status.textContent = 'Connected to home chat.';
  bindFriendsAuth();
}

function emailFor(username) {
  const safe = String(username).toLowerCase().replace(/[^a-z0-9]/g, '');
  return safe + '@aydens.local';
}

function bindFriendsAuth() {
  const userInp = $('#friend-user'), passInp = $('#friend-pass');
  const login = $('#friend-login-btn'), register = $('#friend-register-btn');
  const msg = $('#friend-gate-msg'), shell = $('#friends-shell'), gate = $('#friends-gate');
  const send = $('#friend-send'), msgInp = $('#friend-msg'), feed = $('#friends-feed');
  const logoutBtn = $('#friend-logout-btn'), nameLbl = $('#friend-current-user');
  if (!login || login.dataset.bound) return; login.dataset.bound = '1';

  const attempt = async (op) => {
    const u = (userInp.value || '').trim().toLowerCase();
    const p = passInp.value;
    msg.className = 'gate-msg';
    if (!/^[a-z0-9_]{3,20}$/i.test(u)) { msg.className='gate-msg err'; msg.textContent='Username: 3-20 letters/numbers/underscore.'; return; }
    if (!p || p.length < 6)             { msg.className='gate-msg err'; msg.textContent='Password: 6+ characters.'; return; }
    try {
      if (op === 'register') {
        await window.__FB.createUserWithEmailAndPassword(fbAuth, emailFor(u), p);
        await window.__FB.set(window.__FB.ref(fbDB, 'users/' + u), { username: u, createdAt: nowISO(), profile: {} });
      } else {
        await window.__FB.signInWithEmailAndPassword(fbAuth, emailFor(u), p);
      }
      save(KEYS.friendSession, { username: u });
    } catch (e) {
      msg.className = 'gate-msg err';
      // Firebase auth errors sometimes throw with no .message — guard.
      const raw = (e && e.message) ? String(e.message) : '';
      msg.textContent = raw.replace(/\(auth\/[^)]+\)/, '').trim() || 'Sign-in failed.';
    }
  };
  login.addEventListener('click', () => attempt('login'));
  register.addEventListener('click', () => attempt('register'));
  passInp.addEventListener('keydown', e => { if (e.key === 'Enter') attempt('login'); });

  window.__FB.onAuthStateChanged(fbAuth, async (user) => {
    if (!user) {
      gate.classList.remove('hidden'); shell.classList.add('hidden'); return;
    }
    const sess = load(KEYS.friendSession, {});
    const username = sess.username || user.email.split('@')[0];
    nameLbl.textContent = username;
    gate.classList.add('hidden'); shell.classList.remove('hidden');
    bindFriendsFeed(username);
    bindFriendsBlocklist();
    bindFriendsUsers();
  });

  logoutBtn.addEventListener('click', () => window.__FB.signOut(fbAuth));

  send.addEventListener('click', () => sendFriendPost());
  msgInp.addEventListener('keydown', e => { if (e.key === 'Enter') sendFriendPost(); });

  async function sendFriendPost() {
    const text = msgInp.value.trim(); if (!text) return;
    if (!kidSafeAllow(text)) { msg.className='gate-msg err'; msg.textContent='Try clean wording.'; return; }
    const u = fbAuth.currentUser; if (!u) return;
    const sess = load(KEYS.friendSession, {});
    const username = sess.username || u.email.split('@')[0];
    if (getBlocked().includes(username)) { msg.className='gate-msg err'; msg.textContent='You\'re blocked from posting. Talk to Ayden.'; return; }
    try {
      await window.__FB.push(window.__FB.ref(fbDB, 'posts'), {
        username, text: kidSafeText(text), at: Date.now()
      });
      msgInp.value = '';
    } catch (e) {
      msg.className = 'gate-msg err'; msg.textContent = 'Could not post: ' + e.message;
    }
  }
}

let _postsBound = false;
function bindFriendsFeed(currentUser) {
  if (_postsBound) return; _postsBound = true;
  const feed = $('#friends-feed');
  const q = window.__FB.query(window.__FB.ref(fbDB, 'posts'), window.__FB.limitToLast(80));
  feed.innerHTML = '';
  window.__FB.onChildAdded(q, snap => {
    const p = snap.val(); p.id = snap.key;
    const blocked = new Set(getBlocked());
    if (blocked.has(p.username)) return;
    const adminName = (window.AYDEN_ADMIN_USERNAME || 'ayden').toLowerCase();
    const isAdmin = p.username === adminName;
    const post = el('div', { class: 'friend-post', id: 'fp-' + p.id }, [
      el('div', { class: 'fp-head' }, [
        el('span', { class: 'fp-user' + (isAdmin ? ' admin' : '') }, p.username + (isAdmin ? ' ★' : '')),
        el('span', { class: 'fp-time' }, shortTime(new Date(p.at))),
      ]),
      el('div', { class: 'fp-body', text: p.text }),
      currentUser === adminName ? el('div', { class: 'fp-actions' }, [
        el('button', { onclick: () => deleteFriendPost(p.id) }, 'delete'),
      ]) : null,
    ]);
    feed.appendChild(post);
    feed.scrollTop = feed.scrollHeight;
  });
}

let _usersBound = false;
function bindFriendsUsers() {
  if (_usersBound) return; _usersBound = true;
  window.__FB.onValue(window.__FB.ref(fbDB, 'users'), snap => {
    const v = snap.val() || {};
    window.__FB_USERS = Object.values(v);
    if ($('#user-list')) renderUsers();
  });
}
let _blockBound = false;
function bindFriendsBlocklist() {
  if (_blockBound) return; _blockBound = true;
  window.__FB.onValue(window.__FB.ref(fbDB, 'blocked'), snap => {
    const v = snap.val() || {};
    setBlocked(Object.keys(v).filter(k => v[k]));
    if ($('#user-list')) renderUsers();
  });
}
async function firebaseBlockUser(name, on) {
  return window.__FB.update(window.__FB.ref(fbDB, 'blocked'), { [name]: on ? Date.now() : null });
}
async function firebaseDeleteUser(name) {
  return window.__FB.remove(window.__FB.ref(fbDB, 'users/' + name));
}
async function firebaseUpdateUser(u) {
  return window.__FB.update(window.__FB.ref(fbDB, 'users/' + u.username), u);
}
async function deleteFriendPost(id) {
  if (!confirm('Delete this post?')) return;
  return window.__FB.remove(window.__FB.ref(fbDB, 'posts/' + id));
}

/* ============== AUTO REFRESH ============== */
let refreshTimer = null;
function setupAutoRefresh() {
  clearInterval(refreshTimer);
  const m = currentSettings().refreshMin || 10;
  refreshTimer = setInterval(() => {
    if (document.hidden) return;
    refreshHomeWidgets();
  }, m * 60 * 1000);
}

/* ============== BOOT ============== */
function bindRefreshButtons() {
  $$('button[data-action="refresh-weather"]').forEach(b => b.addEventListener('click', loadWeatherCities));
  $$('button[data-action="refresh-space"]').forEach(b   => b.addEventListener('click', loadSpace));
  $$('button[data-action="refresh-news"]').forEach(b    => b.addEventListener('click', loadKidsNews));
  $$('button[data-action="refresh-traffic"]').forEach(b => b.addEventListener('click', loadTraffic));
  $$('button[data-ai-feed]').forEach(b => b.addEventListener('click', () => ensureAIFeed(b.dataset.aiFeed, true)));
  $('#modal-close')?.addEventListener('click', closeModal);
  $('#modal')?.addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  // palette copy
  $$('.palette').forEach(p => p.addEventListener('click', () => {
    const c1 = getComputedStyle(p).getPropertyValue('--c1').trim();
    const c2 = getComputedStyle(p).getPropertyValue('--c2').trim();
    const c3 = getComputedStyle(p).getPropertyValue('--c3').trim();
    const txt = `${c1}, ${c2}, ${c3}`;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    p.style.transform = 'scale(.97)'; setTimeout(() => p.style.transform = '', 200);
  }));
}

async function boot() {
  applySettings();
  bindTabs();
  bindBuddy();
  bindRefreshButtons();
  await ensureDefaultAdminPwd();
  tickClock(); setInterval(tickClock, 30 * 1000);
  probeServer();
  refreshHomeWidgets();
  setupAutoRefresh();
  // session uptime stat
  const startedAt = Date.now();
  setInterval(() => {
    const s = Math.floor((Date.now() - startedAt) / 1000);
    const u = $('#stat-uptime'); if (u) u.textContent = s.toString();
  }, 1000);
  // load Firebase in background; doesn't block UI
  await loadFirebase();
  if ($('#friends-gate')) initFriendsTab();
  // pre-warm AI feeds for visible game tab if we land there
  const tab = document.body.dataset.tab;
  if (['xbox','pc','minecraft','rocket'].includes(tab)) ensureAIFeed(tab);
}

document.addEventListener('DOMContentLoaded', boot);

// ===========================================================================
// Reviews tab (Ayden's game reviews — synced via Firebase RTDB at /reviews/*)
// + Profile customizer in Control panel (writes to /users/{uid}/profile via
// the shared firebase-identity layer).
// Both attach AFTER boot so DOM exists; both wait for window.AYDEN_ID.ready.
// ===========================================================================
(function initReviewsAndProfile() {
  function whenIdReady(cb) {
    if (window.AYDEN_ID && window.AYDEN_ID.ready) {
      window.AYDEN_ID.ready.then(cb).catch(e => console.warn('[id]', e.message));
    } else {
      let n = 0;
      const i = setInterval(() => {
        if (window.AYDEN_ID && window.AYDEN_ID.ready) {
          clearInterval(i);
          window.AYDEN_ID.ready.then(cb).catch(e => console.warn('[id]', e.message));
        } else if (++n > 40) clearInterval(i);
      }, 250);
    }
  }
  function $$(s){return document.querySelector(s);}
  function escH(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  // ===== REVIEWS =====
  let revRating = 0;
  function bindReviewStars() {
    const stars = document.querySelectorAll('#rev-stars span');
    stars.forEach((s, i) => {
      s.addEventListener('click', () => {
        revRating = i + 1;
        stars.forEach((x, j) => x.textContent = j < revRating ? '★' : '☆');
        const n = $$('#rev-rating-num'); if (n) n.textContent = revRating + '/5';
      });
    });
  }
  async function loadReviews() {
    const feed = $$('#rev-feed'); if (!feed) return;
    if (!window.AYDEN_ID || !window.AYDEN_ID.db) {
      feed.innerHTML = '<div class="inline-help">Connecting…</div>'; return;
    }
    try {
      const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js');
      const snap = await get(ref(window.AYDEN_ID.db, 'reviews'));
      const items = [];
      if (snap.exists()) snap.forEach(child => items.push(Object.assign({ id: child.key }, child.val())));
      items.sort((a,b) => (b.ts||0) - (a.ts||0));
      if (!items.length) { feed.innerHTML = '<div class="inline-help">No reviews yet — be the first!</div>'; return; }
      feed.innerHTML = items.slice(0, 30).map(r => {
        const stars = '★'.repeat(r.rating||0) + '☆'.repeat(5-(r.rating||0));
        const when  = r.ts ? new Date(r.ts).toLocaleDateString() : '';
        const author= r.author || 'Ayden';
        return `<div style="background:rgba(0,240,255,.06);border:1px solid rgba(0,240,255,.25);border-radius:8px;padding:14px;margin:10px 0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong style="color:var(--neon-cyan);font-size:15px">${escH(r.game||'Game')}</strong>
            <span style="color:var(--neon-yellow);font-size:14px">${stars} <span style="color:var(--text-dim);font-size:11px">${escH(when)}</span></span>
          </div>
          <p style="margin:6px 0;color:var(--text);line-height:1.6;font-size:14px;white-space:pre-wrap">${escH(r.text||'')}</p>
          <div style="font-size:11px;color:var(--text-mute);font-family:var(--font-display);letter-spacing:.1em;text-transform:uppercase">— ${escH(author)}</div>
        </div>`;
      }).join('');
    } catch (e) {
      feed.innerHTML = '<div class="inline-help" style="color:#ff6b6b">Reviews unavailable: '+escH(e.message)+'</div>';
    }
  }
  async function postReview() {
    const game = ($$('#rev-game')||{}).value || '';
    const text = ($$('#rev-text')||{}).value || '';
    const status = $$('#rev-status');
    if (!game.trim()) { if (status) status.textContent = '✗ Game title required.'; return; }
    if (!text.trim() || text.length < 10) { if (status) status.textContent = '✗ Review must be at least 10 chars.'; return; }
    if (!revRating) { if (status) status.textContent = '✗ Pick a star rating.'; return; }
    if (!window.AYDEN_ID || !window.AYDEN_ID.db) { if (status) status.textContent = '✗ Not signed in.'; return; }
    try {
      const { ref, push, set, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js');
      const newRef = push(ref(window.AYDEN_ID.db, 'reviews'));
      await set(newRef, {
        game: game.slice(0, 80), text: text.slice(0, 1500), rating: revRating,
        author: (window.AYDEN_ID.profile && window.AYDEN_ID.profile.displayName) || 'Ayden',
        uid: window.AYDEN_ID.uid, ts: Date.now(),
      });
      if (status) status.textContent = '✓ Posted!';
      $$('#rev-game').value = ''; $$('#rev-text').value = '';
      revRating = 0; document.querySelectorAll('#rev-stars span').forEach(s => s.textContent = '☆');
      $$('#rev-rating-num').textContent = '0/5';
      loadReviews();
    } catch (e) {
      if (status) status.textContent = '✗ ' + (e.message || 'Failed');
    }
  }

  // ===== PROFILE CUSTOMIZER =====
  const PROF_AVATARS = ['🤖','😀','😎','🦊','🐶','🐱','🦁','🐯','🐸','🐼','🐨','🦄','👽','👾','🤠','🧙','🧛','🧞','🦸','🦹','🥷','🧑‍🚀','👻','🐲'];
  const PROF_HUES = [
    { name:'Cyan',    hue:185, color:'#00f0ff' },
    { name:'Pink',    hue:320, color:'#ff2bd6' },
    { name:'Green',   hue:120, color:'#39ff14' },
    { name:'Purple',  hue:280, color:'#b400ff' },
    { name:'Orange',  hue:25,  color:'#ff7a00' },
    { name:'Yellow',  hue:55,  color:'#ffd000' },
    { name:'Red',     hue:0,   color:'#ff3b3b' },
    { name:'Blue',    hue:200, color:'#2be6ff' },
  ];
  function renderAvatarGrid(selected) {
    const g = $$('#prof-avatar-grid'); if (!g) return;
    g.innerHTML = PROF_AVATARS.map(a => `<button type="button" data-av="${a}"
      style="width:40px;height:40px;background:${a===selected?'rgba(0,240,255,.25)':'rgba(255,255,255,.04)'};border:1px solid ${a===selected?'var(--accent)':'rgba(255,255,255,.12)'};border-radius:6px;font-size:22px;cursor:pointer;color:#fff;font-family:'Russo One', \"Apple Color Emoji\", \"Segoe UI Emoji\", sans-serif">${a}</button>`).join('');
    g.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.av;
      $$('#prof-avatar-val').value = v;
      renderAvatarGrid(v);
    }));
  }
  function renderHueGrid(selected) {
    const g = $$('#prof-theme-grid'); if (!g) return;
    g.innerHTML = PROF_HUES.map(h => `<button type="button" data-hue="${h.hue}"
      style="width:80px;height:34px;background:${h.color}22;border:2px solid ${h.hue===selected?h.color:'rgba(255,255,255,.15)'};box-shadow:${h.hue===selected?'0 0 14px '+h.color:''};border-radius:6px;cursor:pointer;color:${h.color};font:700 11px 'Russo One',sans-serif;letter-spacing:.1em;text-transform:uppercase">${h.name}</button>`).join('');
    g.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const v = parseInt(b.dataset.hue, 10);
      $$('#prof-hue-val').value = v;
      renderHueGrid(v);
    }));
  }
  function loadProfileForm() {
    const id = window.AYDEN_ID;
    if (!id || !id.profile) return;
    if ($$('#prof-name')) $$('#prof-name').value = id.profile.displayName || '';
    const av = (id.profile.avatar && id.profile.avatar.face) || '🤖';
    if ($$('#prof-avatar-val')) $$('#prof-avatar-val').value = av;
    renderAvatarGrid(av);
    const hue = id.profile.hue || 185;
    if ($$('#prof-hue-val')) $$('#prof-hue-val').value = hue;
    renderHueGrid(hue);
    if ($$('#prof-uid')) $$('#prof-uid').textContent = (id.uid || '').slice(0, 12) + '…';
  }
  async function saveProfile() {
    const id = window.AYDEN_ID;
    const status = $$('#prof-status');
    if (!id || !id.uid) { if (status) status.textContent = '✗ Not signed in.'; return; }
    try {
      const name = ($$('#prof-name')||{}).value || '';
      const av   = ($$('#prof-avatar-val')||{}).value || '🤖';
      const hue  = parseInt(($$('#prof-hue-val')||{}).value || '185', 10);
      await id.updateProfile({
        displayName: name.slice(0, 32),
        avatar: Object.assign({}, id.profile.avatar || {}, { face: av }),
        hue: hue,
      });
      if (status) status.textContent = '✓ Saved! Visible across all pages.';
    } catch (e) {
      if (status) status.textContent = '✗ ' + (e.message || 'save failed');
    }
  }

  // Bindings (run on DOMContentLoaded — boot already fired)
  function bindAll() {
    if ($$('#rev-stars')) bindReviewStars();
    if ($$('#rev-submit')) $$('#rev-submit').addEventListener('click', postReview);
    if ($$('#rev-refresh')) $$('#rev-refresh').addEventListener('click', loadReviews);
    if ($$('#prof-save')) $$('#prof-save').addEventListener('click', saveProfile);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll);
  } else { bindAll(); }
  whenIdReady(() => { loadReviews(); loadProfileForm(); });
})();
