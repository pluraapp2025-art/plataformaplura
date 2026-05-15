// financeiro.js — Controle Financeiro com Firebase

// ─── FIREBASE ───────────────────────────────────────────
const _FIN_CFG = {
  apiKey: "AIzaSyBsU21aZjTUqdCvu8rNQGLXEVFVRgmG9dI",
  authDomain: "plura-249ba.firebaseapp.com",
  projectId: "plura-249ba",
  storageBucket: "plura-249ba.firebasestorage.app",
  messagingSenderId: "212726352993",
  appId: "1:212726352993:web:46683ca58ad37686ff6e20"
};

if (!firebase.apps.length) firebase.initializeApp(_FIN_CFG);
const _finDb = firebase.firestore();

// ─── STATE ──────────────────────────────────────────────
let _finData    = [];
let _finEditId  = null;
let _finDetId   = null;
let _finCtxId   = null;
let _finCtxEl   = null;
let _finNivel   = null;
let _finCalDate = new Date();

// ─── PERMISSÕES ──────────────────────────────────────────
function _finCanEdit() { return _finNivel === 'A' || _finNivel === 'B'; }

async function _loadFinNivel() {
  const email = localStorage.getItem('plura-user-email') || '';
  if (!email) { _finNivel = 'A'; return; }
  try {
    const snap = await _finDb.collection('perfil').where('email', '==', email).limit(1).get();
    _finNivel = snap.empty ? 'A' : (snap.docs[0].data().nivel || 'A');
  } catch {
    _finNivel = 'A';
  }
}

let _finToastTimer = null;
function _finShowToast(msg) {
  const toast = document.getElementById('perfilToast');
  if (!toast) return;
  toast.textContent = msg || 'Você não tem permissão para executar esta ação.';
  toast.classList.add('visible');
  clearTimeout(_finToastTimer);
  _finToastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}

// ─── UTILS ──────────────────────────────────────────────
const _fmtBRL = v =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function _finEsc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _applyDateMask(el) {
  el.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4);
    else if (v.length > 2) v = v.slice(0,2)+'/'+v.slice(2);
    this.value = v;
  });
}

function _applyBRLMask(el) {
  el.addEventListener('input', function () {
    const raw = this.value.replace(/\D/g, '');
    if (!raw) { this.value = ''; return; }
    const num = (parseInt(raw, 10) / 100).toFixed(2);
    const [int, dec] = num.split('.');
    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    this.value = 'R$ ' + intFmt + ',' + dec;
  });
}

