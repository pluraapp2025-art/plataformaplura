/* calendario.js — Calendário de Planejamento com Firebase */

const _calDb = firebase.firestore();

const _CAL_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const _CAL_WEEKS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ─── STATE ──────────────────────────────────────────────
let _calDate                = new Date();
let _calEvents              = [];
let _calPerfis              = [];
let _calFinData             = [];          // dados financeiros carregados independentemente
let _calNivel               = 'A';        // padrão 'A' até carregar do Firestore
let _calEditId              = null;
let _calShowPayments        = false;
let _calFinLoaded           = false;      // evita recarregar desnecessariamente
let _calSelectedIntegrantes = new Set();

function _calCanEdit() { return _calNivel === 'A' || _calNivel === 'B'; }

function _calEsc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _calParsePtDate(str) {
  if (!str) return null;
  // Suporte a Firestore Timestamp (objeto com .toDate())
  if (typeof str === 'object' && typeof str.toDate === 'function') return str.toDate();
  if (typeof str !== 'string') return null;
  const [d, m, y] = str.split('/').map(Number);
  if (!d || !m || !y || y < 2000) return null;
  return new Date(y, m - 1, d);
}

// ─── INIT ────────────────────────────────────────────────
function initCalendario() {
  _injectCalHtml();
  _bindCalModal();
  _bindCalForm();
}

