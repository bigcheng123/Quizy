#!/usr/bin/env python3
"""Render each PDF page to PNG for OCR / figure cropping."""

import sys
from pathlib import Path

try:
    import fitz
except ImportError as e:
    raise SystemExit("pip install pymupdf") from e


def main():
    if len(sys.argv) < 3:
        print("Usage: pdf-to-pages.py <input.pdf> <output_dir> [scale=2.0]", file=sys.stderr)
        sys.exit(1)
    pdf_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    scale = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
    if not pdf_path.is_file():
        raise SystemExit(f"not found: {pdf_path}")
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    mat = fitz.Matrix(scale, scale)
    for i in range(doc.page_count):
        pix = doc[i].get_pixmap(matrix=mat)
        dest = out_dir / f"page{i + 1}.png"
        pix.save(dest)
        print(dest)
    doc.close()


if __name__ == "__main__":
    main()
