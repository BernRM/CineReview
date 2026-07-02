# Ensaio local do cluster com Multipass (passo a passo TESTADO)

> Guia de **ensaio na sua máquina** (Windows 11 Home + VirtualBox + Multipass).
> Foi executado de ponta a ponta e validado: app respondendo, posicionamento por
> camada correto, logs no Loki e isolamento de rede confirmados.
> Não faz parte da entrega — é só para você treinar o fluxo do dia.

## Por que Multipass + VirtualBox

No Windows **Home** não existe Hyper-V, então o Multipass usa o **VirtualBox**
(que você já tem instalado) como backend. Os comandos abaixo assumem isso.

> ⚠️ Os **IPs são por DHCP** e podem mudar a cada recriação das VMs. Sempre rode
> `multipass list` para pegar os IPs atuais. No ensaio que fiz saíram:
> **vm1 = 192.168.15.15** (dados) e **vm2 = 192.168.15.16** (aplicação).
> Onde aparecer `<IP-VM2>` / `<IP-VM1>`, troque pelos seus.

---

## Fase 0 — Multipass com backend VirtualBox (uma vez)

No **PowerShell como Administrador**:

```powershell
winget install Canonical.Multipass
# Feche e reabra o PowerShell (Admin) para atualizar o PATH, depois:
multipass set local.driver=virtualbox
multipass get local.driver      # deve responder: virtualbox
```

## Fase 1 — Criar as 2 VMs em modo bridge

A bridge precisa do nome do seu adaptador de rede conectado. Veja com
`multipass networks` (no meu caso era **"Ethernet 2"**).

```powershell
multipass launch 22.04 --name vm1 --cpus 1 --memory 2G --disk 8G  --network "Ethernet 2"
multipass launch 22.04 --name vm2 --cpus 2 --memory 2G --disk 12G --network "Ethernet 2"
multipass list
```

Confirme que cada VM tem um **IPv4 `192.168.x.x`** (não `N/A`). Anote os IPs.

> Sem `--network`, as VMs ficam em NAT isolado, não se enxergam e o Swarm não
> funciona. A bridge é obrigatória aqui.

## Fase 2 — Instalar o Docker nas duas VMs

```powershell
multipass exec vm1 -- bash -c "curl -fsSL https://get.docker.com | sudo sh"
multipass exec vm1 -- sudo usermod -aG docker ubuntu
multipass exec vm2 -- bash -c "curl -fsSL https://get.docker.com | sudo sh"
multipass exec vm2 -- sudo usermod -aG docker ubuntu
```

## Fase 3 — Formar o cluster Swarm

```powershell
# Inicia o Swarm na vm2 (manager) — use o IP 192.168.x.x da vm2:
multipass exec vm2 -- sudo docker swarm init --advertise-addr <IP-VM2>

# Pega o token e junta a vm1 (worker):
$token = (multipass exec vm2 -- sudo docker swarm join-token -q worker).Trim()
multipass exec vm1 -- sudo docker swarm join --token $token "<IP-VM2>:2377"

# Confere os 2 nós:
multipass exec vm2 -- sudo docker node ls
```

## Fase 4 — Rotular os nós (camadas)

```powershell
multipass exec vm2 -- sudo docker node update --label-add tier=data vm1
multipass exec vm2 -- sudo docker node update --label-add tier=app  vm2
```

## Fase 5 — Clonar o repo e buildar as imagens (só na vm2)

```powershell
multipass exec vm2 -- bash -c "sudo apt-get install -y -qq git; git clone https://github.com/BernRM/CineReview.git"
multipass exec vm2 -- bash -c "cd CineReview && sudo docker build -t cineview-fastapi:latest ./backend"
multipass exec vm2 -- bash -c "cd CineReview && sudo docker build -t cineview-nginx:latest -f nginx/Dockerfile ."
```

## Fase 6 — Secret + deploy

```powershell
# Secret da senha do banco (fora do Git):
multipass exec vm2 -- bash -c "printf 'SenhaForte123' | sudo docker secret create db_password -"

# Deploy (o 'docker stack deploy' NÃO lê .env, por isso exportamos inline):
multipass exec vm2 -- bash -c "cd CineReview && sudo bash -c 'export POSTGRES_DB=cinereview SESSION_SECRET=troque-isto-por-algo-longo ADMIN_PASSWORD=Admin@123 ADMIN_USERNAME=admin ADMIN_EMAIL=admin@exemplo.com COOKIE_SECURE=false DEMO_SEED_ENABLED=true GRAFANA_ADMIN_PASSWORD=admin; docker stack deploy -c docker-stack/docker-stack.yml cineview'"
```

## Fase 7 — Verificar

```powershell
# Réplicas (espere todas completas: 2/2, 1/1...):
multipass exec vm2 -- sudo docker stack services cineview

# Posicionamento: postgres e loki em vm1; fastapi, nginx e grafana em vm2:
multipass exec vm2 -- bash -c "sudo docker service ps cineview_postgres cineview_loki cineview_fastapi cineview_nginx cineview_grafana --filter desired-state=running --format 'table {{.Name}}\t{{.Node}}\t{{.CurrentState}}'"
```

Abra no navegador do Windows: **http://<IP-VM2>**. Na tela de login, clique
na conta didática de administrador:

- e-mail: `admin@cineview.local`
- senha: `CineView@Admin2026`

Grafana (extra): **http://<IP-VM2>:3000**.

