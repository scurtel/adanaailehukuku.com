import { marked } from 'marked';
import {
  ARTICLE_SLUGS,
  AUTHOR_PROFILE_URL,
  BUSINESS_NAP,
  LEGAL_SERVICE_ENTITY_ID,
  OG_IMAGE_URL,
  PAGE_SLUGS,
  PERSON_ENTITY_ID,
  PROFILE_LINKS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  WEBSITE_ENTITY_ID,
} from '../consts';

export interface RelatedLink {
  title: string;
  href: string;
}

const META_START = /^## (SEO Çıktıları|FAQ Schema JSON-LD|Schema JSON-LD|Article Schema JSON-LD|AI Citation Summary)/m;
const RELATED_HEADING = /^## İlgili (makaleler|yazılar)\s*$/m;
const GEMINI_JSON_BLOCK =
  /\n---\n\n```json\s*[\s\S]*?```|\n```json\s*\{[\s\S]*?"(?:seo_outputs|faq_schema_json_ld|article_schema_json_ld)"[\s\S]*?```/g;

/** AI chat / generation notes that must never render as page content. */
const AI_PREAMBLE_BLOCK =
  /\n---\n+\n?(?:Harika[,\s][\s\S]*?(?:meta bölümünü|SEO(?:\s+çıktı|\s+odaklı)?|hazırlıyorum|hazırlayalım)[^\n]*)\n+\n?---\n+/gi;
const AI_PREAMBLE_LINE =
  /^(?:Harika[,\s].*(?:meta bölümünü|SEO|hazırlıyorum|hazırlayalım).*|(?:İşte\s+)?SEO çıktıları\b.*|Aşağıda istediğiniz içerik.*)\n+/gim;

/** Remove raw Gemini meta JSON accidentally left in article body (not valid schema blocks). */
export function stripVisibleJsonArtifacts(raw: string): string {
  return raw.replace(GEMINI_JSON_BLOCK, '\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

/** Strip generation-assistant preamble; does not remove incidental words like “harika” in legal prose. */
export function stripAiGenerationArtifacts(raw: string): string {
  return raw
    .replace(AI_PREAMBLE_BLOCK, '\n\n')
    .replace(AI_PREAMBLE_LINE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

/** FAQ schema question names must be plain text (no markdown heading/list markers). */
export function sanitizeFaqQuestionName(name: string): string {
  return name
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*•]\s+/, '')
    .trim();
}

function sanitizeFaqSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema['@type'] !== 'FAQPage') return schema;
  const entities = schema.mainEntity;
  if (!Array.isArray(entities)) return schema;
  for (const item of entities) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    if (typeof q.name === 'string') q.name = sanitizeFaqQuestionName(q.name);
  }
  return schema;
}

const articleSlugSet = new Set<string>(ARTICLE_SLUGS);
const pageSlugSet = new Set<string>(PAGE_SLUGS);

export function resolveInternalPath(pathname: string): string {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean) return '/';
  if (articleSlugSet.has(clean)) return `/makaleler/${clean}/`;
  if (pageSlugSet.has(clean)) return `/${clean}/`;
  return `/${clean}/`;
}

export function normalizeHref(href: string): string {
  if (href.startsWith('/')) return href.endsWith('/') ? href : `${href}/`;
  try {
    const url = new URL(href);
    if (url.hostname !== 'adanaailehukuku.com' && url.hostname !== 'www.adanaailehukuku.com') {
      return href;
    }
    return resolveInternalPath(url.pathname);
  } catch {
    return href;
  }
}

function extractRelatedSection(section: string): RelatedLink[] {
  const links: RelatedLink[] = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(section)) !== null) {
    links.push({ title: match[1], href: normalizeHref(match[2]) });
  }
  return links;
}

function normalizeExtractedSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const mep = schema.mainEntityOfPage as Record<string, unknown> | undefined;
  if (mep?.['@id'] && typeof mep['@id'] === 'string') {
    const id = mep['@id'] as string;
    const slugMatch = id.match(/adanaailehukuku\.com\/([^/]+)\/?$/);
    if (slugMatch && articleSlugSet.has(slugMatch[1]) && !id.includes('/makaleler/')) {
      mep['@id'] = `${SITE_URL}/makaleler/${slugMatch[1]}/`;
    }
  }
  return sanitizeFaqSchema(schema);
}

function extractJsonLdBlocks(text: string): Record<string, unknown>[] {
  const schemas: Record<string, unknown>[] = [];
  const re = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as Record<string, unknown>;
      if (parsed['@type']) schemas.push(normalizeExtractedSchema(parsed));
    } catch {
      /* skip invalid json */
    }
  }
  return schemas;
}

