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
| Logs (Trabalho 02) | Grafana Loki (agregação centralizada via HTTP) |
| Orquestração | Docker Compose (local) · **Docker Swarm** (cluster, Trabalho 02) |

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

---

# Trabalho 02 — Deploy em cluster Docker Swarm

Evolução do Trabalho 01: a mesma aplicação portada para um **cluster Docker Swarm de 2 VMs**, com separação de camadas, rede overlay, placement constraints, secret do Swarm e coleta centralizada de logs com **Grafana Loki**.

## Topologia do cluster

```
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│  VM1 — Camada de Dados (worker)   │        │ VM2 — Camada de Aplicação (manager)│
│  label: tier=data                 │        │ label: tier=app                    │
│                                   │        │                                    │
│   ┌────────────┐  ┌───────────┐   │        │  ┌─────────┐   ┌─────────────┐    │
│   │ PostgreSQL │  │   Loki    │   │        │  │  NGINX  │   │   FastAPI   │    │
│   │  :5432     │  │  :3100    │   │        │  │ :80/:443│   │   :8080     │    │
│   │  1 réplica │  │ 1 réplica │   │        │  │2 réplicas│  │  2 réplicas │    │
│   └────────────┘  └───────────┘   │        │  └─────────┘   └─────────────┘    │
│                                   │        │  ┌──────────────────────────┐     │
│  (sem portas expostas ao host)    │        │  │ Grafana :3000 (extra)    │     │
│                                   │        │  └──────────────────────────┘     │
└─────────────────┬─────────────────┘        └─────────────────┬─────────────────┘
                  │                                             │
                  └────────── rede overlay (cineview_net) ──────┘
```

| Serviço | VM | Réplicas | Exposto ao host |
|---|---|---|---|
| PostgreSQL | VM1 (`tier=data`) | 1 | Não |
| Loki | VM1 (`tier=data`) | 1 | Não |
| NGINX | VM2 (`tier=app`) | 2 | **Sim (80/443)** |
| FastAPI | VM2 (`tier=app`) | 2 | Não |
| Grafana (extra) | VM2 (`tier=app`) | 1 | Sim (3000) |

## Arquivos do Trabalho 02

| Caminho | Função |
|---|---|
| `docker-stack/docker-stack.yml` | Stack do Swarm: serviços, overlay, constraints, secret, configs, réplicas |
| `docker-stack/.env.example` | Variáveis do deploy (exportar antes do `stack deploy`) |
| `loki/loki-config.yaml` | Configuração do Loki (filesystem + tsdb) |
| `grafana/datasource.yaml` | Datasource do Loki provisionado no Grafana |
| `backend/app/logger.py` | Cliente HTTP que envia logs ao Loki (`/loki/api/v1/push`) |

## Pré-requisitos

- 2 VMs Linux com Docker Engine, na mesma rede, podendo se enxergar.
- **VM2 = manager** (e ponto de entrada); **VM1 = worker** (dados).

## Passo a passo do deploy

> Os comandos `docker stack`, `docker node`, `docker secret` rodam **na VM2 (manager)**.

### 1. Iniciar o Swarm e juntar as VMs

```bash
# Na VM2 (manager):
docker swarm init --advertise-addr <IP-VM2>
# O comando acima imprime um 'docker swarm join ...'; copie-o.

# Na VM1 (worker), cole o token gerado:
docker swarm join --token <TOKEN> <IP-VM2>:2377

# De volta na VM2, confira os nós:
docker node ls
```

### 2. Rotular os nós (separação de camadas)

```bash
# Na VM2 — use os nomes que aparecem em 'docker node ls':
docker node update --label-add tier=data <nó-da-VM1>
docker node update --label-add tier=app  <nó-da-VM2>
```

### 3. Criar o secret da senha do banco

```bash
printf "minha_senha_forte" | docker secret create db_password -
docker secret ls
```

### 4. Construir as imagens custom na VM2

`docker stack deploy` não faz build. Como NGINX e FastAPI ficam fixos na VM2, basta buildá-los nela (Postgres, Loki e Grafana usam imagens oficiais):

```bash
# Na VM2, a partir da raiz do repositório:
docker build -t cineview-fastapi:latest ./backend
docker build -t cineview-nginx:latest  -f nginx/Dockerfile .
```

### 5. Configurar variáveis e implantar a stack

```bash
# Na VM2, a partir da raiz do repositório:
cp docker-stack/.env.example docker-stack/.env   # ajuste ADMIN_PASSWORD, SESSION_SECRET...
set -a; . docker-stack/.env; set +a              # docker stack NÃO lê .env sozinho

docker stack deploy -c docker-stack/docker-stack.yml cineview
```

### 6. Verificar o estado

```bash
docker stack services cineview          # réplicas de cada serviço (ex.: 2/2)
docker service ps cineview_fastapi       # em qual nó cada tarefa está rodando
docker service ps cineview_postgres      # deve estar na VM1
docker node ps <nó-da-VM1>               # tarefas rodando na VM1
```

Acesse a aplicação em `http://<IP-VM2>` (ou `https://<IP-VM2>`).

## Consultar logs no Loki (via API HTTP)

O FastAPI envia ao Loki: inicialização da app, cada requisição (método/rota/status) e erros de conexão com o PostgreSQL. Consulte direto pela API HTTP (a partir da VM1, ou de qualquer nó usando o IP da VM1):

```bash
# Labels disponíveis
curl http://<IP-VM1>:3100/loki/api/v1/labels

# Logs do FastAPI nos últimos 10 minutos
curl -G 'http://<IP-VM1>:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={service="fastapi"}' \
  --data-urlencode 'start='"$(date -d '10 minutes ago' +%s000000000)" \
  --data-urlencode 'end='"$(date +%s000000000)"
```

> Como o Loki **não expõe porta ao host externo**, rode o `curl` de dentro do cluster (ex.: na VM1) ou de um container anexado à rede `cineview_net`.

## Grafana (interface visual — desafio extra)

Acesse `http://<IP-VM2>:3000` → **Explore** → datasource **Loki** → query `{service="fastapi"}`. O datasource já vem provisionado apontando para `http://loki:3100`. Acesso anônimo (Viewer) habilitado; login admin: usuário `admin`, senha definida em `GRAFANA_ADMIN_PASSWORD`.

## Comprovar isolamento de rede

```bash
# A partir de uma máquina FORA do cluster, estas conexões devem FALHAR:
curl http://<IP-VM1>:5432    # PostgreSQL — recusado
curl http://<IP-VM1>:3100    # Loki — recusado (não publicado ao host)
# Apenas o NGINX responde:
curl -I http://<IP-VM2>      # 200/30x
```

## Remover a stack

```bash
docker stack rm cineview
# (os volumes postgres_data e loki_data persistem; remova-os manualmente se quiser zerar)
```
