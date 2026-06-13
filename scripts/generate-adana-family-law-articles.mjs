#!/usr/bin/env node
/**
 * Generate Adana family law articles via Google Gemini API (server-side only).
 * Usage: node scripts/generate-adana-family-law-articles.mjs
 * Overwrite: FORCE=1 node scripts/generate-adana-family-law-articles.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'content', 'articles');
const ENV_PATH = join(ROOT, '.env');

const LEGAL_DISCLAIMER =
  'Bu içerik genel bilgilendirme amacı taşır. Her somut olay kendi şartları içinde değerlendirilmelidir. Hak kaybı yaşamamak için aile hukuku alanında hukuki destek alınması önerilir.';

const EXPERT_BOX =
  'Bu içerik, Adana\'da aile hukuku, boşanma, nafaka ve velayet süreçleri üzerine çalışan **Av. Ceren Sümer Cilli** tarafından genel bilgilendirme amacıyla hazırlanmıştır.';

const ARTICLES = [
  {
    slug: 'adanada-bosanma-davasi-nasil-acilir',
    h1: "Adana'da Boşanma Davası Nasıl Açılır?",
    seoTitle: "Adana'da Boşanma Davası Nasıl Açılır? | Aile Hukuku Rehberi",
    metaDescription:
      "Adana'da boşanma davası açmak isteyenler için anlaşmalı ve çekişmeli boşanma, gerekli belgeler, dava süreci ve hukuki destek hakkında rehber.",
    focusKeyword: 'Adana boşanma avukatı',
    tags: ['Adana Boşanma Avukatı', 'Boşanma Davası', 'Aile Hukuku', 'Anlaşmalı Boşanma', 'Çekişmeli Boşanma'],
    sections: [
      "Adana'da Boşanma Davası Açmadan Önce Bilinmesi Gerekenler",
      'Anlaşmalı Boşanma ve Çekişmeli Boşanma Arasındaki Fark',
      'Boşanma Davası İçin Gerekli Belgeler',
      'Boşanma Dilekçesinde Nelere Yer Verilmelidir?',
      'Adana Aile Mahkemelerinde Süreç Nasıl İlerler?',
      'Nafaka, Velayet ve Mal Paylaşımı Talepleri',
      'Boşanma Davasında Delillerin Önemi',
      'Avukat Desteği Neden Önemlidir?',
      'Adana Aile Hukuku Sürecinde Hukuki Destek',
    ],
    faqQuestions: [
      "Adana'da boşanma davası hangi mahkemede açılır?",
      'Anlaşmalı boşanma ne kadar sürer?',
      'Çekişmeli boşanma davası uzun sürer mi?',
      'Boşanma davasında avukat tutmak zorunlu mudur?',
    ],
  },
  {
    slug: 'adanada-nafaka-davasi-ve-nafaka-artirim-sureci',
    h1: "Adana'da Nafaka Davası ve Nafaka Artırım Süreci",
    seoTitle: "Adana'da Nafaka Davası ve Nafaka Artırım Süreci",
    metaDescription:
      "Adana'da nafaka davası, yoksulluk nafakası, iştirak nafakası, tedbir nafakası ve nafaka artırım talepleri hakkında hukuki rehber.",
    focusKeyword: 'Adana nafaka avukatı',
    tags: ['Adana Nafaka Avukatı', 'Nafaka Davası', 'Nafaka Artırım', 'Yoksulluk Nafakası', 'İştirak Nafakası'],
    sections: [
      'Nafaka Nedir?',
      'Boşanma Sürecinde Tedbir Nafakası',
      'Yoksulluk Nafakası Hangi Şartlarda Talep Edilir?',
      'İştirak Nafakası ve Çocuğun Giderleri',
      'Nafaka Miktarı Nasıl Belirlenir?',
      'Nafaka Artırım Davası Nasıl Açılır?',
      'Nafakanın Kaldırılması veya Azaltılması Mümkün Müdür?',
      "Adana'da Nafaka Davalarında Delillerin Önemi",
      'Adana Nafaka Avukatı Desteği Neden Önemlidir?',
      'Adana Aile Hukuku Sürecinde Hukuki Destek',
    ],
    faqQuestions: [
      'Nafaka miktarı neye göre belirlenir?',
      'Nafaka artırımı ne zaman istenebilir?',
      'Çalışan eş nafaka alabilir mi?',
      'Çocuk için ödenen nafaka ne zaman sona erer?',
    ],
  },
  {
    slug: 'adanada-velayet-davasi-ve-cocugun-ustun-yarari',
    h1: "Adana'da Velayet Davası ve Çocuğun Üstün Yararı",
    seoTitle: "Adana'da Velayet Davası ve Çocuğun Üstün Yararı",
    metaDescription:
      "Adana'da velayet davası, geçici velayet, kişisel ilişki, çocuğun üstün yararı ve velayet değişikliği hakkında aile hukuku rehberi.",
    focusKeyword: 'Adana velayet avukatı',
    tags: ['Adana Velayet Avukatı', 'Velayet Davası', 'Geçici Velayet', 'Çocuğun Üstün Yararı', 'Aile Hukuku'],
    sections: [
      'Velayet Nedir?',
      'Boşanma Davasında Velayet Nasıl Belirlenir?',
      'Çocuğun Üstün Yararı İlkesi',
      'Anne veya Babanın Ekonomik Durumu Tek Başına Belirleyici midir?',
      'Geçici Velayet Nedir?',
      'Kişisel İlişki Kurulması Ne Anlama Gelir?',
      'Velayetin Değiştirilmesi Davası',
      'Sosyal İnceleme Raporunun Önemi',
      'Adana Velayet Avukatı Desteği Neden Önemlidir?',
      'Adana Aile Hukuku Sürecinde Hukuki Destek',
    ],
    faqQuestions: [
      'Velayet her zaman anneye mi verilir?',
      'Çocuğun yaşı velayet kararını etkiler mi?',
      'Velayet sonradan değiştirilebilir mi?',
      'Velayet davasında çocuğun görüşü alınır mı?',
    ],
  },
];

const SYSTEM = `Sen kıdemli Türk aile hukuku editörüsün. Site: adanaailehukuku.com — Avukat Ceren Sümer Cilli.

KURALLAR:
- Türkçe, profesyonel, sade, güven verici
- 900-1300 kelime
- H1, H2, H3 kullan (H2 ana bölümler, H3 alt detaylar)
- "Av. Ceren Sümer Cilli" veya "Avukat Ceren Sümer Cilli" 2-4 kez doğal geçsin
- Adana aile mahkemeleri, Adana boşanma/nafaka/velayet bağlamı
- Temkinli ifadeler: somut olaya göre değişebilir, hukuki destek önerilir
- YASAK: en iyi avukat, garantili sonuç, kesin kazanılır, mutlaka kazanılır, lider avukat
- Anahtar kelime doldurma yok
- Tablo kullanma
- İç linkler markdown formatında tam URL:
  https://adanaailehukuku.com/adana-bosanma-avukati/
  https://adanaailehukuku.com/adana-anlasmali-bosanma-avukati/
  https://adanaailehukuku.com/adana-cekismeli-bosanma-avukati/
  https://adanaailehukuku.com/adana-nafaka-davasi-avukati/
  https://adanaailehukuku.com/adana-velayet-davasi-avukati/
  https://adanaailehukuku.com/hakkimizda/
  https://adanaailehukuku.com/iletisim/`;

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

async function callGemini(apiKey, model, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.45, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('')?.trim();
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

function buildBodyPrompt(article) {
  return `Makale gövdesini yaz (meta/JSON-LD HARİÇ).

H1: ${article.h1}
Focus: ${article.focusKeyword}
Slug: ${article.slug}

Önce şu kutu metnini blockquote olarak ekle:
> ${EXPERT_BOX}

Sonra:
# ${article.h1}
**Kısa cevap:** 2-4 cümle

Şu H2 bölümlerini sırayla yaz (her bölümde en az bir H3 alt başlık kullan):
${article.sections.map((s) => `- ## ${s}`).join('\n')}

## Sık Sorulan Sorular
${article.faqQuestions.map((q) => `- ### ${q}`).join('\n')}
(Her soruya kısa cevap paragrafı)

Son satır:
**Hukuki uyarı:** ${LEGAL_DISCLAIMER}

900-1300 kelime. Uygulamada dilekçe, delil, tedbir nafakası, geçici velayet, sosyal inceleme, çocuğun üstün yararı gibi somut noktaları anlat.`;
}

function buildMetaPrompt(article) {
  return `Aşağıdaki makale için SADECE meta bölümünü yaz.

Başlık: ${article.h1}
Slug: ${article.slug}
SEO Title: ${article.seoTitle}
Meta Description: ${article.metaDescription}

## SEO Çıktıları
- SEO title, meta description, slug, focus keyword, secondary keywords

## FAQ Schema JSON-LD
(geçerli JSON, soru adlarında ### olmasın, ${article.faqQuestions.length} soru)

## Article Schema JSON-LD
(@type Article, author Person "Av. Ceren Sümer Cilli", publisher adanaailehukuku.com,
mainEntityOfPage https://adanaailehukuku.com/makaleler/${article.slug}/,
about: Aile Hukuku, Boşanma Davası, Nafaka, Velayet, Adana Aile Mahkemeleri — konuya uygun seç)

## AI Citation Summary
(3 madde)`;
}

function buildFrontmatter(article) {
  const today = new Date().toISOString().slice(0, 10);
  const tagsYaml = article.tags.map((t) => `  - "${t}"`).join('\n');
  return `---
title: "${article.seoTitle}"
description: "${article.metaDescription}"
slug: ${article.slug}
date: "${today}"
author: "Av. Ceren Sümer Cilli"
reviewer: "Av. Ceren Sümer Cilli"
category: "Aile Hukuku"
focusKeyword: "${article.focusKeyword}"
practiceArea: "Aile Hukuku, Boşanma Hukuku, Nafaka, Velayet"
location: "Adana"
secondaryKeywords:
${tagsYaml}
---

`;
}

async function generateArticle(apiKey, model, article) {
  const body = await callGemini(apiKey, model, buildBodyPrompt(article));
  await new Promise((r) => setTimeout(r, 2000));
  const meta = await callGemini(apiKey, model, buildMetaPrompt(article));
  return body + '\n\n---\n\n' + meta;
}

async function main() {
  const env = loadEnv();
  const apiKey = getApiKey(env);
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const force = process.env.FORCE === '1';

  if (!apiKey) {
    console.error('HATA: GEMINI_API_KEY (veya GOOGLE_GEMINI_API_KEY) .env içinde bulunamadı.');
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Model: ${model} | Makale: ${ARTICLES.length}\n`);

  for (const article of ARTICLES) {
    const outPath = join(OUTPUT_DIR, `${article.slug}.md`);
    if (existsSync(outPath) && !force) {
      console.warn(`ATLA (mevcut): ${article.slug}.md — üzerine yazmak için FORCE=1`);
      continue;
    }

    console.log(`Üretiliyor: ${article.h1}...`);
    try {
      const content = await generateArticle(apiKey, model, article);
      writeFileSync(outPath, buildFrontmatter(article) + content, 'utf8');
      const words = content.split(/\s+/).length;
      console.log(`  OK ${article.slug}.md (~${words} kelime)\n`);
    } catch (err) {
      console.error(`  HATA ${article.slug}: ${err.message}\n`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('Tamamlandı.');
}

main();
