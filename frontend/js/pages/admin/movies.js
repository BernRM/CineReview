import {
  adminMovies, adminUpdateMovie, catalogSearch,
  toggleFeatured, syncMovie,
} from '../../api.js';
import { isAdmin } from '../../state.js';
import { navigate } from '../../router.js';
import { toastOk, toastError } from '../../components/toast.js';
import { openModal } from '../../components/modal.js';
import { _renderAdminNav } from './dashboard.js';
import { debounce } from '../../utils/debounce.js';

export async function adminMoviesPage() {
  if (!isAdmin()) { navigate('/admin/login'); return document.createElement('div'); }

  const root = document.createElement('div');
  root.className = 'admin-layout';
  _renderAdminNav(root, 'movies');

  const main = document.createElement('main');
  main.className = 'admin-main';

  const header = document.createElement('div');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Filmes';

  const importBtn = document.createElement('button');
  importBtn.className = 'btn btn-primary btn-sm';
  importBtn.textContent = '+ Importar do TMDB';
  importBtn.addEventListener('click', () => _openImportModal(load));
  header.append(h1, importBtn);
  main.appendChild(header);

  // Search + filter
  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'form-input';
  searchInput.placeholder = 'Buscar filmes cadastrados…';
  searchInput.setAttribute('aria-label', 'Buscar filmes');
  filterBar.appendChild(searchInput);
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

  async function load() {
    tableWrap.replaceChildren();
    const loadMsg = document.createElement('p');
    loadMsg.className = 'text-muted';
    loadMsg.textContent = 'Carregando…';
    tableWrap.appendChild(loadMsg);

    try {
      const data = await adminMovies({ page, search: query });
      tableWrap.replaceChildren();
      pagination.replaceChildren();

      if (!data?.items?.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted';
        empty.textContent = 'Nenhum filme encontrado.';
        tableWrap.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'data-table';
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      for (const col of ['Título', 'Ano', 'Avaliações', 'Destaque', 'Ações']) {
        const th = document.createElement('th');
        th.textContent = col;
        trh.appendChild(th);
      }
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const movie of data.items) {
        const tr = document.createElement('tr');
        const tdTitle = document.createElement('td');
        const link = document.createElement('a');
        link.href = movie.tmdb_id ? `/filme/${movie.tmdb_id}` : `/filme/local/${movie.id}`;
        link.textContent = movie.title;
        tdTitle.appendChild(link);
        const tdYear = document.createElement('td');
        tdYear.textContent = movie.release_date ? new Date(movie.release_date).getFullYear() : '—';
        const tdReviews = document.createElement('td');
        tdReviews.textContent = movie.review_count || 0;
        const tdFeat = document.createElement('td');
        const featBadge = document.createElement('span');
        featBadge.className = `badge ${movie.is_featured ? 'badge-success' : 'badge-muted'}`;
        featBadge.textContent = movie.is_featured ? 'Sim' : 'Não';
        tdFeat.appendChild(featBadge);
        const tdActs = document.createElement('td');
        const featBtn = document.createElement('button');
        featBtn.className = 'btn btn-ghost btn-sm';
        featBtn.textContent = movie.is_featured ? 'Remover destaque' : 'Destacar';
        featBtn.addEventListener('click', async () => {
          try {
            await toggleFeatured(movie.id, !movie.is_featured);
            movie.is_featured = !movie.is_featured;
            featBadge.textContent = movie.is_featured ? 'Sim' : 'Não';
            featBadge.className = `badge ${movie.is_featured ? 'badge-success' : 'badge-muted'}`;
            featBtn.textContent = movie.is_featured ? 'Remover destaque' : 'Destacar';
            toastOk(movie.is_featured ? 'Destaque ativado.' : 'Destaque removido.');
          } catch (e) { toastError(e.message); }
        });
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-ghost btn-sm';
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => _openEditModal(movie, load));
        tdActs.append(featBtn, editBtn);
        tr.append(tdTitle, tdYear, tdReviews, tdFeat, tdActs);
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
  load();

  return root;
}

function _openImportModal(onImported) {
  const form = document.createElement('div');
  form.className = 'stack';

  const group = document.createElement('div');
  group.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.className = 'form-label';
  lbl.textContent = 'Buscar filme no TMDB';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'form-input';
  input.placeholder = 'Digite pelo menos 2 caracteres';
  group.append(lbl, input);

  const results = document.createElement('div');
  results.className = 'stack';
  const errEl = document.createElement('p');
  errEl.className = 'form-error';
  errEl.setAttribute('aria-live', 'polite');

  form.append(group, results, errEl);
  let selectedMovie = null;

  const search = debounce(async (query) => {
    selectedMovie = null;
    results.replaceChildren();
    errEl.textContent = '';
    if (query.trim().length < 2) return;
    try {
      const data = await catalogSearch(query.trim(), 1);
      for (const movie of (data.results || []).slice(0, 6)) {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'btn btn-ghost btn-block';
        const year = movie.release_date ? ` (${movie.release_date.slice(0, 4)})` : '';
        option.textContent = `${movie.title}${year}`;
        option.addEventListener('click', () => {
          selectedMovie = movie;
          results.querySelectorAll('button').forEach(btn => btn.classList.remove('btn-primary'));
          option.classList.add('btn-primary');
        });
        results.appendChild(option);
      }
      if (!results.children.length) errEl.textContent = 'Nenhum resultado encontrado.';
    } catch (error) {
      errEl.textContent = error.message;
    }
  }, 350);
  input.addEventListener('input', () => search(input.value));

  openModal({
    title: 'Importar filme do TMDB',
    body: form,
    confirmLabel: 'Importar',
    onConfirm: async () => {
      if (!selectedMovie) {
        errEl.textContent = 'Selecione um filme nos resultados.';
        return false;
      }
      try {
        const movie = await syncMovie(selectedMovie.tmdb_id);
        toastOk(`"${movie.title}" importado com sucesso!`);
        await onImported?.();
        return true;
      } catch (e) {
        errEl.textContent = e.message;
        return false;
      }
    },
  });
}

function _openEditModal(movie, onSaved) {
  const form = document.createElement('div');
  form.className = 'stack';

  const titleLabel = document.createElement('label');
  titleLabel.className = 'form-label';
  titleLabel.textContent = 'Título';
  const titleInput = document.createElement('input');
  titleInput.className = 'form-input';
  titleInput.maxLength = 300;
  titleInput.value = movie.title || '';

  const overviewLabel = document.createElement('label');
  overviewLabel.className = 'form-label';
  overviewLabel.textContent = 'Sinopse';
  const overviewInput = document.createElement('textarea');
  overviewInput.className = 'form-textarea';
  overviewInput.rows = 5;
  overviewInput.value = movie.overview || '';

  const activeLabel = document.createElement('label');
  activeLabel.className = 'cluster';
  const activeInput = document.createElement('input');
  activeInput.type = 'checkbox';
  activeInput.checked = movie.is_active;
  const activeText = document.createElement('span');
  activeText.textContent = 'Filme ativo no catálogo';
  activeLabel.append(activeInput, activeText);

  const error = document.createElement('p');
  error.className = 'form-error';
  form.append(titleLabel, titleInput, overviewLabel, overviewInput, activeLabel, error);

  openModal({
    title: 'Editar filme',
    body: form,
    confirmLabel: 'Salvar',
    onConfirm: async () => {
      const title = titleInput.value.trim();
      if (!title) {
        error.textContent = 'Informe o título.';
        return false;
      }
      try {
        await adminUpdateMovie(movie.id, {
          title,
          overview: overviewInput.value.trim() || null,
          is_active: activeInput.checked,
        });
        toastOk('Filme atualizado.');
        await onSaved?.();
        return true;
      } catch (e) {
        error.textContent = e.message;
        return false;
      }
    },
  });
}
