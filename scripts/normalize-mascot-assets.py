"""Normaliza mascotes gerados para PNG RGBA 1024px com safe area consistente."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
MASCOTS = ROOT / "public" / "assets" / "mascots"
NAMES = ("lion", "giraffe", "zebra", "toucan", "elephant")
SIZE = 1024
CONTENT = 900
ALPHA_THRESHOLD = 8


def main_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    seen: set[tuple[int, int]] = set()
    best: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in seen or pixels[x, y] <= ALPHA_THRESHOLD:
                continue
            component: list[tuple[int, int]] = []
            queue = deque([(x, y)])
            seen.add((x, y))
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen and pixels[nx, ny] > ALPHA_THRESHOLD:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            if len(component) > len(best):
                best = component

    keep = Image.new("L", image.size)
    keep_pixels = keep.load()
    for x, y in best:
        keep_pixels[x, y] = pixels[x, y]
    clean = image.copy()
    clean.putalpha(keep)
    return clean


def normalize(path: Path) -> None:
    image = main_component(Image.open(path).convert("RGBA"))
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError(f"{path.name}: imagem sem conteúdo")
    image = image.crop(bbox)
    image.thumbnail((CONTENT, CONTENT), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((SIZE - image.width) // 2, (SIZE - image.height) // 2))
    canvas.save(path, optimize=True)


if __name__ == "__main__":
    for name in NAMES:
        normalize(MASCOTS / f"{name}.png")
        print(f"normalizado: {name}.png")
