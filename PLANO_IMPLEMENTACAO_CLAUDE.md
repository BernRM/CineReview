# Plano Mestre de Implementação — CineReview

> Documento operacional para execução pelo Claude Code.
>
> Data de criação: 27 de junho de 2026.
>
> Este documento é a fonte de verdade da reformulação. Leia-o integralmente antes
> de editar qualquer arquivo e mantenha suas decisões coerentes durante toda a
> implementação.

## 1. Missão

Transformar o CineReview atual em uma plataforma profissional de descoberta,
organização pessoal e avaliação de filmes, mantendo a infraestrutura exigida
pela disciplina:

- NGINX como única entrada pública e servidor do frontend;
- FastAPI como backend;
- PostgreSQL como banco de dados;
- Docker Compose como orquestrador;
- volume persistente `postgres_data`;
- rede Docker `netatividade01`;
- portas públicas `80:8080` e `443:8443`;
- comunicação do frontend com o backend exclusivamente por `/api`.

A reformulação pode alterar frontend, backend, banco, dependências da aplicação,
documentação e variáveis de ambiente. Não deve substituir a stack, adicionar
outro serviço runtime ou expor diretamente FastAPI/PostgreSQL ao host.

## 2. Resultado esperado

O produto final deve oferecer:

1. Área pública para descobrir, pesquisar e consultar filmes.
2. Cadastro, login e sessão para usuários.
3. Perfil de usuário, lista para assistir e filmes assistidos.
4. Uma avaliação por usuário e por filme, com nota e crítica opcional.
5. Integração do backend com a API do TMDB para metadados e imagens.
6. Área administrativa separada para catálogo, usuários, destaques e moderação.
7. Interface cinematográfica distinta, responsiva, acessível e consistente.
8. Segurança adequada para autenticação, autorização e conteúdo de usuários.
9. Migrações versionadas do banco.
10. Testes automatizados e validação real pelo Docker Compose.

## 3. Estado atual que deve ser respeitado

Antes da implementação:

- a única branch deve continuar sendo `main`;
- não criar branch de trabalho;
- não usar `git reset --hard`, `git checkout --` ou qualquer comando que apague
  alterações;
- não fazer push sem solicitação explícita do usuário;
- existem alterações locais anteriores nos arquivos:
  - `.env.example`;
  - `GUIA_ESTUDO_APRESENTACAO.md`;
  - `frontend/app.js`;
  - `frontend/index.html`;
  - `frontend/styles.css`.
- essas alterações pertencem ao usuário e devem ser preservadas;
- este documento também será uma alteração local legítima.

Primeiras ações obrigatórias:

1. Executar `git status --short --branch`.
2. Inspecionar o diff existente.
3. Ler `README.md`, `docker-compose.yml`, `nginx/default.conf`, Dockerfiles,
   backend e frontend completos.
4. Executar `docker compose config`.
5. Se o Docker estiver disponível, subir e validar o sistema atual antes da
   reformulação.
6. Criar um commit local de segurança com o estado atual antes das alterações
   estruturais. Não enviar ao remoto.

Se o estado atual não subir, documentar o problema e corrigir apenas se for
necessário para estabelecer a linha de base.

## 4. Princípios de execução

- Implementar em fases pequenas e verificáveis.
- Não reescrever Docker/NGINX sem necessidade concreta.
- Não sacrificar segurança em favor de uma demonstração visual.
- Não deixar botões decorativos: toda ação apresentada deve funcionar.
- Não expor credenciais no frontend, Git ou logs.
- Não inventar respostas do TMDB quando a API falhar.
- Preservar dados locais sempre que uma migração segura for possível.
- Preferir código claro e modular a abstrações excessivas.
- Usar HTML, CSS e JavaScript modular no frontend, sem introduzir um novo
  container ou processo Node em runtime.
- Não transformar o projeto em microserviços.
- Não implementar funcionalidades futuras antes do núcleo estar estável.
- Ao terminar cada fase: testar, revisar o diff e criar um commit local.

## 5. Escopo funcional

