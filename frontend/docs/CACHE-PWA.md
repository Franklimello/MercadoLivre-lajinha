# Cache, imagens e PWA

O TanStack Query controla os dados da API na memória da sessão. O service worker controla somente assets públicos e variantes de fotos. O IndexedDB guarda rascunhos de formulários. Não há Redis, cache pago, persistência de respostas da API ou fila de publicação offline.

## Dados e atualização

| Recurso                       | Fresco por  | Retenção sem observadores | Atualização                                                                   |
| ----------------------------- | ----------- | ------------------------- | ----------------------------------------------------------------------------- |
| Listagem de produtos/veículos | 30 segundos | 5 minutos                 | Ao ficar stale, voltar à tela/foco, reconectar e a cada 30 s com a tela ativa |
| Detalhe público               | 20 segundos | 5 minutos                 | A cada 20 s com a tela ativa e nas demais revalidações                        |
| Categorias/marcas             | 10 minutos  | 30 minutos                | Ao ficar stale, voltar ao foco ou reconectar                                  |
| Dados privados                | 0 segundos  | 60 segundos               | Ao consultar, voltar ao foco, reconectar ou invalidar                         |

As keys em `src/lib/query-keys.ts` distinguem domínio, lista/detalhe, ID, todos os filtros e parâmetros repetidos. Dados privados incluem o UID. A troca de usuário e o logout cancelam e removem queries privadas. Tokens continuam sob responsabilidade do Firebase, sem persistência adicional nesta implementação.

`useApiResource` recebe o `AbortSignal` do TanStack e o encaminha ao fetch. Consultas iguais compartilham a mesma requisição. A busca de veículos aguarda 400 ms sem novas teclas, preserva o foco e usa replace sem rolar a página; Enter ou o botão continuam executando imediatamente. Não consulta durante composição de texto. Produtos mantêm a busca por envio explícito.

Mutações bem-sucedidas feitas por `apiFetch` invalidam listas e detalhes de produtos/veículos e recursos privados pertinentes. A conclusão da escrita não depende do sucesso da revalidação. Atualizações de perfil invalidam dados privados. O projeto ainda não possui uma API de favoritos; nenhum contrato ou favoritar fictício foi adicionado.

Listas reutilizam dados recentes imediatamente. Ao alterar filtros, os resultados anteriores ficam explicitamente identificados enquanto a nova busca responde. Falhas de revalidação deixam um aviso sobre dados desatualizados; 401/403/404/410 ocultam detalhes retidos. O detalhe bloqueia contato quando offline ou com erro de atualização. Disponibilidade e regras de negociação continuam sendo verificadas pelo backend.

O prefetch de detalhe exige intenção por mouse/foco durante 200 ms. É desativado em dispositivos sem hover, offline, conexão 2G, economia de dados e quando já existem várias consultas em andamento. Não há prefetch de toda a listagem.

O fetch força `cache: no-store` e o Nest envia `Cache-Control: no-store`. Não há uma segunda camada de Next Data Cache para consultas de anúncios. Manifest, worker e assets continuam aproveitando a geração estática do Next.

## Estratégias do service worker

| Recurso                                                | Estratégia                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| JS/CSS/fontes de `/_next/static`                       | Cache first; até 200 entradas; nomes versionados pelo Next                   |
| Página offline e ícones essenciais                     | Precache + stale while revalidate                                            |
| Fotos públicas via `/_next/image`                      | Cache first até 24 h, depois revalidação em segundo plano; expiram em 7 dias |
| API, mensagens, sessão, RSC e requisições autenticadas | Não interceptar nem persistir; somente rede                                  |
| Navegação HTML                                         | Rede; na falha, página offline estática sem anúncios ou dados privados       |

Fotos ficam limitadas a 120 variantes, 40 MiB totais e 2 MiB por imagem. Há limpeza por idade e tamanho. Somente imagens públicas do ImageKit e da pasta local `/brand` entram nessa estratégia; URLs assinadas e respostas privadas/no-store são excluídas. Falhas de quota não impedem mostrar a resposta da rede. O cache de fotos não torna preços ou disponibilidade offline.

Existe um único registro com escopo `/`, em `/sw.js`. Ele importa a política pública de cache e, quando configurado, o worker do Firebase Messaging. O fluxo de permissão de notificações permanece separado e exige ação do usuário. A configuração injetada contém somente campos públicos `NEXT_PUBLIC_FIREBASE_*`.

O worker novo aguarda o fechamento das abas em vez de forçar reload durante preenchimento de formulários. A ativação remove somente caches antigos com prefixo `mll-`. Ao alterar a política ou o shell offline, incremente `VERSION` em `public/pwa-cache.js`.

## Imagens mobile

`ListingImage` utiliza Next Image nos hosts permitidos, WebP, qualidade 80, `sizes` conforme as colunas reais e lazy loading. O contêiner reserva a proporção final e o skeleton ocupa exatamente o espaço da foto. A imagem principal do detalhe pode carregar com prioridade alta; os cards não recebem essa prioridade. URLs de hosts legados fora da allowlist continuam funcionando sem ampliar os hosts remotos do otimizador.

