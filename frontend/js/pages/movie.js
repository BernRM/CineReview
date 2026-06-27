import {
  catalogMovie, localMovie, movieReviews, upsertReview, deleteReview,
  addWatchlist, removeWatchlist, markWatched, unmarkWatched,
  myWatchlist, myWatched, posterUrl, backdropUrl,
} from '../api.js';
import { isLoggedIn, getUser } from '../state.js';
import { toastOk, toastError } from '../components/toast.js';
import { createStarRating, getStarValue } from '../components/starRating.js';
import { confirmDialog } from '../components/modal.js';
import { openModal } from '../components/modal.js';
import { navigate } from '../router.js';
import { safeUrl as _safeUrl } from '../utils/escape.js';
import { lazyImages } from '../utils/debounce.js';

export async function moviePage({ tmdb_id, local_id }) {
  const root = document.createElement('div');

  // Loading state
  const loadMsg = document.createElement('div');
  loadMsg.className = 'loading-center';
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  loadMsg.appendChild(spinner);
  root.appendChild(loadMsg);

  try {
    const data = local_id
      ? { ...(await localMovie(local_id)), local_id: Number(local_id) }
      : await catalogMovie(tmdb_id);
    const [reviewsData, wlData, wdData] = await Promise.all([
      data?.local_id ? movieReviews(data.local_id).catch(() => []) : Promise.resolve([]),
      isLoggedIn() ? myWatchlist().catch(() => []) : Promise.resolve([]),
      isLoggedIn() ? myWatched().catch(() => []) : Promise.resolve([]),
    ]);

    root.removeChild(loadMsg);

    if (!data) {
      const empty = document.createElement('div');
      empty.className = 'container page empty-state';
      const h3 = document.createElement('h3');
      h3.textContent = 'Filme não encontrado';
      empty.appendChild(h3);
      root.appendChild(empty);
      return root;
    }

    const localId = data.local_id;
    const wlIds = new Set((wlData || []).map(i => i.movie_id));
    const wdIds = new Set((wdData || []).map(i => i.movie_id));
    const inWl = localId && wlIds.has(localId);
    const inWd = localId && wdIds.has(localId);

    // Backdrop
    const bdUrl = _safeUrl(backdropUrl(data.backdrop_path));
    if (bdUrl) {
      const bd = document.createElement('div');
      bd.className = 'detail-backdrop';
      bd.style.backgroundImage = `url("${bdUrl}")`;
      bd.setAttribute('role', 'img');
      bd.setAttribute('aria-label', `Backdrop de ${data.title}`);
      root.appendChild(bd);
    }

    const container = document.createElement('div');
    container.className = 'container page';

    // Poster + Info
    const main = document.createElement('div');
    main.className = 'detail-main';

    // Poster
    const posterWrap = document.createElement('div');
    posterWrap.className = 'detail-poster';
    const posterImg = document.createElement('img');
    const pUrl = _safeUrl(posterUrl(data.poster_path));
    if (pUrl) {
      posterImg.dataset.src = pUrl;
      posterImg.alt = `Pôster de ${data.title}`;
      posterImg.className = 'skeleton';
      posterImg.addEventListener('load', () => posterImg.classList.remove('skeleton'));
    } else {
      posterImg.alt = '';
      posterImg.style.display = 'none';
    }
    posterWrap.appendChild(posterImg);

    // Info
    const info = document.createElement('div');
    info.className = 'detail-info';

    const titleEl = document.createElement('h1');
    titleEl.className = 'detail-title';
    titleEl.textContent = data.title || '';

    // Meta
    const meta = document.createElement('div');
    meta.className = 'detail-meta';
    if (data.release_date) {
      const yr = document.createElement('span');
      yr.textContent = new Date(data.release_date).getFullYear();
      meta.appendChild(yr);
    }
    if (data.runtime_minutes) {
      const rt = document.createElement('span');
      rt.textContent = `${Math.floor(data.runtime_minutes / 60)}h ${data.runtime_minutes % 60}min`;
      meta.appendChild(rt);
    }
    if (data.original_language) {
      const lang = document.createElement('span');
      lang.textContent = data.original_language.toUpperCase();
      meta.appendChild(lang);
    }

    // Genres
    if (data.genres?.length) {
      const genreWrap = document.createElement('div');
      genreWrap.className = 'cluster';
      genreWrap.style.marginBottom = 'var(--sp-4)';
      for (const g of data.genres) {
        const chip = document.createElement('span');
        chip.className = 'genre-chip';
        chip.textContent = g.name;
        genreWrap.appendChild(chip);
      }
      info.append(titleEl, meta, genreWrap);
    } else {
      info.append(titleEl, meta);
    }

    // Ratings
    const ratingsRow = document.createElement('div');
    ratingsRow.className = 'detail-ratings';

    if (data.community_rating != null || data.review_count > 0) {
      const cr = document.createElement('div');
      cr.className = 'detail-rating-block';
      const crl = document.createElement('span');
      crl.className = 'detail-rating-label';
      crl.textContent = 'CineView';
      const crv = document.createElement('span');
      crv.className = 'detail-rating-value';
      crv.textContent = data.community_rating ? Number(data.community_rating).toFixed(1) : '—';
      const crs = document.createElement('span');
      crs.className = 'detail-rating-sub';
      crs.textContent = `${data.review_count || 0} avaliações`;
      cr.append(crl, crv, crs);
      ratingsRow.appendChild(cr);
    }

    if (data.tmdb_vote_average != null) {
      if (ratingsRow.children.length) {
        const div = document.createElement('div');
        div.className = 'detail-divider';
        ratingsRow.appendChild(div);
      }
      const tr = document.createElement('div');
      tr.className = 'detail-rating-block';
      const trl = document.createElement('span');
      trl.className = 'detail-rating-label';
      trl.textContent = 'TMDB';
      const trv = document.createElement('span');
      trv.className = 'detail-rating-value';
      trv.textContent = Number(data.tmdb_vote_average).toFixed(1);
      const trs = document.createElement('span');
      trs.className = 'detail-rating-sub';
      trs.textContent = `${(data.tmdb_vote_count || 0).toLocaleString('pt-BR')} votos`;
      tr.append(trl, trv, trs);
      ratingsRow.appendChild(tr);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'detail-actions';

    if (localId) {
      const wlBtn = document.createElement('button');
      wlBtn.className = `btn ${inWl ? 'btn-primary' : 'btn-ghost'}`;
      wlBtn.textContent = inWl ? '✓ Na lista' : '+ Minha lista';
      wlBtn.setAttribute('aria-pressed', String(inWl));
      wlBtn.addEventListener('click', async () => {
        if (!isLoggedIn()) { navigate('/login'); return; }
        try {
          if (wlIds.has(localId)) {
            await removeWatchlist(localId); wlIds.delete(localId);
            wlBtn.textContent = '+ Minha lista'; wlBtn.classList.replace('btn-primary', 'btn-ghost');
            wlBtn.setAttribute('aria-pressed', 'false');
          } else {
            await addWatchlist(localId); wlIds.add(localId);
            wlBtn.textContent = '✓ Na lista'; wlBtn.classList.replace('btn-ghost', 'btn-primary');
            wlBtn.setAttribute('aria-pressed', 'true');
          }
        } catch (e) { toastError(e.message); }
      });

      const wdBtn = document.createElement('button');
      wdBtn.className = `btn ${inWd ? 'btn-primary' : 'btn-ghost'}`;
      wdBtn.textContent = inWd ? '✓ Assistido' : 'Marcar assistido';
      wdBtn.addEventListener('click', async () => {
        if (!isLoggedIn()) { navigate('/login'); return; }
        try {
          if (wdIds.has(localId)) {
            await unmarkWatched(localId); wdIds.delete(localId);
            wdBtn.textContent = 'Marcar assistido'; wdBtn.classList.replace('btn-primary', 'btn-ghost');
          } else {
            await markWatched(localId); wdIds.add(localId); wlIds.delete(localId);
            wdBtn.textContent = '✓ Assistido'; wdBtn.classList.replace('btn-ghost', 'btn-primary');
            toastOk('Marcado como assistido.');
          }
        } catch (e) { toastError(e.message); }
      });

      const rateBtn = document.createElement('button');
      rateBtn.className = 'btn btn-ghost';
      rateBtn.textContent = 'Avaliar';
      rateBtn.addEventListener('click', () => _openReviewModal(localId, reviewsSection));
      actions.append(wlBtn, wdBtn, rateBtn);
    }

    // Overview
    const overview = document.createElement('p');
    overview.className = 'detail-overview';
    overview.textContent = data.overview || 'Sinopse não disponível.';

    info.append(ratingsRow, actions, overview);
    main.append(posterWrap, info);
    container.appendChild(main);

    // Trailer
    if (data.trailer_key) {
      const trailerSection = document.createElement('section');
      trailerSection.className = 'section';
      const th2 = document.createElement('h2');
      th2.textContent = 'Trailer';
      th2.style.marginBottom = 'var(--sp-4)';
      const embedWrap = document.createElement('div');
      embedWrap.className = 'trailer-embed';
      const iframe = document.createElement('iframe');
      // trailer_key comes from TMDB — only YouTube keys are accepted
      iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(data.trailer_key)}`;
      iframe.title = `Trailer de ${data.title}`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      embedWrap.appendChild(iframe);
      trailerSection.append(th2, embedWrap);
      container.appendChild(trailerSection);
    }

    // Cast
    if (data.cast?.length) {
      const castSection = document.createElement('section');
      castSection.className = 'section';
      const ch2 = document.createElement('h2');
      ch2.textContent = 'Elenco principal';
      ch2.style.marginBottom = 'var(--sp-4)';
      const castRail = document.createElement('div');
      castRail.className = 'scroll-rail';
      for (const actor of data.cast.slice(0, 10)) {
        const card = _castCard(actor);
        castRail.appendChild(card);
      }
      castSection.append(ch2, castRail);
      container.appendChild(castSection);
    }

    // Reviews
    const reviewsSection = document.createElement('section');
    reviewsSection.className = 'section';
    reviewsSection.id = 'reviews';
    const rh = document.createElement('div');
    rh.className = 'section-header';
    const rt = document.createElement('div');
    rt.className = 'section-title';
    const re = document.createElement('span');
    re.className = 'eyebrow';
    re.textContent = 'Comunidade';
    const rh2 = document.createElement('h2');
    rh2.textContent = 'Avaliações';
    rt.append(re, rh2);
    rh.appendChild(rt);
    if (isLoggedIn() && localId) {
      const rateBtn2 = document.createElement('button');
      rateBtn2.className = 'btn btn-ghost btn-sm';
      rateBtn2.textContent = 'Escrever avaliação';
      rateBtn2.addEventListener('click', () => _openReviewModal(localId, reviewsSection));
      rh.appendChild(rateBtn2);
    }
    reviewsSection.appendChild(rh);
    _renderReviews(reviewsSection, reviewsData || []);
    container.appendChild(reviewsSection);

    root.appendChild(container);
    lazyImages(root);
  } catch (err) {
    root.replaceChildren();
    const errEl = document.createElement('div');
    errEl.className = 'container page empty-state';
    const h3 = document.createElement('h3');
    h3.textContent = 'Erro ao carregar o filme';
    const p = document.createElement('p');
    p.textContent = err.message;
    errEl.append(h3, p);
    root.appendChild(errEl);
  }

  return root;
}

function _castCard(actor) {
  const card = document.createElement('div');
  card.className = 'cast-card';
  const img = document.createElement('img');
  img.className = 'cast-avatar';
  const profileUrl = actor.profile_path
    ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
    : null;
  if (profileUrl) {
    img.dataset.src = profileUrl;
    img.alt = actor.name;
  } else {
    img.alt = '';
    img.style.background = 'var(--surface-hi)';
  }
  const name = document.createElement('div');
  name.className = 'cast-name';
  name.textContent = actor.name;
  const role = document.createElement('div');
  role.className = 'cast-role';
  role.textContent = actor.character || '';
  card.append(img, name, role);
  return card;
}

function _renderReviews(section, reviews) {
  const existing = section.querySelector('.reviews-list');
  if (existing) existing.remove();

  const list = document.createElement('div');
  list.className = 'reviews-list stack';

  if (!reviews.length) {
    const empty = document.createElement('p');
    empty.className = 'text-muted';
    empty.textContent = 'Nenhuma avaliação ainda. Seja o primeiro!';
    list.appendChild(empty);
  } else {
    for (const r of reviews) {
      list.appendChild(_reviewCard(r));
    }
  }
  section.appendChild(list);
}

function _reviewCard(r) {
  const card = document.createElement('div');
  card.className = 'review-card';

  const meta = document.createElement('div');
  meta.className = 'review-meta';

  const author = document.createElement('span');
  author.className = 'review-author';
  author.textContent = r.author_name || r.legacy_reviewer_name || 'Anônimo';

  const rating = document.createElement('span');
  rating.className = 'review-rating';
  rating.textContent = `★ ${Number(r.rating).toFixed(1)}`;

  const date = document.createElement('span');
  date.className = 'review-date';
  date.textContent = new Date(r.created_at).toLocaleDateString('pt-BR');

  meta.append(author, rating, date);
  card.appendChild(meta);

  if (r.title) {
    const title = document.createElement('div');
    title.className = 'review-title';
    title.textContent = r.title;
    card.appendChild(title);
  }

  if (r.body) {
    if (r.contains_spoiler) {
      const spoilerWrap = document.createElement('div');
      spoilerWrap.className = 'spoiler';
      const mask = document.createElement('div');
      mask.className = 'spoiler-mask';
      mask.textContent = '⚠ Contém spoiler — clique para revelar';
      const body = document.createElement('p');
      body.className = 'review-body';
      body.textContent = r.body;
      spoilerWrap.append(mask, body);
      spoilerWrap.addEventListener('click', () => spoilerWrap.classList.toggle('revealed'));
      card.appendChild(spoilerWrap);
    } else {
      const body = document.createElement('p');
      body.className = 'review-body';
      body.textContent = r.body;
      card.appendChild(body);
    }
  }

  // Own review actions
  const user = getUser();
  if (user && r.user_id === user.id) {
    const acts = document.createElement('div');
    acts.className = 'cluster';
    acts.style.marginTop = 'var(--sp-2)';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-ghost btn-sm';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => _openReviewModal(r.movie_id, null, r));
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Excluir';
    delBtn.addEventListener('click', () => {
      confirmDialog('Excluir sua avaliação?', async () => {
        try {
          await deleteReview(r.movie_id);
          card.remove();
          toastOk('Avaliação excluída.');
        } catch (e) { toastError(e.message); }
      }, { title: 'Confirmar exclusão', danger: true, confirmLabel: 'Excluir' });
    });
    acts.append(editBtn, delBtn);
    card.appendChild(acts);
  }

  return card;
}

function _openReviewModal(movieId, reviewsSection, existing) {
  const form = document.createElement('div');
  form.className = 'stack';

  const starLabel = document.createElement('label');
  starLabel.className = 'form-label';
  starLabel.textContent = 'Nota (obrigatória)';
  const stars = createStarRating({ value: existing?.rating || 0, onChange: v => { stars.dataset.value = v; } });
  stars.setAttribute('aria-label', 'Selecionar nota');

  const titleGroup = document.createElement('div');
  titleGroup.className = 'form-group';
  const titleLabel = document.createElement('label');
  titleLabel.className = 'form-label';
  titleLabel.textContent = 'Título (opcional)';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'form-input';
  titleInput.maxLength = 200;
  titleInput.placeholder = 'Ex.: Uma obra-prima';
  titleInput.value = existing?.title || '';
  titleGroup.append(titleLabel, titleInput);

  const bodyGroup = document.createElement('div');
  bodyGroup.className = 'form-group';
  const bodyLabel = document.createElement('label');
  bodyLabel.className = 'form-label';
  bodyLabel.textContent = 'Crítica (opcional, 10–2000 chars)';
  const bodyInput = document.createElement('textarea');
  bodyInput.className = 'form-textarea';
  bodyInput.maxLength = 2000;
  bodyInput.placeholder = 'Escreva sua opinião sobre o filme…';
  bodyInput.value = existing?.body || '';
  bodyGroup.append(bodyLabel, bodyInput);

  const spoilerRow = document.createElement('label');
  spoilerRow.className = 'cluster';
  spoilerRow.style.cursor = 'pointer';
  const spoilerCheck = document.createElement('input');
  spoilerCheck.type = 'checkbox';
  spoilerCheck.checked = existing?.contains_spoiler || false;
  const spoilerText = document.createElement('span');
  spoilerText.className = 'text-sm';
  spoilerText.textContent = 'Contém spoiler';
  spoilerRow.append(spoilerCheck, spoilerText);

  const errEl = document.createElement('p');
  errEl.className = 'form-error';
  errEl.setAttribute('aria-live', 'polite');

  form.append(starLabel, stars, titleGroup, bodyGroup, spoilerRow, errEl);

  openModal({
    title: existing ? 'Editar avaliação' : 'Avaliar filme',
    body: form,
    confirmLabel: 'Salvar',
    onConfirm: async () => {
      const ratingVal = getStarValue(stars);
      if (!ratingVal) {
        errEl.textContent = 'Selecione uma nota.';
        return false;
      }
      const bodyVal = bodyInput.value.trim();
      if (bodyVal && bodyVal.length < 10) {
        errEl.textContent = 'Crítica deve ter ao menos 10 caracteres.';
        return false;
      }
      try {
        await upsertReview(movieId, {
          rating: ratingVal,
          title: titleInput.value.trim() || null,
          body: bodyVal || null,
          contains_spoiler: spoilerCheck.checked,
        });
        toastOk('Avaliação salva!');
        if (reviewsSection) {
          const refreshed = await movieReviews(movieId).catch(() => []);
          _renderReviews(reviewsSection, refreshed);
        }
        return true;
      } catch (e) {
        errEl.textContent = e.message;
        return false;
      }
    },
  });
}
