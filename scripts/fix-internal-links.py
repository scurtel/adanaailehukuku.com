#!/usr/bin/env python3
"""Align internal link suggestions and schema URLs with published article slugs."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = ROOT / "content" / "articles"
BASE = "https://adanaailehukuku.com"

SLUGS = {
    "adana-aile-hukuku-rehberi": "Adana Aile Hukuku Rehberi",
    "adana-anlasmali-bosanma": "Adana'da Anlaşmalı Boşanma",
    "bosanma-davasi-nasil-acilir-adana": "Boşanma Davası Nasıl Açılır",
    "velayet-davasi-mahkeme-kriterleri": "Velayet Davaları",
    "istirak-nafakasi-rehberi": "İştirak Nafakası",
    "bosanmada-mal-paylasimi": "Boşanmada Mal Paylaşımı",
    "adana-aile-mahkemesi-sureci": "Adana Aile Mahkemesi Süreci",
    "cekismeli-bosanma-sebepleri": "Çekişmeli Boşanma",
    "aile-konutu-serhi-bosanma": "Aile Konutu Şerhi",
    "ziynet-alacagi-davasi": "Ziynet Alacağı Davası",
}

# Per-article related slugs (min 4)
RELATED = {
    "adana-aile-hukuku-rehberi": [
        "bosanma-davasi-nasil-acilir-adana",
        "adana-anlasmali-bosanma",
        "velayet-davasi-mahkeme-kriterleri",
        "istirak-nafakasi-rehberi",
        "bosanmada-mal-paylasimi",
        "adana-aile-mahkemesi-sureci",
    ],
    "adana-anlasmali-bosanma": [
        "bosanma-davasi-nasil-acilir-adana",
        "adana-aile-mahkemesi-sureci",
        "velayet-davasi-mahkeme-kriterleri",
        "istirak-nafakasi-rehberi",
        "bosanmada-mal-paylasimi",
    ],
    "bosanma-davasi-nasil-acilir-adana": [
        "adana-anlasmali-bosanma",
        "cekismeli-bosanma-sebepleri",
        "adana-aile-mahkemesi-sureci",
        "velayet-davasi-mahkeme-kriterleri",
        "bosanmada-mal-paylasimi",
    ],
    "velayet-davasi-mahkeme-kriterleri": [
        "istirak-nafakasi-rehberi",
        "adana-aile-mahkemesi-sureci",
        "bosanma-davasi-nasil-acilir-adana",
        "cekismeli-bosanma-sebepleri",
        "adana-aile-hukuku-rehberi",
    ],
    "istirak-nafakasi-rehberi": [
        "velayet-davasi-mahkeme-kriterleri",
        "bosanma-davasi-nasil-acilir-adana",
        "adana-anlasmali-bosanma",
        "adana-aile-mahkemesi-sureci",
        "cekismeli-bosanma-sebepleri",
    ],
    "bosanmada-mal-paylasimi": [
        "aile-konutu-serhi-bosanma",
        "ziynet-alacagi-davasi",
        "bosanma-davasi-nasil-acilir-adana",
        "cekismeli-bosanma-sebepleri",
        "adana-aile-hukuku-rehberi",
    ],
    "adana-aile-mahkemesi-sureci": [
        "bosanma-davasi-nasil-acilir-adana",
        "adana-anlasmali-bosanma",
        "velayet-davasi-mahkeme-kriterleri",
        "adana-aile-hukuku-rehberi",
        "istirak-nafakasi-rehberi",
    ],
    "cekismeli-bosanma-sebepleri": [
        "bosanma-davasi-nasil-acilir-adana",
        "velayet-davasi-mahkeme-kriterleri",
        "istirak-nafakasi-rehberi",
        "bosanmada-mal-paylasimi",
        "adana-aile-mahkemesi-sureci",
    ],
    "aile-konutu-serhi-bosanma": [
        "bosanmada-mal-paylasimi",
        "bosanma-davasi-nasil-acilir-adana",
        "cekismeli-bosanma-sebepleri",
        "adana-aile-mahkemesi-sureci",
        "ziynet-alacagi-davasi",
    ],
    "ziynet-alacagi-davasi": [
        "ziynet-alacagi-davasi",
        "bosanmada-mal-paylasimi",
        "cekismeli-bosanma-sebepleri",
        "bosanma-davasi-nasil-acilir-adana",
        "aile-konutu-serhi-bosanma",
    ],
}
# Remove self from ziynet list
RELATED["ziynet-alacagi-davasi"] = [
    "bosanmada-mal-paylasimi",
    "cekismeli-bosanma-sebepleri",
    "bosanma-davasi-nasil-acilir-adana",
    "aile-konutu-serhi-bosanma",
    "adana-aile-hukuku-rehberi",
]

# Body link anchors: (pattern, replacement) — first match only per file where noted
BODY_LINKS = {
    "adana-aile-hukuku-rehberi": [
        (r"\bAnlaşmalı boşanma\b", "[Anlaşmalı boşanma]({b}/adana-anlasmali-bosanma/)", 1),
        (r"\bçekişmeli boşanma\b", "[çekişmeli boşanma]({b}/cekismeli-bosanma-sebepleri/)", 1),
    ],
    "adana-anlasmali-bosanma": [
        (r"\bAnlaşmalı Boşanma Protokolü\b", "[Anlaşmalı Boşanma Protokolü]({b}/adana-anlasmali-bosanma/)", 1),
        (r"\bAdana Aile Mahkemeleri\b", "[Adana Aile Mahkemeleri]({b}/adana-aile-mahkemesi-sureci/)", 1),
    ],
    "bosanma-davasi-nasil-acilir-adana": [
        (r"\banlaşmalı boşanma\b", "[anlaşmalı boşanma]({b}/adana-anlasmali-bosanma/)", 1),
        (r"\bçekişmeli boşanma\b", "[çekişmeli boşanma]({b}/cekismeli-bosanma-sebepleri/)", 1),
    ],
    "velayet-davasi-mahkeme-kriterleri": [
        (r"\biştirak nafakası\b", "[iştirak nafakası]({b}/istirak-nafakasi-rehberi/)", 1),
        (r"\bAdana Aile Mahkemeleri\b", "[Adana Aile Mahkemeleri]({b}/adana-aile-mahkemesi-sureci/)", 1),
    ],
    "istirak-nafakasi-rehberi": [
        (r"\bvelayet\b", "[velayet]({b}/velayet-davasi-mahkeme-kriterleri/)", 1),
        (r"\bboşanma davası\b", "[boşanma davası]({b}/bosanma-davasi-nasil-acilir-adana/)", 1),
    ],
    "bosanmada-mal-paylasimi": [
        (r"\baile konutu\b", "[aile konutu]({b}/aile-konutu-serhi-bosanma/)", 1),
        (r"\bziynet\b", "[ziynet alacağı]({b}/ziynet-alacagi-davasi/)", 1),
    ],
    "adana-aile-mahkemesi-sureci": [
        (r"\bboşanma davası\b", "[boşanma davası]({b}/bosanma-davasi-nasil-acilir-adana/)", 1),
        (r"\banlaşmalı boşanma\b", "[anlaşmalı boşanma]({b}/adana-anlasmali-bosanma/)", 1),
    ],
    "cekismeli-bosanma-sebepleri": [
        (r"\bçekişmeli boşanma\b", "[çekişmeli boşanma]({b}/cekismeli-bosanma-sebepleri/)", 1),
        (r"\bmal paylaşımı\b", "[mal paylaşımı]({b}/bosanmada-mal-paylasimi/)", 1),
    ],
    "aile-konutu-serhi-bosanma": [
        (r"\bmal paylaşımı\b", "[mal paylaşımı]({b}/bosanmada-mal-paylasimi/)", 1),
        (r"\baile konutu şerhi\b", "[aile konutu şerhi]({b}/aile-konutu-serhi-bosanma/)", 1),
    ],
    "ziynet-alacagi-davasi": [
        (r"\bmal paylaşımına tabi tutulmaz\b", "[mal paylaşımına]({b}/bosanmada-mal-paylasimi/) tabi tutulmaz", 1),
        (r"\bZiynet alacağı davası\b", "[Ziynet alacağı davası]({b}/ziynet-alacagi-davasi/)", 1),
    ],
}

GLOBAL_SLUG_REPLACEMENTS = [
    (r"velayet-davasi-mahke-kriterleri", "velayet-davasi-mahkeme-kriterleri"),
    (r"bosanma-davasi-nasil-acilir(?!-adana)", "bosanma-davasi-nasil-acilir-adana"),
    (r"bosanma-davasi-adana", "bosanma-davasi-nasil-acilir-adana"),
    (r"velayet-davasi-adana", "velayet-davasi-mahkeme-kriterleri"),
    (r"mal-paylasimi-davasi(?:-adana|-rehberi)?", "bosanmada-mal-paylasimi"),
    (r"adana-aile-mahkemesi(?!-sureci)", "adana-aile-mahkemesi-sureci"),
    (r"cekismeli-bosanma(?:-davasi)?-adana", "cekismeli-bosanma-sebepleri"),
    (r"anlasmali-bosanma-protokolu(?:-nasil-hazirlanir)?", "adana-anlasmali-bosanma"),
    (r"aile-konutu-serhi(?!-bosanma)", "aile-konutu-serhi-bosanma"),
    (r"nafaka-davasi(?:-ve-turleri|-adana)?", "istirak-nafakasi-rehberi"),
    (r"adana-bosanma-avukati", "bosanma-davasi-nasil-acilir-adana"),
    (r"adana-velayet-davasi", "velayet-davasi-mahkeme-kriterleri"),
    (r"adana-nafaka-davasi", "istirak-nafakasi-rehberi"),
    (r"adana-mal-paylasimi", "bosanmada-mal-paylasimi"),
    (r"www\.adanaailehukuku\.com", "adanaailehukuku.com"),
]

LINK_BLOCK_RE = re.compile(
    r"(\n(?:\*   |\-\s+)\*\*İç link önerileri.*?"
    r"|\n\- İç link önerileri:.*?"
    r"|\n\*   \*\*İç link önerileri \(slug listesi\):\*\*.*?"
    r"|\n\-   \*\*İç link önerileri:\*\*.*?"
    r"|\n\*   \*\*İç link önerileri:\*\*.*?"
    r")(?=\n\n---|\n---\n\n## |\n## FAQ Schema)",
    re.DOTALL | re.IGNORECASE,
)


def format_link_block(slugs: list[str]) -> str:
    lines = ["\n- **İç link önerileri:**"]
    for s in slugs:
        title = SLUGS[s]
        lines.append(f"  - [{title}]({BASE}/{s}/) — `{s}`")
    return "\n".join(lines) + "\n"


def fix_schema_urls(text: str, file_slug: str) -> str:
    # mainEntityOfPage @id
    text = re.sub(
        r'"@id":\s*"https?://(?:www\.)?adanaailehukuku\.com/[^"]+"',
        f'"@id": "{BASE}/{file_slug}/"',
        text,
    )
    # Ensure author name in Article schema
    text = re.sub(
        r'"author":\s*\{\s*"@type":\s*"Person",\s*"name":\s*"deneyimli bir aile hukuku avukatı"',
        '"author": {\n    "@type": "Person",\n    "name": "Avukat Ceren Sümer Cilli"',
        text,
    )
    return text


def apply_body_links(text: str, file_slug: str) -> str:
    rules = BODY_LINKS.get(file_slug, [])
    for pattern, repl_tpl, count in rules:
        repl = repl_tpl.format(b=BASE)
        text, n = re.subn(pattern, repl, text, count=count)
    return text


def process_file(path: Path) -> dict:
    slug = path.stem
    original = path.read_text(encoding="utf-8")
    text = original
    changes = []

    # Frontmatter slug
    if f"slug: {slug}" not in text.split("---")[1]:
        text = re.sub(r"^slug: .+$", f"slug: {slug}", text, count=1, flags=re.MULTILINE)
        changes.append("frontmatter slug düzeltildi")

    for pat, rep in GLOBAL_SLUG_REPLACEMENTS:
        new_text, n = re.subn(pat, rep, text)
        if n:
            changes.append(f"global slug: {pat[:40]}… ({n}x)")
        text = new_text

    related = RELATED.get(slug, [])
    new_block = format_link_block(related)
    if LINK_BLOCK_RE.search(text):
        text = LINK_BLOCK_RE.sub(new_block, text, count=1)
        changes.append(f"iç link bloğu güncellendi ({len(related)} link)")
    else:
        # Insert before FAQ Schema if no block found
        text = re.sub(
            r"(\n## FAQ Schema JSON-LD)",
            new_block + r"\1",
            text,
            count=1,
        )
        changes.append(f"iç link bloğu eklendi ({len(related)} link)")

    text = fix_schema_urls(text, slug)
    text = apply_body_links(text, slug)

    # Add related articles section before SEO if not present
    marker = "## İlgili makaleler"
    if marker not in text:
        related_md = "\n## İlgili makaleler\n\n" + "\n".join(
            f"- [{SLUGS[s]}]({BASE}/{s}/)" for s in related[:5]
        ) + "\n"
        text = re.sub(
            r"(\n---\s*\n\n## SEO Çıktıları|\n## SEO Çıktıları)",
            related_md + r"\1",
            text,
            count=1,
        )
        changes.append("İlgili makaleler bölümü eklendi")

    if text != original:
        path.write_text(text, encoding="utf-8")
    return {"slug": slug, "changes": changes, "links": related}


def main():
    report = []
    for path in sorted(ARTICLES_DIR.glob("*.md")):
        report.append(process_file(path))
    for r in report:
        print(f"\n{r['slug']}:")
        for c in r["changes"]:
            print(f"  - {c}")
        print("  links:", ", ".join(r["links"]))


if __name__ == "__main__":
    main()
