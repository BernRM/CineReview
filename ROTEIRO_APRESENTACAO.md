# Roteiro de Apresentacao - CineReview

Este roteiro e para treinar em casa. A ideia e falar enquanto mostra a tela, o codigo e a execucao.

Tempo sugerido: 8 a 12 minutos.

## 1. Abertura

O que falar:

> Nosso projeto e o CineReview, um sistema de filmes e avaliacoes.Usando Docker Compose com tres servicos: NGINX, FastAPI e PostgreSQL.

Mostrar:

- `README.md`, titulo do projeto e resumo.
- Tema: Grupo 7, Sistema de Filmes e Avaliacoes.

Ponto importante:

> A aplicacao permite cadastrar filmes, cadastrar avaliacoes, listar, editar e excluir registros.

## 2. Visao geral da arquitetura

O que falar:

> A arquitetura segue o fluxo pedido: o navegador acessa apenas o NGINX. O NGINX entrega o frontend e encaminha chamadas `/api` para o FastAPI. O FastAPI acessa o PostgreSQL pela rede interna Docker. O banco guarda os dados em volume.

Mostrar:

- `README.md`, secao Arquitetura.
- Se quiser, mostrar o diagrama Mermaid.

Frase curta:

> Navegador fala com NGINX, NGINX fala com FastAPI, FastAPI fala com PostgreSQL.

## 3. Docker Compose

Abrir:

- `docker-compose.yml`

O que mostrar e falar:

1. Servico `nginx`.

> Aqui esta o NGINX. Ele e o unico servico com `ports`, entao e o unico exposto ao computador. As portas sao `80:8080` para HTTP e `443:8443` para HTTPS.

2. Servico `fastapi`.

> O FastAPI e construido a partir da pasta `backend`. Ele recebe as configuracoes do banco por variaveis de ambiente. Repare que ele usa `DB_HOST: postgres`, porque `postgres` e o nome do servico dentro da rede Docker.

3. Servico `postgres`.

> O banco usa imagem oficial do PostgreSQL, usuario `postgres`, senha vinda do `.env` e volume `postgres_data` para persistencia.

4. Rede e volume.

> Todos os servicos estao na rede `netatividade01`, que permite comunicacao interna entre containers. O volume `postgres_data` guarda os dados do banco.

Comando para mostrar:

```bash
docker compose config
```

O que falar:

> Esse comando mostra a configuracao final interpretada pelo Docker Compose e ajuda a validar se o arquivo esta correto.

## 4. NGINX

Abrir:

- `nginx/Dockerfile`

O que falar:

> O Dockerfile do NGINX usa a imagem `nginx:1.27-alpine`, gera um certificado autoassinado para HTTPS local, copia a configuracao do NGINX e copia o frontend para `/usr/share/nginx/html`.

Abrir:

- `nginx/default.conf`

O que falar:

> Aqui o NGINX escuta nas portas internas 8080 e 8443. Na rota `/`, ele serve o frontend. Na rota `/api`, ele faz proxy reverso para `http://fastapi:8080`.

Apontar:

```nginx
location /api {
    proxy_pass http://fastapi:8080;
}
```

Frase importante:

> O navegador nao chama `fastapi:8080` diretamente. Ele chama `/api` no NGINX, e o NGINX encaminha internamente.

## 5. Backend FastAPI

Abrir:

- `backend/Dockerfile`

O que falar:

> O backend usa Python 3.12, instala as dependencias do `requirements.txt`, copia a aplicacao e executa Uvicorn na porta 8080.

Abrir:

- `backend/requirements.txt`

O que falar:

> As dependencias principais sao FastAPI, Uvicorn, SQLAlchemy e psycopg2, que e o driver para conectar no PostgreSQL.

Abrir:

- `backend/app/main.py`

Ordem para mostrar:

1. Variaveis de ambiente.

> Aqui o backend le `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`. Esses valores vem do Docker Compose.

2. Modelos SQLAlchemy.

> O modelo `Filme` representa a tabela de filmes. O modelo `Avaliacao` representa a tabela de avaliacoes. A avaliacao tem `filme_id`, que e a chave estrangeira para o filme.

3. Relacionamento.

> Um filme pode ter varias avaliacoes. O `cascade` faz com que, ao excluir um filme, as avaliacoes dele tambem sejam excluidas.

4. Schemas Pydantic.

> Os schemas validam os dados que entram e saem da API. Por exemplo, a nota precisa estar entre 0 e 10, e o ano entre 1888 e 2100.

5. Criacao das tabelas.

> A funcao `criar_tabelas_com_retry` espera o banco estar pronto e cria as tabelas se elas ainda nao existirem.

6. Rotas.

