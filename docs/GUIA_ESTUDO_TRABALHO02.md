# Guia de Estudo — Trabalho 02 (Docker Swarm + Loki)

> **Grupo 7 — Sistema de Filmes e Avaliações (CineView)**
> Entrevista: **03/07/2026** · vale 30 pts (80% entrevista, 20% repositório).
> O professor já avaliou o Trabalho 01, então **a entrevista foca no que é novo**: a portabilidade para o cluster Docker Swarm e a coleta de logs com o Loki. Estude principalmente este guia.

---

## 1. Resumo em 30 segundos

> "Pegamos a mesma aplicação do Trabalho 01 (NGINX + FastAPI + PostgreSQL) e a implantamos num cluster **Docker Swarm com 2 VMs**. A VM1 é a camada de dados (PostgreSQL + Loki) e a VM2 é a camada de aplicação (NGINX + FastAPI). Os serviços conversam por uma **rede overlay**; usamos **placement constraints** por labels de nó para fixar cada serviço na VM certa, **secrets do Swarm** para a senha do banco, e o **Grafana Loki** para agregar os logs do FastAPI, que consultamos pela API HTTP do Loki."

---

## 2. O que mudou do Trabalho 01 para o 02

| Tema | Trabalho 01 | Trabalho 02 |
|---|---|---|
| Orquestração | Docker Compose (1 host) | **Docker Swarm** (cluster, 2 VMs) |
| Arquivo de deploy | `docker-compose.yml` | `docker-stack/docker-stack.yml` (Stack) |
| Rede | bridge `netatividade01` | **overlay** `cineview_net` (multi-host) |
| Escala | 1 container por serviço | **réplicas** (nginx/fastapi = 2) |
| Posicionamento | tudo no mesmo host | **placement constraints** por label de nó |
| Senha do banco | variável de ambiente | **secret do Swarm** (`/run/secrets/db_password`) |
| Logs | só stdout do container | **Loki** (agregação central) + stdout |
| Observabilidade | nenhuma | Loki + Grafana (extra) |

---

## 3. Conceitos-chave (entenda, não decore)

### 3.1 Orquestração local vs. distribuída
- **Compose** orquestra containers em **um único host**. Bom para dev.
- **Swarm** orquestra containers em **vários hosts (nós)** que formam um cluster. Ele agenda tarefas (réplicas) nos nós, recupera serviços que caem e faz balanceamento. É o orquestrador **nativo** do Docker (não precisa instalar nada além do Docker Engine).

### 3.2 Nós: manager x worker
- **Manager**: mantém o estado do cluster (raft), agenda serviços e aceita comandos `docker service`/`docker stack`. No nosso caso é a **VM2**.
- **Worker**: só executa tarefas. É a **VM1**.
- Comandos de gerência só funcionam no manager.

### 3.3 Stack, Service, Task
- **Service**: a definição de um container que o Swarm mantém rodando (imagem + réplicas + constraints).
- **Task**: cada réplica concreta de um service (= 1 container rodando num nó).
- **Stack**: um conjunto de services declarados num arquivo compose, implantado de uma vez com `docker stack deploy`.

### 3.4 Rede overlay e descoberta de serviços
- A rede **overlay** funciona **entre hosts**: cria uma rede virtual L2 sobre a rede física, então um container na VM2 fala com outro na VM1 como se estivessem na mesma LAN.
- **Descoberta de serviço por DNS**: dentro da overlay, o nome do service vira um DNS. `http://loki:3100` resolve para o Loki onde quer que ele esteja. `http://fastapi:8080` resolve para uma **VIP** que balanceia entre as 2 réplicas do FastAPI. Por isso o NGINX não precisa saber IPs.

### 3.5 Placement constraints e labels
- Rotulamos os nós: `tier=data` (VM1) e `tier=app` (VM2).
- Cada service declara `placement.constraints: [node.labels.tier == data|app]`.
- Resultado: PostgreSQL e Loki **só** sobem na VM1; NGINX e FastAPI **só** na VM2. Isso garante a separação de camadas exigida e mantém o volume do banco preso à VM1.

### 3.6 Secrets do Swarm
- Secret = dado sensível criado fora do compose (`docker secret create`), guardado criptografado no raft e montado **só em memória** dentro do container, em `/run/secrets/<nome>`.
- A senha do banco **não** fica no Git nem em variável de ambiente visível por `docker inspect`.
- PostgreSQL lê via `POSTGRES_PASSWORD_FILE=/run/secrets/db_password`; o FastAPI lê o mesmo arquivo via a variável `DB_PASSWORD_FILE` (tratada em `config.py`).