// ─── HTML ────────────────────────────────────────────────
function _injectCalHtml() {
  document.body.insertAdjacentHTML('beforeend', `
    <!-- ── Modal Principal: Calendário de Planejamento ── -->
    <div class="cal-overlay" id="calOverlay">
      <div class="cal-modal">
        <div class="cal-modal-hdr">
          <span class="cal-modal-title">Calendário de Planejamento</span>
          <button class="perfil-modal-close" id="calModalClose" aria-label="Fechar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="cal-body">

          <!-- Esquerda: calendário -->
          <div class="cal-left">
            <div class="cal-top-bar">
              <button class="cal-btn-payments" id="calBtnPayments">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                Info de pagamento
              </button>
              <div class="cal-nav">
                <button class="fin-cal-nav-btn" id="calPrev">&#8249;</button>
                <span class="fin-cal-month-label" id="calMonthLabel"></span>
                <button class="fin-cal-nav-btn" id="calNext">&#8250;</button>
              </div>
            </div>
            <div class="cal-grid-body" id="calBody"></div>
          </div>

          <!-- Direita: lista de eventos -->
          <div class="cal-right">
            <div class="cal-list-hdr">
              <button class="cal-btn-add" id="calBtnAddEvent" hidden>+ Adicionar Evento</button>
            </div>
            <div class="cal-table-wrap">
              <table class="cal-event-table">
                <thead>
                  <tr><th>Descrição Evento</th><th>Data</th></tr>
                </thead>
                <tbody id="calEventTbody"></tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ── Modal Formulário de Evento ── -->
    <div class="cal-overlay" id="calFormOverlay">
      <div class="cal-modal cal-modal--form">
        <div class="cal-modal-hdr">
          <input class="cal-form-title-input" id="calFormNome" type="text" placeholder="Nome do evento">
          <button class="perfil-modal-close" id="calFormClose" aria-label="Fechar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="cal-form-body">

          <div class="cal-form-group">
            <label class="cal-form-label">Responsável</label>
            <select class="cal-form-select" id="calFormResponsavel">
              <option value="">Selecione...</option>
            </select>
          </div>

          <div class="cal-form-group">
            <label class="cal-form-label">Integrantes</label>
            <div class="cal-multiselect" id="calMultiWrap">
              <div class="cal-multiselect-trigger" id="calMultiTrigger">
                <span id="calMultiLabel">Selecionar integrantes...</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div class="cal-multiselect-dropdown" id="calMultiDropdown" hidden></div>
            </div>
          </div>

          <div class="cal-form-row-3">
            <div class="cal-form-group">
              <label class="cal-form-label">Data</label>
              <input class="cal-form-input" id="calFormData" type="text" placeholder="dd/mm/aaaa" maxlength="10">
            </div>
            <div class="cal-form-group">
              <label class="cal-form-label">Início</label>
              <input class="cal-form-input" id="calFormHoraInicio" type="time">
            </div>
            <div class="cal-form-group">
              <label class="cal-form-label">Conclusão</label>
              <input class="cal-form-input" id="calFormHoraFim" type="time">
            </div>
          </div>

          <div class="cal-form-group">
            <label class="cal-form-label">Descrição do Evento</label>
            <div class="cal-editor-wrap">
              <div class="editor-toolbar" id="calEditorToolbar">
                <button class="tb-btn" data-cmd="bold"   title="Negrito"><b>B</b></button>
                <button class="tb-btn" data-cmd="italic" title="Itálico"><i>I</i></button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-cmd="justifyLeft"   title="Esquerda"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="0" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="0" y="11.5" width="9" height="1.5" rx="1"/></svg></button>
                <button class="tb-btn" data-cmd="justifyCenter" title="Centro"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="2.5" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="2.5" y="11.5" width="9" height="1.5" rx="1"/></svg></button>
                <button class="tb-btn" data-cmd="justifyRight"  title="Direita"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="1"/><rect x="5" y="4.5" width="9" height="1.5" rx="1"/><rect x="0" y="8" width="14" height="1.5" rx="1"/><rect x="5" y="11.5" width="9" height="1.5" rx="1"/></svg></button>
                <span class="tb-sep"></span>
                <button class="tb-btn" data-cmd="insertUnorderedList" title="Tópicos"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2.5" r="1.5"/><rect x="4" y="1.75" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="7" r="1.5"/><rect x="4" y="6.25" width="10" height="1.5" rx="1"/><circle cx="1.5" cy="11.5" r="1.5"/><rect x="4" y="10.75" width="10" height="1.5" rx="1"/></svg></button>
                <button class="tb-btn" data-cmd="insertOrderedList"   title="Numeração"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="4" font-size="4.5" font-family="monospace">1.</text><rect x="5" y="1.75" width="9" height="1.5" rx="1"/><text x="0" y="8.5" font-size="4.5" font-family="monospace">2.</text><rect x="5" y="6.25" width="9" height="1.5" rx="1"/><text x="0" y="13" font-size="4.5" font-family="monospace">3.</text><rect x="5" y="10.75" width="9" height="1.5" rx="1"/></svg></button>
                <span class="tb-sep"></span>
                <div class="tb-color-wrap">
                  <button class="tb-btn tb-color-toggle" data-action="cal-color-toggle" title="Cor do texto">
                    <span id="calColorPreview">A</span>
                  </button>
                  <div class="tb-color-grid" id="calColorGrid" hidden>
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
              <div class="cal-editor-area" id="calEditorArea" contenteditable="true"></div>
            </div>
          </div>

          <div class="cal-form-group">
            <label class="cal-form-label">Link de Documentos</label>
            <div class="cal-link-row">
              <input class="cal-form-input" id="calFormLink" type="url" placeholder="https://...">
              <button class="cal-link-open-btn" id="calLinkOpenBtn" title="Abrir em nova aba">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            </div>
          </div>

        </div>

        <div class="cal-form-footer">
          <button class="btn-modal-delete" id="calFormDelete" hidden>Apagar</button>
          <div class="cal-form-footer-actions">
            <button class="btn-modal-cancel" id="calFormCancel">Cancelar</button>
            <button class="btn-modal-save"   id="calFormSave">Salvar Evento</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ─── BIND: MODAL PRINCIPAL ───────────────────────────────
function _bindCalModal() {
  document.getElementById('calModalClose').addEventListener('click', _closeCalModal);
  document.getElementById('calOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('calOverlay')) _closeCalModal();
  });
  document.getElementById('calPrev').addEventListener('click', () => {
    _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() - 1, 1);
    _renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() + 1, 1);
    _renderCalendar();
  });

  // Toggle pagamentos: carrega dados financeiros independentemente
  document.getElementById('calBtnPayments').addEventListener('click', async () => {
    _calShowPayments = !_calShowPayments;
    const btn = document.getElementById('calBtnPayments');
    btn.classList.toggle('cal-btn-payments--active', _calShowPayments);

    if (_calShowPayments && !_calFinLoaded) {
      btn.disabled = true;
      btn.textContent = 'Carregando…';
      await _loadCalFinData();
      btn.disabled = false;
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> Info de pagamento`;
    }
    _renderCalendar();
  });

  document.getElementById('calBtnAddEvent').addEventListener('click', () => _openEventForm(null));
}

