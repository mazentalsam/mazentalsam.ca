const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth <= 812;

/* ===== Date-aware content =====
   elements with data-from / data-until (yyyy-mm-dd, inclusive, toronto time) only exist inside that window.
   preview any day with ?today=2027-02-10 */
const todayParam = new URLSearchParams(location.search).get('today');
const today = /^\d{4}-\d{2}-\d{2}$/.test(todayParam || '')
  ? todayParam
  : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date()); // en-CA = yyyy-mm-dd
$$('[data-from], [data-until]').forEach((el) => {
  if ((el.dataset.from && today < el.dataset.from) || (el.dataset.until && today > el.dataset.until)) el.remove();
});
const TD = { start: '2027-01-04', end: '2027-04-23' };
const tdPhase = today < TD.start ? 'before' : today <= TD.end ? 'during' : 'after';
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

history.scrollRestoration = 'manual';
scrollTo(0, 0);

/* ===== Smooth scroll (optional — site works without it) ===== */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.stop();
}
const scrollToTarget = (el) => lenis ? lenis.scrollTo(el, { duration: 1.4 }) : el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });

/* ===== Loader ===== */
const loader = $('#loader');
const count = $('#loaderCount');
let pageLoaded = document.readyState === 'complete';
addEventListener('load', () => { pageLoaded = true; });

function launch() {
  document.body.classList.remove('is-loading');
  document.body.classList.add('loaded');
  lenis?.start();
  setTimeout(() => loader.remove(), 1100);
}

if (reduced) {
  loader.classList.add('done');
  launch();
} else {
  const start = performance.now();
  const DURATION = 1800;
  (function tick(now) {
    // hold at 90% until assets are in, so the counter never lies
    const p = Math.min((now - start) / DURATION, pageLoaded ? 1 : 0.9);
    const eased = 1 - Math.pow(1 - p, 3);
    count.textContent = Math.round(eased * 100);
    if (p > 0.55) loader.classList.add('swap');
    if (p < 1) return requestAnimationFrame(tick);
    setTimeout(() => { loader.classList.add('done'); launch(); }, 250);
  })(start);
}

/* ===== Menu ===== */
const menu = $('#menu');
const menuBtn = $('#menuBtn');
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', open);
  menu.setAttribute('aria-hidden', !open);
  menu.inert = !open;
  $('#main').inert = open;
  if (open) { lenis?.stop(); $('#menuClose').focus(); }
  else { lenis?.start(); menuBtn.focus({ preventScroll: true }); }
}
menuBtn.addEventListener('click', () => setMenu(true));
$('#menuClose').addEventListener('click', () => setMenu(false));
$('#menuScrim').addEventListener('click', () => setMenu(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });

/* ===== Anchor links ===== */
$$('[data-scroll]').forEach((a) => a.addEventListener('click', (e) => {
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  if (document.body.classList.contains('menu-open')) setMenu(false);
  scrollToTarget(target);
}));

/* ===== Reveal on view ===== */
const revealer = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
}), { threshold: 0.2 });
$$('.reveal, .reveal-fade').forEach((el) => revealer.observe(el));

/* ===== Buttons: fill ball grows from the cursor's entry point ===== */
$$('.btn, .totop').forEach((b) => b.addEventListener('pointerenter', (e) => {
  const r = b.getBoundingClientRect();
  b.style.setProperty('--bx', `${e.clientX - r.left}px`);
  b.style.setProperty('--by', `${e.clientY - r.top}px`);
}));

/* ===== Hero tiles: paper tiles shuffle over the 3D scene ===== */
const heroWindow = $('#heroWindow');
const tilesEl = $('#tiles');
let heroVisible = true;
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(heroWindow);

function buildTiles() {
  const [cols, rows, count] = isMobile() ? [4, 4, 8] : [6, 2, 5];
  tilesEl.style.setProperty('--tc', cols);
  tilesEl.style.setProperty('--tr', rows);
  const cells = [...Array(cols * rows).keys()].sort(() => Math.random() - 0.5).slice(0, count);
  tilesEl.innerHTML = '';
  const tiles = cells.map((cell) => {
    const t = { el: document.createElement('i'), c: cell % cols, r: Math.floor(cell / cols) };
    tilesEl.append(t.el);
    return t;
  });
  const place = (t) => { t.el.style.transform = `translate(calc(${t.c} * (100% - 2px) - 1px), calc(${t.r} * (100% - 2px) - 1px))`; };
  tiles.forEach(place);
  return { cols, rows, tiles, place };
}
let tileState = buildTiles();
let lastWidthMobile = isMobile();
addEventListener('resize', () => {
  if (isMobile() !== lastWidthMobile) { lastWidthMobile = isMobile(); tileState = buildTiles(); }
});
if (!reduced) setInterval(() => {
  if (!heroVisible || document.hidden) return;
  const { cols, rows, tiles, place } = tileState;
  const taken = new Set(tiles.map((t) => `${t.c},${t.r}`));
  const movers = tiles.slice().sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
  movers.forEach((t) => {
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dc, dr]) => [t.c + dc, t.r + dr])
      .filter(([c, r]) => c >= 0 && c < cols && r >= 0 && r < rows && !taken.has(`${c},${r}`));
    if (!options.length) return;
    const [c, r] = options[Math.floor(Math.random() * options.length)];
    taken.delete(`${t.c},${t.r}`); taken.add(`${c},${r}`);
    t.c = c; t.r = r; place(t);
  });
}, 1300);

