#!/usr/bin/env python3
"""Crop illustration regions from 语文第四单元素养评价卷 page PNGs."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "exam/Grade 1/chinese/_pages"
OUT = ROOT / "assets/exam/grade1-chinese-unit4"

# box = (left, top, right, bottom) on 1190×1684 renders
CROPS = [
    ("page2.png", "homophone-table", (170, 115, 1020, 530)),
    ("page2.png", "shopping-list", (180, 545, 920, 720)),
    ("page2.png", "idiom-children", (730, 785, 1060, 940)),
    ("page3.png", "moon-jingyesi", (745, 405, 1075, 575)),
    ("page3.png", "poem-jia", (95, 655, 1095, 1520)),
    ("page4.png", "animal-homes", (85, 115, 1105, 340)),
    ("page4.png", "watermelon-family", (85, 715, 720, 1000)),
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
