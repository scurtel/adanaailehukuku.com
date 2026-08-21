#!/usr/bin/env node
/**
 * Otomatik tek makale üretimi (GitHub Actions cron veya yerel).
 * Usage: node scripts/generate-article.mjs
 * Env: GEMINI_API_KEY, optional GEMINI_MODEL (default gemini-2.5-flash)
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  appendFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { TOPIC_POOL, FALLBACK_TOPIC_POOL } from './article-topics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES_DIR = join(ROOT, 'content', 'articles');
const PAGES_DIR = join(ROOT, 'content', 'pages');
const CONSTS_PATH = join(ROOT, 'src', 'consts.ts');
const REPORT_PATH = join(ROOT, '.auto-article-report.json');
const SITE_URL = 'https://adanaailehukuku.com';
const MAX_TOPIC_ATTEMPTS = 3;

const MIN_WORDS = 900;
const MAX_WORDS = 1200;
const MIN_FAQ = 5;

const LEGAL_DISCLAIMER =
  'Bu içerik genel bilgilendirme amaçlıdır. Somut olayın özelliklerine göre hukuki değerlendirme değişebilir.';

const EXPERT_BOX =
  "Bu içerik, Adana'da aile hukuku, boşanma, nafaka ve velayet süreçleri üzerine çalışan **Av. Ceren Sümer Cilli** tarafından genel bilgilendirme amacıyla hazırlanmıştır.";

const BANNED_PHRASES = [
  /en iyi avukat/i,
  /garanti\s*(sonuç|kazanç|başarı)/i,
  /kesin kazanılır/i,
  /kesin kazan/i,
  /en hızlı boşanma/i,
  /kesin çözüm/i,
  /mutlaka kazanılır/i,
  /lider avukat/i,
  /%100 başarı/i,
];

/** Common tokens that should not alone mark topics as duplicates. */
const TOPIC_STOPWORDS = new Set([
  'nedir',
  'nasil',
  'hangi',
  'icin',
  'veya',
  'ile',
  'olan',
  'olur',
  'eder',
  'davasi',
  'davalar',
  'hukuku',
  'hakkinda',
  'adana',
  'turkiye',
  'turkiyede',
  'sureci',
  'surec',
  'sartlari',
  'sartlar',
  'nelerdir',
  'ne',
  'mi',
  'mu',
  'midir',
  'mudur',
  'halinde',
  'sonrasi',
  'oncesi',
  'uzerine',
  'ilgili',
  'genel',
  'aile',
]);

const SYSTEM = `Sen kıdemli Türk aile hukuku editörüsün. Site: adanaailehukuku.com — Avukat Ceren Sümer Cilli.

KURALLAR:
- Türkçe, profesyonel, sade, güven verici
- Hukuki bilgi ver; kesin sonuç, garanti, kesin süre veya kesin kazanma vaadi verme
- YASAK ifadeler: en iyi avukat, garanti sonuç, kesin kazanılır, en hızlı boşanma, kesin çözüm, lider avukat
- "Av. Ceren Sümer Cilli" 2-3 kez doğal geçsin
- Adana aile mahkemeleri bağlamı
- Keyword stuffing yok
- Markdown tablo kullanma
- Yalnızca verilen iç link URL listesinden link ver; listede yoksa düz metin bırak`;

function fail(message, code = 1) {
  console.error(`HATA: ${message}`);
  setGithubOutput('article_generated', 'false');
  process.exit(code);
}

function skipGeneration(reason) {
  console.log(`No safe unused topic found. Skipping article generation.`);
  console.log(`Sebep: ${reason}`);
  const report = {
    skipped: true,
    article_generated: false,
    reason,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  setGithubOutput('article_generated', 'false');
  process.exit(0);
}

function setGithubOutput(key, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  try {
    appendFileSync(out, `${key}=${value}\n`, 'utf8');
  } catch {
    /* ignore local runs */
  }
}

/** Kalite uyarıları — workflow'u durdurmaz. */
const qualityWarnings = [];

function warnQuality(message) {
  qualityWarnings.push(message);
  console.warn(`::warning title=Makale kalite uyarısı::${message}`);
}

function printQualityWarnings() {
  if (qualityWarnings.length === 0) {
    console.log('\n=== Quality warnings ===\n(yok)');
    return;
  }
  console.log('\n=== Quality warnings ===');
  for (const w of qualityWarnings) {
    console.log(`- ${w}`);
  }
  console.log(
    `\nNot: ${qualityWarnings.length} kalite uyarısı raporlandı; makale yine de kaydedildi/commit edilebilir (exit 0).`,
  );
}

function loadEnv() {
  const env = {};
  const envPath = join(ROOT, '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v && (k === 'GEMINI_API_KEY' || k === 'GEMINI_MODEL' || k === 'GOOGLE_GEMINI_API_KEY')) {
      env[k] = v;
    }
  }
  return env;
}

