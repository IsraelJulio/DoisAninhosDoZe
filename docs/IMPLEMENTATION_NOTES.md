# IMPLEMENTATION NOTES

## Stack visual sugerido
- Next.js + TypeScript
- Tailwind CSS
- Framer Motion
- lucide-react
- next/image
- next/font/google: Fredoka para títulos e Nunito para corpo

## Princípios
1. Mobile-first; alvo principal 390×844.
2. Layout deve continuar utilizável em 320 px.
3. Desktop: conteúdo centralizado em coluna mobile ou expansão controlada.
4. Imagens decorativas sempre com `pointer-events-none`.
5. Respeitar `prefers-reduced-motion`.
6. Animações: 2–6 px de deslocamento, 2.5–5 s, sem loops agressivos.
7. Não renderizar textos importantes dentro de imagens.
8. Não usar as fotos dos mockups como conteúdo final: usar os assets em `public/assets`.

## Hardening administrativo
- O login administrativo usa `AdminLoginAttempt` no PostgreSQL: 5 falhas bloqueiam a combinação de usuário normalizado + IP por 15 minutos.
- Sessões administrativas duram 6 horas; o cookie recebe o token assinado e `AdminSession` armazena somente seu SHA-256.
- Logout revoga a sessão no banco antes de remover o cookie.

## Z-index sugerido
- background: 0
- foliage/decor: 1
- main content: 10
- José/mascots overlapping cards: 15
- sticky CTA: 30
- modal/drawer: 50

## Imagens de produto
O catálogo NÃO depende de assets fixos deste pacote.
A imagem é capturada/importada quando o administrador cadastra o presente e deve ser salva no storage configurado pelo projeto.
