#!/usr/bin/env python3
"""Enrich existing service pages in content/pages via Google Gemini API."""

from __future__ import annotations

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
PAGES_DIR = ROOT / "content" / "pages"
BASE = "https://adanaailehukuku.com"

ARTICLE_SLUGS = {
    "adana-aile-hukuku-rehberi": "Adana Aile Hukuku Rehberi",
    "adana-anlasmali-bosanma": "Anlaşmalı Boşanma Rehberi",
    "bosanma-davasi-nasil-acilir-adana": "Boşanma Davası Nasıl Açılır?",
    "velayet-davasi-mahkeme-kriterleri": "Velayet Davaları",
    "istirak-nafakasi-rehberi": "İştirak Nafakası",
    "bosanmada-mal-paylasimi": "Mal Paylaşımı",
    "adana-aile-mahkemesi-sureci": "Adana Aile Mahkemesi Süreci",
    "cekismeli-bosanma-sebepleri": "Çekişmeli Boşanma",
    "aile-konutu-serhi-bosanma": "Aile Konutu Şerhi",
    "ziynet-alacagi-davasi": "Ziynet Alacağı Davası",
}

SERVICE_SLUGS = {
    "adana-aile-hukuku-avukati": "Adana Aile Hukuku",
    "adana-bosanma-avukati": "Boşanma Davaları",
    "adana-anlasmali-bosanma-avukati": "Anlaşmalı Boşanma",
    "adana-cekismeli-bosanma-avukati": "Çekişmeli Boşanma",
    "adana-velayet-davasi-avukati": "Velayet Davaları",
    "adana-nafaka-davasi-avukati": "Nafaka Davaları",
    "adana-mal-paylasimi-avukati": "Mal Paylaşımı",
    "adana-ziynet-alacagi-avukati": "Ziynet Alacağı",
    "aile-konutu-serhi-avukati": "Aile Konutu Şerhi",
    "uzaklastirma-karari-avukati": "Uzaklaştırma Kararı",
}

