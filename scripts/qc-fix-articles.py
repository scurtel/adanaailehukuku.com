#!/usr/bin/env python3
"""QC fixes for content/articles — small safe edits, no full rewrite."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = ROOT / "content" / "articles"

META = {
    "adana-aile-hukuku-rehberi": {
        "title": "Adana Aile Hukuku Rehberi: Süreçler, Haklar ve Mahkeme Yolu",
        "description": "Adana'da boşanma, velayet, nafaka ve mal paylaşımı süreçleri. Aile mahkemesi yolu, belgeler ve sık sorulan sorular.",
        "focusKeyword": "adana aile hukuku",
        "secondaryKeywords": [
            "boşanma adana",
            "velayet davası",
            "iştirak nafakası",
            "mal paylaşımı",
            "adana aile mahkemesi",
        ],
    },
    "adana-anlasmali-bosanma": {
        "title": "Adana'da Anlaşmalı Boşanma: Şartlar, Protokol ve Süre",
        "description": "Adana'da anlaşmalı boşanma şartları, protokol içeriği ve aile mahkemesi süreci. Belgeler ve sık sorular.",
        "focusKeyword": "anlaşmalı boşanma adana",
        "secondaryKeywords": [
            "anlaşmalı boşanma protokolü",
            "anlaşmalı boşanma süresi",
            "boşanma adana",
            "velayet protokolü",
            "iştirak nafakası",
        ],
    },
    "bosanma-davasi-nasil-acilir-adana": {
        "title": "Boşanma Davası Nasıl Açılır? Adana'da Adım Adım Süreç",
        "description": "Adana'da boşanma davası nasıl açılır? Dilekçe, belgeler, harç ve aile mahkemesi süreci adım adım.",
        "focusKeyword": "boşanma davası nasıl açılır",
        "secondaryKeywords": [
            "adana boşanma davası",
            "anlaşmalı boşanma",
            "çekişmeli boşanma",
            "boşanma dilekçesi",
            "adana aile mahkemesi",
        ],
    },
    "velayet-davasi-mahkeme-kriterleri": {
        "title": "Velayet Davaları: Mahkeme Ne Kriterlere Bakar?",
        "description": "Velayet davalarında mahkemenin baktığı kriterler, çocuğun üstün yararı ve Adana'daki süreç.",
        "focusKeyword": "velayet davası",
        "secondaryKeywords": [
            "velayet değişikliği",
            "çocuğun üstün yararı",
            "kişisel ilişki",
            "velayet adana",
            "iştirak nafakası",
        ],
    },
    "istirak-nafakasi-rehberi": {
        "title": "İştirak Nafakası: Miktar, Artırım ve Tahsil Yolu",
        "description": "İştirak nafakası nedir, nasıl belirlenir? Artırım, icra ve Adana aile mahkemesi süreci.",
        "focusKeyword": "iştirak nafakası",
        "secondaryKeywords": [
            "çocuk nafakası",
            "nafaka artırım davası",
            "nafaka icra",
            "tedbir nafakası",
            "velayet",
        ],
    },
    "bosanmada-mal-paylasimi": {
        "title": "Boşanmada Mal Paylaşımı: Edinilmiş Mallar ve Tasfiye",
        "description": "Boşanmada mal paylaşımı, edinilmiş mallar, tasfiye ve Adana'da aile mahkemesi süreci.",
        "focusKeyword": "mal paylaşımı boşanma",
        "secondaryKeywords": [
            "edinilmiş mallar",
            "mal rejimi",
            "tasfiye davası",
            "ziynet alacağı",
            "aile konutu",
        ],
    },
    "adana-aile-mahkemesi-sureci": {
        "title": "Adana Aile Mahkemeleri: Yetki, Duruşma ve Dosya Takibi",
        "description": "Adana aile mahkemesi yetki, duruşma ve dosya takibi. Boşanma, velayet ve nafaka davalarında süreç.",
        "focusKeyword": "adana aile mahkemesi",
        "secondaryKeywords": [
            "aile mahkemesi yetki",
            "adana boşanma",
            "duruşma süreci",
            "uyap dosya sorgulama",
            "seyhan aile mahkemesi",
        ],
    },
    "cekismeli-bosanma-sebepleri": {
        "title": "Çekişmeli Boşanma: Sebepler, Delil ve Savunma Çizgisi",
        "description": "Çekişmeli boşanma sebepleri, delil türleri ve Adana aile mahkemesinde süreç.",
        "focusKeyword": "çekişmeli boşanma",
        "secondaryKeywords": [
            "boşanma sebepleri",
            "TMK 166",
            "boşanma tazminatı",
            "velayet",
            "mal paylaşımı",
        ],
    },
    "aile-konutu-serhi-bosanma": {
        "title": "Aile Konutu Şerhi: Satış, Kira ve Boşanmadaki Koruma",
        "description": "Aile konutu şerhi (TMK 194), satış ve kira kısıtları. Boşanmada konut koruma rehberi.",
        "focusKeyword": "aile konutu şerhi",
        "secondaryKeywords": [
            "aile konutu satışı",
            "TMK 194",
            "boşanma",
            "tapu şerhi",
            "mal paylaşımı",
        ],
    },
    "ziynet-alacagi-davasi": {
        "title": "Ziynet Alacağı Davası: İspat, Liste ve Zamanaşımı",
        "description": "Ziynet alacağı davasında ispat, liste hazırlama ve zamanaşımı. Adana aile mahkemesi süreci.",
        "focusKeyword": "ziynet alacağı",
        "secondaryKeywords": [
            "ziynet eşyası",
            "düğün takıları",
            "boşanma",
            "ispat yükü",
            "mal paylaşımı",
        ],
    },
}

DISCLAIMER = (
    "\n\n**Hukuki uyarı:** Bu içerik genel bilgilendirme amacı taşır. "
    "Somut olayın özelliklerine göre hukuki değerlendirme değişebilir.\n"
)

REPLACEMENTS = [
    (r"\bkritik öneme sahiptir\b", "önem taşır"),
    (r"\bhayati öneme sahiptir\b", "belirleyici olabilir"),
    (r"\bhayati önem taşır\b", "belirleyici olabilir"),
    (r"\bvazgeçilmezdir\b", "çoğu dosyada faydalıdır"),
    (r"\belzemdir\b", "faydalı olabilir"),
    (r"davanın lehe sonuçlanması", "dosyanın lehine yönetilmesi"),
    (r"davanın lehinize sonuçlanması", "hakların doğru talep edilmesi"),
    (r"lehe sonuçlanma ihtimalini artırır", "dosyanın daha sağlıklı yürütülmesine katkı sağlar"),
    (r"olumlu sonuçlanması", "sağlıklı ilerlemesi"),
    (r"davanın başarısı için", "dosyanın doğru yürütülmesi için"),
    (r"en iyi şekilde savunulabilir", "hukuki çerçevede değerlendirilebilir"),
    (r"en iyi şekilde korunması", "hukuki çerçevede korunması"),
    (r"en iyi şekilde savunarak", "hukuki çerçevede temsil ederek"),
    (r"Avukat Ceren Sümer Cilli gibi (?:deneyimli |uzman )?(?:bir )?aile hukuku avukatının?", "Deneyimli bir aile hukuku avukatının"),
    (r"Avukat Ceren Sümer Cilli gibi (?:uzman )?(?:bir )?avukatın", "Uzman bir avukatın"),
    (r"Avukat Ceren Sümer Cilli gibi (?:Adana'da )?(?:aile hukuku alanında )?uzmanlaşmış bir avukatın", "Adana'da aile hukuku alanında çalışan bir avukatın"),
    (r"Avukat Ceren Sümer Cilli gibi alanında uzman bir hukukçu,", "Aile hukuku alanında çalışan bir avukat,"),
    (r"Avukat Ceren Sümer Cilli gibi tecrübeli bir aile hukuku avukatının", "Deneyimli bir aile hukuku avukatının"),
    (r"Avukat Ceren Sümer Cilli gibi uzman bir aile hukuku avukatından", "Uzman bir aile hukuku avukatından"),
    (r"Avukat Ceren Sümer Cilli gibi uzman bir avukatın", "Uzman bir avukatın"),
    (r"Avukat Ceren Sümer Cilli gibi deneyimli bir aile hukuku avukatından", "Deneyimli bir aile hukuku avukatından"),
    (r"Avukat Ceren Sümer Cilli gibi bir avukatın", "Bir avukatın"),
    (r"Avukat Ceren Sümer Cilli gibi bir profesyonelin", "Deneyimli bir avukatın"),
    (r"Avukat Ceren Sümer Cilli gibi bir uzmandan", "Uzman bir avukattan"),
    (r"Avukat Ceren Sümer Cilli gibi bir uzmandan destek almak önemlidir", "Uzman bir avukattan destek almak faydalı olabilir"),
    (r"Avukat Ceren Sümer Cilli gibi uzman bir aile hukuku avukatından destek almak, hak kayıplarının önüne geçmek adına kritik öneme sahiptir", "Uzman bir aile hukuku avukatından destek almak, hak kayıplarını azaltmaya yardımcı olabilir"),
    (r"kesin ve doğru bilgi için mutlaka", "doğru bilgi için"),
    (r"kesin ve kişiye özel bilgi için mutlaka", "kişiye özel bilgi için"),
    (r"adil bir sonuca ulaşmanın güvencesidir", "daha sağlıklı bir değerlendirme yapılmasına yardımcı olur"),
    (r"şanslarını önemli ölçüde artırabilirler", "süreci daha bilinçli yönetebilirler"),
    (r"sürecin doğru yönetilmesi için Avukat Ceren Sümer Cilli gibi bir uzmandan destek almak önemlidir", "sürecin doğru yürütülmesi için uzman desteği değerlendirilebilir"),
    (r"mutlaka Adana'da aile hukuku alanında uzman bir avukata danışmanız gerekmektedir", "somut dosyanız için bir avukata danışmanız gerekir"),
    (r"mutlaka uzman bir avukattan profesyonel hukuki danışmanlık almanız gerekmektedir", "somut dosyanız için bir avukata danışmanız gerekir"),
]

AI_ARTIFACT = re.compile(
    r"^---\s*\n\s*(?:Harika bir|İşte istenen|Harika! İşte).+?\n\s*---\s*\n",
    re.MULTILINE | re.IGNORECASE,
)

EXPERT_LINE = (
    "Avukat Ceren Sümer Cilli'ye göre, aile hukuku uyuşmazlıklarında en kritik nokta; "
    "delil, talep ve sürecin dava açılmadan önce dosyaya uygun şekilde planlanmasıdır."
)


def build_frontmatter(slug: str, meta: dict) -> str:
    sk = meta["secondaryKeywords"]
    sk_yaml = "\n".join(f'  - "{k}"' for k in sk)
    return (
        "---\n"
        f'title: "{meta["title"]}"\n'
        f'description: "{meta["description"]}"\n'
        f"slug: {slug}\n"
        f'date: "2026-05-15"\n'
        f'author: "Av. Ceren Sümer Cilli"\n'
        f'category: "Aile Hukuku"\n'
        f'focusKeyword: "{meta["focusKeyword"]}"\n'
        f"secondaryKeywords:\n{sk_yaml}\n"
        "---\n\n"
    )


def strip_old_frontmatter(text: str) -> str:
    if text.startswith("---"):
        end = text.find("\n---\n", 3)
        if end != -1:
            return text[end + 5 :]
    return text


def ensure_disclaimer(body: str) -> str:
    if "genel bilgilendirme amacı" in body.lower():
        return body
    # Insert before SEO section or at end of main content
    m = re.search(r"\n---\s*\n\s*## SEO", body)
    if m:
        return body[: m.start()] + DISCLAIMER + body[m.start() :]
    m2 = re.search(r"\n## SEO Çıktıları", body)
    if m2:
        return body[: m2.start()] + DISCLAIMER + body[m2.start() :]
    return body.rstrip() + DISCLAIMER


def ensure_expert_quote(body: str, slug: str) -> str:
    count = len(re.findall(r"Ceren Sümer Cilli", body))
    if count >= 2:
        return body
    # Add after first ## Giriş paragraph block
    m = re.search(r"(## Giriş\s*\n\n.+?\n)\n(?=## )", body, re.DOTALL)
    if m and EXPERT_LINE not in body:
        insert = f"\n{EXPERT_LINE}\n"
        body = body[: m.end(1)] + insert + body[m.end(1) :]
    return body


def fix_ziynet_truncation(body: str) -> str:
    if "ziynetlerin r\n" in body or "ziynetlerin r$" in body:
        body = re.sub(
            r"### Ziynet alacağı davasında ispat yükü kimdedir\?\s*\n.*?(?=\n---|\nHarika|\n## SEO)",
            """### Ziynet alacağı davasında ispat yükü kimdedir?
