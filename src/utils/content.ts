import { getCollection, type CollectionEntry } from 'astro:content';

export type ArticleEntry = CollectionEntry<'articles'>;
export type PageEntry = CollectionEntry<'pages'>;

export function getArticleSlug(entry: ArticleEntry): string {
  return entry.data.slug ?? entry.id.replace(/\.md$/, '');
}

export function getPageSlug(entry: PageEntry): string {
  const fileSlug = entry.id.replace(/\.md$/, '');
  if (fileSlug === 'ana-sayfa') return '';
  const fromFrontmatter = entry.data.slug?.trim();
  if (fromFrontmatter) return fromFrontmatter;
  return fileSlug;
}

export function getPagePath(entry: PageEntry): string {
  const slug = getPageSlug(entry);
  return slug ? `/${slug}/` : '/';
}

export async function getArticlesSorted(): Promise<ArticleEntry[]> {
  const articles = await getCollection('articles');
  return articles.sort((a, b) => {
    const da = a.data.date?.getTime() ?? 0;
    const db = b.data.date?.getTime() ?? 0;
    return db - da;
  });
}

export async function getServicePages(): Promise<PageEntry[]> {
  const pages = await getCollection('pages');
  return pages
    .filter((p) => p.id !== 'ana-sayfa.md')
    .sort((a, b) => a.data.title.localeCompare(b.data.title, 'tr'));
}

export async function getHomePage(): Promise<PageEntry | undefined> {
  const pages = await getCollection('pages');
  return pages.find((p) => p.id.replace(/\.md$/, '') === 'ana-sayfa');
}
