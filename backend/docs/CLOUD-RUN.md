# Preparação para Google Cloud Run

O backend foi preparado mantendo NestJS, Prisma 6, Neon/PostgreSQL, Firebase Admin, ImageKit e Socket.IO. Nenhuma regra de negócio, schema, migração existente, rota existente ou tecnologia foi substituída. Este trabalho não executa deploy, migrações, seed, criação de recursos Google Cloud ou alteração de credenciais.

## Análise e mudanças

O projeto já usa ESM/NodeNext, compila o ponto de entrada em `dist/main.js`, valida variáveis antes da inicialização e tem um PrismaService singleton global. A conexão é aberta na inicialização e encerrada com o módulo; não existe um PrismaClient novo por requisição. `enableShutdownHooks`, CORS, Helmet, middleware `no-store`, ValidationPipe, filter e guard global foram preservados. Não havia Swagger, prefixo global ou interceptor de bootstrap a acrescentar.

O processo agora usa `process.env.PORT || 8080` e escuta em `0.0.0.0`, inclusive no desenvolvimento. A validação usa o mesmo fallback 8080. Uma porta explicitamente configurada continua prevalecendo. O script `start:prod` aponta para o arquivo ESM compilado com extensão `.js`; scripts existentes continuam disponíveis, incluindo o antigo `deploy` do Nest CLI, que **não** é o comando de Cloud Run. Foi acrescentado `prisma:migrate:deploy` para usar o CLI Prisma já instalado no checkout.

Em Cloud Run, identificado pela variável automática `K_SERVICE`, Express confia somente no proxy imediatamente à frente da aplicação. Isso permite que `request.ip` continue identificando o cliente para o guard de rate limiting. Não se aceita indiscriminadamente toda a cadeia `X-Forwarded-For`. Em acesso direto/local esse ajuste não é ativado. Se você adicionar um CDN, load balancer ou outros proxies, valide a cadeia e ajuste a confiança especificamente para essa topologia.

`GET /health` retorna HTTP 200 e `{ "status": "ok" }`, sem consulta ao banco. Assim como `/health/live`, não consome quota de rate limiting. `/health/live` e `/health/ready` continuam disponíveis; o segundo mantém os checks existentes de infraestrutura e retorna 503 em falhas. A aplicação só abre o listener após a inicialização dos módulos, incluindo a conexão Prisma inicial. Probes frequentes usam `/health`, evitando consultas ao Neon e reinícios em cascata durante indisponibilidade de terceiros.

## Container

Use **`backend/` como contexto do Docker**. Há quatro estágios: base, build, dependências de produção e imagem final. A base `node:22-bookworm-slim` mantém Node na série 22, com OpenSSL e certificados CA para o engine Prisma e conexões TLS. Build e runtime usam a mesma distribuição. O requisito mínimo declarado, alinhado à `.nvmrc` existente e às ferramentas Nest, é Node 22.22.3.

O build usa `npm ci`, gera o client Prisma e executa `npm run build`. Geração usa URLs locais sem credenciais somente nesse comando, sem conexão ao banco. A instalação automática do client é desativada durante o `npm ci` para permitir build sem secrets; a geração explícita vem depois de copiar o schema.

Dependências finais são instaladas com `npm ci --omit=dev`. O compilador TypeScript, que o npm também inclui como peer opcional do Prisma Client, é retirado deste estágio: o client JS gerado não precisa dele. O client gerado e seu engine nativo são copiados do build para a imagem final. Nest CLI, Prisma CLI, ferramentas de teste, fontes e arquivos `.env` não entram na imagem final.

O container executa `node dist/main.js` diretamente, como usuário `node`, sem precisar de CLI de desenvolvimento. Isso permite que o SIGTERM do Cloud Run alcance os shutdown hooks do Nest. `EXPOSE 8080` e `PORT=8080` são defaults locais; Cloud Run injeta a porta configurada. Não há entrypoint que aplique migrações ou seed.

O `.dockerignore` exclui dependências locais, artefatos, Git, `.env*`, arquivos de chaves, logs, testes e documentação. Package/lock, tsconfigs, configuração Prisma, schema e fontes necessários ao build permanecem disponíveis. O Dockerfile usa COPY explícito em vez de copiar indiscriminadamente todo o diretório.

## Variáveis de ambiente