/* ===== 3D hero scene (lazy; failure leaves the dark window + tiles) ===== */
import('./scene.js?v=20261031142043').then((m) => m.initScene($('#scene'), { reduced })).catch((err) => console.warn('3D scene disabled:', err));

/* ===== Quote: split into words with random 3D start states ===== */
const quoteText = $('#quoteText');
const HIGHLIGHT = new Set(['fast,', 'reliable', 'boring', '8-second', 'just', 'work.']);
quoteText.innerHTML = quoteText.textContent.trim().split(/\s+/)
  .map((w) => `<span class="w${HIGHLIGHT.has(w) ? ' hl' : ''}">${w}</span>`).join(' ');
const words = $$('.w', quoteText).map((el) => ({
  el,
  z: 500 + Math.random() * 450,
  x: (Math.random() * 2 - 1) * 100,
  y: (Math.random() * 2 - 1) * 10,
  rx: (Math.random() * 2 - 1) * 90,
  off: Math.random() * 0.3,
}));

/* ===== Badges: damped pendulum, draggable, nudged by scroll ===== */
const badges = $$('[data-badge]').map((el) => {
  const b = { el, a: 0, v: 0, drag: false, visible: false, kicked: false };
  new IntersectionObserver(([e]) => {
    b.visible = e.isIntersecting;
    if (b.visible && !b.kicked && !reduced) { b.v = 1.4 * (Math.random() > 0.5 ? 1 : -1); b.kicked = true; }
  }, { threshold: 0.3 }).observe(el.parentElement);

  el.addEventListener('pointerdown', (e) => {
    b.drag = true; el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!b.drag) return;
    const r = el.parentElement.getBoundingClientRect();
    const pivotX = r.left + r.width / 2;
    const pivotY = r.top - el.offsetHeight * 0.05;
    const next = clamp(Math.atan2(-(e.clientX - pivotX), e.clientY - pivotY), -1.2, 1.2);
    b.v = (next - b.a) * 60;
    b.a = next;
  });
  const release = () => { b.drag = false; };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  return b;
});

/* ===== Autofill cover: types into the fake form once visible ===== */
const fields = $$('#p-autofill [data-type]');
new IntersectionObserver(([e], obs) => {
  if (!e.isIntersecting) return;
  obs.disconnect();
  (async () => {
    for (const f of fields) {
      f.classList.add('typing');
      for (const ch of reduced ? [f.dataset.type] : f.dataset.type) {
        f.textContent += ch;
        await new Promise((r) => setTimeout(r, 28));
      }
      f.classList.remove('typing');
      f.classList.add('filled');
    }
    $('#p-autofill .cover__chip').classList.add('show');
  })();
}, { threshold: 0.5 }).observe($('#p-autofill'));

/* ===== Footer reveal: reserve space under the page for the fixed footer ===== */
const footer = $('#contact');
function sizeFooter() {
  footer.classList.remove('static');
  const tooTall = footer.offsetHeight > innerHeight;
  footer.classList.toggle('static', tooTall);
  document.documentElement.style.setProperty('--footer-h', tooTall ? '0px' : `${footer.offsetHeight}px`);
}
new ResizeObserver(sizeFooter).observe(footer);
addEventListener('resize', sizeFooter);

/* ===== Clock ===== */
const clock = $('#clock');
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: true });
const tickClock = () => { clock.textContent = fmt.format(new Date()); };
tickClock(); setInterval(tickClock, 15000);
$('#year').textContent = new Date().getFullYear();

/* ===== TD counter: days to go before the term, day N during it (card is removed after) ===== */
if (tdPhase === 'before') {
  $('#tdDays').textContent = daysBetween(today, TD.start);
  $('#tdDaysLabel').textContent = daysBetween(today, TD.start) === 1 ? 'day to go' : 'days to go';
} else if (tdPhase === 'during') {
  $('#tdDays').textContent = `day ${daysBetween(TD.start, today) + 1}`;
  $('#tdDaysLabel').textContent = `of ${daysBetween(TD.start, TD.end) + 1} at td`;
}