function _parseBRL(str) {
  return parseFloat(String(str).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

function _setBRLValue(el, num) {
  const val = (Number(num) || 0).toFixed(2);
  const [int, dec] = val.split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  el.value = num ? 'R$ ' + intFmt + ',' + dec : '';
}

const _PRESET_COLORS = [
  '#4f7fff','#D85A30','#9F8DE8','#D4537E','#378ADD',
  '#C98A1A','#E24B4A','#1D9E75','#639922','#6e6f78',
  '#534AB7','#B83232','#0F9070','#FF9500','#34C759',
];

function _makeDefaultParcela(valor) {
  return { valor, dataPrevista: '', dataEfetuada: '', status: 'pendente', linkNotaFiscal: '', observacoes: '' };
}

function _parsePtDate(str) {
  if (!str || typeof str !== 'string') return null;
  const [d, m, y] = str.split('/').map(Number);
  if (!d || !m || !y || y < 2000) return null;
  return new Date(y, m - 1, d);
}

// ─── INIT ───────────────────────────────────────────────
async function initFinanceiro() {
  await _loadFinNivel();

  const el = document.getElementById('financeiro-content');

  el.innerHTML = `
    <div class="budget-header">
      <div>
        <div class="section-tag">Controle Financeiro · Plano de Trabalho Revisão 2</div>
        <h2 class="section-heading" style="font-size:1.4rem;margin-bottom:0;">Alocação de Orçamento</h2>
      </div>
    </div>

    <div class="fin-top-row">
      <div class="fin-top-cards" id="finSummaryGrid"></div>
      <div class="fin-top-btns">
        <button class="fin-add-btn" id="finAddBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar Categoria
        </button>
        <button class="fin-btn-secondary" id="finCalBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Visualização em calendário
        </button>
        <button class="fin-btn-secondary" id="finParcelasBtn">Lista de pagamento de parcelas</button>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">Distribuição por Categoria de Meta</span>
        <span style="font-size:11px;color:var(--text3)">Período Abril – Agosto 2025</span>
      </div>
      <div class="table-scroll-wrapper">
        <table class="budget-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Valor Previsto</th>
              <th>Parcelas</th>
              <th>% Pago</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody id="finTbody">
            <tr><td colspan="5" class="fin-loading-cell">Carregando...</td></tr>
          </tbody>
          <tfoot id="finTfoot"></tfoot>
        </table>
      </div>
    </div>
  `;

  _buildFinModals();

  const addBtn = document.getElementById('finAddBtn');
  if (_finCanEdit()) {
    addBtn.addEventListener('click', () => _openCatModal(null));
  } else {
    addBtn.style.display = 'none';
  }

  document.getElementById('finCalBtn').addEventListener('click', _openCalModal);
  document.getElementById('finParcelasBtn').addEventListener('click', _openParcelasModal);

  document.addEventListener('click', _onDocClick);
  document.addEventListener('contextmenu', _onDocCtxMenu);

  _loadFinanceiro();
}

// ─── CARGA FIREBASE ─────────────────────────────────────
async function _loadFinanceiro() {
  try {
    const snap = await _finDb.collection('financeiro').orderBy('categoria').get();
    _finData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _renderFinTable();
  } catch (err) {
    console.error('[financeiro] Erro ao carregar:', err);
    document.getElementById('finTbody').innerHTML =
      '<tr><td colspan="5" class="fin-loading-cell" style="color:#e24b4a;">Erro ao carregar dados.</td></tr>';
  }
}

// ─── RENDER TABELA ──────────────────────────────────────
function _renderFinTable() {
  const tbody   = document.getElementById('finTbody');
  const tfoot   = document.getElementById('finTfoot');
  const sumGrid = document.getElementById('finSummaryGrid');

  if (_finData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="fin-loading-cell">Nenhuma categoria cadastrada.</td></tr>';
    tfoot.innerHTML = '';
    sumGrid.innerHTML = '';
    return;
  }

  const total = _finData.reduce((s, r) => s + (Number(r.valor) || 0), 0);

  tbody.innerHTML = _finData.map(r => {
    const v      = Number(r.valor) || 0;
    const pago   = (r.infoParcelas || [])
      .filter(p => p.status === 'efetuado')
      .reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const pct    = v > 0 ? Math.min(100, (pago / v) * 100).toFixed(1) : '0.0';
    const np     = r.numParcelas || 1;
    return `
      <tr class="fin-row" data-id="${r.id}" title="Clique para ver detalhes">
        <td>
          <span style="display:inline-flex;align-items:center;gap:7px;">
            <span style="width:8px;height:8px;border-radius:2px;background:${_finEsc(r.cor)};flex-shrink:0;display:inline-block;"></span>
            ${_finEsc(r.categoria)}
          </span>
        </td>
        <td class="value-cell">${_fmtBRL(v)}</td>
        <td class="pct-cell">${np}x</td>
        <td class="pct-cell">${pct}%</td>
        <td style="padding-right:1.25rem;">
          <div class="budget-bar">
            <div class="budget-bar-fill" style="width:${pct}%;background:${_finEsc(r.cor)};"></div>
          </div>
        </td>
      </tr>`;
  }).join('');

  tfoot.innerHTML = `
    <tr style="background:var(--bg3);">
      <td style="font-family:'Syne',sans-serif;font-weight:600;color:var(--text);padding:0.65rem 0.75rem;border-top:1px solid var(--border);">Total Geral</td>
      <td style="font-family:'Syne',sans-serif;font-weight:700;color:var(--accent);padding:0.65rem 0.75rem;border-top:1px solid var(--border);white-space:nowrap;">${_fmtBRL(total)}</td>
      <td colspan="3" style="padding:0.65rem 0.75rem;border-top:1px solid var(--border);color:var(--text3);">100%</td>
    </tr>`;

  // ── Summary cards ────────────────────────────────────
  const maior = _finData.reduce((a, b) =>
    (Number(b.valor)||0) > (Number(a.valor)||0) ? b : a, _finData[0]);

  // Orçamento investido: soma de parcelas com status efetuado
  const investido = _finData.reduce((sum, cat) =>
    sum + (cat.infoParcelas || [])
      .filter(p => p.status === 'efetuado')
      .reduce((s, p) => s + (Number(p.valor) || 0), 0), 0);

  // Próximas entregas: parcelas pendentes com dataPrevista, ordenadas por data
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = [];
  _finData.forEach(cat => {
    (cat.infoParcelas || []).forEach((p) => {
      if (p.status === 'efetuado' || !p.dataPrevista) return;
      const dt = _parsePtDate(p.dataPrevista);
      if (!dt) return;
      upcoming.push({ nome: cat.categoria, data: dt, valor: p.valor, atrasado: dt < today });
    });
  });
  upcoming.sort((a, b) => a.data - b.data);
  const proximasRows = upcoming.slice(0, 4).map(u => `
    <div class="fin-delivery-row">
      <span class="fin-delivery-name ${u.atrasado ? 'fin-delivery--late' : ''}">${_finEsc(u.nome)}</span>
      <span class="fin-delivery-dots"></span>
      <span class="fin-delivery-date ${u.atrasado ? 'fin-delivery--late' : ''}">${_fmtBRL(u.valor)}</span>
      <span class="fin-delivery-sep">···</span>
      <span class="fin-delivery-when ${u.atrasado ? 'fin-delivery--late' : ''}">${u.data.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
    </div>`).join('');

  // Próxima Maior Alocação: parcela pendente com maior valor entre as que têm data
  let proxMaiorParcela = null;
  let proxMaiorCat = null;
  let proxMaiorIdx = null;
  _finData.forEach(cat => {
    (cat.infoParcelas || []).forEach((p, i) => {
      if (p.status === 'efetuado' || !p.dataPrevista) return;
      if (!_parsePtDate(p.dataPrevista)) return;
      if (!proxMaiorParcela || (Number(p.valor) || 0) > (Number(proxMaiorParcela.valor) || 0)) {
        proxMaiorParcela = p;
        proxMaiorCat = cat;
        proxMaiorIdx = i;
      }
    });
  });
  const proxTag = proxMaiorCat && proxMaiorIdx !== null
    ? `${_finEsc(proxMaiorCat.categoria)} — Parcela ${proxMaiorIdx + 1}`
    : '';

  const investidoPct = total > 0 ? ((investido / total) * 100).toFixed(1) : '0.0';

  sumGrid.innerHTML = `
    <div class="budget-summary-card fin-card--merged">
      <div class="budget-summary-title">Maior Alocação</div>
      <div class="budget-summary-value fin-sum-name" style="color:${_finEsc(maior.cor)};">${_finEsc(maior.categoria)}</div>
      <div class="budget-summary-title fin-card-spacer">Maior Valor Alocado</div>
      <div class="budget-summary-value">${_fmtBRL(Number(maior.valor)||0)}</div>
    </div>

    <div class="budget-summary-card fin-card--prox-maior">
      <div class="fin-prox-title-row">
        <div class="budget-summary-title">Próxima Maior Alocação</div>
        ${proxTag ? `<span class="fin-prox-tag">${proxTag}</span>` : ''}
      </div>
      <div class="budget-summary-value fin-sum-name fin-prox-cat">${proxMaiorCat ? _finEsc(proxMaiorCat.categoria) : '—'}</div>
      <div class="fin-prox-body">
        <div class="fin-prox-col">
          <div class="budget-summary-title">Valor</div>
          <div class="budget-summary-value">${proxMaiorParcela ? _fmtBRL(Number(proxMaiorParcela.valor)||0) : '—'}</div>
        </div>
        <div class="fin-prox-col">
          <div class="budget-summary-title">Data</div>
          <div class="budget-summary-value fin-sum-name">${proxMaiorParcela ? _finEsc(proxMaiorParcela.dataPrevista) : '—'}</div>
        </div>
      </div>
    </div>

    <div class="budget-summary-card fin-card--deliveries">
      <div class="budget-summary-title">Próximas Entregas</div>
      <div class="fin-deliveries-list">
        ${proximasRows || '<span class="fin-no-delivery">Nenhuma entrega pendente</span>'}
      </div>
    </div>
    <div class="budget-summary-card fin-card--orcamento">
      <div class="fin-orcamento-left">
        <div class="budget-summary-title">Orçamento Total</div>
        <div class="budget-summary-value">${_fmtBRL(total)}</div>
        <div class="budget-summary-title fin-card-spacer">Orçamento Investido</div>
        <div class="budget-summary-value" style="color:#1D9E75;">${_fmtBRL(investido)}</div>
      </div>
      <div class="fin-orcamento-pct">
        <div class="fin-pct-value">${investidoPct}%</div>
        <div class="fin-pct-label">investido</div>
      </div>
    </div>`;

  // Row listeners
  tbody.querySelectorAll('.fin-row').forEach(tr => {
    tr.addEventListener('click', () => _openDetailModal(tr.dataset.id));
    if (_finCanEdit()) {
      tr.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation();
        _showCtxMenu(e, tr.dataset.id);
      });
    }
  });
}

