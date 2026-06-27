import { catalogSearch } from '../api.js';
import { createMovieCard } from '../components/movieCard.js';
import { debounce } from '../utils/debounce.js';
import { lazyImages } from '../utils/debounce.js';

export function searchPage(params) {
  const root = document.createElement('div');
  root.className = 'container page';

  const header = document.createElement('div');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Buscar';
  header.appendChild(h1);
  root.appendChild(header);

  const searchBar = document.createElement('div');
  searchBar.className = 'search-bar';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'form-input search-input';
  input.placeholder = 'Buscar filmes…';
  input.setAttribute('aria-label', 'Buscar filmes');
  input.value = params?.q || '';
  input.autocomplete = 'off';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'search-icon';
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.textContent = '🔍';

  searchBar.append(searchIcon, input);
  root.appendChild(searchBar);

  const status = document.createElement('p');
  status.className = 'search-status text-muted';
  status.setAttribute('aria-live', 'polite');
  root.appendChild(status);

  const grid = document.createElement('div');
  grid.className = 'grid-movies';
  root.appendChild(grid);

  const paginationBar = document.createElement('div');
  paginationBar.className = 'pagination';
  root.appendChild(paginationBar);

  let currentPage = 1;
  let currentQuery = input.value;

  async function search(q, page = 1) {
    currentQuery = q;
    currentPage = page;

    if (!q.trim()) {
      grid.replaceChildren();
      paginationBar.replaceChildren();
      status.textContent = 'Digite para buscar filmes.';
      return;
    }

    status.textContent = `Buscando "${q}"…`;
    grid.replaceChildren();
    _appendSkeletons(grid, 12);

    try {
      const data = await catalogSearch(q, page);
      grid.replaceChildren();
      paginationBar.replaceChildren();

      if (!data?.results?.length) {
        status.textContent = `Nenhum resultado para "${q}".`;
        return;
      }

      const total = data.total_results || data.results.length;
      status.textContent = `${total.toLocaleString('pt-BR')} resultado${total !== 1 ? 's' : ''} para "${q}"`;

      for (const movie of data.results) {
        grid.appendChild(createMovieCard(movie));
      }

      // Pagination
      const totalPages = Math.min(data.total_pages || 1, 10);
      if (totalPages > 1) {
        if (page > 1) {
          const prev = document.createElement('button');
          prev.className = 'btn btn-ghost btn-sm';
          prev.textContent = '← Anterior';
          prev.addEventListener('click', () => { search(currentQuery, page - 1); root.scrollIntoView(); });
          paginationBar.appendChild(prev);
        }
        const info = document.createElement('span');
        info.className = 'pagination-info';
        info.textContent = `Página ${page} de ${totalPages}`;
        paginationBar.appendChild(info);
        if (page < totalPages) {
          const next = document.createElement('button');
          next.className = 'btn btn-ghost btn-sm';
          next.textContent = 'Próxima →';
          next.addEventListener('click', () => { search(currentQuery, page + 1); root.scrollIntoView(); });
          paginationBar.appendChild(next);
        }
      }
    } catch (e) {
      grid.replaceChildren();
      status.textContent = `Erro ao buscar: ${e.message}`;
    }

    lazyImages(root);
  }

  const debouncedSearch = debounce((q) => search(q, 1), 400);
  input.addEventListener('input', () => debouncedSearch(input.value));

  // Initial search from URL params
  if (input.value) search(input.value, 1);
  else status.textContent = 'Digite para buscar filmes.';

  // Focus search input
  requestAnimationFrame(() => input.focus());

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