/* ===== "updated" stamp, live from github (last push to this site) ===== */
fetch('https://api.github.com/users/mazentalsam/repos?sort=pushed&per_page=10')
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((repos) => {
    const site = repos.find((r) => r.name === 'mazentalsam.com');
    if (site) {
      $('#nowStamp').textContent = 'updated ' + new Date(site.pushed_at)
        .toLocaleDateString('en-CA', { month: 'short', year: 'numeric', timeZone: 'America/Toronto' }).toLowerCase().replace('.', '');
    }
  })
  .catch(() => { /* keep the static fallback text */ });

/* ===== live csjobs.ca numbers =====
   off until csjobs.ca serves a public stats endpoint (its /api is bot-protected today).
   set to e.g. 'https://csjobs.ca/api/public/stats' returning { "students": 512, "career_sites": 655 } */
const CSJOBS_STATS_URL = null;
if (CSJOBS_STATS_URL) {
  fetch(CSJOBS_STATS_URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((s) => {
      if (Number.isFinite(s.students)) $('#statStudents').dataset.count = s.students;
      if (Number.isFinite(s.career_sites)) $('#statSites').dataset.count = s.career_sites;
    })
    .catch(() => { /* keep the static numbers */ });
}

/* ===== localStorage helpers (can throw in private mode) ===== */
const store = {
  get: (k) => { try { return +localStorage.getItem(k) || 0; } catch { return 0; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

/* ===== Sound fx: synthesized with web audio, only ever played on a tap ===== */
let actx = null;
let noise = null;
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    // limiter on the master bus so stacked hits never clip
    actx.master = actx.createDynamicsCompressor();
    actx.master.threshold.value = -10;
    const out = actx.createGain(); out.gain.value = 1.6;
    actx.master.connect(out).connect(actx.destination);
    noise = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
// pitched body: sine that drops in pitch, like a pad or ball resonating
function thump(ctx, t, from, to, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.master);
  o.start(t); o.stop(t + dur + 0.02);
}
// filtered noise burst: the leather slap / surface contact
function burst(ctx, t, type, freq, q, dur, vol) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(ctx.master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}
const jitter = (v, amt = 0.08) => v * (1 + (Math.random() * 2 - 1) * amt);

// per strike: body pitch (lower = heavier), slap brightness, overall power
const STRIKE_SFX = {
  jab: [150, 2600, 0.55], cross: [125, 2200, 0.75], hook: [115, 2000, 0.8], elbow: [170, 3400, 0.7],
  teep: [85, 1000, 0.85], knee: [75, 1200, 0.95], roundhouse: [62, 1500, 1], 'switch kick': [58, 1600, 1],
};
const HIT_MS = 100; // glove/shin travels this long before it lands; sound + flash are timed to it
// air cut by the glove or shin: band of noise sweeping up in pitch, peaking right at contact
function whoosh(ctx, t, end, vol) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise; src.loop = true;
  f.type = 'bandpass'; f.Q.value = 1.1;
  f.frequency.setValueAtTime(450, t); f.frequency.exponentialRampToValueAtTime(2600, end);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, end - 0.008); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.03);
  src.connect(f).connect(g).connect(ctx.master); src.start(t, Math.random() * 0.5); src.stop(end + 0.05);
}
function playStrike(name) {
  const ctx = audio(); if (!ctx) return;
  const [body, slap, p] = STRIKE_SFX[name];
  const t = ctx.currentTime, hit = t + HIT_MS / 1000;
  burst(ctx, t, 'highpass', 5500, 0.7, 0.1, 0.18);                   // the fighter's "tss" exhale
  whoosh(ctx, t, hit, 0.32 * p);                                      // glove / shin through the air
  burst(ctx, hit, 'highpass', 2800, 0.7, 0.012, 1.1 * p);             // skin-on-leather snap
  burst(ctx, hit, 'bandpass', jitter(slap), 0.9, 0.06, 0.7 * p);      // leather crack
  thump(ctx, hit, jitter(body * 2.2), body * 0.55, 0.22, 1.1 * p);    // pad body
  burst(ctx, hit, 'lowpass', 380, 0.7, 0.2, 0.55 * p);                // heavy bag thud
  if (body < 90) thump(ctx, hit + 0.012, body * 1.2, body * 0.5, 0.3, 0.6 * p); // kicks land deeper
}
function playSuper(p, hitDelay) {
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime, hit = t + hitDelay;
  burst(ctx, t, 'highpass', 5000, 0.7, 0.16, 0.3);                    // big exhale
  whoosh(ctx, t, t + hitDelay * 0.45, 0.25);                          // spin wind-up...
  whoosh(ctx, t + hitDelay * 0.4, hit, 0.6);                          // ...and the kick coming through
  burst(ctx, hit, 'highpass', 2500, 0.7, 0.02, 1.4);
  burst(ctx, hit, 'bandpass', 1500, 0.8, 0.12, 1.1);
  thump(ctx, hit, 120, 30, 0.9 + 0.5 * p, 1.6);                       // boom
  thump(ctx, hit + 0.015, 62, 26, 1.1 + 0.6 * p, 1.1);
  burst(ctx, hit, 'lowpass', 220, 0.7, 0.7, 0.9);
}
function playTouch() { // foot on ball: hollow bonk + a little leather tick
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime;
  thump(ctx, t, jitter(360, 0.06), 190, 0.13, 0.7);
  burst(ctx, t, 'bandpass', 1800, 2, 0.035, 0.35);
}
function playShot(p) { // laces through the ball
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime;
  thump(ctx, t, 280, 90, 0.2, 0.9 + 0.4 * p);
  burst(ctx, t, 'bandpass', 1400, 1.4, 0.05, 0.7);
  whoosh(ctx, t + 0.02, t + 0.25, 0.15 * p);
}
function playPost() { // ball off the woodwork: hollow "donk"
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime;
  thump(ctx, t, 520, 360, 0.22, 0.7);
  burst(ctx, t, 'bandpass', 2200, 3, 0.04, 0.4);
}
function playNet() { // ball hitting the net
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime;
  burst(ctx, t, 'highpass', 2200, 0.7, 0.35, 0.3);
  thump(ctx, t, 140, 70, 0.18, 0.5);
}
function playCheer(vol = 0.5) { // crowd roar: overlapping bands of noise swelling in and fading out
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime;
  [[650, 0.9], [1300, 1.1], [2400, 0.8]].forEach(([f, q]) => {
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; src.loop = true;
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.22);
    g.gain.setValueAtTime(vol, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    src.connect(bp).connect(g).connect(ctx.master); src.start(t, Math.random()); src.stop(t + 2);
  });
}
function playGroan(vol = 0.5) { // crowd "ohhh": many voices sliding down in pitch through an "oh" vowel, plus crowd noise
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime, end = t + 1.5;
  const vowel = ctx.createBiquadFilter(); vowel.type = 'bandpass'; vowel.frequency.value = 520; vowel.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 0.11, t + 0.18);
  g.gain.setValueAtTime(vol * 0.11, t + 0.55); g.gain.exponentialRampToValueAtTime(0.0001, end);
  vowel.connect(g).connect(ctx.master);
  for (let i = 0; i < 10; i++) {
    const o = ctx.createOscillator(), f = 140 + Math.random() * 140;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.7, end); // the "ohhh" falls
    o.connect(vowel); o.start(t + Math.random() * 0.08); o.stop(end);
  }
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
  src.buffer = noise; src.loop = true; bp.type = 'bandpass'; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(1100, t); bp.frequency.exponentialRampToValueAtTime(500, end);
  ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.2); ng.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(bp).connect(ng).connect(ctx.master); src.start(t, Math.random()); src.stop(end);
}
function playDrop() { // ball hits the ground and dribbles to a stop
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime;
  [[0, 0.55], [0.22, 0.3], [0.36, 0.16], [0.45, 0.08]].forEach(([dt, v]) => {
    thump(ctx, t + dt, 170, 85, 0.12, v);
    burst(ctx, t + dt, 'lowpass', 900, 0.7, 0.05, v * 0.5);
  });
}

