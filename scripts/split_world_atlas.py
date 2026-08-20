"""Split the approved prototype atlas into transparent modular world sprites."""
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/world/source/modular-atlas-transparent.png"
OUTPUTS = {
    "buildings/cafe.png": (20, 0, 660, 735),
    "props/market-stall.png": (655, 55, 1080, 535),
    "vegetation/tree.png": (1070, 10, 1536, 650),
    "props/fountain.png": (555, 535, 1135, 1020),
    "props/bench.png": (145, 715, 565, 1024),
    "props/lamp.png": (1220, 590, 1515, 1024),
    "vegetation/planter.png": (1310, 875, 1495, 1024),
    "props/sign.png": (345, 585, 435, 710),
}


def edge_background_mask(image: Image.Image) -> bytearray:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    mask = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def background_like(x: int, y: int) -> bool:
        red, green, blue = pixels[x, y]
        return max(red, green, blue) - min(red, green, blue) < 16 and red + green + blue > 615

    for x in range(width):
        queue.append((x, 0)); queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y)); queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if mask[index] or not background_like(x, y):
            continue
        mask[index] = 1
        if x: queue.append((x - 1, y))
        if x + 1 < width: queue.append((x + 1, y))
        if y: queue.append((x, y - 1))
        if y + 1 < height: queue.append((x, y + 1))
    return mask


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    width, height = image.size
    mask = edge_background_mask(image)
    alpha = image.getchannel("A")
    alpha.putdata([0 if mask[index] else 255 for index in range(width * height)])
    image.putalpha(alpha)

    world_root = SOURCE.parents[1]
    for relative_path, box in OUTPUTS.items():
        sprite = image.crop(box)
        bounds = sprite.getbbox()
        if bounds:
            sprite = sprite.crop(bounds)
        destination = world_root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        sprite.save(destination, optimize=True)


if __name__ == "__main__":
    main()
