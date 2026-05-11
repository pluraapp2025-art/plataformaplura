const MONTHS = ['Abril','Maio','Junho','Julho','Agosto'];
const mMap   = {Abril:0,Maio:1,Junho:2,Julho:3,Agosto:4};

const mColors = {
  'Aquisição e operação':       '#378ADD',
  'Aquisição inicial':          '#1D9E75',
  'Consultoria e metodologia':  '#9F8DE8',
  'Consultoria e validação':    '#534AB7',
  'Desenvolvimento tecnológico':'#D85A30',
  'Estruturação operacional':   '#C98A1A',
  'Interface e UX':             '#D4537E',
  'Operação e crescimento':     '#639922',
  'Operação inicial':           '#0F9070',
  'Preparação para escala':     '#6e6f78',
  'Validação do modelo':        '#E24B4A',
  'Validação operacional':      '#B83232'
};

const raw = [
  ['Aquisição e operação','Continuidade da aquisição de usuários','Junho','Junho'],
  ['Aquisição e operação','Continuidade da prospecção de clientes','Junho','Junho'],
  ['Aquisição e operação','Operação ativa da newsletter','Junho','Junho'],
  ['Aquisição inicial','Início da captação de usuários','Maio','Maio'],
  ['Aquisição inicial','Primeiros contatos com empreendimentos','Maio','Maio'],
  ['Aquisição inicial','Prospecção dos primeiros clientes','Maio','Maio'],
  ['Consultoria e metodologia','Consolidação inicial do sistema de validação','Junho','Junho'],
  ['Consultoria e validação','Início da estruturação da metodologia de validação','Maio','Maio'],
  ['Desenvolvimento tecnológico','Ajustes com base no uso real','Julho','Agosto'],
  ['Desenvolvimento tecnológico','Conclusão do backend principal','Junho','Junho'],
  ['Desenvolvimento tecnológico','Criação do painel de gestão inicial','Junho','Junho'],
  ['Desenvolvimento tecnológico','Definição da arquitetura do sistema','Maio','Maio'],
  ['Desenvolvimento tecnológico','Estabilização da plataforma','Julho','Agosto'],
  ['Desenvolvimento tecnológico','Impl. cadastro de empreendimentos','Junho','Junho'],
  ['Desenvolvimento tecnológico','Impl. cadastro de usuários','Junho','Junho'],
  ['Desenvolvimento tecnológico','Início da estrutura do banco de dados','Maio','Maio'],
  ['Desenvolvimento tecnológico','Início do desenvolvimento do backend','Maio','Maio'],
  ['Desenvolvimento tecnológico','Planejamento técnico do MVP','Maio','Maio'],
  ['Desenvolvimento tecnológico','Refinamento do sistema','Julho','Agosto'],
  ['Estruturação operacional','Criação dos primeiros fluxos de comunicação','Abril','Maio'],
  ['Estruturação operacional','Estruturação da newsletter','Abril','Maio'],
  ['Estruturação operacional','Estruturação do Google Forms e fluxos de entrada','Abril','Maio'],
  ['Estruturação operacional','Organização da base inicial de usuários','Abril','Maio'],
  ['Interface e UX','Definição inicial da interface','Maio','Maio'],
  ['Interface e UX','Impl. da interface acessível inicial','Junho','Junho'],
  ['Interface e UX','Integração frontend e backend','Junho','Junho'],
  ['Interface e UX','Planejamento da acessibilidade da interface','Maio','Maio'],
  ['Operação e crescimento','Continuidade da aquisição de clientes','Julho','Julho'],
  ['Operação e crescimento','Continuidade da aquisição de usuários','Julho','Julho'],
  ['Operação e crescimento','Operação contínua da newsletter','Julho','Julho'],
  ['Operação inicial','Envio dos primeiros e-mails informativos','Maio','Maio'],
  ['Operação inicial','Início da operação ativa da newsletter','Maio','Maio'],
  ['Preparação para escala','Consolidação dos fluxos operacionais','Agosto','Agosto'],
  ['Preparação para escala','Estruturação do roadmap de expansão','Agosto','Agosto'],
  ['Validação do modelo','Consolidação da metodologia de validação','Agosto','Agosto'],
  ['Validação do modelo','Estruturação inicial do sistema de selo','Agosto','Agosto'],
  ['Validação operacional','Inserção dos primeiros dados reais no sistema','Junho','Junho'],
  ['Validação operacional','Testes internos do sistema','Junho','Junho'],
];

