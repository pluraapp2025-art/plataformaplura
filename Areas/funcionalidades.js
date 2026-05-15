/* funcionalidades.js — Canvas interativo de Funcionalidades com Firestore */

const _FUNC_CONFIG = {
  apiKey: "AIzaSyBsU21aZjTUqdCvu8rNQGLXEVFVRgmG9dI",
  authDomain: "plura-249ba.firebaseapp.com",
  projectId: "plura-249ba",
  storageBucket: "plura-249ba.firebasestorage.app",
  messagingSenderId: "212726352993",
  appId: "1:212726352993:web:46683ca58ad37686ff6e20"
};
if (!firebase.apps.length) firebase.initializeApp(_FUNC_CONFIG);
const _funcDb = firebase.firestore();

/* ─── ESTADO ─────────────────────────────────────────────── */
let _funcNivel         = null;
let _funcDragSrc       = null;
let _funcDragSrcCtx    = null; // 'canvas' | areaId
let _funcEditingCardId = null;
let _funcTargetAreaId  = null; // área em que o card será criado
let _funcTargetSecaoId = null;
let _funcPendingDelId  = null;
let _funcPendingDelEl  = null;
let _funcSavedLink     = null;
let _funcSelColor      = '#4f7fff';
let _funcOpenEdit      = null;
let _funcOpenDescModal = null;

function _funcCanEdit() { return _funcNivel === 'A' || _funcNivel === 'B'; }

/* ─── CONSTANTES ─────────────────────────────────────────── */
const _FUNC_COLORS = [
  '#4f7fff','#378ADD','#1D9E75','#0F9070',
  '#9F8DE8','#534AB7','#D4537E','#E24B4A',
  '#D85A30','#C98A1A','#639922','#6e6f78',
];

const _FUNC_STATUS = [
  { val: 'nao-iniciado',        label: 'Não iniciado'      },
  { val: 'em-desenvolvimento',  label: 'Em desenvolvimento' },
  { val: 'pausado',             label: 'Pausado'            },
  { val: 'em-testes',           label: 'Em testes'          },
  { val: 'em-homologacao',      label: 'Em homologação'     },
  { val: 'revisar',             label: 'Revisar'            },
  { val: 'concluido',           label: 'Concluído'          },
];

