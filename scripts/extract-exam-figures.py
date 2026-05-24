#!/usr/bin/env python3
"""Crop illustration regions from exam page PNGs into assets/exam/."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "exam/Grade 1/math/_pages"
OUT = ROOT / "assets/exam/grade1-math-unit4"

# (page file, name, box) — box = (left, top, right, bottom) on 1190×1684 renders
CROPS = [
    ("page1.png", "decompose-37-40", (260, 430, 930, 590)),
    ("page1.png", "baozi-30", (90, 900, 520, 1180)),
    ("page2.png", "sticks-65minus8", (500, 175, 1080, 410)),
    ("page2.png", "place-value-43minus20", (500, 520, 1080, 820)),
    ("page2.png", "match-pairs", (70, 1210, 1110, 1580)),
    ("page3.png", "sticks-35plus7", (540, 195, 1110, 470)),
    ("page3.png", "eggs-38plus6", (70, 530, 660, 830)),
    ("page3.png", "beads-40minus8", (670, 530, 1110, 830)),
    ("page3.png", "grain-art", (70, 250, 460, 560)),
    ("page3.png", "birds-24plus4", (500, 960, 1110, 1340)),
    ("page4.png", "balloons-doudou-beibei", (70, 110, 760, 460)),
    ("page4.png", "teacups-35", (540, 520, 1110, 860)),
    ("page4.png", "bus-groups-table", (520, 115, 1110, 390)),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for page, name, box in CROPS:
        src = PAGES / page
        if not src.exists():
            raise SystemExit(f"missing page: {src}")
        img = Image.open(src).crop(box)
        dest = OUT / f"{name}.png"
        img.save(dest, optimize=True)
        print("wrote", dest.relative_to(ROOT), img.size)


if __name__ == "__main__":
    main()
