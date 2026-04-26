# Guia de Estudo para Apresentacao e Entrevista - CineReview

Este guia complementa o documento `guia_projeto_grupo7_cinereview.docx` e foi escrito olhando para o projeto real que esta neste repositorio. A ideia e que qualquer integrante consiga explicar como a aplicacao funciona, onde alterar o codigo e como responder perguntas do professor.

## 1. Resumo do Projeto Real

O CineReview e uma aplicacao web CRUD para filmes e avaliacoes.

Tema do grupo:

- Grupo 7: Sistema de Filmes e Avaliacoes.

Entidades:

- `filmes`: `id`, `titulo`, `diretor`, `genero`, `ano`, `sinopse`.
- `avaliacoes`: `id`, `filme_id`, `nome_avaliador`, `nota`, `comentario`.

Relacionamento:

- Um filme pode ter varias avaliacoes.
- Uma avaliacao pertence a um unico filme.
- No banco, isso e feito com `avaliacoes.filme_id` apontando para `filmes.id`.

Stack usada:

- Docker Compose para orquestrar os containers.
- NGINX para servir o frontend e fazer proxy reverso.
- FastAPI com Python para a API.
- PostgreSQL para persistir os dados.
- HTML, CSS e JavaScript puro no frontend.

## 2. Como Explicar a Arquitetura em 30 Segundos

Frase pronta:

> O projeto tem tres containers principais: NGINX, FastAPI e PostgreSQL. O unico exposto ao computador e o NGINX, nas portas 80 e 443. Ele entrega o frontend estatico na rota `/` e encaminha as chamadas `/api` para o container FastAPI pela rede interna `netatividade01`. O FastAPI acessa o PostgreSQL tambem pela rede interna, usando variaveis de ambiente. O banco persiste os dados em um volume Docker.

Fluxo de uma requisicao:

1. O usuario abre `http://localhost`.
2. O NGINX entrega `index.html`, `styles.css`, `app.js` e o logo.
3. O JavaScript chama rotas como `/api/filmes`.
4. O NGINX recebe `/api/filmes` e encaminha para `http://fastapi:8080/api/filmes`.
5. O FastAPI processa a rota, acessa o PostgreSQL e devolve JSON.
6. O frontend atualiza a tela com a resposta.

## 3. Estrutura Real do Projeto

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

Ponto importante para a entrevista:

- O documento original sugere separar `models.py`, `database.py`, `schemas.py` e `routes/`.
- Neste projeto, para ficar didatico e curto, tudo do backend esta em `backend/app/main.py`.
- Isso nao impede o funcionamento. A separacao em varios arquivos seria uma melhoria de organizacao, nao uma exigencia para a API funcionar.

## 4. Docker Compose

Arquivo principal:

- `docker-compose.yml`

Servicos:

- `nginx`
- `fastapi`
- `postgres`

Rede:

- `netatividade01`

Volume:

- `postgres_data`

### 4.1 Servico nginx

Trecho importante:

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

- O NGINX e construido a partir de `nginx/Dockerfile`.
- Ele depende do FastAPI saudavel antes de iniciar.
- Ele e o unico servico com `ports`.
- `80:8080` significa: porta 80 do computador aponta para porta 8080 do container.
- `443:8443` significa: porta 443 do computador aponta para porta 8443 do container.
- Ele participa da rede `netatividade01`, entao consegue falar com o servico `fastapi`.

Pergunta provavel:

> Por que o FastAPI e o PostgreSQL nao tem `ports`?

Resposta:

> Porque a atividade exige que somente o NGINX seja exposto ao hospedeiro. O backend e o banco ficam protegidos na rede interna Docker. O NGINX e a porta de entrada da aplicacao.

### 4.2 Servico fastapi

Trecho importante:

```yaml
fastapi:
  build:
    context: ./backend
  container_name: cinereview-fastapi
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

- A imagem do backend e criada usando `backend/Dockerfile`.
- O FastAPI recebe dados do banco por variaveis de ambiente.
- `DB_HOST: postgres` funciona porque, dentro da rede Docker, o nome do servico vira um DNS interno.
- `expose: 8080` documenta que a API usa a porta 8080 internamente.
- `depends_on` com `condition: service_healthy` faz o FastAPI esperar o PostgreSQL estar pronto.

Pergunta provavel:

> O que significa `DB_HOST=postgres`?

Resposta:

> Significa que o backend vai conectar no servico chamado `postgres` dentro da rede Docker. O Docker Compose cria esse nome automaticamente como endereco interno.

### 4.3 Servico postgres

Trecho importante:

```yaml
postgres:
  image: postgres:16-alpine
  container_name: cinereview-postgres
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB}
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