const _FUNC_TB_STATE = ['bold','italic','insertUnorderedList','insertOrderedList'];

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
function initFuncionalidades() {
  const el = document.getElementById('funcionalidades-content');

  el.innerHTML = `
<div class="func-hero">
  <div class="section-tag">Áreas e Módulos · Plataforma PLURA</div>
  <h1 class="section-heading">FUNCIONALIDADES</h1>
  <p class="section-desc">
    Módulos e áreas de desenvolvimento que compõem a plataforma PLURA INOVA SIMPLES,
    conforme o Plano de Trabalho Revisão 2.
  </p>
  <div class="func-action-row" id="func-action-row" hidden>
    <button class="func-act-btn" id="func-btn-secao">
      <svg width="11" height="2" viewBox="0 0 11 2" fill="currentColor"><rect width="11" height="2" rx="1"/></svg>
      Criar Seção
    </button>
    <button class="func-act-btn" id="func-btn-area">
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="0.65" y="0.65" width="10.7" height="8.7" rx="1.5"/></svg>
      Criar Área
    </button>
    <button class="func-act-btn func-act-btn--primary" id="func-btn-card">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
      Criar Funcionalidade
    </button>
  </div>
</div>

<div class="func-canvas" id="func-canvas">
  <div class="func-loading">Carregando…</div>
</div>

<!-- ── Modal: Criar / Editar Funcionalidade ──────────────── -->
<div class="modal-overlay" id="func-modal-card" hidden>
  <div class="modal-box func-card-modal-box">
    <div class="modal-header">
      <span class="modal-static-title" id="func-card-heading">Nova Funcionalidade</span>
      <button class="modal-close-btn" id="func-card-close">✕</button>
    </div>

    <div class="func-card-form-body">

      <!-- Linha 1: Tópico + Cor -->
      <div class="func-form-row2">
        <div class="func-fgroup">
          <label class="func-flabel">Tópico</label>
          <div class="func-topico-wrap">
            <input class="func-finput" type="text" id="func-topico"
                   placeholder="Ex: Backend, Interface…" autocomplete="off">
            <div class="func-topico-dd" id="func-topico-dd" hidden></div>
          </div>
        </div>
        <div class="func-fgroup func-fgroup--cor">
          <label class="func-flabel">Cor</label>
          <div class="func-cor-row">
            <div class="func-cor-preview" id="func-cor-preview"></div>
            <div class="func-cor-swatches">
              ${_FUNC_COLORS.map(c =>
                `<button class="func-cor-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`
              ).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Título -->
      <div class="func-fgroup">
        <label class="func-flabel">Título</label>
        <input class="func-finput" type="text" id="func-titulo" placeholder="Título da funcionalidade">
      </div>

      <!-- Descrição -->
      <div class="func-fgroup">
        <label class="func-flabel">Descrição</label>
        <input class="func-finput" type="text" id="func-desc" placeholder="Breve descrição">
      </div>

      <!-- Funções (editor rico) -->
      <div class="func-fgroup">
        <label class="func-flabel">Funções</label>
        <div class="func-editor-shell">
          <div class="editor-toolbar" id="func-tb">
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
            <button class="tb-btn" data-action="hyperlink" title="Hiperlink">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5.5 8.5a3 3 0 0 0 4.2.1l1.8-1.8a3 3 0 0 0-4.2-4.2L6.2 3.6"/><path d="M8.5 5.5a3 3 0 0 0-4.2-.1L2.5 7.2a3 3 0 0 0 4.2 4.2l1.1-1"/></svg>
            </button>
            <span class="tb-sep"></span>
            <div class="tb-color-wrap" id="func-tb-color-wrap">
              <button class="tb-btn tb-color-toggle" data-action="color-toggle" title="Cor do texto">
                <span id="func-tb-color-prev">A</span>
              </button>
              <div class="tb-color-grid" id="func-tb-color-grid" hidden>
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
          <div class="editor-area func-editor-area" id="func-editor" contenteditable="true"></div>
        </div>
      </div>

      <!-- Status -->
      <div class="func-fgroup">
        <label class="func-flabel">Status</label>
        <select class="func-finput func-fselect" id="func-status">
          ${_FUNC_STATUS.map(s => `<option value="${s.val}">${s.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-modal-cancel" id="func-card-cancel">Cancelar</button>
      <button class="btn-modal-save" id="func-card-save">Salvar</button>
    </div>
  </div>
</div>

<!-- ── Modal: Excluir ─────────────────────────────────────── -->
<div class="modal-overlay" id="func-modal-del" hidden>
  <div class="modal-box modal-box--sm">
    <div class="modal-header">
      <span class="modal-static-title">Apagar Item</span>
    </div>
    <div class="modal-body-delete">
      <p>Deseja apagar este item?</p>
      <p class="modal-delete-warn">Esta ação não pode ser desfeita.</p>
    </div>
    <div class="modal-footer">
      <button class="btn-modal-cancel" id="func-del-cancel">Cancelar</button>
      <button class="btn-modal-delete" id="func-del-confirm">Apagar</button>
    </div>
  </div>
</div>

<!-- ── Modal: Hiperlink ───────────────────────────────────── -->
<div class="modal-overlay" id="func-modal-link" hidden>
  <div class="modal-box modal-box--sm">
    <div class="modal-header">
      <span class="modal-static-title">Inserir Hiperlink</span>
      <button class="modal-close-btn" id="func-link-close">✕</button>
    </div>
    <div class="modal-body-hyperlink">
      <label class="hyperlink-label">URL</label>
      <input class="hyperlink-input" type="url" id="func-link-url" placeholder="https://…">
    </div>
    <div class="modal-footer">
      <button class="btn-modal-cancel" id="func-link-cancel">Cancelar</button>
      <button class="btn-modal-save" id="func-link-save">Salvar</button>
    </div>
  </div>
</div>

<!-- ── Modal: Descrição / Informações ────────────────────── -->
<div class="modal-overlay" id="func-modal-desc" hidden>
  <div class="modal-box func-desc-modal-box">
    <div class="modal-header">
      <span class="modal-static-title" id="func-desc-heading">Adicionar Descrição</span>
      <button class="modal-close-btn" id="func-desc-close">✕</button>
    </div>
    <div class="func-fgroup func-desc-editor-wrap">
      <div class="func-editor-shell">
        <div class="editor-toolbar" id="func-desc-tb">
          <button class="tb-btn" data-cmd="bold" title="Negrito"><b>B</b></button>
          <button class="tb-btn" data-cmd="italic" title="Itálico"><i>I</i></button>
          <span class="tb-sep"></span>
          <button class="tb-btn" data-cmd="insertUnorderedList" title="Tópicos">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2.5" r="1.5"/><rect x="4" y="1.75" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="7" r="1.5"/><rect x="4" y="6.25" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="11.5" r="1.5"/><rect x="4" y="10.75" width="10" height="1.5" rx="1"/></svg>
          </button>
          <button class="tb-btn" data-cmd="insertOrderedList" title="Numeração">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="4" font-size="4.5" font-family="monospace">1.</text><rect x="5" y="1.75" width="9" height="1.5" rx="1"/><text x="0" y="8.5" font-size="4.5" font-family="monospace">2.</text><rect x="5" y="6.25" width="9" height="1.5" rx="1"/><text x="0" y="13" font-size="4.5" font-family="monospace">3.</text><rect x="5" y="10.75" width="9" height="1.5" rx="1"/></svg>
          </button>
          <span class="tb-sep"></span>
          <button class="tb-btn" data-action="line" title="Linha">—</button>
        </div>
        <div class="editor-area func-editor-area func-desc-editor-area" id="func-desc-editor" contenteditable="true"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-modal-cancel" id="func-desc-cancel">Cancelar</button>
      <button class="btn-modal-save" id="func-desc-save">Salvar</button>
    </div>
  </div>
</div>
`;

  _funcSetupCardModal(el);
  _funcSetupDeleteModal(el);
  _funcSetupLinkModal(el);
  _funcSetupDescModal(el);
  _funcSetupActions(el);
  _funcLoadNivel(el, () => _funcLoad(el));
}

/* ═══════════════════════════════════════════════════════════
   PERMISSÕES
   ═══════════════════════════════════════════════════════════ */
async function _funcLoadNivel(el, cb) {
  const email = localStorage.getItem('plura-user-email') || '';
  try {
    if (!email) {
      _funcNivel = 'A';
    } else {
      const snap = await _funcDb.collection('perfil')
        .where('email', '==', email).limit(1).get();
      _funcNivel = snap.empty ? 'A' : (snap.docs[0].data().nivel || 'A');
    }
  } catch { _funcNivel = 'A'; }
  el.querySelector('#func-action-row').hidden = !_funcCanEdit();
  if (cb) cb();
}

/* ═══════════════════════════════════════════════════════════
   MODAL: CRIAR / EDITAR CARD
   ═══════════════════════════════════════════════════════════ */
function _funcSetupCardModal(el) {
  const modal    = el.querySelector('#func-modal-card');
  const heading  = el.querySelector('#func-card-heading');
  const btnClose = el.querySelector('#func-card-close');
  const btnCncl  = el.querySelector('#func-card-cancel');
  const btnSave  = el.querySelector('#func-card-save');
  const topicoIn = el.querySelector('#func-topico');
  const topicoDd = el.querySelector('#func-topico-dd');
  const corPrev  = el.querySelector('#func-cor-preview');
  const statusSel= el.querySelector('#func-status');
  const editor   = el.querySelector('#func-editor');
  const toolbar  = el.querySelector('#func-tb');
  const colorGrid= el.querySelector('#func-tb-color-grid');
  const colorPrev= el.querySelector('#func-tb-color-prev');

  /* ── Cor selecionada ── */
  function _setColor(c) {
    _funcSelColor = c;
    corPrev.style.background = c;
    el.querySelectorAll('.func-cor-swatch').forEach(s => {
      s.classList.toggle('func-swatch--active', s.dataset.color === c);
    });
  }
  _setColor(_funcSelColor);

  el.querySelector('.func-cor-swatches').addEventListener('click', e => {
    const s = e.target.closest('.func-cor-swatch');
    if (s) _setColor(s.dataset.color);
  });

  /* ── Tópico autocomplete ── */
  async function _loadTopics(query) {
    const snap = await _funcDb.collection('funcionalidades')
      .where('tipo', '==', 'card').get();
    const map = new Map();
    snap.docs.forEach(d => {
      const { topico, cor } = d.data();
      if (topico && !map.has(topico)) map.set(topico, cor || '#4f7fff');
    });
    return [...map.entries()].filter(([t]) =>
      !query || t.toLowerCase().includes(query.toLowerCase())
    );
  }

  topicoIn.addEventListener('input', async () => {
    const q = topicoIn.value.trim();
    const options = await _loadTopics(q);
    if (!options.length) { topicoDd.hidden = true; return; }
    topicoDd.innerHTML = options.map(([t, c]) =>
      `<div class="func-topic-opt" data-topic="${t}" data-color="${c}">
        <span class="func-topic-dot" style="background:${c}"></span>${t}
      </div>`
    ).join('');
    topicoDd.hidden = false;
  });

  topicoDd.addEventListener('mousedown', e => {
    const opt = e.target.closest('.func-topic-opt');
    if (!opt) return;
    topicoIn.value = opt.dataset.topic;
    _setColor(opt.dataset.color);
    topicoDd.hidden = true;
  });

  topicoIn.addEventListener('blur', () => setTimeout(() => { topicoDd.hidden = true; }, 150));

  /* ── Editor toolbar ── */
  const updateTbState = () => {
    _FUNC_TB_STATE.forEach(cmd => {
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
      _funcSavedLink = sel.getRangeAt(0).cloneRange();
      el.querySelector('#func-modal-link').hidden = false;
      setTimeout(() => el.querySelector('#func-link-url').focus(), 50);
    }
  });

  /* ── Abrir para criar ── */
  const openCreate = (areaId = null, secaoId = null) => {
    _funcEditingCardId = null;
    _funcTargetAreaId  = areaId;
    _funcTargetSecaoId = secaoId;
    heading.textContent    = 'Nova Funcionalidade';
    btnSave.textContent    = 'Salvar';
    topicoIn.value         = '';
    el.querySelector('#func-titulo').value   = '';
    el.querySelector('#func-desc').value     = '';
    editor.innerHTML       = '';
    statusSel.value        = 'nao-iniciado';
    _setColor(_funcSelColor);
    modal.hidden = false;
    topicoIn.focus();
  };

  /* ── Abrir para editar ── */
  const openEdit = (docId, data) => {
    _funcEditingCardId = docId;
    _funcTargetAreaId  = data.areaId  || null;
    _funcTargetSecaoId = data.secaoId || null;
    heading.textContent    = 'Editar Funcionalidade';
    btnSave.textContent    = 'Atualizar';
    topicoIn.value         = data.topico   || '';
    el.querySelector('#func-titulo').value   = data.titulo   || '';
    el.querySelector('#func-desc').value     = data.descricao|| '';
    editor.innerHTML       = data.funcoes  || '';
    statusSel.value        = data.status   || 'nao-iniciado';
    _setColor(data.cor || '#4f7fff');
    modal.hidden = false;
    topicoIn.focus();
  };

  _funcOpenEdit = openEdit;

  /* Expõe openCreate globalmente dentro do módulo */
  el._funcOpenCardCreate = openCreate;

  /* ── Fechar ── */
  const close = () => {
    modal.hidden = true;
    topicoDd.hidden = true;
    _funcEditingCardId = null;
  };
  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  /* ── Salvar ── */
  btnSave.addEventListener('click', async () => {
    if (!_funcCanEdit()) return;
    const topico   = topicoIn.value.trim() || 'Geral';
    const cor      = _funcSelColor;
    const titulo   = el.querySelector('#func-titulo').value.trim() || 'Nova Funcionalidade';
    const descricao= el.querySelector('#func-desc').value.trim();
    const funcoes  = editor.innerHTML.trim();
    const status   = statusSel.value;

    btnSave.disabled = true;
    try {
      if (_funcEditingCardId) {
        await _funcDb.collection('funcionalidades').doc(_funcEditingCardId)
          .update({ topico, cor, titulo, descricao, funcoes, status });
        const cardEl = document.querySelector(`[data-func-id="${_funcEditingCardId}"]`);
        if (cardEl) _funcUpdateCardEl(cardEl, { topico, cor, titulo, descricao, funcoes, status });
      } else {
        const ordem = await _funcNextOrder(_funcTargetAreaId, _funcTargetSecaoId);
        const ref = await _funcDb.collection('funcionalidades').add({
          tipo: 'card', topico, cor, titulo, descricao, funcoes, status,
          areaId:  _funcTargetAreaId  || null,
          secaoId: _funcTargetSecaoId || null,
          ordem,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        const container = _funcFindContainer(el, _funcTargetAreaId, _funcTargetSecaoId);
        if (container) {
          const cardEl = _funcBuildCardEl(el, { id: ref.id, topico, cor, titulo, descricao, funcoes, status });
          container.appendChild(cardEl);
        }
      }
      close();
    } catch (err) {
      console.error('Erro ao salvar funcionalidade:', err);
    } finally {
      btnSave.disabled = false;
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   MODAL: EXCLUIR
   ═══════════════════════════════════════════════════════════ */
function _funcSetupDeleteModal(el) {
  const modal   = el.querySelector('#func-modal-del');
  const btnCncl = el.querySelector('#func-del-cancel');
  const btnConf = el.querySelector('#func-del-confirm');

  const close = () => {
    modal.hidden       = true;
    _funcPendingDelId  = null;
    _funcPendingDelEl  = null;
  };

  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  btnConf.addEventListener('click', async () => {
    if (!_funcPendingDelId) return;
    btnConf.disabled = true;
    try {
      /* Se for área, excluir também os cards dela */
      const doc = await _funcDb.collection('funcionalidades').doc(_funcPendingDelId).get();
      if (doc.exists && doc.data().tipo === 'area') {
        const children = await _funcDb.collection('funcionalidades')
          .where('areaId', '==', _funcPendingDelId).get();
        const batch = _funcDb.batch();
        children.forEach(c => batch.delete(c.ref));
        batch.delete(_funcDb.collection('funcionalidades').doc(_funcPendingDelId));
        await batch.commit();
      } else {
        await _funcDb.collection('funcionalidades').doc(_funcPendingDelId).delete();
      }
      if (_funcPendingDelEl) _funcPendingDelEl.remove();
      close();
    } catch (err) {
      console.error('Erro ao apagar:', err);
    } finally {
      btnConf.disabled = false;
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   MODAL: HIPERLINK
   ═══════════════════════════════════════════════════════════ */
function _funcSetupLinkModal(el) {
  const modal    = el.querySelector('#func-modal-link');
  const urlInput = el.querySelector('#func-link-url');
  const btnClose = el.querySelector('#func-link-close');
  const btnCncl  = el.querySelector('#func-link-cancel');
  const btnSave  = el.querySelector('#func-link-save');
  const editor   = el.querySelector('#func-editor');

  const close = () => { modal.hidden = true; urlInput.value = ''; };
  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnSave.click(); });

  btnSave.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (!url || !_funcSavedLink) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    editor.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_funcSavedLink);
    document.execCommand('createLink', false, url);
    editor.querySelectorAll('a:not([data-href])').forEach(a => {
      a.dataset.href = a.getAttribute('href');
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    _funcSavedLink = null;
    close();
  });
}

/* ═══════════════════════════════════════════════════════════
   MODAL: DESCRIÇÃO / INFORMAÇÕES (áreas e seções)
   ═══════════════════════════════════════════════════════════ */
function _funcSetupDescModal(el) {
  const modal   = el.querySelector('#func-modal-desc');
  const heading = el.querySelector('#func-desc-heading');
  const editor  = el.querySelector('#func-desc-editor');
  const toolbar = el.querySelector('#func-desc-tb');
  const btnClose = el.querySelector('#func-desc-close');
  const btnCncl  = el.querySelector('#func-desc-cancel');
  const btnSave  = el.querySelector('#func-desc-save');

  let _descDocId  = null;
  let _descDispEl = null;

  toolbar.addEventListener('mousedown', e => {
    e.preventDefault();
    const btn = e.target.closest('[data-cmd]');
    if (btn) { document.execCommand(btn.dataset.cmd, false, null); return; }
    const act = e.target.closest('[data-action]');
    if (act?.dataset.action === 'line') {
      editor.focus();
      document.execCommand('insertHTML', false, '<hr class="editor-hr"><br>');
    }
  });

  _funcOpenDescModal = (docId, currentInfo, headingText, dispEl) => {
    _descDocId  = docId;
    _descDispEl = dispEl;
    heading.textContent = headingText || 'Adicionar Descrição';
    editor.innerHTML = currentInfo || '';
    modal.hidden = false;
    setTimeout(() => editor.focus(), 50);
  };

  const close = () => {
    modal.hidden = true;
    _descDocId  = null;
    _descDispEl = null;
  };
  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  btnSave.addEventListener('click', async () => {
    if (!_descDocId) return;
    const info = editor.innerHTML.trim();
    btnSave.disabled = true;
    try {
      await _funcDb.collection('funcionalidades').doc(_descDocId).update({ info });
      if (_descDispEl) {
        _descDispEl.innerHTML = info;
        _descDispEl.hidden = !info;
      }
      close();
    } catch (err) {
      console.error('Erro ao salvar descrição:', err);
    } finally {
      btnSave.disabled = false;
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   BOTÕES DE AÇÃO (Criar Seção / Área / Funcionalidade)
   ═══════════════════════════════════════════════════════════ */
function _funcSetupActions(el) {
  el.querySelector('#func-btn-secao').addEventListener('click', () => _funcCreateSecao(el));
  el.querySelector('#func-btn-area').addEventListener('click',  () => _funcCreateArea(el));
  el.querySelector('#func-btn-card').addEventListener('click',  () => {
    if (el._funcOpenCardCreate) el._funcOpenCardCreate(null, null);
  });
}

/* ═══════════════════════════════════════════════════════════
   FIRESTORE: CARREGAR
   ═══════════════════════════════════════════════════════════ */
async function _funcLoad(el) {
  try {
    const snap = await _funcDb.collection('funcionalidades').orderBy('ordem').get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (snap.empty) {
      await _funcSeedCards(el);
    } else {
      _funcRenderCanvas(el, items);
    }
  } catch (err) {
    console.error('Erro ao carregar funcionalidades:', err);
    el.querySelector('#func-canvas').innerHTML =
      '<p style="color:var(--text3);padding:2rem;">Erro ao carregar.</p>';
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════ */
function _funcRenderCanvas(el, items) {
  const canvas = el.querySelector('#func-canvas');
  canvas.innerHTML = '';

  /* Separar cards de área dos top-level */
  const areaCards = new Map();
  const topLevel  = [];

  items.forEach(item => {
    if (item.tipo === 'card' && item.areaId) {
      if (!areaCards.has(item.areaId)) areaCards.set(item.areaId, []);
      areaCards.get(item.areaId).push(item);
    } else {
      topLevel.push(item);
    }
  });
  areaCards.forEach(arr => arr.sort((a, b) => a.ordem - b.ordem));

  /* Separar seções de outros itens */
  const secoes   = topLevel.filter(i => i.tipo === 'secao').sort((a, b) => a.ordem - b.ordem);
  const restItems = topLevel.filter(i => i.tipo !== 'secao');

  /* Grupo padrão (antes da 1ª seção ou sem seção) */
  const defaultItems = restItems.filter(i => !i.secaoId);
  if (defaultItems.length) {
    const dg = _funcBuildGroupBody(el, defaultItems, areaCards, null);
    canvas.appendChild(dg);
  }

  /* Grupos de seção */
  secoes.forEach(sec => {
    const secItems = restItems.filter(i => i.secaoId === sec.id)
                              .sort((a, b) => a.ordem - b.ordem);
    const group = _funcBuildSecaoGroup(el, sec, secItems, areaCards);
    canvas.appendChild(group);
  });

  /* Sistema de drag unificado */
  _funcSetupGlobalDrag(el);
}

/* ── Cria grupo de seção ── */
function _funcBuildSecaoGroup(el, sec, secItems, areaCards) {
  const group = document.createElement('div');
  group.className = 'func-secao-group';
  group.dataset.funcId = sec.id;
  group.setAttribute('draggable', _funcCanEdit() ? 'true' : 'false');

  /* Cabeçalho da seção */
  const header = document.createElement('div');
  header.className = 'func-secao-header';
  header.innerHTML = `
    <span class="func-secao-arrow" id="func-arr-${sec.id}">▾</span>
    <span class="func-secao-label" id="func-lbl-${sec.id}">${sec.nome || 'Nova Seção'}</span>
    <span class="func-secao-line"></span>
    ${_funcCanEdit() ? `<button class="func-secao-del" data-id="${sec.id}" title="Apagar seção">✕</button>` : ''}
  `;
  group.appendChild(header);

  /* Corpo colapsável */
  const body = document.createElement('div');
  body.className = 'func-secao-body';
  body.id = `func-body-${sec.id}`;
  if (sec.collapsed) { body.classList.add('collapsed'); header.querySelector('.func-secao-arrow').textContent = '▸'; }

  /* Info display */
  const infoEl = document.createElement('div');
  infoEl.className = 'func-secao-info';
  infoEl.innerHTML = sec.info || '';
  infoEl.hidden = !sec.info;
  body.appendChild(infoEl);

  const innerBody = _funcBuildGroupBody(el, secItems, areaCards, sec.id);
  body.appendChild(innerBody);
  group.appendChild(body);

  /* Clique simples = colapsar */
  header.addEventListener('click', e => {
    if (e.target.closest('.func-secao-del') || e.target.closest('.func-secao-label[contenteditable="true"]')) return;
    const collapsed = body.classList.toggle('collapsed');
    header.querySelector('.func-secao-arrow').textContent = collapsed ? '▸' : '▾';
    _funcDb.collection('funcionalidades').doc(sec.id).update({ collapsed }).catch(() => {});
  });

  /* Duplo clique = renomear */
  const lbl = header.querySelector('.func-secao-label');
  lbl.addEventListener('dblclick', e => {
    e.stopPropagation();
    if (!_funcCanEdit()) return;
    const original = lbl.textContent;
    lbl.contentEditable = 'true';
    lbl.focus();
    const range = document.createRange(); range.selectNodeContents(lbl);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);

    const finish = (save) => {
      lbl.removeEventListener('blur', onBlur);
      lbl.removeEventListener('keydown', onKey);
      lbl.contentEditable = 'false';
      if (save) {
        const nome = lbl.textContent.trim() || original;
        lbl.textContent = nome;
        _funcDb.collection('funcionalidades').doc(sec.id).update({ nome }).catch(() => {});
      } else {
        lbl.textContent = original;
      }
    };
    const onBlur = () => finish(true);
    const onKey = ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      if (ev.key === 'Escape') { finish(false); }
    };
    lbl.addEventListener('blur', onBlur);
    lbl.addEventListener('keydown', onKey);
  });

  /* Botão excluir seção */
  if (_funcCanEdit()) {
    header.querySelector('.func-secao-del').addEventListener('click', e => {
      e.stopPropagation();
      _funcConfirmDelete(el, sec.id, group);
    });

    /* Clique direito na seção */
    header.addEventListener('contextmenu', e => {
      e.stopPropagation();
      e.preventDefault();
      _funcShowCtx(el, [
        { label: 'Adicionar informações', fn: () => {
          if (_funcOpenDescModal) _funcOpenDescModal(sec.id, infoEl.innerHTML, 'Informações da Seção', infoEl);
        }},
        { label: 'Excluir seção', danger: true, fn: () => _funcConfirmDelete(el, sec.id, group) }
      ], e.clientX, e.clientY);
    });
  }

  return group;
}

/* ── Constrói corpo de um grupo (área + cards avulsos) ── */
function _funcBuildGroupBody(el, items, areaCards, secaoId) {
  const container = document.createElement('div');
  container.className = 'func-group-body';
  container.dataset.secaoId = secaoId || '';

  /* Batch de cards avulsos consecutivos para grid */
  let cardBatch = [];
  function flushBatch() {
    if (!cardBatch.length) return;
    const row = document.createElement('div');
    row.className = 'func-cards-row';
    row.dataset.secaoId = secaoId || '';
    cardBatch.forEach(item => row.appendChild(_funcBuildCardEl(el, item)));
    container.appendChild(row);
    cardBatch = [];
  }

  items.forEach(item => {
    if (item.tipo === 'area') {
      flushBatch();
      container.appendChild(_funcBuildAreaEl(el, item, areaCards.get(item.id) || [], secaoId));
    } else if (item.tipo === 'card') {
      cardBatch.push(item);
    }
  });
  flushBatch();

  /* Botão "+" no grupo (para editores) */
  if (_funcCanEdit()) {
    const addBtn = document.createElement('button');
    addBtn.className = 'func-group-add-btn';
    addBtn.textContent = '+ Funcionalidade';
    addBtn.addEventListener('click', () => {
      if (el._funcOpenCardCreate) el._funcOpenCardCreate(null, secaoId);
    });
    container.appendChild(addBtn);

  }

  return container;
}

/* ── Área ── */
function _funcBuildAreaEl(el, item, cards, secaoId) {
  const outer = document.createElement('div');
  outer.className = 'func-area-outer';
  outer.dataset.funcId  = item.id;
  outer.dataset.secaoId = secaoId || '';
  if (_funcCanEdit()) outer.setAttribute('draggable', 'true');

  const lbl = document.createElement('div');
  lbl.className = 'func-area-label';
  lbl.textContent = item.nome || 'área';
  outer.appendChild(lbl);

  const box = document.createElement('div');
  box.className = 'func-area-box';
  outer.appendChild(box);

  /* Info display */
  const infoEl = document.createElement('div');
  infoEl.className = 'func-area-info';
  infoEl.innerHTML = item.info || '';
  infoEl.hidden = !item.info;
  box.appendChild(infoEl);

  const grid = document.createElement('div');
  grid.className = 'func-area-grid';
  grid.dataset.areaId = item.id;
  cards.forEach(c => grid.appendChild(_funcBuildCardEl(el, c)));
  box.appendChild(grid);

  /* Botão adicionar card na área */
  if (_funcCanEdit()) {
    const addBtn = document.createElement('button');
    addBtn.className = 'func-area-add-btn';
    addBtn.textContent = '+ Funcionalidade';
    addBtn.addEventListener('click', () => {
      if (el._funcOpenCardCreate) el._funcOpenCardCreate(item.id, secaoId);
    });
    box.appendChild(addBtn);

    /* Duplo clique = renomear área */
    lbl.addEventListener('dblclick', e => {
      e.stopPropagation();
      lbl.contentEditable = 'true';
      lbl.focus();
      const range = document.createRange(); range.selectNodeContents(lbl);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
      const save = () => {
        lbl.contentEditable = 'false';
        const nome = lbl.textContent.trim() || 'área';
        lbl.textContent = nome;
        _funcDb.collection('funcionalidades').doc(item.id).update({ nome }).catch(() => {});
      };
      lbl.addEventListener('blur', save, { once: true });
      lbl.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); lbl.blur(); }
        if (ev.key === 'Escape') { lbl.textContent = item.nome; lbl.blur(); }
      });
    });

    /* Clique direito na área */
    outer.addEventListener('contextmenu', e => {
      e.preventDefault();
      _funcShowCtx(el, [
        { label: 'Adicionar descrição', fn: () => {
          if (_funcOpenDescModal) _funcOpenDescModal(item.id, infoEl.innerHTML, 'Descrição da Área', infoEl);
        }},
        { label: 'Apagar área', danger: true, fn: () => _funcConfirmDelete(el, item.id, outer) }
      ], e.clientX, e.clientY);
    });
  }

  return outer;
}

/* ── Feature Card ── */
function _funcBuildCardEl(el, item) {
  const statusInfo = _FUNC_STATUS.find(s => s.val === item.status) ||
    { val: item.status || '', label: item.status || '' };
  const card = document.createElement('div');
  card.className = 'feature-card';
  card.dataset.funcId  = item.id;
  if (item.areaId)  card.dataset.areaId  = item.areaId;
  if (item.secaoId) card.dataset.secaoId = item.secaoId;

  card.innerHTML = `
    <span class="feature-card-tag"
          style="background:${item.cor || '#4f7fff'}22;color:${item.cor || '#4f7fff'}">${item.topico || ''}</span>
    <div class="feature-card-title">${item.titulo || ''}</div>
    <div class="feature-card-desc">${item.descricao || ''}</div>
    <div class="feature-card-funcoes">${item.funcoes || ''}</div>
    <span class="status-badge ${item.status || ''}">${statusInfo.label}</span>
  `;

  if (_funcCanEdit()) {
    card.setAttribute('draggable', 'true');

    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      /* Lê dados atuais do DOM (já atualizados por _funcUpdateCardEl) */
      const tag    = card.querySelector('.feature-card-tag');
      const badge  = card.querySelector('.status-badge');
      const currentData = {
        topico:    tag.textContent,
        cor:       tag.style.color,
        titulo:    card.querySelector('.feature-card-title').textContent,
        descricao: card.querySelector('.feature-card-desc').textContent,
        funcoes:   card.querySelector('.feature-card-funcoes').innerHTML,
        status:    [...badge.classList].find(c => c !== 'status-badge') || '',
        areaId:    card.dataset.areaId  || null,
        secaoId:   card.dataset.secaoId || null,
      };
      _funcShowCtx(el, [
        { label: 'Editar', fn: () => { if (_funcOpenEdit) _funcOpenEdit(card.dataset.funcId, currentData); } },
        { label: 'Apagar', danger: true, fn: () => _funcConfirmDelete(el, card.dataset.funcId, card) }
      ], e.clientX, e.clientY);
    });
  }
  return card;
}

/* ── Atualiza card no DOM sem reload ── */
function _funcUpdateCardEl(cardEl, data) {
  const statusInfo = _FUNC_STATUS.find(s => s.val === data.status) || { label: data.status };
  cardEl.querySelector('.feature-card-tag').style.background = `${data.cor}22`;
  cardEl.querySelector('.feature-card-tag').style.color      = data.cor;
  cardEl.querySelector('.feature-card-tag').textContent      = data.topico;
  cardEl.querySelector('.feature-card-title').textContent    = data.titulo;
  cardEl.querySelector('.feature-card-desc').textContent     = data.descricao;
  cardEl.querySelector('.feature-card-funcoes').innerHTML    = data.funcoes;
  const badge = cardEl.querySelector('.status-badge');
  badge.className   = `status-badge ${data.status}`;
  badge.textContent = statusInfo.label;
}

/* ═══════════════════════════════════════════════════════════
   DRAG & DROP — sistema unificado
   Cards podem ser arrastados para qualquer área ou posição.
   Áreas reordenam verticalmente. Seções reordenam no canvas.
   ═══════════════════════════════════════════════════════════ */
function _funcSetupGlobalDrag(el) {
  const canvas = el.querySelector('#func-canvas');
  let _srcType = null; // 'card' | 'area' | 'section'

  /* ── limpar indicadores visuais ── */
  const _clearVisuals = () => {
    canvas.querySelectorAll('.func-drag-over, .func-drop-target')
      .forEach(n => n.classList.remove('func-drag-over', 'func-drop-target'));
  };

  /* ── DRAGSTART ── */
  canvas.addEventListener('dragstart', e => {
    const card = e.target.closest('.feature-card[draggable]');
    if (card && canvas.contains(card)) {
      _funcDragSrc = card; _srcType = 'card';
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('func-dragging'), 0);
      return;
    }
    const area = e.target.closest('.func-area-outer[draggable]');
    if (area && canvas.contains(area)) {
      _funcDragSrc = area; _srcType = 'area';
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => area.classList.add('func-dragging'), 0);
      return;
    }
    const sec = e.target.closest('.func-secao-group[draggable]');
    if (sec && canvas.contains(sec)) {
      _funcDragSrc = sec; _srcType = 'section';
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => sec.classList.add('func-dragging'), 0);
    }
  });

  /* ── DRAGEND ── */
  canvas.addEventListener('dragend', () => {
    if (_funcDragSrc) {
      _funcDragSrc.classList.remove('func-dragging');
      _clearVisuals();
      _funcDragSrc = null;
      _srcType = null;
    }
  });

  /* ── DRAGOVER ── */
  canvas.addEventListener('dragover', e => {
    if (!_funcDragSrc) return;

    if (_srcType === 'card') {
      /* Aceita: outra feature-card, área-grid, área-box, ou grupo-body */
      const overCard = e.target.closest('.feature-card');
      const areaBox  = e.target.closest('.func-area-box');
      const groupBody= e.target.closest('.func-group-body');

      if (overCard || areaBox || groupBody) {
        e.preventDefault();
        _clearVisuals();
        if (overCard && overCard !== _funcDragSrc) overCard.classList.add('func-drag-over');
        else if (areaBox) areaBox.classList.add('func-drop-target');
      }
      return;
    }

    if (_srcType === 'area') {
      const overArea  = e.target.closest('.func-area-outer');
      const groupBody = e.target.closest('.func-group-body');
      if (overArea && overArea !== _funcDragSrc) {
        e.preventDefault();
        _clearVisuals();
        overArea.classList.add('func-drag-over');
      } else if (groupBody && !groupBody.contains(_funcDragSrc)) {
        e.preventDefault();
        _clearVisuals();
        groupBody.classList.add('func-drop-target');
      }
      return;
    }

    if (_srcType === 'section') {
      const overSec = e.target.closest('.func-secao-group');
      if (overSec && overSec !== _funcDragSrc) {
        e.preventDefault();
        _clearVisuals();
        overSec.classList.add('func-drag-over');
      }
    }
  });

  /* ── DROP ── */
  canvas.addEventListener('drop', e => {
    if (!_funcDragSrc) return;
    _clearVisuals();

    /* ─ Card ─ */
    if (_srcType === 'card') {
      e.preventDefault();
      const overCard  = e.target.closest('.feature-card');
      const areaBox   = e.target.closest('.func-area-box');
      const areaGrid  = areaBox?.querySelector('.func-area-grid');
      const groupBody = e.target.closest('.func-group-body');

      const oldAreaId = _funcDragSrc.dataset.areaId || null;

      if (overCard && overCard !== _funcDragSrc) {
        /* Soltar perto de outro card */
        const targetGrid    = overCard.closest('.func-area-grid');
        const targetParent  = overCard.parentNode;
        const rect = overCard.getBoundingClientRect();
        if (e.clientX < rect.left + rect.width / 2) targetParent.insertBefore(_funcDragSrc, overCard);
        else                                          targetParent.insertBefore(_funcDragSrc, overCard.nextSibling);

        const newAreaId = targetGrid?.dataset.areaId || null;
        if (newAreaId !== oldAreaId) _funcUpdateCardAreaId(_funcDragSrc, newAreaId);
        if (targetGrid) _funcPersistAreaOrder(targetGrid);
        else _funcPersistGroupOrder(targetParent);

      } else if (areaGrid) {
        /* Soltar sobre o fundo da área */
        areaGrid.appendChild(_funcDragSrc);
        const newAreaId = areaGrid.dataset.areaId;
        if (newAreaId !== oldAreaId) _funcUpdateCardAreaId(_funcDragSrc, newAreaId);
        _funcPersistAreaOrder(areaGrid);

      } else if (groupBody && !e.target.closest('.func-area-outer')) {
        /* Soltar fora de área → card avulso */
        const addBtn = groupBody.querySelector(':scope > .func-group-add-btn');
        if (addBtn) groupBody.insertBefore(_funcDragSrc, addBtn);
        else        groupBody.appendChild(_funcDragSrc);
        if (oldAreaId) _funcUpdateCardAreaId(_funcDragSrc, null);
        _funcPersistGroupOrder(groupBody);
      }
      return;
    }

    /* ─ Área ─ */
    if (_srcType === 'area') {
      e.preventDefault();
      const overArea  = e.target.closest('.func-area-outer');
      const groupBody = e.target.closest('.func-group-body');

      if (overArea && overArea !== _funcDragSrc) {
        const parent = overArea.parentNode;
        const rect = overArea.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) parent.insertBefore(_funcDragSrc, overArea);
        else                                          parent.insertBefore(_funcDragSrc, overArea.nextSibling);
        const newSecaoId = parent.dataset?.secaoId || null;
        _funcUpdateAreaSecaoId(_funcDragSrc, newSecaoId);
        _funcPersistGroupOrder(parent);

      } else if (groupBody && !groupBody.contains(_funcDragSrc)) {
        const addBtn = groupBody.querySelector(':scope > .func-group-add-btn');
        if (addBtn) groupBody.insertBefore(_funcDragSrc, addBtn);
        else        groupBody.appendChild(_funcDragSrc);
        const newSecaoId = groupBody.dataset?.secaoId || null;
        _funcUpdateAreaSecaoId(_funcDragSrc, newSecaoId);
        _funcPersistGroupOrder(groupBody);
      }
      return;
    }

    /* ─ Seção ─ */
    if (_srcType === 'section') {
      const overSec = e.target.closest('.func-secao-group');
      if (!overSec || overSec === _funcDragSrc) return;
      e.preventDefault();
      const rect = overSec.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) canvas.insertBefore(_funcDragSrc, overSec);
      else                                          canvas.insertBefore(_funcDragSrc, overSec.nextSibling);
      _funcPersistCanvasOrder(el, canvas);
    }
  });
}

/* Atualiza areaId no DOM e no Firestore */
function _funcUpdateCardAreaId(cardEl, newAreaId) {
  if (newAreaId) cardEl.dataset.areaId = newAreaId;
  else           delete cardEl.dataset.areaId;
  _funcDb.collection('funcionalidades').doc(cardEl.dataset.funcId)
    .update({ areaId: newAreaId || null }).catch(console.error);
}

/* Atualiza secaoId de uma área no DOM e no Firestore */
function _funcUpdateAreaSecaoId(areaEl, newSecaoId) {
  areaEl.dataset.secaoId = newSecaoId || '';
  _funcDb.collection('funcionalidades').doc(areaEl.dataset.funcId)
    .update({ secaoId: newSecaoId || null }).catch(console.error);
}

function _funcPersistGroupOrder(groupBody) {
  const batch = _funcDb.batch();
  let i = 0;
  groupBody.childNodes.forEach(child => {
    const id = child.dataset?.funcId;
    if (id) batch.update(_funcDb.collection('funcionalidades').doc(id), { ordem: i++ });
  });
  batch.commit().catch(err => console.error('Erro ao reordenar grupo:', err));
}

/* ═══════════════════════════════════════════════════════════
   PERSISTÊNCIA DE ORDEM
   ═══════════════════════════════════════════════════════════ */
function _funcPersistCanvasOrder(el, canvas) {
  const batch = _funcDb.batch();
  [...canvas.children].forEach((child, i) => {
    const id = child.dataset.funcId;
    if (id) batch.update(_funcDb.collection('funcionalidades').doc(id), { ordem: i });
  });
  batch.commit().catch(err => console.error('Erro ao reordenar canvas:', err));
}

function _funcPersistAreaOrder(grid) {
  const areaId = grid.dataset.areaId;
  if (!areaId) return;
  const batch = _funcDb.batch();
  [...grid.children].forEach((card, i) => {
    const id = card.dataset.funcId;
    if (id) batch.update(_funcDb.collection('funcionalidades').doc(id), { ordem: i });
  });
  batch.commit().catch(err => console.error('Erro ao reordenar área:', err));
}

/* ═══════════════════════════════════════════════════════════
   CRIAR SEÇÃO / ÁREA
   ═══════════════════════════════════════════════════════════ */
async function _funcCreateSecao(el) {
  if (!_funcCanEdit()) return;
  const snap = await _funcDb.collection('funcionalidades').orderBy('ordem', 'desc').limit(1).get();
  const lastOrdem = snap.empty ? 0 : (snap.docs[0].data().ordem || 0) + 1;
  const ref = await _funcDb.collection('funcionalidades').add({
    tipo: 'secao', nome: 'Nova Seção', ordem: lastOrdem, collapsed: false,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
  const canvas = el.querySelector('#func-canvas');
  const group = _funcBuildSecaoGroup(el, { id: ref.id, nome: 'Nova Seção', collapsed: false }, [], null);
  canvas.appendChild(group);

  /* Abrir rename imediatamente */
  const lbl = group.querySelector('.func-secao-label');
  setTimeout(() => lbl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })), 100);
}

