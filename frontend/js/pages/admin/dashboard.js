import { adminStats } from '../../api.js';
import { isAdmin } from '../../state.js';
import { navigate } from '../../router.js';

export async function adminDashboard() {
  if (!isAdmin()) { navigate('/admin/login'); return document.createElement('div'); }

  const root = document.createElement('div');
  root.className = 'admin-layout';

  _renderAdminNav(root, 'dashboard');

  const main = document.createElement('main');
  main.className = 'admin-main';

  const header = document.createElement('div');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Dashboard';
  header.appendChild(h1);
  main.appendChild(header);

  const loading = document.createElement('div');
  loading.className = 'loading-center';
  const spin = document.createElement('div');
  spin.className = 'spinner';
  loading.appendChild(spin);
  main.appendChild(loading);

  try {
    const stats = await adminStats();
    main.removeChild(loading);

    const cards = document.createElement('div');
    cards.className = 'admin-stat-cards';

    const metrics = [
      { label: 'Usuários', value: stats.total_users || 0, icon: '👥', link: '/admin/usuarios' },
      { label: 'Filmes', value: stats.total_movies || 0, icon: '🎬', link: '/admin/filmes' },
      { label: 'Avaliações', value: stats.total_reviews || 0, icon: '⭐', link: '/admin/moderacao' },
      { label: 'Reportes abertos', value: stats.open_reports || 0, icon: '🚩', link: '/admin/moderacao' },
    ];

    for (const m of metrics) {
      const card = document.createElement('a');
      card.href = m.link;
      card.className = 'admin-stat-card';
      const icon = document.createElement('div');
      icon.className = 'admin-stat-icon';
      icon.textContent = m.icon;
      icon.setAttribute('aria-hidden', 'true');
      const val = document.createElement('div');
      val.className = 'admin-stat-value';
      val.textContent = Number(m.value).toLocaleString('pt-BR');
      const lbl = document.createElement('div');
      lbl.className = 'admin-stat-label';
      lbl.textContent = m.label;
      card.append(icon, val, lbl);
      cards.appendChild(card);
    }

    main.appendChild(cards);

    // Recent activity
    if (stats.recent_activity?.length) {
      const section = document.createElement('section');
      section.className = 'panel section';
      const sh2 = document.createElement('h2');
      sh2.className = 'panel-title';
      sh2.textContent = 'Atividade recente';
      section.appendChild(sh2);

      const table = document.createElement('table');
      table.className = 'data-table';
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      for (const col of ['Ação', 'Alvo', 'Admin', 'Data']) {
        const th = document.createElement('th');
        th.textContent = col;
        trh.appendChild(th);
      }
      thead.appendChild(trh);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for (const log of stats.recent_activity) {
        const tr = document.createElement('tr');
        const tdAction = document.createElement('td');
        tdAction.textContent = log.action;
        const tdTarget = document.createElement('td');
        tdTarget.textContent = log.target_type ? `${log.target_type} #${log.target_id}` : '—';
        const tdAdmin = document.createElement('td');
        tdAdmin.textContent = log.admin_username || '—';
        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(log.created_at).toLocaleString('pt-BR');
        tr.append(tdAction, tdTarget, tdAdmin, tdDate);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      section.appendChild(table);
      main.appendChild(section);
    }
  } catch (err) {
    main.removeChild(loading);
    const errEl = document.createElement('p');
    errEl.className = 'text-muted';
    errEl.textContent = `Erro ao carregar estatísticas: ${err.message}`;
    main.appendChild(errEl);
  }

  root.appendChild(main);
  return root;
}

export function _renderAdminNav(root, active) {
  const nav = document.createElement('nav');
  nav.className = 'admin-sidebar';
  nav.setAttribute('aria-label', 'Navegação admin');

  const brand = document.createElement('div');
  brand.className = 'admin-brand';
  const brandLink = document.createElement('a');
  brandLink.href = '/admin';
  brandLink.className = 'admin-brand-link';
  brandLink.textContent = 'CineView Admin';
  brand.appendChild(brandLink);
  nav.appendChild(brand);

  const links = [
    { href: '/admin', label: 'Dashboard', id: 'dashboard' },
    { href: '/admin/filmes', label: 'Filmes', id: 'movies' },
    { href: '/admin/usuarios', label: 'Usuários', id: 'users' },
    { href: '/admin/moderacao', label: 'Moderação', id: 'moderation' },
    { href: '/', label: '← Voltar ao site', id: 'back' },
  ];

  for (const l of links) {
    const a = document.createElement('a');
    a.href = l.href;
    a.className = `admin-nav-link${l.id === active ? ' active' : ''}`;
    a.textContent = l.label;
    if (l.id === active) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  }

  root.appendChild(nav);
}