### 5.1 Visitante

O visitante pode:

- acessar a página inicial;
- visualizar tendências, lançamentos e filmes destacados;
- pesquisar filmes;
- filtrar catálogo por gênero, ano e nota;
- abrir os detalhes de um filme;
- visualizar nota da comunidade e avaliações públicas;
- acessar login e cadastro.

O visitante não pode avaliar, manter watchlist ou acessar rotas privadas.

### 5.2 Usuário autenticado

O usuário pode:

- editar nome, username, biografia e avatar por URL;
- adicionar ou remover filmes da lista para assistir;
- marcar ou desmarcar um filme como assistido;
- atribuir uma nota;
- escrever, editar e apagar a própria crítica;
- marcar uma crítica como contendo spoiler;
- consultar seu perfil, estatísticas, avaliações, assistidos e watchlist;
- denunciar uma avaliação;
- encerrar a própria sessão.

### 5.3 Administrador

O administrador pode:

- acessar `/admin/login`;
- acessar dashboard com métricas;
- pesquisar e importar filmes do TMDB;
- editar metadados locais de filmes;
- ativar/desativar destaques da home;
- listar, suspender e reativar usuários;
- listar denúncias;
- ocultar ou restaurar avaliações;
- consultar ações administrativas.

O administrador não deve ser escolhido no formulário de cadastro. O papel vem
do banco e toda permissão deve ser validada no backend.

### 5.4 Fora do escopo inicial

Não implementar nesta primeira entrega:

- seguidores e feed social;
- comentários em críticas;
- mensagens privadas;
- listas personalizadas além da watchlist;
- recomendação por machine learning;
- assinatura paga;
- upload de arquivos/imagens;
- login social;
- disponibilidade em streaming via terceiros;
- papel de crítico profissional;
- séries e episódios.

Deixar a arquitetura preparada para evolução, mas não criar código morto para
essas funcionalidades.

## 6. Regras de negócio

### Avaliações

- Escala persistida: `1.0` a `10.0`, com passos de `1.0`.
- Interface: cinco estrelas, incluindo meia estrela; multiplicar o valor visual
  por dois ao persistir.
- Um usuário possui no máximo uma avaliação ativa por filme.
- Salvar uma nova nota para o mesmo filme atualiza a avaliação existente.
- Nota é obrigatória.
- Título e texto da crítica são opcionais.
- Quando houver texto, aceitar de 10 a 2.000 caracteres.
- Marcação de spoiler é obrigatoriamente respeitada na exibição.
- Avaliação oculta por moderação não entra na média pública.
- Exibir média com uma casa decimal e quantidade de votos.
- A nota comunitária local não pode ser confundida com `vote_average` do TMDB.
- A página pode mostrar ambas, com rótulos claramente diferentes.

### Watchlist e assistidos

- Cada par usuário/filme só pode aparecer uma vez em cada coleção.
- Marcar um filme como assistido remove-o automaticamente da watchlist.
- Remover “assistido” não recoloca automaticamente na watchlist.
- Registrar datas de criação/atualização.

### Usuários

- E-mail e username devem ser únicos, comparados sem diferença de maiúsculas.
- Username deve ter de 3 a 30 caracteres e aceitar letras, números, `_` e `-`.
- Papel inicial de todo cadastro público: `user`.
- Estados permitidos: `active` e `suspended`.
- Usuário suspenso perde sessões ativas e não pode autenticar.
- Exclusões devem preservar integridade histórica; preferir desativação/soft
  delete quando houver conteúdo relacionado.

### Administração

- Toda mutação administrativa gera registro de auditoria.
- O frontend nunca é a barreira de segurança: as rotas FastAPI verificam papel.
- Um administrador não pode remover acidentalmente o próprio último acesso ADM.

## 7. Arquitetura preservada

Fluxo obrigatório:

```text
Navegador
   |
   v
NGINX :8080/:8443
   |-- / e assets --> frontend estático
   `-- /api -------> FastAPI :8080
                         |
                         +--> PostgreSQL :5432
                         |
                         `--> TMDB HTTPS
```

