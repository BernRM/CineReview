import { catalogDiscover, catalogGenres, addWatchlist, removeWatchlist, posterUrl } from '../api.js';
import { createMovieCard } from '../components/movieCard.js';
import { isLoggedIn } from '../state.js';
import { toastOk, toastError } from '../components/toast.js';
import { navigate } from '../router.js';
import { lazyImages } from '../utils/debounce.js';

export async function explorePage() {
  const root = document.createElement('div');
  root.className = 'container page';

  const header = document.createElement('div');
  header.className = 'page-header';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Catálogo completo';
  const h1 = document.createElement('h1');
  h1.textContent = 'Explorar';
  header.append(eyebrow, h1);
  root.appendChild(header);

  // Filters
  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';

  const genreSelect = document.createElement('select');
  genreSelect.className = 'form-select';
  genreSelect.setAttribute('aria-label', 'Filtrar por gênero');
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Todos os gêneros';
  genreSelect.appendChild(defaultOpt);

  const yearSelect = document.createElement('select');
  yearSelect.className = 'form-select';
  yearSelect.setAttribute('aria-label', 'Filtrar por ano');
  const yearDefault = document.createElement('option');
  yearDefault.value = '';
  yearDefault.textContent = 'Qualquer ano';
  yearSelect.appendChild(yearDefault);
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 1970; y--) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  }

  const sortSelect = document.createElement('select');
  sortSelect.className = 'form-select';
  sortSelect.setAttribute('aria-label', 'Ordenar por');
  for (const [val, label] of [
    ['popularity.desc', 'Popularidade'],
    ['vote_average.desc', 'Melhor avaliados'],
    ['primary_release_date.desc', 'Mais recentes'],
    ['primary_release_date.asc', 'Mais antigos'],
  ]) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    sortSelect.appendChild(opt);
  }

  filterBar.append(genreSelect, yearSelect, sortSelect);
  root.appendChild(filterBar);

  // Results grid
  const grid = document.createElement('div');
  grid.className = 'grid-movies';
  root.appendChild(grid);

  // Pagination
  const paginationBar = document.createElement('div');
  paginationBar.className = 'pagination';
  root.appendChild(paginationBar);

  let page = 1;
  let currentGenre = '';
  let currentYear = '';
  let currentSort = 'popularity.desc';
  const wlIds = new Set();

  async function load() {
    grid.replaceChildren();
    _appendSkeletons(grid, 20);

    try {
      const [movies, genres] = await Promise.all([
        catalogDiscover({ genre_id: currentGenre, year: currentYear, sort_by: currentSort, page }),
        catalogGenres().catch(() => []),
      ]);

      // Populate genres once
      if (genreSelect.children.length === 1 && genres?.length) {
        for (const g of genres) {
          const opt = document.createElement('option');
          opt.value = String(g.id);
          opt.textContent = g.name;
          genreSelect.appendChild(opt);
        }
      }

      grid.replaceChildren();

      if (!movies?.results?.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted empty-state';
        empty.textContent = 'Nenhum filme encontrado com estes filtros.';
        grid.appendChild(empty);
        paginationBar.replaceChildren();
        return;
      }

      for (const movie of movies.results) {
        const card = createMovieCard(movie, {
          inWatchlist: wlIds.has(movie.id),
          onWatchlist: isLoggedIn() ? (m, btn) => _toggleWl(m, btn, wlIds) : null,
        });
        grid.appendChild(card);
      }

      // Pagination
      paginationBar.replaceChildren();
      const total = Math.min(movies.total_pages || 1, 20);
      if (total > 1) {
        if (page > 1) {
          const prev = document.createElement('button');
          prev.className = 'btn btn-ghost btn-sm';
          prev.textContent = '← Anterior';
          prev.addEventListener('click', () => { page--; load(); root.scrollIntoView(); });
          paginationBar.appendChild(prev);
        }
        const info = document.createElement('span');
        info.className = 'pagination-info';
        info.textContent = `Página ${page} de ${total}`;
        paginationBar.appendChild(info);
        if (page < total) {
          const next = document.createElement('button');
          next.className = 'btn btn-ghost btn-sm';
          next.textContent = 'Próxima →';
          next.addEventListener('click', () => { page++; load(); root.scrollIntoView(); });
          paginationBar.appendChild(next);
        }
      }
    } catch (e) {
      grid.replaceChildren();
      const msg = document.createElement('p');
      msg.className = 'text-muted';
      msg.textContent = `Erro ao carregar filmes: ${e.message}`;
      grid.appendChild(msg);
    }

    lazyImages(root);
  }

  genreSelect.addEventListener('change', () => { currentGenre = genreSelect.value; page = 1; load(); });
  yearSelect.addEventListener('change', () => { currentYear = yearSelect.value; page = 1; load(); });
  sortSelect.addEventListener('change', () => { currentSort = sortSelect.value; page = 1; load(); });

  load();
  return root;
}

function _appendSkeletons(container, n) {
  for (let i = 0; i < n; i++) {
    const wrap = document.createElement('div');
    const img = document.createElement('div');
    img.className = 'skeleton';
    img.style.cssText = 'width:100%;aspect-ratio:2/3;border-radius:12px;';
    const txt = document.createElement('div');
    txt.className = 'skeleton';
    txt.style.cssText = 'height:14px;margin-top:8px;border-radius:4px;';
    wrap.append(img, txt);
    container.appendChild(wrap);
  }
}

async function _toggleWl(movie, btn, wlIds) {
  if (!isLoggedIn()) { navigate('/login'); return; }
  try {
    if (wlIds.has(movie.id)) {
      await removeWatchlist(movie.id); wlIds.delete(movie.id);
      btn.textContent = '+ Lista'; btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false');
    } else {
      await addWatchlist(movie.id); wlIds.add(movie.id);
      btn.textContent = '✓ Lista'; btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      toastOk('Adicionado à lista.');
    }
  } catch (e) { toastError(e.message); }
}
