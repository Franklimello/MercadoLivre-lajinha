# Backend — Mercado Livre Lajinha

API do marketplace local construída com NestJS, Prisma/PostgreSQL, Firebase Admin, ImageKit e Socket.IO.

## Requisitos

- Node.js 22.22.3 ou mais recente (versão indicada em `.nvmrc`)
- PostgreSQL (o projeto foi preparado para Neon)
- projeto Firebase com credencial de conta de serviço
- conta ImageKit

## Configuração

1. Copie `.env.example` para `.env`.
2. Substitua todos os placeholders por credenciais reais.
3. Instale dependências e gere o Prisma Client:

```bash
npm install
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
npx prisma migrate deploy
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

Por padrão, a API usa a porta `3001`. O valor configurado em `PORT` prevalece.

## Verificação de saúde

- `GET /health/live`: confirma que o processo HTTP responde.
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

Em uma implantação com várias instâncias, substitua o rate limiting em memória por Redis ou outro armazenamento compartilhado.

## Documentação técnica

O relatório original e a priorização dos riscos estão em [`docs/BACKEND-AUDIT.md`](docs/BACKEND-AUDIT.md).