Uploads novos são preparados como WebP com qualidade 90 e lado máximo de 2560 px, preservando fotos pequenas quando a conversão não ajuda e evitando recomprimir WebP já adequado. Sem suporte à conversão, permanece o arquivo original. O upload usa UUID, nome único e `overwriteFile=false`; trocar a foto gera uma URL nova.

O Next tem TTL mínimo de imagem de 24 h; cabeçalhos do provedor podem ampliar esse prazo. Os assets do Next já possuem hash. Os arquivos locais `/brand` têm cache de 24 h e revalidação, pois seus nomes não são versionados. Esta mudança não reescreve URLs antigas nem altera a configuração de CDN do ImageKit. A abordagem para fotos novas é usar uma URL nova a cada alteração, compatível com o cache prolongado do provedor.

## Rascunhos

Criação de produtos/veículos e edição de anúncios salvam textos, etapa e referências das fotos já enviadas, com debounce de 1 segundo. Cada rascunho pertence a um UID e tipo/ID de formulário. A recuperação exige escolha explícita; o formulário aguarda essa escolha para não sobrescrever o conteúdo salvo.

O banco `mll-local-drafts` tem versão de schema, expiração de 14 dias, limite de 30 rascunhos e limite de 100.000 caracteres serializados por registro. Não contém tokens, mensagens, respostas de listagem, Base64 ou arquivos grandes. Falhas do IndexedDB apresentam aviso e preservam a edição do formulário.

É possível continuar editando textos offline enquanto o formulário estiver aberto. Fotos novas exigem conexão e não ficam numa fila local de upload; somente as referências de fotos já enviadas são recuperadas. Não há promessa de abrir formulários autenticados após um reload completamente offline: a navegação mostra a página offline e o rascunho aguarda a reconexão.

Publicação offline é bloqueada. Reconectar não publica automaticamente. Após a API confirmar publicação/edição, o rascunho é removido, incluindo proteção contra autosaves pendentes recriarem o registro. Cancelar a edição mantém o rascunho. Registros de outra conta não são apresentados; são dados locais de conveniência, sem garantia de criptografia ou recuperação entre dispositivos.

O localStorage contém apenas preferências pequenas, como a dispensa do convite de instalação por sete dias. Não é o cache principal.

## Instalação e apresentação

`/manifest.webmanifest` define nome Mercado Livre Lajinha, short name Lajinha, start URL `/`, standalone, idioma, cores e PNGs reais de 192/512 px, com variantes maskable. O símbolo dos maskable fica dentro da região segura, sobre fundo opaco.

O convite de instalação fica após o conteúdo, nos catálogos e na conta. Só aparece online quando o navegador disponibiliza `beforeinstallprompt`. O evento é capturado, mas `prompt()` só é chamado após tocar em **Instalar aplicativo**. Cancelamento é respeitado; aceitação e `appinstalled` removem a chamada. Apps instalados em standalone e navegadores sem suporte não mostram o convite. A microinteração usa Motion e respeita a configuração de movimento existente.

O viewport usa `viewport-fit=cover`; shell, cabeçalho, formulários e navegação inferior respeitam `env(safe-area-inset-*)`. Os links e o roteamento existentes preservam navegação do Next sem reload completo, com filtros em URL e reaproveitamento do cache ao voltar de um detalhe.

## Execução e verificação

Em produção, o worker é registrado automaticamente em contexto seguro. Use HTTPS na publicação; localhost é permitido para desenvolvimento. API, imagens e demais integrações também precisam de URLs HTTPS acessíveis no ambiente de produção. Um endereço HTTP da rede local não substitui um teste HTTPS no Android.

Para testar localmente, execute `npm run build` e `npm run start`. O dev server normalmente não registra o worker para não persistir HMR; `NEXT_PUBLIC_ENABLE_PWA=true` habilita esse teste de forma explícita. Ao voltar a trabalhar em dev na mesma origem, remova o registro/cache de teste nas ferramentas do navegador se necessário.

Testes automatizados cobrem keys e isolamento, deduplicação, invalidação, cancelamento, leitura/expiração/remoção/limites dos rascunhos, dimensões dos ícones e a execução real da política do worker com limites e exclusões. A validação no navegador usou uma origem e API temporárias, sem escrita em contas ou banco real: worker efetivamente ativado, cache somente de assets/fotos, recuperação após reload e edição offline simulada, mudança de ordenação, retorno de detalhe sem nova consulta de lista, invalidação após venda simulada e recuperação de erros. A digitação rápida de quatro termos intermediários na busca de veículos produziu uma única consulta final, mantendo o foco no campo. Uma falha real de navegação foi produzida pelo proxy local para confirmar a página offline do worker.

Eventos de instalação foram simulados para verificar ação explícita, cancelamento, aceitação e app já instalado. A instalação nativa e as áreas do sistema ainda precisam de validação num Android com Chrome e HTTPS. Publicação/edição autenticadas com serviços reais não foram executadas nesta validação local.

Referências: [TanStack Query — padrões](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [cancelamento](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation), [MDN — beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event), [ImageKit — upload](https://imagekit.io/docs/integration/javascript), [cache do ImageKit](https://imagekit.io/docs/cdn-caching-and-purging). APIs específicas do Next foram conferidas na documentação embarcada em `node_modules/next/dist/docs`.
