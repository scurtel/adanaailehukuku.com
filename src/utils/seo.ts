import { SITE_NAME, SITE_URL } from '../consts';

const siteNamePattern = SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Avoid double "| Avukat Ceren Sümer Cilli" in document titles. */
export function formatPageTitle(title: string, path: string): string {
  const stripped = title
    .replace(new RegExp(`\\s*\\|\\s*${siteNamePattern}\\s*$`, 'i'), '')
    .replace(new RegExp(`^${siteNamePattern}\\s*\\|\\s*`, 'i'), '')
    .trim();

  if (path === '/' || path === '/hakkimizda/' || path === '/hakkimizda') {
    // Hakkımızda: "Avukat Ceren Sümer Cilli | Aile Hukuku Çalışmaları"
    if (path.startsWith('/hakkimizda')) {
      return title.includes(SITE_NAME) ? title.trim() : `${SITE_NAME} | ${stripped}`;
    }
    return title.trim() || stripped;
  }

  if (new RegExp(siteNamePattern, 'i').test(title)) {
    return title.trim();
  }

  return `${stripped} | ${SITE_NAME}`;
}

export function toIsoDate(date?: Date): string | undefined {
  if (!date) return undefined;
  return date.toISOString().slice(0, 10);
}

export function articleOgImage(): string {
  return `${SITE_URL}/og/article-default.svg`;
}
