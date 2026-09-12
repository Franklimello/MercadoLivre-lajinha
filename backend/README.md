# Backend — Mercado Livre Lajinha

API do marketplace local construída com NestJS, Prisma/PostgreSQL, Firebase Admin, ImageKit e Socket.IO.

## Requisitos

- Node.js 22.22.3 ou mais recente (versão indicada em `.nvmrc`)
- PostgreSQL (o projeto foi preparado para Neon)
- projeto Firebase com credencial de conta de serviço
- conta ImageKit

## Configuração

1. Copie `.env.example` para `.env`.
2. Preencha as variáveis vazias com a configuração do seu ambiente. Não versione `.env`.
3. Instale dependências e gere o Prisma Client:

```bash
npm ci
npm run prisma:generate
```

A aplicação valida a configuração antes de iniciar. Banco, Firebase e ImageKit inválidos impedem o processo de aceitar tráfego. O modo de autenticação simulada existe apenas para desenvolvimento local, exige `ALLOW_INSECURE_DEV_AUTH=true` e é recusado em produção.

## Banco de dados

Em ambiente de desenvolvimento:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Em entrega ou produção, aplique as migrações versionadas sem criar uma nova migração:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

## Execução

```bash
# desenvolvimento com watch
npm run start:dev

# build e execução do artefato
npm run build
npm run start:prod
```

Por padrão, a API usa a porta `8080` e escuta em `0.0.0.0`. O valor configurado em `PORT` prevalece; você pode manter `PORT=3001` para o desenvolvimento existente.

## Verificação de saúde

- `GET /health`: retorna `{ "status": "ok" }` sem consultar o banco, adequado para probes do Cloud Run.
- `GET /health/live`: confirma que o processo HTTP responde; endpoint existente preservado.
- `GET /health/ready`: confirma PostgreSQL, Firebase Admin e ImageKit. Retorna 503 enquanto algum serviço estiver indisponível.

Use `/health/ready` para decidir se a instância pode receber tráfego e `/health/live` para reinício do processo.

## Testes e qualidade

```bash
npm run lint
npm test
npm run test:e2e
npm run test:cov
npm audit --omit=dev
```

Os testes E2E substituem serviços externos por doubles controlados. Eles não usam as credenciais do `.env` e verificam health check, validação global e autenticação anônima. Testes unitários cobrem configuração, autenticação, rate limiting e regras transacionais da negociação.

## Controles aplicados

- Firebase Admin falha de forma fechada.
- Erros de banco não são mascarados como falha de autenticação.
- DTOs rejeitam filtros, imagens e mensagens inválidas.
- Anúncios são arquivados para preservar negociações e mensagens.
- Somente o vendedor pode concluir uma venda.
- Conclusão da venda e cancelamento das demais negociações usam uma transação.
- HTTP e chat possuem limites básicos por instância.
- Helmet adiciona headers HTTP de segurança.
- WebSocket aceita somente a origem configurada em `FRONTEND_URL`.

O template do Cloud Run usa escala de zero a uma instância porque rate limiting e salas do Socket.IO são locais ao processo. Antes de escalar horizontalmente, planeje a sincronização desses recursos; afinidade de sessão sozinha não sincroniza mensagens entre instâncias.

## Docker e Google Cloud Run

A preparação, inventário de variáveis, comandos de teste/build/deploy futuro e limitações estão em [`docs/CLOUD-RUN.md`](docs/CLOUD-RUN.md). O Dockerfile usa Node.js 22 e Debian slim, gera o Prisma Client durante o build e executa somente o JavaScript compilado como usuário sem privilégios. Nenhuma migração ou deploy é executado automaticamente.

## Documentação técnica

O relatório original e a priorização dos riscos estão em [`docs/BACKEND-AUDIT.md`](docs/BACKEND-AUDIT.md).
