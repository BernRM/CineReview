import { isLoggedIn, isAdmin, on, getUser } from '../state.js';
import { navigate } from '../router.js';
import { authLogout } from '../api.js';
import { toastOk, toastError } from './toast.js';

export function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;

  el.className = 'site-header';
  el.replaceChildren(); // Clear without innerHTML

  const container = document.createElement('div');
  container.className = 'container';

  // Logo
  const logo = document.createElement('a');
  logo.className = 'logo';
  logo.href = '/';
  logo.setAttribute('aria-label', 'CineView — início');
  const logoImg = document.createElement('img');
  logoImg.src = '/assets/cinereview-logo.svg';
  logoImg.alt = '';
  logoImg.setAttribute('aria-hidden', 'true');
  const logoText = document.createElement('span');
  logoText.textContent = 'CineView';
  logo.append(logoImg, logoText);

  // Nav links
  const nav = document.createElement('nav');
  nav.className = 'nav-links';
  nav.setAttribute('aria-label', 'Principal');
  const links = [
    { label: 'Início',    href: '/' },
    { label: 'Explorar', href: '/explorar' },
    { label: 'Buscar',   href: '/buscar' },
  ];
  for (const { label, href } of links) {
    const a = document.createElement('a');
    a.className = 'nav-link';
    a.href = href;
    a.textContent = label;
    if (location.pathname === href || (href !== '/' && location.pathname.startsWith(href))) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
    nav.appendChild(a);
  }

  // Search
  const searchWrap = document.createElement('div');
  searchWrap.className = 'header-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Buscar filmes…';
  searchInput.setAttribute('aria-label', 'Buscar filmes');
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && searchInput.value.trim().length >= 2) {
      navigate(`/buscar?q=${encodeURIComponent(searchInput.value.trim())}`);
    }
  });
  searchWrap.appendChild(searchInput);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'header-actions';
  actions.id = 'header-actions';

  // Hamburger (mobile)
  const menuBtn = document.createElement('button');
  menuBtn.className = 'menu-toggle';
  menuBtn.setAttribute('aria-label', 'Menu');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.textContent = '☰';
  menuBtn.addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    const open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  container.append(logo, nav, searchWrap, actions, menuBtn);
  el.appendChild(container);

  _updateAuthActions(actions);
  on('auth', () => _updateAuthActions(actions));
}

function _updateAuthActions(actions) {
  actions.replaceChildren();
  const user = getUser();

  if (!user) {
    const login = document.createElement('a');
    login.className = 'btn btn-ghost btn-sm';
    login.href = '/login';
    login.textContent = 'Entrar';
    const reg = document.createElement('a');
    reg.className = 'btn btn-primary btn-sm';
    reg.href = '/cadastro';
    reg.textContent = 'Cadastrar';
    actions.append(login, reg);
  } else {
    if (isAdmin()) {
      const adminLink = document.createElement('a');
      adminLink.className = 'btn btn-ghost btn-sm';
      adminLink.href = '/admin';
      adminLink.textContent = 'Admin';
      actions.appendChild(adminLink);
    }
    const profileLink = document.createElement('a');
    profileLink.className = 'btn btn-ghost btn-sm';
    profileLink.href = `/perfil/${user.username}`;
    profileLink.textContent = user.name || user.username;
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-ghost btn-sm';
    logoutBtn.textContent = 'Sair';
    logoutBtn.addEventListener('click', async () => {
      try {
        await authLogout();
        const { setUser } = await import('../state.js');
        setUser(null);
        toastOk('Sessão encerrada.');
        navigate('/');
      } catch { toastError('Erro ao sair.'); }
    });
    actions.append(profileLink, logoutBtn);
  }

  // Sync mobile menu
  _renderMobileMenu();
}

function _renderMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (!menu) return;
  menu.replaceChildren();
  const user = getUser();
  const links = [
    { label: 'Início',    href: '/' },
    { label: 'Explorar', href: '/explorar' },
    { label: 'Buscar',   href: '/buscar' },
  ];
  if (user) {
    links.push({ label: 'Minha lista', href: '/minha-lista' });
    links.push({ label: 'Assistidos', href: '/assistidos' });
    links.push({ label: 'Perfil', href: `/perfil/${user.username}` });
    links.push({ label: 'Configurações', href: '/configuracoes' });
    if (isAdmin()) links.push({ label: 'Painel Admin', href: '/admin' });
  } else {
    links.push({ label: 'Entrar', href: '/login' });
    links.push({ label: 'Cadastrar', href: '/cadastro' });
  }
  for (const { label, href } of links) {
    const a = document.createElement('a');
    a.className = 'mobile-nav-link';
    a.href = href;
    a.textContent = label;
    a.addEventListener('click', () => menu.classList.remove('open'));
    menu.appendChild(a);
  }
}
