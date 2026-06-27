export function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;

  el.className = 'site-footer';
  const container = document.createElement('div');
  container.className = 'container footer-inner';

  // Brand
  const brand = document.createElement('span');
  brand.className = 'text-sm text-muted';
  brand.textContent = '© 2026 CineView — Grupo 7';

  // Links
  const links = document.createElement('div');
  links.className = 'footer-links';
  for (const { label, href } of [
    { label: 'Início',    href: '/' },
    { label: 'Explorar', href: '/explorar' },
    { label: 'Créditos', href: '/creditos' },
    { label: 'API Docs', href: '/api/docs' },
  ]) {
    const a = document.createElement('a');
    a.className = 'footer-link';
    a.href = href;
    a.textContent = label;
    if (href === '/api/docs') { a.target = '_blank'; a.rel = 'noreferrer'; }
    links.appendChild(a);
  }

  // TMDB attribution
  const tmdb = document.createElement('div');
  tmdb.className = 'tmdb-attr';
  const tmdbText = document.createElement('span');
  tmdbText.textContent = 'Powered by';
  const tmdbImg = document.createElement('img');
  tmdbImg.src = 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg';
  tmdbImg.alt = 'The Movie Database (TMDB)';
  tmdbImg.height = 16;
  tmdb.append(tmdbText, tmdbImg);

  container.append(brand, links, tmdb);
  el.appendChild(container);
}