// ─── BUILD MODALS HTML ───────────────────────────────────
function _buildFinModals() {
  if (document.getElementById('finOverlay')) return;

  const colorSwatches = _PRESET_COLORS.map(c =>
    `<button type="button" class="fin-swatch" data-color="${c}" style="background:${c};" title="${c}"></button>`
  ).join('');

  const html = `
  <!-- ── OVERLAY CATEGORIA ── -->
  <div class="fin-overlay" id="finOverlay">
    <div class="fin-modal">
      <div class="fin-modal-hdr">
        <span class="fin-modal-title" id="finModalTitle">Nova Categoria</span>
        <button class="perfil-modal-close" id="finModalClose" aria-label="Fechar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="fin-modal-body">
        <div class="fin-group">
          <label class="fin-label">Nome da categoria</label>
          <input class="fin-input" id="finNome" type="text" placeholder="Ex: Desenvolvimento Tecnológico" autocomplete="off">
        </div>
        <div class="fin-group">
          <label class="fin-label">Valor total</label>
          <input class="fin-input" id="finValor" type="text" inputmode="numeric" placeholder="R$ 0,00" autocomplete="off">
        </div>
        <div class="fin-group">
          <label class="fin-label">Cor</label>
          <div class="fin-color-row">
            <div class="fin-color-preview" id="finColorPreview"></div>
            <div class="fin-color-grid" id="finColorGrid">${colorSwatches}</div>
          </div>
        </div>
        <div class="fin-row-2col">
          <div class="fin-group" style="flex:1;">
            <label class="fin-label">Número de parcelas</label>
            <input class="fin-input" id="finNumParcelas" type="number" min="1" max="60" step="1" placeholder="1" value="1">
          </div>
        </div>
        <div class="fin-toggle-row">
          <label class="fin-toggle-label" for="finIguais">
            <input type="checkbox" id="finIguais" checked>
            <span>Todas as parcelas terão o mesmo valor</span>
          </label>
        </div>
        <!-- Tabela de parcelas customizadas -->
        <div class="fin-custom-parcelas" id="finCustomParcelas">
          <div class="fin-cp-content">
            <div class="fin-cp-header">
              <span>Parcela</span><span>Valor (R$)</span>
            </div>
            <div id="finCpRows"></div>
          </div>
        </div>
        <div class="fin-group">
          <label class="fin-label">Justificativa e observações</label>
          <textarea class="fin-input fin-justificativa" id="finJustificativa"
                    placeholder="Descreva a justificativa ou observações desta categoria..."></textarea>
        </div>
      </div>
      <div class="fin-modal-footer">
        <button class="btn-modal-cancel" id="finModalCancel">Cancelar</button>
        <button class="btn-modal-save"   id="finModalSave">Salvar</button>
      </div>
    </div>
  </div>

  <!-- ── OVERLAY DETALHE ── -->
  <div class="fin-overlay" id="finDetOverlay">
    <div class="fin-modal fin-modal--lg">
      <div class="fin-modal-hdr">
        <span class="fin-modal-title" id="finDetTitle">Detalhes</span>
        <button class="perfil-modal-close" id="finDetClose" aria-label="Fechar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="fin-det-summary" id="finDetSummary"></div>
      <div class="fin-det-sections" id="finDetSections"></div>
      <div class="fin-modal-footer">
        <button class="btn-modal-cancel" id="finDetCancel">Fechar</button>
        <button class="btn-modal-save"   id="finDetSave">Salvar Alterações</button>
      </div>
    </div>
  </div>

  <!-- ── OVERLAY CONFIRMAÇÃO DELETE ── -->
  <div class="fin-overlay" id="finDelOverlay">
    <div class="fin-modal fin-modal--sm">
      <div class="fin-modal-hdr">
        <span class="fin-modal-title">Excluir categoria</span>
        <button class="perfil-modal-close" id="finDelClose" aria-label="Fechar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body-delete">
        <p>Tem certeza que deseja excluir a categoria <strong id="finDelNome"></strong>?</p>
        <p class="modal-delete-warn">Esta ação não pode ser desfeita.</p>
      </div>
      <div class="fin-modal-footer">
        <button class="btn-modal-cancel" id="finDelCancel">Cancelar</button>
        <button class="btn-modal-delete" id="finDelConfirm">Excluir</button>
      </div>
    </div>
  </div>

  <!-- ── CONTEXT MENU ── -->
  <div class="ctx-menu" id="finCtxMenu" style="position:fixed;display:none;z-index:1200;">
    <button class="ctx-item ctx-item--edit"   id="finCtxEdit">Editar</button>
    <button class="ctx-item ctx-item--danger" id="finCtxDel">Excluir</button>
  </div>

  <!-- ── OVERLAY CALENDÁRIO ── -->
  <div class="fin-overlay" id="finCalOverlay">
    <div class="fin-modal fin-modal--cal">
      <div class="fin-modal-hdr">
        <span class="fin-modal-title">Visualização em Calendário</span>
        <button class="perfil-modal-close" id="finCalModalClose" aria-label="Fechar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="fin-cal-nav">
        <button class="fin-cal-nav-btn" id="finCalPrev">&#8249;</button>
        <span class="fin-cal-month-label" id="finCalMonthLabel"></span>
        <button class="fin-cal-nav-btn" id="finCalNext">&#8250;</button>
      </div>
      <div class="fin-cal-body" id="finCalBody"></div>
    </div>
  </div>

  <!-- ── OVERLAY LISTA DE PARCELAS ── -->
  <div class="fin-overlay" id="finParcelasOverlay">
    <div class="fin-modal fin-modal--parcelas">
      <div class="fin-modal-hdr">
        <span class="fin-modal-title">Lista de Pagamento de Parcelas</span>
        <button class="perfil-modal-close" id="finParcelasModalClose" aria-label="Fechar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="fin-parcelas-sort-row">
        <button class="fin-sort-btn" id="finSortAlfa">Ordem Alfabética</button>
        <button class="fin-sort-btn fin-sort-btn--active" id="finSortData">Ordenar por Data</button>
      </div>
      <div class="fin-parcelas-table-wrap">
        <table class="fin-parcelas-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Parcela</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody id="finParcelasTbody"></tbody>
        </table>
      </div>
      <div class="fin-modal-footer">
        <button class="btn-modal-cancel" id="finParcelasCancel">Fechar</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // ── bind modal categoria
  document.getElementById('finModalClose').addEventListener('click',  _closeCatModal);
  document.getElementById('finModalCancel').addEventListener('click', _closeCatModal);
  document.getElementById('finModalSave').addEventListener('click',   _saveCat);
  document.getElementById('finOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('finOverlay')) _closeCatModal();
  });

  // color swatches
  let _selColor = _PRESET_COLORS[0];
  document.getElementById('finColorPreview').style.background = _selColor;
  document.getElementById('finColorGrid').querySelectorAll('.fin-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      _selColor = sw.dataset.color;
      document.getElementById('finColorPreview').style.background = _selColor;
      document.querySelectorAll('.fin-swatch').forEach(s => s.classList.remove('fin-swatch--active'));
      sw.classList.add('fin-swatch--active');
    });
  });
  // expose selected color via element data
  document.getElementById('finColorPreview').dataset.color = _selColor;
  document.getElementById('finColorGrid').addEventListener('click', () => {
    document.getElementById('finColorPreview').dataset.color = _selColor;
  });

  // parcelas iguais toggle
  _applyBRLMask(document.getElementById('finValor'));
  document.getElementById('finValor').addEventListener('input', _updateCpRows);
  document.getElementById('finIguais').addEventListener('change', _onIguaisChange);
  document.getElementById('finNumParcelas').addEventListener('input', _updateCpRows);

  // ── bind modal detalhe
  document.getElementById('finDetClose').addEventListener('click',  _closeDetailModal);
  document.getElementById('finDetCancel').addEventListener('click', _closeDetailModal);
  document.getElementById('finDetSave').addEventListener('click',   _saveDetailModal);
  document.getElementById('finDetOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('finDetOverlay')) _closeDetailModal();
  });

  // ── bind modal delete
  document.getElementById('finDelClose').addEventListener('click',   _closeDelModal);
  document.getElementById('finDelCancel').addEventListener('click',  _closeDelModal);
  document.getElementById('finDelConfirm').addEventListener('click', _confirmDelete);
  document.getElementById('finDelOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('finDelOverlay')) _closeDelModal();
  });

  // ── ctx menu
  document.getElementById('finCtxEdit').addEventListener('click', () => {
    _closeCtxMenu();
    _openCatModal(_finCtxId);
  });
  document.getElementById('finCtxDel').addEventListener('click', () => {
    _closeCtxMenu();
    _openDelModal(_finCtxId);
  });

  // ── bind modal calendário
  document.getElementById('finCalModalClose').addEventListener('click', _closeCalModal);
  document.getElementById('finCalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('finCalOverlay')) _closeCalModal();
  });
  document.getElementById('finCalPrev').addEventListener('click', () => {
    _finCalDate = new Date(_finCalDate.getFullYear(), _finCalDate.getMonth() - 1, 1);
    _renderCalendar();
  });
  document.getElementById('finCalNext').addEventListener('click', () => {
    _finCalDate = new Date(_finCalDate.getFullYear(), _finCalDate.getMonth() + 1, 1);
    _renderCalendar();
  });

  // ── bind modal parcelas
  document.getElementById('finParcelasModalClose').addEventListener('click', _closeParcelasModal);
  document.getElementById('finParcelasCancel').addEventListener('click',     _closeParcelasModal);
  document.getElementById('finParcelasOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('finParcelasOverlay')) _closeParcelasModal();
  });
  document.getElementById('finSortAlfa').addEventListener('click', () => {
    _finParcelasOrder = 'alfa';
    _renderParcelasTable();
  });
  document.getElementById('finSortData').addEventListener('click', () => {
    _finParcelasOrder = 'data';
    _renderParcelasTable();
  });
}

// ─── COLOR HELPER ────────────────────────────────────────
function _getSelectedColor() {
  return document.getElementById('finColorPreview').dataset.color || _PRESET_COLORS[0];
}

function _setSelectedColor(color) {
  const prev = document.getElementById('finColorPreview');
  prev.style.background = color;
  prev.dataset.color     = color;
  document.querySelectorAll('.fin-swatch').forEach(s => {
    s.classList.toggle('fin-swatch--active', s.dataset.color === color);
  });
}

// ─── PARCELAS IGUAIS TOGGLE ──────────────────────────────
function _onIguaisChange() {
  const iguais = document.getElementById('finIguais').checked;
  const panel  = document.getElementById('finCustomParcelas');
  if (iguais) {
    panel.classList.remove('fin-cp--visible');
  } else {
    panel.classList.add('fin-cp--visible');
    _updateCpRows();
  }
}

function _updateCpRows() {
  if (document.getElementById('finIguais').checked) return;

  const n   = Math.max(1, Math.min(60, parseInt(document.getElementById('finNumParcelas').value) || 1));
  const tot = _parseBRL(document.getElementById('finValor').value);
  const eqV = tot > 0 ? (tot / n).toFixed(2) : '';

  const cont  = document.getElementById('finCpRows');
  const exist = cont.querySelectorAll('.fin-cp-row');

  // add rows
  for (let i = exist.length; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'fin-cp-row';
    row.innerHTML = `
      <span class="fin-cp-label">Parcela ${i + 1}</span>
      <input class="fin-input fin-cp-input" type="number" min="0" step="0.01"
             placeholder="0,00" value="${eqV}">`;
    cont.appendChild(row);
  }

  // remove extra rows
  const rows = cont.querySelectorAll('.fin-cp-row');
  for (let i = n; i < rows.length; i++) rows[i].remove();
}

// ─── MODAL CATEGORIA — ABRIR/FECHAR ─────────────────────
function _openCatModal(id) {
  _finEditId = id;
  const overlay = document.getElementById('finOverlay');
  const title   = document.getElementById('finModalTitle');

  if (id) {
    const item = _finData.find(d => d.id === id);
    if (!item) return;
    title.textContent = 'Editar Categoria';
    document.getElementById('finNome').value           = item.categoria       || '';
    document.getElementById('finJustificativa').value  = item.justificativa   || '';
    _setBRLValue(document.getElementById('finValor'), item.valor);
    document.getElementById('finNumParcelas').value = item.numParcelas || 1;
    document.getElementById('finIguais').checked    = item.parcelasIguais !== false;
    _setSelectedColor(item.cor || _PRESET_COLORS[0]);

    if (item.parcelasIguais === false) {
      document.getElementById('finCustomParcelas').classList.add('fin-cp--visible');
      // Populate custom values
      const cont = document.getElementById('finCpRows');
      cont.innerHTML = '';
      const parc = item.infoParcelas || [];
      const n    = item.numParcelas  || 1;
      for (let i = 0; i < n; i++) {
        const row = document.createElement('div');
        row.className = 'fin-cp-row';
        row.innerHTML = `
          <span class="fin-cp-label">Parcela ${i + 1}</span>
          <input class="fin-input fin-cp-input" type="number" min="0" step="0.01"
                 placeholder="0,00" value="${parc[i]?.valor ?? ''}">`;
        cont.appendChild(row);
      }
    } else {
      document.getElementById('finCustomParcelas').classList.remove('fin-cp--visible');
    }
  } else {
    title.textContent = 'Nova Categoria';
    document.getElementById('finNome').value          = '';
    document.getElementById('finValor').value         = '';
    document.getElementById('finJustificativa').value = '';
    document.getElementById('finNumParcelas').value = '1';
    document.getElementById('finIguais').checked    = true;
    _setSelectedColor(_PRESET_COLORS[0]);
    document.getElementById('finCustomParcelas').classList.remove('fin-cp--visible');
    document.getElementById('finCpRows').innerHTML  = '';
  }

  overlay.classList.add('visible');
}

function _closeCatModal() {
  document.getElementById('finOverlay').classList.remove('visible');
  _finEditId = null;
}

// ─── SALVAR CATEGORIA ────────────────────────────────────
async function _saveCat() {
  if (!_finCanEdit()) { _finShowToast(); return; }
  const nome = document.getElementById('finNome').value.trim();
  const val  = _parseBRL(document.getElementById('finValor').value);
  const np   = Math.max(1, parseInt(document.getElementById('finNumParcelas').value) || 1);
  const cor  = _getSelectedColor();
  const ig   = document.getElementById('finIguais').checked;

  if (!nome) { alert('Informe o nome da categoria.'); return; }
  if (val <= 0) { alert('Informe um valor válido.'); return; }

  // Build infoParcelas
  let infoParcelas;
  if (ig) {
    const pv = val / np;
    if (_finEditId) {
      const old = (_finData.find(d => d.id === _finEditId)?.infoParcelas) || [];
      infoParcelas = Array.from({ length: np }, (_, i) => ({
        ..._makeDefaultParcela(pv),
        ...(old[i] || {}),
        valor: pv,
      }));
    } else {
      infoParcelas = Array.from({ length: np }, () => _makeDefaultParcela(pv));
    }
  } else {
    const inputs = document.getElementById('finCpRows').querySelectorAll('.fin-cp-input');
    const old    = _finEditId ? ((_finData.find(d => d.id === _finEditId)?.infoParcelas) || []) : [];
    infoParcelas = Array.from({ length: np }, (_, i) => ({
      ..._makeDefaultParcela(parseFloat(inputs[i]?.value) || 0),
      ...(old[i] || {}),
      valor: parseFloat(inputs[i]?.value) || 0,
    }));
  }

  const justificativa = document.getElementById('finJustificativa').value.trim();

  const payload = {
    categoria:      nome,
    valor:          val,
    cor,
    numParcelas:    np,
    parcelasIguais: ig,
    infoParcelas,
    justificativa,
    atualizadoEm:   firebase.firestore.FieldValue.serverTimestamp(),
  };

  const btn = document.getElementById('finModalSave');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  try {
    if (_finEditId) {
      await _finDb.collection('financeiro').doc(_finEditId).update(payload);
    } else {
      payload.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
      await _finDb.collection('financeiro').add(payload);
    }
    _closeCatModal();
    await _loadFinanceiro();
  } catch (err) {
    console.error('[financeiro] Erro ao salvar:', err);
    alert('Erro ao salvar. Tente novamente.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Salvar';
  }
}

// ─── MODAL DETALHE ───────────────────────────────────────
function _openDetailModal(id) {
  const item = _finData.find(d => d.id === id);
  if (!item) return;
  _finDetId = id;

  const parc   = item.infoParcelas || [];
  const total  = Number(item.valor) || 0;
  const npag   = parc.filter(p => p.status === 'efetuado').reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const pct    = total > 0 ? Math.min(100, (npag / total) * 100) : 0;

  document.getElementById('finDetTitle').textContent = item.categoria || '—';

  // Summary
  document.getElementById('finDetSummary').innerHTML = `
    <div class="fin-det-kpis">
      <div class="fin-kpi">
        <div class="fin-kpi-label">Total Previsto</div>
        <div class="fin-kpi-value">${_fmtBRL(total)}</div>
      </div>
      <div class="fin-kpi">
        <div class="fin-kpi-label">Valor Pago</div>
        <div class="fin-kpi-value" id="finDetPago">${_fmtBRL(npag)}</div>
      </div>
    </div>
    <div class="fin-progress-wrap">
      <div class="fin-progress-bar">
        <div class="fin-progress-fill" id="finDetFill" style="width:${pct.toFixed(1)}%;background:${_finEsc(item.cor)};"></div>
        <div class="fin-progress-pct" id="finDetPct" style="left:${pct.toFixed(1)}%;">${pct.toFixed(1)}%</div>
      </div>
    </div>`;

  // Sections per parcela
  const sections = parc.map((p, i) => `
    <div class="fin-parcela-section" data-idx="${i}">
      <div class="fin-ps-title">Parcela ${i + 1}</div>
      <div class="fin-ps-row">
        <div class="fin-ps-field">
          <label class="fin-label">Valor</label>
          <input class="fin-input fin-ps-valor" type="number" min="0" step="0.01"
                 value="${Number(p.valor)||0}" data-idx="${i}">
        </div>
        <div class="fin-ps-field">
          <label class="fin-label">Data de pagamento</label>
          <input class="fin-input fin-ps-dataprev" type="text" maxlength="10"
                 placeholder="dd/mm/aaaa" value="${_finEsc(p.dataPrevista||'')}" data-idx="${i}">
        </div>
        <div class="fin-ps-field">
          <label class="fin-label">Data pagamento efetuado</label>
          <input class="fin-input fin-ps-dataefet" type="text" maxlength="10"
                 placeholder="dd/mm/aaaa" value="${_finEsc(p.dataEfetuada||'')}" data-idx="${i}">
        </div>
      </div>
      <div class="fin-ps-row">
        <div class="fin-ps-field fin-ps-field--auto">
          <label class="fin-label">Status pagamento</label>
          <button class="fin-status-btn ${p.status === 'efetuado' ? 'fin-status-btn--ok' : ''}"
                  data-idx="${i}" data-status="${p.status||'pendente'}">
            ${p.status === 'efetuado' ? 'Efetuado' : 'Pendente'}
          </button>
        </div>
        <div class="fin-ps-field fin-ps-field--grow">
          <label class="fin-label">Link para nota fiscal</label>
          <div style="display:flex;gap:0.4rem;">
            <input class="fin-input fin-ps-link" type="text"
                   placeholder="https://..." value="${_finEsc(p.linkNotaFiscal||'')}" data-idx="${i}">
            <button class="fin-link-open-btn" data-idx="${i}" title="Abrir link em nova aba">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="fin-ps-row">
        <div class="fin-ps-field fin-ps-field--grow">
          <label class="fin-label">Observações</label>
          <textarea class="fin-input fin-ps-obs" rows="3" data-idx="${i}"
                    style="resize:vertical;max-height:100px;min-height:48px;">${_finEsc(p.observacoes||'')}</textarea>
        </div>
      </div>
    </div>`).join('');

  document.getElementById('finDetSections').innerHTML =
    sections || '<div style="padding:1.5rem;color:var(--text3);text-align:center;">Nenhuma parcela definida.</div>';

  const wrap    = document.getElementById('finDetSections');
  const canEdit = _finCanEdit();

  // Máscara de data e toggle de status (somente se puder editar)
  if (canEdit) {
    wrap.querySelectorAll('.fin-ps-dataprev, .fin-ps-dataefet').forEach(_applyDateMask);

    wrap.querySelectorAll('.fin-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = btn.dataset.status;
        const nxt = cur === 'pendente' ? 'efetuado' : 'pendente';
        btn.dataset.status = nxt;
        btn.textContent    = nxt === 'efetuado' ? 'Efetuado' : 'Pendente';
        btn.classList.toggle('fin-status-btn--ok', nxt === 'efetuado');
        _recalcDetPago();
      });
    });

    wrap.querySelectorAll('.fin-ps-valor').forEach(inp => {
      inp.addEventListener('input', _recalcDetPago);
    });
  } else {
    // Somente leitura para níveis C/D
    wrap.querySelectorAll('.fin-input').forEach(el => {
      el.setAttribute('readonly', '');
      el.setAttribute('tabindex', '-1');
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.7';
    });
    wrap.querySelectorAll('.fin-status-btn').forEach(btn => {
      btn.disabled = true;
      btn.style.cursor = 'default';
    });
    document.getElementById('finDetSave').style.display = 'none';
  }

  // Abrir link externo (disponível para todos)
  wrap.querySelectorAll('.fin-link-open-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx  = btn.dataset.idx;
      let link   = wrap.querySelector(`.fin-ps-link[data-idx="${idx}"]`).value.trim();
      if (!link) { alert('Nenhum link cadastrado para esta parcela.'); return; }
      if (!/^https?:\/\//i.test(link)) link = 'https://' + link;
      window.open(link, '_blank', 'noopener,noreferrer');
    });
  });

  document.getElementById('finDetOverlay').classList.add('visible');
}

function _recalcDetPago() {
  const item  = _finData.find(d => d.id === _finDetId);
  if (!item) return;
  const total = Number(item.valor) || 0;
  const wrap  = document.getElementById('finDetSections');

  let paid = 0;
  wrap.querySelectorAll('.fin-parcela-section').forEach(sec => {
    const idx    = parseInt(sec.dataset.idx);
    const btn    = sec.querySelector('.fin-status-btn');
    const valInp = sec.querySelector('.fin-ps-valor');
    if (btn?.dataset.status === 'efetuado') {
      paid += parseFloat(valInp?.value) || 0;
    }
  });

  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  document.getElementById('finDetPago').textContent = _fmtBRL(paid);
  document.getElementById('finDetFill').style.width = pct.toFixed(1) + '%';
  document.getElementById('finDetPct').style.left   = pct.toFixed(1) + '%';
  document.getElementById('finDetPct').textContent  = pct.toFixed(1) + '%';
}

function _closeDetailModal() {
  document.getElementById('finDetOverlay').classList.remove('visible');
  document.getElementById('finDetSave').style.display = '';
  _finDetId = null;
}

async function _saveDetailModal() {
  if (!_finCanEdit()) { _finShowToast(); return; }
  const item = _finData.find(d => d.id === _finDetId);
  if (!item) return;

  const wrap  = document.getElementById('finDetSections');
  const parc  = (item.infoParcelas || []).map((p, i) => {
    const sec = wrap.querySelector(`.fin-parcela-section[data-idx="${i}"]`);
    if (!sec) return p;
    return {
      valor:          parseFloat(sec.querySelector('.fin-ps-valor')?.value) || 0,
      dataPrevista:   sec.querySelector('.fin-ps-dataprev')?.value.trim()  || '',
      dataEfetuada:   sec.querySelector('.fin-ps-dataefet')?.value.trim()  || '',
      status:         sec.querySelector('.fin-status-btn')?.dataset.status || 'pendente',
      linkNotaFiscal: sec.querySelector('.fin-ps-link')?.value.trim()      || '',
      observacoes:    sec.querySelector('.fin-ps-obs')?.value.trim()       || '',
    };
  });

  const btn = document.getElementById('finDetSave');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  try {
    await _finDb.collection('financeiro').doc(_finDetId).update({
      infoParcelas:  parc,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await _loadFinanceiro();
    _closeDetailModal();
  } catch (err) {
    console.error('[financeiro] Erro ao salvar detalhes:', err);
    alert('Erro ao salvar. Tente novamente.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Salvar Alterações';
  }
}

// ─── MODAL DELETE ────────────────────────────────────────
function _openDelModal(id) {
  const item = _finData.find(d => d.id === id);
  if (!item) return;
  _finCtxId = id;
  document.getElementById('finDelNome').textContent = item.categoria || '';
  document.getElementById('finDelOverlay').classList.add('visible');
}

function _closeDelModal() {
  document.getElementById('finDelOverlay').classList.remove('visible');
}

async function _confirmDelete() {
  if (!_finCanEdit()) { _finShowToast(); return; }
  if (!_finCtxId) return;
  const btn = document.getElementById('finDelConfirm');
  btn.disabled    = true;
  btn.textContent = 'Excluindo...';
  try {
    await _finDb.collection('financeiro').doc(_finCtxId).delete();
    _closeDelModal();
    await _loadFinanceiro();
  } catch (err) {
    console.error('[financeiro] Erro ao excluir:', err);
    alert('Erro ao excluir. Tente novamente.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Excluir';
    _finCtxId       = null;
  }
}

// ─── CONTEXT MENU ────────────────────────────────────────
function _showCtxMenu(e, id) {
  _finCtxId = id;
  const menu = document.getElementById('finCtxMenu');
  menu.style.display = 'block';

  const vw = window.innerWidth, vh = window.innerHeight;
  let x = e.clientX, y = e.clientY;
  if (x + 160 > vw) x = vw - 165;
  if (y + 90  > vh) y = vh - 95;

  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
}

function _closeCtxMenu() {
  const menu = document.getElementById('finCtxMenu');
  if (menu) menu.style.display = 'none';
}

// ─── DOCUMENT LISTENERS ──────────────────────────────────
function _onDocClick(e) {
  const menu = document.getElementById('finCtxMenu');
  if (menu && !menu.contains(e.target)) _closeCtxMenu();
}

function _onDocCtxMenu(e) {
  // If right-click landed on a fin-row already handled via row listener, skip
  if (e.target.closest('.fin-row')) return;
  _closeCtxMenu();
}

// ─── MODAL CALENDÁRIO ────────────────────────────────────
const _FIN_CAL_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                         'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const _FIN_CAL_WEEKS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function _openCalModal() {
  _finCalDate = new Date();
  _renderCalendar();
  document.getElementById('finCalOverlay').classList.add('visible');
}

function _closeCalModal() {
  document.getElementById('finCalOverlay').classList.remove('visible');
}

function _renderCalendar() {
  const year  = _finCalDate.getFullYear();
  const month = _finCalDate.getMonth();

  document.getElementById('finCalMonthLabel').textContent =
    `${_FIN_CAL_MONTHS[month]} ${year}`;

  const firstWeekDay = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();

  const dayMap = {};
  _finData.forEach(cat => {
    (cat.infoParcelas || []).forEach((p, i) => {
      if (!p.dataPrevista) return;
      const dt = _parsePtDate(p.dataPrevista);
      if (!dt || dt.getFullYear() !== year || dt.getMonth() !== month) return;
      const d = dt.getDate();
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push({ cat, idx: i, parcela: p });
    });
  });

  const today = new Date();
  const headers = _FIN_CAL_WEEKS
    .map(d => `<div class="fin-cal-day-header">${d}</div>`).join('');

  let cells = '';
  for (let i = 0; i < firstWeekDay; i++) {
    cells += `<div class="fin-cal-cell fin-cal-cell--empty"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getFullYear() === year
                 && today.getMonth()    === month
                 && today.getDate()     === d;
    const cards = (dayMap[d] || []).map(item => {
      const paid  = item.parcela.status === 'efetuado';
      const label = `${item.cat.categoria} - Parcela ${item.idx + 1}`;
      return `<div class="fin-cal-card ${paid ? 'fin-cal-card--paid' : 'fin-cal-card--pending'}"
                   data-catid="${_finEsc(item.cat.id)}"
                   title="${_finEsc(label)}">${_finEsc(label)}</div>`;
    }).join('');

    cells += `<div class="fin-cal-cell${isToday ? ' fin-cal-cell--today' : ''}">
      <span class="fin-cal-day-num">${d}</span>
      <div class="fin-cal-cards">${cards}</div>
    </div>`;
  }

  document.getElementById('finCalBody').innerHTML =
    `<div class="fin-cal-grid">${headers}${cells}</div>`;

  document.getElementById('finCalBody').querySelectorAll('.fin-cal-card').forEach(card => {
    card.addEventListener('click', e => {
      e.stopPropagation();
      _closeCalModal();
      _openDetailModal(card.dataset.catid);
    });
  });
}