function getApiKey(env) {
  return env.GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY || '';
}

function normalizeTr(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(text) {
  return normalizeTr(text)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function parseFrontmatterField(raw, field) {
  const re = new RegExp(`^${field}:\\s*"?([^"\\n]+)"?`, 'm');
  return raw.match(re)?.[1]?.trim() ?? '';
}

function loadExistingArticles() {
  const articles = [];
  for (const file of readdirSync(ARTICLES_DIR)) {
    if (!file.endsWith('.md')) continue;
    const raw = readFileSync(join(ARTICLES_DIR, file), 'utf8');
    const slug = parseFrontmatterField(raw, 'slug') || file.replace(/\.md$/, '');
    articles.push({
      file,
      slug,
      title: parseFrontmatterField(raw, 'title'),
      description: parseFrontmatterField(raw, 'description'),
      focusKeyword: parseFrontmatterField(raw, 'focusKeyword'),
      normalized: normalizeTr(
        `${slug} ${parseFrontmatterField(raw, 'title')} ${parseFrontmatterField(raw, 'focusKeyword')} ${parseFrontmatterField(raw, 'description')}`,
      ),
    });
  }
  return articles;
}

function discoverInternalLinks() {
  const links = [];
  if (existsSync(PAGES_DIR)) {
    for (const file of readdirSync(PAGES_DIR)) {
      if (!file.endsWith('.md')) continue;
      const raw = readFileSync(join(PAGES_DIR, file), 'utf8');
      const slug = parseFrontmatterField(raw, 'slug') || file.replace(/\.md$/, '');
      if (slug && slug !== 'ana-sayfa') {
        links.push(`${SITE_URL}/${slug}/`);
      }
    }
  }
  for (const file of readdirSync(ARTICLES_DIR)) {
    if (!file.endsWith('.md')) continue;
    const raw = readFileSync(join(ARTICLES_DIR, file), 'utf8');
    const slug = parseFrontmatterField(raw, 'slug') || file.replace(/\.md$/, '');
    links.push(`${SITE_URL}/makaleler/${slug}/`);
  }
  return [...new Set(links)].sort();
}

function significantTokens(text) {
  return normalizeTr(text)
    .split(' ')
    .filter((w) => w.length > 3 && !TOPIC_STOPWORDS.has(w));
}

function jaccard(aTokens, bTokens) {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Duplicate detection: exact slug/title/focus matches, or high Jaccard on
 * significant tokens. Avoids marking related-but-distinct intents as covered
 * (e.g. "nafaka artırım" vs "nafaka azaltma").
 */
function topicIsCovered(topicEntry, existingArticles) {
  const topicNorm = normalizeTr(topicEntry.topic);
  const topicSlug = slugify(topicEntry.topic);
  const topicTokens = significantTokens(topicEntry.topic);

  for (const art of existingArticles) {
    const titleNorm = normalizeTr(art.title);
    const focusNorm = normalizeTr(art.focusKeyword);
    const artSlug = art.slug;

    if (artSlug === topicSlug) return true;
    if (titleNorm && titleNorm === topicNorm) return true;
    if (focusNorm && focusNorm === topicNorm) return true;

    // Near-exact title containment for short topics
    if (topicNorm.length >= 18 && (titleNorm.includes(topicNorm) || topicNorm.includes(titleNorm))) {
      if (Math.abs(topicNorm.length - titleNorm.length) <= 12) return true;
    }

    const artTokens = significantTokens(`${art.slug} ${art.title} ${art.focusKeyword}`);
    const jac = jaccard(topicTokens, artTokens);
    if (jac >= 0.72) return true;

    const slugTokens = significantTokens(artSlug.replace(/-/g, ' '));
    if (jaccard(topicTokens, slugTokens) >= 0.8) return true;

    // Strong overlap only when many distinctive tokens match
    const inter = topicTokens.filter((t) => artTokens.includes(t));
    if (topicTokens.length >= 3 && inter.length / topicTokens.length >= 0.85 && inter.length >= 3) {
      return true;
    }
  }
  return false;
}

function pickFromPool(pool, existingArticles) {
  const available = pool.filter((t) => !topicIsCovered(t, existingArticles));
  if (available.length === 0) return null;
  const dayIndex = new Date().getUTCDay();
  const hourSalt = new Date().getUTCHours();
  return available[(dayIndex + hourSalt) % available.length];
}

async function generateTopicsViaGemini(apiKey, model, existingArticles, env) {
  const existingTitles = existingArticles
    .map((a) => a.title)
    .filter(Boolean)
    .slice(0, 80);
  const prompt = `Türk aile hukuku için 10 özgün evergreen makale konusu öner.

KURALLAR:
- Yalnızca Türkiye hukuku (TMK, HMK, 6284 vb.)
- Uydurma mevzuat üretme
- Bilgilendirici, search-intent odaklı başlıklar
- "en iyi avukat", yıl varyasyonu (2026/2027), şehir+anahtar kelime spamı YASAK
- Aşağıdaki mevcut başlıklarla aynı veya çok benzer konu önerme

Mevcut başlıklar:
${existingTitles.map((t) => `- ${t}`).join('\n')}

Yalnızca JSON döndür:
{"topics":[{"topic":"...","category":"Aile Hukuku|Boşanma Hukuku|Velayet|Nafaka|Mal Paylaşımı|Çocukla Kişisel İlişki|Koruma Tedbirleri|Tanıma ve Tenfiz","practiceArea":"..."}]}`;

  // Force JSON mode (no grounding) for structured topic list
  const envNoSearch = {
    ...env,
    GEMINI_GOOGLE_SEARCH_ENABLED: 'false',
    GEMINI_ENABLE_SEARCH_GROUNDING: 'false',
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini topic HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('')?.trim();
  if (!text) throw new Error('Gemini topic boş yanıt');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini topic JSON parse edilemedi');
    parsed = JSON.parse(match[0]);
  }

  const list = Array.isArray(parsed.topics) ? parsed.topics : [];
  return list
    .filter((t) => t && typeof t.topic === 'string' && t.topic.trim())
    .map((t) => ({
      topic: t.topic.trim(),
      category: t.category?.trim() || 'Aile Hukuku',
      practiceArea: t.practiceArea?.trim() || 'Aile Hukuku',
    }));
}

/**
 * A) TOPIC_POOL → B) FALLBACK_TOPIC_POOL → C) Gemini topics (max attempts)
 * Returns topic entry or null (caller should clean-skip).
 */
async function pickTopic(existingArticles, apiKey, model, env) {
  let chosen = pickFromPool(TOPIC_POOL, existingArticles);
  if (chosen) {
    console.log(`Konu kaynağı: TOPIC_POOL (${TOPIC_POOL.length} konu)`);
    return chosen;
  }
  console.log('TOPIC_POOL tükendi — FALLBACK_TOPIC_POOL deneniyor...');

  chosen = pickFromPool(FALLBACK_TOPIC_POOL, existingArticles);
  if (chosen) {
    console.log(`Konu kaynağı: FALLBACK_TOPIC_POOL (${FALLBACK_TOPIC_POOL.length} konu)`);
    return chosen;
  }
  console.log('FALLBACK_TOPIC_POOL tükendi — Gemini ile yeni konular üretiliyor...');

  for (let attempt = 1; attempt <= MAX_TOPIC_ATTEMPTS; attempt++) {
    console.log(`Gemini konu üretimi denemesi ${attempt}/${MAX_TOPIC_ATTEMPTS}...`);
    try {
      const generated = await generateTopicsViaGemini(apiKey, model, existingArticles, env);
      const safe = generated.filter((t) => !topicIsCovered(t, existingArticles));
      if (safe.length > 0) {
        console.log(`Konu kaynağı: Gemini (${safe.length} güvenli aday)`);
        return safe[0];
      }
      console.log(`Deneme ${attempt}: güvenli unused konu bulunamadı.`);
    } catch (err) {
      console.warn(`Gemini konu üretimi uyarısı: ${err.message || err}`);
    }
  }
  return null;
}

function isGoogleSearchEnabled(env) {
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

async function callGemini(apiKey, model, userPrompt, jsonMode = false, env = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  // Prefer Google Search when enabled; JSON mime type is incompatible with grounding.
  const useGrounding = isGoogleSearchEnabled(env);
  const generationConfig = { temperature: 0.45, maxOutputTokens: 8192 };
  if (jsonMode && !useGrounding) generationConfig.responseMimeType = 'application/json';

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig,
  };
  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    fail(`Gemini API HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('')?.trim();
  if (!text) fail('Gemini boş yanıt döndü');
  return { text, grounding: extractGroundingMetadata(data) };
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) fail('Gemini plan JSON parse edilemedi');
    return JSON.parse(match[0]);
  }
}

function validatePlanTechnical(plan, existingSlugs) {
  if (!plan.h1?.trim()) fail('Plan: h1 eksik — makale üretilemedi');

  if (!plan.slug?.trim()) {
    plan.slug = slugify(plan.h1);
    if (!plan.slug) fail('Plan: slug üretilemedi');
    warnQuality('Slug planda yoktu; başlıktan otomatik türetildi.');
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plan.slug)) {
    fail(`Geçersiz slug formatı: ${plan.slug}`);
  }

  if (existingSlugs.has(plan.slug)) {
    fail(`Slug zaten mevcut (çakışma): ${plan.slug}`);
  }

  if (!plan.seoTitle?.trim()) {
    plan.seoTitle = plan.h1.slice(0, 60);
    warnQuality('seoTitle eksikti; h1’den türetildi (kalite; üretim devam).');
  }
  if (!plan.metaDescription?.trim()) {
    plan.metaDescription = `${plan.h1} hakkında bilgilendirme. Adana aile hukuku süreçleri için genel bilgi.`.slice(
      0,
      160,
    );
    warnQuality('metaDescription eksikti; varsayılan metin atandı (kalite; üretim devam).');
  }

  if (!Array.isArray(plan.sections) || plan.sections.length === 0) {
    fail('Plan: sections eksik — makale gövdesi üretilemedi');
  }

  if (!Array.isArray(plan.secondaryKeywords)) plan.secondaryKeywords = [];
  if (!Array.isArray(plan.faqQuestions)) plan.faqQuestions = [];
  if (!plan.focusKeyword?.trim()) {
    plan.focusKeyword = plan.h1.slice(0, 80);
    warnQuality('Focus keyword eksikti; başlıktan türetildi.');
  }
}

function checkPlanQuality(plan) {
  const titleLen = plan.seoTitle.length;
  if (titleLen < 55 || titleLen > 60) {
    warnQuality(`Meta title uzunluğu hedef dışı (${titleLen} karakter; hedef 55-60).`);
  }

  const descLen = plan.metaDescription.length;
  if (descLen < 145 || descLen > 160) {
    warnQuality(`Meta description uzunluğu hedef dışı (${descLen} karakter; hedef 145-160).`);
  }

  if (plan.faqQuestions.length < MIN_FAQ) {
    warnQuality(`Plan FAQ sorusu az (${plan.faqQuestions.length}; hedef ≥${MIN_FAQ}).`);
  }

  if (plan.secondaryKeywords.length < 4) {
    warnQuality(
      `Secondary keywords / etiket önerileri eksik veya az (${plan.secondaryKeywords.length}; hedef 4-6).`,
    );
  }

  if (!plan.category?.trim()) {
    warnQuality('Kategori eksik veya boş.');
  }

  if (plan.sections.length < 5) {
    warnQuality(`H2 bölüm sayısı az (${plan.sections.length}; hedef ≥5).`);
  }

  const blob = JSON.stringify(plan);
  for (const re of BANNED_PHRASES) {
    if (re.test(blob)) {
      const phrase = re.source || String(re);
      console.warn(
        `::warning title=Yasaklı ifade uyarısı::Makalede kontrol listesindeki ifade bulundu: ${phrase}. İçerik değiştirilmeden yayınlanıyor.`,
      );
      qualityWarnings.push(`Yasaklı ifade (plan): ${phrase}`);
    }
  }
}

function checkBodyQuality(body, plan, internalLinks) {
  const words = countWords(body);

  if (words < MIN_WORDS || words > MAX_WORDS) {
    warnQuality(`Kelime sayısı hedef dışı (${words}; hedef ${MIN_WORDS}-${MAX_WORDS}).`);
  }

  if (!body.includes('## Sık Sorulan Sorular')) {
    warnQuality('Gövdede "## Sık Sorulan Sorular" bölümü bulunamadı.');
  }

  const h1Snippet = plan.h1.slice(0, Math.min(20, plan.h1.length));
  if (h1Snippet && !body.includes(h1Snippet)) {
    warnQuality('H1 başlığı gövde metninde beklenen biçimde geçmiyor olabilir.');
  }

  for (const re of BANNED_PHRASES) {
    if (re.test(body)) {
      const phrase = re.source || String(re);
      console.warn(
        `::warning title=Yasaklı ifade uyarısı::Makalede kontrol listesindeki ifade bulundu: ${phrase}. İçerik değiştirilmeden yayınlanıyor.`,
      );
      qualityWarnings.push(`Yasaklı ifade (gövde): ${phrase}`);
      // İçerik değiştirilmez / silinmez / yeniden üretilmez.
    }
  }

  const hasInternalLink = internalLinks.some((url) => body.includes(url));
  if (!hasInternalLink) {
    warnQuality('Gövdeye mevcut site URL’lerinden iç link eklenemedi veya hiç eklenmedi.');
  }
}

function checkFaqQuality(faqPairs, plan) {
  if (faqPairs.length < MIN_FAQ) {
    warnQuality(`FAQ sayısı az (${faqPairs.length}; hedef ≥${MIN_FAQ}).`);
  }

  const emptyAnswers = faqPairs.filter((p) => !p.a || p.a.length < 20);
  if (emptyAnswers.length > 0) {
    warnQuality(`${emptyAnswers.length} FAQ cevabı çok kısa veya eksik görünüyor.`);
  }

  if (faqPairs.length === 0) {
    warnQuality('JSON-LD FAQ schema için yeterli SSS çifti üretilemedi.');
  }
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
  for (const marker of ['**Hukuki uyarı', '## SEO Çıktıları']) {
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

function buildMetaSection(article, faqPairs, internalLinks) {
  const today = new Date().toISOString().slice(0, 10);
  const pageUrl = `${SITE_URL}/makaleler/${article.slug}/`;

  const faqSchemaBlock =
    faqPairs.length > 0
      ? `## FAQ Schema JSON-LD

\`\`\`json
${JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqPairs.map(({ q, a }) => ({
      '@type': 'Question',
      name: sanitizeFaqQuestionName(q),
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  },
  null,
  2,
)}
\`\`\`

`
      : '';

  if (faqPairs.length === 0) {
    warnQuality('FAQ JSON-LD schema bloğu atlandı (yeterli SSS çifti yok).');
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.seoTitle,
    description: article.metaDescription,
    author: { '@type': 'Person', name: 'Av. Ceren Sümer Cilli' },
    publisher: { '@type': 'Organization', name: 'adanaailehukuku.com' },
    datePublished: today,
    dateModified: today,
    image: `${SITE_URL}/og/article-default.svg`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    about: [{ '@type': 'Thing', name: article.practiceArea }],
  };

  const linkLines = internalLinks
    .slice(0, 8)
    .map((href) => `- [${href.replace(SITE_URL, '').replace(/\//g, ' ').trim()}](${href})`)
    .join('\n  ');

  return `## SEO Çıktıları

- **SEO title:** ${article.seoTitle}
- **Meta description:** ${article.metaDescription}
- **Slug:** ${article.slug}
- **Focus keyword:** ${article.focusKeyword}
- **Secondary keywords:** ${article.secondaryKeywords.join(', ')}
- **İç link önerileri:**
  ${linkLines}

${faqSchemaBlock}## Article Schema JSON-LD

\`\`\`json
${JSON.stringify(articleSchema, null, 2)}
\`\`\`
`;
}

function escapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFrontmatter(article) {
  const today = new Date().toISOString().slice(0, 10);
  const tagsYaml = article.secondaryKeywords
    .map((t) => `  - "${escapeYamlDoubleQuoted(t)}"`)
    .join('\n');
  return `---
title: "${escapeYamlDoubleQuoted(article.seoTitle)}"
description: "${escapeYamlDoubleQuoted(article.metaDescription)}"
slug: ${article.slug}
date: "${today}"
author: "Av. Ceren Sümer Cilli"
reviewer: "Av. Ceren Sümer Cilli"
category: "${escapeYamlDoubleQuoted(article.category)}"
focusKeyword: "${escapeYamlDoubleQuoted(article.focusKeyword)}"
practiceArea: "${escapeYamlDoubleQuoted(article.practiceArea)}"
location: "Adana"
secondaryKeywords:
${tagsYaml}
---

`;
}

function appendSlugToConsts(slug) {
  const raw = readFileSync(CONSTS_PATH, 'utf8');
  if (raw.includes(`'${slug}'`)) return;
  const marker = '] as const;';
  const idx = raw.indexOf('export const ARTICLE_SLUGS = [');
  if (idx < 0) fail('ARTICLE_SLUGS bulunamadı (src/consts.ts)');
  const end = raw.indexOf(marker, idx);
  if (end < 0) fail('ARTICLE_SLUGS kapanışı bulunamadı');
  const updated = `${raw.slice(0, end)}  '${slug}',\n${raw.slice(end)}`;
  writeFileSync(CONSTS_PATH, updated, 'utf8');
}

function rollback(articlePath, constsBackup) {
  if (existsSync(articlePath)) unlinkSync(articlePath);
  if (constsBackup !== null) writeFileSync(CONSTS_PATH, constsBackup, 'utf8');
  if (existsSync(REPORT_PATH)) unlinkSync(REPORT_PATH);
}

function runBuild() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCmd, ['run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.error) {
    console.error(`Build spawn hatası: ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    console.error(`Build exit code: ${result.status}`);
  }
  return result.status === 0;
}

async function main() {
  const env = loadEnv();
  const apiKey = getApiKey(env);
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) fail('GEMINI_API_KEY ortam değişkeni tanımlı değil');

  mkdirSync(ARTICLES_DIR, { recursive: true });

  const existing = loadExistingArticles();
  const existingSlugs = new Set(existing.map((a) => a.slug));
  const topicEntry = await pickTopic(existing, apiKey, model, env);
  if (!topicEntry) {
    skipGeneration('TOPIC_POOL, FALLBACK_TOPIC_POOL ve Gemini fallback içinde güvenli unused konu bulunamadı.');
  }
  const internalLinks = discoverInternalLinks();

  console.log(`Konu: ${topicEntry.topic}`);
  console.log(`Mevcut makale sayısı: ${existing.length}`);
  console.log(`Havuz: TOPIC_POOL=${TOPIC_POOL.length}, FALLBACK=${FALLBACK_TOPIC_POOL.length}`);

  const planPrompt = `Aşağıdaki konu için makale planı üret. Yalnızca geçerli JSON döndür.

Konu: ${topicEntry.topic}
Kategori: ${topicEntry.category}
Practice area: ${topicEntry.practiceArea}

JSON şeması:
{
  "h1": "string — makale başlığı",
  "seoTitle": "string — 55-60 karakter SEO title",
  "metaDescription": "string — 145-160 karakter meta description",
  "slug": "string — benzersiz kebab-case slug (Türkçe karakter yok)",
  "focusKeyword": "string",
  "secondaryKeywords": ["4-6 adet string"],
  "sections": ["7-9 adet H2 başlık metni"],
  "faqQuestions": ["5-6 adet SSS sorusu"]
}

Mevcut sluglar (bunları kullanma): ${[...existingSlugs].join(', ')}`;

  const planRaw = await callGemini(apiKey, model, planPrompt, true, env);
  const plan = extractJsonObject(planRaw.text);
  plan.category = topicEntry.category;
  plan.practiceArea = topicEntry.practiceArea;
  validatePlanTechnical(plan, existingSlugs);
  checkPlanQuality(plan);

  const bodyPrompt = `Makale gövdesini yaz (meta/JSON-LD HARİÇ).

H1: ${plan.h1}
Focus keyword: ${plan.focusKeyword}
Slug: ${plan.slug}

Önce blockquote:
> ${EXPERT_BOX}

Sonra:
# ${plan.h1}

Giriş paragrafı arama niyetine doğrudan cevap versin; focus keyword doğal geçsin.

H2 bölümleri (her birinde en az bir H3):
${plan.sections.map((s) => `- ## ${s}`).join('\n')}

## Sonuç
Kısa özet ve doğal danışma çağrısı; [İletişim](${SITE_URL}/iletisim/) linki.

## Sık Sorulan Sorular
${plan.faqQuestions.map((q) => `- ### ${q}`).join('\n')}
(Her soruya kısa cevap paragrafı)

Son satır:
**Hukuki uyarı:** ${LEGAL_DISCLAIMER}

Kelime hedefi: ${MIN_WORDS}-${MAX_WORDS} kelime (bu aralığın dışına çıkma).

İç linkler — YALNIZCA şu URL'lerden kullan (yoksa düz metin):
${internalLinks.join('\n')}`;

  let bodyResult = await callGemini(apiKey, model, bodyPrompt, false, env);
  let body = bodyResult.text;
  if (!body || !String(body).trim()) {
    fail('Makale gövdesi boş üretildi — teknik hata');
  }
  if (bodyResult.grounding?.sources?.length) {
    const lines = bodyResult.grounding.sources.map(
      (s, i) => `- [${s.title || `Kaynak ${i + 1}`}](${s.url})`
    );
    body = `${body.trim()}\n\n## Kaynaklar\n\n${lines.join('\n')}\n`;
  }
  checkBodyQuality(body, plan, internalLinks);

  // Teknik: neredeyse boş çıktı (kalite alt sınırı uyarıdır; bu tamamen bozuk)
  if (countWords(body) < 50) {
    fail(`Makale gövdesi neredeyse boş (${countWords(body)} kelime) — teknik hata`);
  }

  let faqPairs = extractFaqPairs(body);
  const faqFromBody = faqPairs.length;
  if (faqPairs.length < MIN_FAQ) {
    for (const q of plan.faqQuestions) {
      if (faqPairs.length >= MIN_FAQ) break;
      if (!faqPairs.some((p) => p.q === q)) {
        faqPairs.push({
          q,
          a: 'Somut olayın koşullarına göre değerlendirme değişir; Adana aile mahkemelerinde delil ve tarafların durumu birlikte incelenir.',
        });
      }
    }
    if (faqFromBody < MIN_FAQ && faqPairs.length >= MIN_FAQ) {
      warnQuality('FAQ cevapları gövdeden eksikti; plan sorularından tamamlayıcı metin eklendi.');
    }
  }
  checkFaqQuality(faqPairs, plan);

  const meta = buildMetaSection(plan, faqPairs.slice(0, 6), internalLinks);
  const fullContent = buildFrontmatter(plan) + body + '\n\n' + meta;

  const articlePath = join(ARTICLES_DIR, `${plan.slug}.md`);
  const constsBackup = readFileSync(CONSTS_PATH, 'utf8');

  writeFileSync(articlePath, fullContent, 'utf8');
  appendSlugToConsts(plan.slug);

  console.log(`Dosya yazıldı: content/articles/${plan.slug}.md`);
  console.log('Build çalıştırılıyor...');

  if (!runBuild()) {
    rollback(articlePath, constsBackup);
    fail('Build başarısız — dosya yazılmadı (rollback yapıldı)');
  }

  const report = {
    slug: plan.slug,
    title: plan.seoTitle,
    path: `content/articles/${plan.slug}.md`,
    topic: topicEntry.topic,
    wordCount: countWords(body),
    faqCount: faqPairs.length,
    metaTitleLength: plan.seoTitle.length,
    metaDescriptionLength: plan.metaDescription.length,
    qualityWarnings: [...qualityWarnings],
    article_generated: true,
    skipped: false,
    commitMessage: `add article on ${plan.slug}`,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  setGithubOutput('article_generated', 'true');

  console.log('\n=== BAŞARILI ===');
  console.log(`Slug: ${report.slug}`);
  console.log(`Kelime: ${report.wordCount}`);
  console.log(`FAQ: ${report.faqCount}`);
  console.log(`Commit mesajı önerisi: ${report.commitMessage}`);
  printQualityWarnings();
}

main().catch((err) => fail(err.message || String(err)));
