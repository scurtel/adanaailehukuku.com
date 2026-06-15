import { marked } from 'marked';
import {
  ARTICLE_SLUGS,
  BUSINESS_NAP,
  OG_IMAGE_URL,
  PAGE_SLUGS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from '../consts';

export interface RelatedLink {
  title: string;
  href: string;
}

const META_START = /^## (SEO Çıktıları|FAQ Schema JSON-LD|Schema JSON-LD|Article Schema JSON-LD|AI Citation Summary)/m;
const RELATED_HEADING = /^## İlgili (makaleler|yazılar)\s*$/m;
const GEMINI_JSON_BLOCK =
  /\n---\n\n```json\s*[\s\S]*?```|\n```json\s*\{[\s\S]*?"(?:seo_outputs|faq_schema_json_ld|article_schema_json_ld)"[\s\S]*?```/g;

/** Remove raw Gemini meta JSON accidentally left in article body (not valid schema blocks). */
export function stripVisibleJsonArtifacts(raw: string): string {
  return raw.replace(GEMINI_JSON_BLOCK, '\n').replace(/\n{3,}/g, '\n\n').trimEnd();
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
  return schema;
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
  const sanitized = stripVisibleJsonArtifacts(raw);
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
      '@id': `${SITE_URL}/hakkimizda/#person`,
      name: input.author ?? 'Av. Ceren Sümer Cilli',
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
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
      '@id': `${SITE_URL}/hakkimizda/#person`,
      name: SITE_NAME,
    },
  };
}

export function buildPersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/hakkimizda/#person`,
    name: BUSINESS_NAP.name,
    jobTitle: 'Avukat',
    worksFor: {
      '@type': 'LegalService',
      '@id': `${SITE_URL}/#organization`,
      name: `${BUSINESS_NAP.name} - ${SITE_TAGLINE}`,
    },
    knowsAbout: [
      'Adana aile hukuku',
      'boşanma davaları',
      'velayet davaları',
      'nafaka davaları',
      'mal paylaşımı',
    ],
    sameAs: [
      'https://www.cerensumer.av.tr/adana-bosanma-avukati-ceren-sumer-cilli-kimdir/',
      BUSINESS_NAP.mapsPlaceUrl,
      'https://www.linkedin.com/in/avukat-ceren-s%C3%BCmer-cilli-375873b0/',
      'https://www.instagram.com/av.cerensumercilli/',
      'https://www.facebook.com/cerensumercilli/',
    ],
  };
}

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    '@id': `${SITE_URL}/#organization`,
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
    sameAs: [
      'https://www.cerensumer.av.tr/adana-bosanma-avukati-ceren-sumer-cilli-kimdir/',
      BUSINESS_NAP.mapsPlaceUrl,
      'https://www.linkedin.com/in/avukat-ceren-s%C3%BCmer-cilli-375873b0/',
      'https://www.instagram.com/av.cerensumercilli/',
      'https://www.facebook.com/cerensumercilli/',
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