// ─── BIND: FORMULÁRIO ────────────────────────────────────
function _bindCalForm() {
  document.getElementById('calFormClose').addEventListener('click',  _closeEventForm);
  document.getElementById('calFormCancel').addEventListener('click', _closeEventForm);
  document.getElementById('calFormOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('calFormOverlay')) _closeEventForm();
  });
  document.getElementById('calFormSave').addEventListener('click',   _saveCalEvent);
  document.getElementById('calFormDelete').addEventListener('click', _deleteCalEvent);

  document.getElementById('calLinkOpenBtn').addEventListener('click', () => {
    let url = document.getElementById('calFormLink').value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  // Máscara de data
  document.getElementById('calFormData').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
    else if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
    this.value = v;
  });

  // Toolbar do editor
  const toolbar   = document.getElementById('calEditorToolbar');
  const editor    = document.getElementById('calEditorArea');
  const colorGrid = document.getElementById('calColorGrid');
  const colorPrev = document.getElementById('calColorPreview');

  const updateState = () => {
    ['bold','italic','justifyLeft','justifyCenter','justifyRight',
     'insertUnorderedList','insertOrderedList'].forEach(cmd => {
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

  toolbar.addEventListener('mousedown', e => {
    e.preventDefault();
    const btn = e.target.closest('[data-cmd]');
    if (btn) { document.execCommand(btn.dataset.cmd, false, null); updateState(); return; }

    if (e.target.closest('[data-action="cal-color-toggle"]')) {
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

    const swatch = e.target.closest('[data-color]');
    if (swatch && colorGrid.contains(swatch)) {
      editor.focus();
      document.execCommand('foreColor', false, swatch.dataset.color);
      colorPrev.style.color = swatch.dataset.color;
      colorGrid.hidden = true;
    }
  });

  // Multi-select toggle
  document.getElementById('calMultiTrigger').addEventListener('click', () => {
    const dd = document.getElementById('calMultiDropdown');
    dd.hidden = !dd.hidden;
    if (!dd.hidden) {
      setTimeout(() => document.addEventListener('click', function hide(ev) {
        if (!document.getElementById('calMultiWrap').contains(ev.target)) {
          dd.hidden = true;
          document.removeEventListener('click', hide);
        }
      }), 0);
    }
  });
}

// ─── ABRIR / FECHAR MODAL PRINCIPAL ──────────────────────
async function _openCalModal() {
  document.getElementById('calOverlay').classList.add('visible');
  await _loadCalNivel();
  await Promise.all([_loadCalPerfis(), _loadCalEvents()]);
  document.getElementById('calBtnAddEvent').hidden = !_calCanEdit();

  // Se o mês atual não tem eventos mas há eventos em outros meses,
  // navega para o mês do evento mais próximo da data atual
  if (_calEvents.length > 0) {
    const hasThisMonth = _calEvents.some(ev => {
      const dt = _calParsePtDate(ev.data);
      return dt && dt.getFullYear() === _calDate.getFullYear()
                && dt.getMonth()    === _calDate.getMonth();
    });
    if (!hasThisMonth) {
      const now = new Date();
      let nearest = null, minDiff = Infinity;
      _calEvents.forEach(ev => {
        const dt = _calParsePtDate(ev.data);
        if (!dt) return;
        const diff = Math.abs(dt - now);
        if (diff < minDiff) { minDiff = diff; nearest = dt; }
      });
      if (nearest) _calDate = new Date(nearest.getFullYear(), nearest.getMonth(), 1);
    }
  }

  _renderCalendar();
  _renderEventList();
}

function _closeCalModal() {
  document.getElementById('calOverlay').classList.remove('visible');
}

// ─── ABRIR / FECHAR FORMULÁRIO ───────────────────────────
function _openEventForm(docId) {
  _calEditId = docId;
  document.getElementById('calOverlay').classList.remove('visible');
  document.getElementById('calFormOverlay').classList.add('visible');

  const ev = docId ? _calEvents.find(e => e.id === docId) : null;

  document.getElementById('calFormNome').value       = ev?.nome       || '';
  document.getElementById('calFormData').value       = ev?.data       || '';
  document.getElementById('calFormHoraInicio').value = ev?.horaInicio || '';
  document.getElementById('calFormHoraFim').value    = ev?.horaFim    || '';
  document.getElementById('calFormLink').value       = ev?.link       || '';
  document.getElementById('calEditorArea').innerHTML = ev?.descricao  || '';

  const respSel = document.getElementById('calFormResponsavel');
  respSel.innerHTML = '<option value="">Selecione...</option>' +
    _calPerfis.map(p =>
      `<option value="${_calEsc(p.id)}"${ev?.responsavelId === p.id ? ' selected' : ''}>${_calEsc(p.nome)}</option>`
    ).join('');

  _calSelectedIntegrantes = new Set(ev?.integrantesIds || []);
  _buildMultiSelect();

  document.getElementById('calFormDelete').hidden = !docId;
}

function _closeEventForm() {
  document.getElementById('calFormOverlay').classList.remove('visible');
  document.getElementById('calOverlay').classList.add('visible');
  _calEditId = null;
  _calSelectedIntegrantes = new Set();
}

// ─── CARREGAR DADOS ──────────────────────────────────────
async function _loadCalNivel() {
  const email = localStorage.getItem('plura-user-email') || '';
  if (!email) { _calNivel = 'A'; return; }
  try {
    const snap = await _calDb.collection('perfil').where('email', '==', email).limit(1).get();
    _calNivel = snap.empty ? 'A' : (snap.docs[0].data().nivel || 'A');
  } catch { _calNivel = 'A'; }
}

async function _loadCalPerfis() {
  try {
    const snap = await _calDb.collection('perfil').orderBy('nome').get();
    _calPerfis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { _calPerfis = []; }
}

async function _loadCalEvents() {
  try {
    const snap = await _calDb.collection('calendario').get();
    _calEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _sortCalEvents();
  } catch (err) {
    console.error('[calendario] Erro ao carregar eventos:', err);
    _calEvents = [];
  }
}

// Carrega dados financeiros diretamente da coleção (independente do módulo financeiro)
async function _loadCalFinData() {
  try {
    const snap = await _calDb.collection('financeiro').get();
    _calFinData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[calendario] Erro ao carregar dados financeiros:', err);
    _calFinData = [];
  } finally {
    _calFinLoaded = true;
  }
}

function _sortCalEvents() {
  _calEvents.sort((a, b) => {
    const da = _calParsePtDate(a.data), db = _calParsePtDate(b.data);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
}

// ─── MULTI-SELECT ────────────────────────────────────────
function _buildMultiSelect() {
  const dropdown = document.getElementById('calMultiDropdown');
  dropdown.innerHTML = _calPerfis.map(p => `
    <label class="cal-multi-option">
      <input type="checkbox" value="${_calEsc(p.id)}" ${_calSelectedIntegrantes.has(p.id) ? 'checked' : ''}>
      <span>${_calEsc(p.nome)}</span>
    </label>
  `).join('');
  dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) _calSelectedIntegrantes.add(cb.value);
      else            _calSelectedIntegrantes.delete(cb.value);
      _updateMultiLabel();
    });
  });
  _updateMultiLabel();
}

function _updateMultiLabel() {
  const selected = _calPerfis.filter(p => _calSelectedIntegrantes.has(p.id)).map(p => p.nome);
  document.getElementById('calMultiLabel').textContent =
    selected.length ? selected.join(', ') : 'Selecionar integrantes...';
}

// ─── SALVAR EVENTO ───────────────────────────────────────
async function _saveCalEvent() {
  const nome = document.getElementById('calFormNome').value.trim();
  if (!nome) {
    document.getElementById('calFormNome').focus();
    document.getElementById('calFormNome').style.border = '1.5px solid #e05252';
    setTimeout(() => document.getElementById('calFormNome').style.border = '', 2000);
    return;
  }

  const respSel  = document.getElementById('calFormResponsavel');
  const respId   = respSel.value;
  const respNome = respId ? (respSel.options[respSel.selectedIndex]?.text || '') : '';

  const integrantesIds   = [..._calSelectedIntegrantes];
  const integrantesNomes = _calPerfis
    .filter(p => _calSelectedIntegrantes.has(p.id)).map(p => p.nome);

  const payload = {
    nome,
    responsavelId:    respId,
    responsavelNome:  respNome,
    integrantesIds,
    integrantesNomes,
    data:       document.getElementById('calFormData').value.trim(),
    horaInicio: document.getElementById('calFormHoraInicio').value,
    horaFim:    document.getElementById('calFormHoraFim').value,
    descricao:  document.getElementById('calEditorArea').innerHTML.trim(),
    link:       document.getElementById('calFormLink').value.trim(),
  };

  const btn = document.getElementById('calFormSave');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    if (_calEditId) {
      await _calDb.collection('calendario').doc(_calEditId).update(payload);
      const idx = _calEvents.findIndex(e => e.id === _calEditId);
      if (idx >= 0) _calEvents[idx] = { id: _calEditId, ...payload };
    } else {
      const ref = await _calDb.collection('calendario').add({
        ...payload,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
      _calEvents.push({ id: ref.id, ...payload });
    }
    _sortCalEvents();
    _closeEventForm();
    _renderCalendar();
    _renderEventList();
  } catch (err) {
    console.error('[calendario] Erro ao salvar:', err);
    alert('Erro ao salvar o evento. Verifique o console para detalhes.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar Evento';
  }
}

// ─── APAGAR EVENTO ───────────────────────────────────────
async function _deleteCalEvent() {
  if (!_calEditId) return;
  const btn = document.getElementById('calFormDelete');
  btn.disabled = true;
  try {
    await _calDb.collection('calendario').doc(_calEditId).delete();
    _calEvents = _calEvents.filter(e => e.id !== _calEditId);
    _closeEventForm();
    _renderCalendar();
    _renderEventList();
  } catch (err) {
    console.error('[calendario] Erro ao apagar:', err);
    alert('Erro ao apagar o evento.');
  } finally {
    btn.disabled = false;
  }
}

// ─── RENDERIZAR CALENDÁRIO ───────────────────────────────
function _renderCalendar() {
  const year  = _calDate.getFullYear();
  const month = _calDate.getMonth();
  document.getElementById('calMonthLabel').textContent = `${_CAL_MONTHS[month]} ${year}`;

  const firstWeekDay = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const today        = new Date();

  // ── FASE 1: Eventos do calendário (isolado — nunca pode bloquear a renderização)
  const dayMap = {};
  try {
    (_calEvents || []).forEach(ev => {
      try {
        const dt = _calParsePtDate(ev.data);
        if (!dt || dt.getFullYear() !== year || dt.getMonth() !== month) return;
        const d = dt.getDate();
        if (!dayMap[d]) dayMap[d] = [];
        dayMap[d].push({ tipo: 'evento', label: ev.nome || '', id: ev.id || '' });
      } catch (_) {}
    });
  } catch (err) {
    console.error('[calendario] Erro ao mapear eventos:', err);
  }

  // ── FASE 2: Dados financeiros (só se toggle ativo; completamente isolado)
  if (_calShowPayments) {
    try {
      (_calFinData || []).forEach(cat => {
        try {
          (cat.infoParcelas || []).forEach((p, i) => {
            try {
              if (!p.dataPrevista) return;
              const dt = _calParsePtDate(p.dataPrevista);
              if (!dt || dt.getFullYear() !== year || dt.getMonth() !== month) return;
              const d = dt.getDate();
              if (!dayMap[d]) dayMap[d] = [];
              dayMap[d].push({
                tipo:  'pagamento',
                label: `${cat.categoria || '—'} - Parcela ${i + 1}`,
                pago:  p.status === 'efetuado',
              });
            } catch (_) {}
          });
        } catch (_) {}
      });
    } catch (err) {
      console.error('[calendario] Erro ao mapear pagamentos:', err);
    }
  }

  // ── FASE 3: Montar HTML e injetar (sempre executa)
  const headers = _CAL_WEEKS.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  let cells = '';

  for (let i = 0; i < firstWeekDay; i++) {
    cells += `<div class="cal-day-cell cal-day-cell--empty"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getFullYear() === year
                 && today.getMonth()    === month
                 && today.getDate()     === d;

    const cards = (dayMap[d] || []).map(item => {
      if (item.tipo === 'evento') {
        return `<div class="cal-card cal-card--evento"
                     data-calid="${_calEsc(item.id)}"
                     title="${_calEsc(item.label)}">${_calEsc(item.label)}</div>`;
      }
      return `<div class="cal-card ${item.pago ? 'cal-card--paid' : 'cal-card--pending'}"
                   title="${_calEsc(item.label)}">${_calEsc(item.label)}</div>`;
    }).join('');

    cells += `<div class="cal-day-cell${isToday ? ' cal-day-cell--today' : ''}">
      <span class="cal-day-num">${d}</span>
      <div class="cal-day-cards">${cards}</div>
    </div>`;
  }

  // Sempre 42 células (6 linhas × 7 colunas) para o grid ter altura fixa
  const filled = firstWeekDay + daysInMonth;
  const remainder = 42 - filled;
  for (let i = 0; i < remainder; i++) {
    cells += `<div class="cal-day-cell cal-day-cell--empty"></div>`;
  }

  document.getElementById('calBody').innerHTML =
    `<div class="cal-grid">${headers}${cells}</div>`;

  if (_calCanEdit()) {
    document.getElementById('calBody').querySelectorAll('.cal-card--evento').forEach(card => {
      card.addEventListener('click', e => {
        e.stopPropagation();
        _openEventForm(card.dataset.calid);
      });
    });
  }
}

// ─── RENDERIZAR LISTA ────────────────────────────────────
function _renderEventList() {
  const tbody = document.getElementById('calEventTbody');
  if (!_calEvents.length) {
    tbody.innerHTML = `<tr><td colspan="2" class="cal-table-empty">Nenhum evento cadastrado</td></tr>`;
    return;
  }
  tbody.innerHTML = _calEvents.map(ev => `
    <tr class="cal-event-row${_calCanEdit() ? ' cal-event-row--editable' : ''}"
        data-calid="${_calEsc(ev.id)}">
      <td>${_calEsc(ev.nome)}</td>
      <td class="cal-table-date">${_calEsc(ev.data)}</td>
    </tr>
  `).join('');

  if (_calCanEdit()) {
    tbody.querySelectorAll('.cal-event-row').forEach(row => {
      row.addEventListener('click', () => _openEventForm(row.dataset.calid));
    });
  }
}
