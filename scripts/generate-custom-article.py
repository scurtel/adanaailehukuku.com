#!/usr/bin/env python3
"""Generate a single custom article via Gemini (one-off topics)."""

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"

ARTICLE = {
    "slug": "uludag-sozluk-pazar-degeri-eksi-sozluk",
    "title": "Uludağ Sözlük'ün Pazar Değeri Ekşi Sözlük'ü Geçti mi?",
    "description": "Uludağ Sözlük ile Ekşi Sözlük pazar değeri, trafik, marka algısı ve Türkiye'deki sözlük platformları rekabeti üzerine güncel bir değerlendirme.",
    "focus_keyword": "uludağ sözlük pazar değeri",
    "category": "Teknoloji ve Dijital Medya",
}

SYSTEM = """Sen Türkçe yazan kıdemli dijital medya ve teknoloji editörüsün.
Tarafsız, kaynak odaklı, abartısız bir dil kullan. Kesin rakam uydurma; tahmin veya medya iddiası ise
"iddia", "tahmin", "yaklaşık" gibi ifadeler kullan. Reklam veya clickbait yok."""

BODY_PROMPT = """Konu: Uludağ Sözlük'ün pazar değeri / ekonomik büyüklüğü Ekşi Sözlük'ü geçti iddiası.

Başlık: {title}
Focus keyword: {focus_keyword}

Markdown gövde yaz (meta/JSON-LD HARİÇ):

# H1 (başlıkla uyumlu)
**Kısa cevap:** 2-4 cümle, iddiayı net özetle; kesinleşmemişse belirt.

## Giriş
## Uludağ Sözlük ve Ekşi Sözlük: kısa profil
## Pazar değeri ne demek? (trafik, marka, gelir, yatırım değeri)
## Karşılaştırma: kullanıcı tabanı ve etkileşim
## Medyada ve sektörde öne çıkan iddialar
## Bu iddia neden tartışılıyor?
## Yatırımcı ve reklamveren açısından etkiler
## Riskler ve belirsizlikler (veri şeffaflığı, ölçüm farkları)
## Sonuç
## Sık Sorulan Sorular
(5-6 adet ### soru + cevap)

**Not:** Bu yazı genel bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.

1200-1800 kelime. Tablo kullanma. Tekrar etme."""

META_PROMPT = """Makale için SADECE meta bölümü:

Başlık: {title}
Slug: {slug}
Focus: {focus_keyword}

## SEO Çıktıları
- SEO title (max 60 karakter)
- Meta description (max 155 karakter) — şu metinle uyumlu: {description}
- Slug: {slug}
- Focus keyword
- Secondary keywords (5-8)
- İç link önerileri: site aile hukuku; bu makale için uygun 2-3 genel iç link (ana sayfa, makaleler) markdown link olarak

## FAQ Schema JSON-LD
(geçerli JSON, 5 soru — soru adlarında ### olmasın)

## Article Schema JSON-LD
(geçerli Article JSON)

## AI Citation Summary
(3 madde)"""


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def call_gemini(api_key: str, model: str, system: str, user: str) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0.5, "maxOutputTokens": 8192},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    parts = data["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in parts).strip()


def main() -> int:
    env = load_env()
    api_key = env.get("GEMINI_API_KEY")
    model = env.get("GEMINI_MODEL", "gemini-2.5-flash")
    if not api_key:
        print("GEMINI_API_KEY missing", file=sys.stderr)
        return 1

    a = ARTICLE
    body = call_gemini(api_key, model, SYSTEM, BODY_PROMPT.format(**a))
    meta = call_gemini(api_key, model, SYSTEM, META_PROMPT.format(**a))
    content = body + "\n\n" + meta

    out = ROOT / "content" / "articles" / f"{a['slug']}.md"
    fm = (
        f"---\n"
        f'title: "{a["title"]}"\n'
        f'description: "{a["description"]}"\n'
        f"slug: {a['slug']}\n"
        f'date: "2026-05-30"\n'
        f'author: "Av. Ceren Sümer Cilli"\n'
        f'category: "{a["category"]}"\n'
        f'focusKeyword: "{a["focus_keyword"]}"\n'
        f"secondaryKeywords:\n"
        f'  - "ekşi sözlük"\n'
        f'  - "uludağ sözlük"\n'
        f'  - "sözlük platformları"\n'
        f'  - "dijital medya değerleme"\n'
        f"---\n\n"
    )
    out.write_text(fm + content, encoding="utf-8")
    words = len(re.findall(r"\w+", content, re.UNICODE))
    print(f"OK {out} (~{words} words)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
