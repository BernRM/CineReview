import { authMe, updateProfile, changePassword } from '../api.js';
import { getUser, setUser, isLoggedIn } from '../state.js';
import { navigate } from '../router.js';
import { toastOk, toastError } from '../components/toast.js';

export async function settingsPage() {
  if (!isLoggedIn()) { navigate('/login'); return document.createElement('div'); }

  const root = document.createElement('div');
  root.className = 'container page settings-page';

  const header = document.createElement('div');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Configurações';
  header.appendChild(h1);
  root.appendChild(header);

  const tabs = document.createElement('nav');
  tabs.className = 'settings-nav';
  tabs.setAttribute('aria-label', 'Seções de configurações');

  const content = document.createElement('div');
  content.className = 'settings-content';

  const sections = [
    { id: 'profile', label: 'Perfil' },
    { id: 'password', label: 'Senha' },
  ];

  let activeSection = 'profile';

  function showSection(id) {
    activeSection = id;
    content.replaceChildren();
    tabs.querySelectorAll('.settings-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.section === id);
      t.setAttribute('aria-selected', String(t.dataset.section === id));
    });
    if (id === 'profile') content.appendChild(_profileSection());
    if (id === 'password') content.appendChild(_passwordSection());
  }

  tabs.replaceChildren();
  for (const s of sections) {
    const btn = document.createElement('button');
    btn.className = 'settings-tab';
    btn.dataset.section = s.id;
    btn.textContent = s.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(s.id === activeSection));
    btn.addEventListener('click', () => showSection(s.id));
    tabs.appendChild(btn);
  }

  root.append(tabs, content);
  showSection('profile');

  return root;
}

function _profileSection() {
  const user = getUser();
  const wrap = document.createElement('div');
  wrap.className = 'panel';

  const h2 = document.createElement('h2');
  h2.className = 'panel-title';
  h2.textContent = 'Informações do perfil';
  wrap.appendChild(h2);

  const form = document.createElement('form');
  form.className = 'stack';

  const nameGroup = document.createElement('div');
  nameGroup.className = 'form-group';
  const nameLbl = document.createElement('label');
  nameLbl.className = 'form-label';
  nameLbl.htmlFor = 'display-name';
  nameLbl.textContent = 'Nome de exibição';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'display-name';
  nameInput.className = 'form-input';
  nameInput.maxLength = 100;
  nameInput.value = user?.name || '';
  nameGroup.append(nameLbl, nameInput);

  const bioGroup = document.createElement('div');
  bioGroup.className = 'form-group';
  const bioLbl = document.createElement('label');
  bioLbl.className = 'form-label';
  bioLbl.htmlFor = 'bio';
  bioLbl.textContent = 'Bio (opcional)';
  const bioInput = document.createElement('textarea');
  bioInput.id = 'bio';
  bioInput.className = 'form-textarea';
  bioInput.maxLength = 500;
  bioInput.rows = 3;
  bioInput.placeholder = 'Conte um pouco sobre você e seu gosto cinematográfico…';
  bioInput.value = user?.bio || '';
  bioGroup.append(bioLbl, bioInput);

  const errEl = document.createElement('p');
  errEl.className = 'form-error';
  errEl.setAttribute('aria-live', 'polite');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = 'Salvar alterações';

  form.append(nameGroup, bioGroup, errEl, submitBtn);
  wrap.appendChild(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando…';
    try {
      const updated = await updateProfile({
        name: nameInput.value.trim() || null,
        bio: bioInput.value.trim() || null,
      });
      setUser({ ...getUser(), ...updated });
      toastOk('Perfil atualizado!');
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Salvar alterações';
    }
  });

  return wrap;
}

function _passwordSection() {
  const wrap = document.createElement('div');
  wrap.className = 'panel';

  const h2 = document.createElement('h2');
  h2.className = 'panel-title';
  h2.textContent = 'Alterar senha';
  wrap.appendChild(h2);

  const form = document.createElement('form');
  form.className = 'stack';

  const currentGroup = _passField('current-pass', 'Senha atual', 'current-password');
  const currentInput = currentGroup.querySelector('input');
  const newGroup = _passField('new-pass', 'Nova senha', 'new-password');
  const newInput = newGroup.querySelector('input');
  const confirmGroup = _passField('confirm-pass', 'Confirmar nova senha', 'new-password');
  const confirmInput = confirmGroup.querySelector('input');

  const errEl = document.createElement('p');
  errEl.className = 'form-error';
  errEl.setAttribute('aria-live', 'polite');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = 'Alterar senha';

  form.append(currentGroup, newGroup, confirmGroup, errEl, submitBtn);
  wrap.appendChild(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const current = currentInput.value;
    const newPwd = newInput.value;
    const confirm = confirmInput.value;
    if (!current || !newPwd || !confirm) { errEl.textContent = 'Preencha todos os campos.'; return; }
    if (newPwd.length < 8) { errEl.textContent = 'Nova senha deve ter ao menos 8 caracteres.'; return; }
    if (newPwd !== confirm) { errEl.textContent = 'As senhas não coincidem.'; return; }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Alterando…';
    try {
      await changePassword(current, newPwd);
      toastOk('Senha alterada! Faça login novamente.');
      setUser(null);
      navigate('/login');
    } catch (err) {
      errEl.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Alterar senha';
    }
  });

  return wrap;
}

function _passField(id, label, autocomplete) {
  const group = document.createElement('div');
  group.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.className = 'form-label';
  lbl.htmlFor = id;
  lbl.textContent = label;
  const inp = document.createElement('input');
  inp.type = 'password';
  inp.id = id;
  inp.className = 'form-input';
  inp.autocomplete = autocomplete;
  inp.required = true;
  group.append(lbl, inp);
  return group;
}