Como explicar:

- Usa imagem oficial do PostgreSQL.
- O usuario e `postgres`, como a atividade pede.
- A senha vem do `.env`.
- Os dados ficam em `/var/lib/postgresql/data` dentro do container.
- O volume `postgres_data` preserva os dados mesmo depois de `docker compose down`.

Atenção:

- A atividade pede que a senha seja a matricula de um integrante.
- Entao o valor de `POSTGRES_PASSWORD` no `.env` deve ser trocado para a matricula antes da entrega.
- Se o volume ja tiver sido criado com uma senha antiga, trocar o `.env` nao muda a senha dentro do banco existente. Em ambiente de teste, pode ser necessario rodar `docker compose down -v` para recriar o volume.

## 5. NGINX

Arquivos:

- `nginx/Dockerfile`
- `nginx/default.conf`

### 5.1 Dockerfile do NGINX

O Dockerfile:

- Usa `nginx:1.27-alpine`.
- Instala `openssl`.
- Gera um certificado autoassinado.
- Copia `nginx/default.conf`.
- Copia a pasta `frontend/` para `/usr/share/nginx/html/`.
- Expoe internamente as portas `8080` e `8443`.

Como explicar:

> O NGINX serve os arquivos estaticos que foram copiados para `/usr/share/nginx/html`. Ele tambem escuta em 8080 para HTTP e 8443 para HTTPS interno. No Compose, essas portas internas viram 80 e 443 no computador.

### 5.2 Configuracao do proxy reverso

Trecho principal de `nginx/default.conf`:

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

- Qualquer rota que comece com `/api` sera enviada ao container `fastapi` na porta `8080`.
- `fastapi` nao e IP fixo; e o nome do servico no Docker Compose.
- Isso e melhor que usar IP manual, porque o IP do container pode mudar.
- Os headers preservam informacoes da requisicao original.

Ponto muito importante:

- Neste projeto, o FastAPI tambem define as rotas com `/api`, por exemplo `/api/filmes`.
- O NGINX usa `proxy_pass http://fastapi:8080;` sem barra no final.
- Assim, `/api/filmes` chega ao backend como `/api/filmes`.
- Se fosse usado `proxy_pass http://fastapi:8080/;`, o comportamento de caminho poderia mudar e exigiria ajustar as rotas.

Pergunta provavel:

> Por que o frontend nao chama `http://fastapi:8080` direto?

Resposta:

> Porque esse endereco so existe dentro da rede Docker. O navegador do usuario acessa apenas o NGINX em `localhost`. Por isso o frontend chama `/api`, e o NGINX encaminha internamente.

## 6. Backend FastAPI

Arquivo:

- `backend/app/main.py`

Dependencias:

- `fastapi`
- `uvicorn[standard]`
- `SQLAlchemy`
- `psycopg2-binary`

### 6.1 Conexao com o banco

Trecho conceitual:

```python
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "cinereview")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
```

Como explicar:

- `os.getenv` le variaveis de ambiente.
- Esses valores sao enviados pelo `docker-compose.yml`.
- O backend nao tem senha fixa no codigo.
- Isso facilita mudar banco, senha ou host sem editar o Python.

Trecho conceitual:

```python
DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
```

Como explicar:

> Essa string e o endereco completo do banco. Ela diz: use PostgreSQL com o driver psycopg2, conecte com usuario e senha, no host e porta informados, e acesse o banco definido.

### 6.2 SQLAlchemy

Objetos importantes:

- `engine`: representa a conexao com o banco.
- `SessionLocal`: fabrica sessoes de banco para cada requisicao.
- `Base`: classe base usada para criar os modelos/tabelas.

Pergunta provavel:

> Por que existe `get_db()`?

Resposta:

> Porque cada rota precisa de uma sessao de banco. A funcao `get_db()` cria a sessao, entrega para a rota com `Depends`, e fecha a sessao no final para evitar conexoes abertas.

### 6.3 Modelos do banco

Modelo `Filme`:

```python
class Filme(Base):
    __tablename__ = "filmes"
```

Campos:

- `id`
- `titulo`
- `diretor`
- `genero`
- `ano`
- `sinopse`

Relacionamento:

```python
avaliacoes = relationship(
    "Avaliacao",
    back_populates="filme",
    cascade="all, delete-orphan",
)
```

Como explicar:

- `relationship` permite acessar as avaliacoes de um filme pelo Python.
- `cascade="all, delete-orphan"` faz com que, ao apagar um filme, suas avaliacoes tambem sejam apagadas.

Modelo `Avaliacao`:

```python
filme_id = Column(Integer, ForeignKey("filmes.id", ondelete="CASCADE"), nullable=False)
```

Como explicar:

- `filme_id` e a chave estrangeira.
- Ela garante que a avaliacao esteja ligada a um filme.
- `ondelete="CASCADE"` reforca a ideia de apagar avaliacoes quando o filme for apagado.

### 6.4 Schemas Pydantic

Schemas de filme:

- `FilmeCreate`: dados para criar.
- `FilmeUpdate`: dados opcionais para editar.
- `FilmeRead`: formato de resposta.

Schemas de avaliacao:

- `AvaliacaoCreate`
- `AvaliacaoUpdate`
- `AvaliacaoRead`

Validacoes importantes:

```python
nota: float = Field(ge=0, le=10)
ano: int = Field(ge=1888, le=2100)
```

Como explicar:

- `ge` significa maior ou igual.
- `le` significa menor ou igual.
- A nota so aceita valores de 0 a 10.
- O ano so aceita valores de 1888 a 2100.

Pergunta provavel:

> Qual a diferenca entre model SQLAlchemy e schema Pydantic?

Resposta:

> SQLAlchemy define como os dados sao salvos no banco. Pydantic define como os dados entram e saem pela API, incluindo validacao.

### 6.5 Inicializacao das tabelas

Funcao:

```python
criar_tabelas_com_retry()
```

Como explicar:

- Ela tenta conectar no banco.
- Se o PostgreSQL ainda nao estiver pronto, aguarda e tenta de novo.
- Quando conecta, executa `Base.metadata.create_all(bind=engine)`.
- Isso cria as tabelas se elas ainda nao existirem.

Pergunta provavel:

> O projeto usa migrations?

Resposta:

> Nao. Para uma atividade didatica, usamos `create_all` para criar as tabelas automaticamente. Em projeto profissional, seria melhor usar Alembic para migrations.

### 6.6 Rotas do backend

Saude:

- `GET /api/health`

Filmes:

- `POST /api/filmes`
- `GET /api/filmes`
- `GET /api/filmes/{filme_id}`
- `PUT /api/filmes/{filme_id}`
- `DELETE /api/filmes/{filme_id}`

Avaliacoes:

- `POST /api/avaliacoes`
- `GET /api/avaliacoes`
- `GET /api/avaliacoes?filme_id=1`
- `GET /api/filmes/{filme_id}/avaliacoes`
- `GET /api/avaliacoes/{avaliacao_id}`
- `PUT /api/avaliacoes/{avaliacao_id}`
- `DELETE /api/avaliacoes/{avaliacao_id}`

Tratamento de erro:

- `buscar_filme_ou_404` retorna erro 404 se o filme nao existir.
- `buscar_avaliacao_ou_404` retorna erro 404 se a avaliacao nao existir.

Pergunta provavel:

> O que acontece se eu tentar criar avaliacao para um filme inexistente?

Resposta:

> Antes de criar a avaliacao, a rota chama `buscar_filme_ou_404`. Se o filme nao existir, a API devolve 404 e nao grava a avaliacao.

## 7. Frontend

Arquivos:

- `frontend/index.html`
- `frontend/styles.css`
- `frontend/app.js`
- `frontend/assets/cinereview-logo.svg`

### 7.1 index.html

O HTML tem:

- Cabecalho com nome do sistema.
- Indicador de status da API.
- Formulario de filme.
- Formulario de avaliacao.
- Area de catalogo/listagem.

Como explicar:

> O HTML define a estrutura da tela. Ele nao acessa o banco diretamente. Quem faz chamadas HTTP e o JavaScript no `app.js`.

### 7.2 app.js

Trecho importante:

```javascript
const API = "/api";
```

Como explicar:

- O frontend usa caminho relativo.
- Isso evita CORS.
- O navegador chama o mesmo host do NGINX.
- O NGINX encaminha para o backend.

