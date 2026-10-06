"""Gera src/lib/asset-registry.generated.ts a partir de public/assets (ferramenta de dev, requer Pillow).

Por que existe: os PNGs do asset pack foram recortados de uma prancha (asset board) em
retângulos grandes. Cada arquivo tem o desenho pequeno no centro e, às vezes, fragmentos de
itens vizinhos e rótulos de nome de arquivo (ex.: "leao.png" dentro de toucan.png).
Para NÃO editar/recriar os assets, calculamos uma caixa de recorte por arquivo — o maior
componente conexo do canal alpha — e o componente <AssetImage> recorta via CSS.

    python scripts/generate-asset-registry.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
OUT = ROOT / "src" / "lib" / "asset-registry.generated.ts"

# Ajustes manuais (x0, y0, x1, y1) onde o maior componente ainda inclui fragmentos vizinhos.
OVERRIDES = {
    "brand/logo-jose-2-anos.png": (304, 176, 546, 323),  # exclui um 2º logo cortado no canto
    "jose/jose-pointing-cutout.png": (15, 20, 500, 1210),  # exclui fragmento solto à direita
    "decor/paw.png": (140, 145, 192, 202),  # pegada inteira, sem o rótulo "grama_1.png"
    "decor/confetti.png": (110, 134, 213, 204),  # sem rótulos "sol.png"/"estrela.png"
    "illustrations/success.png": (206, 198, 316, 296),  # cone + confetes, sem rótulo
}

# Assets regenerados individualmente, com safe area transparente intencional. Eles não
# precisam do crop legado usado para arquivos extraídos das pranchas antigas.
DIRECT_ASSETS = {
    "mascots/lion.png",
    "mascots/giraffe.png",
    "mascots/zebra.png",
    "mascots/toucan.png",
    "mascots/elephant.png",
}
ALPHA_THRESHOLD = 40
PAD = 2


def largest_component_bbox(img: Image.Image):
    w, h = img.size
    alpha = img.split()[-1].tobytes()
    mask = bytearray(1 if v > ALPHA_THRESHOLD else 0 for v in alpha)
    best = (0, None)
    for start in range(w * h):
        if not mask[start]:
            continue
        mask[start] = 0
        stack, count = [start], 0
        x0 = y0 = 10**9
        x1 = y1 = -1
        while stack:
            p = stack.pop()
            count += 1
            x, y = p % w, p // w
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for q in (p - 1 if x > 0 else -1, p + 1 if x < w - 1 else -1, p - w, p + w):
                if 0 <= q < w * h and mask[q]:
                    mask[q] = 0
                    stack.append(q)
        if count > best[0]:
            best = (count, (x0, y0, x1 + 1, y1 + 1))
    return best[1]


def main():
    lines = [
        "// GERADO por scripts/generate-asset-registry.py — não editar à mão.",
        "// Caixa útil (crop) de cada asset oficial; o arquivo original nunca é alterado.",
        "export const ASSET_REGISTRY = {",
    ]
    for path in sorted(ASSETS.rglob("*.*")):
        key = path.relative_to(ASSETS).as_posix()
        img = Image.open(path)
        w, h = img.size
        if key in DIRECT_ASSETS:
            box = (0, 0, w, h)
        elif key in OVERRIDES:
            box = OVERRIDES[key]
        elif img.mode == "RGBA":
            x0, y0, x1, y1 = largest_component_bbox(img)
            box = (max(0, x0 - PAD), max(0, y0 - PAD), min(w, x1 + PAD), min(h, y1 + PAD))
        else:
            box = (0, 0, w, h)
        lines.append(f'  "/assets/{key}": {{ width: {w}, height: {h}, crop: [{box[0]}, {box[1]}, {box[2]}, {box[3]}] }},')
    lines.append("} as const;")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} atualizado")


if __name__ == "__main__":
    main()
