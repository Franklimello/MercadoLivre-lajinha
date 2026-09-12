# Auditoria técnica do backend

Data: 11 de setembro de 2026
Escopo: API NestJS, Prisma/PostgreSQL, Firebase Admin/FCM, ImageKit, Socket.IO, testes, configuração e dependências.

## Parecer

O backend compila e a separação por módulos é adequada para o tamanho atual, mas ainda não está pronto para uso público. A execução local confirmou que a aplicação anuncia que iniciou mesmo sem banco de dados, enquanto todas as rotas de catálogo retornam HTTP 500. A configuração atual também deixa a autenticação em modo simulado quando o Firebase não inicializa. Com um banco funcional, qualquer texto enviado como Bearer token seria aceito como o mesmo usuário de desenvolvimento.

Os dois bloqueadores de lançamento são, portanto:

1. configuração obrigatória sem validação e inicialização que continua após falhas críticas;
2. autenticação que falha de forma permissiva.

## Estado após a primeira correção

Os bloqueadores encontrados nesta auditoria foram corrigidos no código:

- configuração obrigatória é validada antes da inicialização;
- PostgreSQL e Firebase agora falham de forma fechada;
- autenticação simulada exige opção explícita e é proibida em produção;
- health checks de vivacidade e prontidão foram adicionados;
- negociação passou a aplicar regras por papel e conclusão transacional;
- exclusão de anúncio virou arquivamento para preservar conversas;
- DTOs, chat, CORS, headers e rate limiting foram endurecidos;
- migração inicial e `.env.example` passaram a ser versionados;
- referências de imagens externas ao ImageKit configurado são recusadas;
- arquivos substituídos são removidos do ImageKit quando possível;
- tokens FCM rejeitados são removidos;
- a API de atualização de veículos foi concluída;
- e-mails e `fileId` deixaram de aparecer em respostas públicas;
- `npm audit --omit=dev` passou a reportar zero vulnerabilidades.

Verificação após as correções: build e lint aprovados, 24 testes unitários e 4 testes E2E aprovados, contratos do frontend aprovados e `npm audit` completo com zero vulnerabilidades. A cobertura agora inclui todos os arquivos de `src` e informa 31,23% das linhas, substituindo o antigo resultado enganoso de 100% sobre apenas sete linhas.

Ainda é necessário fornecer credenciais reais e executar a migração em um PostgreSQL acessível para validar o sistema completo com infraestrutura real. A verificação efetiva do WhatsApp continua pendente; até ela existir, o backend mantém `whatsappVerified=false`.

## Evidências executadas

| Verificação | Resultado |
| --- | --- |
| `npm run build` | passou |
| `npm run lint` | passou com 4 avisos |
| `npm test` | 1 teste passou; testa apenas `Hello World!` |
| `npm run test:e2e` | 1 teste passou mesmo com falha do Firebase e do banco |
| `npm run test:cov` | informa 100% de 7 linhas, pois só mede `app.controller.ts` |
| `npx prisma validate` | schema válido |
| `npx prisma migrate status` | falhou ao alcançar o PostgreSQL configurado |
| `npm audit --omit=dev` | inicialmente 8 vulnerabilidades; zero após a correção |
| Segredos versionados | nenhum arquivo `.env` ou chave foi encontrado no Git |

Sondagem da API que já estava em execução na porta configurada:

| Rota | Resposta |
| --- | --- |
| `GET /` | 200, `Hello World!` |
| `GET /products` | 500 |
| `GET /products/categories` | 500 |
| `GET /vehicles` | 500 |
| `GET /vehicles/brands` | 500 |
| `GET /users/me` sem token | 401, conforme esperado |

## Achados prioritários

### Crítico — autenticação aceita qualquer token quando o Firebase falha

`FirebaseAdminService.onModuleInit()` captura a falha de configuração e mantém `app` como `null`. Em seguida, `verifyIdToken()` retorna sempre a identidade fixa `dev-user-123`, sem verificar o token recebido (`src/firebase/firebase-admin.service.ts:14-59`). O mesmo método protege HTTP e WebSocket, então o desvio atinge os dois transportes.

Impacto: se as credenciais estiverem ausentes, inválidas ou forem quebradas durante um deploy, qualquer pessoa que envie um Bearer token não vazio pode agir como o usuário de desenvolvimento.

Correção: remover o fallback do serviço de produção. A inicialização deve lançar erro e impedir o servidor de escutar. Se ainda for necessário um modo local, ele deve existir em um adaptador separado, ativado somente por uma variável explícita e recusado quando `NODE_ENV=production`.

### Bloqueador — a aplicação inicia sem PostgreSQL e aparenta estar saudável