export function parseMarkdownBody(raw: string) {
  const sanitized = stripAiGenerationArtifacts(stripVisibleJsonArtifacts(raw));
  const metaIndex = sanitized.search(META_START);
  const bodyWithMaybeRelated = metaIndex >= 0 ? sanitized.slice(0, metaIndex) : sanitized;
  const metaTail = metaIndex >= 0 ? sanitized.slice(metaIndex) : '';

  let mainBody = bodyWithMaybeRelated;
  let relatedLinks: RelatedLink[] = [];

  const relatedMatch = bodyWithMaybeRelated.match(RELATED_HEADING);
  if (relatedMatch?.index !== undefined) {
    const before = bodyWithMaybeRelated.slice(0, relatedMatch.index).trimEnd();
    const afterStart = relatedMatch.index + relatedMatch[0].length;
    const after = bodyWithMaybeRelated.slice(afterStart);
    const nextHeading = after.search(/^## /m);
    const relatedSection = nextHeading >= 0 ? after.slice(0, nextHeading) : after;
    relatedLinks = extractRelatedSection(relatedSection);
    mainBody = before;
  }

  const seoLinks = extractRelatedSection(
    metaTail.match(/## SEO Çıktıları[\s\S]*?(?=^## |\Z)/m)?.[0] ?? '',
  );
  const internalSuggestions = seoLinks.filter(
    (l, i, arr) => arr.findIndex((x) => x.href === l.href) === i,
  );
  const mergedRelated = [...relatedLinks];
  for (const link of internalSuggestions) {
    if (!mergedRelated.some((l) => l.href === link.href)) mergedRelated.push(link);
  }

  const schemas = extractJsonLdBlocks(metaTail);

  let html = marked.parse(mainBody.trim(), { async: false }) as string;
  html = html.replace(/href="(https?:\/\/(?:www\.)?adanaailehukuku\.com)([^"]*)"/g, (_, _host, path) => {
    return `href="${normalizeHref(`https://adanaailehukuku.com${path}`)}"`;
  });

  return { html, relatedLinks: mergedRelated, schemas };
}