## Fase 8 — Logs no Loki (via API HTTP, de dentro da overlay)

```powershell
# Gera tráfego e lista labels:
multipass exec vm2 -- bash -c "for i in 1 2 3; do curl -s -o /dev/null http://localhost/api/health; done; sudo docker run --rm --network cineview_net curlimages/curl:latest -s http://loki:3100/loki/api/v1/labels"

# Consulta os logs do fastapi (última 1h).
# A URL codificada evita problemas de aspas entre PowerShell, Multipass e Bash:
$lokiQuery = 'http://loki:3100/loki/api/v1/query_range?query=%7Bservice%3D%22fastapi%22%7D&since=1h&limit=20'
multipass exec vm2 -- sudo docker run --rm --network cineview_net curlimages/curl:latest -sS $lokiQuery
```

> A rede se chama **`cineview_net`** (fixada no stack). O Loki não publica porta
> ao host, por isso a consulta roda num container `curl` anexado à overlay.

## Fase 9 — Provar o isolamento (do host Windows)

```powershell
curl.exe --max-time 5 http://<IP-VM1>:5432            # Postgres — deve falhar
curl.exe --max-time 5 http://<IP-VM1>:3100/loki/api/v1/labels   # Loki — deve falhar
curl.exe --max-time 6 http://<IP-VM2>/api/health      # NGINX — responde {"status":"ok"}
```

---

## Resetar / desligar

```powershell
multipass exec vm2 -- sudo docker stack rm cineview     # remove a stack
multipass stop vm1 vm2                                   # desliga (mantém tudo)
multipass start vm1 vm2                                  # liga de novo
multipass delete --purge vm1 vm2                         # apaga as VMs de vez
```

## No dia da apresentação: ligar e conferir

Os endereços da rede bridge vêm do DHCP e podem mudar quando as VMs são
desligadas. Prepare o cluster antes da entrevista e, depois que tudo estiver
funcionando, **não reinicie as VMs**.

```powershell
multipass start vm1 vm2
multipass list
multipass exec vm2 -- sudo docker node ls
multipass exec vm2 -- sudo docker stack services cineview
```

Se os dois nós estiverem `Ready` e as réplicas chegarem a `2/2` e `1/1`, basta
abrir o IP atual da VM2. Se `vm1` aparecer como `Down` depois que os IPs
mudaram, recrie apenas o controle do Swarm. Os volumes e dados são mantidos:

```powershell
# Capture os IPs atuais exibidos pelo Multipass.
$vm1Ip = ((multipass info vm1 | Select-String 'IPv4:' | Select-Object -First 1).ToString() -split '\s+')[-1]
$vm2Ip = ((multipass info vm2 | Select-String 'IPv4:' | Select-Object -First 1).ToString() -split '\s+')[-1]

# Remova a stack e refaça o cluster nos endereços atuais.
multipass exec vm2 -- sudo docker stack rm cineview
Start-Sleep -Seconds 15
multipass exec vm1 -- sudo docker swarm leave --force
multipass exec vm2 -- sudo docker swarm leave --force
multipass exec vm2 -- sudo docker swarm init --advertise-addr $vm2Ip
$token = (multipass exec vm2 -- sudo docker swarm join-token -q worker).Trim()
multipass exec vm1 -- sudo docker swarm join --token $token "${vm2Ip}:2377"
multipass exec vm2 -- sudo docker node update --label-add tier=data vm1
multipass exec vm2 -- sudo docker node update --label-add tier=app vm2

# Use EXATAMENTE a mesma senha usada quando o volume PostgreSQL foi criado.
multipass exec vm2 -- bash -c "printf 'SenhaForte123' | sudo docker secret create db_password -"

# Reimplante a aplicação.
multipass exec vm2 -- bash -c "cd CineReview && export POSTGRES_DB=cinereview SESSION_SECRET=CineView-Cluster-2026-Segredo-Longo ADMIN_PASSWORD=Admin@123 ADMIN_USERNAME=admin ADMIN_EMAIL=admin@exemplo.com COOKIE_SECURE=false DEMO_SEED_ENABLED=true GRAFANA_ADMIN_PASSWORD=admin && sudo -E docker stack deploy -c docker-stack/docker-stack.yml cineview"

# Espere até todos mostrarem 2/2 ou 1/1.
multipass exec vm2 -- sudo docker stack services cineview
```

Neste ambiente de ensaio, o volume PostgreSQL foi criado com
`SenhaForte123`. Se você montar outro ambiente, escolha a senha uma vez e use a
mesma ao recriar o secret.

## Lições do ensaio (o que quebra se não cuidar)

1. **Driver VirtualBox** é obrigatório no Windows Home (`multipass set local.driver=virtualbox`).
2. **`--network "<adaptador>"`** é obrigatório; sem bridge as VMs não se enxergam.
3. O **`advertise-addr`** do Swarm tem que ser o IP `192.168.x.x` da vm2, não o do NAT.
4. **`docker stack deploy` ignora `.env`** — exporte as variáveis na mesma linha.
5. A rede vira **`cineview_net`** (fixada com `name:` no stack); use esse nome no `--network`.
6. O **Loki não tem porta no host** — consulte sempre por um container na overlay.
7. As imagens `cineview-*` são buildadas **na vm2**; Postgres/Loki/Grafana são oficiais.
8. Se o DHCP mudar os IPs depois de desligar as VMs, o Swarm antigo deixa de
   conectar os nós; use o procedimento de recuperação acima.
