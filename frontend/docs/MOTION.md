# Movimento e microinterações

As animações usam `motion/react`. Durations, easing, springs e variantes comuns ficam em `src/lib/motion.ts`. O provider respeita `prefers-reduced-motion`; o CSS também desativa as transições compartilhadas e reduz animações nativas nessa preferência.

- Navegação inferior e categorias: indicadores com `layoutId`, spring e feedback de toque.
- Catálogo: entrada com stagger de 50 ms, reorganização por posição e saída dos cards. Durante uma nova consulta, o grid anterior permanece visível com `aria-busy` e opacidade reduzida. Uma resposta antiga nunca é apresentada como resultado atual.
- Erro: a tentativa mantém o bloco montado e o botão mostra o estado real da requisição. Sucesso substitui o bloco com uma transição de layout.
- Filtros: bottom sheet com spring e backdrop com fade, usando o Dialog do Base UI que sustenta os componentes shadcn existentes. Escape, foco, fechamento pelo backdrop e fechamento após aplicar continuam disponíveis; a desmontagem aguarda a saída.
- Anúncio: a imagem usa React ViewTransition para atravessar as rotas do App Router. Um contexto guarda somente a imagem pública do card selecionado para exibi-la enquanto a API carrega. Preço, informações e ações dependem da resposta real. Navegadores sem suporte mantêm a navegação normal.
- Galeria: scroll snap nativo, miniaturas e contador animados, expansão da imagem e swipe no modal. Movimento reduzido remove a rolagem suave.
- Busca, header, anunciar e uploads: feedback breve, busca acessível durante o scroll e reorganização visual das fotos pelos controles existentes.

Favoritos e drag-and-drop não foram acrescentados, pois não existiam como funcionalidades deste projeto.

## Validação

Executar `npx tsc --noEmit`, `npm run lint`, `npm test` e `npm run build` no frontend.

A inspeção no navegador cobriu viewport mobile de 390 × 844, ausência de overflow horizontal, filtros com Escape e retorno de foco, ordenação, detalhe com resposta atrasada, galeria e recuperação após falhas repetidas. Não apareceram avisos de hidratação ou erros de React nesses fluxos. Os testes usaram uma API temporária com anúncios explicitamente identificados como teste, sem banco ou operações autenticadas; ela foi removida ao concluir a inspeção. A API real estava indisponível, portanto publicação, autenticação e integrações externas precisam de validação com o backend ativo.

A emulação de movimento reduzido confirmou a preferência e a redução das animações CSS. O provider e os componentes de sheet, galeria e header também tratam essa preferência, sem depender apenas de CSS.
