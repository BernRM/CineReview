# Guia de Estudo para Apresentacao e Entrevista - CineReview

Este guia foi feito para duas situacoes:

- Apresentar o projeto para o professor, mostrando codigo e execucao.
- Responder a entrevista individual depois da apresentacao.

A ideia principal e simples: qualquer integrante deve conseguir explicar o fluxo completo, mesmo que cada um estude uma parte com mais profundidade.

## 1. Resumo em 30 segundos

Frase pronta:

> O CineReview e uma aplicacao web conteinerizada para cadastro de filmes e avaliacoes. O projeto tem tres containers: NGINX, FastAPI e PostgreSQL. O NGINX e o unico exposto ao computador, servindo o frontend e encaminhando as rotas `/api` para o FastAPI. O FastAPI executa o CRUD e acessa o PostgreSQL pela rede Docker interna `netatividade01`. O banco usa volume Docker para manter os dados salvos.

Tema do grupo:

- Grupo 7: Sistema de Filmes e Avaliacoes.

Entidades:

- `filmes`: `id`, `titulo`, `diretor`, `genero`, `ano`, `sinopse`.
- `avaliacoes`: `id`, `filme_id`, `nome_avaliador`, `nota`, `comentario`.

Relacionamento:

- Um filme pode ter varias avaliacoes.
- Uma avaliacao pertence a um filme.
- `avaliacoes.filme_id` aponta para `filmes.id`.
- Ao excluir um filme, as avaliacoes dele tambem sao removidas.

## 2. O que o professor pediu e onde esta no projeto

| Requisito                                             | Onde mostrar                                  |
| ----------------------------------------------------- | --------------------------------------------- |
| Usar Docker Compose                                   | `docker-compose.yml`                        |
| Ter os servicos `nginx`, `fastapi` e `postgres` | `docker-compose.yml`                        |
| Somente NGINX exposto ao hospedeiro                   | Apenas `nginx` tem `ports`                |
| NGINX nas portas `80:8080` e `443:8443`           | `docker-compose.yml`                        |
| Frontend estatico servido pelo NGINX                  | `nginx/Dockerfile` e `nginx/default.conf` |
| Proxy reverso de `/api` para o FastAPI              | `nginx/default.conf`                        |
| FastAPI rodando na porta interna `8080`             | `backend/Dockerfile`                        |
| PostgreSQL com usuario `postgres`                   | `docker-compose.yml`                        |
| Senha do banco por `.env`                           | `.env` e `docker-compose.yml`             |
| Volume persistente do PostgreSQL                      | `postgres_data` em `docker-compose.yml`   |
| Rede Docker chamada `netatividade01`                | `docker-compose.yml`                        |
| CRUD completo do tema                                 | `backend/app/main.py`                       |
| Frontend consumindo a API                             | `frontend/app.js`                           |
| Documentacao para executar e testar                   | `README.md`                                 |

## 3. Fluxo da aplicacao

Fluxo quando o usuario abre a tela:

1. O usuario acessa `http://localhost`.
2. O NGINX recebe a requisicao na porta 80 do computador.
3. O NGINX entrega os arquivos `index.html`, `styles.css`, `app.js` e o logo.
4. O JavaScript chama rotas como `/api/filmes`.
5. O NGINX recebe `/api/filmes` e encaminha para `http://fastapi:8080/api/filmes`.
6. O FastAPI processa a rota e usa SQLAlchemy para consultar ou alterar o PostgreSQL.
7. O PostgreSQL grava os dados no volume `postgres_data`.
8. A resposta volta como JSON para o frontend, que atualiza a tela.

Frase curta para explicar:

> O navegador fala com o NGINX. O NGINX fala com o FastAPI. O FastAPI fala com o PostgreSQL. O banco salva os dados no volume.

## 4. Estrutura do projeto

```text
CineView/
|-- docker-compose.yml
|-- README.md
|-- .env
|-- .env.example
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt
|   `-- app/
|       |-- __init__.py
|       `-- main.py
|-- frontend/
|   |-- index.html
|   |-- styles.css
|   |-- app.js
|   `-- assets/
|       `-- cinereview-logo.svg
`-- nginx/
    |-- Dockerfile
    `-- default.conf
```