export function buildArticleSchema(input: {
  title: string;
  description: string;
  slug: string;
  date?: Date;
  author?: string;
  image?: string;
}) {
  const iso = input.date?.toISOString().slice(0, 10) ?? '2026-05-15';
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    image: input.image ?? `${SITE_URL}/og/article-default.svg`,
    author: {
      '@type': 'Person',
      '@id': PERSON_ENTITY_ID,
      name: input.author ?? SITE_NAME,
      url: AUTHOR_PROFILE_URL,
    },
    publisher: {
      '@type': 'Organization',
      '@id': LEGAL_SERVICE_ENTITY_ID,
      name: SITE_NAME,
    },
    datePublished: iso,
    dateModified: iso,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/makaleler/${input.slug}/`,
    },
  };
}

export function buildLegalServiceSchema(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: `${SITE_NAME} - ${input.title}`,
    url: `${SITE_URL}${input.path}`,
    telephone: BUSINESS_NAP.telephone,
    areaServed: [
      { '@type': 'City', name: 'Adana' },
      { '@type': 'Place', name: 'Seyhan' },
      { '@type': 'Place', name: 'Çukurova' },
      { '@type': 'Place', name: 'Yüreğir' },
      { '@type': 'Place', name: 'Sarıçam' },
    ],
    serviceType: 'Aile Hukuku',
    description: input.description,
    provider: {
      '@type': 'Person',
      '@id': PERSON_ENTITY_ID,
      name: SITE_NAME,
      url: AUTHOR_PROFILE_URL,
    },
  };
}

export function buildPersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ENTITY_ID,
    name: BUSINESS_NAP.personName,
    honorificPrefix: BUSINESS_NAP.honorificPrefix,
    alternateName: SITE_NAME,
    jobTitle: 'Avukat',
    url: AUTHOR_PROFILE_URL,
    worksFor: {
      '@type': 'LegalService',
      '@id': LEGAL_SERVICE_ENTITY_ID,
      name: SITE_NAME,
    },
    knowsAbout: [
      'Aile Hukuku',
      'Boşanma Hukuku',
      'Velayet',
      'Nafaka',
      'Mal Rejiminin Tasfiyesi',
      'Aile Konutu',
      'Ziynet Alacağı',
    ],
    sameAs: PROFILE_LINKS.map((l) => l.href),
  };
}

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    '@id': LEGAL_SERVICE_ENTITY_ID,
    name: BUSINESS_NAP.name,
    url: SITE_URL,
    image: OG_IMAGE_URL,
    telephone: BUSINESS_NAP.telephone,
    email: BUSINESS_NAP.email,
    description:
      "Adana'da aile hukuku, boşanma, velayet, nafaka ve mal paylaşımı alanında avukatlık ve hukuki danışmanlık.",
    areaServed: [
      { '@type': 'City', name: 'Adana' },
      { '@type': 'Place', name: 'Seyhan' },
      { '@type': 'Place', name: 'Çukurova' },
      { '@type': 'Place', name: 'Yüreğir' },
      { '@type': 'Place', name: 'Sarıçam' },
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS_NAP.streetAddress,
      addressLocality: BUSINESS_NAP.addressLocality,
      addressRegion: BUSINESS_NAP.addressRegion,
      postalCode: BUSINESS_NAP.postalCode,
      addressCountry: BUSINESS_NAP.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS_NAP.latitude,
      longitude: BUSINESS_NAP.longitude,
    },
    openingHours: BUSINESS_NAP.openingHours,
    sameAs: PROFILE_LINKS.map((l) => l.href),
    employee: { '@id': PERSON_ENTITY_ID },
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ENTITY_ID,
    name: SITE_NAME,
    alternateName: `${SITE_NAME} - ${SITE_TAGLINE}`,
    url: SITE_URL,
    inLanguage: 'tr-TR',
    publisher: { '@id': LEGAL_SERVICE_ENTITY_ID },
    about: { '@id': LEGAL_SERVICE_ENTITY_ID },
  };
}

/** About page @graph: WebPage + Person + LegalService + BreadcrumbList */
export function buildAboutPageGraph() {
  const webpageId = `${SITE_URL}/hakkimizda/#webpage`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': webpageId,
        url: AUTHOR_PROFILE_URL,
        name: 'Avukat Ceren Sümer Cilli Hakkında',
        description:
          'Avukat Ceren Sümer Cilli’nin aile hukuku, boşanma, velayet, nafaka ve mal rejimi alanındaki çalışmaları, hukuki yayınları ve mesleki profili.',
        isPartOf: { '@id': WEBSITE_ENTITY_ID },
        about: { '@id': PERSON_ENTITY_ID },
        mainEntity: { '@id': PERSON_ENTITY_ID },
        breadcrumb: { '@id': `${SITE_URL}/hakkimizda/#breadcrumb` },
        inLanguage: 'tr-TR',
      },
      {
        '@type': 'Person',
        '@id': PERSON_ENTITY_ID,
        name: BUSINESS_NAP.personName,
        honorificPrefix: BUSINESS_NAP.honorificPrefix,
        alternateName: SITE_NAME,
        jobTitle: 'Avukat',
        url: AUTHOR_PROFILE_URL,
        image: OG_IMAGE_URL,
        worksFor: { '@id': LEGAL_SERVICE_ENTITY_ID },
        knowsAbout: [
          'Aile Hukuku',
          'Boşanma Hukuku',
          'Velayet',
          'Nafaka',
          'Mal Rejiminin Tasfiyesi',
          'Aile Konutu',
          'Ziynet Alacağı',
        ],
        sameAs: PROFILE_LINKS.map((l) => l.href),
        address: {
          '@type': 'PostalAddress',
          streetAddress: BUSINESS_NAP.streetAddress,
          addressLocality: BUSINESS_NAP.addressLocality,
          addressRegion: BUSINESS_NAP.addressRegion,
          postalCode: BUSINESS_NAP.postalCode,
          addressCountry: BUSINESS_NAP.addressCountry,
        },
        email: BUSINESS_NAP.email,
        telephone: BUSINESS_NAP.telephone,
      },
      {
        '@type': 'LegalService',
        '@id': LEGAL_SERVICE_ENTITY_ID,
        name: SITE_NAME,
        alternateName: `${SITE_NAME} - ${SITE_TAGLINE}`,
        url: SITE_URL,
        telephone: BUSINESS_NAP.telephone,
        email: BUSINESS_NAP.email,
        image: OG_IMAGE_URL,
        address: {
          '@type': 'PostalAddress',
          streetAddress: BUSINESS_NAP.streetAddress,
          addressLocality: BUSINESS_NAP.addressLocality,
          addressRegion: BUSINESS_NAP.addressRegion,
          postalCode: BUSINESS_NAP.postalCode,
          addressCountry: BUSINESS_NAP.addressCountry,
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: BUSINESS_NAP.latitude,
          longitude: BUSINESS_NAP.longitude,
        },
        areaServed: [
          { '@type': 'City', name: 'Adana' },
          { '@type': 'Place', name: 'Seyhan' },
          { '@type': 'Place', name: 'Çukurova' },
          { '@type': 'Place', name: 'Yüreğir' },
          { '@type': 'Place', name: 'Sarıçam' },
        ],
        serviceType: 'Aile Hukuku',
        employee: { '@id': PERSON_ENTITY_ID },
        sameAs: PROFILE_LINKS.map((l) => l.href),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}/hakkimizda/#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Ana Sayfa',
            item: `${SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Hakkımızda',
            item: AUTHOR_PROFILE_URL,
          },
        ],
      },
    ],
  };
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function mergeSchemas(...groups: Record<string, unknown>[][]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const result: Record<string, unknown>[] = [];
  for (const group of groups) {
    for (const schema of group) {
      const key = `${String(schema['@type'] ?? '')}:${String(schema['@id'] ?? schema.name ?? result.length)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(schema);
    }
  }
  return result;
}

export function stripHomeDisplaySections(raw: string): string {
  return raw
    .replace(/^## Hero[\s\S]*?(?=^## )/m, '')
    .replace(/^## Hizmetler[\s\S]*?(?=^## )/m, '')
    .replace(/^## Son makaleler[\s\S]*?(?=^## )/m, '')
    .replace(/^## Footer[\s\S]*?(?=^## SEO)/m, '');
}

export function canonicalUrl(path: string): string {
  if (path === '/' || path === '') return `${SITE_URL}/`;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized.endsWith('/') ? normalized : `${normalized}/`}`;
}
