import { authRegister, authMe } from '../api.js';
import { setUser } from '../state.js';
import { navigate } from '../router.js';

export function registerPage() {
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
  decoTag.textContent = 'Faça parte da comunidade.';
  deco.append(decoTitle, decoTag);

  // Form panel
  const panel = document.createElement('div');
  panel.className = 'auth-panel';

  const h1 = document.createElement('h1');
  h1.className = 'auth-title';
  h1.textContent = 'Criar conta';

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.noValidate = true;

  const usernameGroup = _field('username', 'text', 'Nome de usuário', 'ex: cinefilo_br');
  const usernameInput = usernameGroup.querySelector('input');
  const usernameHint = document.createElement('small');
  usernameHint.className = 'form-hint';
  usernameHint.textContent = '3–30 caracteres: letras, números, _ ou -';
  usernameGroup.appendChild(usernameHint);

  const emailGroup = _field('reg-email', 'email', 'E-mail', 'seu@email.com');
  const emailInput = emailGroup.querySelector('input');

  const passGroup = _field('reg-password', 'password', 'Senha', 'Mínimo 8 caracteres');
  const passInput = passGroup.querySelector('input');

  const pass2Group = _field('reg-password2', 'password', 'Confirmar senha', '');
  const pass2Input = pass2Group.querySelector('input');

  const errEl = document.createElement('p');
  errEl.className = 'form-error';
  errEl.setAttribute('aria-live', 'assertive');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-block';
  submitBtn.textContent = 'Criar conta';

  const loginAlt = document.createElement('p');
  loginAlt.className = 'auth-alt';
  loginAlt.textContent = 'Já tem conta? ';
  const loginLink = document.createElement('a');
  loginLink.href = '/login';
  loginLink.textContent = 'Entre aqui';
  loginAlt.appendChild(loginLink);

  form.append(usernameGroup, emailGroup, passGroup, pass2Group, errEl, submitBtn, loginAlt);
  panel.append(h1, form);
  root.append(deco, panel);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passInput.value;
    const password2 = pass2Input.value;

    if (!username || !email || !password) {
      errEl.textContent = 'Preencha todos os campos.';
      return;
    }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      errEl.textContent = 'Nome de usuário inválido (3–30 chars: letras, números, _ ou -)';
      return;
    }
    if (password.length < 8) {
      errEl.textContent = 'Senha deve ter ao menos 8 caracteres.';
      return;
    }
    if (password !== password2) {
      errEl.textContent = 'As senhas não coincidem.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta…';

    try {
      await authRegister(username, email, password);
      const me = await authMe();
      setUser(me);
      navigate('/');
    } catch (err) {
      errEl.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar conta';
    }
  });

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
  if (type === 'password') inp.autocomplete = 'new-password';
  group.append(lbl, inp);
  return group;
}
