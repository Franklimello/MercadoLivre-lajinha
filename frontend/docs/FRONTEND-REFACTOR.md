# Refatoração do frontend — Mercado Livre Lajinha

## Análise do projeto anterior

- A home priorizava um banner grande, gradientes, sombras, slogans e elementos decorativos. Busca e anúncios ficavam abaixo dessa composição.
- Produtos e veículos tinham paletas, tipografia, botões e layouts diferentes.
- Cards repetiam categoria e condição em destaque, com fotos pequenas, preços coloridos e efeitos de escala.
- Erros de API eram apresentados como ausência de anúncios. Categorias fictícias substituíam a resposta do servidor.
- A busca não utilizava filtros e paginação já implementados na API.
- Publicação de produtos e veículos duplicava formulário, tratamento de erros e estrutura visual.
- Labels não estavam associados aos campos; vários botões de ícone não tinham nome acessível.
- Galeria não oferecia deslizar, e a altura do chat não considerava adequadamente a navegação e a tela móvel.
- Selos públicos de vendedor verificado não correspondiam aos campos retornados pela API.
- Upload e notificações continham simulações: imagens em data URL, assinatura fictícia e token FCM inventado.

## Decisões de produto e design

A entrada agora é um catálogo: marca, busca, região, categorias e resultados. Sem anúncios artificiais, banners de promoção ou métricas inventadas.

A identidade usa Geist, branco, neutros levemente quentes e verde #246044. O conteúdo tem largura máxima de 1200 px. A escala de espaçamento usa múltiplos de 4 px; controles têm área mínima de 44 px. Preço é o primeiro texto do card, seguido de título, localização e data. Fotografias têm proporção consistente.

A navegação inferior mantém início, veículos, anunciar, mensagens e conta. A conversa ocupa a tela e substitui a navegação inferior pelo campo de mensagem. Filtros usam painel lateral no desktop e diálogo rolável no celular, com foco, fechamento por teclado e validação de intervalos.

## Telas e componentes

- Home e veículos compartilham Catalog e CatalogFilters. Busca, categoria/tipo, ordenação e paginação ficam na URL; respostas antigas são canceladas durante a navegação.
- Detalhes de produto e veículo compartilham ListingDetail e ProductCarousel. Fotos permitem deslizar, usar setas, selecionar miniaturas e ampliar. O vendedor mostra nome, foto e data de entrada reais.
- Publicação compartilha ListingForm, com três etapas para produtos e quatro para veículos. Mantém fotos, estoque, categoria, condição, localização e todos os campos de veículos. Inclui revisão antes do POST.
- Fotos podem ser removidas e reordenadas com botões acessíveis. A primeira é identificada como principal. Upload usa apenas assinatura e arquivos reais do ImageKit, com validação e recuperação parcial.
- Conta mostra anúncios e situações reais: ativo, pausado e vendido. Mantém exclusão, pausa, reativação e venda; edição de dados comuns usa PATCH /products/:id, já disponível.
- Conversas mostram pessoa, anúncio relacionado, mensagens por data e horário, WhatsApp e conclusão da venda. O texto só é limpo após confirmação de envio. Desconexão e falha no histórico têm feedback e recuperação.
- Login, estados vazios, erros, carregamento e página não encontrada seguem a mesma linguagem visual.

## Compatibilidade e limites da API

Não houve alteração no backend, schema, contratos ou rotas existentes. A interface utiliza somente os filtros implementados nos controllers.

Não foram adicionados favoritos, avaliações, distância, filtros por localização, estados reservado/expirado ou edição da ficha técnica de veículos: não há suporte correspondente nos endpoints atuais. Localização de publicação continua utilizando city/state já aceitos.

O backend exige WhatsApp e notificações para publicar. Essa regra foi preservada. A interface deixou de ativar a preferência silenciosamente e agora registra um token real no endpoint /users/fcm-token. O SDK é carregado sob demanda. getToken é mantido para compatibilidade com o backend atual, que recebe tokens FCM, embora o SDK mais recente ofereça outro modelo de registro.

Fotografias do ImageKit têm otimização e tamanhos responsivos por next/image. URLs de outros provedores continuam sendo exibidas com tamanho reservado e lazy loading, sem otimização de servidor para hosts não configurados.

## Design system e organização

- src/app/globals.css: tokens, layout responsivo, componentes visuais compartilhados e preferência de movimento reduzido.
- src/components/marketplace: catálogo, filtros, fotografias e estados.
- src/components/listings: detalhes e publicação compartilhados.
- src/components/account: contato e edição.
- src/components/auth: entrada consistente com recuperação de perfil.
- src/lib/catalog.ts: tradução de filtros da URL para os contratos da API.
- src/hooks/useApiResource.ts: carregamento, cancelamento, erro e nova tentativa.
- src/hooks/useSocketChat.ts: histórico e conexão com confirmação de envio.

Foram removidos seis componentes visuais gerados que ficaram sem uso. Nenhuma dependência foi adicionada. Os testes usam Node e TypeScript já instalados; suas respostas simuladas existem apenas nos testes e nunca na aplicação.

## Validação executada

- npm run build: compilação de produção e geração de todas as rotas concluídas.
- npm run lint: sem erros ou avisos.
- npx tsc --noEmit: sem erros.
- npm test: oito testes de contratos, paginação, formato monetário, telefone, erros e cancelamento.
- Navegador: home em 320, 375, 390, 430, 768, 1024 e 1440 px, sem rolagem horizontal do documento.
- Navegador: filtro de preço inválido; aplicação de condição e preço; ordenação; busca preservando filtros; voltar do navegador sincronizando campo de busca.
- Navegador: catálogo de veículos, seleção de motos, filtros de combustível e câmbio.
- Navegador: proteção por login nas entradas de anúncio, conta e mensagens.

## Limitação da validação integrada

A API local configurada respondeu HTTP 500 ao buscar produtos antes das alterações. Durante a revisão, categorias e catálogo também apresentaram erro. Não foi criada uma API de demonstração nem foram inseridos anúncios no lugar das respostas reais.

Sem uma API saudável e uma sessão autenticada, não foi possível validar ponta a ponta publicação, edição, exclusão, upload, recebimento de push e troca de mensagens entre duas contas. Esses fluxos foram preservados por contrato, revisados no código e compilados, mas ainda precisam dessa verificação integrada.

Para validar notificações reais, configure a chave pública NEXT_PUBLIC_FIREBASE_VAPID_KEY e as credenciais públicas do projeto Firebase no ambiente local. A configuração do service worker é recebida do mesmo projeto da aplicação. O backend e o banco também precisam estar disponíveis.

## Executar

Na pasta frontend:

```sh
npm run dev
npm run lint
npm test
npm run build
```

O servidor de desenvolvimento usa a porta 3003. NEXT_PUBLIC_API_URL mantém o endereço configurado no ambiente.
