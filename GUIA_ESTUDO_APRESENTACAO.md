# Guia de Estudo para Apresentacao e Entrevista - CineView

Este guia cobre tanto a apresentacao do projeto quanto as possiveis perguntas da entrevista individual.

## 1. Resumo em 30 segundos

> O CineView e uma aplicacao web conteinerizada para descobrir, avaliar e organizar filmes. O projeto tem tres containers: NGINX, FastAPI e PostgreSQL. O NGINX e o unico exposto ao hospedeiro, nas portas 80 e 443. Ele serve o frontend estatico e encaminha `/api` para o FastAPI. O FastAPI expoe uma API REST com autenticacao por sessao, RBAC (usuario/admin), integracao com TMDB e acessa o PostgreSQL pela rede Docker interna `netatividade01`. O banco usa volume Docker para persistir os dados.

**Grupo 7 — Sistema de Filmes e Avaliacoes**

## 2. O que o professor pediu e onde esta no projeto

| Requisito | Onde mostrar |
|---|---|
| Docker Compose com nginx, fastapi, postgres | `docker-compose.yml` |
| Somente NGINX exposto ao hospedeiro | Apenas `nginx` tem `ports` |
| Portas `80:8080` e `443:8443` | `docker-compose.yml` |
| Frontend estatico servido pelo NGINX | `nginx/Dockerfile` e `nginx/default.conf` |
| Proxy reverso `/api` para FastAPI | `nginx/default.conf` |
| FastAPI na porta interna 8080 | `backend/Dockerfile` |
| PostgreSQL com usuario `postgres` | `docker-compose.yml` |
| Senha do banco por `.env` | `.env.example` e `docker-compose.yml` |
| Volume persistente | `postgres_data` em `docker-compose.yml` |
| Rede Docker `netatividade01` | `docker-compose.yml` |
| CRUD completo do tema (filmes e avaliacoes) | `backend/app/routers/movies.py` e `catalog.py` |
| Frontend consumindo a API | `frontend/js/api.js` |
| Documentacao para executar e testar | `README.md` |

## 3. Fluxo da aplicacao

1. O usuario acessa `http://localhost`.
2. O NGINX recebe a requisicao na porta 80 do computador.
3. O NGINX entrega `index.html`, CSS e modulos JS.
4. O JavaScript (SPA) chama rotas como `/api/catalog/trending`.
5. O NGINX recebe `/api/*` e encaminha para `http://fastapi:8080`.
6. O FastAPI processa a rota, usa SQLAlchemy para consultar o PostgreSQL e pode chamar o TMDB.
7. O PostgreSQL grava os dados no volume `postgres_data`.
8. A resposta volta como JSON para o frontend, que atualiza a tela via DOM.

Frase curta:

> O navegador fala com o NGINX. O NGINX fala com o FastAPI. O FastAPI fala com o PostgreSQL e com o TMDB. Os dados ficam no volume Docker.

## 4. Arquitetura modular do backend

```
backend/app/
├── config.py          → variaveis de ambiente com pydantic-settings
├── database.py        → engine SQLAlchemy, Base, get_db()
├── main.py            → app FastAPI, lifespan (bootstrap admin), CORS, routers
├── dependencies.py    → get_current_user, get_admin_user, require_csrf
├── models/            → User, Session, Movie, Genre, Review, Watchlist, Watched, Report, AuditLog
├── schemas/           → RegisterRequest, LoginRequest, UserMeResponse, DashboardStats...
├── routers/
│   ├── auth.py        → register, login, logout, me, change-password
│   ├── catalog.py     → trending, search, genres, movie detail, discover
│   ├── movies.py      → reviews (CRUD), report
│   ├── users.py       → me/profile, watchlist, watched
│   └── admin.py       → dashboard, users, movies, reports, moderation, audit
├── security/
│   ├── passwords.py   → hash_password, verify_password (Argon2id)
│   ├── sessions.py    → create_session, get_session_by_token, revoke_session (SHA-256)
│   └── csrf.py        → constantes SESSION_COOKIE, CSRF_HEADER
└── services/
    ├── tmdb.py        → httpx + cache TTL, get_trending, search_movies, get_movie_detail
    ├── movie_sync.py  → upsert_movie_from_tmdb, get_or_sync_movie
    └── ratings.py     → compute_community_rating
```

## 5. Seguranca implementada

**Senhas:**
- Hash Argon2id via `pwdlib` — resistente a brute-force
- Verificacao segura (timing-safe)

**Sessoes:**
- Token gerado com `secrets.token_urlsafe(32)` — 256 bits de entropia
- Apenas o SHA-256 do token e armazenado no banco
- Cookie `session`: `HttpOnly; SameSite=Lax` — JavaScript nao pode ler
- Sessoes tem TTL e podem ser revogadas individualmente ou todas de um usuario

