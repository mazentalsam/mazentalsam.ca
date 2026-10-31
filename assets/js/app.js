const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth <= 812;

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
import('./scene.js?v=202610302216').then((m) => m.initScene($('#scene'), { reduced })).catch((err) => console.warn('3D scene disabled:', err));

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

/* ===== TD countdown (to jan 1; flips once the term has started) ===== */
const tdDays = Math.ceil((new Date('2027-01-01T00:00:00-05:00') - Date.now()) / 864e5);
if (tdDays > 0) $('#tdDays').textContent = tdDays;
else { $('#tdDays').textContent = 'now'; $('.ncard__count small').textContent = 'on the job'; }

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
function playStrike(name) {
  const ctx = audio(); if (!ctx) return;
  const [body, slap, p] = STRIKE_SFX[name];
  const t = ctx.currentTime;
  burst(ctx, t, 'bandpass', jitter(slap), 0.9, 0.07, 0.9 * p);    // leather crack on the pad
  thump(ctx, t, jitter(body * 2.2), body * 0.55, 0.2, 1.1 * p);  // pad body
  burst(ctx, t, 'lowpass', 500, 0.7, 0.14, 0.45 * p);             // air whoomph
  if (body < 90) thump(ctx, t + 0.012, body * 1.2, body * 0.5, 0.28, 0.6 * p); // kicks land deeper
}
function playTouch() { // foot on ball: hollow bonk + a little leather tick
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime;
  thump(ctx, t, jitter(360, 0.06), 190, 0.13, 0.7);
  burst(ctx, t, 'bandpass', 1800, 2, 0.035, 0.35);
}
function playDrop() { // ball hits the ground and dribbles to a stop
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime;
  [[0, 0.55], [0.22, 0.3], [0.36, 0.16], [0.45, 0.08]].forEach(([dt, v]) => {
    thump(ctx, t + dt, 170, 85, 0.12, v);
    burst(ctx, t + dt, 'lowpass', 900, 0.7, 0.05, v * 0.5);
  });
}

/* ===== Muay thai card: tap to throw strikes ===== */
const STRIKES = ['jab', 'cross', 'teep', 'roundhouse', 'elbow', 'knee', 'hook', 'switch kick'];
const strikeEl = $('#strike');
const strikeCount = $('#strikeCount');
let strikes = store.get('mt-strikes');
strikeCount.textContent = strikes;
$('#muaythai').addEventListener('click', (e) => {
  const strike = STRIKES[Math.floor(Math.random() * STRIKES.length)];
  playStrike(strike);
  strikeEl.textContent = strike + '!';
  strikeEl.classList.remove('hit'); void strikeEl.offsetWidth; strikeEl.classList.add('hit');
  e.currentTarget.classList.remove('shake'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('shake');
  strikeCount.textContent = ++strikes;
  store.set('mt-strikes', strikes);
});

/* ===== Soccer card: keep the ball up ===== */
const ball = { el: $('#ball'), y: 0, vy: 0, rot: 0, airborne: false };
const jugglesEl = $('#juggles');
const bestEl = $('#best');
let juggles = 0;
let best = store.get('mt-juggle-best');
bestEl.textContent = best;
$('#soccer').addEventListener('click', () => {
  if (ball.y > -40 || !ball.airborne) {
    playTouch();
    ball.vy = -620 - Math.random() * 120;
    ball.airborne = true;
    jugglesEl.textContent = ++juggles;
    if (juggles > best) { best = juggles; bestEl.textContent = best; store.set('mt-juggle-best', best); }
  }
});
function stepBall(dt) {
  if (!ball.airborne) return;
  ball.vy += 1500 * dt;
  ball.y += ball.vy * dt;
  ball.rot += ball.vy * dt * -0.6;
  if (ball.y >= 0) {
    ball.y = 0; ball.vy = 0; ball.airborne = false;
    playDrop();
    juggles = 0; jugglesEl.textContent = 0; // dropped it
  }
  ball.el.style.setProperty('--by', `${ball.y * 0.12}px`);
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
      graph.insertAdjacentHTML('beforeend', `<div class="era-mark"><span>locked in since ${since} · ${sum.toLocaleString('en-CA')} contributions · ${active.length - start} weeks straight</span></div>`);
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