/* ===== tap vs hold on the game cards =====
   quick press -> onTap. held past `min` ms -> onHold(level) every frame, onRelease(level) on let go.
   level runs 0..1 and is full at `full` ms. keyboard enter/space counts as a tap. */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
function holdable(el, { onTap, onHold, onRelease, onCancel, min = 280, full = 1200, max = 1 }) {
  let t0 = 0, raf = 0;
  const level = () => clamp((performance.now() - t0 - min) / (full - min), 0, max); // > 1 = overcharged
  const tick = () => {
    if (performance.now() - t0 > min) {
      const p = level();
      el.classList.add('charging'); el.classList.toggle('full', p >= 1); el.classList.toggle('over', p > 1.08);
      el.style.setProperty('--charge', Math.min(p, 1));
      onHold?.(p);
    }
    raf = requestAnimationFrame(tick);
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    t0 = performance.now(); raf = requestAnimationFrame(tick);
  });
  const end = (e) => {
    if (!t0) return;
    cancelAnimationFrame(raf);
    const held = performance.now() - t0, p = level();
    t0 = 0;
    el.classList.remove('charging', 'full', 'over'); el.style.setProperty('--charge', 0);
    if (e.type !== 'pointerup') { if (held > min) onCancel?.(); return; } // dragged off / scrolled away
    if (held < min) onTap(); else onRelease(p);
  };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => el.addEventListener(type, end));
  el.addEventListener('click', (e) => { if (e.detail === 0) onTap(); });
  el.addEventListener('contextmenu', (e) => e.preventDefault()); // phones: no long-press menu
}

