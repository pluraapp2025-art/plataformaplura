/* diarioAtividades.js — Diário de Atividades dinâmico com Firestore */

if (!firebase.apps.length) firebase.initializeApp({
  apiKey: "AIzaSyBsU21aZjTUqdCvu8rNQGLXEVFVRgmG9dI",
  authDomain: "plura-249ba.firebaseapp.com",
  projectId: "plura-249ba",
  storageBucket: "plura-249ba.firebasestorage.app",
  messagingSenderId: "212726352993",
  appId: "1:212726352993:web:46683ca58ad37686ff6e20"
});
const _diarioDb = firebase.firestore();

/* ─── ESTADO ─────────────────────────────────────────────── */
let _diarioNivel        = null;
let _diarioItems        = [];
let _diarioTopicos      = [];
let _diarioEditingId    = null;
let _diarioSavedLink    = null;
let _diarioSearch       = '';
let _diarioFilterTopico = '';
let _diarioSort         = 'data-desc';
let _diarioPendingDel   = null;
let _diarioPendingElDel = null;
let _diarioChartInst    = null;
let _diarioGrafMode     = 'total';      // 'total' | 'topico'
let _diarioGrafTopico   = 'all';
let _diarioGrafAnalysis = 'quantidade'; // 'quantidade' | 'horas'

const _DIARIO_TB_STATE = ['bold','italic','insertUnorderedList','insertOrderedList'];

const _DIARIO_STATUS = [
  { val: 'nao-iniciado',        label: 'Não iniciado'      },
  { val: 'em-desenvolvimento',  label: 'Em desenvolvimento' },
  { val: 'pausado',             label: 'Pausado'            },
  { val: 'em-testes',           label: 'Em testes'          },
  { val: 'concluido',           label: 'Concluído'          },
];

const _DIARIO_SORT_OPTS = [
  { val: 'data-desc', label: 'Data (mais recente)'  },
  { val: 'data-asc',  label: 'Data (mais antigo)'   },
  { val: 'topico',    label: 'Tópico (A–Z)'         },
  { val: 'status',    label: 'Status'                },
];

const _DIARIO_WEEK = ['dom','seg','ter','qua','qui','sex','sáb'];

function _diarioCanEdit() { return _diarioNivel === 'A' || _diarioNivel === 'B'; }

