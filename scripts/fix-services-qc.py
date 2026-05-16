#!/usr/bin/env python3
"""QC pass on Gemini-generated service pages: meta blocks, URLs, banned phrases."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "content" / "pages"
BASE = "https://adanaailehukuku.com"

ARTICLE_SLUGS = {
    "adana-aile-hukuku-rehberi",
    "adana-anlasmali-bosanma",
    "bosanma-davasi-nasil-acilir-adana",
    "velayet-davasi-mahkeme-kriterleri",
    "istirak-nafakasi-rehberi",
    "bosanmada-mal-paylasimi",
    "adana-aile-mahkemesi-sureci",
    "cekismeli-bosanma-sebepleri",
    "aile-konutu-serhi-bosanma",
    "ziynet-alacagi-davasi",
}

SERVICE_FILES = [
    "adana-aile-hukuku-avukati.md",
    "adana-bosanma-avukati.md",
    "adana-anlasmali-bosanma-avukati.md",
    "adana-cekismeli-bosanma-avukati.md",
    "adana-velayet-davasi-avukati.md",
    "adana-nafaka-davasi-avukati.md",
    "adana-mal-paylasimi-avukati.md",
    "adana-ziynet-alacagi-avukati.md",
    "aile-konutu-serhi-avukati.md",
    "uzaklastirma-karari-avukati.md",
]

PHRASE_FIXES = [
    (r"\bhayati önem taşır\b", "önem taşır"),
    (r"\bhayati öneme\b", "öneme"),
    (r"\bvazgeçilmezdir\b", "değerlendirilebilir"),
    (r"\bvazgeçilmez\b", "faydalı"),
    (r"\bdeneyimli bir\b", ""),
    (r"\bDeneyimli bir\b", ""),
    (r"\bkritik öneme sahiptir\b", "önemlidir"),
    (r"\bhayati rol oynar\b", "önemli rol oynar"),
    (r"\bhayati rol\b", "önemli rol"),
    (r"\ben iyi avukat\b", "avukat"),
    (r"\bgarantili sonuç\b", "somut değerlendirme"),
]

DISCLAIMER = (
    "\n**Hukuki uyarı:** Bu içerik genel bilgilendirme amacıyla hazırlanmıştır. "
    "Somut olayın özelliklerine göre hukuki değerlendirme değişebilir.\n"
)


def parse_frontmatter(text: str) -> tuple[str, dict]:
    if not text.startswith("---"):
        return text, {}
    end = text.find("\n---", 3)
    if end < 0:
        return text, {}
    raw = text[3:end]
    body = text[end + 4 :].lstrip("\n")
    fm: dict = {}
    key = None
    for line in raw.splitlines():
        if line.strip().startswith("- ") and key == "secondaryKeywords":
            fm.setdefault("secondaryKeywords", []).append(line.strip()[2:].strip('"'))
            continue
        if ":" in line:
            k, _, v = line.partition(":")
            key = k.strip()
            v = v.strip().strip('"')
            if v:
                fm[key] = v
            elif key == "secondaryKeywords":
                fm[key] = []
    return body, fm


def trim_body(body: str) -> str:
    for marker in (
        "\n---\n\n```json",
        "\n## SEO Çıktıları",
        "\n---\n\n## SEO",
    ):
        idx = body.find(marker)
        if idx > 0:
            body = body[:idx]
    return body.rstrip() + "\n"


def fix_urls(text: str) -> str:
    text = text.replace("https://adanahukuku.com", BASE)
    text = text.replace("http://adanahukuku.com", BASE)
    for slug in ARTICLE_SLUGS:
        text = re.sub(
            rf"\]\({BASE}/{slug}/\)",
            f"]({BASE}/makaleler/{slug}/)",
            text,
        )
        text = re.sub(
            rf"\]\({BASE}/{slug}\)",
            f"]({BASE}/makaleler/{slug}/)",
            text,
        )
    text = re.sub(
        rf"\]\({BASE}/\)",
        f"]({BASE}/hakkimizda/)",
        text,
    )
    return text


def fix_phrases(text: str) -> str:
    for pat, repl in PHRASE_FIXES:
        text = re.sub(pat, repl, text, flags=re.I)
    text = re.sub(r"  +", " ", text)
    return text


def extract_faqs(body: str) -> list[tuple[str, str]]:
    faqs: list[tuple[str, str]] = []
    section = ""
    m = re.search(r"## Sık Sorulan Sorular\s*([\s\S]*?)(?=\n## |\nAdana'da aile|\n\*\*Hukuki|\Z)", body, re.I)
    if m:
        section = m.group(1)
    for block in re.split(r"\n### ", section):
        block = block.strip()
        if not block:
            continue
        lines = block.split("\n", 1)
        q = lines[0].strip().rstrip("?") + "?"
        a = lines[1].strip() if len(lines) > 1 else ""
        a = re.sub(r"\s+", " ", a)[:500]
        if q and a:
            faqs.append((q.replace('"', "'"), a.replace('"', "'")))
    return faqs[:7]


def build_meta(slug: str, title: str, desc: str, focus: str, secondary: list, faqs: list[tuple[str, str]]) -> str:
    faq_json = ",\n    ".join(
        f'{{"@type": "Question", "name": "{q}", "acceptedAnswer": {{"@type": "Answer", "text": "{a}"}}}}'
        for q, a in faqs
    ) or (
        '{"@type": "Question", "name": "İlk görüşmede ne hazırlanmalı?", '
        '"acceptedAnswer": {"@type": "Answer", "text": "Kimlik ve olayı özetleyen not yeterli olabilir."}}'
    )
    sec = secondary if secondary else [focus]
    sec_md = "\n".join(f'  - "{s}"' for s in sec[:8])
    return f"""
