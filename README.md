# adanaailehukuku.com

Adana aile hukuku, boşanma, velayet, nafaka ve mal paylaşımı alanında bilgilendirici içerik sitesi. **Avukat Ceren Sümer Cilli** için Astro tabanlı statik site.

## Teknoloji

- [Astro 5](https://astro.build) (statik site üretimi)
- Markdown içerik (`content/pages`, `content/articles`)
- Hostinger Node.js Web App + GitHub deploy

## Yerel geliştirme

```bash
npm install
npm run dev
```

Site: http://localhost:4321

## Build

```bash
npm install
npm run build
```

Çıktı klasörü: `dist/`

Build sonrası `dist/sitemap.xml` otomatik oluşturulur (`postbuild`).

## Önizleme (production build)

```bash
npm run build
npm run preview
```

## Hostinger Node.js Web App

Hostinger panelinde **Node.js Web App** oluşturun ve GitHub reposunu bağlayın.

| Ayar | Değer |
|------|--------|
| **Build command** | `npm install && npm run build` |
| **Start command** | `npm start` |
| **Output / root** | `dist` (statik dosyalar build sonrası burada) |
| **Node version** | `20` veya `22` |

`npm start`, `astro preview --host 0.0.0.0` ile `dist/` klasörünü sunar. Hostinger’ın atadığı `PORT` ortam değişkeni otomatik kullanılır.

### Ortam değişkenleri

- `.env` dosyası repoya **eklenmez** (`.gitignore`).
- Üretim sitesi URL’si: `https://adanaailehukuku.com` (`astro.config.mjs` içinde `site`).

## İçerik yapısı

| Klasör | Açıklama |
|--------|----------|
| `content/pages/` | Hizmet ve kurumsal sayfalar (13 dosya) |
| `content/articles/` | Makaleler (10 dosya) |

## URL yapısı

- `/` — Ana sayfa
- `/adana-aile-hukuku-avukati/` … `/iletisim/` — Hizmet sayfaları
- `/makaleler/` — Makale listesi
- `/makaleler/{slug}/` — Makale detay

## SEO

- Her sayfada: title, meta description, canonical, Open Graph, `robots: index, follow`
- Markdown içindeki JSON-LD (FAQ, Article, LegalService) head’e eklenir
- `public/robots.txt` + `sitemap.xml` (build sonrası `dist/`)

## GitHub’a push

```bash
git init
git add .
git commit -m "Astro site: Hostinger deploy hazır"
git branch -M main
git remote add origin https://github.com/KULLANICI/adanaailehukuku.com.git
git push -u origin main
```

`KULLANICI` ve repo URL’sini kendi GitHub hesabınıza göre değiştirin.

## Güvenlik

`.gitignore` içinde: `.env`, `node_modules`, `dist`, `.astro`, `.DS_Store`