`backend/.env.example` contém apenas nomes e valores vazios. Configure valores reais fora do Git. A validação existente continua exigindo:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL do Neon com pooling para a API |
| `DIRECT_URL` | URL direta do Neon para migrações; a validação existente também a exige na API |
| `FRONTEND_URL` | Origem exata permitida em CORS HTTP e Socket.IO, sem caminho; HTTPS em produção |
| `FIREBASE_PROJECT_ID` | Projeto Firebase |
| `FIREBASE_CLIENT_EMAIL` | Conta de serviço Firebase |
| `FIREBASE_PRIVATE_KEY` | PEM da conta de serviço Firebase |
| `IMAGEKIT_PUBLIC_KEY` | Chave pública do ImageKit |
| `IMAGEKIT_PRIVATE_KEY` | Chave privada do ImageKit |
| `IMAGEKIT_URL_ENDPOINT` | Endpoint HTTPS da conta ImageKit |

Variáveis adicionais utilizadas:

| Variável | Configuração |
| --- | --- |
| `NODE_ENV` | `production` no container e no serviço |
| `PORT` | Injetada pelo Cloud Run; default local 8080 |
| `ALLOW_INSECURE_DEV_AUTH` | `false` em produção; a validação proíbe habilitá-la nesse ambiente |
| `RATE_LIMIT_MAX` | Default existente: 120, por IP/instância |
| `RATE_LIMIT_WINDOW_MS` | Default existente: 60000 |

`K_SERVICE` é fornecida automaticamente pela plataforma e identifica o ambiente para a confiança do proxy. Não deve ser configurada no Secret Manager nem no `.env.example`. Nenhuma outra variável de aplicação foi encontrada nos arquivos do backend. As variáveis `NEXT_PUBLIC_*` pertencem ao frontend, cuja configuração precisa apontar posteriormente para a URL HTTPS da API.

Cloud Run reserva `PORT`; por isso o YAML define `containerPort: 8080` e **não** tenta definir `PORT` em `env`. Para teste Docker local, é permitido sobrescrevê-la com `-e PORT=8080`.

Use Secret Manager para os valores sensíveis. O YAML referencia oito secrets com nomes explícitos, sem seus valores, e fixa a versão `1`; ajuste as versões ao criar/rotacionar os secrets. A conta `mercado-lajinha-runtime@PROJECT_ID.iam.gserviceaccount.com` precisa existir e receber `roles/secretmanager.secretAccessor` nos secrets necessários. A chave Firebase pode ser armazenada como PEM com quebras de linha reais; em um `.env` de linha única, o código existente também converte `\n` literais.

## Configuração do serviço

`cloudrun.yaml` é um template para uma API pequena: 1 CPU, 512 MiB, concorrência 40, CPU alocada conforme requisições e escala de **zero a uma instância**. Há startup probe HTTP com tolerância de até 240 segundos e liveness probe sem banco. O request timeout de 3600 segundos contempla o chat; WebSockets precisam reconectar quando o limite é atingido ou uma instância é encerrada. O frontend existente já reconecta e entra novamente na sala.

As salas de chat e contadores de rate limiting estão na memória de uma instância. Afinidade de sessão ajuda a continuidade do cliente, mas não fornece sincronização entre processos. `maxScale=1` é uma restrição inicial para manter a arquitetura existente; não é garantia de ausência de sobreposição durante rollout/substituição de instâncias. Mensagens persistidas continuam no PostgreSQL, mas broadcasts entre processos não são compartilhados. Para múltiplas instâncias e maior garantia durante rollouts, será necessário planejar um adapter/broker compartilhado e limites distribuídos em um trabalho separado. Nenhuma infraestrutura adicional foi instalada.

WebSockets ativos mantêm requisições em andamento: a instância pode continuar faturável e não escalar a zero enquanto houver conexões. `minScale=0` permite economia quando não há tráfego, sem prometer custo zero para chat ativo. Ajuste concorrência, memória e limites conforme medições reais.

O backend não persiste uploads no disco local: imagens vão ao ImageKit e dados ao Neon. Não foram encontrados arquivos permanentes, tarefas cron ou workers locais necessários à execução. Conexões Prisma persistentes por instância são normais; o singleton existente é adequado. Use a URL pooled do Neon e dimensione o pool por instância (por exemplo, `connection_limit=2` a `5` e timeouts adequados), considerando o limite do banco e a retomada do Neon em cold start. Essas opções devem ser escolhidas na URL, sem alterar o schema ou criar conexões por requisição.