SERVICES = [
    {
        "slug": "adana-aile-hukuku-avukati",
        "topic": "Adana Aile Hukuku",
        "h1": "Adana Aile Hukuku Avukatı",
        "focus_keyword": "adana aile hukuku avukatı",
        "service_links": [
            "adana-bosanma-avukati",
            "adana-velayet-davasi-avukati",
            "adana-nafaka-davasi-avukati",
            "adana-mal-paylasimi-avukati",
        ],
        "article_links": ["adana-aile-hukuku-rehberi", "adana-aile-mahkemesi-sureci"],
    },
    {
        "slug": "adana-bosanma-avukati",
        "topic": "Boşanma Davaları",
        "h1": "Adana Boşanma Avukatı",
        "focus_keyword": "adana boşanma avukatı",
        "service_links": [
            "adana-anlasmali-bosanma-avukati",
            "adana-cekismeli-bosanma-avukati",
            "adana-velayet-davasi-avukati",
            "adana-nafaka-davasi-avukati",
            "adana-mal-paylasimi-avukati",
        ],
        "article_links": [
            "bosanma-davasi-nasil-acilir-adana",
            "adana-anlasmali-bosanma",
            "cekismeli-bosanma-sebepleri",
        ],
    },
    {
        "slug": "adana-anlasmali-bosanma-avukati",
        "topic": "Anlaşmalı Boşanma",
        "h1": "Adana Anlaşmalı Boşanma Avukatı",
        "focus_keyword": "anlaşmalı boşanma avukatı adana",
        "service_links": ["adana-bosanma-avukati", "adana-cekismeli-bosanma-avukati"],
        "article_links": ["adana-anlasmali-bosanma", "bosanma-davasi-nasil-acilir-adana"],
    },
    {
        "slug": "adana-cekismeli-bosanma-avukati",
        "topic": "Çekişmeli Boşanma",
        "h1": "Adana Çekişmeli Boşanma Avukatı",
        "focus_keyword": "çekişmeli boşanma avukatı adana",
        "service_links": ["adana-bosanma-avukati", "adana-anlasmali-bosanma-avukati"],
        "article_links": ["cekismeli-bosanma-sebepleri", "bosanma-davasi-nasil-acilir-adana"],
    },
    {
        "slug": "adana-velayet-davasi-avukati",
        "topic": "Velayet Davaları",
        "h1": "Adana Velayet Davası Avukatı",
        "focus_keyword": "velayet avukatı adana",
        "service_links": [
            "adana-bosanma-avukati",
            "adana-nafaka-davasi-avukati",
        ],
        "article_links": ["velayet-davasi-mahkeme-kriterleri", "istirak-nafakasi-rehberi"],
    },
    {
        "slug": "adana-nafaka-davasi-avukati",
        "topic": "Nafaka Davaları",
        "h1": "Adana Nafaka Davası Avukatı",
        "focus_keyword": "nafaka avukatı adana",
        "service_links": [
            "adana-bosanma-avukati",
            "adana-velayet-davasi-avukati",
        ],
        "article_links": ["istirak-nafakasi-rehberi", "velayet-davasi-mahkeme-kriterleri"],
    },
    {
        "slug": "adana-mal-paylasimi-avukati",
        "topic": "Mal Paylaşımı",
        "h1": "Adana Mal Paylaşımı Avukatı",
        "focus_keyword": "mal paylaşımı avukatı adana",
        "service_links": [
            "adana-ziynet-alacagi-avukati",
            "aile-konutu-serhi-avukati",
            "adana-bosanma-avukati",
        ],
        "article_links": ["bosanmada-mal-paylasimi", "ziynet-alacagi-davasi"],
    },
    {
        "slug": "adana-ziynet-alacagi-avukati",
        "topic": "Ziynet Alacağı",
        "h1": "Adana Ziynet Alacağı Avukatı",
        "focus_keyword": "ziynet alacağı avukatı adana",
        "service_links": [
            "adana-mal-paylasimi-avukati",
            "adana-bosanma-avukati",
        ],
        "article_links": ["ziynet-alacagi-davasi", "bosanmada-mal-paylasimi"],
    },
    {
        "slug": "aile-konutu-serhi-avukati",
        "topic": "Aile Konutu Şerhi",
        "h1": "Aile Konutu Şerhi Avukatı",
        "focus_keyword": "aile konutu şerhi avukatı",
        "service_links": [
            "adana-mal-paylasimi-avukati",
            "adana-bosanma-avukati",
        ],
        "article_links": ["aile-konutu-serhi-bosanma", "bosanmada-mal-paylasimi"],
    },
    {
        "slug": "uzaklastirma-karari-avukati",
        "topic": "Uzaklaştırma Kararı",
        "h1": "Uzaklaştırma Kararı Avukatı",
        "focus_keyword": "uzaklaştırma kararı avukatı adana",
        "service_links": [
            "adana-aile-hukuku-avukati",
            "adana-bosanma-avukati",
        ],
        "article_links": ["adana-aile-hukuku-rehberi", "adana-aile-mahkemesi-sureci"],
    },
]

SYSTEM_INSTRUCTION = """Sen kıdemli Türk aile hukuku editörü ve SEO copywriter'sın.
Site: adanaailehukuku.com — Avukat Ceren Sümer Cilli, Adana aile hukuku.

KURALLAR:
- Türkçe, profesyonel, sakin, vatandaş odaklı
- Avukat Ceren Sümer Cilli 3-5 kez doğal geçsin
- Spam, keyword stuffing, "en iyi avukat", "garantili sonuç", "kesin kazanılır" YOK
- Sahte Yargıtay kararı, uydurma madde numarası, uydurma istatistik YOK
- TMK, HMK, 6284 sayılı Kanun genel atıflar olabilir
- Adana, Seyhan, Çukurova, Yüreğir, Sarıçam doğal geçsin
- Tablo kullanma"""

MIN_WORDS = 800
MAX_WORDS = 2400
MAX_BYTES = 90_000
BANNED = re.compile(
    r"en iyi avukat|garantili sonuç|kesin kazanılır|garanti edilir|%100|mutlaka kazanılır",
    re.I,
)


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if not ENV_PATH.exists():
        return env
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def get_api_key(env: dict[str, str]) -> str | None:
    return env.get("GEMINI_API_KEY") or env.get("GOOGLE_GEMINI_API_KEY")


