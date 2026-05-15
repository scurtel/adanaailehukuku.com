#!/usr/bin/env python3
"""Generate family law articles via Google Gemini API (two-phase)."""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"
OUTPUT_DIR = ROOT / "content" / "articles"

ARTICLES = [
    {
        "slug": "adana-aile-hukuku-rehberi",
        "title": "Adana Aile Hukuku Rehberi: Süreçler, Haklar ve Mahkeme Yolu",
        "focus_keyword": "adana aile hukuku",
    },
    {
        "slug": "adana-anlasmali-bosanma",
        "title": "Adana'da Anlaşmalı Boşanma: Şartlar, Protokol ve Süre",
        "focus_keyword": "anlaşmalı boşanma adana",
    },
    {
        "slug": "bosanma-davasi-nasil-acilir-adana",
        "title": "Boşanma Davası Nasıl Açılır? Adana'da Adım Adım Süreç",
        "focus_keyword": "boşanma davası nasıl açılır",
    },
    {
        "slug": "velayet-davasi-mahkeme-kriterleri",
        "title": "Velayet Davaları: Mahkeme Ne Kriterlere Bakar?",
        "focus_keyword": "velayet davası",
    },
    {
        "slug": "istirak-nafakasi-rehberi",
        "title": "İştirak Nafakası: Miktar, Artırım ve Tahsil Yolu",
        "focus_keyword": "iştirak nafakası",
    },
    {
        "slug": "bosanmada-mal-paylasimi",
        "title": "Boşanmada Mal Paylaşımı: Edinilmiş Mallar ve Tasfiye",
        "focus_keyword": "mal paylaşımı boşanma",
    },
    {
        "slug": "adana-aile-mahkemesi-sureci",
        "title": "Adana Aile Mahkemeleri: Yetki, Duruşma ve Dosya Takibi",
        "focus_keyword": "adana aile mahkemesi",
    },
    {
        "slug": "cekismeli-bosanma-sebepleri",
        "title": "Çekişmeli Boşanma: Sebepler, Delil ve Savunma Çizgisi",
        "focus_keyword": "çekişmeli boşanma",
    },
    {
        "slug": "aile-konutu-serhi-bosanma",
        "title": "Aile Konutu Şerhi: Satış, Kira ve Boşanmadaki Koruma",
        "focus_keyword": "aile konutu şerhi",
    },
    {
        "slug": "ziynet-alacagi-davasi",
        "title": "Ziynet Alacağı Davası: İspat, Liste ve Zamanaşımı",
        "focus_keyword": "ziynet alacağı",
    },
]

SYSTEM_INSTRUCTION = """Sen kıdemli Türk aile hukuku editörü ve SEO copywriter'sın.
Site: adanaailehukuku.com — Avukat Ceren Sümer Cilli.

KURALLAR: Türkçe, profesyonel, sakin; spam yok; garanti/en iyi avukat vaadi yok;
Avukat Ceren Sümer Cilli 2-4 kez doğal geçsin; uydurma içtihat numarası yok;
TMK/HMK/6284 doğru genel referans; Adana yerel bağlamı ölçülü."""

PROMPT_BODY = """Makale gövdesini yaz (SEO ekleri HARİÇ).

Başlık: {title}
Focus keyword: {focus_keyword}
Slug: {slug}

YAPI (markdown):
# H1
**Kısa cevap:** 2-4 cümle
## Giriş
## Konunun hukuki temeli
(Bullet list ile 4-6 mevzuat maddesi; TABLO KULLANMA)
## Adana aile mahkemelerinde süreç nasıl işler?
## Hangi belgeler gerekir?
(Bullet list; TABLO KULLANMA)
## Dava sürecinde yapılan yaygın hatalar
## Avukat desteği neden önemlidir?
## Örnek senaryo
## Sonuç
## Sık Sorulan Sorular
(5-7 adet ### Soru? + cevap paragrafı)

**Hukuki uyarı:** Bu içerik genel bilgilendirme amacı taşır...

1500-2200 kelime. Tekrar yok. Kısa paragraflar."""