Observacao importante:

- O documento do professor pode sugerir separar `models.py`, `schemas.py`, `database.py` e `routes/`.
- Neste projeto, o backend ficou concentrado em `backend/app/main.py` para ser mais curto e didatico.
- Isso nao impede o funcionamento. Separar em arquivos seria uma melhoria de organizacao, nao uma obrigacao para a atividade funcionar.

## 5. Docker Compose

Arquivo:

- `docker-compose.yml`

Servicos:

- `nginx`: entrada da aplicacao, frontend e proxy reverso.
- `fastapi`: API e regras de CRUD.
- `postgres`: banco de dados.

Rede:

- `netatividade01`

Volume:

- `postgres_data`

### 5.1 Servico nginx

Trecho principal:

```yaml
nginx:
  build:
    context: .
    dockerfile: nginx/Dockerfile
  container_name: cinereview-nginx
  depends_on:
    fastapi:
      condition: service_healthy
  ports:
    - "80:8080"
    - "443:8443"
  networks:
    - netatividade01
```

Como explicar:

- O NGINX e criado usando `nginx/Dockerfile`.
- Ele e o unico servico com `ports`.
- `80:8080` significa porta 80 do computador apontando para porta 8080 do container.
- `443:8443` significa porta 443 do computador apontando para porta 8443 do container.
- Ele depende do FastAPI estar saudavel.

Pergunta provavel:

> Por que FastAPI e PostgreSQL nao tem `ports`?

Resposta:

> Porque a atividade pede que somente o NGINX seja exposto ao hospedeiro. O backend e o banco ficam protegidos na rede interna Docker.

### 5.2 Servico fastapi

Trecho principal:

```yaml
fastapi:
  build:
    context: ./backend
  environment:
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: ${POSTGRES_DB}
    DB_USER: postgres
    DB_PASSWORD: ${POSTGRES_PASSWORD}
  expose:
    - "8080"
  depends_on:
    postgres:
      condition: service_healthy
```

Como explicar:

- O FastAPI e construido a partir da pasta `backend`.
- Ele recebe host, banco, usuario e senha por variaveis de ambiente.
- `DB_HOST: postgres` funciona porque o Docker Compose cria DNS interno com o nome do servico.
- `expose: 8080` indica a porta interna da API.
- Ele espera o PostgreSQL estar saudavel antes de iniciar.

Pergunta provavel:

> O que significa `DB_HOST=postgres`?

Resposta:

> Significa que o backend vai conectar no servico chamado `postgres` dentro da rede Docker. Nao precisa de IP fixo, porque o Docker resolve o nome automaticamente.

### 5.3 Servico postgres

Trecho principal:

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB}
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

Como explicar:

- Usa imagem oficial do PostgreSQL.
- O usuario e `postgres`.
- A senha vem do arquivo `.env`.
- O volume guarda os dados do banco.
- Se o container for recriado, os dados continuam.

Atencao:

- Se trocar a senha no `.env` depois que o volume ja existe, o banco antigo continua com a senha anterior.
- Em ambiente de teste, para recriar tudo do zero, use `docker compose down -v`.

## 6. NGINX

Arquivos:

- `nginx/Dockerfile`
- `nginx/default.conf`

### 6.1 Dockerfile do NGINX

O Dockerfile:

- Usa `nginx:1.27-alpine`.
- Instala `openssl`.
- Gera certificado autoassinado.
- Copia `nginx/default.conf`.
- Copia a pasta `frontend/` para `/usr/share/nginx/html/`.
- Expoe internamente as portas `8080` e `8443`.

Como falar:

> O NGINX entrega o frontend estatico e tambem recebe as chamadas da API para encaminhar ao backend. O certificado autoassinado permite testar HTTPS local em `https://localhost`.

### 6.2 Proxy reverso

Trecho principal:

```nginx
location /api {
    proxy_pass http://fastapi:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Como explicar:

- Tudo que comeca com `/api` vai para o servico `fastapi` na porta 8080.
- `fastapi` e o nome do servico no Compose, nao uma URL publica.
- O navegador nao acessa `fastapi:8080` diretamente; so o NGINX acessa.

Pergunta provavel:

> Por que o frontend chama `/api` em vez de `http://fastapi:8080`?

Resposta:

> Porque o navegador esta fora da rede Docker e nao conhece o nome `fastapi`. O navegador chama o NGINX em `localhost`, e o NGINX encaminha internamente.

## 7. Backend FastAPI

Arquivo principal:

- `backend/app/main.py`

Dependencias:

- `fastapi`
- `uvicorn[standard]`
- `SQLAlchemy`
- `psycopg2-binary`

### 7.1 Conexao com o banco

O backend le variaveis de ambiente:

```python
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "cinereview")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
```

Como explicar:

- O Python nao tem senha travada no codigo.
- O Compose envia os valores para o container.
- A string `DATABASE_URL` monta o endereco final do PostgreSQL.

### 7.2 SQLAlchemy

Objetos importantes:

- `engine`: conexao principal com o banco.
- `SessionLocal`: cria sessoes para conversar com o banco.
- `Base`: base dos modelos/tabelas.
- `get_db()`: cria uma sessao para a rota e fecha no final.

Pergunta provavel:

> Por que usamos `get_db()` com `Depends`?

Resposta:

> Porque cada requisicao precisa de uma sessao de banco. O FastAPI injeta essa sessao na rota, e a funcao fecha a conexao ao terminar.

### 7.3 Modelos

Modelo `Filme`:

- Tabela `filmes`.
- Campos: `id`, `titulo`, `diretor`, `genero`, `ano`, `sinopse`.
- Relacionamento: `avaliacoes`.

Modelo `Avaliacao`:

- Tabela `avaliacoes`.
- Campos: `id`, `filme_id`, `nome_avaliador`, `nota`, `comentario`.
- `filme_id` e a chave estrangeira para `filmes.id`.

Trecho importante:

```python
filme_id = Column(Integer, ForeignKey("filmes.id", ondelete="CASCADE"), nullable=False)
```

Como explicar:

> `filme_id` liga uma avaliacao a um filme. Isso cria o relacionamento entre as tabelas.

### 7.4 Schemas Pydantic

Schemas de filme:

- `FilmeCreate`: dados obrigatorios para criar.
- `FilmeUpdate`: campos opcionais para editar.
- `FilmeRead`: formato da resposta.

Schemas de avaliacao:

- `AvaliacaoCreate`
- `AvaliacaoUpdate`
- `AvaliacaoRead`

Validacoes importantes:

```python
nota: float = Field(ge=0, le=10)
ano: int = Field(ge=1888, le=2100)
```

Pergunta provavel:

> Qual a diferenca entre model SQLAlchemy e schema Pydantic?

Resposta:

> SQLAlchemy define a tabela no banco. Pydantic define o formato dos dados que entram e saem pela API, incluindo validacao.

### 7.5 Criacao das tabelas

Funcao:

```python
criar_tabelas_com_retry()
```

Como explicar:

- A funcao tenta conectar no banco.
- Se o banco ainda nao estiver pronto, espera e tenta de novo.
- Quando conecta, roda `Base.metadata.create_all(bind=engine)`.
- Isso cria as tabelas se elas ainda nao existirem.

Pergunta provavel:

> O projeto usa migrations?

Resposta:

> Nao. Para uma atividade didatica, usamos `create_all`. Em projeto profissional, seria melhor usar Alembic para controlar migrations.

### 7.6 Rotas

Saude:

- `GET /api/health`

Filmes:

- `POST /api/filmes`
- `GET /api/filmes`
- `GET /api/filmes/{filme_id}`
- `PUT /api/filmes/{filme_id}`
- `DELETE /api/filmes/{filme_id}`
- `GET /api/filmes/{filme_id}/avaliacoes`

Avaliacoes:

- `POST /api/avaliacoes`
- `GET /api/avaliacoes`
- `GET /api/avaliacoes?filme_id=1`
- `GET /api/avaliacoes/{avaliacao_id}`
- `PUT /api/avaliacoes/{avaliacao_id}`
- `DELETE /api/avaliacoes/{avaliacao_id}`