/* ===== Muay thai card: tap to strike, hold to charge a super ===== */
const STRIKES = ['jab', 'cross', 'teep', 'roundhouse', 'elbow', 'knee', 'hook', 'switch kick'];
const SUPERS = ['flying knee', 'superman punch', 'spinning elbow'];
const strikeEl = $('#strike');
const strikeCount = $('#strikeCount');
let strikes = store.get('mt-strikes');
strikeCount.textContent = strikes;
// path each strike takes into the bag (svg 200x200, bag's front face at x≈112); ends at the impact point
const STRIKE_PATHS = {
  jab: 'M10 72 L110 72', cross: 'M0 84 L110 80', hook: 'M70 14 Q132 8 112 74', elbow: 'M76 36 L112 78',
  teep: 'M0 134 L110 128', knee: 'M66 198 Q90 160 112 118',
  roundhouse: 'M0 194 Q36 88 112 102', 'switch kick': 'M12 198 Q58 78 112 96',
  'spinning back kick': 'M0 150 Q10 0 112 92', 'flying knee': 'M30 200 Q40 60 112 84',
  'superman punch': 'M0 20 Q60 30 112 70', 'spinning elbow': 'M60 0 Q150 -10 112 80',
};
// what you see flying in: glove for punches, arm for elbows, leg for knees and kicks
const LIMB = { jab: '🥊', cross: '🥊', hook: '🥊', 'superman punch': '🥊', elbow: '💪', 'spinning elbow': '💪' };
const trail = $('#trail'), bag = $('#bag'), impact = $('#impact'), impactAt = $('#impactAt');
const shock = $('#shock'), limb = $('#limb'), comboEl = $('#combo'), mtCard = $('#muaythai');
let combo = 0, lastStrikeAt = 0;

// moves the glove/leg along the strike path; returns the point it lands on
function flyLimb(name, travelMs, scale) {
  const len = trail.getTotalLength();
  const frames = [];
  for (let i = 0; i <= 8; i++) {
    const a = trail.getPointAtLength((len * i) / 8), b = trail.getPointAtLength(Math.min(len, (len * i) / 8 + 1));
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    frames.push({ transform: `translate(${a.x}px, ${a.y}px) rotate(${ang}deg) scale(${scale})`, opacity: 1, offset: (i / 8) * 0.4 });
  }
  const last = frames[8].transform;
  frames.push({ transform: last, opacity: 1, offset: 0.7 }, { transform: last, opacity: 0, offset: 1 });
  limb.textContent = LIMB[name] || '🦵';
  limb.animate(frames, { duration: travelMs / 0.4, fill: 'forwards' });
  return trail.getPointAtLength(len);
}
function showStrike(name, superP = 0) {
  if (reduced) return;
  const sup = superP > 0;
  const hitAt = sup ? HIT_MS * 2.2 : HIT_MS;
  const power = sup ? 1 + superP : STRIKE_SFX[name][2];
  trail.setAttribute('d', STRIKE_PATHS[name]);
  trail.classList.toggle('super', sup);
  const len = trail.getTotalLength();
  trail.style.strokeDasharray = len;
  trail.animate([{ strokeDashoffset: len, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.2 }, { strokeDashoffset: 0, opacity: 1, offset: 0.55 }, { strokeDashoffset: 0, opacity: 0 }],
    { duration: hitAt * 5, fill: 'forwards' });
  const end = flyLimb(name, hitAt, sup ? 1.7 : 1);
  impactAt.setAttribute('transform', `translate(${end.x} ${end.y})`);
  impact.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(.3)', opacity: 1 }, { transform: `scale(${1 + power * 0.6})`, opacity: 0 }],
    { duration: 340, delay: hitAt, easing: 'ease-out', fill: 'both' });
  if (sup) shock.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: `scale(${4 + superP * 5})`, opacity: 0 }],
    { duration: 750, delay: hitAt, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'both' });
  // hit from the left pushes the bag right, then it swings back and settles
  const a = sup ? -(30 + 55 * superP) : -power * 16;
  const swing = sup ? [0, a, -a * 0.6, a * 0.4, -a * 0.25, a * 0.12, -a * 0.05, 0] : [0, a, -a * 0.55, a * 0.3, -a * 0.12, 0];
  bag.animate(swing.map((deg) => ({ transform: `rotate(${deg}deg)` })),
    { duration: sup ? 2200 + 900 * superP : 700 + power * 500, delay: hitAt, easing: 'ease-in-out' });
}
function countStrike(label) {
  strikeEl.textContent = label;
  restart(strikeEl, 'hit');
  strikeCount.textContent = ++strikes;
  store.set('mt-strikes', strikes);
}
function tapStrike() {
  const strike = pick(STRIKES);
  playStrike(strike);
  showStrike(strike);
  const now = performance.now();
  combo = now - lastStrikeAt < 900 ? combo + 1 : 1;
  lastStrikeAt = now;
  comboEl.textContent = combo > 1 ? `${combo}x combo` : '';
  if (combo > 1) restart(comboEl, 'pop');
  setTimeout(() => restart(mtCard, 'shake'), HIT_MS);
  countStrike(strike + '!');
}
function superStrike(p) {
  const name = p >= 0.95 ? 'spinning back kick' : pick(SUPERS);
  const hitAt = HIT_MS * 2.2;
  playSuper(p, hitAt / 1000);
  showStrike(name, p);
  combo = 0;
  comboEl.textContent = `${Math.round(p * 100)}% power`;
  restart(comboEl, 'pop');
  setTimeout(() => restart(mtCard, 'jolt'), hitAt);
  countStrike(name + '!');
}
holdable(mtCard, {
  onTap: tapStrike,
  onHold: (p) => { const label = p >= 1 ? 'release!' : 'charging…'; if (strikeEl.textContent !== label) strikeEl.textContent = label; },
  onRelease: superStrike,
  onCancel: () => { strikeEl.textContent = 'tap to throw'; },
});

