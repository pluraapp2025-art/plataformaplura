/* perfil.js — Gerenciamento de perfis de usuário */

const _PERFIL_CONFIG = {
  apiKey: "AIzaSyBsU21aZjTUqdCvu8rNQGLXEVFVRgmG9dI",
  authDomain: "plura-249ba.firebaseapp.com",
  projectId: "plura-249ba",
  storageBucket: "plura-249ba.firebasestorage.app",
  messagingSenderId: "212726352993",
  appId: "1:212726352993:web:46683ca58ad37686ff6e20"
};

if (!firebase.apps.length) firebase.initializeApp(_PERFIL_CONFIG);
const _db = firebase.firestore();

// ─── ESTADO ────────────────────────────────────────────
let _currentNivel = null;
let _perfis = [];

const _TRASH_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14H6L5 6"/>
  <path d="M10 11v6"/><path d="M14 11v6"/>
  <path d="M9 6V4h6v2"/>
</svg>`;

// ─── USUÁRIO ATUAL ─────────────────────────────────────
async function _loadCurrentUser() {
  const email = localStorage.getItem('plura-user-email') || '';
  if (!email) { _currentNivel = 'A'; return; }

  try {
    const snap = await _db.collection('perfil').where('email', '==', email).limit(1).get();
    _currentNivel = snap.empty ? 'A' : (snap.docs[0].data().nivel || 'A');
  } catch (err) {
    console.warn('[perfil] Não foi possível carregar nível do usuário:', err);
    _currentNivel = 'A';
  }
}

// ─── MODAL ─────────────────────────────────────────────
async function _openModal() {
  document.getElementById('perfilOverlay').classList.add('visible');
  await _loadCurrentUser();
  document.getElementById('perfilAddBtn').style.display = _currentNivel === 'A' ? 'flex' : 'none';
  _showListView();
  await _loadPerfis();
}

function _closeModal() {
  document.getElementById('perfilOverlay').classList.remove('visible');
}

// ─── ALTERNÂNCIA DE VISÃO ──────────────────────────────
function _showListView() {
  document.getElementById('perfilListView').hidden = false;
  document.getElementById('perfilFormView').hidden = true;
}

function _showFormView() {
  document.getElementById('perfilListView').hidden = true;
  document.getElementById('perfilFormView').hidden = false;
  document.getElementById('perfilForm').reset();
  _toggleAreasField();
}

// ─── CARREGAR PERFIS ───────────────────────────────────
async function _loadPerfis() {
  const list = document.getElementById('perfilList');
  list.innerHTML = '<div class="perfil-loading">Carregando perfis...</div>';

  try {
    const snap = await _db.collection('perfil').orderBy('nome').get();
    _perfis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _renderPerfis();
  } catch (err) {
    console.error('[perfil] Erro ao carregar perfis:', err);
    list.innerHTML = '<div class="perfil-empty">Erro ao carregar perfis. Verifique a conexão.</div>';
  }
}

// ─── RENDERIZAR LISTA ──────────────────────────────────
function _renderPerfis() {
  const list = document.getElementById('perfilList');

  if (_perfis.length === 0) {
    list.innerHTML = '<div class="perfil-empty">Nenhum perfil cadastrado.</div>';
    return;
  }

  list.innerHTML = _perfis.map(p => `
    <div class="perfil-card">
      <div class="perfil-card-info">
        <div class="perfil-card-nome">${_esc(p.nome)}</div>
        <div class="perfil-card-cargo">${_esc(p.cargo)}</div>
        <div class="perfil-card-email">${_esc(p.email)}</div>
        <span class="perfil-nivel-badge nivel-${(p.nivel || 'd').toLowerCase()}">Nível ${_esc(p.nivel)}</span>
      </div>
      <div class="perfil-card-actions">
        <button class="perfil-delete-btn" data-id="${p.id}" title="Excluir perfil">${_TRASH_ICON}</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.perfil-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => _handleDelete(btn.dataset.id));
  });
}

// ─── EXCLUIR PERFIL ────────────────────────────────────
async function _handleDelete(id) {
  if (_currentNivel !== 'A') {
    _showToast();
    return;
  }

  const p = _perfis.find(x => x.id === id);
  if (!confirm(`Excluir o perfil de "${p?.nome || 'este usuário'}"?\nEsta ação não pode ser desfeita.`)) return;

  const btn = document.querySelector(`.perfil-delete-btn[data-id="${id}"]`);
  if (btn) btn.disabled = true;

  try {
    await _db.collection('perfil').doc(id).delete();
    _perfis = _perfis.filter(x => x.id !== id);
    _renderPerfis();
  } catch (err) {
    console.error('[perfil] Erro ao excluir:', err);
    if (btn) btn.disabled = false;
    alert('Erro ao excluir o perfil. Tente novamente.');
  }
}

// ─── FORMULÁRIO DE CRIAÇÃO ─────────────────────────────
function _toggleAreasField() {
  const nivel = document.getElementById('perfilNivel').value;
  document.getElementById('perfilAreasGroup').style.display = nivel === 'D' ? 'block' : 'none';
}

async function _submitForm(e) {
  e.preventDefault();
  const form = document.getElementById('perfilForm');
  const fd   = new FormData(form);

  const data = {
    nome:  (fd.get('nome')  || '').trim(),
    cargo: (fd.get('cargo') || '').trim(),
    email: (fd.get('email') || '').trim(),
    senha: fd.get('senha')  || '',
    nivel: fd.get('nivel')  || 'C',
  };

  if (!data.nome || !data.email || !data.senha || !data.nivel) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  if (data.nivel === 'D') {
    data.areas = (fd.get('areas') || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  const submitBtn = document.getElementById('perfilSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    await _db.collection('perfil').add({
      ...data,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    _showListView();
    await _loadPerfis();
  } catch (err) {
    console.error('[perfil] Erro ao criar perfil:', err);
    alert('Erro ao criar perfil. Tente novamente.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Criar Perfil';
  }
}

// ─── TOAST DE PERMISSÃO ────────────────────────────────
let _toastTimer = null;

function _showToast() {
  const toast = document.getElementById('perfilToast');
  toast.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
}

// ─── UTILITÁRIO ────────────────────────────────────────
function _esc(s) {
  return String(s || '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── INICIALIZAÇÃO ─────────────────────────────────────
(function _initPerfil() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bind);
  } else {
    _bind();
  }

  function _bind() {
    document.getElementById('settingsBtn').addEventListener('click', _openModal);
    document.getElementById('perfilClose').addEventListener('click', _closeModal);
    document.getElementById('perfilOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('perfilOverlay')) _closeModal();
    });
    document.getElementById('perfilAddBtn').addEventListener('click', _showFormView);
    document.getElementById('perfilFormBack').addEventListener('click', _showListView);
    document.getElementById('perfilNivel').addEventListener('change', _toggleAreasField);
    document.getElementById('perfilForm').addEventListener('submit', _submitForm);
  }
})();