Tratamento de erro:

- `buscar_filme_ou_404`: retorna 404 se o filme nao existe.
- `buscar_avaliacao_ou_404`: retorna 404 se a avaliacao nao existe.

Pergunta provavel:

> O que acontece se criar avaliacao para filme inexistente?

Resposta:

> A rota chama `buscar_filme_ou_404` antes de gravar. Se o filme nao existir, a API retorna 404 e nao salva a avaliacao.

## 8. Frontend

Arquivos:

- `frontend/index.html`: estrutura da tela.
- `frontend/styles.css`: visual.
- `frontend/app.js`: logica, fetch e eventos.
- `frontend/assets/cinereview-logo.svg`: logo.

Trecho principal:

```javascript
const API = "/api";
```

Como explicar:

- O frontend usa caminho relativo.
- O navegador chama o mesmo host do NGINX.
- O NGINX encaminha `/api` para o FastAPI.
- Isso evita problema de CORS.

Funcoes importantes:

- `request()`: centraliza chamadas `fetch`.
- `carregarDados()`: carrega filmes da API.
- `renderFilmes()`: desenha os cards na tela.
- `renderSelectFilmes()`: preenche o select de filmes para avaliacao.
- Event listener do formulario de filme: cria ou edita filme.
- Event listener do formulario de avaliacao: cria ou edita avaliacao.
- Event listener da lista: trata botoes editar, excluir e avaliar.

Pergunta provavel:

> O frontend acessa o banco?

Resposta:

> Nao. O frontend chama a API pelo NGINX. Quem acessa o banco e o FastAPI.

## 9. Comandos que todos devem saber

Verificar Docker:

```bash
docker version
```

Validar Compose:

```bash
docker compose config
```

Subir reconstruindo:

```bash
docker compose up --build
```

Subir em segundo plano:

```bash
docker compose up -d --build
```