async function _funcCreateArea(el) {
  if (!_funcCanEdit()) return;
  const snap = await _funcDb.collection('funcionalidades').orderBy('ordem', 'desc').limit(1).get();
  const lastOrdem = snap.empty ? 0 : (snap.docs[0].data().ordem || 0) + 1;
  const ref = await _funcDb.collection('funcionalidades').add({
    tipo: 'area', nome: 'Nova Área', ordem: lastOrdem, secaoId: null,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
  const canvas = el.querySelector('#func-canvas');
  let target = canvas.querySelector('.func-group-body[data-secao-id=""]');
  if (!target) {
    const dg = document.createElement('div');
    dg.className = 'func-group-body';
    dg.dataset.secaoId = '';
    canvas.prepend(dg);
    target = dg;
  }
  const areaEl = _funcBuildAreaEl(el, { id: ref.id, nome: 'Nova Área' }, [], null);
  /* inserir antes do botão "+" se existir */
  const addBtn = target.querySelector('.func-group-add-btn');
  if (addBtn) target.insertBefore(areaEl, addBtn);
  else target.appendChild(areaEl);

  /* Abrir rename */
  const lbl = areaEl.querySelector('.func-area-label');
  setTimeout(() => lbl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })), 100);
}

/* ═══════════════════════════════════════════════════════════
   CONTEXT MENU
   ═══════════════════════════════════════════════════════════ */