/* ─── GROUP DATA ─────────────────────────────────────── */
const groups = {};
raw.forEach(r => {
  if (!groups[r[0]]) groups[r[0]] = [];
  groups[r[0]].push(r);
});

/* ─── TOOLTIP ─────────────────────────────────────────── */
const tooltip   = document.getElementById('tooltip');
const ttMeta    = document.getElementById('tt-meta');
const ttName    = document.getElementById('tt-name');
const ttDot     = document.getElementById('tt-dot');
const ttPeriod  = document.getElementById('tt-period');

function showTooltip(e, act) {
  const [meta, name, start, end] = act;
  ttMeta.textContent  = meta;
  ttMeta.style.color  = mColors[meta];
  ttName.textContent  = name;
  ttDot.style.background = mColors[meta];
  ttPeriod.textContent = start === end ? start : `${start} → ${end}`;
  tooltip.classList.add('visible');
  moveTooltip(e);
}

function moveTooltip(e) {
  const x = e.clientX + 14;
  const y = e.clientY - 10;
  tooltip.style.left = Math.min(x, window.innerWidth - 260) + 'px';
  tooltip.style.top  = y + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

/* ─── BUILD GANTT ─────────────────────────────────────── */
function buildGantt(filterMeta) {
  const body = document.getElementById('ganttBody');
  body.innerHTML = '';

  const metaKeys = Object.keys(groups).sort();
  const visible  = filterMeta === 'all' ? metaKeys : metaKeys.filter(m => m === filterMeta);

  visible.forEach(meta => {
    const color = mColors[meta];
    const grp   = document.createElement('div');
    grp.className = 'meta-group';

    const lbl = document.createElement('div');
    lbl.className = 'meta-label';
    lbl.style.color = color;
    lbl.textContent = meta;
    grp.appendChild(lbl);

    groups[meta].forEach(act => {
      const [, name, start, end] = act;
      const s = mMap[start];
      const e = mMap[end];

      const row = document.createElement('div');
      row.className = 'activity-row';

      const nameEl = document.createElement('div');
      nameEl.className = 'activity-name';
      nameEl.textContent = name;
      nameEl.title = name;

      const track = document.createElement('div');
      track.className = 'bar-track';

      for (let m = 0; m < 5; m++) {
        const cell = document.createElement('div');
        cell.className = 'bar-cell';
        if (m >= s && m <= e) {
          cell.classList.add('filled');
          cell.style.background = color;
          cell.style.opacity = '0.85';
          if (m === s && m === e) {
            cell.style.borderRadius = '4px';
          } else if (m === s) {
            cell.style.borderRadius = '4px 0 0 4px';
          } else if (m === e) {
            cell.style.borderRadius = '0 4px 4px 0';
          } else {
            cell.style.borderRadius = '0';
          }
        }
        track.appendChild(cell);
      }

      row.appendChild(nameEl);
      row.appendChild(track);

      row.addEventListener('mouseenter', e => showTooltip(e, act));
      row.addEventListener('mousemove',  e => moveTooltip(e));
      row.addEventListener('mouseleave', hideTooltip);

      grp.appendChild(row);
    });

    body.appendChild(grp);
  });
}

/* ─── BUILD LEGEND ───────────────────────────────────── */
function buildLegend() {
  const lg = document.getElementById('legendGrid');
  Object.keys(groups).sort().forEach(meta => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${mColors[meta]}"></span>${meta}`;
    lg.appendChild(item);
  });
}

/* ─── BUILD FILTER CHIPS ─────────────────────────────── */
function buildFilters() {
  const bar = document.getElementById('filterBar');
  Object.keys(groups).sort().forEach(meta => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.meta = meta;
    btn.innerHTML = `<span class="dot" style="background:${mColors[meta]}"></span>${meta}`;
    bar.appendChild(btn);
  });

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildGantt(btn.dataset.meta);
  });
}

/* ─── INIT ───────────────────────────────────────────── */
buildFilters();
buildLegend();
buildGantt('all');

/* ─── THEME TOGGLE ───────────────────────────────────── */
const ICON_DARK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const ICON_LIGHT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

const toggleBtn = document.getElementById('themeToggle');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  toggleBtn.innerHTML = theme === 'light' ? ICON_DARK : ICON_LIGHT;
  toggleBtn.title = theme === 'light' ? 'Modo escuro' : 'Modo claro';
  localStorage.setItem('plura-theme', theme);
}

const savedTheme = localStorage.getItem('plura-theme') ||
  (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

applyTheme(savedTheme);

toggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'light' ? 'dark' : 'light');
});
