"""publish my resume to the site without my phone number.

usage:
    python scripts/publish_resume.py                 # newest "*resume*.pdf" in ~/Downloads
    python scripts/publish_resume.py path/to/cv.pdf  # a specific file

the raw resume never enters the repo: only the redacted copy is written to
assets/Mazen-Talsam-Resume.pdf. then commit + push as usual.
needs: pip install pymupdf
"""
import re
import sys
from pathlib import Path

import pymupdf

OUT = Path(__file__).resolve().parent.parent / "assets" / "Mazen-Talsam-Resume.pdf"
# north american numbers: 437-249-0174, (437) 249 0174, +1 437.249.0174
PHONE = re.compile(r"(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")


def pick_source():
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    pdfs = sorted(Path.home().joinpath("Downloads").glob("*[Rr]esume*.pdf"), key=lambda p: p.stat().st_mtime)
    if not pdfs:
        sys.exit("no *resume*.pdf in Downloads; pass a path instead")
    return pdfs[-1]


def redact(src):
    doc = pymupdf.open(src)
    removed = 0
    for page in doc:
        for number in set(PHONE.findall(page.get_text())):
            # take the " | " separator with it so the contact line doesn't start with a dangling bar
            hits = page.search_for(number + " |") or page.search_for(number)
            for rect in hits:
                page.add_redact_annot(rect, fill=(1, 1, 1))
                removed += 1
        page.apply_redactions()
    leftover = [n for page in doc for n in PHONE.findall(page.get_text())]
    if leftover:  # never publish if anything slipped through
        sys.exit(f"refusing to publish: phone-like text still present {leftover}")
    return doc, removed


if __name__ == "__main__":
    src = pick_source()
    doc, removed = redact(src)
    doc.save(OUT, garbage=4, deflate=True)
    print(f"source:   {src}\nremoved:  {removed} phone number(s)\nwrote:    {OUT}\nnext:     git add assets/Mazen-Talsam-Resume.pdf && git commit -m 'update resume' && git push")