Ver containers:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs
docker compose logs nginx
docker compose logs fastapi
docker compose logs postgres
```

Parar mantendo dados:

```bash
docker compose down
```

Parar apagando o banco:

```bash
docker compose down -v
```

Entrar no PostgreSQL:

```bash
docker compose exec postgres psql -U postgres -d cinereview
```

Comandos SQL uteis:

```sql
\dt
SELECT * FROM filmes;
SELECT * FROM avaliacoes;
```

## 10. Testes rapidos

Health:

```bash
curl.exe http://localhost/api/health
```

Criar filme:

```bash
curl.exe -X POST http://localhost/api/filmes -H "Content-Type: application/json" -d "{\"titulo\":\"Matrix\",\"diretor\":\"Lana Wachowski e Lilly Wachowski\",\"genero\":\"Ficcao cientifica\",\"ano\":1999,\"sinopse\":\"Um hacker descobre a verdade sobre sua realidade.\"}"
```

Listar filmes:

```bash
curl.exe http://localhost/api/filmes
```

Criar avaliacao:

```bash
curl.exe -X POST http://localhost/api/avaliacoes -H "Content-Type: application/json" -d "{\"filme_id\":1,\"nome_avaliador\":\"Ana\",\"nota\":9.5,\"comentario\":\"Filme marcante.\"}"
```

Listar avaliacoes de um filme:

```bash
curl.exe http://localhost/api/filmes/1/avaliacoes
```

Editar filme:

```bash
curl.exe -X PUT http://localhost/api/filmes/1 -H "Content-Type: application/json" -d "{\"genero\":\"Acao e ficcao cientifica\"}"
```

Excluir avaliacao:

```bash
curl.exe -X DELETE http://localhost/api/avaliacoes/1
```

Excluir filme:

```bash
curl.exe -X DELETE http://localhost/api/filmes/1
```

## 11. Perguntas provaveis da entrevista

### Docker e Compose

Pergunta: O que o Docker Compose faz?

Resposta: Ele sobe e integra os containers da aplicacao com um comando, criando rede, volume, variaveis de ambiente e dependencias.

Pergunta: Por que usar containers separados?

Resposta: Para separar responsabilidades: NGINX cuida da entrada, FastAPI da API, PostgreSQL dos dados.

Pergunta: O que e a rede `netatividade01`?

Resposta: E uma rede Docker onde os containers conseguem se comunicar internamente pelo nome do servico.

Pergunta: O que e um volume?

Resposta: E uma area persistente gerenciada pelo Docker. Aqui ele guarda os dados do PostgreSQL.

Pergunta: Qual a diferenca entre `ports` e `expose`?

Resposta: `ports` publica uma porta no computador. `expose` apenas documenta/disponibiliza a porta internamente entre containers.

### NGINX

Pergunta: O que e proxy reverso?

Resposta: E quando um servidor recebe a requisicao do cliente e encaminha para outro servico interno. Aqui o NGINX encaminha `/api` para o FastAPI.

Pergunta: Por que o NGINX e o unico exposto?

Resposta: Porque ele e a porta de entrada. Backend e banco ficam isolados na rede interna, como a atividade pede.

Pergunta: Onde o NGINX serve o frontend?

Resposta: Em `/usr/share/nginx/html`, dentro do container.

### FastAPI

Pergunta: Qual comando inicia a API?

Resposta: O Dockerfile executa `uvicorn app.main:app --host 0.0.0.0 --port 8080`.

Pergunta: Onde estao as rotas?

Resposta: Em `backend/app/main.py`, com decoradores `@app.get`, `@app.post`, `@app.put` e `@app.delete`.

Pergunta: Como a API valida dados?

Resposta: Com Pydantic e `Field`, por exemplo nota entre 0 e 10 e ano entre 1888 e 2100.

### PostgreSQL

Pergunta: Como o backend encontra o banco?

Resposta: Pelas variaveis de ambiente do Compose. O host e `postgres`, nome do servico na rede Docker.

Pergunta: Por que o banco nao tem porta publicada?

Resposta: Porque ele so precisa ser acessado pelo backend, internamente.

Pergunta: Como provar persistencia?

Resposta: Cadastrar dados, rodar `docker compose down`, subir de novo e ver que os dados continuam.

### CRUD e relacionamento

Pergunta: O que e CRUD?

Resposta: Create, Read, Update e Delete: criar, listar/buscar, atualizar e remover registros.

Pergunta: Onde esta a ForeignKey?

Resposta: Em `Avaliacao.filme_id`, apontando para `filmes.id`.

Pergunta: O que acontece ao excluir um filme?

Resposta: As avaliacoes ligadas a ele tambem sao excluidas por causa do cascade.

### Frontend

Pergunta: Por que nao tem CORS?

Resposta: Porque o navegador chama sempre o NGINX no mesmo host. O proxy interno faz o encaminhamento para a API.

Pergunta: Onde fica a logica de editar e excluir?

Resposta: Em `frontend/app.js`, nos event listeners dos formularios e da lista.

## 12. Se o professor pedir uma alteracao

### Adicionar campo `duracao` em filmes

Arquivos:

- `backend/app/main.py`
- `frontend/index.html`
- `frontend/app.js`
- `README.md`

Passos:

1. Adicionar coluna `duracao` no modelo `Filme`.
2. Adicionar o campo nos schemas `FilmeBase` e `FilmeUpdate`.
3. Criar input no formulario.
4. Enviar o campo no payload do JavaScript.
5. Mostrar o campo no card.
6. Se a tabela ja existe, em teste recriar o volume com `docker compose down -v`.

### Criar filtro por genero

Onde mexer:

- `backend/app/main.py`
- `frontend/app.js`

Ideia:

- Adicionar parametro opcional `genero` em `GET /api/filmes`.
- No frontend, chamar `/filmes?genero=Drama`.

### Separar backend em arquivos

Arquivos possiveis:

- `database.py`
- `models.py`
- `schemas.py`
- `routes/filmes.py`
- `routes/avaliacoes.py`

Como responder:

> Hoje esta tudo em `main.py` para facilitar a leitura na atividade. Separar em arquivos melhora organizacao, mas nao muda a arquitetura.

## 13. Erros comuns

Erro:

```text
dockerDesktopLinuxEngine: O sistema nao pode encontrar o arquivo especificado
```

Causa:

- Docker Desktop nao esta aberto.

Solucao:

- Abrir Docker Desktop.
- Esperar iniciar.
- Rodar `docker version` e conferir se aparece `Server`.

Erro:

```text
port is already allocated
```

Causa:

- Porta 80 ou 443 ja esta sendo usada.

Solucao:

- Fechar o programa que usa a porta.
- Verificar IIS, Apache, outro NGINX ou outro projeto Docker.

Erro:

```text
password authentication failed for user "postgres"
```

Causa:

- O `.env` foi alterado depois do volume existir.

Solucao em teste:

```bash
docker compose down -v
docker compose up --build
```

Erro:

```text
404 Not Found em /api/filmes
```

Como investigar:

```bash
docker compose logs nginx
docker compose logs fastapi
```

## 14. Divisao de estudo para tres integrantes

Integrante 1: Docker Compose e infraestrutura.

- Explicar `docker-compose.yml`.
- Explicar `ports`, `expose`, rede e volume.
- Explicar `.env`.
- Saber comandos Docker.

Integrante 2: Backend e banco.

- Explicar FastAPI.
- Explicar SQLAlchemy.
- Explicar Pydantic.
- Explicar CRUD e relacionamento.
- Mostrar rotas no Swagger.

Integrante 3: NGINX e frontend.

- Explicar proxy reverso.
- Explicar `nginx/default.conf`.
- Explicar `index.html`, `styles.css` e `app.js`.
- Mostrar a tela criando, editando e excluindo registros.

Importante:

- Mesmo com divisao, todos precisam saber o fluxo completo em alto nivel.
- Na entrevista individual, o professor pode perguntar qualquer parte.

## 15. Checklist individual

Antes da entrevista, cada pessoa deve saber responder:

- O que cada container faz.
- Por que so o NGINX tem `ports`.
- Como o NGINX encaminha `/api`.
- Como o FastAPI encontra o PostgreSQL.
- Onde ficam as variaveis de ambiente.
- Para que serve o volume.
- Onde estao os modelos `Filme` e `Avaliacao`.
- Onde esta a ForeignKey.
- Onde a API valida `nota` e `ano`.
- Onde o frontend chama a API.
- Como criar, editar e excluir pela tela.
- Como testar `http://localhost/api/health`.
- Como abrir `http://localhost/api/docs`.
- Como ver logs.
- Como apagar o volume em ambiente de teste.

