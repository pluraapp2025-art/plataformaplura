/* sobre.js — Seção Sobre com cards dinâmicos + Firestore */

const _SOBRE_CONFIG = {
  apiKey: "AIzaSyBsU21aZjTUqdCvu8rNQGLXEVFVRgmG9dI",
  authDomain: "plura-249ba.firebaseapp.com",
  projectId: "plura-249ba",
  storageBucket: "plura-249ba.firebasestorage.app",
  messagingSenderId: "212726352993",
  appId: "1:212726352993:web:46683ca58ad37686ff6e20"
};

if (!firebase.apps.length) firebase.initializeApp(_SOBRE_CONFIG);
const _sobreDb = firebase.firestore();

/* ─── ESTADO ────────────────────────────────────────────── */
let _pendingDeleteCard = null;
let _pendingDeleteId   = null;
let _dragSrc           = null;
let _editingDocId      = null;
let _editingCard       = null;
let _savedLinkRange    = null;
let _openModalForEdit  = null; // exposto por _setupAddModal
let _sobreNivel        = null; // nivel do usuário logado

function _canEdit() {
  return _sobreNivel === 'A' || _sobreNivel === 'B';
}

/* ─── COMANDOS QUE TÊM ESTADO ATIVO ─────────────────────── */
const _TB_STATE_CMDS = [
  'bold','italic',
  'justifyLeft','justifyCenter','justifyRight','justifyFull',
  'insertUnorderedList','insertOrderedList'
];

