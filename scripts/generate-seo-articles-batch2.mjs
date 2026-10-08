#!/usr/bin/env node
/**
 * Generate aile hukuku SEO makaleleri — Batch 2 (2500+ kelime, 8 SSS, schema).
 * Usage: node scripts/generate-seo-articles-batch2.mjs
 * Overwrite: FORCE=1 node scripts/generate-seo-articles-batch2.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'content', 'articles');
const ENV_PATH = join(ROOT, '.env');
const SITE_URL = 'https://adanaailehukuku.com';
const MIN_WORDS = 2500;
const CTA =
  "Adana'da boşanma, velayet, nafaka ve mal paylaşımı davaları hakkında hukuki destek almak için bizimle iletişime geçebilirsiniz.";

const LEGAL_DISCLAIMER =
  'Bu içerik genel bilgilendirme amacı taşır. Her somut olay kendi şartları içinde değerlendirilmelidir. Hak kaybı yaşamamak için aile hukuku alanında hukuki destek alınması önerilir.';

const EXPERT_BOX =
  "Bu içerik, Adana'da aile hukuku, boşanma, nafaka ve velayet süreçleri üzerine çalışan **Av. Ceren Sümer Cilli** tarafından genel bilgilendirme amacıyla hazırlanmıştır.";

const INTERNAL_LINKS = [
  { label: 'Adana Boşanma Avukatı', href: '/adana-bosanma-avukati/' },
  { label: 'Adana Çekişmeli Boşanma Avukatı', href: '/adana-cekismeli-bosanma-avukati/' },
  { label: 'Adana Anlaşmalı Boşanma Avukatı', href: '/adana-anlasmali-bosanma-avukati/' },
  { label: 'Adana Velayet Davası Avukatı', href: '/adana-velayet-davasi-avukati/' },
  { label: 'Adana Nafaka Davası Avukatı', href: '/adana-nafaka-davasi-avukati/' },
  { label: 'Adana Mal Paylaşımı Avukatı', href: '/adana-mal-paylasimi-avukati/' },
  { label: "Adana'da Boşanma Davası Nasıl Açılır?", href: '/makaleler/adanada-bosanma-davasi-nasil-acilir/' },
  { label: 'Çekişmeli Boşanma Sebepleri', href: '/makaleler/cekismeli-bosanma-sebepleri/' },
  { label: "Adana'da Velayet Davası", href: '/makaleler/adanada-velayet-davasi-ve-cocugun-ustun-yarari/' },
  { label: "Adana'da Nafaka Davası", href: '/makaleler/adanada-nafaka-davasi-ve-nafaka-artirim-sureci/' },
  { label: 'İştirak Nafakası Rehberi', href: '/makaleler/istirak-nafakasi-rehberi/' },
  { label: 'Adana Aile Mahkemesi Süreci', href: '/makaleler/adana-aile-mahkemesi-sureci/' },
  { label: 'Hakkımızda', href: '/hakkimizda/' },
  { label: 'İletişim', href: '/iletisim/' },
];

const ARTICLES = [
  {
    slug: 'cekismeli-bosanma-davasi-ne-kadar-surer',
    h1: 'Çekişmeli Boşanma Davası Ne Kadar Sürer? (2026 Rehberi)',
    seoTitle: 'Çekişmeli Boşanma Davası Ne Kadar Sürer? | 2026',
    metaDescription:
      'Çekişmeli boşanma davası ne kadar sürer? Celse sayısı, süreyi uzatan faktörler ve Adana aile mahkemesi uygulaması hakkında 2026 rehberi.',
    focusKeyword: 'çekişmeli boşanma davası ne kadar sürer',
    secondaryKeywords: [
      'çekişmeli boşanma süresi',
      'boşanma davası kaç celse sürer',
      'adana boşanma avukatı',
      'çekişmeli boşanma avukatı',
    ],
    practiceArea: 'Aile Hukuku, Boşanma Hukuku',
    featuredImagePrompt:
      'Professional Turkish family law concept: courtroom calendar and legal documents on a desk, soft natural light, Adana city courthouse atmosphere, muted blue and beige tones, editorial photography style, no text overlay',
    socialShareText:
      'Çekişmeli boşanma davası kaç ay sürer, kaç celse görülür? 2026 güncel rehber — süreyi etkileyen faktörler ve Adana uygulaması.',
    sections: [
      'Çekişmeli Boşanma Davası Nedir?',
      'Çekişmeli Boşanma Davası Ortalama Ne Kadar Sürer?',
      'Boşanma Davası Kaç Celse Sürer?',
      'Süreci Uzatan ve Kısaltan Faktörler',
      'Anlaşmalı Boşanma ile Süre Farkı',
      'Adana Aile Mahkemelerinde Çekişmeli Boşanma Süreci',
      'Dava Açılmadan Önce Yapılması Gerekenler',
      'Çekişmeli Boşanmada Delil ve Tanık Süreci',
      'Nafaka, Velayet ve Mal Paylaşımının Sürece Etkisi',
      'Sonuç ve Hukuki Destek',
    ],
    faqQuestions: [
      'Çekişmeli boşanma davası ortalama kaç ay sürer?',
      'Boşanma davası kaç celse sürer?',
      'Anlaşmalı boşanma çekişmeli boşanmadan ne kadar hızlıdır?',
      'Taraflar anlaşırsa dava yarıda bitebilir mi?',
      'Adana\'da çekişmeli boşanma süresi diğer illere göre farklı mı?',
      'Delil toplama süreci davanın süresini uzatır mı?',
      'İlk duruşmada boşanma kararı verilir mi?',
      'Avukat desteği çekişmeli boşanma süresini kısaltır mı?',
    ],
    relevantLinks: [
      '/adana-cekismeli-bosanma-avukati/',
      '/adana-bosanma-avukati/',
      '/makaleler/cekismeli-bosanma-sebepleri/',
      '/makaleler/adanada-bosanma-davasi-nasil-acilir/',
      '/makaleler/adana-aile-mahkemesi-sureci/',
    ],
  },
  {
    slug: 'aldatma-nedeniyle-bosanma-davasi',
    h1: 'Aldatma Nedeniyle Boşanma Davası Nasıl Açılır?',
    seoTitle: 'Aldatma Nedeniyle Boşanma Davası Nasıl Açılır?',
    metaDescription:
      'Aldatma nedeniyle boşanma davası nasıl açılır? Zina ispatı, deliller, mesaj kayıtları ve Adana aile mahkemesi süreci hakkında rehber.',
    focusKeyword: 'aldatma nedeniyle boşanma',
    secondaryKeywords: [
      'zina nedeniyle boşanma',
      'sadakatsizlik nedeniyle boşanma',
      'aldatma ispatı',
      'boşanmada mesaj kayıtları delil olur mu',
    ],
    practiceArea: 'Aile Hukuku, Boşanma Hukuku',
    featuredImagePrompt:
      'Abstract legal theme: sealed envelope and smartphone on marble surface symbolizing evidence in divorce, dignified and professional, warm neutral tones, shallow depth of field, no faces, no text',
    socialShareText:
      'Aldatma nedeniyle boşanma davası nasıl açılır? Zina ispatı, mesaj kayıtları ve delil süreci — güncel aile hukuku rehberi.',
    sections: [
      'Aldatma (Zina) Boşanma Sebebi Olarak',
      'TMK Kapsamında Zina ve Sadakatsizlik Ayrımı',
      'Aldatma Nedeniyle Boşanma Davası Nasıl Açılır?',
      'Aldatma İspatında Hangi Deliller Kullanılır?',
      'Mesaj Kayıtları ve Dijital Deliller',
      'Tanık Beyanlarının Önemi ve Sınırları',
      'Aldatma Davasında Kusur ve Tazminat',
      'Nafaka ve Velayete Etkisi',
      'Adana Aile Mahkemelerinde Aldatma Davaları',
      'Sonuç ve Hukuki Destek',
    ],
    faqQuestions: [
      'Aldatma nedeniyle boşanma davası nasıl açılır?',
      'Zina ispatı için hangi deliller yeterlidir?',
      'WhatsApp mesajları boşanmada delil sayılır mı?',
      'Tek seferlik aldatma boşanma sebebi midir?',
      'Aldatan eş tazminat öder mi?',
      'Aldatma iddiasında tanık zorunlu mudur?',
      'Aldatma davası ne kadar sürer?',
      'Adana\'da aldatma nedeniyle boşanma avukatı gerekli mi?',
    ],
    relevantLinks: [
      '/adana-cekismeli-bosanma-avukati/',
      '/adana-bosanma-avukati/',
      '/makaleler/cekismeli-bosanma-sebepleri/',
      '/makaleler/adanada-bosanma-davasi-nasil-acilir/',
      '/adana-nafaka-davasi-avukati/',
    ],
  },
  {
    slug: 'velayet-davasinda-hakim-neye-dikkat-eder',
    h1: 'Velayet Davalarında Hakim Neye Dikkat Eder?',
    seoTitle: 'Velayet Davasında Hakim Neye Dikkat Eder?',
    metaDescription:
      'Velayet davasında hakim neye dikkat eder? Çocuğun üstün yararı, velayet kriterleri, sosyal inceleme ve Adana uygulaması rehberi.',
    focusKeyword: 'velayet davasında hakim neye dikkat eder',
    secondaryKeywords: [
      'çocuğun üstün yararı',
      'velayet kriterleri',
      'velayet nasıl alınır',
      'velayet davası',
    ],
    practiceArea: 'Aile Hukuku, Velayet',
    featuredImagePrompt:
      'Warm professional image: judge gavel beside children drawing and family photo frame on wooden desk, soft daylight, empathetic legal context, no identifiable people, editorial style',
    socialShareText:
      'Velayet davasında hakim hangi kriterlere bakar? Çocuğun üstün yararı, sosyal inceleme ve velayet nasıl alınır — detaylı rehber.',
    sections: [
      'Velayet Davasında Temel İlke: Çocuğun Üstün Yararı',
      'Hakimin Değerlendirdiği Velayet Kriterleri',
      'Çocuğun Yaşı ve Görüşünün Etkisi',
      'Ebeveynlerin Bakım Kapasitesi ve Yaşam Koşulları',
      'Ekonomik Durum Tek Başına Belirleyici midir?',
      'Sosyal İnceleme Raporu Nedir?',
      'Geçici Velayet ve Kişisel İlişki Düzenlemesi',
      'Kardeşlerin Birlikte Kalması İlkesi',
      'Adana Aile Mahkemelerinde Velayet Uygulaması',
      'Sonuç ve Hukuki Destek',
    ],
    faqQuestions: [
      'Velayet davasında hakim neye dikkat eder?',
      'Çocuğun üstün yararı ne demektir?',
      'Velayet her zaman anneye mi verilir?',
      'Baba velayet alabilir mi, hangi şartlarda?',
      'Sosyal inceleme raporu nasıl hazırlanır?',
      'Çocuğun yaşı velayet kararını etkiler mi?',
      'Velayet kararına itiraz edilebilir mi?',
      'Adana\'da velayet davası ne kadar sürer?',
    ],
    relevantLinks: [
      '/adana-velayet-davasi-avukati/',
      '/makaleler/adanada-velayet-davasi-ve-cocugun-ustun-yarari/',
      '/adana-bosanma-avukati/',
      '/makaleler/adanada-bosanma-davasi-nasil-acilir/',
      '/adana-nafaka-davasi-avukati/',
    ],
  },
  {
    slug: 'nafaka-nasil-hesaplanir',
    h1: 'Nafaka Nasıl Hesaplanır?',
    seoTitle: 'Nafaka Nasıl Hesaplanır? | İştirak ve Yoksulluk',
    metaDescription:
      'Nafaka nasıl hesaplanır? İştirak nafakası, yoksulluk nafakası, nafaka miktarı belirleme kriterleri ve Adana aile mahkemesi uygulaması.',
    focusKeyword: 'nafaka nasıl hesaplanır',
    secondaryKeywords: [
      'iştirak nafakası',
      'yoksulluk nafakası',
      'nafaka miktarı',
      'nafaka hesaplama',
    ],
    practiceArea: 'Aile Hukuku, Nafaka',
    featuredImagePrompt:
      'Clean financial legal concept: calculator, Turkish lira notes and court document on desk, professional office setting, cool blue tones, balanced composition, no text',
    socialShareText:
      'Nafaka nasıl hesaplanır? İştirak ve yoksulluk nafakası miktarı, artırım ve güncel Yargıtay yaklaşımı — pratik rehber.',
    sections: [
      'Nafaka Türleri ve Hukuki Dayanak',
      'İştirak Nafakası Nasıl Hesaplanır?',
      'Yoksulluk Nafakası Nasıl Hesaplanır?',
      'Tedbir Nafakası ve Geçici Dönem',
      'Nafaka Miktarını Belirleyen Kriterler',
      'Gelir, Gider ve Yaşam Standardı Analizi',
      'Nafaka Artırım ve Azaltım Davaları',
      'AYM Kararları ve Güncel Yargıtay Yaklaşımı',
      "Adana'da Nafaka Davalarında Uygulama",
      'Sonuç ve Hukuki Destek',
    ],
    faqQuestions: [
      'Nafaka nasıl hesaplanır, sabit bir formül var mı?',
      'İştirak nafakası neye göre belirlenir?',
      'Yoksulluk nafakası hangi şartlarda verilir?',
      'Çalışan eş yoksulluk nafakası alabilir mi?',
      'Nafaka miktarı ne kadar artırılabilir?',
      'Tedbir nafakası ile kesin nafaka arasındaki fark nedir?',
      'Nafaka ne zaman sona erer?',
      'Adana\'da nafaka davası ne kadar sürer?',
    ],
    relevantLinks: [
      '/adana-nafaka-davasi-avukati/',
      '/makaleler/adanada-nafaka-davasi-ve-nafaka-artirim-sureci/',
      '/makaleler/istirak-nafakasi-rehberi/',
      '/makaleler/aym-suresiz-nafaka-duzenlemesini-iptal-etti/',
      '/adana-bosanma-avukati/',
    ],
  },
  {
    slug: 'bosanmada-mal-paylasimi',
    h1: 'Boşanmada Mal Paylaşımı Nasıl Yapılır?',
    seoTitle: 'Boşanmada Mal Paylaşımı Nasıl Yapılır? | 2026',
    metaDescription:
      'Boşanmada mal paylaşımı nasıl yapılır? Edinilmiş mallara katılma, ev ve araba paylaşımı, mal rejimi tasfiyesi ve Adana süreci.',
    focusKeyword: 'boşanmada mal paylaşımı',
    secondaryKeywords: [
      'edinilmiş mallara katılma rejimi',
      'ev boşanmada kime kalır',
      'araba boşanmada nasıl paylaşılır',
      'mal rejimi tasfiyesi',
    ],
    practiceArea: 'Aile Hukuku, Mal Rejimi',
    featuredImagePrompt:
      'Real estate and legal theme: house keys, car key and property deed folder on table, professional divorce asset division concept, warm neutral palette, no text overlay',
    socialShareText:
      'Boşanmada mal paylaşımı nasıl yapılır? Ev, araba ve edinilmiş mallara katılma rejimi tasfiyesi — güncel aile hukuku rehberi.',
    sections: [
      'Boşanmada Mal Paylaşımının Hukuki Çerçevesi',
      'Edinilmiş Mallara Katılma Rejimi Nedir?',
      'Kişisel Mallar ile Edinilmiş Malların Ayrımı',
      'Mal Rejimi Tasfiyesi Nasıl Yapılır?',
      'Ev Boşanmada Kime Kalır?',
      'Araba ve Taşıt Boşanmada Nasıl Paylaşılır?',
      'Banka Hesapları, Birikimler ve Borçlar',
      'Ziynet Eşyaları ve Aile Konutu Şerhi',
      "Adana'da Mal Paylaşımı Davası Süreci",
      'Sonuç ve Hukuki Destek',
    ],
    faqQuestions: [
      'Boşanmada mal paylaşımı nasıl yapılır?',
      'Edinilmiş mallara katılma rejimi ne demektir?',
      'Ev boşanmada kime kalır, tek başına tapu yeterli mi?',
      'Araba boşanmada nasıl paylaşılır?',
      'Evlilik öncesi alınan mallar paylaşılır mı?',
      'Mal paylaşımı davası ne zaman açılır?',
      'Mal rejimi tasfiyesi ne kadar sürer?',
      'Adana\'da mal paylaşımı avukatı neden önemlidir?',
    ],
    relevantLinks: [
      '/adana-mal-paylasimi-avukati/',
      '/adana-ziynet-alacagi-avukati/',
      '/aile-konutu-serhi-avukati/',
      '/adana-bosanma-avukati/',
      '/makaleler/aile-konutu-serhi-bosanma/',
    ],
  },
];

const SYSTEM = `Sen kıdemli Türk aile hukuku editörüsün. Site: adanaailehukuku.com — Avukat Ceren Sümer Cilli.

KURALLAR:
- Türkçe, profesyonel, sade, güven verici, doğal insan dili
- EN AZ 2500 kelime (kısa yazma, her H2 bölümü detaylı olsun)
- H1 bir kez, H2 ana bölümler, H3 alt detaylar — tam SEO yapısı
- Focus keyword ilk 100 kelime içinde doğal geçmeli
- "Av. Ceren Sümer Cilli" veya "Avukat Ceren Sümer Cilli" 3-5 kez doğal geçsin
- Adana aile mahkemeleri bağlamı ekle
- TMK, Yargıtay ve güncel uygulama — hukuki doğruluk
- Temkinli ifadeler: somut olaya göre değişebilir
- YASAK: en iyi avukat, garantili sonuç, kesin kazanılır, lider avukat
- Anahtar kelime doldurma yok
- Markdown tablo kullanma
- İç linkler markdown formatında tam URL ile (en az 5 link gövdede):
${INTERNAL_LINKS.map((l) => `  ${SITE_URL}${l.href.startsWith('/makaleler') ? l.href : l.href}`).join('\n')}`;

function loadEnv() {
  const env = {};
  if (!existsSync(ENV_PATH)) return env;
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function getApiKey(env) {
  return env.GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function isGoogleSearchEnabled(env = {}) {
  return (
    env.GEMINI_GOOGLE_SEARCH_ENABLED === 'true' ||
    process.env.GEMINI_GOOGLE_SEARCH_ENABLED === 'true' ||
    env.GEMINI_ENABLE_SEARCH_GROUNDING === 'true' ||
    process.env.GEMINI_ENABLE_SEARCH_GROUNDING === 'true'
  );
}

function extractGroundingMetadata(data) {
  const gm = data?.candidates?.[0]?.groundingMetadata;
  if (!gm) return null;
  const sources = (gm.groundingChunks || [])
    .map((chunk) => ({
      title: chunk.web?.title || chunk.retrievedContext?.title || null,
      url: chunk.web?.uri || chunk.retrievedContext?.uri || null,
    }))
    .filter((source) => source.url);
  return {
    sources,
    webSearchQueries: gm.webSearchQueries || [],
    groundingSupports: gm.groundingSupports || [],
  };
}

function appendSourcesSection(markdown, grounding) {
  if (!grounding?.sources?.length) return markdown;
  const lines = grounding.sources.map((s, i) => `- [${s.title || `Kaynak ${i + 1}`}](${s.url})`);
  return `${markdown.trim()}\n\n## Kaynaklar\n\n${lines.join('\n')}\n`;
}

async function callGemini(apiKey, model, userPrompt, maxTokens = 16384, env = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.45, maxOutputTokens: maxTokens },
  };
  if (isGoogleSearchEnabled(env)) {
    body.tools = [{ google_search: {} }];
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('')?.trim();
  if (!text) throw new Error('Empty Gemini response');
  return appendSourcesSection(text, extractGroundingMetadata(data));
}

function buildBodyPrompt(article) {
  const linkHints = article.relevantLinks
    .map((p) => {
      const full = p.startsWith('http') ? p : `${SITE_URL}${p}`;
      return `- ${full}`;
    })
    .join('\n');

  return `Makale gövdesini yaz (meta/JSON-LD HARİÇ — bunları sen yazma).

H1: ${article.h1}
Focus keyword: ${article.focusKeyword}
Secondary: ${article.secondaryKeywords.join(', ')}
Slug: ${article.slug}

ÖNEMLİ: Focus keyword "${article.focusKeyword}" ilk paragrafta (ilk 100 kelime içinde) doğal geçmeli.

Önce şu kutu metnini blockquote olarak ekle:
> ${EXPERT_BOX}

Sonra:
# ${article.h1}

Giriş paragrafı (focus keyword içermeli, 150-200 kelime)

Şu H2 bölümlerini sırayla yaz (her bölüm en az 200 kelime, en az bir H3 alt başlık):
${article.sections.map((s) => `- ## ${s}`).join('\n')}

"Sonuç ve Hukuki Destek" bölümünde:
- Özet ve harekete geçirici çağrı
- Şu CTA cümlesini aynen kullan: "${CTA}"
- [İletişim](${SITE_URL}/iletisim/) sayfasına link ver

## Sık Sorulan Sorular
${article.faqQuestions.map((q) => `- ### ${q}`).join('\n')}
(Her soruya 80-120 kelimelik net cevap paragrafı — toplam 8 soru)

Son satır:
**Hukuki uyarı:** ${LEGAL_DISCLAIMER}

Gövdede en az 5 iç link kullan (aşağıdakilerden uygun olanlar):
${linkHints}

EN AZ 2500 kelime. Hukuki detay, örnek senaryo, TMK maddeleri (madde numarasıyla), Yargıtay yaklaşımı ekle.`;
}

function sanitizeFaqQuestionName(name) {
  return String(name || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*•]\s+/, '')
    .trim();
}

function extractFaqPairs(body) {
  const start = body.indexOf('## Sık Sorulan Sorular');
  if (start < 0) return [];
  let end = body.length;
  for (const marker of ['**Hukuki uyarı', '## SEO Çıktıları', '\n---\n']) {
    const idx = body.indexOf(marker, start);
    if (idx >= 0) end = Math.min(end, idx);
  }
  const section = body.slice(start, end);
  return section
    .split(/\n### /)
    .slice(1)
    .map((block) => {
      const nl = block.indexOf('\n');
      const q = (nl >= 0 ? block.slice(0, nl) : block).trim();
      const a = (nl >= 0 ? block.slice(nl + 1) : '').trim().replace(/\s+/g, ' ');
      return { q, a };
    })
    .filter((p) => p.q && p.a);
}

function buildBreadcrumbSchema(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Makaleler', item: `${SITE_URL}/makaleler/` },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.h1,
        item: `${SITE_URL}/makaleler/${article.slug}/`,
      },
    ],
  };
}

function buildMetaSection(article, faqPairs) {
  const today = new Date().toISOString().slice(0, 10);
  const pageUrl = `${SITE_URL}/makaleler/${article.slug}/`;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqPairs.map(({ q, a }) => ({
      '@type': 'Question',
      name: sanitizeFaqQuestionName(q),
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.seoTitle,
    description: article.metaDescription,
    author: { '@type': 'Person', name: 'Av. Ceren Sümer Cilli' },
    publisher: {
      '@type': 'Organization',
      name: 'adanaailehukuku.com',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-default.svg` },
    },
    datePublished: today,
    dateModified: today,
    image: `${SITE_URL}/og/article-default.svg`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    about: [{ '@type': 'Thing', name: article.practiceArea }],
  };

  const breadcrumbSchema = buildBreadcrumbSchema(article);

  const internalLinksMarkdown = article.relevantLinks
    .map((p) => {
      const href = p.startsWith('http') ? p : `${SITE_URL}${p}`;
      const slug = p.replace(/^\//, '').replace(/\/$/, '');
      return `- [${slug}](${href})`;
    })
    .join('\n  ');

  return `## SEO Çıktıları

- **SEO title:** ${article.seoTitle}
- **Meta description:** ${article.metaDescription}
- **Slug:** ${article.slug}
- **Focus keyword:** ${article.focusKeyword}
- **Secondary keywords:** ${article.secondaryKeywords.join(', ')}
- **Featured image prompt:** ${article.featuredImagePrompt}
- **Sosyal medya paylaşım metni:** ${article.socialShareText}
- **İç link önerileri:**
  ${internalLinksMarkdown}

## FAQ Schema JSON-LD

\`\`\`json
${JSON.stringify(faqSchema, null, 2)}
\`\`\`

## Article Schema JSON-LD

\`\`\`json
${JSON.stringify(articleSchema, null, 2)}
\`\`\`

## Breadcrumb Schema JSON-LD

\`\`\`json
${JSON.stringify(breadcrumbSchema, null, 2)}
\`\`\`

## AI Citation Summary

1. ${article.h1} konusunda güncel Türk aile hukuku ve Adana uygulamasına yönelik kapsamlı bilgilendirme sunar.
2. Focus keyword "${article.focusKeyword}" etrafında yapılandırılmış, en az 8 SSS ve schema içerir.
3. Av. Ceren Sümer Cilli tarafından hazırlanan içerik genel bilgilendirme niteliğindedir; somut olay için hukuki destek önerilir.`;
}

function buildFrontmatter(article) {
  const today = new Date().toISOString().slice(0, 10);
  const tagsYaml = article.secondaryKeywords.map((t) => `  - "${t}"`).join('\n');
  return `---
title: "${article.seoTitle}"
description: "${article.metaDescription}"
slug: ${article.slug}
date: "${today}"
author: "Av. Ceren Sümer Cilli"
reviewer: "Av. Ceren Sümer Cilli"
category: "Aile Hukuku"
focusKeyword: "${article.focusKeyword}"
practiceArea: "${article.practiceArea}"
location: "Adana"
secondaryKeywords:
${tagsYaml}
---

`;
}

async function generateArticleBody(apiKey, model, article) {
  let body = await callGemini(apiKey, model, buildBodyPrompt(article), 16384, env);
  let words = countWords(body);

  if (words < MIN_WORDS) {
    console.log(`  Kelime sayısı ${words} — genişletme isteniyor...`);
    const expandPrompt = `Aşağıdaki makaleyi genişlet. EN AZ ${MIN_WORDS} kelime olmalı. Yeni H2/H3 ekleme, mevcut bölümleri detaylandır. Focus keyword koru. Meta/JSON ekleme.

${body}`;
    body = await callGemini(apiKey, model, expandPrompt, 16384, env);
    words = countWords(body);
    console.log(`  Genişletme sonrası: ${words} kelime`);
  }

  return body;
}

async function generateArticle(apiKey, model, article) {
  const body = await generateArticleBody(apiKey, model, article);
  let faqPairs = extractFaqPairs(body);

  if (faqPairs.length < 8) {
    const missing = article.faqQuestions.filter((q) => !faqPairs.some((p) => p.q.includes(q.slice(0, 20))));
    if (missing.length) {
      console.log(`  FAQ eksik (${faqPairs.length}/8) — tamamlanıyor...`);
      for (const q of article.faqQuestions) {
        if (!faqPairs.find((p) => p.q === q || p.q.includes(q.slice(0, 15)))) {
          faqPairs.push({ q, a: `${q} sorusu somut olayın koşullarına göre değişir; Adana aile mahkemelerinde delil, gelir ve çocuğun üstün yararı gibi kriterler birlikte değerlendirilir. Detaylı değerlendirme için hukuki destek alınması önerilir.` });
        }
      }
      faqPairs = faqPairs.slice(0, 8);
    }
  }

  const meta = buildMetaSection(article, faqPairs.slice(0, 8));
  return { content: body + '\n\n' + meta, words: countWords(body), faqCount: faqPairs.length };
}

async function main() {
  const env = loadEnv();
  const apiKey = getApiKey(env);
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const force = process.env.FORCE === '1';

  if (!apiKey) {
    console.error('HATA: GEMINI_API_KEY .env içinde bulunamadı.');
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Model: ${model} | Makale: ${ARTICLES.length} | Min kelime: ${MIN_WORDS}\n`);

  const report = [];

  for (const article of ARTICLES) {
    const outPath = join(OUTPUT_DIR, `${article.slug}.md`);
    if (existsSync(outPath) && !force) {
      console.warn(`ATLA (mevcut): ${article.slug}.md — FORCE=1 ile üzerine yaz`);
      continue;
    }

    console.log(`Üretiliyor: ${article.h1}...`);
    try {
      const { content, words, faqCount } = await generateArticle(apiKey, model, article);
      writeFileSync(outPath, buildFrontmatter(article) + content, 'utf8');
      console.log(`  OK ${article.slug}.md (${words} kelime, ${faqCount} SSS)\n`);
      report.push({ slug: article.slug, words, faqCount, status: 'OK' });
    } catch (err) {
      console.error(`  HATA ${article.slug}: ${err.message}\n`);
      report.push({ slug: article.slug, status: 'HATA', error: err.message });
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('\n=== RAPOR ===');
  for (const r of report) {
    console.log(`${r.slug}: ${r.status}${r.words ? ` — ${r.words} kelime, ${r.faqCount} SSS` : ''}${r.error ? ` — ${r.error}` : ''}`);
  }
  console.log('\nTamamlandı.');
}

main();
