import { adminUsers, adminSuspendUser, adminUnsuspendUser, adminPromoteUser } from '../../api.js';
import { isAdmin, getUser } from '../../state.js';
import { navigate } from '../../router.js';
import { toastOk, toastError } from '../../components/toast.js';
import { confirmDialog } from '../../components/modal.js';
import { _renderAdminNav } from './dashboard.js';
import { debounce } from '../../utils/debounce.js';

export async function adminUsersPage() {
  if (!isAdmin()) { navigate('/admin/login'); return document.createElement('div'); }

  const root = document.createElement('div');
  root.className = 'admin-layout';
  _renderAdminNav(root, 'users');

  const main = document.createElement('main');
  main.className = 'admin-main';

  const header = document.createElement('div');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Usuários';
  header.appendChild(h1);
  main.appendChild(header);

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'form-input';
  searchInput.placeholder = 'Buscar por nome ou e-mail…';
  filterBar.appendChild(searchInput);

  const statusSelect = document.createElement('select');
  statusSelect.className = 'form-select';
  for (const [val, label] of [['', 'Todos'], ['active', 'Ativos'], ['suspended', 'Suspensos']]) {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    statusSelect.appendChild(opt);
  }
  filterBar.appendChild(statusSelect);
  main.appendChild(filterBar);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  main.appendChild(tableWrap);

  const pagination = document.createElement('div');
  pagination.className = 'pagination';
  main.appendChild(pagination);

  root.appendChild(main);

  let page = 1;
  let query = '';
  let filterStatus = '';
  const me = getUser();

  async function load() {
    tableWrap.replaceChildren();
    const loadMsg = document.createElement('p');
    loadMsg.className = 'text-muted';
    loadMsg.textContent = 'Carregando…';
    tableWrap.appendChild(loadMsg);

    try {
      const data = await adminUsers({ page, search: query, status: filterStatus });
      tableWrap.replaceChildren();
      pagination.replaceChildren();

      if (!data?.items?.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted';
        empty.textContent = 'Nenhum usuário encontrado.';
        tableWrap.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'data-table';
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      for (const col of ['Usuário', 'E-mail', 'Papel', 'Status', 'Avaliações', 'Ações']) {
        const th = document.createElement('th');
        th.textContent = col;
        trh.appendChild(th);
      }
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const user of data.items) {
        const isSelf = me?.id === user.id;
        const tr = document.createElement('tr');
        const tdUser = document.createElement('td');
        const uLink = document.createElement('a');
        uLink.href = `/perfil/${user.username}`;
        uLink.textContent = user.username;
        tdUser.appendChild(uLink);
        const tdEmail = document.createElement('td');
        tdEmail.textContent = user.email;
        const tdRole = document.createElement('td');
        const roleBadge = document.createElement('span');
        roleBadge.className = `badge ${user.role === 'admin' ? 'badge-amber' : 'badge-muted'}`;
        roleBadge.textContent = user.role;
        tdRole.appendChild(roleBadge);
        const tdStatus = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge ${user.status === 'active' ? 'badge-success' : 'badge-danger'}`;
        statusBadge.textContent = user.status === 'active' ? 'Ativo' : 'Suspenso';
        tdStatus.appendChild(statusBadge);
        const tdReviews = document.createElement('td');
        tdReviews.textContent = user.review_count || 0;
        const tdActs = document.createElement('td');

        if (!isSelf) {
          if (user.status === 'active') {
            const suspBtn = document.createElement('button');
            suspBtn.className = 'btn btn-danger btn-sm';
            suspBtn.textContent = 'Suspender';
            suspBtn.addEventListener('click', () => {
              confirmDialog(`Suspender @${user.username}?`, async () => {
                try {
                  await adminSuspendUser(user.id);
                  toastOk(`@${user.username} suspenso.`);
                  await load();
                } catch (e) { toastError(e.message); }
              }, { title: 'Confirmar suspensão', danger: true, confirmLabel: 'Suspender' });
            });
            tdActs.appendChild(suspBtn);
          }

          const unsuspBtn = document.createElement('button');
          unsuspBtn.className = 'btn btn-ghost btn-sm';
          unsuspBtn.textContent = 'Reativar';
          unsuspBtn.style.display = user.status === 'active' ? 'none' : '';
          unsuspBtn.addEventListener('click', async () => {
            try {
              await adminUnsuspendUser(user.id);
              toastOk(`@${user.username} reativado.`);
              await load();
            } catch (e) { toastError(e.message); }
          });
          tdActs.appendChild(unsuspBtn);

          if (user.role === 'user') {
            const promBtn = document.createElement('button');
            promBtn.className = 'btn btn-ghost btn-sm';
            promBtn.textContent = 'Promover admin';
            promBtn.addEventListener('click', () => {
              confirmDialog(`Promover @${user.username} a admin?`, async () => {
                try {
                  await adminPromoteUser(user.id);
                  toastOk(`@${user.username} é admin agora.`);
                  await load();
                } catch (e) { toastError(e.message); }
              }, { title: 'Promover a admin', confirmLabel: 'Promover' });
            });
            tdActs.appendChild(promBtn);
          }
        } else {
          tdActs.textContent = '(você)';
        }

        tr.append(tdUser, tdEmail, tdRole, tdStatus, tdReviews, tdActs);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);

      // Pagination
      const total = data.total_pages || 1;
      if (total > 1) {
        if (page > 1) {
          const prev = document.createElement('button');
          prev.className = 'btn btn-ghost btn-sm';
          prev.textContent = '← Anterior';
          prev.addEventListener('click', () => { page--; load(); });
          pagination.appendChild(prev);
        }
        const info = document.createElement('span');
        info.className = 'pagination-info';
        info.textContent = `Página ${page} de ${total}`;
        pagination.appendChild(info);
        if (page < total) {
          const next = document.createElement('button');
          next.className = 'btn btn-ghost btn-sm';
          next.textContent = 'Próxima →';
          next.addEventListener('click', () => { page++; load(); });
          pagination.appendChild(next);
        }
      }
    } catch (e) {
      tableWrap.replaceChildren();
      const errEl = document.createElement('p');
      errEl.className = 'text-muted';
      errEl.textContent = `Erro: ${e.message}`;
      tableWrap.appendChild(errEl);
    }
  }

  const debouncedSearch = debounce((q) => { query = q; page = 1; load(); }, 400);
  searchInput.addEventListener('input', () => debouncedSearch(searchInput.value));
  statusSelect.addEventListener('change', () => { filterStatus = statusSelect.value; page = 1; load(); });
  load();

  return root;
}
