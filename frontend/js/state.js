/** Minimal reactive state store. */
const _listeners = new Map();
const state = {
  user: null,      // null = not logged in, object = logged in user
  csrfToken: null, // read from csrf_token cookie after login
};

function getCsrfCookie() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function getState() { return state; }

export function setUser(user) {
  state.user = user;
  state.csrfToken = user ? getCsrfCookie() : null;
  emit('auth');
}

export function getUser() { return state.user; }
export function isLoggedIn() { return state.user !== null; }
export function isAdmin() { return state.user?.role === 'admin'; }
export function getCsrf() {
  if (!state.csrfToken) state.csrfToken = getCsrfCookie();
  return state.csrfToken;
}

export function on(event, cb) {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event).add(cb);
  return () => _listeners.get(event).delete(cb);
}

function emit(event) {
  _listeners.get(event)?.forEach(cb => cb(state));
}