/* ===== Soccer card: keep the ball up ===== */
const ball = { el: $('#ball'), x: 0, vx: 0, y: 0, vy: 0, rot: 0, peak: 0, airborne: false, shooting: false };
const jugglesEl = $('#juggles');
const bestEl = $('#best');
const GRAVITY = 980;
let juggles = 0;
let best = store.get('mt-juggle-best');
bestEl.textContent = best;
// one touch per arc: any time it's falling through the lower 90% of its height
const canTouch = () => !ball.airborne || (ball.vy > 0 && ball.y > ball.peak * 0.9);
function juggle() {
  if (ball.shooting || !canTouch()) return;
  playTouch();
  ball.vy = -520 - Math.random() * 60;
  ball.peak = -(ball.vy * ball.vy) / (2 * GRAVITY);
  // drift sideways: aim for a random landing spot inside the card, reached over one flight
  const card = ball.el.parentElement, pad = 16, home = card.clientWidth * 0.73 - ball.el.offsetWidth; // css: right 27%
  const left = card.clientWidth * 0.3; // stay right of the text column
  const target = -home + left + Math.random() * (card.clientWidth - left - ball.el.offsetWidth - pad);
  ball.vx = (target - ball.x) / ((2 * -ball.vy) / GRAVITY);
  ball.airborne = true;
  jugglesEl.textContent = ++juggles;
  if (juggles > best) { best = juggles; bestEl.textContent = best; store.set('mt-juggle-best', best); }
  if (juggles % 10 === 0) { shout(`🔥 ${juggles}!`); playCheer(0.25); }
}

