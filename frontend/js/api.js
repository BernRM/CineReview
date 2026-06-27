import { getCsrf, setUser } from './state.js';

const BASE = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const csrf = getCsrf();
  if (csrf && opts.method && opts.method !== 'GET') {
    headers['X-CSRF-Token'] = csrf;
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });

  if (res.status === 401) {
    setUser(null);
    throw new ApiError('Não autenticado.', 401);
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.detail || 'Erro ao acessar a API.';
    throw new ApiError(Array.isArray(msg) ? msg[0]?.msg || String(msg[0]) : msg, res.status);
  }
  return data;
}

const _get   = (path, opts) => request(path, { ...opts, method: 'GET' });
const _post  = (path, body, opts) => request(path, { ...opts, method: 'POST',  body: JSON.stringify(body) });
const _put   = (path, body, opts) => request(path, { ...opts, method: 'PUT',   body: JSON.stringify(body) });
const _patch = (path, body, opts) => request(path, { ...opts, method: 'PATCH', body: JSON.stringify(body) });
const _del   = (path, opts) => request(path, { ...opts, method: 'DELETE' });

// Auth
export const authRegister  = (username, email, password) => _post('/auth/register', { username, email, password });
export const authLogin     = (email, password) => _post('/auth/login', { email, password });
export const authLogout    = () => _post('/auth/logout', {});
export const authMe        = () => _get('/auth/me');
export const changePassword = (current_password, new_password) =>
  _post('/auth/change-password', { current_password, new_password });

// Catalog
export const catalogTrending = () => _get('/catalog/trending');
export const catalogSearch   = (q, page = 1) => _get(`/catalog/search?q=${encodeURIComponent(q)}&page=${page}`);
export const catalogGenres   = () => _get('/catalog/genres');
export const catalogMovie    = (tmdbId) => _get(`/catalog/movies/${tmdbId}`);
export const catalogDiscover = ({ genre_id, year, sort_by, page = 1 } = {}) =>
  _get(`/catalog/discover${_qs({ genre_id, year, sort_by, page })}`);

// Movies
export const movieReviews = (id) => _get(`/movies/${id}/reviews`);
export const upsertReview = (id, body) => _put(`/movies/${id}/review`, body);
export const deleteReview = (id) => _del(`/movies/${id}/review`);
export const reportReview = (reviewId, body) => _post(`/movies/reviews/${reviewId}/report`, body);

// Me
export const myProfile     = () => _get('/me/profile');
export const updateProfile = (body) => _patch('/me/profile', body);
export const myWatchlist   = () => _get('/me/watchlist');
export const addWatchlist  = (id) => _put(`/me/watchlist/${id}`, {});
export const removeWatchlist = (id) => _del(`/me/watchlist/${id}`);
export const myWatched     = () => _get('/me/watched');
export const markWatched   = (id) => _put(`/me/watched/${id}`, {});
export const unmarkWatched = (id) => _del(`/me/watched/${id}`);
export const myReviews     = () => _get('/me/reviews');

// Users
export const userProfile = (username) => _get(`/users/${username}`);

// Admin
export const adminStats          = () => _get('/admin/dashboard');
export const adminUsers          = ({ page = 1, search, status } = {}) =>
  _get(`/admin/users${_qs({ page, q: search, status })}`);
export const adminSuspendUser    = (id) => _patch(`/admin/users/${id}/status`, { status: 'suspended' });
export const adminUnsuspendUser  = (id) => _patch(`/admin/users/${id}/status`, { status: 'active' });
export const adminPromoteUser    = (id) => _patch(`/admin/users/${id}/role`, { role: 'admin' });
export const adminMovies         = ({ page = 1, search } = {}) =>
  _get(`/admin/movies${_qs({ page, q: search })}`);
export const toggleFeatured      = (id, featured) => _patch(`/admin/movies/${id}/featured`, { featured });
export const syncMovie           = (tmdbId) => _post(`/admin/movies/import/${tmdbId}`, {});
export const adminReports        = ({ page = 1, status } = {}) =>
  _get(`/admin/reports${_qs({ page, status })}`);
export const adminResolveReport  = (id, status) => _patch(`/admin/reports/${id}`, { status });
export const adminDeleteReview   = (id) => _del(`/admin/reviews/${id}`);
export const adminPublishReview  = (id) => _patch(`/admin/reviews/${id}/status`, { status: 'published' });
export const adminAudit          = (page = 1) => _get(`/admin/audit${_qs({ page })}`);

function _qs(params) {
  const q = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

// TMDB image helpers
export const posterUrl   = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
export const backdropUrl = (path, size = 'w1280') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