### 3.7 Loki (agregação de logs)
- Loki é um agregador de logs da Grafana, leve, indexado por **labels** (não pelo conteúdo). Recebe logs por HTTP em `POST /loki/api/v1/push`.
- Nosso FastAPI envia, via `backend/app/logger.py`, três tipos de evento: **inicialização**, **cada requisição** (método, rota, status) e **erro de conexão com o PostgreSQL**.
- Consulta pela API: `GET /loki/api/v1/query_range` com `query={service="fastapi"}`.
- Persistência em volume (`loki_data`) no filesystem, fixado na VM1.

---

## 4. Como cada requisito do enunciado foi atendido

| Requisito do professor | Onde / como |
|---|---|
| Cluster com ≥2 VMs | VM1 (worker, dados) + VM2 (manager, app) |
| Separar camada de dados da de aplicação | labels `tier=data`/`tier=app` + constraints |
| Deploy como **Stack** | `docker stack deploy -c docker-stack/docker-stack.yml cineview` |
| Rede **overlay** | rede `cineview_net` com `driver: overlay` |
| **Placement constraints** por label | `deploy.placement.constraints` em cada service |
| NGINX e FastAPI com ≥2 réplicas na VM2 | `deploy.replicas: 2` + constraint `tier==app` |
| PostgreSQL e Loki com 1 réplica na VM1 | `deploy.replicas: 1` + constraint `tier==data` |
| **Secret** do Swarm para a senha do banco | `secrets: db_password` (external) + `POSTGRES_PASSWORD_FILE` / `DB_PASSWORD_FILE` |
| **Loki** na VM1 | service `loki` com constraint `tier==data` + `loki/loki-config.yaml` |
| FastAPI envia logs ao Loki | `backend/app/logger.py` + middleware em `main.py` |
| Consulta de logs via API HTTP | `curl .../loki/api/v1/query_range` (ver README) |
| Só NGINX exposto ao host | apenas `nginx` tem `ports:`; demais usam só a overlay |
| Persistência de Postgres e Loki | volumes `postgres_data` e `loki_data`, presos à VM1 |
| Grafana (extra) | service `grafana` na VM2, porta 3000, datasource provisionado |
| Healthcheck (extra) | `healthcheck` no service `fastapi` |

---

## 5. Perguntas prováveis na entrevista (com respostas)

**P: Qual a diferença entre Docker Compose e Docker Swarm?**
R: Compose orquestra containers num único host (dev/local). Swarm é um orquestrador de cluster: junta vários hosts num pool, agenda réplicas de serviços entre eles, reinicia o que cai e balanceia carga. Swarm é nativo do Docker Engine.

**P: O que é um nó manager e um worker?**
R: Manager guarda o estado do cluster (consenso raft) e agenda/gerencia serviços — é onde rodamos os comandos. Worker só executa tarefas. Nossa VM2 é manager, a VM1 é worker.

**P: Como os serviços se encontram entre VMs diferentes?**
R: Pela rede overlay, que cria uma rede virtual sobre a rede física. O Swarm tem DNS interno: o nome do serviço (`postgres`, `loki`, `fastapi`) resolve para o container/VIP correspondente, independente da VM.

**P: Como vocês garantiram que o PostgreSQL fica na VM1 e o NGINX na VM2?**
R: Rotulamos os nós (`tier=data` na VM1, `tier=app` na VM2) e, em cada serviço, usamos `placement.constraints` referenciando esses labels. O Swarm só agenda o serviço num nó cujo label bata.

**P: O que acontece se a VM2 cair? E a VM1?**
R: Se cair um nó, o Swarm tenta reagendar as tarefas — mas só em nós que satisfaçam a constraint. Como fixamos NGINX/FastAPI na VM2, eles não migram para a VM1 (e vice-versa). Isso é intencional: separação de camadas e volume do banco preso à VM1. (Trade-off: a constraint reduz a tolerância a falhas daquele serviço.)

**P: Como a senha do banco é protegida?**
R: É um secret do Swarm, criado por CLI (`docker secret create`), nunca no Git. O Swarm o entrega criptografado e o monta em memória em `/run/secrets/db_password`. O Postgres usa `POSTGRES_PASSWORD_FILE` e o FastAPI lê esse arquivo no `config.py`.

**P: Por que usar `*_FILE` em vez de variável de ambiente com a senha?**
R: Variáveis de ambiente aparecem em `docker inspect`, em logs e são herdadas por processos filhos. O secret montado como arquivo evita esse vazamento.

**P: Como o FastAPI manda log pro Loki?**
R: Um módulo `logger.py` monta o payload no formato da Loki Push API e faz `POST /loki/api/v1/push`. Um middleware do FastAPI registra cada requisição. O envio é *best-effort* (timeout curto, exceção silenciada) para nunca derrubar a aplicação se o Loki estiver fora, e tudo também vai pro stdout.

