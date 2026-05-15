#!/usr/bin/env python3
"""Trim Avukat Ceren Sümer Cilli mentions to ~2-4 in body; soften scenario/meta."""

import re
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent / "content" / "articles"
KEEP = 3  # named mentions in body (excl. frontmatter author)

PATTERNS = [
    (r"\bvazgeçilmez bir hal alır\b", "önemli bir destek haline gelir"),
    (r"\ben iyi şekilde savunmak\b", "hukuki çerçevede savunmak"),
    (r"\ben etkin şekilde yönetir\b", "usulüne uygun yönetir"),
    (r"\ben adil sonuca ulaşmanızı sağlayacaktır\b", "süreci daha bilinçli yürütmenize yardımcı olabilir"),
    (r"\badil bir sonuca ulaşmıştır\b", "süreci tamamlamıştır"),
    (r"\ben adil çözüme ulaşmalarını sağlamayı\b", "hukuki süreci yürütmeyi"),
    (r"Avukat Ceren Sümer Cilli'den hukuki danışmanlık alın\.?", "aile mahkemesi süreci hakkında bilgi edinin."),
    (r"Avukat Ceren Sümer Cilli ile keşfedin\.?", "hakkında bilgi edinin."),
    (r"Bu konuda Avukat Ceren Sümer Cilli'den detaylı bilgi alabilirsiniz\.", "Somut dosyada yetki, ikamet ve talebe göre değerlendirme yapılır."),
    (r"Avukat Ceren Sümer Cilli, Adana'da aile hukuku davalarında müvekkillerine danışmanlık ve temsil hizmeti sunmaktadır\.", "Aile hukuku davalarında avukat desteği, dilekçe ve delil planı açısından değerlendirilebilir."),
    (r"Avukat Ceren Sümer Cilli gibi bir avukat aracılığıyla", "Bir avukat aracılığıyla"),
    (r"Avukat Ceren Sümer Cilli gibi Adana'da aile hukuku alanında uzman bir avukat,", "Adana'da aile hukuku alanında çalışan bir avukat,"),
    (r"Avukat Ceren Sümer Cilli gibi alanında uzman ve deneyimli bir aile hukuku avukatından", "Deneyimli bir aile hukuku avukatından"),
    (r"Avukat Ceren Sümer Cilli gibi profesyonel bir hukuki danışmanlık hizmeti,", "Profesyonel hukuki danışmanlık,"),
    (r"Avukat Ceren Sümer Cilli gibi uzman bir hukukçudan", "Uzman bir avukattan"),
    (r"Avukat Ceren Sümer Cilli gibi deneyimli bir hukukçu,", "Deneyimli bir aile hukuku avukatı,"),
    (r"Avukat Ceren Sümer Cilli ve ekibi,", "Deneyimli bir aile hukuku avukatı,"),
    (r"\*\*Avukat Ceren Sümer Cilli\*\*, müvekkillerine", "Deneyimli bir aile hukuku avukatı, müvekkillerine"),
    (r"\*\*Avukat Ceren Sümer Cilli\*\*'ye", "Bir avukata"),
    (r"\*\*Avukat Ceren Sümer Cilli\*\*'ye başvurur", "bir avukata başvurur"),
    (r"\*\*Avukat Ceren Sümer Cilli\*\*", "Avukat Ceren Sümer Cilli"),  # normalize then trim
]

SCHEMA_FAQ_FIX = [
    (
        r'"text": "[^"]*Avukat Ceren Sümer Cilli[^"]*"',
        '"text": "Somut dosyada yetki, delil ve talep çerçevesi değişir; ayrıntılı değerlendirme için avukata danışılması önerilir."',
    ),
]


def trim_named_mentions(text: str) -> str:
    """Keep first KEEP 'Avukat Ceren Sümer Cilli' in body; replace rest."""
    m = re.match(r"^(---\n.*?\n---\n\n)(.*)$", text, re.DOTALL)
    if not m:
        fm, rest = "", text
    else:
        fm, rest = m.group(1), m.group(2)

    count = 0

    def repl(match):
        nonlocal count
        count += 1
        if count <= KEEP:
            return match.group(0)
        return "deneyimli bir aile hukuku avukatı"

    rest = re.sub(r"Avukat Ceren Sümer Cilli", repl, rest)
    # Senaryo adımlarında tekrarı azalt
    if "## Örnek senaryo" in rest:
        head, scenario = rest.split("## Örnek senaryo", 1)
        scenario = scenario.replace("Avukat Ceren Sümer Cilli", "Avukatı", 1)
        scenario = scenario.replace("Avukat Ceren Sümer Cilli", "avukatı")
        rest = head + "## Örnek senaryo" + scenario
    return fm + rest


def process(path: Path):
    t = path.read_text(encoding="utf-8")
    for pat, rep in PATTERNS:
        t = re.sub(pat, rep, t, flags=re.IGNORECASE)
    for pat, rep in SCHEMA_FAQ_FIX:
        t = re.sub(pat, rep, t)
    t = trim_named_mentions(t)
    path.write_text(t, encoding="utf-8")
    n = len(re.findall(r"Ceren Sümer Cilli", t))
    print(f"{path.name}: {n} mentions")


def main():
    for p in sorted(DIR.glob("*.md")):
        process(p)


if __name__ == "__main__":
    main()