Genel kural olarak ispat yükü davacıdadır; ziynetin varlığı, miktarı ve iade edilmediği iddiası delillerle desteklenmelidir. Davalı, ziynetin rızayla verildiğini veya iade edildiğini iddia ederse bu hususu ispat etmek zorunda kalabilir.

### Ziynet alacağı davasında zamanaşımı süresi nedir?
Ziynet alacağı, genel zamanaşımı hükümlerine tabidir; süre, alacağın doğumu ve dava tarihine göre somut olayda değerlendirilir. Süre kaçırılması hak düşürücü sonuç doğurabilir.

### Ziynet listesi nasıl hazırlanır?
Düğün fotoğraf ve videoları, tanık beyanları, mesajlaşmalar ve varsa faturalarla desteklenen ayrıntılı bir liste hazırlanması ispat açısından önemlidir.

""",
            body,
            flags=re.DOTALL,
        )
    return body


def remove_duplicate_seo_intro(body: str) -> str:
    return AI_ARTIFACT.sub("\n---\n\n", body)


def apply_replacements(body: str) -> str:
    for pat, repl in REPLACEMENTS:
        body = re.sub(pat, repl, body, flags=re.IGNORECASE)
    return body


def fix_meta_cta(text: str) -> str:
    text = re.sub(
        r"Avukat Ceren Sümer Cilli ile hukuki destek alın\.?",
        "Adana aile hukuku süreci hakkında bilgi edinin.",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"Avukat Ceren Sümer Cilli,? Adana'da size rehberlik ediyor\.?",
        "Adana'da aile mahkemesi süreci hakkında bilgi sunar.",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"Avukat Ceren Sümer Cilli ile profesyonel destek alın\.?",
        "Aile hukuku süreçleri hakkında bilgi edinin.",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"Avukat Ceren Sümer Cilli, TMK'daki bu hakkı ve Adana'daki uygulamalarını açıklıyor\.?",
        "TMK 194 kapsamındaki aile konutu koruması ve Adana uygulaması.",
        text,
        flags=re.IGNORECASE,
    )
    return text


def cap_ceren_mentions(body: str, max_named: int = 4) -> str:
    """Keep first explicit expert mentions; soften excess in FAQ/schema only."""
    # Soften FAQ answers that are salesy
    body = re.sub(
        r'"text": "Evet, Adana[^"]*Avukat Ceren Sümer Cilli[^"]*"',
        '"text": "Aile hukuku davalarında avukat desteği, dilekçe ve delil planı açısından değerlendirilebilir. Somut dosya için danışmanlık alınması önerilir."',
        body,
    )
    body = re.sub(
        r'"text": "[^"]*adanaailehukuku\.com[^"]*"',
        '"text": "Somut dosya için aile hukuku alanında avukat desteği değerlendirilebilir."',
        body,
    )
    return body


def process_file(path: Path) -> list[str]:
    slug = path.stem
    if slug not in META:
        return [f"SKIP unknown slug: {slug}"]

    changes: list[str] = []
    raw = path.read_text(encoding="utf-8")
    body = strip_old_frontmatter(raw)
    orig = body

    body = remove_duplicate_seo_intro(body)
    if body != orig:
        changes.append("AI artefact metni kaldırıldı")

    body = fix_ziynet_truncation(body) if slug == "ziynet-alacagi-davasi" else body
    if slug == "ziynet-alacagi-davasi" and "ziynetlerin r" not in body:
        changes.append("Ziynet SSS kesik bölümü tamamlandı")

    before = body
    body = apply_replacements(body)
    if body != before:
        changes.append("Riskli/tekrarlı ifadeler yumuşatıldı")

    body = fix_meta_cta(body)
    body = ensure_disclaimer(body)
    if "genel bilgilendirme" not in orig.lower():
        changes.append("Hukuki uyarı eklendi/düzenlendi")

    body = ensure_expert_quote(body, slug)
    body = cap_ceren_mentions(body)

    # adana-aile-mahkemesi: remove "en adil sonuca" in intro
    if slug == "adana-aile-mahkemesi-sureci":
        body = body.replace("en adil sonuca ulaşmak için kritik bir adımdır", "dosyanın usulüne uygun yürütülmesi için önemli bir adımdır")

    # aile-konutu: shorten hukuki uyarı promo at end
    body = re.sub(
        r"\*\*Hukuki uyarı:\*\* Bu içerik genel bilgilendirme amacı taşır ve hukuki tavsiye niteliğinde değildir\. Her somut olayın kendine özgü koşulları bulunduğundan, hukuki süreçler hakkında kesin ve doğru bilgi almak için somut dosyanız için bir avukata danışmanız gerekir\. Avukat Ceren Sümer Cilli, aile konutu şerhi ve diğer aile hukuku konularında profesyonel hukuki destek sunmaktadır\.",
        "**Hukuki uyarı:** Bu içerik genel bilgilendirme amacı taşır. Somut olayın özelliklerine göre hukuki değerlendirme değişebilir.",
        body,
    )

    fm = build_frontmatter(slug, META[slug])
    path.write_text(fm + body, encoding="utf-8")
    count = len(re.findall(r"Ceren Sümer Cilli", body))
    changes.append(f"Ceren Sümer Cilli geçiş sayısı: {count}")
    return changes


def main():
    for path in sorted(ARTICLES_DIR.glob("*.md")):
        ch = process_file(path)
        print(f"\n{path.name}:")
        for c in ch:
            print(f"  - {c}")


if __name__ == "__main__":
    main()
