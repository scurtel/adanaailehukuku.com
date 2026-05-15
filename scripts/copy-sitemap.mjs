import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const src = join('dist', 'sitemap-0.xml');
const dest = join('dist', 'sitemap.xml');

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log('sitemap.xml oluşturuldu (sitemap-0.xml kopyalandı).');
} else if (existsSync(join('dist', 'sitemap-index.xml'))) {
  console.warn('sitemap-0.xml bulunamadı; sitemap-index.xml kullanılabilir.');
}
