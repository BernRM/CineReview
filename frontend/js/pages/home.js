import { catalogTrending, catalogGenres, addWatchlist, removeWatchlist, markWatched, myWatchlist, myWatched, backdropUrl, posterUrl } from '../api.js';
import { createMovieCard } from '../components/movieCard.js';
import { isLoggedIn } from '../state.js';
import { toastOk, toastError } from '../components/toast.js';
import { navigate } from '../router.js';
import { lazyImages } from '../utils/debounce.js';
import { safeUrl } from '../utils/escape.js';

export async function homePage() {
  const root = document.createElement('div');

  // Hero skeleton
  const hero = document.createElement('section');
  hero.className = 'hero';
  hero.setAttribute('aria-label', 'Destaque');

  const backdrop = document.createElement('div');
  backdrop.className = 'hero-backdrop skeleton';
  backdrop.setAttribute('aria-hidden', 'true');
  hero.appendChild(backdrop);

  const heroContent = document.createElement('div');
  heroContent.className = 'container';
  const heroInner = document.createElement('div');
  heroInner.className = 'hero-content';
  heroContent.appendChild(heroInner);
  hero.appendChild(heroContent);

  root.appendChild(hero);

  // Main content
  const main = document.createElement('div');
  main.className = 'container page';

  const trendingSection = document.createElement('section');
  trendingSection.className = 'section';
  const trendingHeader = document.createElement('div');
  trendingHeader.className = 'section-header';
  const trendingTitle = document.createElement('div');
  trendingTitle.className = 'section-title';
  const trendingEyebrow = document.createElement('span');
  trendingEyebrow.className = 'eyebrow';
  trendingEyebrow.textContent = 'Em alta esta semana';
  const trendingH2 = document.createElement('h2');
  trendingH2.textContent = 'Tendências';
  trendingTitle.append(trendingEyebrow, trendingH2);
  trendingHeader.appendChild(trendingTitle);
  trendingSection.appendChild(trendingHeader);

  const rail = document.createElement('div');
  rail.className = 'scroll-rail';
  _appendSkeletonCards(rail, 10);
  trendingSection.appendChild(rail);
  main.appendChild(trendingSection);
  root.appendChild(main);

  // Fetch data
  try {
    const [data, watchlistData, watchedData] = await Promise.all([
      catalogTrending(),
      isLoggedIn() ? myWatchlist().catch(() => []) : Promise.resolve([]),
      isLoggedIn() ? myWatched().catch(() => []) : Promise.resolve([]),
    ]);

    const wlIds = new Set((watchlistData || []).map(i => i.movie_id));
    const wdIds = new Set((watchedData || []).map(i => i.movie_id));

    const featured = data?.featured || [];
    const trending = data?.trending || [];

    // Render hero with first featured or trending
    const heroItem = featured[0] || (trending[0] ? { ...trending[0], tmdb_id: trending[0].tmdb_id } : null);
    if (heroItem) {
      const bgUrl = safeUrl(backdropUrl(heroItem.backdrop_path));
      if (bgUrl) {
        backdrop.style.backgroundImage = `url(${CSS.escape ? `${bgUrl}` : bgUrl})`;
        backdrop.classList.remove('skeleton');
        // Safe: backgroundImage is a validated https URL
        backdrop.style.backgroundImage = `url("${bgUrl}")`;
      }

      const eyebrow = document.createElement('p');
      eyebrow.className = 'eyebrow hero-eyebrow';
      eyebrow.textContent = featured.length ? 'Em Destaque' : 'Tendência';

      const title = document.createElement('h1');
      title.className = 'hero-title display';
      title.textContent = heroItem.title || '';

      const overview = document.createElement('p');
      overview.className = 'hero-overview';
      overview.textContent = heroItem.overview || '';

      const actions = document.createElement('div');
      actions.className = 'hero-actions';

      const btnDetail = document.createElement('a');
      btnDetail.className = 'btn btn-primary btn-lg';
      btnDetail.textContent = 'Ver filme';
      const detailHref = heroItem.tmdb_id ? `/filme/${heroItem.tmdb_id}` : (heroItem.id ? `/filme/local/${heroItem.id}` : null);
      if (detailHref) btnDetail.href = detailHref;
      actions.appendChild(btnDetail);

      heroInner.append(eyebrow, title, overview, actions);
    }

    // Render trending rail
    rail.replaceChildren();
    if (trending.length === 0 && featured.length === 0) {
      rail.textContent = 'Nenhum conteúdo disponível no momento.';
    }
    for (const movie of trending) {
      const card = createMovieCard(
        { ...movie, community_rating: null },
        {
          inWatchlist: wlIds.has(movie.id),
          inWatched: wdIds.has(movie.id),
          onWatchlist: isLoggedIn() ? (m, btn) => _toggleWatchlist(m, btn, wlIds) : null,
          onWatched: isLoggedIn() ? (m, btn) => _toggleWatched(m, btn, wdIds, wlIds) : null,
        }
      );
      rail.appendChild(card);
    }
    if (trending.length > 0 && trending.length < 3) {
      rail.appendChild(_catalogNote());
    }

    // Featured section
    if (featured.length > 1) {
      const featSection = document.createElement('section');
      featSection.className = 'section';
      const fh = document.createElement('div');
      fh.className = 'section-header';
      const ft = document.createElement('div');
      ft.className = 'section-title';
      const fe = document.createElement('span');
      fe.className = 'eyebrow';
      fe.textContent = 'Seleção editorial';
      const fh2 = document.createElement('h2');
      fh2.textContent = 'Destaques';
      ft.append(fe, fh2);
      fh.appendChild(ft);
      featSection.appendChild(fh);
      const featRail = document.createElement('div');
      featRail.className = 'scroll-rail';
      for (const movie of featured) {
        const card = createMovieCard(movie, {
          inWatchlist: wlIds.has(movie.id),
          onWatchlist: isLoggedIn() ? (m, btn) => _toggleWatchlist(m, btn, wlIds) : null,
        });
        featRail.appendChild(card);
      }
      featSection.appendChild(featRail);
      main.insertBefore(featSection, trendingSection);
    }
  } catch (err) {
    rail.replaceChildren();
    const msg = document.createElement('p');
    msg.className = 'text-muted';
    msg.textContent = `Não foi possível carregar tendências: ${err.message}`;
    rail.appendChild(msg);
  }

  lazyImages(root);
  return root;
}

