import { posterUrl } from '../api.js';
import { safeUrl } from '../utils/escape.js';
import { navigate } from '../router.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function _filmIconSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '48'); svg.setAttribute('height', '48');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const paths = [
    ['rect', {x:'2',y:'2',width:'20',height:'20',rx:'2'}],
    ['path', {d:'M7 2v20M17 2v20M2 7h5M17 7h5M2 12h20M2 17h5M17 17h5'}],
  ];
  for (const [tag, attrs] of paths) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
  }
  return svg;
}

/**
 * Creates a movie card DOM element.
 * All user-supplied data is inserted via textContent or safe attributes.
 *
 * @param {object} movie
 * @param {object} [opts]
 * @param {boolean} [opts.inWatchlist]
 * @param {boolean} [opts.inWatched]
 * @param {Function} [opts.onWatchlist]
 * @param {Function} [opts.onWatched]
 */
export function createMovieCard(movie, opts = {}) {
  const card = document.createElement('article');
  card.className = 'movie-card';
  card.setAttribute('aria-label', movie.title || 'Filme');
  card.tabIndex = 0;

  // Poster
  const posterWrap = document.createElement('div');
  posterWrap.className = 'card-poster';

  const imgUrl = safeUrl(posterUrl(movie.poster_path));
  if (imgUrl) {
    const img = document.createElement('img');
    img.alt = movie.title ? `Pôster de ${movie.title}` : 'Pôster';
    img.loading = 'lazy';
    img.dataset.src = imgUrl;
    img.className = 'skeleton';
    img.addEventListener('load', () => img.classList.remove('skeleton'));
    posterWrap.appendChild(img);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'card-poster-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.appendChild(_filmIconSvg());
    const label = document.createElement('span');
    label.textContent = movie.title || 'Sem imagem';
    fallback.appendChild(label);
    posterWrap.appendChild(fallback);
  }

  // Rating badge
  const rating = movie.community_rating ?? movie.vote_average ?? movie.tmdb_vote_average;
  if (rating != null) {
    const badge = document.createElement('div');
    badge.className = 'card-rating';
    badge.setAttribute('aria-label', `Nota: ${Number(rating).toFixed(1)}`);
    badge.textContent = Number(rating).toFixed(1);
    posterWrap.appendChild(badge);
  }

  // Quick actions (visible on hover)
  if (opts.onWatchlist || opts.onWatched) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'card-actions';
    actionsEl.setAttribute('aria-label', 'Ações rápidas');

    if (opts.onWatchlist) {
      const wlBtn = document.createElement('button');
      wlBtn.className = `card-action-btn${opts.inWatchlist ? ' active' : ''}`;
      wlBtn.textContent = opts.inWatchlist ? '✓ Lista' : '+ Lista';
      wlBtn.setAttribute('aria-pressed', String(!!opts.inWatchlist));
      wlBtn.addEventListener('click', e => { e.stopPropagation(); opts.onWatchlist(movie, wlBtn); });
      actionsEl.appendChild(wlBtn);
    }
    if (opts.onWatched) {
      const wBtn = document.createElement('button');
      wBtn.className = `card-action-btn${opts.inWatched ? ' active' : ''}`;
      wBtn.textContent = opts.inWatched ? '✓ Visto' : '✓ Visto?';
      wBtn.setAttribute('aria-pressed', String(!!opts.inWatched));
      wBtn.addEventListener('click', e => { e.stopPropagation(); opts.onWatched(movie, wBtn); });
      actionsEl.appendChild(wBtn);
    }
    posterWrap.appendChild(actionsEl);
  }

  // Film-strip decoration
  const stripL = _filmStrip();
  stripL.className = 'film-strip film-strip-left';
  const stripR = _filmStrip();
  stripR.className = 'film-strip film-strip-right';
  posterWrap.append(stripL, stripR);

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';

  const titleEl = document.createElement('div');
  titleEl.className = 'card-title';
  titleEl.textContent = movie.title || movie.original_title || 'Sem título';

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : (movie.tmdb_vote_count != null ? '' : '');
  const yearEl = document.createElement('div');
  yearEl.className = 'card-year';
  if (year) yearEl.textContent = String(year);

  body.append(titleEl, yearEl);
  card.append(posterWrap, body);

  // Navigate on click/Enter
  const target = movie.tmdb_id ? `/filme/${movie.tmdb_id}` : (movie.local_id ? `/filme/local/${movie.local_id}` : null);
  if (target) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => navigate(target));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(target); });
  }

  return card;
}

function _filmStrip() {
  const strip = document.createElement('div');
  for (let i = 0; i < 8; i++) {
    const hole = document.createElement('div');
    hole.className = 'film-hole';
    hole.setAttribute('aria-hidden', 'true');
    strip.appendChild(hole);
  }
  return strip;
}
