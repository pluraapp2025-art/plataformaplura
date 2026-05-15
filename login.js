const ICON_DARK  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const ICON_LIGHT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const EYE_OPEN   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

/* ─── FIREBASE ──────────────────────────────────────────── */
const _LOGIN_CONFIG = {
  apiKey: "AIzaSyBsU21aZjTUqdCvu8rNQGLXEVFVRgmG9dI",
  authDomain: "plura-249ba.firebaseapp.com",
  projectId: "plura-249ba",
  storageBucket: "plura-249ba.firebasestorage.app",
  messagingSenderId: "212726352993",
  appId: "1:212726352993:web:46683ca58ad37686ff6e20"
};

if (!firebase.apps.length) firebase.initializeApp(_LOGIN_CONFIG);
const _loginDb = firebase.firestore();

/* ─── TEMA ─────────────────────────────────────────────── */
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
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
});

/* ─── VISUALIZAR SENHA ──────────────────────────────────── */
const passwordInput  = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
togglePassword.innerHTML = EYE_OPEN;

togglePassword.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  togglePassword.innerHTML = isHidden ? EYE_CLOSED : EYE_OPEN;
});

/* ─── LOGIN ─────────────────────────────────────────────── */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  const email     = document.getElementById('email').value.trim();
  const password  = document.getElementById('password').value;
  const errorMsg  = document.getElementById('errorMsg');
  const submitBtn = e.target.querySelector('.btn-login');

  errorMsg.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Entrando...';

  try {
    // Consulta a coleção "perfil" pelo e-mail informado
    const snap = await _loginDb.collection('perfil')
      .where('email', '==', email)
      .limit(1)
      .get();

    let autenticado = false;
    let perfilData  = null;

    if (!snap.empty) {
      perfilData  = snap.docs[0].data();
      autenticado = perfilData.senha === password;
    }

    if (autenticado) {
      localStorage.setItem('plura-user-email', email);
      localStorage.setItem('plura-user-nome',  perfilData.nome  || '');
      localStorage.setItem('plura-user-cargo', perfilData.cargo || '');
      window.location.href = 'Areas/homePage.html';
    } else {
      errorMsg.textContent = 'E-mail ou senha incorretos. Tente novamente.';
      errorMsg.style.display = 'block';
    }

  } catch (err) {
    console.error('[login] Erro ao consultar banco de dados:', err);
    errorMsg.textContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
    errorMsg.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }
});

['email', 'password'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    document.getElementById('errorMsg').style.display = 'none';
  });
});

/* ─── RECUPERAR SENHA ───────────────────────────────────── */
document.getElementById('recoverLink').addEventListener('click', e => {
  e.preventDefault();
  alert('Para recuperar sua senha, entre em contato com o administrador do sistema.\n\nE-mail: marcos.lucas.ti@gmail.com');
});

/* ─── AJUDA ─────────────────────────────────────────────── */
document.getElementById('helpLink').addEventListener('click', e => {
  e.preventDefault();
  alert('Suporte técnico — PLURA INOVA SIMPLES\n\nE-mail: marcos.lucas.ti@gmail.com\nCNPJ: 64.988.404/0001-18 · Maceió, AL');
});
