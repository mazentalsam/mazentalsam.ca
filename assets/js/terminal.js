// Portfolio terminal. Uses `$`, `lenis`, `scrollToTarget` from app.js (shared classic-script scope).
const term = $('#term');
const out = $('#termOut');
const input = $('#termIn');
term.setAttribute('data-lenis-prevent', '');

const EMAIL = 'mazentbusiness@gmail.com';
const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const SECTIONS = { home: '#top', about: '#about', now: '#now', experience: '#experience', projects: '#projects', shiplog: '#shiplog', contact: '#contact' };

const COMMANDS = {
  help: () => `available commands:
  <span class="hl">whoami</span>       who is this guy
  <span class="hl">now</span>          what i'm doing right now
  <span class="hl">experience</span>   where i've worked
  <span class="hl">projects</span>     things i've shipped
  <span class="hl">stack</span>        tools i reach for
  <span class="hl">ls</span> / <span class="hl">cd</span>      list / jump to a section
  <span class="hl">resume</span>       download my resume
  <span class="hl">email</span>        copy my email
  <span class="hl">github</span>, <span class="hl">linkedin</span>
  <span class="hl">clear</span>, <span class="hl">exit</span>
psst — there are a few hidden ones.`,
  whoami: () => `mazen talsam
cs @ wilfrid laurier, class of '28
backend-leaning full-stack engineer
founder of csjobs.ca · incoming swe co-op @ td
off the keyboard: muay thai + soccer`,
  now: () => `building   homie.ai — tech lead, 2 pods, 9 engineers
shipping   csjobs.ca — new scrapers every week
next       td global technology solutions, jan 2027
training   muay thai
playing    soccer
learning   cloud infra (aws cloud club)`,
  experience: () => `2027  td                      swe co-op (incoming)
2026  pm accelerator/homie.ai tech lead & full-stack
2026  csjobs.ca               founder
2026  vosyn                   swe intern, ai & cloud
2024  laurier computing soc.  developer & first-year rep`,
  projects: () => `${link('https://csjobs.ca', 'csjobs.ca')}   ai job board for canadian cs students · 500+ users · ${link('https://github.com/mazentalsam/csjobs.ca', 'code')}
${link('https://ruhly.app', 'ruhly')}       daily quran/hadith reflection app · react, ts, supabase · ${link('https://github.com/mazentalsam/ruhly-app', 'code')}
${link('https://github.com/mazentalsam/csjobs-autofill', 'autofill')}    mv3 chrome extension · 17 hiring platforms · ${link('https://github.com/mazentalsam/csjobs-autofill', 'code')}
more → ${link('https://github.com/mazentalsam', 'github.com/mazentalsam')}`,
  stack: () => `languages   python, typescript, javascript, java, c, sql
backend     fastapi, flask, django, node, express
data        postgresql, supabase, sqlalchemy, alembic, sqlite
infra       docker, linux, nginx, ci/cd, git
frontend    react, next.js, react native, tailwind`,
  ls: () => Object.keys(SECTIONS).map((s) => `${s}/`).join('  '),
  cd: (arg) => {
    const target = SECTIONS[(arg || '').replace(/\/$/, '')];
    if (!target) return `cd: no such section: ${arg || ''}\ntry: ${Object.keys(SECTIONS).join(', ')}`;
    closeTerm();
    scrollToTarget($(target));
    return '';
  },
  resume: () => {
    const a = document.createElement('a');
    a.href = 'assets/Mazen-Talsam-Resume.pdf'; a.download = 'Mazen-Talsam-Resume.pdf'; a.click();
    return '<span class="ok">✓</span> downloading resume…';
  },
  email: () => {
    navigator.clipboard?.writeText(EMAIL).catch(() => {});
    return `<span class="ok">✓</span> copied ${EMAIL} to clipboard`;
  },
  github: () => { open('https://github.com/mazentalsam', '_blank', 'noopener'); return 'opening github…'; },
  linkedin: () => { open('https://www.linkedin.com/in/mazen-talsam', '_blank', 'noopener'); return 'opening linkedin…'; },
  clear: () => { out.innerHTML = ''; return ''; },
  exit: () => { closeTerm(); return ''; },

  // hidden
  sudo: (arg) => {
    if (!/^hire( mazen)?$/.test(arg)) return 'sudo: nice try.';
    setTimeout(() => { location.href = `mailto:${EMAIL}?subject=let's%20talk%20about%20a%20role`; }, 1400);
    return `[sudo] password for recruiter: ********
<span class="ok">access granted.</span> opening an email to mazen…`;
  },
  muaythai: () => 'jab, cross, teep, roundhouse. go tap the orange card in /now.',
  soccer: () => 'try the juggling game in /now. your best score is saved.',
  502: () => 'fixed it. moved scraping out of the gunicorn worker. (true story — 1 in 4 requests, gone.)',
  coffee: () => 'error 418: i\'m a teapot.',
  rm: () => 'nice try.',
  hello: () => 'hey 👋 type help to look around.',
};
COMMANDS.hi = COMMANDS.hello;
COMMANDS.exp = COMMANDS.experience;
COMMANDS.contact = COMMANDS.email;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// names avoid window.print / window.close / window.history, which top-level declarations here would clobber
const say = (html) => {
  if (!html) return;
  const p = document.createElement('div');
  p.innerHTML = html;
  out.append(p);
  out.scrollTop = out.scrollHeight;
};

const cmdHistory = [];
let hIdx = 0;
const runCmd = (raw) => {
  const line = raw.trim().toLowerCase();
  say(`<span class="cmd"><b>~ $</b> ${esc(line)}</span>`);
  if (!line) return;
  cmdHistory.push(line); hIdx = cmdHistory.length;
  const [cmd, ...rest] = line.split(/\s+/);
  const fn = Object.hasOwn(COMMANDS, cmd) && COMMANDS[cmd];
  say(fn ? fn(esc(rest.join(' '))) : `command not found: ${esc(cmd)}. try <span class="hl">help</span>`);
};

let greeted = false;
const openTerm = () => {
  if (term.open) return;
  term.showModal();
  lenis?.stop();
  if (!greeted) {
    greeted = true;
    say(`welcome — you found the terminal.
type <span class="hl">help</span> to look around.`);
  }
  input.focus();
};
const closeTerm = () => { if (term.open) term.close(); };
term.addEventListener('close', () => lenis?.start());
term.addEventListener('click', (e) => { if (e.target === term) closeTerm(); });

$('#termForm').addEventListener('submit', (e) => { e.preventDefault(); runCmd(input.value); input.value = ''; });
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && hIdx > 0) { input.value = cmdHistory[--hIdx]; e.preventDefault(); }
  else if (e.key === 'ArrowDown') { hIdx = Math.min(cmdHistory.length, hIdx + 1); input.value = cmdHistory[hIdx] || ''; e.preventDefault(); }
  else if (e.key === 'Tab') {
    e.preventDefault();
    const match = ['help', 'whoami', 'now', 'experience', 'projects', 'stack', 'ls', 'cd', 'resume', 'email', 'github', 'linkedin', 'clear', 'exit']
      .find((c) => c.startsWith(input.value.trim()));
    if (match && input.value.trim()) input.value = match + ' ';
  }
});

$$('[data-term-open]').forEach((b) => b.addEventListener('click', openTerm));
$$('[data-term-close]').forEach((b) => b.addEventListener('click', closeTerm));
addEventListener('keydown', (e) => {
  const typing = /input|textarea/i.test(document.activeElement?.tagName);
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
    e.preventDefault();
    term.open ? closeTerm() : openTerm();
  }
});