// ─── MODAL LISTA DE PARCELAS ─────────────────────────────
let _finParcelasOrder = 'data';

function _openParcelasModal() {
  _finParcelasOrder = 'data';
  _renderParcelasTable();
  document.getElementById('finParcelasOverlay').classList.add('visible');
}

function _closeParcelasModal() {
  document.getElementById('finParcelasOverlay').classList.remove('visible');
}

function _renderParcelasTable() {
  const rows = [];
  _finData.forEach(cat => {
    (cat.infoParcelas || []).forEach((p, i) => {
      rows.push({
        catNome:      cat.categoria || '',
        catCor:       cat.cor || '#6e6f78',
        parcelaNum:   i + 1,
        dataPrevista: p.dataPrevista || '',
        dateParsed:   _parsePtDate(p.dataPrevista),
      });
    });
  });

  if (_finParcelasOrder === 'data') {
    rows.sort((a, b) => {
      if (!a.dateParsed && !b.dateParsed) return 0;
      if (!a.dateParsed) return 1;
      if (!b.dateParsed) return -1;
      return a.dateParsed - b.dateParsed;
    });
  } else {
    rows.sort((a, b) => {
      const cmp = a.catNome.localeCompare(b.catNome, 'pt-BR');
      return cmp !== 0 ? cmp : a.parcelaNum - b.parcelaNum;
    });
  }

  const btnAlfa = document.getElementById('finSortAlfa');
  const btnData = document.getElementById('finSortData');
  btnAlfa.classList.toggle('fin-sort-btn--active', _finParcelasOrder === 'alfa');
  btnData.classList.toggle('fin-sort-btn--active', _finParcelasOrder === 'data');

  const tbody = document.getElementById('finParcelasTbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:var(--text3);">Nenhuma parcela cadastrada.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <span style="display:inline-flex;align-items:center;gap:7px;">
          <span style="width:8px;height:8px;border-radius:2px;background:${_finEsc(r.catCor)};flex-shrink:0;display:inline-block;"></span>
          ${_finEsc(r.catNome)}
        </span>
      </td>
      <td>Parcela ${String(r.parcelaNum).padStart(2, '0')}</td>
      <td>${_finEsc(r.dataPrevista) || '—'}</td>
    </tr>`).join('');
}