**P: Por que o log é "best-effort" / assíncrono?**
R: Logging não pode ser caminho crítico. Se o Loki estiver lento/fora, não queremos travar a resposta ao usuário nem quebrar a app. Por isso usamos timeout curto, `try/except` e enviamos a requisição em segundo plano (`asyncio.create_task`).

**P: Como consultam os logs sem interface gráfica?**
R: Pela API HTTP do Loki: `GET /loki/api/v1/labels` e `GET /loki/api/v1/query_range?query={service="fastapi"}&start=...&end=...`. (Demonstramos isso ao vivo.)

**P: Como o Loki indexa os logs?**
R: Por **labels** (ex.: `service`, `level`), não pelo conteúdo da mensagem. Isso o deixa leve e barato. A query LogQL filtra por labels e depois, opcionalmente, por texto.

**P: Por que o NGINX precisa de 2 réplicas? Como o tráfego se divide?**
R: Disponibilidade e escala. O Swarm publica a porta via **routing mesh**: a porta 80 fica disponível em qualquer nó e o Swarm balanceia entre as réplicas. Internamente, o nome `fastapi` resolve para uma VIP que faz load balancing entre as 2 réplicas do backend.

**P: Por que só o NGINX é exposto?**
R: Princípio de superfície mínima. NGINX é o único ponto de entrada (reverse proxy); FastAPI, PostgreSQL e Loki só escutam na overlay interna, sem `ports:` publicados, então não são alcançáveis de fora do cluster.

**P: O `docker stack deploy` faz build da imagem?**
R: Não — ele ignora `build:` e exige imagens já prontas. Como NGINX e FastAPI ficam fixos na VM2, buildamos as imagens lá (`docker build`). Postgres, Loki e Grafana são imagens oficiais baixadas do Docker Hub.

**P: Como as configs do Loki e do Grafana chegam nos containers?**
R: Via objetos `configs` do Swarm, declarados no stack a partir dos arquivos `loki/loki-config.yaml` e `grafana/datasource.yaml`, montados no caminho que cada imagem espera.

**P: Como provam a persistência?**
R: Postgres e Loki usam volumes nomeados (`postgres_data`, `loki_data`). Reiniciando os serviços/o cluster, os dados continuam. Como estão presos à VM1 pela constraint, o volume não migra de host.

---

## 6. Comandos que você precisa saber explicar/digitar

```bash
docker swarm init --advertise-addr <IP-VM2>     # cria o cluster (manager)
docker swarm join --token <TOKEN> <IP>:2377     # worker entra no cluster
docker node ls                                   # lista os nós e papéis
docker node update --label-add tier=data <nó>    # rotula um nó
printf "senha" | docker secret create db_password -   # cria o secret
docker build -t cineview-fastapi:latest ./backend     # build da imagem
docker stack deploy -c docker-stack/docker-stack.yml cineview   # implanta
docker stack services cineview                   # services e réplicas (2/2...)
docker service ps cineview_fastapi               # em qual nó cada tarefa roda
docker service logs cineview_fastapi             # logs (stdout) do serviço
docker stack rm cineview                         # remove a stack
```

Loki (API HTTP):
```bash
curl http://<IP-VM1>:3100/loki/api/v1/labels
curl -G 'http://<IP-VM1>:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={service="fastapi"}' \
  --data-urlencode 'start='"$(date -d '10 minutes ago' +%s000000000)" \
  --data-urlencode 'end='"$(date +%s000000000)"
```

---

## 7. Pontos de atenção / armadilhas (bom mencionar se perguntado)

- **`docker stack deploy` não lê `.env`** (diferente do compose). Por isso exportamos as variáveis na sessão antes (`set -a; . docker-stack/.env; set +a`).
- **Migrações com 2 réplicas**: o FastAPI roda `alembic upgrade head` ao subir. Com 2 réplicas iniciando juntas, ambas tentam migrar; o Alembic usa transações e a segunda normalmente vê que já está no head e não faz nada. Em produção, o ideal seria rodar a migração como tarefa única (job) separada do serviço.
- **Consultar o Loki**: como ele não publica porta ao host externo, a consulta é feita de dentro do cluster (na VM1) ou de um container anexado à overlay.
- **Constraints reduzem failover**: fixar serviço a um nó é uma escolha de arquitetura (separação de camadas), não um descuido.

---

## 8. Glossário rápido

- **Overlay**: rede virtual multi-host do Swarm.
- **Routing mesh**: mecanismo que torna uma porta publicada acessível em qualquer nó e balanceia para as réplicas.
- **VIP (Virtual IP)**: IP virtual de um service; o DNS interno resolve o nome do service para a VIP, que balanceia entre tasks.
- **Constraint**: regra que limita em quais nós um service pode rodar.
- **Secret/Config**: objetos do Swarm para dados sensíveis / arquivos de configuração, montados nos containers.
- **LogQL**: linguagem de consulta do Loki (filtra por labels e texto).
