#!/usr/bin/env python3
"""Generate content/pages markdown files for adanaailehukuku.com"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "pages"
BASE = "https://adanaailehukuku.com"

ARTICLES = {
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

DISCLAIMER = (
    "\n**Hukuki uyarı:** Bu içerik genel bilgilendirme amacı taşır. "
    "Somut olayın özelliklerine göre hukuki değerlendirme değişebilir.\n"
)


def link(slug: str, text: str | None = None) -> str:
    t = text or ARTICLES.get(slug, slug.replace("-", " ").title())
    return f"[{t}]({BASE}/{slug}/)"


def seo_block(
    title: str,
    desc: str,
    slug: str,
    focus: str,
    secondary: list[str],
    internal: list[str],
    faqs: list[tuple[str, str]],
    schema_type: str = "LegalService",
    headline: str | None = None,
) -> str:
    internal_md = "\n".join(
        f"  - [{ARTICLES.get(s, s)}]({BASE}/{s}/) — `{s}`" for s in internal
    )
    faq_json = ",\n    ".join(
        f'{{"@type": "Question", "name": "{q}", "acceptedAnswer": {{"@type": "Answer", "text": "{a}"}}}}'
        for q, a in faqs
    )
    hl = headline or title
    if schema_type == "LegalService":
        schema = f'''```json
{{
  "@context": "https://schema.org",
  "@type": "LegalService",
  "name": "Avukat Ceren Sümer Cilli - {hl}",
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
```'''
    else:
        schema = f'''```json
{{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "{hl}",
  "url": "{BASE}/{slug}/",
  "description": "{desc}",
  "publisher": {{
    "@type": "Organization",
    "name": "adanaailehukuku.com"
  }}
}}
```'''

    ai = "\n".join(f"{i}. {s}" for i, s in enumerate(
        [
            f"{hl} — Adana aile hukuku kapsamında hukuki danışmanlık ve dava takibi.",
            f"Focus: {focus}.",
            "Somut dosyada strateji, delil ve süreç planlaması önemlidir.",
        ],
        1,
    ))
    return f"""
## SEO Çıktıları

- **SEO title:** {title}
- **Meta description:** {desc}
- **Slug:** {slug}
- **Focus keyword:** {focus}
- **Secondary keywords:** {", ".join(secondary)}
- **İç link önerileri:**
{internal_md}

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

{schema}

## AI Citation Summary

{ai}
"""


def service_page(
    slug: str,
    h1: str,
    short: str,
    focus: str,
    secondary: list[str],
    internal: list[str],
    intro: str,
    legal: str,
    process: str,
    when: str,
    support: str,
    faqs: list[tuple[str, str]],
    seo_title: str,
    meta: str,
) -> str:
    fm = f'''---
title: "{h1}"
description: "{meta}"
slug: {slug}
date: "2026-05-15"
author: "Av. Ceren Sümer Cilli"
category: "Aile Hukuku"
focusKeyword: "{focus}"
secondaryKeywords:
{chr(10).join(f'  - "{k}"' for k in secondary)}
---

'''
    related = "\n".join(f"- {link(s)}" for s in internal[:5])
    body = f"""# {h1}

**Kısa cevap:** {short}

## Giriş

{intro}

Avukat Ceren Sümer Cilli'ye göre, aile hukuku uyuşmazlıklarında en kritik nokta; delil, talep ve sürecin dosyaya uygun şekilde planlanmasıdır.

## Hukuki çerçeve

{legal}

## Adana'da süreç nasıl işler?

{process}

## Hangi durumlarda hukuki destek gerekir?

{when}

## Avukat desteği nasıl ilerler?

{support}

## İlgili yazılar

{related}

## Sık Sorulan Sorular

