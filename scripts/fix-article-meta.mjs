#!/usr/bin/env node
/**
 * Fix articles where Gemini meta was saved as raw JSON instead of parseable sections.
 * Usage: node scripts/fix-article-meta.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES_DIR = join(ROOT, 'content', 'articles');

const SLUGS = [
  'uludag-sozluk-pazar-degeri-eksi-sozluk',
  'aym-suresiz-nafaka-duzenlemesini-iptal-etti',
  'adanada-bosanma-davasi-nasil-acilir',
  'adanada-nafaka-davasi-ve-nafaka-artirim-sureci',
  'adanada-velayet-davasi-ve-cocugun-ustun-yarari',
];

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

function parseFrontmatter(raw) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Frontmatter bulunamadı');
  return { frontmatter: match[1], body: match[2] };
}

function stripBadMeta(body) {
  let cleaned = body.replace(/\n---\n\n```json[\s\S]*?"seo_outputs"[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/\n```json[\s\S]*?"seo_outputs"[\s\S]*?```/g, '');
  const idx = cleaned.search(/\n---\n\n```json/);
  if (idx >= 0) cleaned = cleaned.slice(0, idx);
  const metaIdx = cleaned.search(/^## SEO Çıktıları/m);
  if (metaIdx >= 0) cleaned = cleaned.slice(0, metaIdx);
  return cleaned.trimEnd();
}

function buildMetaSection(article, faqPairs) {
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
    headline: article.title,
    description: article.description,
    author: { '@type': 'Person', name: 'Av. Ceren Sümer Cilli' },
    publisher: { '@type': 'Organization', name: 'adanaailehukuku.com' },
    datePublished: article.date,
    dateModified: article.date,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://adanaailehukuku.com/makaleler/${article.slug}/`,
    },
    about: [
      { '@type': 'Thing', name: 'Aile Hukuku' },
      { '@type': 'Thing', name: 'Boşanma Davası' },
      { '@type': 'Thing', name: 'Nafaka' },
      { '@type': 'Thing', name: 'Velayet' },
      { '@type': 'Thing', name: 'Adana Aile Mahkemeleri' },
    ],
  };

  const secondary = article.secondaryKeywords || [];
  const internalLinks = [
    '- [Adana Boşanma Avukatı](https://adanaailehukuku.com/adana-bosanma-avukati/) — `adana-bosanma-avukati`',
    '- [Adana Nafaka Davası Avukatı](https://adanaailehukuku.com/adana-nafaka-davasi-avukati/) — `adana-nafaka-davasi-avukati`',
    '- [Adana Velayet Davası Avukatı](https://adanaailehukuku.com/adana-velayet-davasi-avukati/) — `adana-velayet-davasi-avukati`',
    '- [Hakkımızda](https://adanaailehukuku.com/hakkimizda/) — `hakkimizda`',
    '- [İletişim](https://adanaailehukuku.com/iletisim/) — `iletisim`',
  ].join('\n  ');

  return `
## SEO Çıktıları

- **SEO title:** ${article.title}
- **Meta description:** ${article.description}
- **Slug:** ${article.slug}
- **Focus keyword:** ${article.focusKeyword}
- **Secondary keywords:** ${secondary.join(', ')}
- **İç link önerileri:**
  ${internalLinks}

## FAQ Schema JSON-LD

\`\`\`json
${JSON.stringify(faqSchema, null, 2)}
\`\`\`

## Article Schema JSON-LD

\`\`\`json
${JSON.stringify(articleSchema, null, 2)}
\`\`\`

## AI Citation Summary

1. ${article.title} konusunda Adana aile mahkemeleri uygulamasına yönelik genel bilgilendirme sunar.
2. Dilekçe hazırlığı, delil sunumu ve hukuki destek almanın önemi vurgulanır.
3. Av. Ceren Sümer Cilli tarafından hazırlanan içerik, somut olaya göre değişebileceği belirtilerek temkinli bir çerçeve sunar.
`.trim();
}

function loadArticleMeta(frontmatterText) {
  const get = (key) => {
    const m = frontmatterText.match(new RegExp(`^${key}:\\s*"?(.+?)"?\\s*$`, 'm'));
    return m ? m[1] : '';
  };
  const secondary = [];
  const secBlock = frontmatterText.match(/^secondaryKeywords:\n((?:\s+- .+\n?)+)/m);
  if (secBlock) {
    for (const line of secBlock[1].split('\n')) {
      const t = line.match(/^\s+-\s*"(.+)"\s*$/);
      if (t) secondary.push(t[1]);
    }
  }
  return {
    title: get('title'),
    description: get('description'),
    slug: get('slug'),
    date: get('date'),
    focusKeyword: get('focusKeyword'),
    secondaryKeywords: secondary,
  };
}

for (const slug of SLUGS) {
  const path = join(ARTICLES_DIR, `${slug}.md`);
  const raw = readFileSync(path, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);
  const article = loadArticleMeta(frontmatter);
  const cleanBody = stripBadMeta(body);
  const faqPairs = extractFaqPairs(cleanBody);
  const meta = buildMetaSection(article, faqPairs);
  const fixed = `---\n${frontmatter}\n---\n\n${cleanBody}\n\n${meta}\n`;
  writeFileSync(path, fixed, 'utf8');
  console.log(`Düzeltildi: ${slug}.md (${faqPairs.length} FAQ)`);
}

console.log('Tamamlandı.');