Funcao importante:

```javascript
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, ...)
}
```

Como explicar:

- Centraliza chamadas para a API.
- Adiciona `Content-Type: application/json`.
- Trata resposta `204 No Content`.
- Mostra erros retornados pela API.

Funcoes principais:

- `carregarDados()`: busca filmes e atualiza tela.
- `renderSelectFilmes()`: preenche o select de filmes no formulario de avaliacao.
- `renderFilmes()`: monta os cards dos filmes e avaliacoes.
- `limparFilmeForm()`: limpa formulario de filme.
- `limparAvaliacaoForm()`: limpa formulario de avaliacao.
- Event listeners dos formularios: criam ou editam registros.
- Event listener da lista: edita ou exclui filmes e avaliacoes.

Pergunta provavel:

> Onde eu mudaria o frontend para chamar outra rota?

Resposta:

> Em `frontend/app.js`, nas chamadas da funcao `request`, por exemplo `request("/filmes")` ou `request("/avaliacoes")`.

## 8. Como Demonstrar na Apresentacao

Roteiro pratico:

1. Mostrar `docker-compose.yml`.
2. Apontar que so `nginx` tem `ports`.
3. Mostrar a rede `netatividade01`.
4. Mostrar o volume `postgres_data`.
5. Mostrar que o `fastapi` depende do `postgres` com healthcheck.
6. Mostrar `nginx/default.conf` e o `proxy_pass`.
7. Mostrar `backend/app/main.py` e explicar modelos, schemas e rotas.
8. Mostrar `frontend/app.js` e explicar `const API = "/api"`.
9. Rodar `docker compose up --build`.
10. Abrir `http://localhost`.
11. Criar um filme.
12. Criar uma avaliacao para esse filme.
13. Editar e excluir registros.
14. Abrir `http://localhost/api/docs`.

Frase boa para fechar:

> A aplicacao demonstra a topologia pedida: frontend e proxy no NGINX, API isolada no FastAPI, banco isolado no PostgreSQL, comunicacao interna pela rede Docker e persistencia por volume.

## 9. Comandos que Todos Devem Saber

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

Ver configuracao final do Compose:

```bash
docker compose config
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

Listar tabelas no PostgreSQL:

```sql
\dt
```

Consultar filmes:

```sql
SELECT * FROM filmes;
```

Consultar avaliacoes:

```sql
SELECT * FROM avaliacoes;
```

## 10. Testes com curl

Health check:

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

## 11. Perguntas Provaveis da Entrevista

### Docker e Compose

Pergunta: O que o Docker Compose faz neste projeto?

Resposta: Ele sobe e integra os tres servicos da aplicacao: NGINX, FastAPI e PostgreSQL, criando rede, volume, variaveis de ambiente e dependencias.

Pergunta: Por que usamos containers separados?

Resposta: Para separar responsabilidades. O NGINX cuida da entrada e frontend, o FastAPI da regra de negocio/API, e o PostgreSQL da persistencia dos dados.

Pergunta: O que e a rede `netatividade01`?

Resposta: E uma rede Docker customizada onde os containers se comunicam internamente por nome de servico.

Pergunta: O que e um volume Docker?

Resposta: E uma area persistente gerenciada pelo Docker. O volume do PostgreSQL guarda os dados mesmo quando o container e recriado.

Pergunta: O que acontece se rodar `docker compose down -v`?

Resposta: Os containers param e o volume e apagado. No caso do PostgreSQL, os dados do banco sao perdidos.

### NGINX

Pergunta: O que e proxy reverso?

Resposta: E quando um servidor recebe requisicoes do cliente e encaminha internamente para outro servico. Aqui, o NGINX recebe `/api` e encaminha para o FastAPI.

Pergunta: Por que o NGINX e o unico exposto?

Resposta: Porque ele e a porta de entrada. Isso deixa backend e banco protegidos na rede interna e cumpre o requisito da atividade.

Pergunta: Onde o NGINX serve o frontend?

Resposta: Em `/usr/share/nginx/html`, dentro do container. O Dockerfile copia a pasta `frontend/` para esse local.

### FastAPI

Pergunta: Qual comando inicia a API?

Resposta: O `CMD` do Dockerfile executa `uvicorn app.main:app --host 0.0.0.0 --port 8080`.

Pergunta: O que e Uvicorn?

Resposta: E o servidor ASGI que executa a aplicacao FastAPI dentro do container.

Pergunta: Onde estao as rotas?

Resposta: No arquivo `backend/app/main.py`, decoradas com `@app.get`, `@app.post`, `@app.put` e `@app.delete`.

Pergunta: Como a API valida dados?

Resposta: Usando schemas Pydantic, com `Field`, limites de tamanho, `nota` entre 0 e 10 e `ano` entre 1888 e 2100.

### PostgreSQL

Pergunta: Como o backend conecta no banco?

Resposta: Ele le `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` das variaveis de ambiente e monta a `DATABASE_URL`.

Pergunta: Por que `postgres` nao tem porta publicada?

Resposta: Porque o banco so deve ser acessado pela rede interna, principalmente pelo backend.

Pergunta: Como provar que os dados persistem?

Resposta: Cadastre dados, rode `docker compose down`, depois `docker compose up` novamente. Os dados continuam porque estao no volume.

### CRUD e Relacionamento

Pergunta: O que e CRUD?

Resposta: Create, Read, Update e Delete: criar, listar/buscar, atualizar e remover registros.

Pergunta: Onde esta o relacionamento entre filme e avaliacao?

Resposta: Em `Avaliacao.filme_id`, que e uma ForeignKey para `filmes.id`, e nos `relationship` entre `Filme` e `Avaliacao`.

Pergunta: O que acontece ao excluir um filme?

Resposta: As avaliacoes ligadas a ele tambem sao excluidas por causa do cascade configurado no relacionamento.

### Frontend

Pergunta: Por que o frontend usa `/api` em vez de uma URL completa?

Resposta: Porque frontend e API estao no mesmo host visto pelo navegador. O NGINX resolve o encaminhamento internamente, evitando CORS.

Pergunta: Onde fica a logica de editar e excluir?

Resposta: Em `frontend/app.js`, principalmente nos event listeners dos formularios e da lista de filmes.

## 12. Alteracoes que o Professor Pode Pedir

### Adicionar campo `duracao` em filmes

Arquivos:

- `backend/app/main.py`
- `frontend/index.html`
- `frontend/app.js`
- `README.md`

Passos:

1. Adicionar `duracao = Column(Integer, nullable=True)` no modelo `Filme`.
2. Adicionar `duracao` nos schemas `FilmeBase` e `FilmeUpdate`.
3. Adicionar input no formulario de filme.
4. Enviar `duracao` no payload do JavaScript.
5. Mostrar `duracao` no card.
6. Se o banco ja existir, em ambiente de teste usar `docker compose down -v` para recriar as tabelas.

### Filtrar filmes por genero

Arquivo principal:

- `backend/app/main.py`

Ideia:

```python
@app.get("/api/filmes", response_model=list[FilmeRead])
def listar_filmes(genero: Optional[str] = None, db: Session = Depends(get_db)):
    consulta = db.query(Filme)
    if genero:
        consulta = consulta.filter(Filme.genero.ilike(f"%{genero}%"))
    return consulta.order_by(Filme.id).all()
```

Depois, no frontend, chamar:

```javascript
request("/filmes?genero=Drama")
```

### Criar rota para media de notas

Arquivo:

- `backend/app/main.py`

Ideia:

```python
@app.get("/api/filmes/{filme_id}/media")
def media_filme(filme_id: int, db: Session = Depends(get_db)):
    filme = buscar_filme_ou_404(db, filme_id)
    if not filme.avaliacoes:
        return {"filme_id": filme_id, "media": None}
    media = sum(a.nota for a in filme.avaliacoes) / len(filme.avaliacoes)
    return {"filme_id": filme_id, "media": round(media, 1)}
```

### Mudar nota de 0-10 para 0-5

Arquivos:

- `backend/app/main.py`
- `frontend/index.html`

Alterar:

- `Field(ge=0, le=10)` para `Field(ge=0, le=5)`.
- `max="10"` para `max="5"` no input da nota.

### Separar o backend em varios arquivos

Arquivos novos:

- `backend/app/database.py`
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/routes/filmes.py`
- `backend/app/routes/avaliacoes.py`

Como explicar:

> Hoje esta tudo em `main.py` por simplicidade. Separar em arquivos melhora manutencao, mas a logica e a mesma.

## 13. Erros Comuns e Como Resolver

Erro:

```text
dockerDesktopLinuxEngine: O sistema nao pode encontrar o arquivo especificado
```