## 16. Respostas curtinhas para decorar

Por que Docker Compose?

> Para subir varios containers integrados com um unico comando.

Por que NGINX?

> Para servir o frontend e fazer proxy reverso para a API.

Por que PostgreSQL com volume?

> Para manter os dados salvos mesmo recriando containers.

Por que variaveis de ambiente?

> Para configurar banco e senha fora do codigo Python.

Por que `postgres` como host?

> Porque `postgres` e o nome do servico na rede Docker.

Por que nao tem CORS?

> Porque o navegador acessa o NGINX no mesmo host, e o NGINX encaminha internamente.

O que e healthcheck?

> Um teste que o Docker usa para saber se o container esta saudavel.

O que e ForeignKey?

> Uma chave que liga uma tabela a outra.

O que e cascade?

> Uma regra para apagar registros dependentes. Ao apagar um filme, apaga as avaliacoes dele.

## 17. Checklist final antes da apresentacao

- Docker Desktop aberto.
- `docker version` mostrando `Client` e `Server`.
- `.env` com senha conforme pedido da atividade.
- `docker compose config` sem erro.
- `docker compose up --build` funcionando.
- `docker compose ps` mostrando containers saudaveis.
- `http://localhost` abrindo o frontend.
- `http://localhost/api/health` retornando `{"status":"ok"}`.
- `http://localhost/api/docs` abrindo Swagger.
- Cadastro de filme funcionando.
- Cadastro de avaliacao funcionando.
- Edicao e exclusao funcionando.
- `docker compose logs` sem erro critico.
- Todos conseguem explicar o fluxo navegador -> NGINX -> FastAPI -> PostgreSQL.
