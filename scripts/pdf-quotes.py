# Renders the PDF pages that hold given quotes and finds each quote's exact position, so a video can zoom and highlight it.
# usage: python -X utf8 scripts/pdf-quotes.py <paper.pdf> <out-dir> <quotes.json> > marks.json
# quotes.json: {"key": "exact text from the paper", ...}. Output: {pages: {name: {src, w, h}}, marks: {key: {page, rects}}}, in PDF points.
# Needs PyMuPDF (pip install pymupdf). Uses word positions, not page.search_for: that returned rects a line off, or in
# another column, on two-column papers. Letters of ligatures (fi, ff) go missing in extraction, so they're ignored when matching.
import json
import re
import sys
from pathlib import Path

import fitz

pdf, out_dir, quotes_file = sys.argv[1:4]
doc = fitz.open(pdf)
stem = Path(pdf).stem
out = Path(out_dir)
out.mkdir(parents=True, exist_ok=True)


def norm(s):
    s = re.sub(r"[^a-z0-9]", "", s.lower())
    for lig in ("ffi", "ffl", "ff", "fi", "fl", "f"):
        s = s.replace(lig, "")
    return s


pages, marks = {}, {}
for key, quote in json.load(open(quotes_file, encoding="utf-8")).items():
    target = norm(quote)
    for i, page in enumerate(doc):
        words = page.get_text("words", sort=False)
        text, owner = "", []
        for n, w in enumerate(words):
            t = norm(w[4])
            text += t
            owner += [n] * len(t)
        at = text.find(target)
        if at < 0:
            continue
        name = f"{stem}-p{i + 1}"
        if name not in pages:
            page.get_pixmap(dpi=220).save(out / f"{name}.png")
            pages[name] = {"src": f"{out.name}/{name}.png", "w": page.rect.width, "h": page.rect.height}
        used = sorted(set(owner[at:at + len(target)]))
        marks[key] = {"page": name, "rects": [[round(words[n][0], 1), round(words[n][1], 1), round(words[n][2] - words[n][0], 1), round(words[n][3] - words[n][1], 1)] for n in used]}
        print(f"{key} -> {name}: {' '.join(words[n][4] for n in used)}", file=sys.stderr)
        break
    else:
        print(f"NOT FOUND: {key}", file=sys.stderr)
print(json.dumps({"pages": pages, "marks": marks}))
