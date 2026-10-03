# Guia de imagens - Hookah Drive

Tudo que o navegador carrega fica em `frontend/public/images` (servido pela Vercel).
O backend só guarda o **caminho** no campo `image_url`; não serve arquivos.

## Padrão

| Tipo | Caminho | Formato | Tamanho |
|---|---|---|---|
| Logo | `logo.jpeg` + `logo-480.webp` / `logo-960.webp` | JPEG/WebP | original — **não alterar** |
| Categoria | `categorias/<categoria>.webp` | WebP | 512×512 |
| Marca | `marcas/<marca>.webp` | WebP | 512×512 |
| Produto | `products/<categoria>/<produto>.webp` | WebP | 800×800 |
| Essência (sabor) | `essencias/<marca>/<marca>-<sabor>.webp` | WebP (transparência preservada) | 800×800 |
| Banner | `banner-rosh.webp` | WebP | — |
| Sem imagem | `placeholder.svg` | SVG | usado automaticamente |

`<nome>` é o *slug*: minúsculo, sem acento, só `a-z0-9-`.
Ex.: categoria "Acessórios" → `acessorios`; produto "Rosh (peça)" → `rosh-peca`;
sabor "Melão" da Ziggy → `essencias/ziggy/ziggy-melao.webp`.

Produtos ligados a um sabor (Rosh) usam automaticamente a imagem do sabor.

## Adicionar ou trocar uma imagem

1. Converta a foto para o padrão (centraliza num quadrado, sem cortar nem distorcer):
   ```
   cd frontend
   python design/optimize_photo.py minha-foto.png public/images/products/bebidas/agua.webp
   ```
   Para uma pasta inteira: `python design/optimize_photo.py pasta/ public/images/essencias/ziggy/`
   (precisa `pip install pillow`).
   Foto de cena (mão segurando, mesa, ambiente): use `--crop` para recortar um quadrado em vez de
   adicionar bordas; `--focus 0.3` puxa o recorte para a esquerda. Categorias e marcas: `--size 512`.
2. Atualize o banco (em `backend/`):
   ```
   python -m scripts.backfill_images --dry-run   # confere
   python -m scripts.backfill_images             # grava
   ```
   O script liga cada registro ao arquivo pelo slug e limpa caminhos de arquivos que não existem mais.
3. Commit + push: a Vercel publica as imagens. Em produção, rode o passo 2 com o
   `DATABASE_URL` de produção.

## Ícones (produtos sem foto)

`python design/generate_icons.py public/images` (em `frontend/`; precisa `pip install cairosvg pillow`)
regenera os ícones. Quando existir foto real de um produto, basta sobrescrever o arquivo.

## Fotos de terceiros (licença e créditos)

Prefira fotos dos próprios produtos do lounge ou do fornecedor (com autorização).
Fotos da internet só com licença que permita uso comercial (CC0, CC BY, CC BY-SA — ex.: Wikimedia
Commons, Openverse). CC BY/BY-SA exigem crédito: adicione a foto em
`src/features/customer/CreditsPage.tsx` (página `/creditos`). Nunca use fotos de lojas virtuais ou do Google
Imagens sem autorização.

Hoje usam fotos licenciadas: carvão, acender carvão, Coca, Monster, Água, banner do Rosh e as
categorias Acessórios, Adicionais, Bebidas e Kits. O restante usa ícones até chegarem fotos reais.

## Regras

- Somente WebP para fotos (exceto o logo e o placeholder).
- Sem espaços, maiúsculas ou arquivos sem extensão.
- Nunca colocar foto de pessoa nas pastas de produto.
- Peso alvo: < 100 KB por imagem.
