# Roteiro de Apresentação — Trabalho 02 (Swarm + Loki)

> **Grupo 7 — CineView.** Demonstração ao vivo do cluster. Tempo alvo: 8–12 min.
> Faça os passos 1–4 (deploy) **antes** da entrevista; em sala, comece já com o cluster no ar e foque em **mostrar** e **explicar**.

---

## Antes de entrar (checklist de preparação)

- [ ] As 2 VMs ligadas, com Docker, se enxergando na rede.
- [ ] Swarm iniciado, VM1 (worker) e VM2 (manager) no cluster (`docker node ls` mostra 2 nós).
- [ ] Nós rotulados (`tier=data` na VM1, `tier=app` na VM2).
- [ ] Secret `db_password` criado.
- [ ] Imagens `cineview-fastapi:latest` e `cineview-nginx:latest` buildadas na VM2.
- [ ] Stack implantada e `docker stack services cineview` mostrando réplicas completas (2/2, 1/1...).
- [ ] Aplicação abrindo em `http://<IP-VM2>` e Grafana em `http://<IP-VM2>:3000`.
- [ ] Dois terminais abertos: um na VM2 (manager) e um na VM1 (dados).

---

## Parte 1 — Abertura (1 min)

> "Nosso projeto é o CineView, Sistema de Filmes e Avaliações. No Trabalho 01 ele rodava com Docker Compose num host só. No Trabalho 02 nós o portamos para um cluster **Docker Swarm com duas VMs**, separando a camada de dados da camada de aplicação, com rede overlay, réplicas, secret e coleta de logs centralizada no Grafana Loki."

Mostrar o diagrama de topologia (no README, seção Trabalho 02).

---

## Parte 2 — O cluster e a separação de camadas (2–3 min)

**Falar enquanto mostra:**

```bash
docker node ls
```
> "Temos dois nós: a VM2 é o **manager** e a VM1 é o **worker**. Rotulamos os nós com `tier=app` e `tier=data`."

```bash
docker node inspect <nó-VM1> --format '{{ .Spec.Labels }}'
docker stack services cineview
```
> "A stack tem cinco serviços. NGINX e FastAPI com **2 réplicas**; PostgreSQL, Loki e Grafana com 1."

```bash
docker service ps cineview_postgres --format 'table {{.Name}}\t{{.Node}}\t{{.CurrentState}}'
docker service ps cineview_fastapi  --format 'table {{.Name}}\t{{.Node}}\t{{.CurrentState}}'
```
> "Repare: o PostgreSQL roda **só na VM1** e as réplicas do FastAPI **só na VM2**. Isso é garantido pelas **placement constraints** baseadas nos labels — abrir o `docker-stack/docker-stack.yml` e apontar o bloco `placement.constraints`."

**Mostrar no código:** `docker-stack/docker-stack.yml` → blocos `deploy.placement.constraints` e `networks: cineview_net: driver: overlay`.

---

## Parte 3 — Aplicação funcionando (1 min)

> Abrir `http://<IP-VM2>` no navegador. Fazer um login rápido / navegar por filmes.

> "A aplicação é a mesma do Trabalho 01 — CRUD de filmes e avaliações — agora servida pelas réplicas no cluster. O NGINX é o único ponto de entrada; ele faz proxy de `/api` para o serviço `fastapi`, que o DNS interno do Swarm resolve e balanceia entre as duas réplicas."

---

## Parte 4 — Secret do Swarm (1 min)

```bash
docker secret ls
```
> "A senha do banco é um **secret do Swarm**, não está no Git nem em variável de ambiente. O Postgres lê via `POSTGRES_PASSWORD_FILE` e o FastAPI lê o mesmo arquivo montado em `/run/secrets/db_password`."

**Mostrar no código:** `config.py` (validador `_load_password_from_file`) e o bloco `secrets:` no stack.

---

## Parte 5 — Logs no Loki via API HTTP (2–3 min) ⭐ *o que o professor exige*

No terminal da **VM1**:

```bash
# 1) Labels disponíveis — prova que o Loki está recebendo dados
curl http://localhost:3100/loki/api/v1/labels

# 2) Logs do FastAPI dos últimos 10 minutos
curl -G 'http://localhost:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={service="fastapi"}' \
  --data-urlencode 'start='"$(date -d '10 minutes ago' +%s000000000)" \
  --data-urlencode 'end='"$(date +%s000000000)"
```

> "O FastAPI envia ao Loki: a **inicialização** da app, **cada requisição** (método, rota e status) e **erros de conexão com o PostgreSQL**. Aqui consultamos direto pela **API HTTP**, sem interface gráfica."

**Dica de efeito:** atualize uma página da aplicação no navegador e rode a query de novo — as novas requisições aparecem.

**Mostrar no código:** `backend/app/logger.py` (payload + push) e o middleware `loki_request_logging` em `main.py`.

---

## Parte 6 — Grafana (extra, 1 min)

> Abrir `http://<IP-VM2>:3000` → **Explore** → datasource **Loki** → query `{service="fastapi"}`.

> "Como desafio extra, adicionamos o Grafana na VM2 com o datasource do Loki já provisionado, para visualizar os mesmos logs numa interface."

---

## Parte 7 — Isolamento de rede (1 min)

De uma máquina **fora** do cluster (ou explicando):

```bash
curl http://<IP-VM1>:5432    # PostgreSQL: conexão recusada
curl http://<IP-VM1>:3100    # Loki: não publicado ao host
curl -I http://<IP-VM2>      # NGINX: responde
```
> "Só o NGINX publica porta para o host. Banco, Loki e FastAPI vivem apenas na rede overlay interna do cluster."

---

## Parte 8 — Fechamento (30 s)

> "Resumindo: portamos a aplicação para um cluster Swarm de duas VMs, com separação de camadas por constraints, rede overlay para comunicação entre hosts, réplicas para o front e o back, secret para a senha do banco e logs centralizados no Loki consultáveis por HTTP. Posso mostrar qualquer parte do código ou da configuração."

---

## Se algo der errado ao vivo (plano B)

| Sintoma | Verificação rápida |
|---|---|
| Serviço sem réplicas (0/2) | `docker service ps <serviço> --no-trunc` → ver erro (imagem faltando? constraint sem nó?) |
| FastAPI reiniciando | `docker service logs cineview_fastapi` → erro de conexão com banco? |
| Loki sem dados | Gere tráfego (atualize o site) e refaça a query; confira `docker service ps cineview_loki` |
| App não abre | Confirme NGINX 2/2 e que está acessando o IP da **VM2** |
| Query do Loki vazia | Aumente a janela de tempo (start de 1h atrás) |

> Mantenha o **README** aberto numa aba — todos os comandos estão lá na seção "Trabalho 02".
