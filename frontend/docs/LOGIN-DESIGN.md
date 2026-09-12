# Tela de login

Composição editorial em verde profundo e branco quente, com acentos de dourado, tipografia sans-serif e serifada e uma fotografia exclusiva de objetos usados. No desktop, a história visual ocupa o painel esquerdo. No celular, o acesso aparece primeiro e a composição fotográfica acompanha a página abaixo do formulário.

O painel preserva o Google/Firebase, recuperação do perfil, callback de sucesso e mensagens de erro. A rota mantém a validação do destino `next` e o redirecionamento de usuários autenticados. As páginas que pedem login usam uma versão compacta do mesmo painel.

## Arquivos

- Página: `frontend/src/app/login/page.tsx`.
- Composição: `frontend/src/components/auth/LoginVisual.tsx`.
- Acesso: `frontend/src/components/auth/LoginPanel.tsx`.
- Imagem final: `C:/Users/Pichau/Desktop/mercadoLivreLajinha/frontend/public/brand/login-still-life.webp` (1536 × 1024, 182.958 bytes).

## Imagem gerada

Criada com a ferramenta nativa de geração de imagens, depois otimizada em WebP para o projeto. A fotografia é uma composição ilustrativa da identidade do marketplace; não representa anúncios reais.

Prompt final utilizado:

> Use case: photorealistic-natural. Asset type: exclusive photographic hero asset for a refined Brazilian local secondhand marketplace login page, Mercado Livre Lajinha. Produce a landscape 1536x1024 editorial still-life photograph. Scene: warm sunlit studio with light sage plaster wall and ivory stone floor. Subjects: a beautiful mid-century walnut lounge chair with olive green fabric at center right, a small mustard yellow mushroom table lamp on a cream block to the left, a vintage silver and black camera with lens on a lower plinth in foreground, a few carefully placed vinyl records, and the edge of a leafy plant at far right. These are pre-owned everyday treasures, tasteful real material wear, never junk. Art direction: premium independent interiors magazine, natural analog grain, elegant sculptural arrangements, warm afternoon directional sunlight and soft long shadows, tactile fabric and wood. Palette sage green, cream, walnut brown, muted mustard accents. Composition uncluttered, whole objects visible in center with generous pale wall around, no people, no text, no logos, no borders, no UI. Objects must look photographically real, not 3D plastic. This image supports copy about objects getting a new story and buying locally.

## Verificação

TypeScript, lint, os oito testes existentes e build de produção passaram. A composição foi inspecionada no navegador em 1440 × 960, 1366 × 768, 390 × 844 e 320 × 740, com ausência de overflow horizontal. A navegação por teclado mantém foco visível, e a página de anunciar continua exibindo seu título e painel de acesso. As animações herdam a preferência por movimento reduzido do provider existente. O teste visual não efetuou autenticação em uma conta real.
