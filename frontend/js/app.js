import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { authMe } from './api.js';
import { setUser, isLoggedIn } from './state.js';
import { route, navigate, init } from './router.js';

import { homePage }         from './pages/home.js';
import { explorePage }      from './pages/explore.js';
import { searchPage }       from './pages/search.js';
import { moviePage }        from './pages/movie.js';
import { loginPage }        from './pages/login.js';
import { registerPage }     from './pages/register.js';
import { profilePage }      from './pages/profile.js';
import { watchlistPage }    from './pages/watchlist.js';
import { watchedPage }      from './pages/watched.js';
import { settingsPage }     from './pages/settings.js';
import { creditsPage }      from './pages/credits.js';
import { adminLoginPage }   from './pages/adminLogin.js';
import { adminDashboard }   from './pages/admin/dashboard.js';
import { adminMoviesPage }  from './pages/admin/movies.js';
import { adminUsersPage }   from './pages/admin/users.js';
import { adminModerationPage } from './pages/admin/moderation.js';

// Register all routes
route('/',               () => homePage());
route('/explorar',       () => explorePage());
route('/buscar',         (_, params) => searchPage(params));
route('/filme/:tmdb_id', (p) => moviePage(p));
route('/filme/local/:local_id', (p) => moviePage(p));
route('/login',          () => loginPage());
route('/cadastro',       () => registerPage());
route('/perfil/:username', (p) => profilePage(p));
route('/minha-lista',    () => watchlistPage());
route('/assistidos',     () => watchedPage());
route('/configuracoes',  () => settingsPage());
route('/creditos',       () => creditsPage());
route('/admin/login',    () => adminLoginPage());
route('/admin',          () => adminDashboard());
route('/admin/filmes',   () => adminMoviesPage());
route('/admin/usuarios', () => adminUsersPage());
route('/admin/moderacao',() => adminModerationPage());

// Bootstrap
(async () => {
  // Check auth silently — ignore errors (user just isn't logged in)
  try {
    const me = await authMe();
    if (me) setUser(me);
  } catch (_) {}

  // Presentation entry point: unauthenticated visitors start at the login page.
  if (location.pathname === '/' && !isLoggedIn()) {
    history.replaceState(null, '', '/login');
  }

  // Render persistent layout
  renderHeader();
  renderFooter();

  // Intercept internal <a> clicks for SPA navigation (router handles this globally)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (
      !href ||
      href.startsWith('http') ||
      href.startsWith('//') ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      a.target === '_blank'
    ) return;
    e.preventDefault();
    navigate(href);
  });

  // Start router
  const root = document.getElementById('page-root');
  if (root) init(root);
})();