## Teste local (PowerShell)

Na raiz do repositório:

```powershell
cd backend
# Apenas se você ainda não tiver .env; não sobrescreva sua configuração existente.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Preencha `.env` com os serviços reais, defina `NODE_ENV=production` para teste de produção e mantenha `ALLOW_INSECURE_DEV_AUTH=false`. Valores vazios/placeholder impedem a inicialização por segurança. Instale/use Node 22.22.3 ou mais recente na série 22, conforme `.nvmrc` e `engines`.

```powershell
npm ci
npm run prisma:generate
npm run lint
npm test
npm run test:e2e
npm run build
$env:NODE_ENV = "production"
$env:PORT = "8080"
npm run start:prod
```

Em outro terminal:

```powershell
curl.exe -i http://localhost:8080/health
curl.exe -i http://localhost:8080/health/ready
```

Os testes E2E usam doubles de infraestrutura e não migram nem alteram seu banco. Para uma execução real, Prisma/Firebase/ImageKit devem estar configurados e o Neon acessível; `/health` não serve para mascarar falhas da inicialização.

Build e execução Docker, também de `backend/`:

```powershell
docker build --platform linux/amd64 -t mercado-lajinha-api:cloudrun .
npm run docker:local
```

O comando lê `.env` com dotenv e passa as variáveis ao Docker por nome, preservando aspas e quebras de linha da chave Firebase corretamente, sem incluir credenciais nos argumentos do processo. Não coloque o arquivo na imagem. Encerre com Ctrl+C ou `docker stop mercado-lajinha-api` para conferir shutdown gracioso.

Antes de iniciar, execute `npm run env:check` para validar formatos e consultar Neon, Firebase e ImageKit sem modificar dados. O comando também verifica a configuração local do frontend; uma API desligada fará o health check falhar. Ele não realiza uploads nem envia notificações.

No `.env` lido pelo NestJS, aspas externas são opcionais para valores simples. Para `FIREBASE_PRIVATE_KEY`, mantenha aspas duplas e `\n` entre as linhas. Já `docker run --env-file` não remove aspas externas: use o comando acima com esse arquivo. Nos campos da Vercel, Cloud Run e Secret Manager, cole apenas o valor, sem aspas externas. Reinicie a aplicação após modificar variáveis locais; variáveis `NEXT_PUBLIC_*` precisam de novo build para alterar o frontend em produção.

Migrações são uma etapa manual separada, com `DIRECT_URL` configurada e dependências de desenvolvimento disponíveis no checkout:

```powershell
npm run prisma:migrate:deploy
```

Não execute `migrate dev` nem seed automaticamente em Cloud Run. Se o Neon já tiver tabelas/dados mas não tiver histórico da migração inicial versionada, revise e faça baseline antes de aplicar `migrate deploy`. A imagem final da API não inclui Prisma CLI nem `tsx`; comandos de migração/seed não devem ser executados nela.

## Comandos para uma implantação futura — não executados

Antes: instale/autentique gcloud, escolha projeto/região, habilite as APIs Cloud Run/Artifact Registry/Secret Manager, crie o repositório Docker, a conta de serviço e os secrets. Ajuste `PROJECT_ID`, `REGION`, `REPOSITORY`, `IMAGE_TAG`, `FRONTEND_HOST`, conta de serviço e versões de secrets no YAML. Use a origem HTTPS do frontend, sem barra/caminho adicionais.

De `backend/`, após substituir os placeholders:

```powershell
gcloud auth configure-docker REGION-docker.pkg.dev
docker tag mercado-lajinha-api:cloudrun REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/mercado-lajinha-api:IMAGE_TAG
docker push REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/mercado-lajinha-api:IMAGE_TAG
gcloud run services replace cloudrun.yaml --project PROJECT_ID --region REGION
```

O YAML não modifica IAM de invocação. Para que o navegador acesse o catálogo anônimo e envie tokens Firebase às rotas protegidas, configure invocação pública do serviço, preservando a autenticação/autorização Nest:

```powershell
gcloud run services add-iam-policy-binding mercado-livre-lajinha-api --project PROJECT_ID --region REGION --member=allUsers --role=roles/run.invoker
```

Se a organização bloquear `allUsers`, adapte a política de invocação com o administrador. Não tente trocar tokens Firebase por autenticação IAM nas regras existentes da aplicação. O usuário que fará a implantação também precisa ter permissões de deploy e de uso da conta de serviço. Nenhum desses comandos foi executado durante a preparação.

## Segurança e GitHub

O `.gitignore` existente já exclui `.env*` (exceto `.env.example`), `node_modules`, `dist`, builds e chaves `.pem`. A inspeção dos arquivos versionados e do histórico de nomes não encontrou `.env`, arquivos de conta de serviço ou chaves privadas reais versionados. URLs/senhas de teste e PEMs incompletos em testes são fixtures, não credenciais operacionais. `.env.example` agora não contém valores.

Existe um fallback de chave de cliente Firebase com aparência de placeholder de desenvolvimento em `frontend/src/lib/firebase.ts`. Não é uma chave privada de servidor. Não foi alterado, pois este trabalho é do backend; para produção, mantenha a configuração real somente em `NEXT_PUBLIC_FIREBASE_*` e revise restrições/proteções do Firebase. Nunca coloque a chave **privada** do Firebase Admin no frontend.

Os arquivos locais `backend/.env` e `frontend/.env.local` continuam ignorados e não entram no contexto Docker. Seus valores não foram reproduzidos no relatório. A análise de segurança não substitui rotação/auditoria de credenciais reais no console dos provedores. Se algum valor real tiver sido divulgado fora do Git ou em histórico não disponível localmente, revogue/rotacione no provedor e use Secret Manager.

## Verificação realizada

- Build Nest, lint e TypeScript concluídos; 26 testes unitários e 5 E2E passaram.
- A imagem `mercado-lajinha-api:cloudrun` foi construída para `linux/amd64`, usando Node 22.23.2, e passou no `docker build --check` sem warnings de configuração.
- A imagem final executa com UID 1000, contém `dist/main.js` e Prisma Client, e não contém `.env`, fontes, Prisma/Nest CLI, TypeScript ou Vitest. O engine nativo Prisma foi carregado e rejeitou corretamente uma conexão de teste indisponível com P1001.
- Smoke tests executaram o `main.js` real dentro do container, com configuração Firebase descartável e apenas o hook de conexão inicial ao banco substituído em memória. Não usaram credenciais reais nem alteraram tabelas. `/health` respondeu externamente com 200 tanto no fallback 8080 quanto em `PORT=9090`, com Helmet, CORS e `Cache-Control: no-store` preservados.
- Com `K_SERVICE`, dois IPs encaminhados mantiveram quotas independentes; um cliente excedente recebeu 429 enquanto `/health` continuou respondendo 200. Sem `K_SERVICE`, cabeçalhos encaminhados não permitiram trocar o IP usado pelo guard. Ambos os containers de teste encerraram com código 0 após SIGTERM e foram removidos.
- O YAML foi parseado e verificado quanto a escala 0–1, porta, ausência de `PORT` em env, probes e oito referências a secrets. As 14 variáveis do `.env.example` têm valores vazios. `npm audit --omit=dev` não reportou vulnerabilidades naquele momento.

O Node instalado diretamente neste Windows é 22.18.0 e gera aviso de engine nas ferramentas do projeto; atualize-o para 22.22.3 ou mais recente na série 22 ao testar fora do Docker. gcloud não está instalado neste ambiente. Testes com doubles/configuração descartável não confirmam o acesso real ao Neon, Firebase ou ImageKit; essa verificação continua sendo uma etapa manual antes da implantação. Nenhuma migração, deploy, commit ou push foi feito durante esta preparação.

Referências oficiais: [contrato de container Cloud Run](https://cloud.google.com/run/docs/container-contract), [YAML](https://cloud.google.com/run/docs/reference/yaml/v1), [variáveis reservadas](https://cloud.google.com/run/docs/configuring/services/environment-variables), [Secret Manager](https://cloud.google.com/run/docs/configuring/services/secrets), [WebSockets e sincronização](https://cloud.google.com/run/docs/triggering/websockets), [Prisma em Docker](https://docs.prisma.io/docs/guides/deployment/docker).
