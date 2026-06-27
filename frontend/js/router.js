const _routes = [];

export function route(pattern, handler) {
  _routes.push({ pattern: _compile(pattern), handler });
}

export function navigate(path, replace = false) {
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  _dispatch(location.pathname, location.search);
}

export function init(rootEl) {
  window.addEventListener('popstate', () => _dispatch(location.pathname, location.search));
  _dispatch(location.pathname, location.search);
}

async function _dispatch(pathname, search = '') {
  for (const { pattern, handler } of _routes) {
    const params = _match(pattern, pathname);
    if (params !== null) {
      const el = document.getElementById('page-root');
      if (!el) return;

      // Show spinner while loading
      el.replaceChildren();
      const spinner = document.createElement('div');
      spinner.className = 'loading-center';
      const spin = document.createElement('div');
      spin.className = 'spinner';
      spinner.appendChild(spin);
      el.appendChild(spinner);

      // Parse query params and merge into params object
      const qp = {};
      new URLSearchParams(search).forEach((v, k) => { qp[k] = v; });

      try {
        const content = await handler(params, qp);
        el.replaceChildren();
        if (content instanceof Node) el.appendChild(content);
      } catch (err) {
        console.error('Router error:', err);
        el.replaceChildren();
        const errWrap = document.createElement('div');
        errWrap.className = 'empty-state container';
        const h3 = document.createElement('h3');
        h3.textContent = 'Erro ao carregar a página';
        const p = document.createElement('p');
        p.textContent = err.message;
        errWrap.append(h3, p);
        el.appendChild(errWrap);
      }
      return;
    }
  }
  // 404
  const el = document.getElementById('page-root');
  if (!el) return;
  el.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'empty-state container';
  const h3 = document.createElement('h3');
  h3.textContent = 'Página não encontrada';
  const a = document.createElement('a');
  a.href = '/';
  a.className = 'btn btn-ghost';
  a.textContent = 'Voltar ao início';
  wrap.append(h3, a);
  el.appendChild(wrap);
}

function _compile(pattern) {
  const parts = pattern.split('/').map(p => {
    if (p.startsWith(':')) return { name: p.slice(1), re: '([^/]+)' };
    if (p === '*') return { name: '*', re: '(.*)' };
    return { name: null, re: p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };
  });
  return { parts, re: new RegExp('^' + parts.map(p => p.re).join('/') + '/?$') };
}

function _match(pattern, path) {
  const m = path.match(pattern.re);
  if (!m) return null;
  const params = {};
  let idx = 1;
  for (const p of pattern.parts) {
    if (p.name) params[p.name] = decodeURIComponent(m[idx++]);
  }
  return params;
}
