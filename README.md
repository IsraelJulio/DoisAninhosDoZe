# José 2 anos — Convite digital & lista de presentes

Site mobile-first para o aniversário de 2 anos do José (safari / selva), aberto pelos convidados a partir de um link no WhatsApp.

- Convite com data, horário e local (link oficial do Google Maps)
- Identificação simples pelo celular (sem senha, sem SMS)
- Confirmação de presença com **adultos e crianças separados** (crianças = lembrancinhas)
- Lista de presentes → carrinho → **reserva temporária de 30 min** → **Pix estático (BR Code)** → "Já fiz o pagamento"
- Painel do admin: convidados, presentes (inclusive importação por link da Shopee e outras lojas), pagamentos pendentes com confirmação manual

**Evento:** 28 de novembro de 2026, 16h, Condomínio Portal Riacho da Mata, Rua Peroba Rosa, 429, Riacho da Mata, Sarzedo - MG. Esses dados vêm de [`docs/event-config.json`](docs/event-config.json).

---

## Stack

| Camada | Escolha |
| --- | --- |
| App | Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript |
| UI | Tailwind CSS 4 (tokens de `docs/design-tokens.json`), Framer Motion (interações), lucide-react, `next/font` (Fredoka + Nunito) |
| Dados | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Validação | Zod (todas as entradas validadas no servidor) |
| Pix | Gerador BR Code/EMV próprio + `qrcode` (SVG gerado no servidor) |
| Testes | Vitest (domínio + integração com Postgres real), Playwright + axe (E2E, responsividade, acessibilidade) |
| Deploy | Vercel (app) + Railway (PostgreSQL). Não há API separada |

## Arquitetura

```
Navegador ──▶ Next.js (Vercel)
               ├─ Server Components (páginas, leitura de dados)
               ├─ Server Actions (RSVP, carrinho, checkout, Pix, admin)
               ├─ proxy.ts (barreira das rotas /admin)
               └─ Prisma ──▶ PostgreSQL (Railway)
```

```
src/
  app/                  rotas (páginas finas: só compõem componentes e chamam serviços)
  components/           UI compartilhada (AssetImage, PageShell, Button, Stepper...)
  features/
    event/              dados do convite (de docs/event-config.json)
    guests/             identificação por telefone, sessão do convidado
    rsvp/               schema + serviço de confirmação e totais
    gifts/              catálogo, disponibilidade derivada, admin, importador (import/)
    cart/               carrinho no banco, totais
    orders/             reserva concorrente, máquina de estados, contador
    payments/           PixProvider/StaticPixProvider, BR Code, QR, confirmação manual
    admin/              consultas do painel, actions, componentes
  lib/                  dinheiro, telefone, env, utilitários puros
  server/               Prisma, sessões assinadas, rate limit
prisma/                 schema, migrations, seed
tests/integration/      testes contra PostgreSQL real (reservas, concorrência, importador)
e2e/                    Playwright
scripts/                Postgres local, gerador do registro de assets, screenshots
```

Regras de negócio vivem em `features/*/*-service.ts` e em módulos puros (`gift-availability.ts`, `order-status.ts`, `cart-totals.ts`, `pix/brcode.ts`). Os componentes React só apresentam.

## Rodando localmente

Pré-requisito: Node 20.9+ (testado com Node 24).

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e as credenciais do admin
npm run db:local            # (opcional) PostgreSQL real embutido, se você não tem Postgres/Docker
npx prisma migrate deploy   # cria as tabelas
npm run db:seed             # evento + 6 presentes de exemplo
npm run dev                 # http://localhost:3000  (admin: /admin/login)
```

`npm run db:local` usa os binários oficiais do PostgreSQL distribuídos pelo pacote `embedded-postgres` (só dev) e cria os bancos `jose`, `jose_test` e `jose_e2e` na porta 54329:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:54329/jose?schema=public" 
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:54329/jose_test?schema=public"
E2E_DATABASE_URL="postgresql://postgres:postgres@localhost:54329/jose_e2e?schema=public"
```

Use `node scripts/local-postgres.mjs --detach` para deixá-lo rodando em segundo plano.

> **Rede corporativa com proxy TLS?** Se `prisma`, `next/font` ou o importador falharem com `unable to get local issuer certificate`, rode com `NODE_OPTIONS=--use-system-ca` (Node usa os certificados do sistema).

### Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (flat config do Next) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest: unitários + integração (integração é pulada sem `TEST_DATABASE_URL`, que precisa ser um banco diferente de `DATABASE_URL`: os testes apagam dados) |
| `npm run test:e2e` | Playwright (faz build de produção e sobe na porta 3100 com `E2E_DATABASE_URL`) |
| `npm run db:migrate` | `prisma migrate dev` (cria nova migration em dev) |
| `npm run db:deploy` | `prisma migrate deploy` (aplica migrations, uso em produção) |
| `npm run db:seed` | seed idempotente |
| `npm run db:local` | PostgreSQL local embutido |

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Connection string do PostgreSQL |
| `ADMIN_USERNAME` | sim | Usuário do painel |
| `ADMIN_PASSWORD` | sim | Senha do painel (use uma forte) |
| `ADMIN_SESSION_SECRET` | sim em produção (≥ 32 caracteres) | Segredo dos cookies assinados. As chaves de convidado e de admin são derivadas dele com rótulos diferentes |
| `PIX_KEY` | para receber Pix | Chave real: e-mail, `+55DDDNUMERO`, CPF, CNPJ ou aleatória. **Nunca invente uma chave** |
| `PIX_RECEIVER_NAME` | com a chave | Nome do recebedor (até 25 caracteres; acentos são removidos) |
| `PIX_RECEIVER_CITY` | com a chave | Cidade do recebedor (até 15 caracteres) |
| `PIX_DESCRIPTION_PREFIX` | não | Prefixo da descrição exibida no app do banco |
| `NEXT_PUBLIC_APP_URL` | recomendada | URL pública (metadados de compartilhamento) |

Gere um segredo com: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

Sem `PIX_KEY`: em desenvolvimento o checkout funciona sem QR Code, com um aviso. Em produção a tela de pagamento mostra "Pix indisponível" e **nunca gera um payload inválido**. O status aparece em **Admin → Configurações**.

## Banco de dados

Entidades principais (`prisma/schema.prisma`):

- `Guest` (telefone E.164 único) · `Rsvp` (1:1, `attending`, `adults`, `children`, `message`)
- `Gift` (`priceInCents`, `stockQuantity`, `active`, `category`, `imageUrl`, `sourceUrl`, `source`) · `GiftImport`
- `Cart` (1 por convidado) · `CartItem`
- `Order` (`status`, totais, `pixTxid` único, `reservationExpiresAt`) · `OrderItem` (snapshots de título/preço/imagem)
- `Payment` (1:1 com Order, `pixPayload`, `status`, `confirmedAt`) · `AdminAuditLog` · `Event` (tempo de reserva configurável)

Dinheiro é sempre inteiro em centavos (`formatBRL()` para exibir), com `CHECK` constraints no banco. **O status do presente não é armazenado**: Disponível / Reservado / Presenteado é derivado do estoque e dos pedidos ativos, então nunca fica inconsistente.

## Reservas e concorrência

```
RESERVED ──"Já fiz o pagamento" (dentro do prazo)──▶ AWAITING_PAYMENT_CONFIRMATION ──admin confirma──▶ PURCHASED
   │  └── prazo de 30 min venceu ──▶ EXPIRED (itens livres)
   └── cancelada ──▶ CANCELLED ◀── admin rejeita ── AWAITING_PAYMENT_CONFIRMATION
```

- O checkout roda em **uma transação** que trava as linhas dos presentes com `SELECT … FOR UPDATE` (em ordem de id, sem deadlock). Ele recalcula a disponibilidade já com a trava e só então cria o pedido. Uma segunda pessoa espera o commit e vê o estoque atualizado.
- A disponibilidade conta pedidos `PURCHASED` + `AWAITING_PAYMENT_CONFIRMATION` + `RESERVED` com `reservationExpiresAt > agora`. Reservas vencidas deixam de contar na hora (expiração "preguiçosa", sem cron).
- O "Já fiz o pagamento" é um `UPDATE` condicional (`status = RESERVED AND reservationExpiresAt > agora`). Quem decide o prazo é o servidor; o contador da tela é só apresentação.
- Depois de informado, o pagamento **não expira**: só o admin confirma ou cancela.
- Operações do mesmo convidado (clique duplo, duas abas, renovação × "já paguei") são serializadas por um advisory lock por convidado, sempre tomado antes das travas dos presentes, o que evita deadlocks. Reenviar o checkout com o carrinho vazio devolve a reserva ativa (idempotente).
- "Já fiz o pagamento" **depois** do prazo: se os presentes continuam livres, a reserva é reativada. Se já foram para outra pessoa, nada é vendido em dobro: o aviso fica registrado e aparece em **Admin → Pagamentos → Pendentes** como "Pix informado depois que a reserva expirou", para o admin devolver o valor ou combinar outro presente e marcar como resolvido.
- Confirmar e cancelar no admin são idempotentes (clique duplo não duplica auditoria nem gera erro). Já o estoque não pode ser reduzido abaixo das unidades reservadas ou presenteadas.
- Preço e total sempre vêm do banco. O navegador envia apenas `giftId` e quantidade.
- Teste: `tests/integration/reservations.test.ts` dispara duas reservas simultâneas do último item (10 rodadas) e 6 compradores para estoque 3. Validado também removendo o `FOR UPDATE`: os testes falham, como esperado.

