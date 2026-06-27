# Prompt para iniciar a implementação

Copie o conteúdo do bloco abaixo e envie ao Claude Code aberto na raiz deste
repositório:

```text
Leia integralmente o arquivo PLANO_IMPLEMENTACAO_CLAUDE.md antes de fazer qualquer alteração. Depois, inspecione o repositório e execute o plano completo, da Fase 0 à Fase 8, usando-o como contrato e fonte de verdade.

Use o workflow do plugin feature-dev para exploração, arquitetura, implementação e revisão. Use o skill frontend-design em toda a reformulação visual, o security-guidance durante código sensível, o Pyright para o backend Python, o Playwright para validar os fluxos reais no navegador e o code-simplifier apenas ao final de cada fase sobre código recém-alterado.

Regras obrigatórias:
- preserve todas as alterações locais que já existiam antes desta tarefa;
- continue apenas na branch main e não crie outras branches;
- crie um commit local de segurança antes da reformulação e commits locais por fase;
- não faça push;
- não exponha ou versione segredos;
- preserve NGINX, FastAPI, PostgreSQL, Docker Compose, a rede, o volume e as portas definidos no plano;
- não adicione outro serviço runtime;
- não use docker compose down -v;
- não pare após criar telas: implemente backend, banco, autenticação, autorização, TMDB, recursos de usuário, administração, migrações, testes e documentação;
- execute e registre verificações reais, incluindo Docker Compose e Playwright;
- não substitua dados reais por conteúdo fictício para esconder falhas;
- tome decisões técnicas pequenas de forma autônoma, sem alterar o escopo;
- se uma dependência externa ou credencial impedir um teste, conclua todo o restante, implemente fallback honesto e documente exatamente o bloqueio.

Comece exibindo:
1. o estado atual do Git;
2. os arquivos e alterações locais que serão preservados;
3. a arquitetura encontrada;
4. a sequência de execução que você seguirá.

Em seguida, implemente continuamente por fases, testando e revisando cada uma. Ao final, entregue o relatório exigido na seção 21 do plano. Só declare conclusão quando todos os itens verificáveis da seção 20 estiverem atendidos ou quando algum item depender exclusivamente de uma credencial externa ausente, situação que deve ser explicitamente documentada.
```