def _google_search_enabled(env: dict) -> bool:
    return (
        env.get("GEMINI_GOOGLE_SEARCH_ENABLED") == "true"
        or env.get("GEMINI_ENABLE_SEARCH_GROUNDING") == "true"
        or os.environ.get("GEMINI_GOOGLE_SEARCH_ENABLED") == "true"
        or os.environ.get("GEMINI_ENABLE_SEARCH_GROUNDING") == "true"
    )


def _extract_grounding(data: dict):
    gm = (data.get("candidates") or [{}])[0].get("groundingMetadata")
    if not gm:
        return None
    sources = []
    for chunk in gm.get("groundingChunks") or []:
        web = chunk.get("web") or chunk.get("retrievedContext") or {}
        url = web.get("uri")
        if url:
            sources.append({"title": web.get("title"), "url": url})
    return {
        "sources": sources,
        "webSearchQueries": gm.get("webSearchQueries") or [],
        "groundingSupports": gm.get("groundingSupports") or [],
    }


def _append_sources(text: str, grounding) -> str:
    if not grounding or not grounding.get("sources"):
        return text
    lines = [
        f"- [{s.get('title') or f'Kaynak {i+1}'}]({s['url']})"
        for i, s in enumerate(grounding["sources"])
    ]
    return text.rstrip() + "\n\n## Kaynaklar\n\n" + "\n".join(lines) + "\n"


def service_url(slug: str) -> str:
    return f"{BASE}/{slug}/"


def article_url(slug: str) -> str:
    return f"{BASE}/makaleler/{slug}/"


def links_block(service: dict) -> str:
    lines = ["Zorunlu iç linkler (markdown formatında kullan):"]
    for s in service["service_links"]:
        lines.append(f"- Hizmet: [{SERVICE_SLUGS[s]}]({service_url(s)})")
    for a in service["article_links"]:
        lines.append(f"- Makale: [{ARTICLE_SLUGS[a]}]({article_url(a)})")
    lines.append(f"- İletişim: [İletişim]({BASE}/iletisim/)")
    return "\n".join(lines)


def parse_frontmatter(text: str) -> tuple[dict[str, str | list[str]], str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm_raw, body = parts[1], parts[2]
    fm: dict[str, str | list[str]] = {}
    current_key = None
    for line in fm_raw.splitlines():
        if line.strip().startswith("- ") and current_key:
            fm.setdefault(current_key, [])
            if isinstance(fm[current_key], list):
                fm[current_key].append(line.strip()[2:].strip('"'))
            continue
        if ":" in line:
            key, _, val = line.partition(":")
            current_key = key.strip()
            val = val.strip().strip('"')
            if val:
                fm[current_key] = val
            else:
                fm[current_key] = []
    return fm, body.lstrip("\n")


def build_frontmatter(
    fm: dict[str, str | list[str]],
    seo_title: str,
    meta_desc: str,
    focus: str,
    secondary: list[str],
) -> str:
    title = seo_title.split("|")[0].strip() if "|" in seo_title else seo_title
    if len(title) > 70:
        title = title[:67] + "..."
    desc = meta_desc[:160].strip()
    slug = str(fm.get("slug", ""))
    date = str(fm.get("date", "2026-05-15"))
    author = str(fm.get("author", "Av. Ceren Sümer Cilli"))
    category = str(fm.get("category", "Aile Hukuku"))
    sec = secondary or (fm.get("secondaryKeywords") if isinstance(fm.get("secondaryKeywords"), list) else [])
    if isinstance(sec, str):
        sec = [sec]
    sec_lines = "\n".join(f'  - "{s}"' for s in sec[:8])
    return f"""---
title: "{title}"
description: "{desc}"
slug: {slug}
date: "{date}"
author: "{author}"
category: "{category}"
focusKeyword: "{focus}"
secondaryKeywords:
{sec_lines}
---"""


def validate_body(content: str) -> tuple[bool, str]:
    words = len(re.findall(r"\w+", content, re.UNICODE))
    size = len(content.encode("utf-8"))
    if words < MIN_WORDS:
        return False, f"too short ({words} words, min {MIN_WORDS})"
    if words > MAX_WORDS + 200:
        return False, f"too long ({words} words)"
    if size > MAX_BYTES:
        return False, f"too large ({size} bytes)"
    if BANNED.search(content):
        return False, "banned marketing phrase"
    h1_count = len(re.findall(r"^# [^#\n]", content, re.MULTILINE))
    if h1_count != 1:
        return False, f"h1 count {h1_count} (expected 1)"
    if "Sık Sorulan" not in content and "SSS" not in content:
        return False, "missing FAQ"
    if len(re.findall(r"Avukat Ceren Sümer Cilli", content)) < 2:
        return False, "entity name too few"
    if "İlgili" not in content:
        return False, "missing related links section"
    return True, f"{words} words"


def call_gemini(
    api_key: str,
    model: str,
    user_prompt: str,
    temperature: float = 0.5,
    env: dict | None = None,
) -> str:
    env = env or {}
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 16384},
    }
    if _google_search_enabled(env):
        body["tools"] = [{"google_search": {}}]
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
    return _append_sources(text, _extract_grounding(data))


