# ASSET USAGE — contrato de implementação

## Identidade
- `/assets/brand/logo-jose-2-anos.png`
  - Home/splash.
  - Não redesenhar o logo em IA.
  - Pode ser ocultado em telas internas menores.

## José
- `/assets/jose/jose-avatar.webp`
  - Avatar pequeno no admin, confirmação e acompanhamento.
- `/assets/jose/jose-portrait.webp`
  - Foto de apoio em seções emocionais.
- `/assets/jose/jose-pointing-cutout.png`
  - Personagem/foto recortada para Hero, RSVP e confirmação.
  - Aplicar sombra leve e movimento vertical muito sutil.
- `/assets/jose/jose-seated.webp`
  - Conteúdo alternativo/galeria.
- `/assets/jose/jose-pointing-source.webp`
  - Backup fotográfico, não usar no layout se o cutout resolver.

## Mascotes
- `lion.png`: mascote principal; Home, loaders e sucesso.
- `giraffe.png`: localização, confirmação e laterais decorativas.
- `monkey.png`: navegação, cabeçalhos e detalhes brincalhões.
- `elephant.png`: RSVP/rodapé.
- `toucan.png`: pagamentos/cabeçalhos.
- `zebra.png`: identificação/RSVP.

Todos em `/assets/mascots/`.

## Decorações
Usar com parcimônia e sempre como elementos não interativos:
- folhas: `leaf-01.png` … `leaf-05.png`
- nuvens: `cloud-01.png`, `cloud-02.png`
- estrelas: `star.png`, `star-smile.png`
- balões: `balloon-green.png`, `balloon-orange.png`, `balloon-blue.png`
- `confetti.png`, `paw.png`, `grass.png`
- extras: `grass-cluster.png`, `rocks.png`, `mushrooms.png`, `fence.png`, `tree-stump.png`, `vine.png`

## Backgrounds
- `/assets/backgrounds/jungle-splash.webp`: splash/abertura.
- `/assets/backgrounds/jungle-home.webp`: Home/convite.
- `/assets/backgrounds/jungle-soft.webp`: login/identificação e formulários.
- `/assets/backgrounds/jungle-gifts.webp`: catálogo/detalhe/carrinho.
- `/assets/backgrounds/jungle-payment.webp`: Pix/confirmações.

Regra: aplicar overlay creme/translúcido sobre backgrounds quando houver texto para manter contraste.

## Ilustrações de estado
- `birthday-cake.png`: data/aniversário.
- `gift-stack.png`: placeholder e presentes.
- `map-pin-card.png`: localização.
- `location-sign.png`: detalhes do local.
- `rsvp.png`: confirmação de presença.
- `shopping.png`: lista/carrinho.
- `payment.png`: Pix.
- `success.png`: confirmação final.

## O que NÃO é imagem
Para evitar inconsistência e reduzir peso:
- ícones funcionais: `lucide-react`;
- cards, botões, inputs, chips e badges: CSS/Tailwind;
- placa de madeira: CSS com gradiente/textura simples + bordas arredondadas;
- textos: HTML;
- QR Code Pix: gerado dinamicamente;
- produtos: imagem importada/cadastrada;
- mapa: integração dinâmica, nunca usar mapa fictício dos mockups.

## Referências de tela
1. `design/reference/mockups/01-home.png`
2. `02-event-location.png`
3. `03-phone-identification.png`
4. `04-rsvp.png`
5. `05-gift-list.png`
6. `06-gift-detail.png`
7. `07-cart-reservation.png`
8. `08-pix-payment.png`
9. `09-confirmation-tracking.png`
10. `10-admin.png`

Os mockups são referência de composição, não assets de runtime.
