import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';
import { wwwRedirectLocation } from './lib/canonical-host.mjs';
import { listenDistServer } from './serve-dist.mjs';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const APEX = 'https://adanaailehukuku.com';

const NOINDEX_SLUGS = [
  'uludag-sozluk-pazar-degeri-eksi-sozluk',
  'bosanma-davasi-nasil-acilir-adana',
  'velayet-davasi-mahkeme-kriterleri',
];

const KEY_PAGES = [
  '/',
  '/adana-bosanma-avukati/',
  '/adana-aile-hukuku-avukati/',
  '/adana-anlasmali-bosanma-avukati/',
  '/hakkimizda/',
  '/iletisim/',
  '/makaleler/',
  '/makaleler/istirak-nafakasi-rehberi/',
  '/makaleler/adanada-bosanma-davasi-nasil-acilir/',
  '/robots.txt',
  '/sitemap.xml',
];

function fail(message) {
  throw new Error(message);
}

function readDist(rel) {
  const path = join(DIST, rel);
  if (!existsSync(path)) fail(`Eksik dist dosyası: ${rel}`);
  return readFileSync(path, 'utf8');
}

function request({ port, path, host, method = 'GET' }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: { Host: host },
        timeout: 5000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers.location,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${host}${path}`));
    });
    req.on('error', reject);
    req.end();
  });
}

function assertBuildArtifacts() {
  const robots = readDist('robots.txt');
  if (!robots.includes('User-agent: *') || !robots.includes('Allow: /')) {
    fail('robots.txt Allow: / içermiyor');
  }
  if (robots.includes('Disallow: /')) fail('robots.txt yanlışlıkla Disallow: / içeriyor');
  if (!robots.includes(`Sitemap: ${APEX}/sitemap.xml`)) {
    fail('robots.txt canonical sitemap adresini göstermiyor');
  }

  const htaccess = readDist('.htaccess');
  if (!htaccess.includes('www\\.adanaailehukuku\\.com') || !htaccess.includes('[R=301,L]')) {
    fail('.htaccess www → non-www 301 kuralı eksik');
  }
  if (!htaccess.includes('ErrorDocument 404 /404.html')) {
    fail('.htaccess ErrorDocument 404 eksik');
  }

  const sitemap = readDist('sitemap.xml');
  if (!sitemap.includes(`${APEX}/`)) fail('sitemap.xml ana sayfayı içermiyor');
  if (sitemap.includes('www.adanaailehukuku.com')) fail('sitemap.xml www URL içeriyor');
  for (const slug of NOINDEX_SLUGS) {
    if (sitemap.includes(`/makaleler/${slug}/`)) {
      fail(`sitemap.xml noindex URL içeriyor: ${slug}`);
    }
  }
  if (sitemap.includes('/404')) fail('sitemap.xml 404 URL içeriyor');

  const home = readDist('index.html');
  if (!home.includes('name="robots" content="index, follow"')) {
    fail('ana sayfa index, follow değil');
  }
  if (!home.includes(`rel="canonical" href="${APEX}/"`)) {
    fail('ana sayfa self-canonical yanlış');
  }
  const ldBlocks = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]),
  );
  const topLevelLegal = ldBlocks.filter((block) => block['@type'] === 'LegalService');
  if (topLevelLegal.length !== 1) {
    fail(`ana sayfada üst seviye LegalService sayısı ${topLevelLegal.length}, beklenen 1`);
  }
  if (!ldBlocks.some((block) => block['@type'] === 'BreadcrumbList')) fail('ana sayfada BreadcrumbList yok');
  if (!ldBlocks.some((block) => block['@type'] === 'FAQPage')) fail('ana sayfada FAQPage yok');
  for (const slug of NOINDEX_SLUGS) {
    if (home.includes(`/makaleler/${slug}/`) || home.includes(`/${slug}/`)) {
      fail(`ana sayfa noindex/eski makale URL'sine link veriyor: ${slug}`);
    }
  }
  if (!home.includes('/makaleler/adana-aile-hukuku-rehberi/')) {
    fail('ana sayfada güncel rehber URL yok');
  }
  if (!home.includes('/makaleler/adanada-bosanma-davasi-nasil-acilir/')) {
    fail('ana sayfada güncel boşanma makalesi URL yok');
  }

  const service = readDist('adana-bosanma-avukati/index.html');
  if (!service.includes('name="robots" content="index, follow"')) {
    fail('hizmet sayfası noindex olmuş');
  }
  if (!service.includes(`rel="canonical" href="${APEX}/adana-bosanma-avukati/"`)) {
    fail('hizmet sayfası canonical değişmiş');
  }

  const notFound = readDist('404.html');
  if (!notFound.includes('noindex')) fail('404.html noindex değil');
}

async function assertHttp() {
  const loc = wwwRedirectLocation('www.adanaailehukuku.com', '/iletisim/?ref=1');
  if (loc !== `${APEX}/iletisim/?ref=1`) {
    fail(`wwwRedirectLocation beklenen Location üretmedi: ${loc}`);
  }
  if (wwwRedirectLocation('adanaailehukuku.com', '/') !== null) {
    fail('apex host için yönlendirme üretilmemeli');
  }

  const port = 4179;
  const server = await listenDistServer(DIST, port, '127.0.0.1');
  try {
    for (const path of KEY_PAGES) {
      const res = await request({ port, path, host: '127.0.0.1' });
      if (res.status !== 200) fail(`${path} HTTP ${res.status}, beklenen 200`);
    }

    const missing = await request({
      port,
      path: '/this-page-does-not-exist-seo-test/',
      host: '127.0.0.1',
    });
    if (missing.status !== 404) fail(`geçersiz URL HTTP ${missing.status}, beklenen 404`);
    if (!missing.body.includes('Sayfa Bulunamadı') && !missing.body.includes('noindex')) {
      fail('404 yanıtı Astro 404 sayfası değil');
    }

    const wwwHome = await request({
      port,
      path: '/adana-bosanma-avukati/?utm=test',
      host: 'www.adanaailehukuku.com',
    });
    if (wwwHome.status !== 301) fail(`www yönlendirmesi HTTP ${wwwHome.status}, beklenen 301`);
    if (wwwHome.location !== `${APEX}/adana-bosanma-avukati/?utm=test`) {
      fail(`www Location yanlış: ${wwwHome.location}`);
    }

    const slash = await request({
      port,
      path: '/iletisim',
      host: '127.0.0.1',
    });
    if (slash.status !== 301 || slash.location !== '/iletisim/') {
      fail(`trailing slash yönlendirmesi beklenen gibi değil: ${slash.status} ${slash.location}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

assertBuildArtifacts();
await assertHttp();
console.log('SEO doğrulama başarılı.');
