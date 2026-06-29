<div align="center">

# CineView

Sistema de filmes e avaliações com autenticação, TMDB, painel administrativo e SPA.

![Docker Compose](https://img.shields.io/badge/Docker%20Compose-Orquestracao-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![NGINX](https://img.shields.io/badge/NGINX-Proxy%20Reverso-009639?style=for-the-badge&logo=nginx&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Banco%20de%20Dados-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

</div>

## Sobre o Projeto

O **CineView** é uma aplicação web conteinerizada para descobrir, avaliar e organizar filmes. Integra dados do TMDB (The Movie Database), autenticação por sessão segura (opaque token + cookie HttpOnly + CSRF), RBAC (user/admin) e uma SPA de 16 rotas com design cinema-editorial.

**Grupo 7 — Disciplina: Serviços de Redes para Internet — IFES**

## Integrantes

- Bernard Rodrigues Moreira Andrade
- Maria Laura Barbosa Lourenco Cesar
- Emily Bedim Jorge Borges

## Stack

| Camada | Tecnologia |
|---|---|
| Proxy e frontend estático | NGINX |
| Backend API | FastAPI + Python 3.12 |
| ORM / Banco | SQLAlchemy v2 + PostgreSQL 16 |
| Migrações | Alembic |
| Hashing | pwdlib (Argon2id) |
| Integração | TMDB API v3 (httpx + cache TTL) |
| Frontend | SPA ES Modules (sem framework) |
| Testes | pytest + SQLite in-memory + Playwright |
| Orquestração | Docker Compose |

## Arquitetura

```
                    ┌────────────────────────────────────────────┐
                    │           rede: netatividade01             │
  Navegador         │                                            │
  :80 / :443 ──────►  NGINX  ──/api──►  FastAPI :8080          │
                    │    │                   │                   │
                    │    └──/──► HTML/CSS/JS │                   │
                    │                   SQLAlchemy               │
                    │                        │                   │
                    │                   PostgreSQL :5432         │
                    │                   volume: postgres_data    │
                    └────────────────────────────────────────────┘
```

**Somente NGINX é exposto ao host (portas 80:8080 e 443:8443). FastAPI e PostgreSQL são internos.**

## Pré-requisitos

- Docker Desktop instalado e em execução
- Arquivo `.env` na raiz (copiar de `.env.example`)

## Configuração

```bash
cp .env.example .env
```

Edite `.env` com os valores reais:

```env
POSTGRES_PASSWORD=troque_esta_senha
POSTGRES_DB=cinereview
TMDB_API_TOKEN=seu_token_tmdb_aqui        # Bearer token v4 do TMDB
SESSION_SECRET=string_aleatoria_longa     # Segredo para hash de sessão
COOKIE_SECURE=false                       # true em produção HTTPS
ADMIN_EMAIL=admin@exemplo.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=senha_forte_do_admin
DEMO_SEED_ENABLED=true                   # Dados prontos para apresentação
```

> Para obter o `TMDB_API_TOKEN`: crie conta em themoviedb.org → Configurações → API → "API Read Access Token (v4)".

## Como Executar

```bash
docker compose up --build
```

| Recurso | URL |
|---|---|
| Frontend SPA | http://localhost |
| Documentação API | http://localhost/api/docs |
| Health check | http://localhost/api/health |
| Admin | http://localhost/admin/login |

O primeiro admin é criado automaticamente a partir das variáveis `ADMIN_*` do `.env` (apenas se não existir nenhum admin).

Com `DEMO_SEED_ENABLED=true`, o primeiro boot também prepara filmes, gêneros,
avaliações, listas e duas contas didáticas:

| Acesso | E-mail | Senha |
|---|---|---|
| Usuário | `usuario@cineview.local` | `CineView@User2026` |
| Administrador | `admin@cineview.local` | `CineView@Admin2026` |

Os dados são idempotentes e não se duplicam ao reiniciar. Para um ambiente sem
conteúdo de apresentação, defina `DEMO_SEED_ENABLED=false`.

## Migrações

As migrações rodam automaticamente ao subir o container (`alembic upgrade head`):

- `001_initial_schema` — cria todas as novas tabelas (users, sessions, movies, genres, reviews, watchlist, watched, reports, audit_log)
- `002_migrate_legacy_data` — migra dados das tabelas `filmes`/`avaliacoes` para `movies`/`reviews` (no-op se não existirem)
- `003_report_history` — permite histórico de denúncias mantendo bloqueio de duplicatas abertas na API

## Rotas da API

### Auth (`/api/auth`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/register` | Cadastro (cria sessão automática) |
| POST | `/login` | Login (seta cookies session + csrf_token) |
| POST | `/logout` | Encerra sessão (requer CSRF) |
| GET | `/me` | Dados do usuário autenticado |
| POST | `/change-password` | Alterar senha (requer CSRF) |

### Catálogo (`/api/catalog`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/trending` | Filmes em destaque + tendências TMDB |
| GET | `/search?q=...` | Busca por título |
| GET | `/genres` | Lista de gêneros |
| GET | `/movies/{tmdb_id}` | Detalhe de filme (sincroniza com TMDB) |
| GET | `/discover` | Descoberta com filtros (gênero, ano, ordem) |

### Filmes (`/api/movies`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/{id}` | Detalhe de filme local |
| GET | `/{id}/reviews` | Avaliações publicadas |
| PUT | `/{id}/review` | Criar/atualizar avaliação (autenticado) |
| DELETE | `/{id}/review` | Remover avaliação (autenticado) |
| POST | `/reviews/{rid}/report` | Reportar avaliação (autenticado) |

### Perfil do usuário (`/api/me`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/profile` | Ver próprio perfil |
| PATCH | `/profile` | Atualizar nome/bio |
| GET/PUT/DELETE | `/watchlist/{id}` | Gerenciar lista |
| GET/PUT/DELETE | `/watched/{id}` | Gerenciar assistidos |

### Admin (`/api/admin`) — requer role admin

| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard` | Estatísticas + atividade recente |
| GET/PATCH | `/users` / `/users/{id}/status` | Listar/suspender usuários |
| PATCH | `/users/{id}/role` | Promover a admin |
| GET/POST/PATCH | `/movies` / `/movies/{id}` | Listar/criar/editar filmes |
| PATCH | `/movies/{id}/featured` | Destacar filme |
| POST | `/movies/import/{tmdb_id}` | Importar filme do TMDB |
| GET/PATCH | `/reports` / `/reports/{id}` | Moderar reportes |
| GET/PATCH/DELETE | `/reviews` / `/reviews/{id}/status` / `/reviews/{id}` | Moderar avaliações |

## Segurança

- **Senhas**: hash Argon2id via `pwdlib`
- **Sessão**: token opaco `secrets.token_urlsafe(32)`, somente HMAC-SHA-256 armazenado no DB
- **Cookie de sessão**: `HttpOnly; SameSite=Lax; Secure` (configurável)
- **CSRF**: double-submit cookie pattern (`csrf_token` legível + `X-CSRF-Token` header)
- **XSS**: frontend usa `textContent`, `createElementNS`, `replaceChildren` — sem `innerHTML` com dados de usuário
- **RBAC**: roles `user`/`admin`, verificados em cada endpoint protegido
- **Login**: limite de tentativas por IP/e-mail
- **NGINX**: CSP, proteção contra framing, MIME sniffing e política de referrer

## Testes

Os testes backend rodam **dentro do container** com SQLite in-memory (sem PostgreSQL):

```bash
docker compose run --rm fastapi pytest
```

Cobertura:

| Arquivo | O que testa |
|---|---|
| `test_passwords.py` | Hash Argon2id (unitário) |
| `test_auth.py` | Register, login, me, logout via TestClient |
| `test_catalog.py` | Endpoints de catálogo |
| `test_movies.py` | Reviews, watchlist, watched |
| `test_admin.py` | RBAC (401/403), CSRF obrigatório, suspend user |

Testes de ponta a ponta exigem Node.js e a aplicação em execução:

```bash
npm install
npx playwright install chromium
npm run typecheck
docker compose up -d --build
npm run test:e2e
```

A suíte E2E valida inicialização da SPA, cadastro, perfil, autorização,
administração, filme local, watchlist, assistidos, avaliações e layout móvel.
Ela usa `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`; quando não definidos, assume
`admin@cineview.local` e `CineView@Admin2026`. Use um banco de
desenvolvimento, pois os fluxos criam usuários e filmes identificados como E2E.

## Comandos Úteis

```bash
# Subir em background
docker compose up -d --build

# Ver logs
docker compose logs -f fastapi

# Entrar no PostgreSQL
docker compose exec postgres psql -U postgres -d cinereview

# Rodar testes
docker compose run --rm fastapi pytest

# Validar tipos do backend com Pyright
npm run typecheck

# Rodar testes no navegador (com a aplicação já em execução)
npm run test:e2e

# Parar sem apagar dados
docker compose down
```

## Estrutura do Projeto

```
.
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── alembic.ini
│   ├── alembic/versions/
│   │   ├── 001_initial_schema.py
│   │   ├── 002_migrate_legacy_data.py
│   │   └── 003_report_history.py
│   ├── app/
│   │   ├── config.py          # Configurações via pydantic-settings
│   │   ├── database.py        # Engine, SessionLocal, Base
│   │   ├── main.py            # App FastAPI e lifespan
│   │   ├── dependencies.py    # get_current_user, get_admin_user, require_csrf
│   │   ├── models/            # SQLAlchemy: user, session, movie, review, library, moderation
│   │   ├── schemas/           # Pydantic: auth, movie, review, admin
│   │   ├── routers/           # auth, catalog, movies, users, admin
│   │   ├── security/          # passwords (Argon2id), sessions (SHA-256), csrf
│   │   └── services/          # tmdb (httpx + cache), movie_sync, ratings
│   └── tests/
│       ├── conftest.py        # SQLite in-memory, TestClient
│       └── test_*.py
├── frontend/
│   ├── index.html
│   ├── css/                   # tokens, base, layout, components, pages, responsive
│   └── js/
│       ├── app.js             # Entry point: router + auth bootstrap
│       ├── api.js             # fetch client com CSRF
│       ├── router.js          # pushState SPA router
│       ├── state.js           # pub/sub global state
│       ├── components/        # header, footer, modal, toast, movieCard, starRating
│       ├── utils/             # escape, debounce, lazyImages
│       └── pages/             # home, explore, search, movie, login, register,
│                              # profile, watchlist, watched, settings, credits,
│                              # adminLogin, admin/dashboard, admin/movies,
│                              # admin/users, admin/moderation
├── nginx/
│   ├── Dockerfile
│   └── default.conf
├── tests/e2e/                 # Fluxos Playwright desktop/mobile
├── package.json
├── playwright.config.js
├── .env.example
├── docker-compose.yml
└── docs/                      # Guias de estudo, roteiro e enunciado do trabalho
```

## Observações

- O backend e o banco **não são expostos ao hospedeiro**.
- O frontend nunca chama o FastAPI diretamente — usa `/api` via NGINX.
- O TMDB é opcional: sem token configurado, o catálogo mostra apenas dados locais.
- Não use `docker compose down -v` em produção — apaga o volume do banco.