/* hold to shoot: soft = rolls short, decent = goal, full power = top corner */
const goalEl = $('#goal'), shoutEl = $('#shout'), goalsEl = $('#goals');
let goals = store.get('mt-goals');
goalsEl.textContent = goals;
function shout(text) { shoutEl.textContent = text; restart(shoutEl, 'go'); }
function shoot(p) {
  ball.shooting = true; ball.airborne = false;
  ball.el.classList.remove('ready');
  juggles = 0; jugglesEl.textContent = 0;
  goalEl.classList.add('show');
  playShot(Math.min(p, 1));
  // power decides it: soft rolls short, held too long goes over, a narrow sweet spot finds the top corner
  const outcome = p < 0.3 ? 'soft' : p > 1.08 ? 'over' : p >= 0.88 ? 'bins' : Math.random() < 0.15 ? 'post' : 'goal';
  const inGoal = outcome === 'goal' || outcome === 'bins';
  // ball's resting spot on screen = where it is now minus its current offset
  const from = { x: ball.x, y: ball.y * 0.45 };
  const b = ball.el.getBoundingClientRect();
  const homeX = b.left + b.width / 2 - from.x, homeY = b.top + b.height / 2 - from.y;
  const net = $('.goal__net rect', goalEl).getBoundingClientRect(); // back of the goal
  const posts = $('.goal__posts', goalEl).getBoundingClientRect(); // front frame
  const pt = (x, y) => ({ x: x - homeX, y: y - homeY });
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
  const height = clamp(0.85 - (p - 0.3) * 0.75 + rnd(-0.08, 0.08), 0.3, 0.85); // more power, higher in the net
  const path = {
    soft: [pt(posts.left - b.width * 0.9, homeY)], // rolls up and dies just short of the line
    goal: [pt(rnd(net.left + net.width * 0.2, net.right - net.width * 0.2), net.top + net.height * height)],
    bins: [pt(net.right - net.width * 0.16, net.top + net.height * 0.12)],
    post: [pt(posts.left + 3, posts.top + posts.height * rnd(0.3, 0.7)), pt(posts.left - rnd(60, 110), homeY)],
    over: [pt(posts.left + posts.width * 0.5, posts.top - 70), pt(posts.right + 40, posts.top - 160)],
  }[outcome];
  const at = (q, spin, s = 1, o = 1) => ({ transform: `translate(${q.x}px, ${q.y}px) rotate(${ball.rot + spin}deg) scale(${s})`, opacity: o });
  const lift = inGoal ? 30 + 40 * Math.min(p, 1) : outcome === 'soft' ? 6 : 20;
  const frames = [
    at(from, 0),
    at({ x: (from.x + path[0].x) / 2, y: Math.min(from.y, path[0].y) - lift }, 300, inGoal ? 0.9 : 1),
    at(path[0], 600, inGoal ? 0.68 : outcome === 'over' ? 0.85 : 1), // shrinks going into the goal
  ];
  if (path[1]) frames.push(at(path[1], 900, outcome === 'over' ? 0.6 : 1, outcome === 'over' ? 0 : 1));
  const dur = reduced ? 1 : outcome === 'soft' ? 950 : 600 - 200 * Math.min(p, 1) + (path[1] ? 450 : 0);
  const shot = ball.el.animate(frames, { duration: dur, easing: 'cubic-bezier(.25,.6,.4,1)', fill: 'forwards' });
  if (outcome === 'post') setTimeout(playPost, dur * (2 / 3));
  shot.onfinish = () => {
    if (inGoal) {
      restart(goalEl, 'scored'); playNet(); playCheer(outcome === 'bins' ? 0.7 : 0.5);
      goalsEl.textContent = ++goals; store.set('mt-goals', goals);
      shout(outcome === 'bins' ? 'top bins!' : 'goal!');
    } else {
      shout({ soft: 'too soft', post: 'off the post!', over: 'over the bar!' }[outcome]);
      playGroan(outcome === 'soft' ? 0.3 : 0.6);
    }
    setTimeout(() => { // reset: ball drops back in at its spot
      shot.cancel();
      Object.assign(ball, { x: 0, y: 0, vx: 0, vy: 0, rot: 0, shooting: false });
      ball.el.style.setProperty('--jx', '0px'); ball.el.style.setProperty('--by', '0px'); ball.el.style.setProperty('--br', '0deg');
      ball.el.animate([{ opacity: 0, transform: 'translateY(-60px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      goalEl.classList.remove('show');
    }, 1100);
  };
}
holdable($('#soccer'), {
  onTap: juggle,
  onHold: () => { if (!ball.shooting) goalEl.classList.add('show'); },
  onRelease: (p) => { if (!ball.shooting) shoot(p); },
  onCancel: () => { if (!ball.shooting) goalEl.classList.remove('show'); },
  full: 1100, max: 1.6, // keep holding past full and it goes over the bar
});
function stepBall(dt) {
  if (!ball.airborne || ball.shooting) return;
  ball.vy += GRAVITY * dt;
  ball.y += ball.vy * dt;
  ball.x += ball.vx * dt;
  ball.rot += (ball.vy * -0.6 + ball.vx * 2) * dt; // spins the way it drifts
  ball.el.classList.toggle('ready', canTouch());
  if (ball.y >= 0) {
    ball.y = 0; ball.vy = 0; ball.vx = 0; ball.airborne = false;
    ball.el.classList.remove('ready');
    playDrop();
    juggles = 0; jugglesEl.textContent = 0; // dropped it
  }
  ball.el.style.setProperty('--by', `${ball.y * 0.45}px`); // ~70px of visible travel
  ball.el.style.setProperty('--jx', `${ball.x}px`);
  ball.el.style.setProperty('--br', `${ball.rot}deg`);
}

/* ===== Ship log: count-up stats ===== */
const counter = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  counter.unobserve(e.target);
  const t0 = performance.now();
  (function up(now) {
    const p = reduced ? 1 : Math.min((now - t0) / 1400, 1);
    // read dataset each frame: the github fetch may update the target mid-count
    e.target.textContent = Math.round(+e.target.dataset.count * (1 - Math.pow(1 - p, 3))).toLocaleString('en-CA');
    if (p < 1) requestAnimationFrame(up);
  })(t0);
}), { threshold: 0.6 });
$$('[data-count]').forEach((el) => counter.observe(el));

/* ===== Ship log: live GitHub contribution graph ===== */
// "locked in" era = the unbroken run of weeks, ending this week, with 2+ active days each
const lockedInStart = (activeDaysPerWeek) => {
  let s = activeDaysPerWeek.length;
  while (s > 0 && activeDaysPerWeek[s - 1] >= 2) s--;
  return s;
};

