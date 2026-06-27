import { authLogin, authLogout, authMe } from '../api.js';
import { setUser, isAdmin } from '../state.js';
import { navigate } from '../router.js';

export function adminLoginPage() {
  const root = document.createElement('div');
  root.className = 'admin-login-page';

  const card = document.createElement('div');
  card.className = 'admin-login-card';

  const lockIcon = document.createElement('div');
  lockIcon.className = 'admin-lock-icon';
  lockIcon.setAttribute('aria-hidden', 'true');
  lockIcon.textContent = '🔒';

  const h1 = document.createElement('h1');
  h1.className = 'admin-login-title';
  h1.textContent = 'Painel Administrativo';

  const sub = document.createElement('p');
  sub.className = 'text-muted text-sm';
  sub.textContent = 'Acesso restrito a administradores.';

  const form = document.createElement('form');
  form.className = 'stack';
  form.noValidate = true;

  const emailGroup = document.createElement('div');
  emailGroup.className = 'form-group';
  const emailLbl = document.createElement('label');
  emailLbl.className = 'form-label';
  emailLbl.htmlFor = 'admin-email';
  emailLbl.textContent = 'E-mail';
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'admin-email';
  emailInput.className = 'form-input';
  emailInput.autocomplete = 'email';
  emailInput.required = true;
  emailGroup.append(emailLbl, emailInput);

  const passGroup = document.createElement('div');
  passGroup.className = 'form-group';
  const passLbl = document.createElement('label');
  passLbl.className = 'form-label';
  passLbl.htmlFor = 'admin-password';
  passLbl.textContent = 'Senha';
  const passInput = document.createElement('input');
  passInput.type = 'password';
  passInput.id = 'admin-password';
  passInput.className = 'form-input';
  passInput.autocomplete = 'current-password';
  passInput.required = true;
  passGroup.append(passLbl, passInput);

  const errEl = document.createElement('p');
  errEl.className = 'form-error';
  errEl.setAttribute('aria-live', 'assertive');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-block';
  submitBtn.textContent = 'Entrar como Admin';

  const backLink = document.createElement('a');
  backLink.href = '/';
  backLink.className = 'btn btn-ghost btn-sm btn-block';
  backLink.style.marginTop = 'var(--sp-2)';
  backLink.textContent = '← Voltar ao site';

  form.append(emailGroup, passGroup, errEl, submitBtn, backLink);
  card.append(lockIcon, h1, sub, form);
  root.appendChild(card);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) { errEl.textContent = 'Preencha todos os campos.'; return; }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando…';
    try {
      await authLogin(email, password);
      const me = await authMe();
      if (me.role !== 'admin') {
        await authLogout();
        errEl.textContent = 'Acesso negado: conta sem privilégios de administrador.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar como Admin';
        return;
      }
      setUser(me);
      navigate('/admin');
    } catch (err) {
      errEl.textContent = err.status === 401 ? 'Credenciais inválidas.' : err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar como Admin';
    }
  });

  return root;
}