`PrismaService.onModuleInit()` captura o erro de `$connect()` e apenas escreve um aviso (`src/prisma/prisma.service.ts:8-16`). O endpoint raiz continua respondendo 200, embora as rotas que consultam dados retornem 500. A configuração local contém valores com aparência de placeholder para PostgreSQL, Firebase e ImageKit.

Impacto: deploys quebrados recebem tráfego, health checks passam e o frontend vê erros genéricos. Foi exatamente o comportamento reproduzido durante esta auditoria.

Correção: validar todas as variáveis de ambiente antes de criar a aplicação, propagar a falha de conexão do Prisma e criar health checks separados de vivacidade e prontidão. O check de prontidão deve verificar banco e serviços indispensáveis.

### Alto — fluxo de negociação não aplica papéis nem transições válidas

Qualquer participante pode enviar qualquer valor do enum como novo status (`src/negotiations/negotiations.service.ts:148-160`). Não há máquina de estados nem distinção entre ações do comprador e do vendedor. A atualização da negociação e a marcação do produto como vendido ocorrem em operações separadas (`src/negotiations/negotiations.service.ts:157-167`).

Impacto: um comprador pode marcar uma negociação como concluída sem vender o produto; estados cancelados ou concluídos podem ser reabertos; uma falha intermediária pode deixar negociação e anúncio divergentes.

Correção: definir uma matriz de transições por papel, rejeitar estados terminais inválidos e executar conclusão, atualização do estoque e encerramento das demais negociações em uma transação.

### Alto — a suíte de testes dá confiança falsa

O único teste unitário e o único E2E verificam a resposta estática `Hello World!` (`src/app.controller.spec.ts` e `test/app.e2e-spec.ts:19-23`). O E2E instancia a aplicação sem a configuração global de `main.ts`, portanto nem sequer exercita o `ValidationPipe` real. Ele passou enquanto Firebase e banco falhavam durante a inicialização.

Impacto: autenticação, autorização, criação de anúncios, filtros, negociação, chat, upload e falhas de infraestrutura não têm regressão automatizada.

Correção: testar serviços com Prisma mockado somente para regras unitárias e manter uma suíte de integração com PostgreSQL descartável. Os primeiros contratos devem cobrir autenticação recusada, propriedade do anúncio, participação na negociação, transições de status, validação de filtros e indisponibilidade do banco.

### Alto — dependências de produção possuem vulnerabilidades conhecidas

`npm audit --omit=dev` encontrou 5 alertas altos e 3 moderados. Os alertas altos chegam principalmente por `multer` através de `@nestjs/platform-express`; os moderados incluem `uuid` através de ImageKit/gaxios.

Impacto: a exposição concreta dos alertas de `multer` é hoje menor porque não há uma rota multipart no Nest, mas o pacote vulnerável está no artefato de produção. A situação muda assim que upload local ou outro middleware multipart for adicionado.

Correção: atualizar dentro de versões compatíveis, garantir `multer >= 2.3.0` na árvore final e atualizar ou substituir a cadeia que prende `uuid` vulnerável. Não usar `npm audit fix --force` sem revisão: a sugestão atual tenta rebaixar pacotes principais do Nest para a série 7.

### Alto — não há histórico de migrações reproduzível

O repositório contém `schema.prisma` e `seed.ts`, mas nenhuma pasta `prisma/migrations`. Além disso, a regra `.env*` ignora também `.env.example`, que não está versionado.

Impacto: um ambiente novo não consegue saber qual DDL foi aplicado nem recebe um modelo seguro das variáveis obrigatórias. Alterações de schema tendem a ser feitas manualmente ou com `migrate dev` no ambiente errado.

Correção: gerar e versionar uma migração inicial, usar `prisma migrate deploy` na entrega e liberar explicitamente `!.env.example` no `.gitignore`, mantendo apenas valores fictícios nesse arquivo.

## Achados importantes

### Validação de consultas é incompleta

Os parâmetros de query são tipos TypeScript no controller, sem DTO validado em tempo de execução. `condition` é convertido com `as any` (`src/products/products.service.ts:128-130`), e valores inválidos podem chegar ao Prisma e virar 500. Busca, marca, modelo e demais strings não têm limite de tamanho. Os DTOs de imagens aceitam qualquer texto como URL e `fileId`, e o update aceita uma lista vazia, apesar de a criação exigir ao menos uma imagem.

Correção: criar DTOs de query com enums, limites e transformação; rejeitar intervalos invertidos; aplicar `@IsUrl`, `@ArrayMinSize(1)` e `@ArrayMaxSize(5)`; validar que o arquivo pertence ao usuário e ao endpoint configurado do ImageKit.

### WebSocket está mais permissivo que a API HTTP