PROMPT_BODY = """Mevcut HİZMET sayfası gövdesini yaz (SEO/schema bölümleri HARİÇ).

Konu: {topic}
H1 (sayfada tek kez): {h1}
Focus keyword: {focus_keyword}
Sayfa slug (değiştirme): {slug}

{links}

YAPI (markdown):
# {h1}

**Kısa cevap:** 2-4 cümle

## Giriş
(güven veren, bilgilendirici; Avukat Ceren Sümer Cilli doğal geçsin)

## Bu süreç nedir?

## Kimler başvurabilir?

## Gerekli belgeler nelerdir?
(madde listesi)

## Mahkeme süreci nasıl işler?

## Adana aile mahkemelerinde süreç nasıl ilerler?
(Seyhan, Çukurova, Yüreğir, Sarıçam doğal)

## Avukat desteği neden önemlidir?

## Sık yapılan hatalar

## İlgili hizmetler ve yazılar
(yukarıdaki zorunlu linkleri kullan)

## Sık Sorulan Sorular
(5-7 adet ### soru + kısa net cevap)

Son paragraf (CTA, yumuşak):
Adana'da aile hukuku süreciniz hakkında hukuki değerlendirme almak için [iletişim sayfasından]({contact}) randevu talebi oluşturabilirsiniz.

**Hukuki uyarı:** Bu içerik genel bilgilendirme amacıyla hazırlanmıştır. Somut olayın özelliklerine göre hukuki değerlendirme değişebilir.

800-1200 kelime. Tekrar yok. Reklam dili yok."""

PROMPT_META = """Aşağıdaki hizmet sayfası için SADECE meta bölümünü yaz.

Konu: {topic}
Slug: {slug}
Focus: {focus_keyword}
H1: {h1}

## SEO Çıktıları
- **SEO title:** (max 60 karakter, örn: "Adana Boşanma Davaları | Aile Hukuku Süreçleri")
- **Meta description:** (140-160 karakter)
- **Slug:** {slug}
- **Focus keyword:**
- **Secondary keywords:** (5-7)
- **İç link önerileri:** (mevcut sluglar, markdown link)

## FAQ Schema JSON-LD
(geçerli JSON, 5-7 soru — gövdedeki SSS ile uyumlu)

## Schema JSON-LD
(LegalService, provider: Avukat Ceren Sümer Cilli, url: {page_url})

## AI Citation Summary
(3 madde)"""


