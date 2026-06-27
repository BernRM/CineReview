export function creditsPage() {
  const root = document.createElement('div');
  root.className = 'container page';

  const header = document.createElement('div');
  header.className = 'page-header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Créditos';
  header.appendChild(h1);
  root.appendChild(header);

  // TMDB attribution
  const tmdbSection = document.createElement('section');
  tmdbSection.className = 'panel section';

  const tmdbHeader = document.createElement('div');
  tmdbHeader.className = 'cluster';
  const tmdbLogo = document.createElement('img');
  tmdbLogo.src = 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg';
  tmdbLogo.alt = 'The Movie Database (TMDB)';
  tmdbLogo.height = 48;
  const tmdbTitle = document.createElement('h2');
  tmdbTitle.textContent = 'The Movie Database (TMDB)';
  tmdbHeader.append(tmdbLogo, tmdbTitle);

  const tmdbDesc = document.createElement('p');
  tmdbDesc.textContent = 'Este produto usa a API TMDB, mas não é endossado ou certificado pelo TMDB. Os dados de filmes, imagens e informações são fornecidos pelo The Movie Database.';

  const tmdbLink = document.createElement('a');
  tmdbLink.href = 'https://www.themoviedb.org';
  tmdbLink.target = '_blank';
  tmdbLink.rel = 'noreferrer noopener';
  tmdbLink.className = 'btn btn-ghost btn-sm';
  tmdbLink.textContent = 'Visitar TMDB ↗';

  tmdbSection.append(tmdbHeader, tmdbDesc, tmdbLink);
  root.appendChild(tmdbSection);

  // Tech stack
  const techSection = document.createElement('section');
  techSection.className = 'section';
  const techH2 = document.createElement('h2');
  techH2.textContent = 'Tecnologias utilizadas';
  techSection.appendChild(techH2);

  const techList = [
    { name: 'FastAPI', desc: 'Framework web Python de alta performance', url: 'https://fastapi.tiangolo.com' },
    { name: 'PostgreSQL', desc: 'Banco de dados relacional open source', url: 'https://www.postgresql.org' },
    { name: 'SQLAlchemy', desc: 'ORM Python para acesso ao banco de dados', url: 'https://www.sqlalchemy.org' },
    { name: 'Alembic', desc: 'Gerenciamento de migrações de banco de dados', url: 'https://alembic.sqlalchemy.org' },
    { name: 'NGINX', desc: 'Servidor web e proxy reverso', url: 'https://nginx.org' },
    { name: 'Docker', desc: 'Plataforma de contêineres', url: 'https://www.docker.com' },
    { name: 'Inter', desc: 'Tipografia para interface (Google Fonts)', url: 'https://fonts.google.com/specimen/Inter' },
    { name: 'Playfair Display', desc: 'Tipografia para títulos (Google Fonts)', url: 'https://fonts.google.com/specimen/Playfair+Display' },
  ];

  const table = document.createElement('table');
  table.className = 'data-table';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  for (const col of ['Tecnologia', 'Descrição']) {
    const th = document.createElement('th');
    th.textContent = col;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const tech of techList) {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    const link = document.createElement('a');
    link.href = tech.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = tech.name;
    tdName.appendChild(link);
    const tdDesc = document.createElement('td');
    tdDesc.textContent = tech.desc;
    tr.append(tdName, tdDesc);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  techSection.appendChild(table);
  root.appendChild(techSection);

  // Team
  const teamSection = document.createElement('section');
  teamSection.className = 'section';
  const teamH2 = document.createElement('h2');
  teamH2.textContent = 'Equipe — Grupo 7';
  teamSection.appendChild(teamH2);
  const teamP = document.createElement('p');
  teamP.className = 'text-muted';
  teamP.textContent = 'Projeto desenvolvido para a disciplina de Serviços de Redes — IFES.';
  teamSection.appendChild(teamP);
  root.appendChild(teamSection);

  return root;
}