PROMPT_META = """Aşağıdaki makale için SADECE meta bölümünü yaz.

Başlık: {title}
Slug: {slug}
Focus keyword: {focus_keyword}

## SEO Çıktıları
- SEO title (max 60 karakter)
- Meta description (max 155 karakter)
- Slug: {slug}
- Focus keyword
- Secondary keywords (5-8)
- İç link önerileri (slug listesi)

## FAQ Schema JSON-LD
(geçerli JSON, 5-7 soru)

## Article Schema JSON-LD
(geçerli JSON)

## AI Citation Summary
(3 madde)"""

MIN_WORDS = 1200
MAX_BYTES = 100_000


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def is_table_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if re.fullmatch(r"[\|\-\:\s]+", s):
        return True
    if len(s) < 25 and s.count("|") >= 2:
        return True
    return False


def validate_content(content: str) -> tuple[bool, str]:
    words = len(re.findall(r"\w+", content, re.UNICODE))
    size = len(content.encode("utf-8"))
    if words < MIN_WORDS:
        return False, f"too short ({words} words)"
    if size > MAX_BYTES:
        return False, f"too large ({size} bytes)"

    # Detect runaway repetition (same 80+ char chunk)
    chunks = re.findall(r".{80,}", content)
    chunk_counts = Counter(chunks)
    if chunk_counts and chunk_counts.most_common(1)[0][1] > 2:
        return False, "repeated long block"

    lines = [ln.strip() for ln in content.splitlines() if ln.strip() and not is_table_line(ln)]
    if lines:
        counts = Counter(lines)
        line, count = counts.most_common(1)[0]
        if count > 5 and len(line) > 40:
            return False, "repetitive lines"

    if "## Sonuç" not in content and "## Sonuc" not in content:
        return False, "missing Sonuç section"
    if "Sık Sorulan" not in content and "SSS" not in content:
        return False, "missing FAQ section"

    return True, f"{words} words"


def call_gemini(api_key: str, model: str, user_prompt: str, temperature: float = 0.5) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 8192,
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError(json.dumps(data)[:600])

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError("Empty Gemini response")
    return text


def generate_article(api_key: str, model: str, article: dict) -> str:
    body_prompt = PROMPT_BODY.format(**article)
    meta_prompt = PROMPT_META.format(**article)

    for attempt in range(4):
        body = call_gemini(api_key, model, body_prompt, temperature=0.45 + attempt * 0.05)
        ok, reason = validate_content(body)
        if not ok:
            body_prompt += f"\n\nDüzelt: {reason}. Tablo kullanma, tekrar etme."
            time.sleep(4)
            continue
        meta = call_gemini(api_key, model, meta_prompt, temperature=0.3)
        return body + "\n\n---\n\n" + meta

    raise RuntimeError(f"Body validation failed after retries: {reason}")


def main() -> int:
    env = load_env()
    api_key = env.get("GEMINI_API_KEY")
    model = env.get("GEMINI_MODEL", "gemini-2.5-flash")
    if not api_key:
        print("GEMINI_API_KEY missing", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    only = os.environ.get("ONLY_SLUG")
    missing_only = os.environ.get("MISSING_ONLY") == "1"
    articles = [a for a in ARTICLES if not only or a["slug"] == only]

    if missing_only:
        articles = [a for a in articles if not (OUTPUT_DIR / f"{a['slug']}.md").exists()]

    print(f"Model: {model} | Articles: {len(articles)}\n")

    for i, article in enumerate(articles, 1):
        out_path = OUTPUT_DIR / f"{article['slug']}.md"
        if out_path.exists() and os.environ.get("FORCE") != "1":
            print(f"[{i}/{len(articles)}] SKIP: {article['slug']}")
            continue

        print(f"[{i}/{len(articles)}] {article['title']}...")
        try:
            content = generate_article(api_key, model, article)
            fm = (
                f"---\ntitle: \"{article['title']}\"\n"
                f"slug: {article['slug']}\n"
                f"focus_keyword: {article['focus_keyword']}\n"
                f"generated_by: gemini\nmodel: {model}\n---\n\n"
            )
            out_path.write_text(fm + content, encoding="utf-8")
            words = len(re.findall(r"\w+", content, re.UNICODE))
            kb = out_path.stat().st_size / 1024
            print(f"    OK {out_path.name} (~{words} words, {kb:.1f} KB)\n")
        except Exception as e:
            print(f"    FAIL: {e}\n", file=sys.stderr)
            return 1
        time.sleep(2)

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