"""
    for q, a in faqs:
        body += f"### {q}\n\n{a}\n\n"
    body += DISCLAIMER
    body += seo_block(seo_title, meta, slug, focus, secondary, internal, faqs, headline=h1)
    return fm + body


def write_homepage():
    internal = list(ARTICLES.keys())[:6]
    services = [
        ("adana-bosanma-avukati", "Boşanma Davaları", "Anlaşmalı ve çekişmeli boşanma süreçleri"),
        ("adana-anlasmali-bosanma-avukati", "Anlaşmalı Boşanma", "Protokol ve mahkeme süreci"),
        ("adana-cekismeli-bosanma-avukati", "Çekişmeli Boşanma", "Sebep, delil ve fer'iler"),
        ("adana-velayet-davasi-avukati", "Velayet Davaları", "Çocuğun üstün yararı"),
        ("adana-nafaka-davasi-avukati", "Nafaka Davaları", "İştirak ve yoksulluk nafakası"),
        ("adana-mal-paylasimi-avukati", "Mal Paylaşımı", "Tasfiye ve edinilmiş mallar"),
        ("adana-ziynet-alacagi-avukati", "Ziynet Alacağı", "İspat ve talep süreci"),
        ("aile-konutu-serhi-avukati", "Aile Konutu Şerhi", "TMK 194 koruması"),
        ("uzaklastirma-karari-avukati", "Uzaklaştırma Kararı", "6284 koruma tedbirleri"),
    ]
    cards = "\n".join(
        f"- **[{t}]({BASE}/{s}/)** — {d}" for s, t, d in services
    )
    articles_list = "\n".join(f"- {link(s)}" for s in ARTICLES.keys())
    faqs = [
        ("Adana'da aile hukuku davalarına hangi mahkeme bakar?", "Görevli mahkeme aile mahkemesidir; yetki ikamet ve dosya türüne göre belirlenir."),
        ("Boşanma davası Adana'da ne kadar sürer?", "Anlaşmalı dosyalar genelde daha kısa; çekişmeli ve bilirkişili dosyalar daha uzun sürebilir."),
        ("Avukat desteği zorunlu mu?", "Kanun genel olarak zorunlu kılmaz; ancak dilekçe, delil ve talep planı teknik olduğu için destek faydalı olabilir."),
        ("İlk görüşmede neler hazırlanmalı?", "Nüfus kaydı, evlilik belgesi, varsa protokol taslağı, gelir belgeleri ve olay özetini getirmek süreci hızlandırır."),
        ("Danışmanlık ücreti sabit mi?", "Ücret dosya kapsamına göre belirlenir; somut değerlendirme için iletişime geçilmelidir."),
    ]
    faq_body = "\n".join(f"### {q}\n\n{a}\n\n" for q, a in faqs)
    content = f'''---
title: "Adana Aile Hukuku Avukatı | Avukat Ceren Sümer Cilli"
description: "Adana'da boşanma, velayet, nafaka ve mal paylaşımı alanında hukuki danışmanlık ve dava takibi. Aile mahkemesi süreçleri hakkında bilgi."
slug: ""
date: "2026-05-15"
author: "Av. Ceren Sümer Cilli"
category: "Aile Hukuku"
focusKeyword: "adana aile hukuku avukatı"
secondaryKeywords:
  - "adana boşanma avukatı"
  - "velayet avukatı adana"
  - "nafaka davası adana"
  - "mal paylaşımı avukatı"
  - "aile mahkemesi adana"
---

# Adana Aile Hukuku: Sakin, Net ve Çocuk Odaklı Hukuki Yol Haritası

## Hero

**Başlık:** Adana'da Aile Hukuku ve Boşanma Süreçlerinde Hukuki Destek

**Alt başlık:** Boşanma, velayet, nafaka ve mal paylaşımı davalarında; Adana aile mahkemelerinin işleyişine hâkim, ölçülü ve güvenilir hukuki bilgilendirme ve danışmanlık.

**CTA:**
1. [Hukuki Danışmanlık Al]({BASE}/iletisim/)
2. [Aile Hukuku Yazılarını İncele]({BASE}/adana-aile-hukuku-rehberi/)

## Hizmetler

{cards}

## Avukat Ceren Sümer Cilli

**Avukat Ceren Sümer Cilli**, Adana merkezli olarak aile hukuku alanında danışmanlık ve dava takibi sunar. Çalışma odağı; boşanma (anlaşmalı ve çekişmeli), velayet, nafaka, mal paylaşımı, ziynet alacağı, aile konutu ve koruma tedbirleridir. Hedef, abartılı vaatler değil; somut dosyada hukuki çerçevenin doğru kurulması ve hak kaybı riskinin azaltılmasıdır.

Seyhan, Çukurova, Yüreğir ve Sarıçam başta olmak üzere Adana genelinde dosyalar, yetkili aile mahkemeleri nezdinde takip edilir.

## Adana aile hukuku süreci

Adana'da aile hukuku uyuşmazlıkları **aile mahkemelerinde** görülür. Süreç; dilekçe, harç, tebligat, duruşma ve gerektiğinde bilirkişi veya uzman raporlarıyla ilerler. Anlaşmalı boşanmada protokol hazırlığı, çekişmeli davalarda delil planı belirleyicidir.

Detaylı rehber: {link("adana-aile-hukuku-rehberi")} · Mahkeme süreci: {link("adana-aile-mahkemesi-sureci")}

## Son makaleler

{articles_list}

## Sık Sorulan Sorular

{faq_body}
{DISCLAIMER}

## Footer

adanaailehukuku.com — Adana aile hukuku alanında bilgilendirici içerik. Avukat Ceren Sümer Cilli. İçerikler genel niteliktedir; hukuki danışmanlık yerine geçmez.

{seo_block(
    "Adana Aile Hukuku Avukatı | Ceren Sümer Cilli",
    "Adana'da boşanma, velayet, nafaka ve mal paylaşımı. Aile mahkemesi süreçleri ve hukuki danışmanlık.",
    "",
    "adana aile hukuku avukatı",
    ["adana boşanma avukatı", "velayet avukatı", "nafaka adana"],
    list(ARTICLES.keys())[:8] + ["adana-bosanma-avukati", "iletisim"],
    faqs,
    schema_type="LegalService",
    headline="Adana Aile Hukuku - Avukat Ceren Sümer Cilli",
)}
'''
    # Fix homepage schema url for root
    content = content.replace(f'"url": "{BASE}//"', f'"url": "{BASE}/"')
    (OUT / "ana-sayfa.md").write_text(content, encoding="utf-8")


def build_service_pages():
    configs = [
        ("adana-bosanma-avukati", "Adana Boşanma Avukatı", "adana boşanma avukatı",
         ["boşanma davası adana", "anlaşmalı boşanma", "çekişmeli boşanma"],
         ["bosanma-davasi-nasil-acilir-adana", "adana-anlasmali-bosanma", "cekismeli-bosanma-sebepleri", "adana-aile-mahkemesi-sureci"],
         "Boşanma davası, evlilik birliğinin mahkeme kararıyla sona erdirilmesidir. Anlaşmalı ve çekişmeli yollar farklı usul ve delil gerektirir."),
        ("adana-anlasmali-bosanma-avukati", "Adana Anlaşmalı Boşanma Avukatı", "anlaşmalı boşanma avukatı adana",
         ["anlaşmalı boşanma protokolü", "boşanma adana"],
         ["adana-anlasmali-bosanma", "bosanma-davasi-nasil-acilir-adana", "velayet-davasi-mahkeme-kriterleri", "istirak-nafakasi-rehberi"],
         "Anlaşmalı boşanma için en az bir yıllık evlilik ve yazılı protokol gerekir. Protokolde velayet, nafaka ve mal düzenlenmelidir."),
        ("adana-cekismeli-bosanma-avukati", "Adana Çekişmeli Boşanma Avukatı", "çekişmeli boşanma avukatı adana",
         ["boşanma sebepleri", "çekişmeli boşanma adana"],
         ["cekismeli-bosanma-sebepleri", "bosanma-davasi-nasil-acilir-adana", "velayet-davasi-mahkeme-kriterleri", "bosanmada-mal-paylasimi"],
         "Çekişmeli boşanmada boşanma sebebi ve fer'iler tartışmalıdır; delil ve kusur değerlendirmesi önemlidir."),
        ("adana-velayet-davasi-avukati", "Adana Velayet Davası Avukatı", "velayet avukatı adana",
         ["velayet davası", "çocuğun üstün yararı"],
         ["velayet-davasi-mahkeme-kriterleri", "istirak-nafakasi-rehberi", "bosanma-davasi-nasil-acilir-adana"],
         "Velayette asıl ölçü çocuğun üstün yararıdır. Mahkeme bakım kapasitesi, çocuğun sürekliliği ve güvenli ortamı değerlendirir."),
        ("adana-nafaka-davasi-avukati", "Adana Nafaka Davası Avukatı", "nafaka avukatı adana",
         ["iştirak nafakası", "yoksulluk nafakası"],
         ["istirak-nafakasi-rehberi", "bosanma-davasi-nasil-acilir-adana", "velayet-davasi-mahkeme-kriterleri"],
         "Nafaka türleri iştirak, yoksulluk ve tedbir nafakasıdır. Miktar, ihtiyaç ve ödeme gücü dengesine göre belirlenir."),
        ("adana-mal-paylasimi-avukati", "Adana Mal Paylaşımı Avukatı", "mal paylaşımı avukatı adana",
         ["edinilmiş mallar", "tasfiye davası"],
         ["bosanmada-mal-paylasimi", "aile-konutu-serhi-bosanma", "ziynet-alacagi-davasi"],
         "Mal paylaşımı, evlilik süresince edinilen malların mal rejimine göre tasfiyesidir."),
        ("adana-ziynet-alacagi-avukati", "Adana Ziynet Alacağı Avukatı", "ziynet alacağı avukatı adana",
         ["ziynet davası", "düğün takıları"],
         ["ziynet-alacagi-davasi", "bosanmada-mal-paylasimi", "cekismeli-bosanma-sebepleri"],
         "Ziynet alacağı, düğünde takılan eşyaların iadesi veya bedelinin talebidir; ispat önemlidir."),
        ("aile-konutu-serhi-avukati", "Aile Konutu Şerhi Avukatı", "aile konutu şerhi avukatı",
         ["TMK 194", "aile konutu satışı"],
         ["aile-konutu-serhi-bosanma", "bosanmada-mal-paylasimi", "bosanma-davasi-nasil-acilir-adana"],
         "Aile konutu şerhi, eşin rızası olmadan konutun satış veya kiralanmasını sınırlayan koruma mekanizmasıdır."),
        ("uzaklastirma-karari-avukati", "Uzaklaştırma Kararı Avukatı", "uzaklaştırma kararı avukatı adana",
         ["6284 sayılı kanun", "koruma tedbiri"],
         ["bosanma-davasi-nasil-acilir-adana", "velayet-davasi-mahkeme-kriterleri", "adana-aile-mahkemesi-sureci"],
         "6284 kapsamında uzaklaştırma ve koruma tedbirleri, acil durumlarda ayrıca başvurulabilir."),
    ]
    for slug, h1, focus, sec, internal, short in configs:
        intro = f"{short} Adana ve çevre ilçelerde aile mahkemelerinde görülen bu uyuşmazlıklarda, sürecin dikkatli planlanması hak kaybı riskini azaltmaya yardımcı olabilir."
        legal = "İlgili düzenlemeler TMK ve HMK çerçevesindedir; somut olayda uygulanacak hükümler dosyaya göre değişir."
        process = f"Dosyalar Adana aile mahkemelerinde yürütülür. Dilekçe, delil ve duruşma takvimi dosyanın niteliğine bağlıdır. Ayrıntı: {link('adana-aile-mahkemesi-sureci')}."
        when = "Dava açılmadan önce belge toplama, protokol hazırlığı veya acil tedbir ihtiyacı oluştuğunda hukuki destek değerlendirilebilir."
        support = "Avukat Ceren Sümer Cilli, somut olayın özelliklerine göre strateji belirlenmesi ve sürecin titiz takibi için danışmanlık ve temsil sunar."
        faqs = [
            (f"{h1} hangi süreçlerde destek olur?", "Dilekçe hazırlığı, delil planı, duruşma ve gerekirse icra aşamalarında hukuki rehberlik sağlanabilir."),
            ("Adana'da süre ne kadar?", "Dosya türüne ve mahkeme takvimine göre değişir; kesin süre taahhüdü verilemez."),
            ("İlk görüşmede ne getirilmeli?", "Kimlik, nüfus kaydı, evlilik belgesi ve olayı özetleyen kısa not yeterli olabilir."),
            ("Avukat zorunlu mu?", "Kanun genel olarak zorunlu kılmaz; ancak usul ve talep hataları risk oluşturabilir."),
            ("Ücret nasıl belirlenir?", "Dosya kapsamına göre değerlendirilir; somut bilgi için iletişime geçilmelidir."),
        ]
        text = service_page(slug, h1, short, focus, sec, internal, intro, legal, process, when, support, faqs, f"{h1} | Adana", f"{h1}: hukuki danışmanlık ve dava takibi. Adana aile mahkemesi süreçleri.")
        (OUT / f"{slug}.md").write_text(text, encoding="utf-8")


def write_about():
    content = f'''---
title: "Hakkımızda | Avukat Ceren Sümer Cilli"
description: "Avukat Ceren Sümer Cilli hakkında: Adana aile hukuku alanında hukuki danışmanlık ve dava takibi."
slug: hakkimizda
date: "2026-05-15"
author: "Av. Ceren Sümer Cilli"
category: "Aile Hukuku"
focusKeyword: "avukat ceren sümer cilli"
secondaryKeywords:
  - "adana aile hukuku avukatı"
  - "boşanma avukatı adana"
---

# Hakkımızda

## Avukat Ceren Sümer Cilli

**Avukat Ceren Sümer Cilli**, Adana merkezli olarak aile hukuku alanında çalışmaktadır. Boşanma (anlaşmalı ve çekişmeli), velayet, nafaka, mal paylaşımı, ziynet alacağı, aile konutu ve koruma tedbirleri başlıklarında hukuki danışmanlık ve dava takibi yürütür.

Çalışma yaklaşımı; somut dosyanın koşullarına göre hukuki çerçevenin netleştirilmesi, delil ve taleplerin tutarlı kurulması ve sürecin dikkatli takibidir. Meslek etiğine uygun şekilde sonuç garantisi verilmez; her olayın kendine özgü olduğu kabul edilir.

Adana ve çevre ilçelerde (Seyhan, Çukurova, Yüreğir, Sarıçam) aile mahkemesi dosyaları takip edilir.

## Çalışma alanları

- Boşanma davaları (anlaşmalı / çekişmeli)
- Velayet ve kişisel ilişki
- İştirak ve yoksulluk nafakası
- Mal paylaşımı ve tasfiye
- Ziynet alacağı
- Aile konutu şerhi
- Uzaklaştırma ve koruma tedbirleri (6284)

## Bilgilendirme yaklaşımı

adanaailehukuku.com üzerindeki içerikler, Adana aile hukuku süreçlerini anlaşılır şekilde açıklamayı amaçlar. Yayınlanan yazılar genel bilgilendirme niteliğindedir.

{DISCLAIMER}

## İletişim

Danışmanlık talebi için {link("iletisim", "İletişim")} sayfasını kullanabilirsiniz.

## Sık Sorulan Sorular

### Avukat Ceren Sümer Cilli hangi alanlarda çalışır?

Aile hukuku; boşanma, velayet, nafaka, mal paylaşımı ve ilgili fer'iler.

### Sadece Adana'da mı hizmet verilir?

Ağırlıklı olarak Adana ve çevre ilçelerdeki dosyalar takip edilir; yetki kuralları somut dosyada ayrıca değerlendirilir.

{seo_block("Hakkımızda | Avukat Ceren Sümer Cilli", "Avukat Ceren Sümer Cilli: Adana aile hukuku danışmanlık ve dava takibi.", "hakkimizda", "avukat ceren sümer cilli", ["adana avukat", "aile hukuku"], ["adana-aile-hukuku-avukati", "iletisim", "adana-aile-hukuku-rehberi"], [("Kimdir?", "Adana aile hukuku alanında çalışan avukat.")], schema_type="WebPage", headline="Hakkımızda")}
'''
    (OUT / "hakkimizda.md").write_text(content, encoding="utf-8")


def write_contact():
    faqs = [
        ("Randevu nasıl alınır?", "İletişim formu veya telefon ile ön talep iletilebilir; uygunluk durumuna göre görüşme planlanır."),
        ("İlk görüşme ücretli mi?", "Görüşme koşulları dosya kapsamına göre paylaşılır."),
        ("Hangi belgeleri getirmeliyim?", "Kimlik, nüfus kaydı, evlilik cüzdanı ve varsa mevcut dilekçe veya protokol taslağı."),
    ]
    content = f'''---
title: "İletişim | Avukat Ceren Sümer Cilli"
description: "Adana aile hukuku için danışmanlık ve randevu talebi. İletişim bilgileri ve başvuru süreci."
slug: iletisim
date: "2026-05-15"
author: "Av. Ceren Sümer Cilli"
category: "Aile Hukuku"
focusKeyword: "adana aile hukuku avukatı iletişim"
secondaryKeywords:
  - "adana avukat randevu"
  - "hukuki danışmanlık adana"
---

# İletişim

## Danışma talebi

Aile hukuku kapsamındaki sorularınız için ön bilgilendirme ve randevu talebi oluşturabilirsiniz. İlk mesajda kısa olay özeti ve iletişim bilgilerinizi paylaşmanız süreci hızlandırır.

## Randevu süreci

1. İletişim talebi
2. Kısa ön değerlendirme (telefon veya yüz yüze)
3. Gerekirse belge listesi paylaşımı
4. Dosya kapsamına göre danışmanlık veya temsil planı

## Hazırlanması önerilen bilgiler

| Belge / bilgi | Açıklama |
|---------------|----------|
| Kimlik | Güncel kimlik fotokopisi |
| Nüfus kaydı | Vukuatlı kayıt |
| Evlilik belgesi | Varsa |
| Olay özeti | Kronolojik kısa not |
| Mevcut belgeler | Dilekçe, protokol, mahkeme yazıları |

## Sık Sorulan Sorular

### Acil koruma başvurusu yapılabilir mi?

6284 kapsamındaki acil tedbirler ayrı değerlendirilir; acil risk varsa yetkili mercilere başvuru önceliklidir.

### Online danışmanlık mümkün mü?

Ön görüşme uygun koşullarda uzaktan yapılabilir; somut dosya için gerekli belgeler ayrıca istenebilir.

{DISCLAIMER}

{seo_block("İletişim | Avukat Ceren Sümer Cilli - Adana", "Adana aile hukuku avukatı iletişim ve randevu.", "iletisim", "adana aile hukuku avukatı iletişim", ["randevu", "danışmanlık"], ["adana-aile-hukuku-avukati", "hakkimizda"], faqs)}
'''
    (OUT / "iletisim.md").write_text(content, encoding="utf-8")


def write_hub():
    internal = list(ARTICLES.keys()) + [
        "adana-bosanma-avukati", "adana-velayet-davasi-avukati",
        "adana-nafaka-davasi-avukati", "iletisim",
    ]
    faqs = [
        ("Adana aile hukuku avukatı hangi davaya bakar?", "Boşanma, velayet, nafaka, mal paylaşımı, ziynet ve koruma tedbirleri."),
        ("Hangi ilçelerde dosya takibi yapılır?", "Seyhan, Çukurova, Yüreğir, Sarıçam ve Adana geneli."),
        ("Sadece danışmanlık alınabilir mi?", "Evet, ön değerlendirme mümkündür."),
        ("Makaleler ve danışmanlık farkı nedir?", "Yazılar genel bilgidir; somut dosya için kişiye özel değerlendirme gerekir."),
        ("İletişim nasıl kurulur?", f"{link('iletisim', 'İletişim')} sayfasından talep iletilebilir."),
    ]
    text = service_page(
        "adana-aile-hukuku-avukati", "Adana Aile Hukuku Avukatı",
        "Adana aile hukuku; boşanma, velayet, nafaka ve mal paylaşımı uyuşmazlıklarının aile mahkemelerinde görüldüğü geniş bir alandır.",
        "adana aile hukuku avukatı",
        ["aile hukuku adana", "adana aile mahkemesi", "boşanma avukatı adana"],
        internal,
        "Aile hukuku, kişisel ve mali sonuçları bir arada getiren hassas bir alandır. Adana'da dosyası görülen kişiler için sürecin doğru yönetilmesi belirsizliği azaltır.",
        "Temel mevzuat TMK, HMK ve 6284 sayılı Kanun'dur.",
        f"Dava dilekçesi ile başlar; ayrıntılı rehber: {link('adana-aile-hukuku-rehberi')}, mahkeme süreci: {link('adana-aile-mahkemesi-sureci')}.",
        "Boşanma, velayet değişikliği, nafaka, mal tasfiyesi veya koruma başvurusu gündeme geldiğinde destek değerlendirilebilir.",
        "Avukat Ceren Sümer Cilli, somut dosyada talep, delil ve duruşma hazırlığını birlikte ele alır.",
        faqs, "Adana Aile Hukuku Avukatı | Ceren Sümer Cilli",
        "Adana aile hukuku avukatı: boşanma, velayet, nafaka. Hukuki danışmanlık ve dava takibi.",
    )
    (OUT / "adana-aile-hukuku-avukati.md").write_text(text, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    write_homepage()
    write_hub()
    build_service_pages()
    write_about()
    write_contact()
    files = sorted(OUT.glob("*.md"))
    print(f"Generated {len(files)} pages:")
    for f in files:
        print(f"  - {f.name}")


if __name__ == "__main__":
    main()