## Pix

- `PixProvider` (interface) → `StaticPixProvider` (BR Code estático) / `UnconfiguredPixProvider`. Um provedor com API bancária no futuro só precisa implementar a mesma interface.
- `pix/brcode.ts` monta o EMV: `00` formato, `01=11` (estático), `26` (GUI `br.gov.bcb.pix`, chave, descrição), `52`, `53=986`, `54` valor exato, `58`, `59`, `60`, `62/05` txid e `63` CRC16-CCITT-FALSE. A implementação foi testada contra o exemplo oficial do manual do BCB (CRC `1D3D`).
- O txid é único por pedido (`JOSE` + 12 caracteres sem 0/O/1/I) e aparece no painel para conferir no extrato.
- QR Code gerado no servidor a partir do payload. **"Copiar código Pix" copia o payload completo** (Copia e Cola), com fallback para WebViews sem Clipboard API.
- A confirmação é **manual**: os textos nunca dizem "confirmado automaticamente".

## Admin

`/admin/login` usa usuário/senha das variáveis de ambiente (comparação em tempo constante, login com rate limit) e cria um cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção, válido por 12h. As rotas `/admin/*` são barradas no `proxy.ts`, e **cada página e Server Action chama `requireAdmin()` de novo**.

- **Visão geral:** confirmados, adultos, crianças, total de pessoas, presentes disponíveis/reservados/presenteados, pagamentos pendentes e valor confirmado
- **Convidados:** filtros (todos/confirmados/não irão/sem resposta), busca por nome, telefone mascarado, totais de adultos e crianças
- **Presentes:** importar por link, cadastrar/editar (preço, quantidade, imagem, categoria), desativar. A exclusão física só acontece sem pedidos; havendo pedidos, o presente é apenas desativado
- **Pagamentos:** abas Pendentes / Reservas em andamento / Confirmados / Cancelados, com modal "Tem certeza que encontrou este pagamento em sua conta?"
- **Configurações:** tempo da reserva e status do Pix/admin

## Importador de produtos

`features/gifts/import/`:

- Aceita só `http`/`https`, sem usuário/senha, porta 80/443. Bloqueia `localhost`, IPs privados, loopback, link-local (inclui `169.254.169.254`), CGNAT, IPv6 ULA/link-local, IPv4 mapeado e hosts `.internal`/`.local`.
- **O IP é verificado no momento da conexão** (lookup customizado do `undici`), o que protege contra DNS rebinding. São no máximo 5 redirects, cada um revalidado, com timeout de 8s e leitura limitada a 1,5 MB.
- Extrai JSON-LD `Product`, OpenGraph/`product:price`, microdata e `<title>`, mais o título a partir da URL da Shopee (útil quando a loja bloqueia robôs). Não usa navegador headless e não executa JavaScript externo.
- Falhou? Aparece "Não foi possível obter todas as informações automaticamente." e o formulário manual continua disponível. Cada tentativa fica registrada em `GiftImport`.
- O preço importado é só sugestão. Depois de salvo, **nunca é atualizado pela loja**: o preço do banco é a referência do Pix. O convidado nunca é enviado para a Shopee.

## Assets

Os assets oficiais estão em `public/assets/` com os caminhos de `docs/FILE_MAP.md` (nenhum foi recriado ou alterado). Ao inspecionar o pack, descobri que os PNGs foram recortados de uma prancha:

- Cada desenho ocupa uma área pequena no centro de um canvas transparente grande.
- Alguns arquivos trazem pedaços de itens vizinhos e rótulos de nome de arquivo (ex.: "leao.png" dentro de `toucan.png`).
- O logo tem um segundo logo cortado no canto.

