import { myWatched, unmarkWatched } from '../api.js';
import { createMovieCard } from '../components/movieCard.js';
import { isLoggedIn } from '../state.js';
import { navigate } from '../router.js';
import { toastOk, toastError } from '../components/toast.js';
import { lazyImages } from '../utils/debounce.js';

export async function watchedPage() {
  if (!isLoggedIn()) { navigate('/login'); return document.createElement('div'); }

  const root = document.createElement('div');
  root.className = 'container page';

  const header = document.createElement('div');
  header.className = 'page-header';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Seu histórico';
  const h1 = document.createElement('h1');
  h1.textContent = 'Assistidos';
  header.append(eyebrow, h1);
  root.appendChild(header);

  const loading = document.createElement('div');
  loading.className = 'loading-center';
  const spin = document.createElement('div');
  spin.className = 'spinner';
  loading.appendChild(spin);
  root.appendChild(loading);

  try {
    const items = await myWatched();
    root.removeChild(loading);

    if (!items?.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const icon = document.createElement('div');
      icon.className = 'empty-icon';
      icon.textContent = '🎞️';
      const h3 = document.createElement('h3');
      h3.textContent = 'Nenhum filme assistido ainda';
      const p = document.createElement('p');
      p.textContent = 'Marque filmes como assistidos para acompanhar seu histórico.';
      const link = document.createElement('a');
      link.href = '/explorar';
      link.className = 'btn btn-primary';
      link.textContent = 'Explorar filmes';
      empty.append(icon, h3, p, link);
      root.appendChild(empty);
      return root;
    }

    const countEl = document.createElement('p');
    countEl.className = 'text-muted';
    countEl.textContent = `${items.length} filme${items.length !== 1 ? 's' : ''} assistido${items.length !== 1 ? 's' : ''}`;
    root.appendChild(countEl);

    const grid = document.createElement('div');
    grid.className = 'grid-movies';

    for (const item of items) {
      const movie = { ...item.movie, id: item.movie_id };
      const card = createMovieCard(movie, {
        inWatched: true,
        onWatched: async (m, btn) => {
          try {
            await unmarkWatched(m.id);
            card.style.opacity = '0.4';
            card.style.transition = 'opacity 0.3s';
            setTimeout(() => card.remove(), 300);
            toastOk('Removido dos assistidos.');
          } catch (e) { toastError(e.message); }
        },
      });
      grid.appendChild(card);
    }

    root.appendChild(grid);
  } catch (err) {
    root.replaceChildren();
    const errEl = document.createElement('p');
    errEl.className = 'text-muted';
    errEl.textContent = `Erro ao carregar assistidos: ${err.message}`;
    root.appendChild(errEl);
  }

  lazyImages(root);
  return root;
}