def extract_seo_fields(meta: str) -> tuple[str, str, list[str]]:
    seo_title = ""
    meta_desc = ""
    secondary: list[str] = []
    m = re.search(r"\*\*SEO title:\*\*\s*(.+)", meta, re.I)
    if m:
        seo_title = m.group(1).strip()
    m = re.search(r"\*\*Meta description:\*\*\s*(.+)", meta, re.I)
    if m:
        meta_desc = m.group(1).strip()
    in_sec = False
    for line in meta.splitlines():
        if "secondary keyword" in line.lower():
            in_sec = True
            continue
        if in_sec and line.strip().startswith("-"):
            secondary.append(re.sub(r"^\*\s*", "", line.strip().lstrip("- ").strip('"')))
        elif in_sec and line.startswith("##"):
            break
    return seo_title, meta_desc, secondary


def generate_service(
    api_key: str, model: str, service: dict, existing_fm: dict, env: dict | None = None
) -> str:
    env = env or {}
    body_prompt = PROMPT_BODY.format(
        topic=service["topic"],
        h1=service["h1"],
        focus_keyword=service["focus_keyword"],
        slug=service["slug"],
        links=links_block(service),
        contact=f"{BASE}/iletisim/",
    )
    meta_prompt = PROMPT_META.format(
        topic=service["topic"],
        slug=service["slug"],
        focus_keyword=service["focus_keyword"],
        h1=service["h1"],
        page_url=service_url(service["slug"]),
    )

    reason = ""
    body = ""
    for attempt in range(4):
        body = call_gemini(
            api_key, model, body_prompt, temperature=0.45 + attempt * 0.05, env=env
        )
        ok, reason = validate_body(body)
        if ok:
            break
        body_prompt += f"\n\nDüzelt: {reason}. Tek H1, 800+ kelime, FAQ ve İlgili bölümü ekle."
        time.sleep(3)
    else:
        raise RuntimeError(f"Body validation failed: {reason}")

    meta = call_gemini(api_key, model, meta_prompt, temperature=0.3, env=env)
    seo_title, meta_desc, secondary = extract_seo_fields(meta)
    if not seo_title:
        seo_title = service["h1"]
    if not meta_desc:
        meta_desc = str(existing_fm.get("description", ""))[:160]

    fm_block = build_frontmatter(
        existing_fm,
        seo_title,
        meta_desc,
        service["focus_keyword"],
        secondary,
    )
    body_out = fm_block + "\n\n" + body.strip() + "\n"
    # QC meta şablonu fix-services-qc.py ile uygulanır
    return body_out


def main() -> int:
    env = load_env()
    api_key = get_api_key(env)
    model = env.get("GEMINI_MODEL", "gemini-2.5-flash")
    if not api_key:
        print("GEMINI_API_KEY veya GOOGLE_GEMINI_API_KEY .env içinde bulunamadı", file=sys.stderr)
        return 1

    only = os.environ.get("ONLY_SLUG")
    force = os.environ.get("FORCE") == "1"
    services = [s for s in SERVICES if not only or s["slug"] == only]

    print(f"Model: {model} | Services: {len(services)}\n")
    failures: list[str] = []

    for i, service in enumerate(services, 1):
        path = PAGES_DIR / f"{service['slug']}.md"
        if not path.exists():
            print(f"SKIP missing file: {path.name}")
            continue
        if path.exists() and not force and os.environ.get("SKIP_EXISTING") == "1":
            print(f"[{i}] SKIP {service['slug']}")
            continue

        print(f"[{i}/{len(services)}] {service['topic']}...")
        existing_fm, _ = parse_frontmatter(path.read_text(encoding="utf-8"))
        if not existing_fm.get("slug"):
            existing_fm["slug"] = service["slug"]

        try:
            content = generate_service(api_key, model, service, existing_fm, env)
            path.write_text(content, encoding="utf-8")
            words = len(re.findall(r"\w+", content, re.UNICODE))
            print(f"    OK {path.name} (~{words} words, {path.stat().st_size / 1024:.1f} KB)\n")
        except (urllib.error.HTTPError, RuntimeError, OSError) as e:
            print(f"    FAIL: {e}\n", file=sys.stderr)
            failures.append(service["slug"])
        time.sleep(2)

    if failures:
        print(f"Failed ({len(failures)}): {', '.join(failures)}", file=sys.stderr)
        return 1
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