**CSRF:**
- Double-submit cookie: servidor seta `csrf_token` (legivel) + `session` (HttpOnly)
- Frontend le o `csrf_token` do cookie e envia como header `X-CSRF-Token`
- Backend verifica o header em todas as operacoes mutantes (POST, PUT, PATCH, DELETE)

**XSS:**
- Frontend usa `textContent`, `createElementNS`, `replaceChildren` em todo lugar
- Sem `innerHTML` com dados vindos do usuario

**RBAC:**
- Roles `user` e `admin` na tabela `users`
- Dependencias `get_admin_user` protegem todos os endpoints `/api/admin`
- Admin suspenso nao consegue acessar (sessoes revogadas)

## 6. Migraciones com Alembic

```
001_initial_schema.py  → cria users, sessions, movies, genres, reviews,
                         watchlist_items, watched_movies, review_reports, admin_audit_logs
002_migrate_legacy_data.py → migra filmes→movies e avaliacoes→reviews (safe: no-op se nao existir)
003_report_history.py → permite manter historico de denuncias resolvidas
```

Rodam automaticamente ao subir o container:
```
CMD alembic upgrade head && uvicorn app.main:app ...
```

## 7. Frontend SPA

**Estrutura de modulos ES:**
- `app.js` — entry point: bootstrap auth, registra rotas, init router
- `router.js` — pushState router (sem framework)
- `state.js` — estado global (user, csrfToken) com pub/sub
- `api.js` — cliente fetch com CSRF automatico

**Paginas registradas:**
- `/` home com hero + tendencias
- `/explorar` catalogo com filtros (genero, ano, ordem)
- `/buscar` busca com debounce
- `/filme/:tmdb_id` detalhe: backdrop, poster, trailer, elenco, avaliacoes
- `/login` e `/cadastro` formularios de autenticacao
- `/perfil/:username` perfil publico
- `/minha-lista` e `/assistidos` biblioteca pessoal
- `/configuracoes` perfil e senha
- `/creditos` atribuicoes TMDB
- `/admin/login`, `/admin`, `/admin/filmes`, `/admin/usuarios`, `/admin/moderacao`

## 8. Perguntas frequentes de entrevista

**P: Por que somente o NGINX e exposto?**
R: Para seguir o principio de menor exposicao. O FastAPI e o PostgreSQL ficam na rede interna `netatividade01` e so sao acessiveis por outros containers. O NGINX e o unico ponto de entrada.

**P: O que e um proxy reverso?**
R: Um servidor que recebe as requisicoes do cliente e as encaminha para outro servidor interno. Aqui o NGINX encaminha `/api` para `http://fastapi:8080`.

**P: Por que usar volume Docker para o banco?**
R: Sem volume, os dados do PostgreSQL seriam perdidos ao parar o container. O volume `postgres_data` persiste os dados no hospedeiro.

**P: O que e o TMDB?**
R: The Movie Database — API publica de filmes. O backend busca dados (poster, sinopse, trailer, elenco) e armazena em cache TTL de 1h para nao exceder os limites de requisicao.

**P: O que e Alembic?**
R: Ferramenta de migracao de schema para SQLAlchemy. Permite evoluir o banco sem perder dados — cada migracao e uma mudanca incremental versionada.

**P: O que e CSRF?**
R: Cross-Site Request Forgery — ataque onde um site malicioso faz requisicoes em nome do usuario. Mitigamos com double-submit cookie: o servidor seta um token legivel, o frontend o envia como header, e o backend verifica que os valores batem.

**P: Como funciona a autenticacao?**
R: Login → gera token aleatorio → armazena HMAC-SHA-256 no banco usando o segredo da aplicação → retorna token em cookie HttpOnly. Em cada requisicao autenticada, o backend busca a sessao pelo hash do cookie.

**P: O que e RBAC?**
R: Role-Based Access Control — controle de acesso por papel. Usuarios tem role `user` ou `admin`. Endpoints `/api/admin` so sao acessiveis com role `admin`.

**P: Como rodar os testes?**
R: `docker compose run --rm fastapi pytest` testa o backend com SQLite em memoria. `npm run typecheck` valida os tipos Python. `npm run test:e2e` valida os fluxos reais no navegador com Playwright.

## 9. Roteiro de demonstracao

1. Mostrar `docker-compose.yml` — tres servicos, rede, volume, portas somente no nginx
2. Mostrar `nginx/default.conf` — proxy reverso `/api`
3. Abrir `http://localhost` — home page com filmes do TMDB
4. Registrar uma conta — mostrar cookie de sessao no DevTools
5. Adicionar filme a lista / marcar assistido
6. Avaliar um filme com estrelas
7. Abrir `http://localhost/admin/login` — login admin
8. Mostrar dashboard de admin, importar filme do TMDB, ver lista de usuarios
9. Abrir `http://localhost/api/docs` — documentacao FastAPI automatica
10. Mostrar `backend/app/routers/auth.py` — seguranca de sessao
11. Mostrar `backend/tests/` — testes pytest