Restrições:

- apenas o NGINX mantém `ports`;
- FastAPI e PostgreSQL mantêm somente comunicação interna;
- não adicionar Redis;
- cache simples do TMDB pode ser feito em memória com TTL;
- filmes já associados a dados de usuários devem continuar consultáveis com os
  dados locais caso o TMDB esteja temporariamente indisponível;
- manter healthcheck dos serviços;
- ampliar `/api/health` para informar apenas saúde interna, sem vazar segredos.

## 8. Organização desejada do backend

Refatorar o arquivo monolítico atual para uma estrutura semelhante a:

```text
backend/
├── alembic/
├── alembic.ini
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py
    ├── config.py
    ├── database.py
    ├── dependencies.py
    ├── models/
    │   ├── __init__.py
    │   ├── user.py
    │   ├── movie.py
    │   ├── review.py
    │   ├── library.py
    │   ├── moderation.py
    │   └── session.py
    ├── schemas/
    │   ├── auth.py
    │   ├── user.py
    │   ├── movie.py
    │   ├── review.py
    │   └── admin.py
    ├── routers/
    │   ├── auth.py
    │   ├── catalog.py
    │   ├── movies.py
    │   ├── reviews.py
    │   ├── users.py
    │   └── admin.py
    ├── services/
    │   ├── authentication.py
    │   ├── tmdb.py
    │   ├── movie_sync.py
    │   └── ratings.py
    └── security/
        ├── passwords.py
        ├── sessions.py
        └── csrf.py
```

Os nomes podem ser ajustados se houver justificativa, mas as responsabilidades
devem permanecer separadas. Evitar dependências circulares.

## 9. Modelo de dados

Usar SQLAlchemy e Alembic. Definir timestamps em UTC.

### `users`

- `id`: chave primária;
- `name`;
- `username`: único e indexado;
- `email`: único e indexado;
- `password_hash`;
- `role`: `user` ou `admin`;
- `status`: `active` ou `suspended`;
- `avatar_url`: nullable;
- `bio`: nullable;
- `created_at`;
- `updated_at`;
- `last_login_at`: nullable.

### `sessions`

- `id`;
- `user_id`;
- `token_hash`: único, nunca armazenar o token puro;
- `csrf_token_hash`;
- `expires_at`;
- `created_at`;
- `last_used_at`;
- `revoked_at`: nullable;
- dados mínimos de auditoria, sem registrar informações excessivas.

### `movies`

- `id`: chave local;
- `tmdb_id`: único, indexado e nullable apenas para registros legados;
- `title`;
- `original_title`: nullable;
- `overview`;
- `release_date`: nullable;
- `runtime_minutes`: nullable;
- `original_language`: nullable;
- `poster_path`: nullable;
- `backdrop_path`: nullable;
- `trailer_key`: nullable;
- `tmdb_vote_average`: nullable;
- `tmdb_vote_count`: nullable;
- `is_featured`;
- `is_active`;
- `created_at`;
- `updated_at`;
- `tmdb_synced_at`: nullable.

### `genres` e `movie_genres`

- gênero possui `tmdb_id` e `name`;
- relacionamento muitos-para-muitos com filmes;
- evitar gênero armazenado como texto separado por vírgulas.

### `reviews`

- `id`;
- `movie_id`;
- `user_id`: nullable apenas para dados legados;
- `legacy_reviewer_name`: nullable;
- `rating`: `NUMERIC(3,1)`;
- `title`: nullable;
- `body`: nullable;
- `contains_spoiler`;
- `status`: `published`, `hidden` ou `deleted`;
- `created_at`;
- `updated_at`;
- restrição única para `(user_id, movie_id)` quando `user_id` não for nulo.

### `watchlist_items`

- `id`;
- `user_id`;
- `movie_id`;
- `created_at`;
- unicidade `(user_id, movie_id)`.

### `watched_movies`

- `id`;
- `user_id`;
- `movie_id`;
- `watched_at`;
- `created_at`;
- unicidade `(user_id, movie_id)` nesta primeira versão.

