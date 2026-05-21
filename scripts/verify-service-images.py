#!/usr/bin/env python3
"""Verify all SERVICE_CARDS Unsplash URLs return HTTP 200."""

import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONSTS = ROOT / "src" / "consts.ts"


def main() -> int:
    text = CONSTS.read_text(encoding="utf-8")
    ids = re.findall(r"unsplash\('(photo-[^']+)'\)", text)
    urls = [
        f"https://images.unsplash.com/{pid}?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=75"
        for pid in ids
    ]
    failed = []
    for url in urls:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                status = r.status
        except Exception as e:
            status = str(e)
        ok = status == 200
        print(f"{'OK' if ok else 'FAIL'} {status} {url[:80]}...")
        if not ok:
            failed.append(url)
    if failed:
        print(f"\n{len(failed)} broken URL(s)", file=sys.stderr)
        return 1
    print(f"\nAll {len(urls)} URLs OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
