import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://adanaailehukuku.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