O gateway usa CORS `origin: '*'` (`src/chat/chat.gateway.ts:16-20`), não valida eventos com DTO, não limita tamanho de mensagem nem frequência e devolve `error.message` diretamente ao cliente (`src/chat/chat.gateway.ts:94-117`). O histórico de mensagens também é retornado sem paginação.

Correção: usar a mesma lista de origens do HTTP, validar payloads, limitar mensagens e eventos, paginar o histórico e mapear erros internos para códigos públicos estáveis.

### WhatsApp e notificações podem ser marcados como verificados sem verificação

Salvar qualquer telefone válido no formato define `whatsappVerified=true` (`src/users/users.service.ts:24-34`). O usuário também pode definir `notificationsEnabled=true` no PATCH de perfil sem possuir token FCM (`src/users/users.service.ts:35-37`). A publicação verifica apenas `whatsapp` e o booleano de notificações.

Impacto: as condições exigidas para anunciar podem ser contornadas e os nomes dos campos prometem garantias que não existem.

Correção: implementar desafio real para WhatsApp ou renomear/remover o campo de verificação; derivar a disponibilidade de push de tokens ativos e permissão, sem aceitar esse estado diretamente do cliente.

### Uploads e exclusões deixam estado externo órfão

O backend fornece assinatura de upload, mas aceita depois qualquer `url/fileId`. Ao substituir imagens ou excluir um anúncio, remove apenas os registros no PostgreSQL (`src/products/products.service.ts:210-220` e `258-268`), sem apagar arquivos no ImageKit. A exclusão física do produto também apaga negociações e mensagens por cascata do schema.

Impacto: custo crescente de armazenamento, referências forjadas e perda definitiva do histórico de negociação.

Correção: registrar uploads pendentes por usuário, confirmar somente arquivos emitidos pelo backend, apagar órfãos de modo idempotente e substituir exclusão física por arquivamento/soft delete quando houver histórico comercial.

### Tratamento de erros não preserva semântica HTTP

Vários fluxos usam `findUniqueOrThrow()` sem converter `P2025` para 404. O guard captura também falhas de banco e conflitos de e-mail e os devolve como 401. Erros de chave estrangeira ou enum inválido tendem a chegar como 500 genérico.

Correção: adicionar um filtro de exceções Prisma com mapeamento explícito, limitar o `catch` do guard à verificação do token e registrar erros de infraestrutura com correlação sem expor detalhes ao cliente.

### API de veículos está incompleta

Existe `UpdateVehicleDto`, mas ele não é usado e o controller não oferece PATCH ou DELETE para veículos. O gerenciamento atual atualiza somente os campos comuns pela rota de produtos. A lista de marcas também considera veículos ligados a anúncios inativos.

Correção: implementar atualização transacional dos campos de `Product` e `Vehicle`, reutilizar status/exclusão com regras consistentes e filtrar marcas por anúncios ativos.

### Privacidade e notificações precisam de revisão

O detalhe da negociação retorna e-mail de comprador e vendedor, embora a interface use principalmente nome, avatar e WhatsApp do vendedor. Tokens FCM inválidos nunca são removidos. `notifyStatusChange()` existe, mas não é chamado quando o status muda.

Correção: reduzir a resposta ao mínimo necessário, remover tokens rejeitados pelo FCM e integrar a notificação de status ao fluxo transacional.

## Pontos positivos

- As rotas de escrita de anúncios e todas as rotas de usuário, negociação e mensagens usam o guard de autenticação.
- Alteração e exclusão de produto verificam o proprietário.
- Leitura e envio de mensagens verificam se o usuário participa da negociação.
- O `ValidationPipe` global usa `whitelist` e `forbidNonWhitelisted`.
- Catálogos impõem limite máximo de 50 itens por página.
- O detalhe público do anúncio não expõe o WhatsApp do vendedor.
- O schema Prisma é válido e possui índices coerentes para as consultas principais.
- Nenhum arquivo de segredo foi encontrado entre os arquivos versionados.

## Ordem recomendada de correção

1. Remover autenticação simulada e validar configuração com falha imediata.
2. Configurar PostgreSQL/Firebase/ImageKit reais e adicionar readiness check.
3. Criar migração inicial e versionar `.env.example` seguro.
4. Corrigir regras transacionais de negociação e mapeamento de erros.
5. Criar testes de integração dos fluxos críticos.
6. Atualizar dependências vulneráveis e confirmar a árvore com `npm audit`.
7. Endurecer DTOs, WebSocket, rate limiting, headers e limites de payload.
8. Fechar o ciclo de vida de uploads, tokens FCM e exclusões.

Depois das etapas 1 a 5, o backend terá uma base confiável para testes completos do frontend. As etapas seguintes reduzem risco operacional, abuso e custo de manutenção antes da publicação.