function _funcShowCtx(el, items, x, y) {
  _funcCloseCtx();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.id = '__func-ctx';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px`;
  menu.innerHTML = items.map(it =>
    `<button class="ctx-item${it.danger ? ' ctx-item--danger' : ''}">${it.label}</button>`
  ).join('');
  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  if (rect.right  > window.innerWidth)  menu.style.left = (x - rect.width)  + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top  = (y - rect.height) + 'px';

  menu.querySelectorAll('.ctx-item').forEach((btn, i) => {
    btn.addEventListener('click', () => { _funcCloseCtx(); items[i].fn(); });
  });
  setTimeout(() => document.addEventListener('click', _funcCloseCtx, { once: true }), 0);
}

function _funcCloseCtx() {
  const m = document.getElementById('__func-ctx');
  if (m) m.remove();
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function _funcConfirmDelete(el, id, domEl) {
  _funcPendingDelId = id;
  _funcPendingDelEl = domEl;
  el.querySelector('#func-modal-del').hidden = false;
}

async function _funcNextOrder(areaId, secaoId) {
  /* Usa o maior ordem global + 1 para evitar queries compostas com índice */
  const snap = await _funcDb.collection('funcionalidades')
    .orderBy('ordem', 'desc').limit(1).get();
  return snap.empty ? 0 : (snap.docs[0].data().ordem || 0) + 1;
}

/* Localiza o container DOM onde adicionar novo card */
function _funcFindContainer(el, areaId, secaoId) {
  if (areaId) {
    return el.querySelector(`.func-area-grid[data-area-id="${areaId}"]`);
  }
  const key = secaoId || '';
  let body = el.querySelector(`.func-group-body[data-secao-id="${key}"]`);
  if (!body) {
    /* Criar grupo padrão se não existir ainda */
    body = document.createElement('div');
    body.className = 'func-group-body';
    body.dataset.secaoId = key;
    const canvas = el.querySelector('#func-canvas');
    canvas.prepend(body);
    if (_funcCanEdit()) {
      const addBtn = document.createElement('button');
      addBtn.className = 'func-group-add-btn';
      addBtn.textContent = '+ Funcionalidade';
      addBtn.addEventListener('click', () => {
        if (el._funcOpenCardCreate) el._funcOpenCardCreate(null, secaoId || null);
      });
      body.appendChild(addBtn);
    }
  }
  /* inserir antes do btn "+" */
  const addBtn = body.querySelector(':scope > .func-group-add-btn');
  if (addBtn) {
    const row = document.createElement('div');
    row.className = 'func-cards-row';
    row.dataset.secaoId = key;
    body.insertBefore(row, addBtn);
    return row;
  }
  return body;
}

/* ═══════════════════════════════════════════════════════════
   SEED — dados iniciais
   ═══════════════════════════════════════════════════════════ */
async function _funcSeedCards(el) {
  const features = [
    { topico:'Backend',     cor:'#D85A30', titulo:'Infraestrutura e Banco de Dados',
      descricao:'Arquitetura do sistema, modelagem do banco de dados e backend principal.',
      funcoes:'<ul class="feature-card-items"><li>Definição da arquitetura</li><li>Estrutura do banco de dados</li><li>Backend principal (API)</li><li>Estabilização</li></ul>',
      status:'em-desenvolvimento' },
    { topico:'Cadastros',   cor:'#1D9E75', titulo:'Módulo de Usuários',
      descricao:'Cadastro, autenticação e gestão de perfis de usuários.',
      funcoes:'<ul class="feature-card-items"><li>Cadastro de usuários</li><li>Base inicial</li><li>Captação e prospecção</li><li>Fluxos de entrada</li></ul>',
      status:'em-desenvolvimento' },
    { topico:'Cadastros',   cor:'#378ADD', titulo:'Módulo de Empreendimentos',
      descricao:'Cadastro e gestão dos empreendimentos conectados à plataforma.',
      funcoes:'<ul class="feature-card-items"><li>Cadastro de empreendimentos</li><li>Primeiros contatos</li><li>Prospecção</li><li>Painel de gestão</li></ul>',
      status:'nao-iniciado' },
    { topico:'Interface',   cor:'#D4537E', titulo:'Interface e Acessibilidade',
      descricao:'Design da interface com foco em acessibilidade e UX.',
      funcoes:'<ul class="feature-card-items"><li>Definição inicial</li><li>Planejamento de acessibilidade</li><li>Impl. acessível</li><li>Integração frontend/backend</li></ul>',
      status:'em-desenvolvimento' },
    { topico:'Comunicação', cor:'#C98A1A', titulo:'Newsletter e Fluxos Operacionais',
      descricao:'Estruturação e operação da newsletter e fluxos de comunicação.',
      funcoes:'<ul class="feature-card-items"><li>Estruturação da newsletter</li><li>Fluxos de comunicação</li><li>Primeiros e-mails</li><li>Operação contínua</li></ul>',
      status:'em-desenvolvimento' },
    { topico:'Validação',   cor:'#9F8DE8', titulo:'Sistema de Validação e Metodologia',
      descricao:'Metodologia de validação do modelo de negócio e sistema de selo.',
      funcoes:'<ul class="feature-card-items"><li>Metodologia de validação</li><li>Consolidação do sistema</li><li>Dados reais</li><li>Testes internos</li></ul>',
      status:'nao-iniciado' },
    { topico:'Crescimento', cor:'#639922', titulo:'Operação e Crescimento',
      descricao:'Estratégias de aquisição de usuários e clientes.',
      funcoes:'<ul class="feature-card-items"><li>Aquisição de usuários</li><li>Aquisição de clientes</li><li>Newsletter ativa</li><li>Escala dos fluxos</li></ul>',
      status:'nao-iniciado' },
    { topico:'Escala',      cor:'#6e6f78', titulo:'Preparação para Escala',
      descricao:'Consolidação e planejamento para expansão após o período do plano.',
      funcoes:'<ul class="feature-card-items"><li>Consolidação dos fluxos</li><li>Roadmap de expansão</li><li>Metodologia consolidada</li><li>Sistema de selo</li></ul>',
      status:'nao-iniciado' },
  ];

  const batch = _funcDb.batch();
  features.forEach((f, i) => {
    const ref = _funcDb.collection('funcionalidades').doc();
    batch.set(ref, {
      tipo: 'card', ...f, areaId: null, secaoId: null, ordem: i,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  await batch.commit().catch(err => console.error('Seed erro:', err));
  _funcLoad(el);
}