### `review_reports`

- `id`;
- `review_id`;
- `reporter_user_id`;
- `reason`;
- `details`: nullable;
- `status`: `open`, `resolved` ou `dismissed`;
- `resolved_by`: nullable;
- `created_at`;
- `resolved_at`: nullable;
- impedir denúncias duplicadas abertas pelo mesmo usuário.

### `admin_audit_logs`

- `id`;
- `admin_user_id`;
- `action`;
- `target_type`;
- `target_id`: nullable;
- `metadata`: JSON sem segredos;
- `created_at`.

## 10. Migrações e preservação dos dados atuais

O projeto atual usa `Base.metadata.create_all()`, que não substitui migrações.

Implementar Alembic e:

1. Criar uma migração-base compatível com o banco atual.
2. Evoluir `filmes` e `avaliacoes` sem apagar registros existentes.
3. Preservar `nome_avaliador` em `legacy_reviewer_name`.
4. Permitir `user_id` nulo somente para avaliações migradas.
5. Tentar relacionar filmes legados ao TMDB somente quando houver uma
   correspondência inequívoca; caso contrário, deixá-los como registros locais.
6. Não apagar o volume automaticamente.
7. Nunca usar `docker compose down -v` como parte normal da implementação.
8. Fazer o container FastAPI executar `alembic upgrade head` antes de iniciar o
   Uvicorn, com abordagem simples e robusta.

Em uma instalação vazia, toda a estrutura deve ser criada somente pelas
migrações.

## 11. Autenticação e segurança

### Senhas

- usar Argon2id por biblioteca consolidada, preferencialmente
  `pwdlib[argon2]`;
- nunca armazenar ou registrar senha;
- senha de 8 a 128 caracteres;
- mensagens de login não devem revelar se e-mail existe;
- comparar credenciais com funções apropriadas da biblioteca.

### Sessões

Implementar sessão opaca:

1. Gerar token criptograficamente aleatório com `secrets`.
2. Enviar token ao navegador em cookie `HttpOnly`.
3. Armazenar apenas SHA-256 do token no banco.
4. Renovar/rotacionar quando necessário.
5. Revogar no logout, suspensão e mudança de senha.
6. Configurar expiração.

Cookie:

- `HttpOnly=true`;
- `SameSite=Lax` ou mais restritivo se os fluxos continuarem funcionando;
- `Path=/`;
- `Secure` controlado por configuração:
  - `true` para HTTPS/produção;
  - pode ser `false` somente no desenvolvimento HTTP local.

Não guardar token de sessão em `localStorage` ou `sessionStorage`.

### CSRF

- proteger mutações autenticadas com token CSRF;
- validar origem quando aplicável;
- frontend deve enviar o cabeçalho CSRF exigido;
- endpoints de login/logout também devem ser tratados conscientemente.

### Autorização

- dependências FastAPI claras: usuário atual, usuário ativo e administrador;
- retornar `401` quando não autenticado;
- retornar `403` quando autenticado sem permissão;
- conferir propriedade antes de editar avaliações e dados pessoais.

### Conteúdo

- escapar conteúdo gerado por usuário;
- não inserir texto de API/usuário com `innerHTML` sem sanitização;
- construir conteúdo textual com `textContent`;
- validar URLs externas;
- não permitir protocolos perigosos em avatar;
- adicionar cabeçalhos de segurança razoáveis no NGINX sem quebrar TMDB,
  fontes ou scripts usados.

### Segredos

Adicionar ao `.env.example`, com valores fictícios:

```env
TMDB_API_TOKEN=adicione_seu_token_tmdb
SESSION_SECRET=gere_um_valor_longo_e_aleatorio
COOKIE_SECURE=false
ADMIN_EMAIL=admin@exemplo.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=troque_esta_senha
```

Não sobrescrever o `.env` real. Não commitar token do TMDB, senha administrativa
ou segredo de sessão.

O bootstrap do primeiro administrador deve:

- funcionar somente se ainda não existir administrador;
- ler credenciais do ambiente;
- armazenar somente hash da senha;
- registrar claramente no log que o bootstrap aconteceu, sem mostrar senha;
- não recriar nem redefinir o administrador em toda inicialização.

## 12. Integração TMDB

Usar a API v3 do TMDB por HTTPS.

Regras:

- token acessado exclusivamente pelo FastAPI;
- cliente HTTP com timeout;
- tratar `401`, `404`, `429`, timeout e falha de rede;
- respeitar `Retry-After` quando recebido;
- cache TTL em memória para tendências, gêneros e detalhes;
- idioma padrão `pt-BR`;
- região padrão `BR` quando suportada;
- `include_adult=false`;
- nunca depender da API para autenticação local;
- armazenar `poster_path` e `backdrop_path`, não baixar imagens;
- construir URLs conforme a configuração/documentação do TMDB;
- fornecer imagem de fallback local;
- adicionar página ou seção de créditos com o texto obrigatório:
  `"This product uses the TMDB API but is not endorsed or certified by TMDB."`;
- incluir logo oficial do TMDB conforme as regras de atribuição.

Fluxos:

### Home

- consultar tendências semanais;
- combinar com destaques definidos localmente;
- não duplicar filmes na mesma seção.

### Pesquisa

- debounce no frontend;
- mínimo de dois caracteres;
- paginação;
- retornar resultados resumidos;
- busca vazia nunca dispara consulta externa.

### Detalhes

- buscar detalhes, créditos e vídeos de maneira eficiente;
- limitar elenco mostrado inicialmente;
- selecionar trailer oficial do YouTube em português quando houver, com
  fallback adequado;
- combinar dados do TMDB com média e ações locais.

### Sincronização local

- ao avaliar, adicionar à watchlist ou marcar como assistido, fazer upsert do
  filme local usando `tmdb_id`;
- atualizar metadados locais se estiverem expirados;
- nunca criar duplicatas pelo mesmo `tmdb_id`;
- operações de usuário devem ser transacionais.

## 13. Contrato de API sugerido

Manter `/api/health` e criar rotas versionáveis e coerentes.

### Autenticação

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/change-password
```

### Catálogo externo/público

```text
GET    /api/catalog/trending
GET    /api/catalog/search?q=&page=
GET    /api/catalog/genres
GET    /api/catalog/movies/{tmdb_id}
GET    /api/catalog/discover
```

### Filmes e comunidade

```text
GET    /api/movies/{movie_id}
GET    /api/movies/{movie_id}/reviews
PUT    /api/movies/{movie_id}/review
DELETE /api/movies/{movie_id}/review
POST   /api/reviews/{review_id}/report
```

Quando a tela trabalha primeiro com `tmdb_id`, oferecer rota/serviço claro para
resolver ou sincronizar o ID local sem fazer o frontend adivinhar.

### Biblioteca do usuário

```text
GET    /api/me/profile
PATCH  /api/me/profile
GET    /api/me/watchlist
PUT    /api/me/watchlist/{movie_id}
DELETE /api/me/watchlist/{movie_id}
GET    /api/me/watched
PUT    /api/me/watched/{movie_id}
DELETE /api/me/watched/{movie_id}
GET    /api/me/reviews
GET    /api/users/{username}
```

### Administração

```text
GET    /api/admin/dashboard
GET    /api/admin/users
PATCH  /api/admin/users/{user_id}/status
GET    /api/admin/movies
POST   /api/admin/movies/import/{tmdb_id}
PATCH  /api/admin/movies/{movie_id}
PATCH  /api/admin/movies/{movie_id}/featured
GET    /api/admin/reports
PATCH  /api/admin/reports/{report_id}
PATCH  /api/admin/reviews/{review_id}/status
GET    /api/admin/audit
```

Detalhes de nomes podem mudar, mas:

- usar verbos HTTP corretamente;
- validar schemas de entrada e saída;
- não retornar `password_hash`, token ou dados internos;
- paginar listas administrativas e avaliações;
- padronizar erros em português;
- documentar automaticamente no OpenAPI.

## 14. Frontend

Manter frontend estático servido pelo NGINX, organizado em módulos:

```text
frontend/
├── index.html
├── assets/
│   ├── icons/
│   ├── images/
│   └── cinereview-logo.svg
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── pages.css
│   └── responsive.css
└── js/
    ├── app.js
    ├── router.js
    ├── api.js
    ├── auth.js
    ├── state.js
    ├── utils/
    ├── components/
    └── pages/
