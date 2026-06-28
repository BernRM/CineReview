import { authLogin, authMe } from '../api.js';
import { setUser } from '../state.js';
import { toastError } from '../components/toast.js';
import { navigate } from '../router.js';

export function loginPage() {
  const root = document.createElement('div');
  root.className = 'auth-page';

  // Left decorative panel
  const deco = document.createElement('div');
  deco.className = 'auth-deco';
  deco.setAttribute('aria-hidden', 'true');
  const decoTitle = document.createElement('div');
  decoTitle.className = 'auth-deco-title display';
  decoTitle.textContent = 'CineView';
  const decoTag = document.createElement('div');
  decoTag.className = 'auth-deco-tag';
  decoTag.textContent = 'Sua crítica, seu cinema.';
  deco.append(decoTitle, decoTag);

  // Form panel
  const panel = document.createElement('div');
  panel.className = 'auth-panel';

  const h1 = document.createElement('h1');
  h1.className = 'auth-title';
  h1.textContent = 'Entrar';

  const subtitle = document.createElement('p');
  subtitle.className = 'auth-subtitle';
  subtitle.textContent = 'Acesse sua conta para continuar no CineView.';

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.noValidate = true;

  // Email field
  const emailGroup = _field('email', 'email', 'E-mail', 'seu@email.com');
  const emailInput = emailGroup.querySelector('input');

  // Password field
  const passGroup = _field('password', 'password', 'Senha', '');
  const passInput = passGroup.querySelector('input');

  const errEl = document.createElement('p');
  errEl.className = 'form-error';
  errEl.setAttribute('aria-live', 'assertive');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-block';
  submitBtn.textContent = 'Entrar';

  const register = document.createElement('p');
  register.className = 'auth-alt';
  register.textContent = 'Não tem conta? ';
  const regLink = document.createElement('a');
  regLink.href = '/cadastro';
  regLink.textContent = 'Cadastre-se';
  register.appendChild(regLink);

  form.append(emailGroup, passGroup, errEl, submitBtn, register);
  const demoAccess = document.createElement('aside');
  demoAccess.className = 'demo-access';
  const demoHeader = document.createElement('div');
  demoHeader.className = 'demo-access-header';
  const demoLabel = document.createElement('strong');
  demoLabel.textContent = 'Acessos para apresentação';
  const demoHint = document.createElement('span');
  demoHint.textContent = 'Clique em uma conta para preencher o formulário.';
  demoHeader.append(demoLabel, demoHint);

  const demoAccounts = document.createElement('div');
  demoAccounts.className = 'demo-accounts';
  demoAccounts.append(
    _demoAccount('Usuário', 'usuario@cineview.local', 'CineView@User2026', 'user'),
    _demoAccount('Administrador', 'admin@cineview.local', 'CineView@Admin2026', 'admin'),
  );
  demoAccess.append(demoHeader, demoAccounts);

  panel.append(h1, subtitle, form, demoAccess);
  root.append(deco, panel);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      errEl.textContent = 'Preencha e-mail e senha.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando…';

    try {
      await authLogin(email, password);
      const me = await authMe();
      setUser(me);
      navigate('/');
    } catch (err) {
      errEl.textContent = err.message === 'Unauthorized' ? 'E-mail ou senha incorretos.' : err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  });

  function _demoAccount(label, email, password, type) {
    const account = document.createElement('button');
    account.type = 'button';
    account.className = `demo-account demo-account-${type}`;
    account.setAttribute('aria-label', `Usar conta de ${label}`);

    const role = document.createElement('span');
    role.className = 'demo-account-role';
    role.textContent = label;
    const credentials = document.createElement('span');
    credentials.className = 'demo-account-credentials';
    credentials.textContent = `${email} · ${password}`;
    account.append(role, credentials);

    account.addEventListener('click', () => {
      emailInput.value = email;
      passInput.value = password;
      errEl.textContent = '';
      submitBtn.focus();
    });
    return account;
  }

  return root;
}

function _field(id, type, label, placeholder) {
  const group = document.createElement('div');
  group.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.className = 'form-label';
  lbl.htmlFor = id;
  lbl.textContent = label;
  const inp = document.createElement('input');
  inp.type = type;
  inp.id = id;
  inp.className = 'form-input';
  inp.placeholder = placeholder;
  inp.required = true;
  if (type === 'email') inp.autocomplete = 'email';
  if (type === 'password') inp.autocomplete = 'current-password';
  group.append(lbl, inp);
  return group;
}