/* ─── INIT ──────────────────────────────────────────────── */
function initSobre() {
  const el = document.getElementById('sobre-content');
  el.innerHTML = `
    <div class="main">

      <div class="section-hero">
        <div class="section-tag">Resumo | Público alvo | Detalhes tecnológicos</div>
        <h1 class="section-heading">DETALHES DA SOLUÇÃO</h1>
        <p class="section-desc">
          Esta área é dedicada para apresentar uma visão geral do projeto,
          destacando os objetivos estratégicos, o escopo de desenvolvimento e os
          principais marcos planejados para o período de execução.
        </p>
        <div class="sobre-stats-row">
          <div class="sobre-stat-card"><div class="sobre-stat-value">12</div><div class="sobre-stat-label">Metas</div></div>
          <div class="sobre-stat-card"><div class="sobre-stat-value">38</div><div class="sobre-stat-label">Atividades</div></div>
          <div class="sobre-stat-card"><div class="sobre-stat-value">5</div><div class="sobre-stat-label">Meses</div></div>
          <div class="sobre-stat-card"><div class="sobre-stat-value accent">2026</div><div class="sobre-stat-label">Abr - Set</div></div>
          <button class="btn-add-section" id="btn-add-section" hidden>+ Adicionar Seção</button>
        </div>
      </div>

      <div class="cards-grid-2" id="sobre-cards-grid"></div>



    </div>

    <!-- ── Modal: Adicionar / Editar Seção ───────────────── -->
    <div class="modal-overlay" id="modal-adicionar-secao" hidden>
      <div class="modal-box">
        <div class="modal-header">
          <input class="modal-title-input" type="text" placeholder="Título da nova seção" id="modal-title-input">
          <button class="modal-close-btn" id="modal-close" title="Fechar">✕</button>
        </div>

        <div class="editor-toolbar" id="editor-toolbar">

          <!-- Negrito / Itálico -->
          <button class="tb-btn" data-cmd="bold"   title="Negrito"><b>B</b></button>
          <button class="tb-btn" data-cmd="italic" title="Itálico"><i>I</i></button>
          <span class="tb-sep"></span>

          <!-- Alinhamento -->
          <button class="tb-btn" data-cmd="justifyLeft" title="Alinhar à esquerda">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="0" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="0" y="11.5" width="9" height="1.5" rx="1"/></svg>
          </button>
          <button class="tb-btn" data-cmd="justifyCenter" title="Centralizar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="2.5" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="2.5" y="11.5" width="9" height="1.5" rx="1"/></svg>
          </button>
          <button class="tb-btn" data-cmd="justifyRight" title="Alinhar à direita">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="5" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="5" y="11.5" width="9" height="1.5" rx="1"/></svg>
          </button>
          <button class="tb-btn" data-cmd="justifyFull" title="Justificado">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="0" y="4.5" width="14" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="0" y="11.5" width="14" height="1.5" rx="1"/></svg>
          </button>
          <span class="tb-sep"></span>

          <!-- Listas -->
          <button class="tb-btn" data-cmd="insertUnorderedList" title="Tópicos">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2.5" r="1.5"/><rect x="4" y="1.75" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="7" r="1.5"/><rect x="4" y="6.25" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="11.5" r="1.5"/><rect x="4" y="10.75" width="10" height="1.5" rx="1"/></svg>
          </button>
          <button class="tb-btn" data-cmd="insertOrderedList" title="Numeração">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="4" font-size="4.5" font-family="monospace">1.</text><rect x="5" y="1.75" width="9" height="1.5" rx="1"/><text x="0" y="8.5" font-size="4.5" font-family="monospace">2.</text><rect x="5" y="6.25" width="9" height="1.5" rx="1"/><text x="0" y="13" font-size="4.5" font-family="monospace">3.</text><rect x="5" y="10.75" width="9" height="1.5" rx="1"/></svg>
          </button>
          <span class="tb-sep"></span>

          <!-- Linha / Tabela -->
          <button class="tb-btn" data-action="line"  title="Linha contínua">—</button>
          <button class="tb-btn" data-action="table" title="Tabela 2 colunas (toggle)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1" opacity="0.5"/><rect x="8" y="0" width="6" height="6" rx="1" opacity="0.5"/><rect x="0" y="8" width="6" height="6" rx="1" opacity="0.5"/><rect x="8" y="8" width="6" height="6" rx="1" opacity="0.5"/></svg>
          </button>
          <span class="tb-sep"></span>

          <!-- Hiperlink -->
          <button class="tb-btn" data-action="hyperlink" title="Inserir hiperlink">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5.5 8.5a3 3 0 0 0 4.2.1l1.8-1.8a3 3 0 0 0-4.2-4.2L6.2 3.6"/><path d="M8.5 5.5a3 3 0 0 0-4.2-.1L2.5 7.2a3 3 0 0 0 4.2 4.2l1.1-1"/></svg>
          </button>
          <span class="tb-sep"></span>

          <!-- Grade de cores -->
          <div class="tb-color-wrap" id="tb-color-wrap">
            <button class="tb-btn tb-color-toggle" data-action="color-toggle" title="Cor do texto">
              <span id="tb-color-preview">A</span>
            </button>
            <div class="tb-color-grid" id="tb-color-grid" hidden>
              <button class="tb-swatch" data-color="#111111" style="background:#111111" title="Preto"></button>
              <button class="tb-swatch" data-color="#ef4444" style="background:#ef4444" title="Vermelho"></button>
              <button class="tb-swatch" data-color="#93c5fd" style="background:#93c5fd" title="Azul claro"></button>
              <button class="tb-swatch" data-color="#1d4ed8" style="background:#1d4ed8" title="Azul escuro"></button>
              <button class="tb-swatch" data-color="#f97316" style="background:#f97316" title="Laranja"></button>
              <button class="tb-swatch" data-color="#facc15" style="background:#facc15" title="Amarelo"></button>
              <button class="tb-swatch" data-color="#8b5cf6" style="background:#8b5cf6" title="Roxo"></button>
              <button class="tb-swatch" data-color="#ec4899" style="background:#ec4899" title="Rosa"></button>
            </div>
          </div>

        </div>

        <div class="editor-area" id="editor-area" contenteditable="true"></div>

        <div class="modal-footer">
          <button class="btn-modal-cancel" id="modal-cancel">Cancelar</button>
          <button class="btn-modal-save"   id="modal-save">Salvar Seção</button>
        </div>
      </div>
    </div>

    <!-- ── Modal: Confirmar Exclusão ─────────────────────── -->
    <div class="modal-overlay" id="modal-delete-confirm" hidden>
      <div class="modal-box modal-box--sm">
        <div class="modal-header">
          <span class="modal-static-title">Apagar Card</span>
        </div>
        <div class="modal-body-delete">
          <p>Deseja apagar as informações deste Card?</p>
          <p class="modal-delete-warn">Após a exclusão, não poderá ser desfeita.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="delete-cancel">Cancelar</button>
          <button class="btn-modal-delete" id="delete-confirm">Apagar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal: Hiperlink ───────────────────────────────── -->
    <div class="modal-overlay" id="modal-hyperlink" hidden>
      <div class="modal-box modal-box--sm">
        <div class="modal-header">
          <span class="modal-static-title">Inserir Hiperlink</span>
          <button class="modal-close-btn" id="hyperlink-close">✕</button>
        </div>
        <div class="modal-body-hyperlink">
          <label class="hyperlink-label">URL</label>
          <input class="hyperlink-input" type="url" id="hyperlink-url-input" placeholder="https://...">
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="hyperlink-cancel">Cancelar</button>
          <button class="btn-modal-save"   id="hyperlink-save">Salvar</button>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('.nav-card[data-goto]').forEach(card => {
    card.addEventListener('click', () => showSection(card.dataset.goto));
  });

  _setupAddModal(el);
  _setupDeleteModal(el);
  _setupHyperlinkModal(el);
  _loadSobreNivel(el, () => _loadCards(el));
}

/* ─── PERMISSÕES ────────────────────────────────────────── */
async function _loadSobreNivel(el, callback) {
  const email = localStorage.getItem('plura-user-email') || '';
  try {
    if (!email) {
      _sobreNivel = 'A';
    } else {
      const snap = await _sobreDb.collection('perfil')
        .where('email', '==', email).limit(1).get();
      _sobreNivel = snap.empty ? 'A' : (snap.docs[0].data().nivel || 'A');
    }
  } catch (err) {
    console.warn('[sobre] Não foi possível carregar nível do usuário:', err);
    _sobreNivel = 'A';
  }

  el.querySelector('#btn-add-section').hidden = !_canEdit();
  if (callback) callback();
}

/* ─── MODAL: ADICIONAR / EDITAR SEÇÃO ───────────────────── */
function _setupAddModal(el) {
  const modal      = el.querySelector('#modal-adicionar-secao');
  const btnOpen    = el.querySelector('#btn-add-section');
  const btnClose   = el.querySelector('#modal-close');
  const btnCancel  = el.querySelector('#modal-cancel');
  const btnSave    = el.querySelector('#modal-save');
  const editor     = el.querySelector('#editor-area');
  const toolbar    = el.querySelector('#editor-toolbar');
  const titleInput = el.querySelector('#modal-title-input');
  const colorGrid  = el.querySelector('#tb-color-grid');
  const colorPrev  = el.querySelector('#tb-color-preview');

  const close = () => {
    modal.hidden    = true;
    _editingDocId   = null;
    _editingCard    = null;
    titleInput.value = '';
    editor.innerHTML = '';
    btnSave.textContent = 'Salvar Seção';
  };

  /* Abre para criar */
  const openCreate = () => {
    _editingDocId = null;
    _editingCard  = null;
    titleInput.value    = '';
    editor.innerHTML    = '';
    btnSave.textContent = 'Salvar Seção';
    modal.hidden = false;
    editor.focus();
  };

  /* Abre para editar (exposto via _openModalForEdit) */
  const openEdit = (docId, card) => {
    _editingDocId = docId;
    _editingCard  = card;
    titleInput.value    = card.querySelector('.info-card-title').textContent;
    editor.innerHTML    = card.querySelector('.info-card-body').innerHTML;
    btnSave.textContent = 'Atualizar Seção';
    modal.hidden = false;
    editor.focus();
  };

  _openModalForEdit = openEdit;

  btnOpen.addEventListener('click', openCreate);
  btnClose.addEventListener('click', close);
  btnCancel.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  /* ── Atualiza estado ativo dos botões ── */
  const updateState = () => {
    _TB_STATE_CMDS.forEach(cmd => {
      const btn = toolbar.querySelector(`[data-cmd="${cmd}"]`);
      if (!btn) return;
      try { btn.classList.toggle('tb-active', document.queryCommandState(cmd)); } catch (_) {}
    });
  };
  editor.addEventListener('keyup',   updateState);
  editor.addEventListener('mouseup', updateState);
  document.addEventListener('selectionchange', () => {
    if (editor.contains(document.activeElement) || document.activeElement === editor) updateState();
  });

  /* ── Toolbar ── */
  toolbar.addEventListener('mousedown', e => {
    e.preventDefault();

    /* Comando nativo */
    const btn = e.target.closest('[data-cmd]');
    if (btn) {
      document.execCommand(btn.dataset.cmd, false, null);
      updateState();
      return;
    }

    /* Cor: toggle grade */
    if (e.target.closest('[data-action="color-toggle"]')) {
      colorGrid.hidden = !colorGrid.hidden;
      if (!colorGrid.hidden) {
        setTimeout(() => document.addEventListener('mousedown', function hide(ev) {
          if (!colorGrid.contains(ev.target)) {
            colorGrid.hidden = true;
            document.removeEventListener('mousedown', hide);
          }
        }), 0);
      }
      return;
    }

    /* Cor: selecionar swatch */
    const swatch = e.target.closest('[data-color]');
    if (swatch) {
      editor.focus();
      document.execCommand('foreColor', false, swatch.dataset.color);
      colorPrev.style.color = swatch.dataset.color;
      colorGrid.hidden = true;
      return;
    }

    const act = e.target.closest('[data-action]');
    if (!act) return;
    const action = act.dataset.action;

    if (action === 'line') {
      editor.focus();
      document.execCommand('insertHTML', false, '<hr class="editor-hr"><br>');
      return;
    }

    if (action === 'table') {
      editor.focus();
      const table = _getAncestorTable(window.getSelection(), editor);
      if (table) {
        /* Sai da tabela: posiciona cursor após ela */
        const range = document.createRange();
        range.setStartAfter(table);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        document.execCommand('insertHTML', false,
          '<table class="editor-table"><tbody>' +
          '<tr><td><br></td><td><br></td></tr>' +
          '<tr><td><br></td><td><br></td></tr>' +
          '</tbody></table><br>'
        );
      }
      updateState();
      return;
    }

    if (action === 'hyperlink') {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      _savedLinkRange = sel.getRangeAt(0).cloneRange();
      el.querySelector('#modal-hyperlink').hidden = false;
      setTimeout(() => el.querySelector('#hyperlink-url-input').focus(), 50);
    }
  });

  /* ── Salvar ── */
  btnSave.addEventListener('click', async () => {
    if (!_canEdit()) return;
    const titulo   = titleInput.value.trim() || 'Nova Seção';
    const conteudo = editor.innerHTML.trim();
    if (!conteudo) return;

    btnSave.disabled = true;
    try {
      if (_editingDocId) {
        /* Atualizar */
        await _sobreDb.collection('sobre').doc(_editingDocId).update({ titulo, conteudo });
        _editingCard.querySelector('.info-card-title').textContent = titulo;
        const body = _editingCard.querySelector('.info-card-body');
        body.innerHTML = conteudo;
        _attachLinkBehavior(body);
      } else {
        /* Criar */
        const grid  = el.querySelector('#sobre-cards-grid');
        const ordem = grid.children.length;
        const docId = _makeDocId(titulo);
        await _sobreDb.collection('sobre').doc(docId).set({
          titulo, conteudo, ordem,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        _renderCard(el, docId, { titulo, conteudo, ordem });
      }
      close();
    } catch (err) {
      console.error('Erro ao salvar seção:', err);
    } finally {
      btnSave.disabled = false;
    }
  });
}

/* ─── MODAL: EXCLUIR ────────────────────────────────────── */
function _setupDeleteModal(el) {
  const modal   = el.querySelector('#modal-delete-confirm');
  const btnCncl = el.querySelector('#delete-cancel');
  const btnConf = el.querySelector('#delete-confirm');

  const close = () => {
    modal.hidden       = true;
    _pendingDeleteCard = null;
    _pendingDeleteId   = null;
  };

  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  btnConf.addEventListener('click', async () => {
    if (!_pendingDeleteCard || !_pendingDeleteId) return;
    btnConf.disabled = true;
    try {
      await _sobreDb.collection('sobre').doc(_pendingDeleteId).delete();
      _pendingDeleteCard.remove();
      close();
    } catch (err) {
      console.error('Erro ao apagar card:', err);
    } finally {
      btnConf.disabled = false;
    }
  });
}

/* ─── MODAL: HIPERLINK ──────────────────────────────────── */
function _setupHyperlinkModal(el) {
  const modal    = el.querySelector('#modal-hyperlink');
  const urlInput = el.querySelector('#hyperlink-url-input');
  const btnClose = el.querySelector('#hyperlink-close');
  const btnCncl  = el.querySelector('#hyperlink-cancel');
  const btnSave  = el.querySelector('#hyperlink-save');
  const editor   = el.querySelector('#editor-area');

  const close = () => { modal.hidden = true; urlInput.value = ''; };

  btnClose.addEventListener('click', close);
  btnCncl.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnSave.click(); });

  btnSave.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (!url || !_savedLinkRange) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    editor.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_savedLinkRange);
    document.execCommand('createLink', false, url);

    /* Adiciona data-href e target nos links recém-criados */
    editor.querySelectorAll('a:not([data-href])').forEach(a => {
      a.dataset.href = a.getAttribute('href');
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    _savedLinkRange = null;
    close();
  });
}

/* ─── MENU DE CONTEXTO ──────────────────────────────────── */
function _showContextMenu(el, card, docId, x, y) {
  _closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.id = '__ctx-menu';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px`;
  menu.innerHTML = `
    <button class="ctx-item ctx-item--edit">Editar</button>
    <button class="ctx-item ctx-item--danger">Apagar</button>
  `;
  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  if (rect.right  > window.innerWidth)  menu.style.left = (x - rect.width)  + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top  = (y - rect.height) + 'px';

  menu.querySelector('.ctx-item--edit').addEventListener('click', () => {
    _closeContextMenu();
    if (_openModalForEdit) _openModalForEdit(docId, card);
  });

  menu.querySelector('.ctx-item--danger').addEventListener('click', () => {
    _closeContextMenu();
    _pendingDeleteCard = card;
    _pendingDeleteId   = docId;
    el.querySelector('#modal-delete-confirm').hidden = false;
  });

  setTimeout(() => document.addEventListener('click', _closeContextMenu, { once: true }), 0);
}