Por isso, `scripts/generate-asset-registry.py` (Pillow) calcula a caixa útil de cada arquivo, que é o maior componente conexo do alpha, com ajustes manuais documentados. O resultado vai para `src/lib/asset-registry.generated.ts`. O componente `<AssetImage>` recorta via CSS e aplica um leve esmaecimento nas bordas com corte reto (`src/lib/asset-fades.ts`). Os backgrounds recebem um zoom leve para esconder as faixas escuras laterais.

Os mockups em `design/reference/mockups/` são só referência de layout e não são usados como imagem.

## Testes

```bash
npm test                     # 200 testes (unitários + integração com Postgres real)
npm run test:e2e             # 16 testes Playwright
```

- **Unitários:** telefone, dinheiro, BR Code e CRC16, totais, máquina de estados e expiração, disponibilidade, schemas (RSVP, presente), tokens assinados, proteção SSRF, extração de metadados, tokens de design ↔ CSS.
- **Integração** (`TEST_DATABASE_URL`): concorrência, expiração, "já paguei" após o prazo, pedido alheio, confirmação/cancelamento manual, renovação de reserva, importador com fallback.
- **E2E:**
  1. Home → identificação → RSVP → editar.
  2. Presente → carrinho → reserva → Pix (QR, payload, cópia) → "Já fiz o pagamento".
  3. Admin confirma → convidado vê "Presente confirmado!".

  Também verificam a ausência de overflow em 320/375/390/430/768/1024/1440 px e rodam axe (WCAG A/AA, sem violações sérias). O E2E usa uma chave Pix fictícia (zeros) **apenas** como fixture de teste em `playwright.config.ts`.

## Deploy

### 1. PostgreSQL no Railway

1. Em [railway.com](https://railway.com): **New Project → Deploy PostgreSQL**.
2. No serviço Postgres, abra **Variables** e copie **`DATABASE_PUBLIC_URL`**. A Vercel fica fora da rede privada do Railway, então use a URL pública (proxy TCP), não a `DATABASE_URL` interna.
3. Aplique as migrations a partir da sua máquina:
   ```bash
   DATABASE_URL="<DATABASE_PUBLIC_URL>" npx prisma migrate deploy
   DATABASE_URL="<DATABASE_PUBLIC_URL>" NODE_ENV=production npm run db:seed   # cria só o registro do evento
   ```
   Em produção o seed **não** cria os presentes de exemplo. Para incluí-los, use `SEED_EXAMPLE_GIFTS=true`.

### 2. App na Vercel

1. **Add New → Project** e importe o repositório (framework Next.js detectado; build padrão `npm run build`).
2. Em **Settings → Environment Variables**, cadastre `DATABASE_URL` (a URL pública do Railway), `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `PIX_KEY`, `PIX_RECEIVER_NAME`, `PIX_RECEIVER_CITY`, `PIX_DESCRIPTION_PREFIX` e `NEXT_PUBLIC_APP_URL`.
3. Deploy. O build **não** acessa o banco. `prisma generate` roda no `postinstall`.
4. Para aplicar migrations a cada deploy automaticamente, troque o Build Command para `npm run db:deploy && npm run build`. Se preferir, continue rodando `prisma migrate deploy` manualmente quando houver migration nova.
5. Teste o fluxo completo com um Pix de valor baixo antes de enviar o link no WhatsApp.

## Segurança

- Validação Zod em todas as Server Actions. Preços e totais calculados no servidor.
- Cookies assinados com HMAC-SHA256 (convidado e admin com chaves derivadas distintas); headers `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Rate limit básico em identificação, checkout, login do admin e importador.
- `?next=` aceita apenas caminhos internos (sem open redirect).
- **A identificação do convidado não é autenticação forte:** quem souber o número de alguém consegue se identificar como essa pessoa. Por isso nada sensível fica atrás dela (ver `src/server/session/guest-session.ts`).

## Limitações conhecidas

- O rate limit é em memória, ou seja, por instância serverless. Suficiente para o contexto; para algo mais forte, use um store compartilhado.
- A confirmação do Pix é manual (Pix estático não tem webhook).
- Imagens de produto são URLs externas exibidas com `<img>` (sem otimização do `next/image`) e podem quebrar se a loja mudar o link. Nesse caso aparece um ícone substituto, e o admin pode trocar a URL. A resolução está centralizada em `resolveGiftImage()` para migrar para storage próprio.
- Cada presente tem uma única foto.
- Lojas que bloqueiam robôs (comum na Shopee) retornam pouco ou nada. O cadastro manual é o caminho garantido.
