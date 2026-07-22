import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const NOINDEX_PATH_SEGMENTS = [
  '/404',
  '/makaleler/bosanma-davasi-nasil-acilir-adana/',
  '/makaleler/velayet-davasi-mahkeme-kriterleri/',
];

function loadContentLastmod() {
  const map = new Map();
  for (const dir of ['content/articles', 'content/pages']) {
    const fullDir = join(process.cwd(), dir);
    try {
      for (const file of readdirSync(fullDir)) {
        if (!file.endsWith('.md')) continue;
        const raw = readFileSync(join(fullDir, file), 'utf8');
        const dateMatch = raw.match(/^date:\s*"?([^"\n]+)"?/m);
        if (!dateMatch) continue;
        const slugMatch = raw.match(/^slug:\s*(.+)$/m);
        const fileSlug = file.replace(/\.md$/, '');
        const slug = slugMatch?.[1]?.trim() || fileSlug;
        const path =
          dir.includes('articles')
            ? `https://adanaailehukuku.com/makaleler/${slug}/`
            : slug === '' || fileSlug === 'ana-sayfa'
              ? 'https://adanaailehukuku.com/'
              : `https://adanaailehukuku.com/${slug}/`;
        map.set(path, new Date(dateMatch[1]).toISOString());
      }
    } catch {
      /* ignore missing dirs during tooling */
    }
  }
  return map;
}

const contentLastmod = loadContentLastmod();

export default defineConfig({
  site: 'https://adanaailehukuku.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !NOINDEX_PATH_SEGMENTS.some((segment) => page.includes(segment)),
      serialize(item) {
        const lastmod = contentLastmod.get(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