function _closeContextMenu() {
  const m = document.getElementById('__ctx-menu');
  if (m) m.remove();
}

/* ─── DRAG & DROP ───────────────────────────────────────── */
function _attachDrag(el, card) {
  card.draggable = true;

  card.addEventListener('dragstart', e => {
    _dragSrc = card;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => card.classList.add('card-dragging'), 0);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('card-dragging');
    el.querySelectorAll('.card-drag-over').forEach(c => c.classList.remove('card-drag-over'));
    _dragSrc = null;
  });
  card.addEventListener('dragover', e => {
    e.preventDefault();
    if (_dragSrc && _dragSrc !== card) card.classList.add('card-drag-over');
  });
  card.addEventListener('dragleave', () => card.classList.remove('card-drag-over'));
  card.addEventListener('drop', e => {
    e.preventDefault();
    card.classList.remove('card-drag-over');
    if (!_dragSrc || _dragSrc === card) return;
    const grid  = el.querySelector('#sobre-cards-grid');
    const cards = [...grid.children];
    const si    = cards.indexOf(_dragSrc);
    const ti    = cards.indexOf(card);
    if (si < ti) grid.insertBefore(_dragSrc, card.nextSibling);
    else         grid.insertBefore(_dragSrc, card);
    _persistOrder(el);
  });
}

