import { userProfile } from '../api.js';
import { createMovieCard } from '../components/movieCard.js';
import { lazyImages } from '../utils/debounce.js';

export async function profilePage({ username }) {
  const root = document.createElement('div');
  root.className = 'container page';

  const loading = document.createElement('div');
  loading.className = 'loading-center';
  const spin = document.createElement('div');
  spin.className = 'spinner';
  loading.appendChild(spin);
  root.appendChild(loading);

  try {
    const data = await userProfile(username);
    root.removeChild(loading);

    // Header
    const profileHeader = document.createElement('div');
    profileHeader.className = 'profile-header';

    const avatar = document.createElement('div');
    avatar.className = 'profile-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = (data.username?.[0] || '?').toUpperCase();

    const profileInfo = document.createElement('div');
    profileInfo.className = 'profile-info';
    const nameEl = document.createElement('h1');
    nameEl.textContent = data.name || data.username;
    const usernameEl = document.createElement('p');
    usernameEl.className = 'text-muted';
    usernameEl.textContent = `@${data.username}`;
    const statWrap = document.createElement('div');
    statWrap.className = 'profile-stats cluster';
    const stats = [
      { label: 'avaliações', value: data.review_count || 0 },
      { label: 'na lista', value: data.watchlist_count || 0 },
      { label: 'assistidos', value: data.watched_count || 0 },
    ];
    for (const s of stats) {
      const stat = document.createElement('div');
      stat.className = 'profile-stat';
      const val = document.createElement('strong');
      val.textContent = String(s.value);
      const lbl = document.createElement('span');
      lbl.className = 'text-muted text-sm';
      lbl.textContent = ` ${s.label}`;
      stat.append(val, lbl);
      statWrap.appendChild(stat);
    }
    profileInfo.append(nameEl, usernameEl);
    if (data.bio) {
      const bio = document.createElement('p');
      bio.textContent = data.bio;
      profileInfo.appendChild(bio);
    }
    profileInfo.appendChild(statWrap);
    profileHeader.append(avatar, profileInfo);
    root.appendChild(profileHeader);

    // Recent reviews
    if (data.recent_reviews?.length) {
      const section = document.createElement('section');
      section.className = 'section';
      const sh = document.createElement('h2');
      sh.textContent = 'Avaliações recentes';
      sh.style.marginBottom = 'var(--sp-4)';
      section.appendChild(sh);

      for (const r of data.recent_reviews) {
        const card = document.createElement('div');
        card.className = 'review-card';
        const meta = document.createElement('div');
        meta.className = 'review-meta';
        const movieTitle = document.createElement('span');
        movieTitle.className = 'review-movie-title';
        movieTitle.textContent = r.movie_title || 'Filme';
        const rating = document.createElement('span');
        rating.className = 'review-rating';
        rating.textContent = `★ ${Number(r.rating).toFixed(1)}`;
        const date = document.createElement('span');
        date.className = 'review-date';
        date.textContent = new Date(r.created_at).toLocaleDateString('pt-BR');
        meta.append(movieTitle, rating, date);
        card.appendChild(meta);
        if (r.title) {
          const t = document.createElement('div');
          t.className = 'review-title';
          t.textContent = r.title;
          card.appendChild(t);
        }
        if (r.body && !r.contains_spoiler) {
          const b = document.createElement('p');
          b.className = 'review-body';
          b.textContent = r.body.length > 200 ? `${r.body.slice(0, 200)}…` : r.body;
          card.appendChild(b);
        }
        section.appendChild(card);
      }
      root.appendChild(section);
    }

  } catch (err) {
    root.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const h3 = document.createElement('h3');
    h3.textContent = 'Usuário não encontrado';
    empty.appendChild(h3);
    root.appendChild(empty);
  }

  lazyImages(root);
  return root;
}