function _appendSkeletonCards(container, n) {
  for (let i = 0; i < n; i++) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:180px;flex:0 0 180px;';
    const img = document.createElement('div');
    img.className = 'skeleton';
    img.style.cssText = 'width:180px;height:270px;border-radius:12px;';
    const txt = document.createElement('div');
    txt.className = 'skeleton';
    txt.style.cssText = 'height:14px;margin-top:8px;border-radius:4px;';
    wrap.append(img, txt);
    container.appendChild(wrap);
  }
}

function _catalogNote() {
  const note = document.createElement('aside');
  note.className = 'catalog-note';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Sua sessão começa aqui';

  const title = document.createElement('h3');
  title.textContent = 'Encontre o próximo filme da sua lista.';

  const text = document.createElement('p');
  text.textContent = 'Explore o catálogo, registre o que assistiu e compartilhe suas avaliações.';

  const link = document.createElement('a');
  link.className = 'btn btn-ghost';
  link.href = '/explorar';
  link.textContent = 'Explorar catálogo';

  note.append(eyebrow, title, text, link);
  return note;
}

async function _toggleWatchlist(movie, btn, wlIds) {
  try {
    const id = await _resolveLocalMovieId(movie);
    if (!id) throw new Error('Não foi possível preparar este filme.');
    if (wlIds.has(id)) {
      await removeWatchlist(id);
      wlIds.delete(id);
      btn.textContent = '+ Lista';
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
      toastOk('Removido da lista.');
    } else {
      await addWatchlist(id);
      wlIds.add(id);
      btn.textContent = '✓ Lista';
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      toastOk('Adicionado à lista.');
    }
  } catch (e) {
    if (e.status === 401) { navigate('/login'); } else toastError(e.message);
  }
}

async function _toggleWatched(movie, btn, wdIds, wlIds) {
  try {
    const id = await _resolveLocalMovieId(movie);
    if (!id) throw new Error('Não foi possível preparar este filme.');
    if (wdIds.has(id)) {
      await import('../api.js').then(a => a.unmarkWatched(id));
      wdIds.delete(id);
      btn.textContent = '✓ Visto?';
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      await markWatched(id);
      wdIds.add(id); wlIds.delete(id);
      btn.textContent = '✓ Visto';
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      toastOk('Marcado como assistido.');
    }
  } catch (e) {
    if (e.status === 401) { navigate('/login'); } else toastError(e.message);
  }
}

async function _resolveLocalMovieId(movie) {
  if (movie.id) return movie.id;
  if (!movie.tmdb_id) return null;
  const { catalogMovie } = await import('../api.js');
  const detail = await catalogMovie(movie.tmdb_id);
  return detail?.local_id || null;
}