function _diarioFormatDate(dateStr) {
  if (!dateStr || dateStr === '0000-00-00') return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = _DIARIO_WEEK[new Date(y, m - 1, d).getDay()];
  return `${dow} - ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
function initDiarioAtividades() {
  const el = document.getElementById('diario-atividades-content');

  el.innerHTML = `
    <!-- ─── Controles ───────────────────────────────────── -->
    <div class="diario-controls-row">
      <div class="diario-controls-left">

        <!-- Ordenar -->
        <div class="diario-sort-wrap" id="diario-sort-wrap">
          <button class="cron-act-btn" id="diario-btn-sort" type="button">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="0" y1="1" x2="12" y2="1"/><line x1="2" y1="5" x2="10" y2="5"/><line x1="4" y1="9" x2="8" y2="9"/></svg>
            Ordenar
          </button>
          <div class="diario-sort-panel" id="diario-sort-panel">
            ${_DIARIO_SORT_OPTS.map(o =>
              `<button class="diario-sort-item${o.val === _diarioSort ? ' diario-sort-item--active' : ''}"
                       data-sort="${o.val}" type="button">${o.label}</button>`
            ).join('')}
          </div>
        </div>

        <!-- Visualização Gráfica -->
        <button class="cron-act-btn" id="diario-btn-grafico" type="button">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 9 4 5 7 7 11 2"/><line x1="1" y1="11" x2="11" y2="11"/></svg>
          Visualização Gráfica
        </button>
      </div>

      <!-- Novo Diário -->
      <button class="cron-act-btn cron-act-btn--primary" id="diario-btn-novo" type="button" hidden>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
        Novo Diário
      </button>
    </div>

    <!-- ─── Barra de pesquisa + filtro ─────────────────── -->
    <div class="diario-search-bar">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="5" cy="5" r="4"/><line x1="9" y1="9" x2="11.5" y2="11.5"/></svg>
      <input class="diario-search-input" id="diario-search-input" type="text" placeholder="Buscar por título, tópico ou resumo…">
      <button class="diario-search-clear" id="diario-search-clear" type="button" title="Limpar">✕</button>
      <span class="diario-filter-sep"></span>
      <div class="diario-filter-wrap" id="diario-filter-wrap">
        <button class="diario-filter-btn" id="diario-filter-btn" type="button">
          <svg width="11" height="10" viewBox="0 0 11 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="0" y1="1" x2="11" y2="1"/><line x1="2" y1="5" x2="9" y2="5"/><line x1="4" y1="9" x2="7" y2="9"/></svg>
          <span class="diario-filter-label" id="diario-filter-label">Filtrar por tópico</span>
          <svg class="diario-filter-chevron" width="8" height="5" viewBox="0 0 8 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="1 1 4 4 7 1"/></svg>
        </button>
        <div class="diario-filter-panel" id="diario-filter-panel">
          <div class="diario-filter-loading">Carregando…</div>
        </div>
      </div>
    </div>

    <!-- ─── Canvas ──────────────────────────────────────── -->
    <div class="diario-canvas" id="diario-canvas">
      <div class="diario-loading">Carregando…</div>
    </div>

    <!-- ── Modal: Novo / Editar Diário ──────────────────── -->
    <div class="modal-overlay" id="diario-modal-form" hidden>
      <div class="modal-box diario-form-modal-box">
        <div class="modal-header">
          <span class="modal-static-title" id="diario-form-heading">Novo Diário</span>
          <button class="modal-close-btn" id="diario-form-close">✕</button>
        </div>

        <div class="func-card-form-body">

          <!-- Tópico -->
          <div class="func-fgroup">
            <label class="func-flabel">Tópico</label>
            <select class="func-finput func-fselect" id="diario-f-topico">
              <option value="">Carregando tópicos…</option>
            </select>
          </div>

          <!-- Título -->
          <div class="func-fgroup">
            <label class="func-flabel">Título</label>
            <input class="func-finput" type="text" id="diario-f-titulo" placeholder="Título da atividade realizada">
          </div>

          <!-- Data + Horas -->
          <div class="diario-form-row-dh">
            <div class="func-fgroup">
              <label class="func-flabel">Data</label>
              <input class="func-finput" type="date" id="diario-f-data">
            </div>
            <div class="func-fgroup">
              <label class="func-flabel">Horas dedicadas</label>
              <input class="func-finput" type="text" id="diario-f-horas" placeholder="hh:mm" maxlength="5" autocomplete="off">
            </div>
          </div>

          <!-- Resumo das atividades -->
          <div class="func-fgroup">
            <label class="func-flabel">Resumo das atividades</label>
            <input class="func-finput" type="text" id="diario-f-resumo" placeholder="Resumo breve do que foi realizado">
          </div>

          <!-- Detalhes da atividade (editor rico) -->
          <div class="func-fgroup">
            <label class="func-flabel">Detalhes da atividade</label>
            <div class="func-editor-shell">
              <div class="editor-toolbar" id="diario-tb">
                <button class="tb-btn" data-cmd="bold" title="Negrito"><b>B</b></button>
                <button class="tb-btn" data-cmd="italic" title="Itálico"><i>I</i></button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-cmd="justifyLeft" title="Esquerda">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="0" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="0" y="11.5" width="9" height="1.5" rx="1"/></svg>
                </button>
                <button class="tb-btn" data-cmd="justifyCenter" title="Centro">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="2.5" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="2.5" y="11.5" width="9" height="1.5" rx="1"/></svg>
                </button>
                <button class="tb-btn" data-cmd="justifyRight" title="Direita">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="5" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="5" y="11.5" width="9" height="1.5" rx="1"/></svg>
                </button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-cmd="insertUnorderedList" title="Tópicos">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2.5" r="1.5"/><rect x="4" y="1.75" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="7" r="1.5"/><rect x="4" y="6.25" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="11.5" r="1.5"/><rect x="4" y="10.75" width="10" height="1.5" rx="1"/></svg>
                </button>
                <button class="tb-btn" data-cmd="insertOrderedList" title="Numeração">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="4" font-size="4.5" font-family="monospace">1.</text><rect x="5" y="1.75" width="9" height="1.5" rx="1"/><text x="0" y="8.5" font-size="4.5" font-family="monospace">2.</text><rect x="5" y="6.25" width="9" height="1.5" rx="1"/><text x="0" y="13" font-size="4.5" font-family="monospace">3.</text><rect x="5" y="10.75" width="9" height="1.5" rx="1"/></svg>
                </button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-action="line" title="Linha">—</button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-action="hyperlink" title="Inserir hiperlink">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5.5 8.5a3 3 0 0 0 4.2.1l1.8-1.8a3 3 0 0 0-4.2-4.2L6.2 3.6"/><path d="M8.5 5.5a3 3 0 0 0-4.2-.1L2.5 7.2a3 3 0 0 0 4.2 4.2l1.1-1"/></svg>
                </button>
                <span class="tb-sep"></span>
                <div class="tb-color-wrap" id="diario-tb-color-wrap">
                  <button class="tb-btn tb-color-toggle" data-action="color-toggle" title="Cor do texto">
                    <span id="diario-tb-color-prev">A</span>
                  </button>
                  <div class="tb-color-grid" id="diario-tb-color-grid" hidden>
                    <button class="tb-swatch" data-color="#111111" style="background:#111111"></button>
                    <button class="tb-swatch" data-color="#ef4444" style="background:#ef4444"></button>
                    <button class="tb-swatch" data-color="#93c5fd" style="background:#93c5fd"></button>
                    <button class="tb-swatch" data-color="#1d4ed8" style="background:#1d4ed8"></button>
                    <button class="tb-swatch" data-color="#f97316" style="background:#f97316"></button>
                    <button class="tb-swatch" data-color="#facc15" style="background:#facc15"></button>
                    <button class="tb-swatch" data-color="#8b5cf6" style="background:#8b5cf6"></button>
                    <button class="tb-swatch" data-color="#ec4899" style="background:#ec4899"></button>
                  </div>
                </div>
              </div>
              <div class="editor-area func-editor-area" id="diario-editor" contenteditable="true"></div>
            </div>
          </div>

          <!-- Status -->
          <div class="func-fgroup">
            <label class="func-flabel">Status</label>
            <select class="func-finput func-fselect" id="diario-f-status">
              ${_DIARIO_STATUS.map(s => `<option value="${s.val}">${s.label}</option>`).join('')}
            </select>
          </div>

        </div>

        <div class="modal-footer">
          <button class="btn-modal-cancel" id="diario-form-cancel">Cancelar</button>
          <button class="btn-modal-delete" id="diario-form-delete" hidden>Excluir</button>
          <button class="btn-modal-save"   id="diario-form-save">Salvar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal: Excluir ───────────────────────────────── -->
    <div class="modal-overlay" id="diario-modal-del" hidden>
      <div class="modal-box modal-box--sm">
        <div class="modal-header">
          <span class="modal-static-title">Apagar Diário</span>
        </div>
        <div class="modal-body-delete">
          <p>Deseja apagar este registro?</p>
          <p class="modal-delete-warn">Esta ação não pode ser desfeita.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="diario-del-cancel">Cancelar</button>
          <button class="btn-modal-delete" id="diario-del-confirm">Apagar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal: Hiperlink ─────────────────────────────── -->
    <div class="modal-overlay" id="diario-modal-link" hidden>
      <div class="modal-box modal-box--sm">
        <div class="modal-header">
          <span class="modal-static-title">Inserir Hiperlink</span>
          <button class="modal-close-btn" id="diario-link-close">✕</button>
        </div>
        <div class="modal-body-hyperlink">
          <label class="hyperlink-label">URL</label>
          <input class="hyperlink-input" type="url" id="diario-link-url" placeholder="https://…">
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="diario-link-cancel">Cancelar</button>
          <button class="btn-modal-save"   id="diario-link-save">Salvar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal: Visualização Gráfica ─────────────────── -->
    <div class="modal-overlay" id="diario-modal-grafico" hidden>
      <div class="modal-box diario-grafico-modal-box">
        <div class="modal-header">
          <span class="modal-static-title">Visualização Gráfica</span>
          <button class="modal-close-btn" id="diario-grafico-close">✕</button>
        </div>
        <div class="diario-grafico-controls">
          <div class="diario-grafico-toggle" id="diario-grafico-analysis">
            <button class="diario-gtoggle-btn diario-gtoggle-btn--active" data-analysis="quantidade" type="button">Quantidade de atividades</button>
            <button class="diario-gtoggle-btn" data-analysis="horas" type="button">Evolução de horas</button>
          </div>
          <span class="diario-grafico-sep"></span>
          <div class="diario-grafico-toggle" id="diario-grafico-toggle">
            <button class="diario-gtoggle-btn diario-gtoggle-btn--active" data-mode="total" type="button">Total por dia</button>
            <button class="diario-gtoggle-btn" data-mode="topico" type="button">Por tópico</button>
          </div>
          <select class="func-finput func-fselect diario-grafico-topico-sel" id="diario-grafico-topico">
            <option value="all">Todos os tópicos</option>
          </select>
        </div>
        <div class="diario-grafico-wrap">
          <canvas id="diario-grafico-chart"></canvas>
          <p class="diario-grafico-empty" id="diario-grafico-empty" hidden>Nenhum dado para exibir.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="diario-grafico-cancel">Fechar</button>
        </div>
      </div>
    </div>
  `;

  _diarioSetupControls(el);
  _diarioSetupFormModal(el);
  _diarioSetupDeleteModal(el);
  _diarioSetupLinkModal(el);
  _diarioLoadNivel(el, () => _diarioLoad(el));
}

/* ═══════════════════════════════════════════════════════════
   PERMISSÕES
   ═══════════════════════════════════════════════════════════ */
async function _diarioLoadNivel(el, cb) {
  const email = localStorage.getItem('plura-user-email') || '';
  try {
    if (!email) {
      _diarioNivel = 'A';
    } else {
      const snap = await _diarioDb.collection('perfil')
        .where('email', '==', email).limit(1).get();
      _diarioNivel = snap.empty ? 'A' : (snap.docs[0].data().nivel || 'A');
    }
  } catch { _diarioNivel = 'A'; }
  el.querySelector('#diario-btn-novo').hidden = !_diarioCanEdit();
  if (cb) cb();
}

/* ═══════════════════════════════════════════════════════════
   FIRESTORE: CARREGAR
   ═══════════════════════════════════════════════════════════ */
async function _diarioLoad(el) {
  try {
    const snap = await _diarioDb.collection('diarioAtividades').get();
    _diarioItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _diarioRender(el);
  } catch (err) {
    console.error('[diarioAtividades] Erro ao carregar:', err);
    el.querySelector('#diario-canvas').innerHTML =
      '<p style="padding:2rem;color:var(--text3);text-align:center">Erro ao carregar dados.</p>';
  }
}

async function _diarioLoadTopicos() {
  if (_diarioTopicos.length) return;
  try {
    const snap = await _diarioDb.collection('cronogramaAtividades')
      .where('tipo', '==', 'grupo').get();
    _diarioTopicos = snap.docs
      .map(d => ({ nome: d.data().nome || '', cor: d.data().cor || '#4f7fff' }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  } catch { _diarioTopicos = []; }
}

/* ═══════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════ */
function _diarioRender(el) {
  const canvas = el.querySelector('#diario-canvas');
  let items = [..._diarioItems];

  /* Filtro de busca por palavra-chave */
  if (_diarioSearch) {
    const q = _diarioSearch.toLowerCase();
    items = items.filter(it =>
      (it.titulo  || '').toLowerCase().includes(q) ||
      (it.topico  || '').toLowerCase().includes(q) ||
      (it.resumo  || '').toLowerCase().includes(q)
    );
  }

  /* Filtro por tópico */
  if (_diarioFilterTopico) {
    items = items.filter(it => it.topico === _diarioFilterTopico);
  }

  /* Ordenação dentro do grupo de data */
  const sortWithin = arr => {
    if (_diarioSort === 'topico')  arr.sort((a, b) => (a.topico  || '').localeCompare(b.topico  || ''));
    else if (_diarioSort === 'status') arr.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    else arr.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  };

  /* Agrupar por data */
  const byDate = new Map();
  items.forEach(it => {
    const key = it.data || '0000-00-00';
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(it);
  });

  /* Ordenar grupos de data */
  const dateKeys = [...byDate.keys()].sort((a, b) =>
    _diarioSort === 'data-asc' ? (a > b ? 1 : -1) : (b > a ? 1 : -1)
  );

  canvas.innerHTML = '';

  if (!dateKeys.length) {
    canvas.innerHTML = '<p class="diario-empty">Nenhum diário cadastrado. Clique em "Novo Diário" para começar.</p>';
    return;
  }

  dateKeys.forEach(dateKey => {
    const dayItems = byDate.get(dateKey);
    sortWithin(dayItems);

    const group = document.createElement('div');
    group.className = 'diario-date-group';

    const divider = document.createElement('div');
    divider.className = 'diario-date-divider';
    divider.innerHTML = `<span class="diario-date-label">${_diarioFormatDate(dateKey)}</span>`;
    group.appendChild(divider);

    const row = document.createElement('div');
    row.className = 'func-cards-row';
    dayItems.forEach(it => row.appendChild(_diarioBuildCard(el, it)));
    group.appendChild(row);

    canvas.appendChild(group);
  });
}

/* ─── Card ───────────────────────────────────────────────── */
function _diarioBuildCard(el, item) {
  const statusInfo = _DIARIO_STATUS.find(s => s.val === item.status) || { label: item.status || '' };
  const cor = item.topicoCor || '#4f7fff';

  const card = document.createElement('div');
  card.className = 'feature-card';
  card.dataset.diarioId = item.id;

  card.innerHTML = `
    <span class="feature-card-tag"
          style="background:${cor}22;color:${cor}">${item.topico || ''}</span>
    <div class="feature-card-title">${item.titulo || ''}</div>
    <div class="feature-card-desc">${item.resumo || ''}</div>
    <div class="feature-card-funcoes">${item.detalhes || ''}</div>
    <div class="diario-card-footer">
      <span class="status-badge ${item.status || ''}">${statusInfo.label}</span>
      ${item.horas ? `<span class="diario-horas-badge">${item.horas}</span>` : ''}
    </div>
  `;

  if (_diarioCanEdit()) {
    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      _diarioShowCtx(el, [
        { label: 'Editar',  fn: () => _diarioOpenForm(el, item.id, item) },
        { label: 'Apagar', danger: true, fn: () => _diarioConfirmDel(el, item.id, card) }
      ], e.clientX, e.clientY);
    });
  }

  return card;
}

/* ═══════════════════════════════════════════════════════════
   CONTROLES
   ═══════════════════════════════════════════════════════════ */
function _diarioSetupControls(el) {

  /* ── Ordenar ── */
  const sortPanel = el.querySelector('#diario-sort-panel');
  const sortBtn   = el.querySelector('#diario-btn-sort');

  sortBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = sortPanel.classList.contains('is-open');
    _diarioCloseAllDropdowns(el);
    if (!isOpen) sortPanel.classList.add('is-open');
  });

  sortPanel.addEventListener('click', e => {
    e.stopPropagation();
    const item = e.target.closest('.diario-sort-item');
    if (!item) return;
    _diarioSort = item.dataset.sort;
    sortPanel.querySelectorAll('.diario-sort-item').forEach(i => i.classList.remove('diario-sort-item--active'));
    item.classList.add('diario-sort-item--active');
    sortPanel.classList.remove('is-open');
    _diarioRender(el);
  });

  /* ── Busca ── */
  const searchInput = el.querySelector('#diario-search-input');
  const searchClear = el.querySelector('#diario-search-clear');

  searchInput.addEventListener('input', () => {
    _diarioSearch = searchInput.value.trim();
    _diarioRender(el);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    _diarioSearch = '';
    _diarioRender(el);
    searchInput.focus();
  });

  /* ── Filtro por tópico ── */
  const filterPanel = el.querySelector('#diario-filter-panel');
  const filterBtn   = el.querySelector('#diario-filter-btn');
  const filterLabel = el.querySelector('#diario-filter-label');

  filterBtn.addEventListener('click', async e => {
    e.stopPropagation();
    const isOpen = filterPanel.classList.contains('is-open');
    _diarioCloseAllDropdowns(el);
    if (isOpen) return;

    /* Popula com tópicos */
    await _diarioLoadTopicos();
    filterPanel.innerHTML = [
      { nome: '', cor: '#4f7fff', label: 'Todos os tópicos' },
      ..._diarioTopicos.map(t => ({ ...t, label: t.nome }))
    ].map(t => `
      <button class="diario-filter-item${_diarioFilterTopico === t.nome ? ' diario-filter-item--active' : ''}"
              data-topico="${t.nome}" type="button">
        <span class="diario-filter-dot" style="background:${t.cor}"></span>
        ${t.label}
      </button>
    `).join('');

    filterPanel.classList.add('is-open');
  });

  filterPanel.addEventListener('click', e => {
    e.stopPropagation();
    const item = e.target.closest('.diario-filter-item');
    if (!item) return;
    _diarioFilterTopico = item.dataset.topico;
    filterLabel.textContent = _diarioFilterTopico || 'Filtrar por tópico';
    filterPanel.querySelectorAll('.diario-filter-item').forEach(i => i.classList.remove('diario-filter-item--active'));
    item.classList.add('diario-filter-item--active');
    filterPanel.classList.remove('is-open');
    _diarioRender(el);
  });

  /* Fechar dropdowns ao clicar fora */
  document.addEventListener('click', () => _diarioCloseAllDropdowns(el));

  /* ── Visualização Gráfica ── */
  const graficoModal = el.querySelector('#diario-modal-grafico');
  const graficoToggle = el.querySelector('#diario-grafico-toggle');
  const graficoTopico = el.querySelector('#diario-grafico-topico');

  el.querySelector('#diario-btn-grafico').addEventListener('click', async () => {
    await _diarioLoadTopicos();
    /* Popula select de tópicos */
    graficoTopico.innerHTML = `<option value="all">Todos os tópicos</option>` +
      _diarioTopicos.map(t => `<option value="${t.nome}">${t.nome}</option>`).join('');
    graficoTopico.value = _diarioGrafTopico;
    graficoModal.hidden = false;
    _diarioRenderGrafico(el);
  });

  const closeGrafico = () => {
    if (_diarioChartInst) { _diarioChartInst.destroy(); _diarioChartInst = null; }
    graficoModal.hidden = true;
  };
  el.querySelector('#diario-grafico-close').addEventListener('click',  closeGrafico);
  el.querySelector('#diario-grafico-cancel').addEventListener('click', closeGrafico);
  graficoModal.addEventListener('click', e => { if (e.target === graficoModal) closeGrafico(); });

  /* Toggle: tipo de análise */
  const graficoAnalysis = el.querySelector('#diario-grafico-analysis');
  graficoAnalysis.addEventListener('click', e => {
    const btn = e.target.closest('.diario-gtoggle-btn');
    if (!btn) return;
    _diarioGrafAnalysis = btn.dataset.analysis;
    graficoAnalysis.querySelectorAll('.diario-gtoggle-btn').forEach(b => b.classList.remove('diario-gtoggle-btn--active'));
    btn.classList.add('diario-gtoggle-btn--active');
    _diarioRenderGrafico(el);
  });

  /* Toggle: agrupamento (total / por tópico) */
  graficoToggle.addEventListener('click', e => {
    const btn = e.target.closest('.diario-gtoggle-btn');
    if (!btn) return;
    _diarioGrafMode = btn.dataset.mode;
    graficoToggle.querySelectorAll('.diario-gtoggle-btn').forEach(b => b.classList.remove('diario-gtoggle-btn--active'));
    btn.classList.add('diario-gtoggle-btn--active');
    _diarioRenderGrafico(el);
  });

  graficoTopico.addEventListener('change', () => {
    _diarioGrafTopico = graficoTopico.value;
    _diarioRenderGrafico(el);
  });

  /* ── Novo Diário ── */
  el.querySelector('#diario-btn-novo').addEventListener('click', () => _diarioOpenForm(el, null, null));
}

function _diarioCloseAllDropdowns(el) {
  el.querySelector('#diario-sort-panel')?.classList.remove('is-open');
  el.querySelector('#diario-filter-panel')?.classList.remove('is-open');
}

/* ═══════════════════════════════════════════════════════════
   VISUALIZAÇÃO GRÁFICA
   ═══════════════════════════════════════════════════════════ */

/* Converte "hh:mm" → horas decimais */
function _diarioHorasToDecimal(horasStr) {
  if (!horasStr) return 0;
  const [h = 0, m = 0] = horasStr.split(':').map(Number);
  return h + m / 60;
}

/* Soma horas decimais de um array de items */
function _diarioSumHoras(items) {
  return items.reduce((acc, i) => acc + _diarioHorasToDecimal(i.horas), 0);
}

function _diarioRenderGrafico(el) {
  const canvas   = el.querySelector('#diario-grafico-chart');
  const emptyMsg = el.querySelector('#diario-grafico-empty');

  if (_diarioChartInst) { _diarioChartInst.destroy(); _diarioChartInst = null; }

  const isHoras = _diarioGrafAnalysis === 'horas';

  /* Filtrar itens pelo tópico selecionado no gráfico */
  const grafItems = _diarioGrafTopico === 'all'
    ? _diarioItems
    : _diarioItems.filter(i => i.topico === _diarioGrafTopico);

  /* Para o modo horas, excluir cards sem horas definidas */
  const baseItems = isHoras
    ? grafItems.filter(i => i.horas && i.horas.trim())
    : grafItems;

  /* Datas únicas ordenadas asc */
  const allDates = [...new Set(baseItems.map(i => i.data || '').filter(Boolean))].sort();

  if (!allDates.length) {
    canvas.style.display = 'none';
    emptyMsg.hidden = false;
    return;
  }
  canvas.style.display = 'block';
  emptyMsg.hidden = true;

  const isDark     = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const labelColor = isDark ? '#9ca3af' : '#6b7280';
  const labels     = allDates.map(d => _diarioFormatDate(d));

  const yLabel  = isHoras ? 'Horas' : 'Atividades';
  const suffix  = isHoras ? 'h' : '';

  if (_diarioGrafMode === 'total') {
    /* ── Uma linha total ── */
    const data = isHoras
      ? allDates.map(d => {
          const v = _diarioSumHoras(baseItems.filter(i => i.data === d));
          return Math.round(v * 100) / 100;
        })
      : allDates.map(d => baseItems.filter(i => i.data === d).length);

    _diarioChartInst = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: isHoras ? 'Horas dedicadas' : 'Atividades realizadas',
          data,
          borderColor: '#4f7fff',
          backgroundColor: 'rgba(79,127,255,0.12)',
          tension: 0.35,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#4f7fff',
        }]
      },
      options: _diarioChartOptions(gridColor, labelColor, false, yLabel, suffix, isHoras)
    });

  } else {
    /* ── Uma linha por tópico ── */
    const topics = _diarioGrafTopico === 'all'
      ? [...new Set(baseItems.map(i => i.topico || '').filter(Boolean))].sort()
      : [_diarioGrafTopico];

    const datasets = topics.map(nome => {
      const t   = _diarioTopicos.find(x => x.nome === nome);
      const cor = t ? t.cor : '#4f7fff';
      const data = isHoras
        ? allDates.map(d => {
            const v = _diarioSumHoras(baseItems.filter(i => i.data === d && i.topico === nome));
            return Math.round(v * 100) / 100;
          })
        : allDates.map(d => baseItems.filter(i => i.data === d && i.topico === nome).length);

      return {
        label: nome,
        data,
        borderColor: cor,
        backgroundColor: cor + '18',
        tension: 0.35,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: cor,
      };
    });

    _diarioChartInst = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: _diarioChartOptions(gridColor, labelColor, topics.length > 1, yLabel, suffix, isHoras)
    });
  }
}

function _diarioChartOptions(gridColor, labelColor, showLegend, yLabel, suffix, isHoras) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom',
        labels: { color: labelColor, boxWidth: 12, padding: 16, font: { size: 11 } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}${suffix}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: labelColor, font: { size: 10 }, maxRotation: 35 }
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        title: {
          display: true,
          text: yLabel,
          color: labelColor,
          font: { size: 11 }
        },
        ticks: {
          color: labelColor,
          font: { size: 11 },
          stepSize: isHoras ? 0.5 : 1,
          callback: v => `${v}${suffix}`
        }
      }
    }
  };
}

/* ═══════════════════════════════════════════════════════════
   MODAL: FORMULÁRIO
   ═══════════════════════════════════════════════════════════ */
function _diarioSetupFormModal(el) {
  const modal     = el.querySelector('#diario-modal-form');
  const heading   = el.querySelector('#diario-form-heading');
  const btnClose  = el.querySelector('#diario-form-close');
  const btnCncl   = el.querySelector('#diario-form-cancel');
  const btnSave   = el.querySelector('#diario-form-save');
  const btnDel    = el.querySelector('#diario-form-delete');
  const topicoSel = el.querySelector('#diario-f-topico');
  const tituloIn  = el.querySelector('#diario-f-titulo');
  const dataIn    = el.querySelector('#diario-f-data');
  const horasIn   = el.querySelector('#diario-f-horas');
  const resumoIn  = el.querySelector('#diario-f-resumo');
  const editor    = el.querySelector('#diario-editor');
  const toolbar   = el.querySelector('#diario-tb');
  const colorGrid = el.querySelector('#diario-tb-color-grid');
  const colorPrev = el.querySelector('#diario-tb-color-prev');
  const statusSel = el.querySelector('#diario-f-status');

  /* Máscara hh:mm */
  horasIn.addEventListener('input', () => {
    let v = horasIn.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + ':' + v.slice(2);
    horasIn.value = v;
  });
  horasIn.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && horasIn.value.endsWith(':')) {
      horasIn.value = horasIn.value.slice(0, -1);
      e.preventDefault();
    }
  });

  /* Toolbar – estado */
  const updateTbState = () => {
    _DIARIO_TB_STATE.forEach(cmd => {
      const b = toolbar.querySelector(`[data-cmd="${cmd}"]`);
      if (b) try { b.classList.toggle('tb-active', document.queryCommandState(cmd)); } catch {}
    });
  };
  editor.addEventListener('keyup',   updateTbState);
  editor.addEventListener('mouseup', updateTbState);
  document.addEventListener('selectionchange', () => {
    if (editor.contains(document.activeElement) || document.activeElement === editor)
      updateTbState();
  });

  toolbar.addEventListener('mousedown', e => {
    e.preventDefault();
    const btn = e.target.closest('[data-cmd]');
    if (btn) { document.execCommand(btn.dataset.cmd, false, null); updateTbState(); return; }

    if (e.target.closest('[data-action="color-toggle"]')) {
      colorGrid.hidden = !colorGrid.hidden;
      if (!colorGrid.hidden) {
        setTimeout(() => document.addEventListener('mousedown', function hide(ev) {
          if (!colorGrid.contains(ev.target)) { colorGrid.hidden = true; document.removeEventListener('mousedown', hide); }
        }), 0);
      }
      return;
    }

    const swatch = e.target.closest('[data-color]');
    if (swatch && colorGrid.contains(swatch)) {
      editor.focus();
      document.execCommand('foreColor', false, swatch.dataset.color);
      colorPrev.style.color = swatch.dataset.color;
      colorGrid.hidden = true;
      return;
    }

    const act = e.target.closest('[data-action]');
    if (!act) return;
    if (act.dataset.action === 'line') {
      editor.focus();
      document.execCommand('insertHTML', false, '<hr class="editor-hr"><br>');
      return;
    }
    if (act.dataset.action === 'hyperlink') {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      _diarioSavedLink = sel.getRangeAt(0).cloneRange();
      el.querySelector('#diario-modal-link').hidden = false;
      setTimeout(() => el.querySelector('#diario-link-url').focus(), 50);
    }
  });

  /* Fechar */
  const close = () => {
    modal.hidden     = true;
    _diarioEditingId = null;
    editor.innerHTML = '';
    colorGrid.hidden = true;
  };
  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click',  close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  /* Salvar */
  btnSave.addEventListener('click', async () => {
    if (!_diarioCanEdit()) return;
    const topico    = topicoSel.value.trim();
    const topicoCor = topicoSel.selectedOptions[0]?.dataset.cor || '#4f7fff';
    const titulo    = tituloIn.value.trim();
    const data      = dataIn.value;
    const horas     = horasIn.value.trim();
    const resumo    = resumoIn.value.trim();
    const detalhes  = editor.innerHTML.trim();
    const status    = statusSel.value;

    if (!titulo || !data) {
      alert('Preencha pelo menos o Título e a Data antes de salvar.');
      return;
    }

    btnSave.disabled = true;
    try {
      if (_diarioEditingId) {
        await _diarioDb.collection('diarioAtividades').doc(_diarioEditingId)
          .update({ topico, topicoCor, titulo, data, horas, resumo, detalhes, status });
        const idx = _diarioItems.findIndex(i => i.id === _diarioEditingId);
        if (idx >= 0) Object.assign(_diarioItems[idx], { topico, topicoCor, titulo, data, horas, resumo, detalhes, status });
      } else {
        const ordem = Date.now();
        const ref = await _diarioDb.collection('diarioAtividades').add({
          topico, topicoCor, titulo, data, horas, resumo, detalhes, status, ordem,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        _diarioItems.push({ id: ref.id, topico, topicoCor, titulo, data, horas, resumo, detalhes, status, ordem });
      }
      const rootEl = document.getElementById('diario-atividades-content');
      _diarioRender(rootEl);
      close();
    } catch (err) {
      console.error('[diarioAtividades] Erro ao salvar:', err);
    } finally {
      btnSave.disabled = false;
    }
  });

  /* Excluir via botão do modal */
  btnDel.addEventListener('click', () => {
    if (!_diarioCanEdit() || !_diarioEditingId) return;
    const id = _diarioEditingId;
    close();
    const rootEl = document.getElementById('diario-atividades-content');
    _diarioConfirmDel(rootEl, id, null);
  });

  /* Função de abertura exposta no container */
  el._diarioOpenForm = async (id, data) => {
    _diarioEditingId = id;
    await _diarioLoadTopicos();

    topicoSel.innerHTML = _diarioTopicos.length
      ? _diarioTopicos.map(t =>
          `<option value="${t.nome}" data-cor="${t.cor}">${t.nome}</option>`
        ).join('')
      : '<option value="">Nenhum tópico encontrado</option>';

    heading.textContent = id ? 'Editar Diário' : 'Novo Diário';
    btnSave.textContent = id ? 'Atualizar' : 'Salvar';
    btnDel.hidden       = !id;

    if (data) {
      const opt = [...topicoSel.options].find(o => o.value === data.topico);
      if (opt) opt.selected = true;
      tituloIn.value   = data.titulo   || '';
      dataIn.value     = data.data     || '';
      horasIn.value    = data.horas    || '';
      resumoIn.value   = data.resumo   || '';
      editor.innerHTML = data.detalhes || '';
      statusSel.value  = data.status   || 'nao-iniciado';
    } else {
      topicoSel.selectedIndex = 0;
      tituloIn.value   = '';
      dataIn.value     = new Date().toISOString().slice(0, 10);
      horasIn.value    = '';
      resumoIn.value   = '';
      editor.innerHTML = '';
      statusSel.value  = 'nao-iniciado';
    }

    modal.hidden = false;
    setTimeout(() => tituloIn.focus(), 50);
  };
}

function _diarioOpenForm(el, id, data) {
  if (el._diarioOpenForm) el._diarioOpenForm(id, data);
}

/* ═══════════════════════════════════════════════════════════
   MODAL: EXCLUIR
   ═══════════════════════════════════════════════════════════ */
function _diarioSetupDeleteModal(el) {
  const modal   = el.querySelector('#diario-modal-del');
  const btnCncl = el.querySelector('#diario-del-cancel');
  const btnConf = el.querySelector('#diario-del-confirm');

  const close = () => {
    modal.hidden        = true;
    _diarioPendingDel   = null;
    _diarioPendingElDel = null;
  };

  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  btnConf.addEventListener('click', async () => {
    if (!_diarioPendingDel) return;
    btnConf.disabled = true;
    try {
      await _diarioDb.collection('diarioAtividades').doc(_diarioPendingDel).delete();
      _diarioItems = _diarioItems.filter(i => i.id !== _diarioPendingDel);
      if (_diarioPendingElDel) _diarioPendingElDel.remove();
      else {
        const rootEl = document.getElementById('diario-atividades-content');
        _diarioRender(rootEl);
      }
      close();
    } catch (err) {
      console.error('[diarioAtividades] Erro ao excluir:', err);
    } finally {
      btnConf.disabled = false;
    }
  });
}

function _diarioConfirmDel(el, id, domEl) {
  _diarioPendingDel   = id;
  _diarioPendingElDel = domEl;
  el.querySelector('#diario-modal-del').hidden = false;
}

/* ═══════════════════════════════════════════════════════════
   MODAL: HIPERLINK
   ═══════════════════════════════════════════════════════════ */
function _diarioSetupLinkModal(el) {
  const modal    = el.querySelector('#diario-modal-link');
  const urlInput = el.querySelector('#diario-link-url');
  const btnClose = el.querySelector('#diario-link-close');
  const btnCncl  = el.querySelector('#diario-link-cancel');
  const btnSave  = el.querySelector('#diario-link-save');
  const editor   = el.querySelector('#diario-editor');

  const close = () => { modal.hidden = true; urlInput.value = ''; };
  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click',  close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnSave.click(); });

  btnSave.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (!url || !_diarioSavedLink) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    editor.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_diarioSavedLink);
    document.execCommand('createLink', false, url);
    editor.querySelectorAll('a:not([data-href])').forEach(a => {
      a.dataset.href = a.getAttribute('href');
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    _diarioSavedLink = null;
    close();
  });
}

/* ═══════════════════════════════════════════════════════════
   CONTEXT MENU
   ═══════════════════════════════════════════════════════════ */
function _diarioShowCtx(el, items, x, y) {
  _diarioCloseCtx();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.id = '__diario-ctx';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px`;
  menu.innerHTML = items.map(it =>
    `<button class="ctx-item${it.danger ? ' ctx-item--danger' : ''}">${it.label}</button>`
  ).join('');
  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  if (rect.right  > window.innerWidth)  menu.style.left = (x - rect.width)  + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top  = (y - rect.height) + 'px';

  menu.querySelectorAll('.ctx-item').forEach((btn, i) => {
    btn.addEventListener('click', () => { _diarioCloseCtx(); items[i].fn(); });
  });
  setTimeout(() => document.addEventListener('click', _diarioCloseCtx, { once: true }), 0);
}

function _diarioCloseCtx() {
  const m = document.getElementById('__diario-ctx');
  if (m) m.remove();
}