fetch('https://github-contributions-api.jogruber.de/v4/mazentalsam?y=last')
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then(({ total, contributions }) => {
    const graph = $('#graph');
    // pad so the first column starts on sunday, like github
    const pad = new Date(contributions[0].date + 'T00:00').getDay();
    const weekOf = (i) => Math.floor((i + pad) / 7);
    const active = [];
    contributions.forEach((c, i) => { active[weekOf(i)] = (active[weekOf(i)] || 0) + (c.count > 0 ? 1 : 0); });
    const start = lockedInStart(active);
    const hasEra = active.length - start >= 4; // a couple of busy weeks isn't an era

    graph.innerHTML = '<i style="visibility:hidden"></i>'.repeat(pad) + contributions
      .map((c, i) => `<i data-l="${c.level}"${hasEra && weekOf(i) >= start ? ' class="era"' : ''} style="--d:${weekOf(i)}" title="${c.count} contributions · ${c.date}"></i>`).join('');
    $('#contribTotal').dataset.count = Object.values(total)[0];

    if (hasEra) {
      const first = contributions.findIndex((_, i) => weekOf(i) >= start);
      const sum = contributions.slice(first).reduce((n, c) => n + c.count, 0);
      const since = new Date(contributions[first].date + 'T00:00').toLocaleDateString('en-CA', { month: 'short', year: 'numeric' }).toLowerCase().replace('.', '');
      graph.classList.add('has-era');
      graph.insertAdjacentHTML('beforeend', `<div class="era-mark"><span class="long">locked in since ${since} · ${sum.toLocaleString('en-CA')} contributions · ${active.length - start} weeks straight</span><span class="short">locked in · ${active.length - start} weeks</span></div>`);
      const mark = $('.era-mark', graph);
      const firstCell = $('i.era', graph);
      const placeMark = () => {
        mark.style.left = `${firstCell.offsetLeft}px`;
        mark.style.width = `${graph.scrollWidth - firstCell.offsetLeft}px`;
      };
      placeMark();
      addEventListener('resize', placeMark);
    }
    graph.scrollLeft = graph.scrollWidth; // on narrow screens, show the recent end first
  })
  .catch(() => { $('#graph').innerHTML = '<p class="graph__empty">couldn\'t reach github right now — check the profile instead.</p>'; });

/* ===== One frame loop for everything scroll-linked ===== */
const marquee = $('#marquee');
const logo = $('.logo');
const parallax = $$('[data-speed]');
const photo = $('.about__photo img');
const quoteSection = $('#quote');
const cards = $$('.pcard');
let lastY = scrollY;
let lastT = performance.now();

function frame(now) {
  lenis?.raf(now);
  const dt = Math.min((now - lastT) / 1000, 1 / 20);
  lastT = now;
  const y = scrollY;
  const vel = y - lastY;
  lastY = y;
  const vh = innerHeight;

  marquee.classList.toggle('hide', y > vh * 0.04);
  // logo: away once past the hero and heading down; back on any real scroll up (small jitter ignored)
  if (y < vh * 0.8 || vel < -4) logo.classList.remove('away');
  else if (vel > 2) logo.classList.add('away');
  stepBall(dt);

  if (!reduced) {
    if (!isMobile()) parallax.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const centerOffset = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${centerOffset * parseFloat(el.dataset.speed)}px, 0)`;
    });

    const pr = photo.parentElement.getBoundingClientRect();
    if (pr.bottom > 0 && pr.top < vh) photo.style.setProperty('--py', `${((pr.top / vh) - 0.5) * -12}%`);

    // quote words assemble while the sticky section is pinned
    const qr = quoteSection.getBoundingClientRect();
    if (qr.bottom > 0 && qr.top < vh) {
      const p = clamp(-qr.top / (qr.height - vh), 0, 1);
      for (const w of words) {
        const t = clamp((p - w.off) / 0.55, 0, 1);
        const k = 1 - Math.pow(2, -10 * t); // expo out
        const inv = 1 - k;
        w.el.style.transform = `translate3d(${w.x * inv}%, ${w.y * inv}%, ${w.z * inv}px) rotateX(${w.rx * inv}deg)`;
        w.el.style.opacity = k;
      }
    }

    // stacked project cards: each card shrinks and dims as the next one covers it
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const p = clamp(1 - next.getBoundingClientRect().top / vh, 0, 1);
      c.style.setProperty('--s', 1 - p * 0.08);
      c.style.setProperty('--b', 1 - p * 0.55);
    });

    for (const b of badges) {
      if (!b.visible) continue;
      if (!b.drag) {
        if (Math.abs(vel) > 1) b.v += clamp(vel, -60, 60) * 0.004 * (b.el.closest('.job--flip') ? -1 : 1);
        b.v += (-18 * Math.sin(b.a) - 1.3 * b.v) * dt;
        b.a = clamp(b.a + b.v * dt, -1.2, 1.2);
      }
      b.el.style.setProperty('--a', `${b.a}rad`);
      b.el.style.setProperty('--ry', `${clamp(b.v * 12, -35, 35)}deg`);
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (reduced) words.forEach((w) => { w.el.style.opacity = 1; });