## SEO Çıktıları

- **SEO title:** {title}
- **Meta description:** {desc}
- **Slug:** {slug}
- **Focus keyword:** {focus}
- **Secondary keywords:**
{sec_md}

## FAQ Schema JSON-LD

```json
{{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {faq_json}
  ]
}}
```

## Schema JSON-LD

```json
{{
  "@context": "https://schema.org",
  "@type": "LegalService",
  "name": "Avukat Ceren Sümer Cilli - {title.split('|')[0].strip()}",
  "url": "{BASE}/{slug}/",
  "areaServed": [
    {{"@type": "City", "name": "Adana"}},
    {{"@type": "Place", "name": "Seyhan"}},
    {{"@type": "Place", "name": "Çukurova"}},
    {{"@type": "Place", "name": "Yüreğir"}},
    {{"@type": "Place", "name": "Sarıçam"}}
  ],
  "serviceType": "Aile Hukuku",
  "description": "{desc}",
  "provider": {{
    "@type": "Person",
    "name": "Avukat Ceren Sümer Cilli"
  }}
}}
```

## AI Citation Summary

1. {title.split('|')[0].strip()} — Adana aile hukuku kapsamında hukuki danışmanlık ve dava takibi.
2. Focus: {focus}.
3. Somut dosyada strateji, delil ve süreç planlaması önemlidir.
"""


def rebuild_frontmatter(fm: dict) -> str:
    sec = fm.get("secondaryKeywords", [])
    if isinstance(sec, str):
        sec = [sec]
    sec_lines = "\n".join(f'  - "{s}"' for s in sec)
    return f"""---
title: "{fm.get('title', '')}"
description: "{fm.get('description', '')}"
slug: {fm.get('slug', '')}
date: "{fm.get('date', '2026-05-15')}"
author: "{fm.get('author', 'Av. Ceren Sümer Cilli')}"
category: "{fm.get('category', 'Aile Hukuku')}"
focusKeyword: "{fm.get('focusKeyword', '')}"
secondaryKeywords:
{sec_lines}
---"""


def process_file(path: Path) -> None:
    raw = path.read_text(encoding="utf-8")
    body, fm = parse_frontmatter(raw)
    body = trim_body(body)
    body = fix_urls(body)
    body = fix_phrases(body)

    if "Hukuki uyarı" not in body:
        body = body.rstrip() + DISCLAIMER

    faqs = extract_faqs(body)
    slug = str(fm.get("slug", path.stem))
    title = str(fm.get("title", ""))
    desc = str(fm.get("description", ""))[:160]
    focus = str(fm.get("focusKeyword", ""))
    secondary = fm.get("secondaryKeywords", [])
    if not isinstance(secondary, list):
        secondary = [str(secondary)]

    meta = build_meta(slug, title, desc, focus, secondary, faqs)
    out = rebuild_frontmatter(fm) + "\n\n" + body.strip() + meta
    path.write_text(out, encoding="utf-8")
    print(f"  OK {path.name} ({len(faqs)} FAQ)")


def main() -> None:
    print("QC fix service pages...\n")
    for name in SERVICE_FILES:
        p = PAGES / name
        if p.exists():
            process_file(p)
    print("\nDone.")


if __name__ == "__main__":
    main()