Causa:

- Docker Desktop nao esta aberto ou o servico do Docker nao esta rodando.

Solucao:

- Abrir Docker Desktop.
- Esperar ficar ativo.
- Testar `docker version` e verificar se aparece `Server`.

Erro:

```text
port is already allocated
```

Causa:

- Algum programa ja esta usando porta 80 ou 443.

Solucao:

- Fechar o programa que usa a porta.
- Verificar IIS, Apache, outro NGINX ou outro projeto Docker.

Erro:

```text
password authentication failed for user "postgres"
```

Causa:

- Senha do `.env` mudou depois do volume ja ter sido criado.

Solucao em ambiente de teste:

```bash
docker compose down -v
docker compose up --build
```

Erro:

```text
404 Not Found em /api/filmes
```

Possiveis causas:

- NGINX nao encaminhou corretamente.
- Backend nao subiu.
- Rota foi alterada no FastAPI.

Como investigar:

```bash
docker compose logs nginx
docker compose logs fastapi
```

Erro:

```text
ModuleNotFoundError
```

Causa:

- Dependencia faltando no `requirements.txt`.

Solucao:

- Adicionar dependencia.
- Rodar `docker compose up --build` para reconstruir imagem.

## 14. Checklist de Dominio Individual

Cada integrante deve conseguir responder:

- O que cada container faz.
- Por que so o NGINX tem `ports`.
- Como o NGINX encaminha `/api`.
- Como o FastAPI encontra o PostgreSQL.
- Onde estao as variaveis de ambiente.
- Onde esta o volume do banco.
- Onde estao os modelos `Filme` e `Avaliacao`.
- Onde esta a ForeignKey.
- Onde a API valida a nota.
- Onde o frontend chama a API.
- Como criar, editar e excluir registros pela tela.
- Como testar a API pelo navegador, Swagger ou curl.
- Como ver logs de erro.
- Como apagar o volume em ambiente de teste.

## 15. Divisao Recomendada para Estudo em Grupo

Integrante 1:

- Docker Compose.
- Rede.
- Volumes.
- Variaveis de ambiente.
- Comandos Docker.

Integrante 2:

- FastAPI.
- SQLAlchemy.
- Pydantic.
- Rotas CRUD.
- Relacionamento entre tabelas.

Integrante 3:

- NGINX.
- Frontend.
- Fetch usando `/api`.
- Fluxo navegador -> NGINX -> API -> banco.

Mesmo com essa divisao, todos devem saber o fluxo completo em alto nivel.

## 16. Respostas Curtas para Decorar

Por que usamos Docker Compose?

> Para subir varios containers integrados com um unico comando.

Por que usamos NGINX?

> Para servir o frontend e encaminhar `/api` para o backend.

Por que usamos PostgreSQL com volume?

> Para armazenar os dados de forma persistente.

Por que usamos variaveis de ambiente?

> Para configurar banco, usuario e senha sem deixar tudo fixo no codigo.

Por que o backend usa `postgres` como host?

> Porque `postgres` e o nome do servico dentro da rede Docker.

Por que nao tem CORS?

> Porque o navegador chama sempre o NGINX no mesmo host, e o NGINX faz o proxy interno.

O que e `healthcheck`?

> E um teste que o Docker executa para saber se o container esta saudavel.

O que e `depends_on`?

> Define ordem/dependencia entre servicos. Aqui o FastAPI espera o PostgreSQL estar saudavel.

O que e ForeignKey?

> E uma chave que liga uma tabela a outra. Aqui, `avaliacoes.filme_id` liga avaliacao a filme.

O que e cascade?

> E uma regra para apagar registros dependentes. Ao apagar um filme, suas avaliacoes tambem sao apagadas.

## 17. Checklist Final Antes da Apresentacao

- Docker Desktop aberto.
- `docker version` mostrando `Client` e `Server`.
- `.env` com senha igual a matricula de um integrante.
- `docker compose config` sem erro.
- `docker compose up --build` funcionando.
- `http://localhost` abrindo o frontend.
- `http://localhost/api/health` retornando `{"status":"ok"}`.
- `http://localhost/api/docs` abrindo Swagger.
- Cadastro de filme funcionando.
- Cadastro de avaliacao funcionando.
- Edicao e exclusao funcionando.
- Professor consegue ver no Compose que so NGINX tem `ports`.

