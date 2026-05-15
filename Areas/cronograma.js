/* cronograma.js — Cronograma dinâmico com Firestore */

const _CRON_CONFIG = {
  apiKey: "AIzaSyBsU21aZjTUqdCvu8rNQGLXEVFVRgmG9dI",
  authDomain: "plura-249ba.firebaseapp.com",
  projectId: "plura-249ba",
  storageBucket: "plura-249ba.firebasestorage.app",
  messagingSenderId: "212726352993",
  appId: "1:212726352993:web:46683ca58ad37686ff6e20"
};
if (!firebase.apps.length) firebase.initializeApp(_CRON_CONFIG);
const _cronDb = firebase.firestore();

/* ─── ESTADO ─────────────────────────────────────────────── */
let _cronNivel       = null;
let _cronGroups      = new Map();
let _cronActivities  = [];
let _cronEditingId   = null;
let _cronEditGrupoId = null;
let _cronSavedLink   = null;
let _cronFilter      = 'all';
let _cronSelGrpColor = '#378ADD';

const _CRON_TB_STATE = [
  'bold','italic',
  'justifyLeft','justifyCenter','justifyRight','justifyFull',
  'insertUnorderedList','insertOrderedList'
];

function _cronCanEdit() { return _cronNivel === 'A' || _cronNivel === 'B'; }

/* ─── CORES ──────────────────────────────────────────────── */
const _CRON_COLORS = [
  '#378ADD','#1D9E75','#9F8DE8','#534AB7',
  '#D85A30','#C98A1A','#D4537E','#639922',
  '#0F9070','#6e6f78','#E24B4A','#B83232',
];

/* ─── PERÍODO ────────────────────────────────────────────── */
const _CRON_MONTHS       = ['Abril','Maio','Junho','Julho','Agosto','Setembro'];
const _CRON_PERIOD_START = new Date(2026, 3, 1);
const _CRON_PERIOD_END   = new Date(2026, 8, 30);
const _CRON_PERIOD_MS    = (_CRON_PERIOD_END - _CRON_PERIOD_START) + 86400000;

function _cronLeft(dateStr) {
  const ms = new Date(dateStr + 'T12:00:00') - _CRON_PERIOD_START;
  return Math.max(0, Math.min(99.5, ms / _CRON_PERIOD_MS * 100));
}

function _cronWidth(startStr, endStr) {
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr   + 'T00:00:00');
  return Math.max(0.8, Math.min(100, (e - s + 86400000) / _CRON_PERIOD_MS * 100));
}