function _persistOrder(el) {
  const grid  = el.querySelector('#sobre-cards-grid');
  const batch = _sobreDb.batch();
  [...grid.children].forEach((card, i) => {
    if (card.dataset.docId)
      batch.update(_sobreDb.collection('sobre').doc(card.dataset.docId), { ordem: i });
  });
  batch.commit().catch(err => console.error('Erro ao reordenar:', err));
}

/* ─── FIRESTORE: CARREGAR ───────────────────────────────── */
function _loadCards(el) {
  _sobreDb.collection('sobre').orderBy('ordem').get()
    .then(snap => {
      if (snap.empty) _seedCards(el);
      else snap.forEach(doc => _renderCard(el, doc.id, doc.data()));
    })
    .catch(err => console.error('Erro ao carregar cards:', err));
}

/* ─── RENDER ────────────────────────────────────────────── */
function _renderCard(el, docId, data) {
  const grid = el.querySelector('#sobre-cards-grid');
  const card = document.createElement('div');
  card.className     = 'info-card';
  card.dataset.docId = docId;
  card.innerHTML     = `
    <div class="info-card-title">${data.titulo}</div>
    <div class="info-card-body">${data.conteudo}</div>
  `;
  grid.appendChild(card);

  _attachLinkBehavior(card.querySelector('.info-card-body'));

  if (_canEdit()) {
    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      _showContextMenu(el, card, docId, e.clientX, e.clientY);
    });
    _attachDrag(el, card);
  }
}

