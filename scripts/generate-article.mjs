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
const MAX_QUALITY_HEALS = 2;

/** Soft target for generated body (excludes SEO meta tail). */
const MIN_WORDS = 1000;
const MAX_WORDS = 1250;
/** Soft overage: warn only. Above this → one shorten attempt. */
const WORD_SOFT_MAX = 1350;
const WORD_HARD_MAX = 1450;

const META_DESC_MIN = 145;
const META_DESC_MAX = 160;
const META_DESC_PREF_MIN = 150;
const META_DESC_PREF_MAX = 158;

const MIN_FAQ = 4;
const TARGET_FAQ = 5;

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
- Gereksiz tekrar ve dolgu yazma; net ve ölçülü ol
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
    if (
      v &&
      (k === 'GEMINI_API_KEY' ||
        k === 'GEMINI_MODEL' ||
        k === 'GOOGLE_GEMINI_API_KEY' ||
        k === 'AUTO_ARTICLE_DRY_RUN' ||
        k === 'GEMINI_GOOGLE_SEARCH_ENABLED' ||
        k === 'GEMINI_ENABLE_SEARCH_GROUNDING')
    ) {
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
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Word count for quality targets — exclude grounding kaynak listesi. */
function countBodyWords(body) {
  let text = String(body || '');
  const kaynak = text.indexOf('\n## Kaynaklar');
  if (kaynak >= 0) text = text.slice(0, kaynak);
  const seo = text.indexOf('\n## SEO Çıktıları');
  if (seo >= 0) text = text.slice(0, seo);
  return countWords(text);
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
  // Explicit disable from caller (e.g. quality heal / shorten) wins over process.env.
  if (
    env?.GEMINI_GOOGLE_SEARCH_ENABLED === 'false' ||
    env?.GEMINI_ENABLE_SEARCH_GROUNDING === 'false'
  ) {
    return false;
  }
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

async function callGemini(apiKey, model, userPrompt, jsonMode = false, env = {}, options = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  // Prefer Google Search when enabled; JSON mime type is incompatible with grounding.
  const useGrounding = isGoogleSearchEnabled(env);
  const generationConfig = {
    temperature: options.temperature ?? 0.45,
    maxOutputTokens: options.maxOutputTokens ?? 8192,
  };
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

function clampMetaDescription(text, focusKeyword = '') {
  let desc = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  // Önceki pad artıklarını temizle
  desc = desc
    .replace(/(\s*Adana aile hukuku çerçevesinde genel bilgilendirme sunar\.?)+/gi, '')
    .replace(/(\s*Genel bilgilendirme amaçlıdır\.?)+/gi, '')
    .replace(/(\s*Süreç mahkeme ve delillere göre değişebilir\.?)+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!desc) {
    desc = `${focusKeyword || 'Aile hukuku'} konusunda Adana aile mahkemesi uygulamalarına dair genel bilgilendirme.`;
  }

  if (desc.length > META_DESC_MAX) {
    const limit = META_DESC_PREF_MAX;
    let cut = desc.slice(0, limit + 1);
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace >= META_DESC_MIN - 5) {
      cut = cut.slice(0, lastSpace);
    } else {
      cut = desc.slice(0, META_DESC_MAX);
      const sp = cut.lastIndexOf(' ');
      if (sp > META_DESC_MIN) cut = cut.slice(0, sp);
    }
    desc = cut.replace(/[,\s;:\-–—]+$/u, '').trim();
    if (!/[.!?…]$/u.test(desc)) desc = `${desc}.`;
  }

  if (desc.length < META_DESC_MIN) {
    const suffixes = [
      ' Adana aile hukuku çerçevesinde genel bilgilendirme sunar.',
      ' Genel bilgilendirme amaçlıdır.',
      ' Süreç mahkeme ve delillere göre değişebilir.',
    ];
    for (const suffix of suffixes) {
      if (desc.length >= META_DESC_MIN) break;
      if (desc.length + suffix.length <= META_DESC_MAX) {
        desc = `${desc.replace(/\.$/, '')}.${suffix}`.replace(/\.\./g, '.').replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (desc.length > META_DESC_MAX) {
    let cut = desc.slice(0, META_DESC_MAX);
    const sp = cut.lastIndexOf(' ');
    if (sp >= META_DESC_MIN) cut = cut.slice(0, sp);
    desc = cut.replace(/[,\s;:\-–—]+$/u, '').trim();
    if (!/[.!?…]$/u.test(desc)) desc = `${desc}.`;
  }

  return desc;
}

function isSensibleMetaDescription(desc) {
  const t = String(desc || '').trim();
  if (t.length < META_DESC_MIN || t.length > META_DESC_MAX) return false;
  if ((t.match(/genel bilgilendirme/gi) || []).length >= 3) return false;
  if (/\s[a-zçğıöşü]{1,2}\s+Adana/i.test(t)) return false;
  if (!/[a-zçğıöşüA-ZÇĞİÖŞÜ]{4,}/.test(t)) return false;
  return true;
}

async function rewriteMetaDescription(apiKey, model, plan, env) {
  const original = plan.metaDescription || '';
  const prompt = `Aşağıdaki konu için Türkçe meta description yaz.
Kurallar:
- Tam ${META_DESC_PREF_MIN}-${META_DESC_PREF_MAX} karakter (zorunlu aralık ${META_DESC_MIN}-${META_DESC_MAX})
- Reklam dili yok; tek cümle veya iki kısa cümle
- Tırnak, markdown, başlık yok
- Yalnızca meta description metnini döndür

Konu: ${plan.h1}
Focus: ${plan.focusKeyword}
Mevcut (uygunsuz): ${original}`;

  try {
    const envNoSearch = {
      ...env,
      GEMINI_GOOGLE_SEARCH_ENABLED: 'false',
      GEMINI_ENABLE_SEARCH_GROUNDING: 'false',
    };
    const result = await callGemini(apiKey, model, prompt, false, envNoSearch, {
      temperature: 0.25,
      maxOutputTokens: 256,
    });
    const candidate = clampMetaDescription(
      result.text.replace(/^["'`]+|["'`]+$/g, '').split('\n')[0],
      plan.focusKeyword,
    );
    if (isSensibleMetaDescription(candidate)) return candidate;
  } catch {
    /* fall through */
  }
  return clampMetaDescription(original, plan.focusKeyword);
}

function buildFaqMarkdown(faqPairs) {
  const lines = ['## Sık Sorulan Sorular', ''];
  for (const { q, a } of faqPairs) {
    lines.push(`### ${sanitizeFaqQuestionName(q)}`);
    lines.push('');
    lines.push(a.trim());
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

function ensureFaqSectionInBody(body, faqPairs) {
  if (!faqPairs.length) return { body, injected: false };

  if (body.includes('## Sık Sorulan Sorular')) {
    return { body, injected: false };
  }

  const faqMd = buildFaqMarkdown(faqPairs);
  const warningIdx = body.indexOf('**Hukuki uyarı');
  const kaynakIdx = body.indexOf('## Kaynaklar');
  let insertAt = body.length;
  if (warningIdx >= 0) insertAt = Math.min(insertAt, warningIdx);
  if (kaynakIdx >= 0) insertAt = Math.min(insertAt, kaynakIdx);

  const before = body.slice(0, insertAt).trimEnd();
  const after = body.slice(insertAt).trimStart();
  const next = `${before}\n\n${faqMd}\n\n${after}`.trim() + '\n';
  return { body: next, injected: true };
}

function mergeFaqPairs(fromBody, planQuestions) {
  const pairs = [...fromBody];
  const defaultAnswer =
    'Somut olayın koşullarına göre değerlendirme değişir; Adana aile mahkemelerinde delil ve tarafların durumu birlikte incelenir.';

  for (const q of planQuestions || []) {
    if (pairs.length >= TARGET_FAQ + 1) break;
    const clean = sanitizeFaqQuestionName(q);
    if (!clean) continue;
    if (pairs.some((p) => sanitizeFaqQuestionName(p.q) === clean || p.q.includes(clean.slice(0, 24)))) {
      continue;
    }
    pairs.push({ q: clean, a: defaultAnswer });
  }

  while (pairs.length < MIN_FAQ) {
    pairs.push({
      q: `Bu süreçte nelere dikkat edilmelidir? (${pairs.length + 1})`,
      a: defaultAnswer,
    });
  }

  return pairs.slice(0, 6);
}

async function shortenBodyOnce(apiKey, model, body, plan, env) {
  let kaynakTail = '';
  let main = body;
  const kaynakIdx = body.indexOf('\n## Kaynaklar');
  if (kaynakIdx >= 0) {
    main = body.slice(0, kaynakIdx).trimEnd();
    kaynakTail = body.slice(kaynakIdx);
  }

  const prompt = `Aşağıdaki makale gövdesini ölçülü kısalt.
Kurallar:
- Hedef yaklaşık ${MIN_WORDS}-${MAX_WORDS} kelime (tercihen 1050-1200)
- Hukuki açıklamaları silme; yalnızca tekrar, dolgu ve aşırı uzatmayı azalt
- H1, H2, H3 yapısını ve "## Sık Sorulan Sorular" + ### soru-cevapları koru
- Blockquote uzman kutusunu ve hukuki uyarı satırını koru
- Meta/JSON-LD/Kaynaklar ekleme
- Özet değil; tam makale gövdesi döndür (asla 800 kelimenin altına inme)
- Yalnızca markdown gövdeyi döndür

Başlık: ${plan.h1}

${main}`;

  const envNoSearch = {
    ...env,
    GEMINI_GOOGLE_SEARCH_ENABLED: 'false',
    GEMINI_ENABLE_SEARCH_GROUNDING: 'false',
  };
  const result = await callGemini(apiKey, model, prompt, false, envNoSearch, {
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const shortened = result.text?.trim();
  if (!shortened) return body;

  const out = kaynakTail ? `${shortened.trimEnd()}\n${kaynakTail}` : shortened;
  return out;
}

/**
 * Deterministic trim when model shorten fails: drop excess prose paragraphs
 * while keeping headings, FAQ, disclaimer, and expert box.
 */
function trimBodyLocally(body, targetMax = MAX_WORDS) {
  let kaynakTail = '';
  let main = body;
  const kaynakIdx = body.indexOf('\n## Kaynaklar');
  if (kaynakIdx >= 0) {
    main = body.slice(0, kaynakIdx).trimEnd();
    kaynakTail = body.slice(kaynakIdx);
  }

  if (countBodyWords(main) <= targetMax) {
    return body;
  }

  const faqStart = main.indexOf('## Sık Sorulan Sorular');
  const warningStart = main.indexOf('**Hukuki uyarı');
  let protectedTail = '';
  let editable = main;
  const cutAt = [faqStart, warningStart].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (cutAt != null) {
    editable = main.slice(0, cutAt).trimEnd();
    protectedTail = main.slice(cutAt).trimStart();
  }

  const blocks = editable.split(/\n{2,}/).filter((b) => b.trim());
  const isProtected = (b) => {
    const t = b.trim();
    return t.startsWith('#') || t.startsWith('>') || t.startsWith('**Hukuki');
  };

  // Prefer dropping long prose from the end of the article body (before FAQ)
  const removableIdx = [];
  for (let i = 0; i < blocks.length; i += 1) {
    if (!isProtected(blocks[i])) removableIdx.push(i);
  }

  const keep = new Set(blocks.map((_, i) => i));
  let current = countWords(`${editable}\n\n${protectedTail}`);

  for (let r = removableIdx.length - 1; r >= 0 && current > targetMax; r -= 1) {
    const i = removableIdx[r];
    const w = countWords(blocks[i]);
    // Keep at least one prose block after H1/intro if possible
    if (keep.size <= 4) break;
    keep.delete(i);
    current -= w;
  }

  // Still over: truncate remaining long prose blocks
  let keptBlocks = blocks.filter((_, i) => keep.has(i));
  current = countWords(`${keptBlocks.join('\n\n')}\n\n${protectedTail}`);
  for (let i = keptBlocks.length - 1; i >= 0 && current > targetMax; i -= 1) {
    if (isProtected(keptBlocks[i])) continue;
    const sentences = keptBlocks[i].split(/(?<=[.!?…])\s+/);
    if (sentences.length < 3) continue;
    const trimmed = sentences.slice(0, Math.ceil(sentences.length * 0.6)).join(' ');
    const saved = countWords(keptBlocks[i]) - countWords(trimmed);
    if (saved <= 0) continue;
    keptBlocks[i] = trimmed;
    current -= saved;
  }

  let next = keptBlocks.join('\n\n').trim();
  if (protectedTail) next = `${next}\n\n${protectedTail}`.trim();
  if (kaynakTail) next = `${next}\n${kaynakTail}`;

  if (countBodyWords(next) < Math.min(MIN_WORDS - 100, Math.floor(countBodyWords(body) * 0.35))) {
    return body;
  }
  return next;
}

/**
 * Self-heal quality issues on the newly generated article only.
 * Does not modify other files on disk.
 */
async function healGeneratedArticle({ apiKey, model, env, plan, body, internalLinks }) {
  let heals = 0;
  let nextBody = body;
  const notes = [];

  // Meta description
  const beforeMeta = plan.metaDescription || '';
  if (beforeMeta.length < META_DESC_MIN || beforeMeta.length > META_DESC_MAX) {
    if (beforeMeta.length > META_DESC_MAX + 20 && heals < MAX_QUALITY_HEALS) {
      plan.metaDescription = await rewriteMetaDescription(apiKey, model, plan, env);
      heals += 1;
      notes.push('metaDescription Gemini ile yeniden yazıldı');
    } else {
      plan.metaDescription = clampMetaDescription(beforeMeta, plan.focusKeyword);
      notes.push('metaDescription kelime sınırında kısaltıldı/düzeltildi');
    }
  } else if (beforeMeta.length < META_DESC_PREF_MIN || beforeMeta.length > META_DESC_PREF_MAX) {
    plan.metaDescription = clampMetaDescription(beforeMeta, plan.focusKeyword);
    notes.push('metaDescription tercih aralığına yaklaştırıldı');
  }

  // FAQ pairs + body section
  let faqPairs = extractFaqPairs(nextBody);
  const faqFromBody = faqPairs.length;
  faqPairs = mergeFaqPairs(faqPairs, plan.faqQuestions);

  if (!nextBody.includes('## Sık Sorulan Sorular')) {
    const ensured = ensureFaqSectionInBody(nextBody, faqPairs);
    nextBody = ensured.body;
    if (ensured.injected) notes.push('Gövdeye "## Sık Sorulan Sorular" bölümü eklendi');
  } else if (faqFromBody < MIN_FAQ) {
    const start = nextBody.indexOf('## Sık Sorulan Sorular');
    let end = nextBody.length;
    for (const marker of ['**Hukuki uyarı', '## Kaynaklar', '## SEO Çıktıları']) {
      const idx = nextBody.indexOf(marker, start);
      if (idx >= 0) end = Math.min(end, idx);
    }
    nextBody =
      nextBody.slice(0, start).trimEnd() +
      '\n\n' +
      buildFaqMarkdown(faqPairs) +
      '\n\n' +
      nextBody.slice(end).trimStart();
    notes.push('Eksik FAQ gövdesi plan sorularıyla tamamlandı');
  }

  faqPairs = mergeFaqPairs(extractFaqPairs(nextBody), plan.faqQuestions);
  if (!nextBody.includes('## Sık Sorulan Sorular')) {
    nextBody = ensureFaqSectionInBody(nextBody, faqPairs).body;
  }

  // Word count — yalnızca aşırı yüksekse bir kez kısalt; kötü kısaltmayı geri al
  let words = countBodyWords(nextBody);
  if (words > WORD_HARD_MAX && heals < MAX_QUALITY_HEALS) {
    console.log(`Kelime sayısı ${words} — bir kez kısaltma isteniyor...`);
    const before = nextBody;
    const candidate = await shortenBodyOnce(apiKey, model, nextBody, plan, env);
    heals += 1;
    let afterWords = countBodyWords(candidate);
    if (afterWords < MIN_WORDS || afterWords < Math.floor(words * 0.45)) {
      const local = trimBodyLocally(before, MAX_WORDS);
      const localWords = countBodyWords(local);
      if (localWords < words && localWords >= Math.min(MIN_WORDS, 800)) {
        nextBody = local;
        notes.push(`Gemini kısaltması reddedildi; yerel trim uygulandı (${words} → ${localWords})`);
      } else {
        nextBody = before;
        notes.push(
          `Kısaltma reddedildi (önce ${words}, aday ${afterWords}); orijinal gövde korundu`,
        );
        warnQuality(
          `Kelime sayısı aşırı yüksek (${words}); otomatik kısaltma güvenli olmadığı için uygulanmadı.`,
        );
      }
    } else {
      nextBody = candidate;
      notes.push(`Aşırı uzun gövde kısaltıldı (${words} → ${afterWords})`);
    }
    faqPairs = mergeFaqPairs(extractFaqPairs(nextBody), plan.faqQuestions);
    if (!nextBody.includes('## Sık Sorulan Sorular')) {
      nextBody = ensureFaqSectionInBody(nextBody, faqPairs).body;
    }
  } else if (words > MAX_WORDS) {
    notes.push(`Kelime sayısı biraz yüksek (${words}); yalnızca uyarı`);
  }

  checkBodyQuality(nextBody, plan, internalLinks);
  checkFaqQuality(faqPairs, plan);

  return { body: nextBody, faqPairs, healNotes: notes };
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
    plan.metaDescription = clampMetaDescription(
      `${plan.h1} hakkında bilgilendirme. Adana aile hukuku süreçleri için genel bilgi.`,
      plan.focusKeyword || plan.h1,
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
  if (descLen < META_DESC_MIN || descLen > META_DESC_MAX) {
    warnQuality(
      `Meta description uzunluğu hedef dışı (${descLen} karakter; hedef ${META_DESC_MIN}-${META_DESC_MAX}).`,
    );
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
  const words = countBodyWords(body);

  if (words < MIN_WORDS) {
    warnQuality(`Kelime sayısı hedef altı (${words}; hedef ${MIN_WORDS}-${MAX_WORDS}).`);
  } else if (words > WORD_HARD_MAX) {
    warnQuality(`Kelime sayısı aşırı yüksek (${words}; hedef ${MIN_WORDS}-${MAX_WORDS}).`);
  } else if (words > WORD_SOFT_MAX) {
    warnQuality(`Kelime sayısı biraz yüksek (${words}; hedef ${MIN_WORDS}-${MAX_WORDS}).`);
  } else if (words > MAX_WORDS) {
    warnQuality(`Kelime sayısı hedef üstü (${words}; hedef ${MIN_WORDS}-${MAX_WORDS}).`);
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
  "metaDescription": "string — ${META_DESC_PREF_MIN}-${META_DESC_PREF_MAX} karakter meta description (zorunlu ${META_DESC_MIN}-${META_DESC_MAX})",
  "slug": "string — benzersiz kebab-case slug (Türkçe karakter yok)",
  "focusKeyword": "string",
  "secondaryKeywords": ["4-6 adet string"],
  "sections": ["7-9 adet H2 başlık metni"],
  "faqQuestions": ["${TARGET_FAQ}-6 adet SSS sorusu"]
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

H2 bölümleri (her birinde en az bir H3; her H2 altında en fazla 2 kısa paragraf — dolgu yok):
${plan.sections.map((s) => `- ## ${s}`).join('\n')}

## Sonuç
Kısa özet ve doğal danışma çağrısı; [İletişim](${SITE_URL}/iletisim/) linki.

ZORUNLU — gövdede birebir şu başlık olmalı:
## Sık Sorulan Sorular
Altında ${MIN_FAQ}-6 adet gerçek soru-cevap; her soru ### ile:
${plan.faqQuestions.map((q) => `- ### ${q}`).join('\n')}
(Her soruya 2-4 cümlelik net cevap; bu sorular JSON-LD FAQ ile aynı olacak)

Son satır:
**Hukuki uyarı:** ${LEGAL_DISCLAIMER}

Kelime hedefi: ${MIN_WORDS}-${MAX_WORDS} kelime (tercihen 1050-1180). Gereksiz tekrar/dolgu yazma; önemli hukuki açıklamaları kesme. 1400 kelimeyi geçme. Kısa ve net yaz.

İç linkler — YALNIZCA şu URL'lerden kullan (yoksa düz metin):
${internalLinks.join('\n')}`;

  let bodyResult = await callGemini(apiKey, model, bodyPrompt, false, env, {
    temperature: 0.4,
    maxOutputTokens: 4096,
  });
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

  // Teknik: neredeyse boş çıktı (kalite alt sınırı uyarıdır; bu tamamen bozuk)
  if (countBodyWords(body) < 50) {
    fail(`Makale gövdesi neredeyse boş (${countBodyWords(body)} kelime) — teknik hata`);
  }

  const healed = await healGeneratedArticle({
    apiKey,
    model,
    env,
    plan,
    body,
    internalLinks,
  });
  body = healed.body;
  const faqPairs = healed.faqPairs;
  for (const note of healed.healNotes) {
    console.log(`Self-heal: ${note}`);
  }

  // Final meta length must be in range after healing
  plan.metaDescription = clampMetaDescription(plan.metaDescription, plan.focusKeyword);
  if (
    plan.metaDescription.length < META_DESC_MIN ||
    plan.metaDescription.length > META_DESC_MAX
  ) {
    warnQuality(
      `Meta description heal sonrası hâlâ hedef dışı (${plan.metaDescription.length}).`,
    );
  }

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

  const wordCount = countBodyWords(body);
  const dryRun = String(env.AUTO_ARTICLE_DRY_RUN || '').toLowerCase() === 'true' || env.AUTO_ARTICLE_DRY_RUN === '1';
  if (dryRun) {
    rollback(articlePath, constsBackup);
    console.log('\n=== DRY RUN BAŞARILI (dosya yazılmadı / rollback) ===');
    console.log(`Slug (test): ${plan.slug}`);
    console.log(`Kelime: ${wordCount}`);
    console.log(`Meta description: ${plan.metaDescription.length} karakter`);
    console.log(`FAQ: ${faqPairs.length}`);
    console.log(`FAQ heading: ${body.includes('## Sık Sorulan Sorular') ? 'yes' : 'no'}`);
    setGithubOutput('article_generated', 'false');
    writeFileSync(
      REPORT_PATH,
      JSON.stringify(
        {
          dryRun: true,
          article_generated: false,
          slug: plan.slug,
          wordCount,
          faqCount: faqPairs.length,
          metaDescriptionLength: plan.metaDescription.length,
          metaDescription: plan.metaDescription,
          hasFaqHeading: body.includes('## Sık Sorulan Sorular'),
          healNotes: healed.healNotes,
          qualityWarnings: [...qualityWarnings],
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
    printQualityWarnings();
    return;
  }

  const report = {
    slug: plan.slug,
    title: plan.seoTitle,
    path: `content/articles/${plan.slug}.md`,
    topic: topicEntry.topic,
    wordCount,
    faqCount: faqPairs.length,
    metaTitleLength: plan.seoTitle.length,
    metaDescriptionLength: plan.metaDescription.length,
    healNotes: healed.healNotes,
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
  console.log(`Meta description: ${report.metaDescriptionLength} karakter`);
  console.log(`Commit mesajı önerisi: ${report.commitMessage}`);
  printQualityWarnings();
}

main().catch((err) => fail(err.message || String(err)));