function _cronMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return _CRON_MONTHS[d.getMonth() - 3] || '';
}
function _cronFullDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
function initCronograma() {
  const container = document.getElementById('cronograma-content');

  container.innerHTML = `
    <div class="cron-controls-row">

      <!-- Lista suspensa de filtros -->
      <div class="cron-dropdown" id="cron-dropdown">
        <button class="cron-dropdown-trigger" id="cron-dropdown-trigger" type="button">
          <span class="cron-dd-dot" id="cron-filter-dot" style="background:#4f7fff"></span>
          <span class="cron-dd-label" id="cron-filter-label">Todos os grupos</span>
          <svg class="cron-dd-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 1 5 5 9 1"/></svg>
        </button>
        <div class="cron-dropdown-panel" id="cron-dropdown-panel" hidden>
          <button class="cron-dropdown-item cron-dd-item--active" data-group="all" type="button">
            <span class="dot" style="background:#4f7fff"></span>
            <span>Todos os grupos</span>
          </button>
        </div>
      </div>

      <!-- Botões de ação (apenas editores) -->
      <button class="cron-act-btn" id="cron-btn-grupo" type="button" hidden>
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="0.65" y="0.65" width="10.7" height="8.7" rx="1.5"/></svg>
        Adicionar Grupo
      </button>
      <button class="cron-act-btn" id="cron-btn-entregas" type="button">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="2" x2="11" y2="2"/><line x1="1" y1="6" x2="8" y2="6"/><line x1="1" y1="10" x2="6" y2="10"/></svg>
        Próximas Entregas
      </button>
      <button class="cron-act-btn cron-act-btn--primary" id="cron-btn-atividade" type="button" hidden>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
        Adicionar Atividade
      </button>

      <!-- Barra de progresso geral (lado direito) -->
      <div class="cron-progress-wrap">
        <div class="cron-progress-track">
          <div class="cron-progress-fill" id="cron-progress-fill"></div>
        </div>
        <span class="cron-progress-pct" id="cron-progress-pct">0%</span>
      </div>

    </div>

    <div class="chart-card" id="ganttCard">
      <div class="chart-header">
        <span class="chart-title">Cronograma — Duração Prevista por Atividade</span>
        <span style="font-size:11px;color:var(--text3)">Ordenado por grupo · ordem alfabética</span>
      </div>

      <div class="gantt-scroll-hint">← deslize para ver o cronograma completo →</div>

      <div class="gantt-scroll-area">
        <div class="gantt-axis-row">
          <div></div>
          <div class="cron-axis-months">
            <div class="axis-month">Abril</div>
            <div class="axis-month">Maio</div>
            <div class="axis-month">Junho</div>
            <div class="axis-month">Julho</div>
            <div class="axis-month">Agosto</div>
            <div class="axis-month">Setembro</div>
          </div>
        </div>
        <div class="gantt-body" id="cron-gantt-body">
          <div style="padding:2rem;color:var(--text3);text-align:center">Carregando…</div>
        </div>
      </div>

      <div class="legend-grid" id="cron-legend"></div>
    </div>

    <!-- ── Modal: Adicionar / Editar Atividade ─────────────── -->
    <div class="modal-overlay" id="cron-modal-ativ" hidden>
      <div class="modal-box cron-ativ-modal-box">
        <div class="modal-header">
          <span class="modal-static-title" id="cron-ativ-heading">Nova Atividade</span>
          <button class="modal-close-btn" id="cron-ativ-close">✕</button>
        </div>

        <div class="cron-form-body">

          <div class="func-fgroup">
            <label class="func-flabel">Nome da atividade</label>
            <input class="func-finput" type="text" id="cron-f-nome" placeholder="Descreva a atividade">
          </div>

          <div class="cron-form-row-gds">
            <div class="func-fgroup">
              <label class="func-flabel">Grupo</label>
              <select class="func-finput func-fselect" id="cron-f-grupo"></select>
            </div>
            <div class="func-fgroup">
              <label class="func-flabel">Data de início</label>
              <input class="func-finput" type="date" id="cron-f-inicio" min="2026-04-01" max="2026-09-30">
            </div>
            <div class="func-fgroup">
              <label class="func-flabel">Data de conclusão</label>
              <input class="func-finput" type="date" id="cron-f-fim" min="2026-04-01" max="2026-09-30">
            </div>
          </div>

          <div class="cron-form-row-envdev">
            <div class="func-fgroup">
              <label class="func-flabel">Envolvido</label>
              <input class="func-finput" type="text" id="cron-f-envolvido" placeholder="Nome ou equipe responsável">
            </div>
            <div class="func-fgroup">
              <label class="func-flabel">Desenvolvimento</label>
              <div class="cron-dev-wrap">
                <input class="func-finput cron-dev-input" type="number"
                       id="cron-f-desenvolvimento" min="0" max="100" step="1" placeholder="0">
                <span class="cron-dev-suffix">%</span>
              </div>
            </div>
          </div>

          <div class="func-fgroup">
            <label class="func-flabel">Descrição</label>
            <div class="func-editor-shell">
              <div class="editor-toolbar" id="cron-tb">
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
                <button class="tb-btn" data-cmd="justifyFull" title="Justificado">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="0" y="4.5" width="14" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="0" y="11.5" width="14" height="1.5" rx="1"/></svg>
                </button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-cmd="insertUnorderedList" title="Tópicos">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2.5" r="1.5"/><rect x="4" y="1.75" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="7" r="1.5"/><rect x="4" y="6.25" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="11.5" r="1.5"/><rect x="4" y="10.75" width="10" height="1.5" rx="1"/></svg>
                </button>
                <button class="tb-btn" data-cmd="insertOrderedList" title="Numeração">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="4" font-size="4.5" font-family="monospace">1.</text><rect x="5" y="1.75" width="9" height="1.5" rx="1"/><text x="0" y="8.5" font-size="4.5" font-family="monospace">2.</text><rect x="5" y="6.25" width="9" height="1.5" rx="1"/><text x="0" y="13" font-size="4.5" font-family="monospace">3.</text><rect x="5" y="10.75" width="9" height="1.5" rx="1"/></svg>
                </button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-action="line" title="Linha contínua">—</button>
                <button class="tb-btn" data-action="table" title="Tabela 2 colunas">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1" opacity="0.5"/><rect x="8" y="0" width="6" height="6" rx="1" opacity="0.5"/><rect x="0" y="8" width="6" height="6" rx="1" opacity="0.5"/><rect x="8" y="8" width="6" height="6" rx="1" opacity="0.5"/></svg>
                </button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-action="hyperlink" title="Inserir hiperlink">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5.5 8.5a3 3 0 0 0 4.2.1l1.8-1.8a3 3 0 0 0-4.2-4.2L6.2 3.6"/><path d="M8.5 5.5a3 3 0 0 0-4.2-.1L2.5 7.2a3 3 0 0 0 4.2 4.2l1.1-1"/></svg>
                </button>
                <span class="tb-sep"></span>
                <div class="tb-color-wrap" id="cron-tb-color-wrap">
                  <button class="tb-btn tb-color-toggle" data-action="color-toggle" title="Cor do texto">
                    <span id="cron-tb-color-prev">A</span>
                  </button>
                  <div class="tb-color-grid" id="cron-tb-color-grid" hidden>
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
              <div class="editor-area func-editor-area" id="cron-editor" contenteditable="true"></div>
            </div>
          </div>

        </div>

        <div class="modal-footer">
          <button class="btn-modal-cancel" id="cron-ativ-cancel">Cancelar</button>
          <button class="btn-modal-delete" id="cron-ativ-delete" hidden>Excluir</button>
          <button class="btn-modal-save"   id="cron-ativ-save">Salvar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal: Adicionar / Editar Grupo ─────────────────── -->
    <div class="modal-overlay" id="cron-modal-grupo" hidden>
      <div class="modal-box modal-box--sm">
        <div class="modal-header">
          <span class="modal-static-title" id="cron-grupo-heading">Novo Grupo</span>
          <button class="modal-close-btn" id="cron-grupo-close">✕</button>
        </div>
        <div class="cron-form-body">
          <div class="func-fgroup">
            <label class="func-flabel">Nome do grupo</label>
            <input class="func-finput" type="text" id="cron-f-grupo-nome"
                   placeholder="Ex: Desenvolvimento tecnológico">
          </div>
          <div class="func-fgroup func-fgroup--cor">
            <label class="func-flabel">Cor</label>
            <div class="func-cor-row">
              <div class="func-cor-preview" id="cron-cor-preview"></div>
              <div class="func-cor-swatches" id="cron-cor-swatches">
                ${_CRON_COLORS.map(c =>
                  `<button class="func-cor-swatch cron-cor-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`
                ).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer cron-grupo-footer">
          <button class="btn-modal-delete" id="cron-grupo-delete" hidden>Excluir Grupo</button>
          <div class="cron-grupo-footer-actions">
            <button class="btn-modal-cancel" id="cron-grupo-cancel">Cancelar</button>
            <button class="btn-modal-save"   id="cron-grupo-save">Salvar Grupo</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal: Próximas Entregas ──────────────────────── -->
    <div class="modal-overlay" id="cron-modal-entregas" hidden>
      <div class="modal-box cron-entregas-modal-box">
        <div class="modal-header">
          <span class="modal-static-title">Próximas Entregas</span>
          <button class="modal-close-btn" id="cron-entregas-close">✕</button>
        </div>
        <div class="cron-entregas-table-wrap">
          <table class="cron-entregas-table">
            <thead>
              <tr>
                <th>Atividade</th>
                <th>Grupo</th>
                <th>Responsável</th>
                <th>Conclusão</th>
              </tr>
            </thead>
            <tbody id="cron-entregas-tbody"></tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="cron-entregas-cancel">Fechar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal: Hiperlink ────────────────────────────────── -->
    <div class="modal-overlay" id="cron-modal-link" hidden>
      <div class="modal-box modal-box--sm">
        <div class="modal-header">
          <span class="modal-static-title">Inserir Hiperlink</span>
          <button class="modal-close-btn" id="cron-link-close">✕</button>
        </div>
        <div class="modal-body-hyperlink">
          <label class="hyperlink-label">URL</label>
          <input class="hyperlink-input" type="url" id="cron-link-url" placeholder="https://...">
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="cron-link-cancel">Cancelar</button>
          <button class="btn-modal-save"   id="cron-link-save">Salvar</button>
        </div>
      </div>
    </div>
  `;

  _cronSetupAtivModal(container);
  _cronSetupGrupoModal(container);
  _cronSetupLinkModal(container);
  _cronSetupFilterBar(container);
  _cronSetupEntregasModal(container);
  _cronLoadNivel(container, () => _cronLoad(container));
}

/* ═══════════════════════════════════════════════════════════
   PERMISSÕES
   ═══════════════════════════════════════════════════════════ */
async function _cronLoadNivel(el, cb) {
  const email = localStorage.getItem('plura-user-email') || '';
  try {
    if (!email) {
      _cronNivel = 'A';
    } else {
      const snap = await _cronDb.collection('perfil')
        .where('email', '==', email).limit(1).get();
      _cronNivel = snap.empty ? 'A' : (snap.docs[0].data().nivel || 'A');
    }
  } catch { _cronNivel = 'A'; }
  el.querySelector('#cron-btn-grupo').hidden     = !_cronCanEdit();
  el.querySelector('#cron-btn-atividade').hidden  = !_cronCanEdit();
  if (cb) cb();
}

/* ═══════════════════════════════════════════════════════════
   FIRESTORE: CARREGAR
   ═══════════════════════════════════════════════════════════ */
async function _cronLoad(el) {
  try {
    const snap = await _cronDb.collection('cronograma').orderBy('ordem').get();
    if (snap.empty) {
      await _cronSeed(el);
      return;
    }
    _cronGroups     = new Map();
    _cronActivities = [];
    snap.docs.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      if (d.tipo === 'grupo')      _cronGroups.set(d.id, d);
      else if (d.tipo === 'atividade') _cronActivities.push(d);
    });
    _cronRender(el);
    _cronUpdateStats();
  } catch (err) {
    console.error('[cronograma] Erro ao carregar:', err);
    el.querySelector('#cron-gantt-body').innerHTML =
      '<p style="padding:2rem;color:var(--text3);text-align:center">Erro ao carregar dados.</p>';
  }
}

function _cronUpdateStats() {
  const strip = document.querySelector('#section-cronograma .stats-strip');
  if (!strip) return;
  const vals = strip.querySelectorAll('.stat-value');
  const lbls = strip.querySelectorAll('.stat-label');
  if (vals[0]) vals[0].textContent = _cronGroups.size;
  if (vals[1]) vals[1].textContent = _cronActivities.length;
  if (vals[2]) vals[2].textContent = '6';
  if (vals[3]) {
    vals[3].textContent = 'Abr–Set';
    vals[3].style.fontSize    = '1.35rem';
    vals[3].style.paddingTop  = '0.2rem';
  }
  if (lbls[3]) lbls[3].textContent = 'Período 2026';
}

/* ═══════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════ */
function _cronUpdateProgress(el) {
  const fill  = el.querySelector('#cron-progress-fill');
  const pctEl = el.querySelector('#cron-progress-pct');
  if (!fill || !pctEl) return;
  if (!_cronActivities.length) {
    fill.style.width  = '0%';
    pctEl.textContent = '0%';
    return;
  }
  const avg     = _cronActivities.reduce((s, a) => s + (a.desenvolvimento || 0), 0) / _cronActivities.length;
  const rounded = Math.round(avg);
  fill.style.width  = rounded + '%';
  pctEl.textContent = rounded + '%';
}

function _cronSetupEntregasModal(el) {
  const modal   = el.querySelector('#cron-modal-entregas');
  const tbody   = el.querySelector('#cron-entregas-tbody');
  const btnOpen = el.querySelector('#cron-btn-entregas');

  const open = () => {
    const sorted = [..._cronActivities].sort((a, b) =>
      new Date(a.dataConclusao) - new Date(b.dataConclusao)
    );
    tbody.innerHTML = sorted.map(act => {
      const group = _cronGroups.get(act.grupoId);
      const groupName  = group ? group.nome : '—';
      const groupColor = group ? group.cor  : '#999';
      return `<tr>
        <td>${act.nome}</td>
        <td><span class="cron-ent-group-cell"><span class="cron-ent-dot" style="background:${groupColor}"></span>${groupName}</span></td>
        <td>${act.envolvido || '—'}</td>
        <td>${_cronFullDate(act.dataConclusao)}</td>
      </tr>`;
    }).join('');
    modal.hidden = false;
  };

  const close = () => { modal.hidden = true; };

  btnOpen.addEventListener('click', open);
  el.querySelector('#cron-entregas-close').addEventListener('click',  close);
  el.querySelector('#cron-entregas-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
}

function _cronRender(el) {
  _cronBuildFilters(el);
  _cronBuildLegend(el);
  _cronBuildGantt(el, _cronFilter);
  _cronUpdateProgress(el);
}

/* ─── DROPDOWN (lista suspensa de filtros) ───────────────── */
function _cronSetupFilterBar(el) {
  const trigger   = el.querySelector('#cron-dropdown-trigger');
  const panel     = el.querySelector('#cron-dropdown-panel');
  const filterDot = el.querySelector('#cron-filter-dot');
  const filterLbl = el.querySelector('#cron-filter-label');

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const opening = panel.hidden;
    panel.hidden  = !opening;
    trigger.classList.toggle('cron-dd-trigger--open', opening);
  });

  document.addEventListener('click', () => {
    panel.hidden = true;
    trigger.classList.remove('cron-dd-trigger--open');
  });

  panel.addEventListener('click', e => {
    e.stopPropagation();
    const item = e.target.closest('.cron-dropdown-item');
    if (!item) return;

    _cronFilter = item.dataset.group;

    const dot = item.querySelector('.dot');
    filterDot.style.background = dot ? dot.style.background : '#4f7fff';
    filterLbl.textContent = item.querySelector('span:last-child').textContent.trim();

    panel.querySelectorAll('.cron-dropdown-item')
      .forEach(i => i.classList.remove('cron-dd-item--active'));
    item.classList.add('cron-dd-item--active');

    panel.hidden = true;
    trigger.classList.remove('cron-dd-trigger--open');
    _cronBuildGantt(el, _cronFilter);
  });
}

function _cronBuildFilters(el) {
  const panel     = el.querySelector('#cron-dropdown-panel');
  const filterDot = el.querySelector('#cron-filter-dot');
  const filterLbl = el.querySelector('#cron-filter-label');

  panel.querySelectorAll('.cron-dropdown-item:not([data-group="all"])').forEach(i => i.remove());

  [..._cronGroups.values()].sort((a, b) => a.nome > b.nome ? 1 : -1).forEach(g => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cron-dropdown-item';
    item.dataset.group = g.id;
    item.innerHTML = `<span class="dot" style="background:${g.cor}"></span><span>${g.nome}</span>`;
    if (g.id === _cronFilter) item.classList.add('cron-dd-item--active');
    panel.appendChild(item);
  });

  /* Se o filtro atual deixou de existir, volta para "all" */
  if (_cronFilter !== 'all' && !_cronGroups.has(_cronFilter)) {
    _cronFilter = 'all';
    if (filterDot) filterDot.style.background = '#4f7fff';
    if (filterLbl) filterLbl.textContent = 'Todos os grupos';
    panel.querySelector('[data-group="all"]')?.classList.add('cron-dd-item--active');
  }
}

/* ─── LEGEND ─────────────────────────────────────────────── */
function _cronBuildLegend(el) {
  const lg = el.querySelector('#cron-legend');
  lg.innerHTML = '';
  [..._cronGroups.values()].sort((a, b) => a.nome > b.nome ? 1 : -1).forEach(g => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${g.cor}"></span>${g.nome}`;
    lg.appendChild(item);
  });
}