```

Usar ES modules. O `try_files` atual do NGINX já permite rotas de SPA, mas deve
ser validado.

### Rotas visuais

```text
/
/explorar
/buscar
/filme/{tmdb_id}
/login
/cadastro
/perfil/{username}
/minha-lista
/assistidos
/configuracoes
/creditos
/admin/login
/admin
/admin/filmes
/admin/usuarios
/admin/moderacao
```

### Estado e navegação

- rota protegida redireciona para login preservando o destino;
- login normal não aceita administrador como escolha;
- login ADM usa o mesmo backend e confirma papel antes de abrir `/admin`;
- usuário já autenticado não deve ver cadastro como ação principal;
- logout limpa estado visual e sessão no backend;
- recarregar uma rota interna deve funcionar;
- erros `401` devem atualizar o estado de autenticação;
- abortar requisições obsoletas de pesquisa quando possível.

## 15. Direção visual

Usar o skill `frontend-design`, mas respeitar esta direção:

- atmosfera de cinema editorial contemporâneo;
- tema predominantemente escuro;
- pôsteres e backdrops são os protagonistas;
- contraste alto e leitura confortável;
- cor de destaque quente, sem gradiente roxo genérico;
- tipografia expressiva nos títulos e neutra no corpo;
- composição elegante, com respiro e hierarquia;
- animações discretas e com propósito;
- respeitar `prefers-reduced-motion`;
- cards não devem parecer um painel administrativo genérico;
- home pública e painel ADM devem ter linguagens relacionadas, mas distintas;
- mobile não pode ser uma versão espremida do desktop.

Evitar:

- excesso de glassmorphism;
- dezenas de badges sem função;
- carrosséis impossíveis de usar por teclado;
- texto sobre imagem sem contraste;
- animações que atrasem ações;
- placeholders com filmes inexistentes quando o TMDB estiver conectado;
- estética genérica de dashboard em toda a aplicação.

### Home

- cabeçalho fixo/compacto;
- hero com um único destaque e CTA claro;
- seções horizontais responsivas para tendências, lançamentos e comunidade;
- cards de pôster com nota, ano e ações rápidas;
- footer com créditos e atribuição ao TMDB.

### Detalhes do filme

- backdrop responsivo com overlay legível;
- pôster, título, metadados, sinopse e ações prioritárias;
- nota CineReview separada da nota TMDB;
- elenco;
- trailer opcional;
- área de avaliações;
- formulário/modal de avaliação acessível.

### Login normal

- experiência cinematográfica acolhedora;
- alternância clara entre login e cadastro;
- mensagens de erro junto aos campos;
- nunca informar se um e-mail específico está cadastrado.

### Login administrativo

- rota e layout separados;
- aparência sóbria;
- sem link de cadastro;
- não revelar detalhes da existência do usuário ADM.

### Dashboard

- métricas úteis;
- tabelas responsivas;
- filtros e paginação;
- ações perigosas com confirmação;
- feedback claro após mutações.

## 16. Acessibilidade e qualidade

- HTML semântico;
- navegação completa por teclado;
- foco visível;
- labels associados aos campos;
- `aria-live` para feedback assíncrono;
- alt text apropriado;
- contraste WCAG AA;
- botões com nome acessível;
- modal com foco contido e retorno ao elemento de origem;
- estados de loading com skeleton;
- estados vazios orientando a próxima ação;
- imagens com lazy loading fora da primeira dobra;
- dimensões conhecidas para reduzir layout shift;
- layout funcional em 360 px, tablet e desktop;
- evitar requisições duplicadas;
- não bloquear a página inteira por falha de uma seção secundária.

## 17. Testes obrigatórios

Adicionar testes proporcionais ao risco.

### Backend

- cadastro;
- e-mail/username duplicados;
- login válido e inválido;
- cookie e logout;
- sessão expirada/revogada;
- usuário suspenso;
- acesso `401` e `403`;
- usuário comum bloqueado nas rotas ADM;
- bootstrap do administrador;
- uma avaliação por usuário/filme;
- edição somente pelo proprietário;
- cálculo da média ignorando avaliação oculta;
- watchlist e assistidos;
- denúncia e moderação;
- upsert sem duplicar `tmdb_id`;
- cliente TMDB com respostas simuladas;
- timeout e `429` do TMDB;
- migração em banco vazio.

### Frontend/E2E

Com Playwright:

1. visitante abre home;
2. pesquisa e abre filme;
3. usuário cria conta;
4. usuário entra e sai;
5. usuário adiciona watchlist;
6. usuário marca assistido;
7. usuário avalia e edita;
8. spoiler começa oculto;
9. usuário comum não acessa admin;
10. administrador entra pela tela própria;
11. administrador modera avaliação;
12. fluxos essenciais funcionam em viewport móvel.

### Infraestrutura

- `docker compose config`;
- `docker compose build`;
- `docker compose up -d`;
- `docker compose ps`;
- healthcheck;
- acesso HTTP e HTTPS;
- `/api/docs`;
- FastAPI e PostgreSQL não publicados no host;
- persistência após `docker compose down` e novo `up`;
- logs sem segredos.

Se o certificado autoassinado dificultar o E2E local, configurar o teste para
ignorar o erro somente no ambiente de teste.

## 18. Fases de implementação e checkpoints

### Fase 0 — Linha de base

- inspecionar estado;
- preservar alterações;
- validar Compose atual;
- criar commit local de segurança.

Critério: estado atual reproduzível e nenhum trabalho do usuário perdido.

### Fase 1 — Fundação do backend

- modularizar FastAPI;
- configurar settings;
- introduzir Alembic;
- criar modelos e migrações;
- manter healthcheck;
- migrar dados legados.

Critério: banco vazio e banco legado inicializam sem apagar dados.

### Fase 2 — Autenticação e autorização

- usuários;
- Argon2id;
- sessões opacas;
- CSRF;
- cadastro/login/logout/me;
- bootstrap ADM;
- RBAC;
- testes de segurança.

Critério: matriz de `401/403/200` correta e nenhum segredo exposto.

### Fase 3 — TMDB e catálogo

- cliente TMDB;
- cache;
- pesquisa, tendências, gêneros e detalhes;
- sincronização local;
- fallback;
- atribuição.

Critério: API externa isolada no backend e falhas tratadas sem quebrar o app.

### Fase 4 — Recursos do usuário

- avaliação;
- média comunitária;
- watchlist;
- assistidos;
- perfil;
- denúncias;
- testes.

Critério: dados pertencem ao usuário certo e restrições únicas funcionam.

### Fase 5 — Nova interface pública

- design system;
- router;
- shell responsivo;
- home;
- explorar/pesquisa;
- detalhes;
- login/cadastro;
- perfil e biblioteca;
- acessibilidade.

Critério: todos os fluxos reais funcionam sem conteúdo falso.

### Fase 6 — Administração

- login visual ADM;
- dashboard;
- filmes;
- usuários;
- moderação;
- auditoria;
- proteção no backend.

Critério: usuário normal não consegue executar nenhuma ação ADM, mesmo chamando
a API diretamente.

### Fase 7 — Testes e refinamento

- suíte backend;
- E2E Playwright;
- revisão do plugin `security-guidance`;
- simplificação com `code-simplifier` somente sobre código recente;
- revisão visual desktop/mobile;
- correção de regressões;
- validação Docker completa.

Critério: testes passam e não existem ações visuais quebradas.

### Fase 8 — Documentação

- atualizar README;
- atualizar `.env.example`;
- documentar TMDB e obtenção do token;
- documentar criação inicial de ADM;
- atualizar entidades e rotas;
- atualizar guia/roteiro de apresentação;
- registrar decisões e limitações.

Critério: uma pessoa nova consegue configurar e demonstrar o projeto seguindo o
README.

## 19. Política de commits

Manter apenas a branch `main` e criar commits locais por fase, por exemplo:

```text
chore: salva estado anterior a reformulacao
refactor: modulariza backend e adiciona migracoes
feat: adiciona autenticacao e controle de acesso
feat: integra catalogo de filmes ao tmdb
feat: adiciona avaliacoes e biblioteca do usuario
feat: reformula interface publica
feat: adiciona painel administrativo
test: cobre fluxos criticos do sistema
docs: atualiza documentacao da nova plataforma
```

Antes de cada commit:

- revisar `git diff`;
- garantir que `.env` e segredos não estejam staged;
- executar testes relevantes;
- não incluir arquivos temporários, cache ou artefatos de teste.

Não fazer push.

## 20. Definição de pronto

O trabalho só está concluído quando:

- [ ] Docker Compose sobe todos os serviços com healthchecks saudáveis.
- [ ] Somente NGINX está publicado no host.
- [ ] Migrações funcionam em banco vazio e preservam banco existente.
- [ ] Cadastro, login, logout e sessão funcionam.
- [ ] Há separação real entre usuário e administrador.
- [ ] Chave TMDB não aparece no navegador nem no Git.
- [ ] Home utiliza dados reais ou estados de fallback honestos.
- [ ] Pesquisa e detalhes funcionam.
- [ ] Pôsteres/backdrops usam TMDB com fallback local.
- [ ] Avaliação respeita uma nota por usuário/filme.
- [ ] Watchlist e assistidos funcionam.
- [ ] Perfil exibe dados e estatísticas reais.
- [ ] Painel ADM funciona e está protegido no backend.
- [ ] Spoilers permanecem ocultos até ação do usuário.
- [ ] Interface funciona em mobile e desktop.
- [ ] Navegação por teclado e foco são utilizáveis.
- [ ] Testes backend e E2E essenciais passam.
- [ ] Nenhum segredo está versionado.
- [ ] README explica instalação, TMDB, ADM e demonstração.
- [ ] Alterações locais iniciais não foram descartadas.
- [ ] Nenhuma branch adicional foi criada.
- [ ] Nenhum push foi realizado.

## 21. Relatório final obrigatório

Ao concluir, apresentar:

1. resumo do produto entregue;
2. principais decisões de arquitetura;
3. lista de arquivos/áreas alterados;
4. migrações criadas;
5. variáveis de ambiente necessárias;
6. comandos exatos para executar;
7. credencial ADM esperada via ambiente, sem revelar senha real;
8. testes executados e resultados;
9. limitações restantes;
10. lista dos commits locais criados;
11. confirmação de que nada foi enviado ao remoto.

## 22. Fontes oficiais

- Claude Code plugins:
  <https://code.claude.com/docs/en/discover-plugins>
- Marketplace oficial:
  <https://github.com/anthropics/claude-plugins-official>
- TMDB — início:
  <https://developer.themoviedb.org/reference/getting-started>
- TMDB — pesquisa:
  <https://developer.themoviedb.org/reference/search-movie>
- TMDB — imagens:
  <https://developer.themoviedb.org/docs/image-basics>
- TMDB — atribuição:
  <https://developer.themoviedb.org/docs/faq>
- OWASP — armazenamento de senhas:
  <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>
- OWASP — sessão:
  <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>

## 23. Instrução final ao executor

Use este plano como contrato. Tome decisões técnicas pequenas de forma autônoma,
mas não mude os objetivos, a stack, as restrições de infraestrutura ou as regras
de segurança. Se uma fase revelar incompatibilidade real, registre a evidência,
escolha a alternativa mais simples que preserve o objetivo e atualize a
documentação.

Não declare conclusão apenas porque a interface parece pronta. Conclusão exige
fluxos funcionais, autorização no backend, migrações, testes e validação via
Docker Compose.