/* Torna links clicáveis e garante atributos corretos no card renderizado */
function _attachLinkBehavior(body) {
  body.querySelectorAll('a[href]').forEach(a => {
    if (!a.dataset.href) a.dataset.href = a.getAttribute('href');
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
}

/* ─── SEED: CARDS ESTÁTICOS ─────────────────────────────── */
function _seedCards(el) {
  const staticCards = [
    {
      titulo: 'Identificação',
      conteudo: [
        '<div class="info-row"><span class="info-key">Empresa</span><span class="info-val">PLURA INOVA SIMPLES (I.S.)</span></div>',
        '<div class="info-row"><span class="info-key">CNPJ</span><span class="info-val">64.988.404/0001-18</span></div>',
        '<div class="info-row"><span class="info-key">Localização</span><span class="info-val">Maceió, Alagoas</span></div>',
        '<div class="info-row"><span class="info-key">Edital</span><span class="info-val">SECTI-AL/FAPEAL Nº 02/2025</span></div>',
        '<div class="info-row"><span class="info-key">Período</span><span class="info-val">Abril a Agosto de 2025</span></div>',
        '<div class="info-row"><span class="info-key">Revisão</span><span class="info-val">Plano de Trabalho — Revisão 2</span></div>'
      ].join(''),
      ordem: 0
    },
    {
      titulo: 'Objetivos do Plano',
      conteudo: [
        '<ul class="objectives-list">',
        '<li>Estruturar a base operacional da plataforma digital</li>',
        '<li>Desenvolver o MVP com backend robusto e interface acessível</li>',
        '<li>Captar os primeiros usuários e empreendimentos cadastrados</li>',
        '<li>Validar o modelo de negócio com dados reais de uso</li>',
        '<li>Consolidar metodologia de validação e sistema de selo</li>',
        '<li>Preparar a plataforma para escala ao final do período</li>',
        '</ul>'
      ].join(''),
      ordem: 1
    }
  ];

  const ids   = staticCards.map(c => _makeDocId(c.titulo));
  const batch = _sobreDb.batch();
  staticCards.forEach((card, i) => {
    batch.set(_sobreDb.collection('sobre').doc(ids[i]), {
      ...card,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  });

  const render = () => staticCards.forEach((c, i) => _renderCard(el, ids[i], c));
  batch.commit().then(render).catch(err => { console.error('Erro ao seed:', err); render(); });
}

/* ─── UTILS ─────────────────────────────────────────────── */
function _makeDocId(titulo) {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh   = String(now.getHours()).padStart(2, '0');
  const min  = String(now.getMinutes()).padStart(2, '0');
  const slug = titulo
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  return `${slug}_${dd}${mm}${yyyy}_${hh}:${min}`;
}

/* Retorna o elemento <table> ancestral do cursor, ou null */
function _getAncestorTable(sel, editor) {
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== editor) {
    if (node.nodeName === 'TABLE') return node;
    node = node.parentNode;
  }
  return null;
}