/* ─── GANTT ──────────────────────────────────────────────── */
function _cronBuildGantt(el, filter) {
  const body    = el.querySelector('#cron-gantt-body');
  const tooltip = document.getElementById('tooltip');
  const ttMeta  = document.getElementById('tt-meta');
  const ttName  = document.getElementById('tt-name');
  const ttDot   = document.getElementById('tt-dot');
  const ttPer   = document.getElementById('tt-period');

  body.innerHTML = '';

  const visible = [..._cronGroups.values()]
    .filter(g => filter === 'all' || g.id === filter)
    .sort((a, b) => a.nome > b.nome ? 1 : -1);

  if (!visible.length) {
    body.innerHTML = '<p style="padding:2rem;color:var(--text3);text-align:center">Nenhum grupo cadastrado.</p>';
    return;
  }

  visible.forEach(group => {
    const acts = _cronActivities
      .filter(a => a.grupoId === group.id)
      .sort((a, b) => a.nome > b.nome ? 1 : -1);

    const grp = document.createElement('div');
    grp.className = 'meta-group';

    /* Label do grupo */
    const lbl = document.createElement('div');
    lbl.className = 'meta-label';
    lbl.style.color = group.cor;

    const lblText = document.createElement('span');
    lblText.textContent = group.nome;
    lbl.appendChild(lblText);

    if (_cronCanEdit()) {
      const editBtn = document.createElement('button');
      editBtn.className = 'cron-group-edit-btn';
      editBtn.title = 'Editar grupo';
      editBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        _cronOpenGrupoModal(el, group.id, group);
      });
      lbl.appendChild(editBtn);
    }
    grp.appendChild(lbl);

    if (!acts.length) {
      const empty = document.createElement('div');
      empty.className = 'cron-empty-group';
      empty.textContent = 'Nenhuma atividade neste grupo.';
      grp.appendChild(empty);
    }

    acts.forEach(act => {
      const left  = _cronLeft(act.dataInicio);
      const width = _cronWidth(act.dataInicio, act.dataConclusao);

      const row = document.createElement('div');
      row.className = 'activity-row';

      const nameEl = document.createElement('div');
      nameEl.className = 'activity-name';
      nameEl.textContent = act.nome;
      nameEl.title = act.nome;

      /* Track contínua */
      const track = document.createElement('div');
      track.className = 'cron-bar-track';

      const grid = document.createElement('div');
      grid.className = 'cron-bar-grid';
      for (let i = 0; i < 6; i++) {
        const line = document.createElement('div');
        line.className = 'cron-bar-gridline';
        grid.appendChild(line);
      }
      track.appendChild(grid);

      const bar = document.createElement('div');
      bar.className = 'cron-bar';
      bar.style.left  = left + '%';
      bar.style.width = width + '%';

      /* Gradiente de progresso: porção concluída em opacidade 100%, restante em 70% */
      const pct = Math.min(100, Math.max(0, act.desenvolvimento || 0));
      const rgb = _cronHexToRgb(group.cor);
      if (pct <= 0) {
        bar.style.background = `rgba(${rgb},0.7)`;
      } else if (pct >= 100) {
        bar.style.background = `rgba(${rgb},1)`;
      } else {
        bar.style.background =
          `linear-gradient(to right,rgba(${rgb},1) ${pct}%,rgba(${rgb},0.7) ${pct}%)`;
      }

      /* Tooltip hover */
      bar.addEventListener('mouseenter', ev => {
        const startD = _cronFullDate(act.dataInicio);
        const endD   = _cronFullDate(act.dataConclusao);
        ttMeta.textContent  = group.nome;
        ttMeta.style.color  = group.cor;
        ttName.textContent  = act.nome;
        ttDot.style.display = 'none';
        ttPer.innerHTML =
          `<span class="tt-info-row"><span class="tt-lbl">Início:</span>${startD}</span>` +
          `<span class="tt-info-row"><span class="tt-lbl">Conclusão:</span>${endD}</span>` +
          `<span class="tt-info-row"><span class="tt-lbl">Porcentagem:</span>${pct}%</span>`;
        tooltip.classList.add('visible');
        _cronMoveTooltip(ev);
      });
      bar.addEventListener('mousemove',  _cronMoveTooltip);
      bar.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));

      /* Click = abre modal de edição/visualização */
      bar.addEventListener('click', e => {
        e.stopPropagation();
        tooltip.classList.remove('visible');
        _cronOpenAtivModal(el, act.id, act);
      });

      track.appendChild(bar);
      row.appendChild(nameEl);
      row.appendChild(track);
      grp.appendChild(row);
    });

    body.appendChild(grp);
  });
}