> Aqui ficam as rotas CRUD. Temos rotas para criar, listar, buscar, atualizar e excluir filmes e avaliacoes.

Rotas para citar:

- `GET /api/health`
- `GET /api/filmes`
- `POST /api/filmes`
- `PUT /api/filmes/{filme_id}`
- `DELETE /api/filmes/{filme_id}`
- `GET /api/avaliacoes`
- `POST /api/avaliacoes`
- `PUT /api/avaliacoes/{avaliacao_id}`
- `DELETE /api/avaliacoes/{avaliacao_id}`

## 6. Frontend

Abrir:

- `frontend/index.html`

O que falar:

> O HTML monta a estrutura da tela: cabecalho, resumo, formulario de filme, formulario de avaliacao e area de catalogo.

Abrir:

- `frontend/app.js`

Apontar:

```javascript
const API = "/api";
```

O que falar:

> O frontend usa caminho relativo `/api`. Assim, o navegador chama o NGINX em `localhost`, e o NGINX encaminha para o FastAPI. Isso evita CORS e mantem backend isolado.

Mostrar funcoes:

- `request()`
- `carregarDados()`
- `renderFilmes()`
- Event listeners dos formularios

O que falar:

> A funcao `request` centraliza as chamadas HTTP. Os formularios usam `POST` para criar e `PUT` para editar. Os botoes de excluir usam `DELETE`.

Abrir:

- `frontend/styles.css`

O que falar:

> O CSS cuida apenas da apresentacao visual da tela. A regra de negocio continua na API.

## 7. Execucao

No terminal, rodar:

```bash
docker compose up --build
```

O que falar:

> Esse comando constroi as imagens e sobe os tres containers. Primeiro sobe o PostgreSQL, depois o FastAPI, e por fim o NGINX, respeitando os healthchecks.

Em outro terminal, rodar:

```bash
docker compose ps
```

O que falar:

> Aqui da para ver os containers rodando. O esperado e ver NGINX, FastAPI e PostgreSQL ativos e saudaveis.

Abrir no navegador:

- `http://localhost`

O que demonstrar na tela:

1. Mostrar status da API online.
2. Cadastrar um filme.
3. Cadastrar uma avaliacao para esse filme.
4. Mostrar que a media aparece no card.
5. Editar o filme.
6. Editar a avaliacao.
7. Excluir a avaliacao.
8. Excluir o filme.

Fala para cada acao:

> Quando eu salvo, o frontend envia uma requisicao para `/api`. O NGINX encaminha para o FastAPI, o FastAPI grava no PostgreSQL e a tela recarrega os dados.

Abrir:

- `http://localhost/api/health`

O que falar:

> Essa rota mostra que a API esta respondendo.

Abrir:

- `http://localhost/api/docs`

O que falar:

> O FastAPI gera automaticamente a documentacao Swagger. Por aqui tambem da para testar as rotas da API.

## 8. Teste de persistencia

Se houver tempo, demonstrar:

1. Cadastrar um filme.
2. Parar:

```bash
docker compose down
```

3. Subir de novo:

```bash
docker compose up --build
```

4. Abrir `http://localhost` e mostrar que o filme continua.

O que falar:

> Os dados continuam porque o PostgreSQL salva em `postgres_data`. Se eu usasse `docker compose down -v`, o volume seria removido e os dados seriam apagados.

## 9. Fechamento

Frase pronta:

> Entao o projeto cumpre a proposta da atividade: temos NGINX como unica entrada publica, frontend estatico, proxy reverso para FastAPI, backend CRUD, PostgreSQL isolado, rede Docker propria, variaveis de ambiente e volume persistente.

## 10. Plano B se algo der errado na hora

Se Docker nao abrir:

> O Docker Desktop precisa estar ativo. O erro esperado quando ele esta fechado e algo como `dockerDesktopLinuxEngine: O sistema nao pode encontrar o arquivo especificado`.

Se porta 80 estiver ocupada:

> Algum outro servico esta usando a porta. Podemos fechar esse servico ou, para teste local, alterar temporariamente a porta publicada no Compose.

Se o banco der erro de senha:

> Provavelmente o volume foi criado com senha antiga. Em ambiente de teste, recriamos com `docker compose down -v`.

Se a tela abrir mas a API ficar offline:

> Verificar logs com `docker compose logs fastapi` e `docker compose logs nginx`.

## 11. Treino individual

Cada integrante deve treinar responder sem ler:

- O que cada container faz.
- Por que so o NGINX tem porta publicada.
- Como `/api` chega ao FastAPI.
- Como o FastAPI encontra o PostgreSQL.
- Onde esta o volume.
- Onde esta a ForeignKey.
- Como o CRUD funciona.
- Como o frontend chama a API.
- Como provar que a API esta online.
- Como provar que os dados persistem.