function _cronHexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(',');
}

function _cronMoveTooltip(e) {
  const tip = document.getElementById('tooltip');
  if (!tip) return;
  tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 260) + 'px';
  tip.style.top  = (e.clientY - 10) + 'px';
}

/* ═══════════════════════════════════════════════════════════
   MODAL: ATIVIDADE
   ═══════════════════════════════════════════════════════════ */
function _cronSetupAtivModal(el) {
  const modal    = el.querySelector('#cron-modal-ativ');
  const heading  = el.querySelector('#cron-ativ-heading');
  const btnClose = el.querySelector('#cron-ativ-close');
  const btnCncl  = el.querySelector('#cron-ativ-cancel');
  const btnSave  = el.querySelector('#cron-ativ-save');
  const btnDel   = el.querySelector('#cron-ativ-delete');
  const nomeIn   = el.querySelector('#cron-f-nome');
  const grupoSel = el.querySelector('#cron-f-grupo');
  const inicioIn = el.querySelector('#cron-f-inicio');
  const fimIn    = el.querySelector('#cron-f-fim');
  const envolIn  = el.querySelector('#cron-f-envolvido');
  const devIn    = el.querySelector('#cron-f-desenvolvimento');
  const editor   = el.querySelector('#cron-editor');
  const toolbar  = el.querySelector('#cron-tb');
  const colorGrid= el.querySelector('#cron-tb-color-grid');
  const colorPrev= el.querySelector('#cron-tb-color-prev');

  /* Botão novo */
  el.querySelector('#cron-btn-atividade').addEventListener('click', () => {
    _cronOpenAtivModal(el, null, null);
  });

  /* Toolbar – atualiza estado dos botões */
  const updateTbState = () => {
    _CRON_TB_STATE.forEach(cmd => {
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

    if (act.dataset.action === 'table') {
      editor.focus();
      const table = _cronGetAncestorTable(window.getSelection(), editor);
      if (table) {
        const range = document.createRange();
        range.setStartAfter(table); range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
      } else {
        document.execCommand('insertHTML', false,
          '<table class="editor-table"><tbody>' +
          '<tr><td><br></td><td><br></td></tr>' +
          '<tr><td><br></td><td><br></td></tr>' +
          '</tbody></table><br>'
        );
      }
      return;
    }

    if (act.dataset.action === 'hyperlink') {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      _cronSavedLink = sel.getRangeAt(0).cloneRange();
      el.querySelector('#cron-modal-link').hidden = false;
      setTimeout(() => el.querySelector('#cron-link-url').focus(), 50);
    }
  });

  /* Fechar */
  const close = () => {
    modal.hidden     = true;
    _cronEditingId   = null;
    editor.innerHTML = '';
    colorGrid.hidden = true;
  };
  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  /* Salvar */
  btnSave.addEventListener('click', async () => {
    if (!_cronCanEdit()) return;
    const nome      = nomeIn.value.trim();
    const grupoId   = grupoSel.value;
    const inicio    = inicioIn.value;
    const fim       = fimIn.value;
    const envolvido      = envolIn.value.trim();
    const desenvolvimento = Math.min(100, Math.max(0, parseInt(devIn.value) || 0));
    const descricao      = editor.innerHTML.trim();

    if (!nome || !grupoId || !inicio || !fim) {
      alert('Preencha nome, grupo e as datas antes de salvar.');
      return;
    }
    if (new Date(fim) < new Date(inicio)) {
      alert('A data de conclusão deve ser igual ou posterior à data de início.');
      return;
    }

    btnSave.disabled = true;
    try {
      if (_cronEditingId) {
        await _cronDb.collection('cronograma').doc(_cronEditingId)
          .update({ nome, grupoId, dataInicio: inicio, dataConclusao: fim,
                    envolvido, desenvolvimento, descricao });
        const idx = _cronActivities.findIndex(a => a.id === _cronEditingId);
        if (idx >= 0) Object.assign(_cronActivities[idx],
          { nome, grupoId, dataInicio: inicio, dataConclusao: fim,
            envolvido, desenvolvimento, descricao });
      } else {
        const lastSnap = await _cronDb.collection('cronograma')
          .orderBy('ordem', 'desc').limit(1).get();
        const ordem = lastSnap.empty ? 1000 : (lastSnap.docs[0].data().ordem || 0) + 1;
        const ref = await _cronDb.collection('cronograma').add({
          tipo: 'atividade', nome, grupoId,
          dataInicio: inicio, dataConclusao: fim,
          envolvido, desenvolvimento, descricao, ordem,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        _cronActivities.push({
          id: ref.id, tipo: 'atividade', nome, grupoId,
          dataInicio: inicio, dataConclusao: fim,
          envolvido, desenvolvimento, descricao, ordem
        });
      }
      _cronUpdateStats();
      _cronBuildGantt(el, _cronFilter);
      close();
    } catch (err) {
      console.error('[cronograma] Erro ao salvar atividade:', err);
    } finally {
      btnSave.disabled = false;
    }
  });

  /* Excluir */
  btnDel.addEventListener('click', async () => {
    if (!_cronCanEdit() || !_cronEditingId) return;
    if (!confirm('Deseja excluir esta atividade?')) return;
    btnDel.disabled = true;
    try {
      await _cronDb.collection('cronograma').doc(_cronEditingId).delete();
      _cronActivities = _cronActivities.filter(a => a.id !== _cronEditingId);
      _cronUpdateStats();
      _cronBuildGantt(el, _cronFilter);
      close();
    } catch (err) {
      console.error('[cronograma] Erro ao excluir atividade:', err);
    } finally {
      btnDel.disabled = false;
    }
  });

  /* Expõe função de abertura no elemento container */
  el._cronOpenAtivModal = (id, data) => {
    _cronEditingId = id;
    const canEdit = _cronCanEdit();

    heading.textContent = id ? 'Editar Atividade' : 'Nova Atividade';
    btnSave.hidden      = !canEdit;
    btnDel.hidden       = !(canEdit && id);
    btnSave.textContent = id ? 'Atualizar' : 'Salvar';

    _cronFillGrupoSelect(grupoSel, data?.grupoId || '');

    nomeIn.value   = data?.nome           || '';
    inicioIn.value = data?.dataInicio     || '';
    fimIn.value    = data?.dataConclusao  || '';
    envolIn.value  = data?.envolvido      || '';
    devIn.value    = data?.desenvolvimento ?? 0;
    editor.innerHTML = data?.descricao    || '';

    [nomeIn, grupoSel, inicioIn, fimIn, envolIn, devIn].forEach(inp => {
      inp.disabled = !canEdit;
    });
    editor.contentEditable        = canEdit ? 'true' : 'false';
    toolbar.style.opacity         = canEdit ? '1' : '0.4';
    toolbar.style.pointerEvents   = canEdit ? '' : 'none';

    modal.hidden = false;
    if (canEdit) setTimeout(() => nomeIn.focus(), 50);
  };
}

function _cronOpenAtivModal(el, id, data) {
  if (el._cronOpenAtivModal) el._cronOpenAtivModal(id, data);
}

function _cronFillGrupoSelect(sel, selectedId) {
  sel.innerHTML = '';
  if (!_cronGroups.size) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— Crie um grupo primeiro —';
    sel.appendChild(opt);
    return;
  }
  [..._cronGroups.values()].sort((a, b) => a.nome > b.nome ? 1 : -1).forEach(g => {
    const opt = document.createElement('option');
    opt.value       = g.id;
    opt.textContent = g.nome;
    if (g.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ═══════════════════════════════════════════════════════════
   MODAL: GRUPO
   ═══════════════════════════════════════════════════════════ */
function _cronSetupGrupoModal(el) {
  const modal    = el.querySelector('#cron-modal-grupo');
  const heading  = el.querySelector('#cron-grupo-heading');
  const btnClose = el.querySelector('#cron-grupo-close');
  const btnCncl  = el.querySelector('#cron-grupo-cancel');
  const btnSave  = el.querySelector('#cron-grupo-save');
  const btnDel   = el.querySelector('#cron-grupo-delete');
  const nomeIn   = el.querySelector('#cron-f-grupo-nome');
  const corPrev  = el.querySelector('#cron-cor-preview');
  const swatches = el.querySelector('#cron-cor-swatches');

  function _setColor(c) {
    _cronSelGrpColor = c;
    corPrev.style.background = c;
    swatches.querySelectorAll('.cron-cor-swatch').forEach(s => {
      s.classList.toggle('func-swatch--active', s.dataset.color === c);
    });
  }
  _setColor(_cronSelGrpColor);

  swatches.addEventListener('click', e => {
    const s = e.target.closest('.cron-cor-swatch');
    if (s) _setColor(s.dataset.color);
  });

  el.querySelector('#cron-btn-grupo').addEventListener('click', () => {
    _cronOpenGrupoModal(el, null, null);
  });

  el._cronOpenGrupoModal = (id, data) => {
    _cronEditGrupoId    = id;
    heading.textContent = id ? 'Editar Grupo' : 'Novo Grupo';
    btnSave.textContent = id ? 'Atualizar Grupo' : 'Salvar Grupo';
    btnDel.hidden       = !id;
    nomeIn.value = data?.nome || '';
    _setColor(data?.cor || _CRON_COLORS[0]);
    modal.hidden = false;
    setTimeout(() => nomeIn.focus(), 50);
  };

  const close = () => {
    modal.hidden     = true;
    _cronEditGrupoId = null;
    nomeIn.value     = '';
  };
  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  btnDel.addEventListener('click', async () => {
    if (!_cronCanEdit() || !_cronEditGrupoId) return;
    const grupo     = _cronGroups.get(_cronEditGrupoId);
    const nomeGrupo = grupo ? grupo.nome : 'este grupo';
    const atvs      = _cronActivities.filter(a => a.grupoId === _cronEditGrupoId);
    const msg = atvs.length
      ? `Excluir o grupo "${nomeGrupo}" e ${atvs.length} atividade${atvs.length > 1 ? 's' : ''} vinculada${atvs.length > 1 ? 's' : ''}?\n\nEsta ação não pode ser desfeita.`
      : `Excluir o grupo "${nomeGrupo}"?\n\nEsta ação não pode ser desfeita.`;
    if (!confirm(msg)) return;

    btnDel.disabled = true;
    try {
      const batch = _cronDb.batch();
      batch.delete(_cronDb.collection('cronograma').doc(_cronEditGrupoId));
      atvs.forEach(a => batch.delete(_cronDb.collection('cronograma').doc(a.id)));
      await batch.commit();
      _cronGroups.delete(_cronEditGrupoId);
      _cronActivities = _cronActivities.filter(a => a.grupoId !== _cronEditGrupoId);
      _cronRender(el);
      _cronUpdateStats();
      close();
    } catch (err) {
      console.error('[cronograma] Erro ao excluir grupo:', err);
    } finally {
      btnDel.disabled = false;
    }
  });

  btnSave.addEventListener('click', async () => {
    if (!_cronCanEdit()) return;
    const nome = nomeIn.value.trim();
    const cor  = _cronSelGrpColor;
    if (!nome) { nomeIn.focus(); return; }

    btnSave.disabled = true;
    try {
      if (_cronEditGrupoId) {
        await _cronDb.collection('cronograma').doc(_cronEditGrupoId).update({ nome, cor });
        const g = _cronGroups.get(_cronEditGrupoId);
        if (g) { g.nome = nome; g.cor = cor; }
      } else {
        const lastSnap = await _cronDb.collection('cronograma')
          .orderBy('ordem', 'desc').limit(1).get();
        const ordem = lastSnap.empty ? 0 : (lastSnap.docs[0].data().ordem || 0) + 1;
        const ref = await _cronDb.collection('cronograma').add({
          tipo: 'grupo', nome, cor, ordem,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        _cronGroups.set(ref.id, { id: ref.id, tipo: 'grupo', nome, cor, ordem });
      }
      _cronRender(el);
      _cronUpdateStats();
      close();
    } catch (err) {
      console.error('[cronograma] Erro ao salvar grupo:', err);
    } finally {
      btnSave.disabled = false;
    }
  });
}

function _cronOpenGrupoModal(el, id, data) {
  if (el._cronOpenGrupoModal) el._cronOpenGrupoModal(id, data);
}

/* ═══════════════════════════════════════════════════════════
   MODAL: HIPERLINK
   ═══════════════════════════════════════════════════════════ */
function _cronSetupLinkModal(el) {
  const modal    = el.querySelector('#cron-modal-link');
  const urlInput = el.querySelector('#cron-link-url');
  const btnClose = el.querySelector('#cron-link-close');
  const btnCncl  = el.querySelector('#cron-link-cancel');
  const btnSave  = el.querySelector('#cron-link-save');
  const editor   = el.querySelector('#cron-editor');

  const close = () => { modal.hidden = true; urlInput.value = ''; };
  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnSave.click(); });

  btnSave.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (!url || !_cronSavedLink) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    editor.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_cronSavedLink);
    document.execCommand('createLink', false, url);
    editor.querySelectorAll('a:not([data-href])').forEach(a => {
      a.dataset.href = a.getAttribute('href');
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    _cronSavedLink = null;
    close();
  });
}

/* ═══════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════ */
function _cronGetAncestorTable(sel, editor) {
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== editor) {
    if (node.nodeName === 'TABLE') return node;
    node = node.parentNode;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   SEED — dados iniciais
   ═══════════════════════════════════════════════════════════ */
async function _cronSeed(el) {
  const mDate = {
    Abril:    { s: '2026-04-01', e: '2026-04-30' },
    Maio:     { s: '2026-05-01', e: '2026-05-31' },
    Junho:    { s: '2026-06-01', e: '2026-06-30' },
    Julho:    { s: '2026-07-01', e: '2026-07-31' },
    Agosto:   { s: '2026-08-01', e: '2026-08-31' },
    Setembro: { s: '2026-09-01', e: '2026-09-30' },
  };

  const seedColors = {
    'Aquisição e operação':        '#378ADD',
    'Aquisição inicial':           '#1D9E75',
    'Consultoria e metodologia':   '#9F8DE8',
    'Consultoria e validação':     '#534AB7',
    'Desenvolvimento tecnológico': '#D85A30',
    'Estruturação operacional':    '#C98A1A',
    'Interface e UX':              '#D4537E',
    'Operação e crescimento':      '#639922',
    'Operação inicial':            '#0F9070',
    'Preparação para escala':      '#6e6f78',
    'Validação do modelo':         '#E24B4A',
    'Validação operacional':       '#B83232',
  };

  const seedRaw = [
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

  const groupNames = [...new Set(seedRaw.map(r => r[0]))].sort();
  const groupIds   = {};
  _cronGroups      = new Map();

  const batch1 = _cronDb.batch();
  groupNames.forEach((nome, i) => {
    const ref = _cronDb.collection('cronograma').doc();
    groupIds[nome] = ref.id;
    const cor = seedColors[nome] || '#4f7fff';
    _cronGroups.set(ref.id, { id: ref.id, tipo: 'grupo', nome, cor, ordem: i });
    batch1.set(ref, {
      tipo: 'grupo', nome, cor, ordem: i,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  await batch1.commit();

  const batch2    = _cronDb.batch();
  _cronActivities = [];
  seedRaw.forEach((r, i) => {
    const [grupoNome, nome, startM, endM] = r;
    const grupoId       = groupIds[grupoNome];
    const dataInicio    = mDate[startM].s;
    const dataConclusao = mDate[endM].e;
    const ordem         = groupNames.length + i;
    const ref           = _cronDb.collection('cronograma').doc();
    const data = {
      tipo: 'atividade', nome, grupoId, dataInicio, dataConclusao,
      envolvido: '', descricao: '', ordem,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };
    batch2.set(ref, data);
    _cronActivities.push({ id: ref.id, ...data });
  });
  await batch2.commit();

  _cronRender(el);
  _cronUpdateStats();
}
