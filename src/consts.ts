export const SITE_URL = 'https://adanaailehukuku.com';
export const SITE_NAME = 'Avukat Ceren Sümer Cilli';
export const SITE_TAGLINE = 'Adana Aile Hukuku';
export const OG_IMAGE_URL = `${SITE_URL}/og-default.svg`;

export const BUSINESS_NAP = {
  name: 'Avukat Ceren Sümer Cilli',
  legalName: 'Sümer Hukuk Bürosu',
  telephone: '+905336342425',
  telephoneDisplay: '0533 634 24 25',
  email: 'info@cerensumer.av.tr',
  streetAddress: 'Gazipaşa Mah. Ordu Cad. No:7 Dinçkan Apt. A Blok Daire:3',
  addressLocality: 'Seyhan',
  addressRegion: 'Adana',
  postalCode: '01010',
  addressCountry: 'TR',
  openingHours: 'Mo-Fr 09:00-18:00',
  mapsPlaceUrl:
    'https://www.google.com/maps/place/Adana+Avukat+Ceren+S%C3%BCmer+Cilli+%7C+Adana+Bo%C5%9Fanma+Avukat%C4%B1/@36.9917146,35.3294433,17z',
  mapsEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3186.790573458734!2d35.326853976424765!3d36.99093187219341!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x15288f6f3764072f%3A0x51c862d3a8658c0d!2sAdana%20Avukat%20Ceren%20S%C3%BCmer%20Cilli!5e0!3m2!1str!2str',
  latitude: 36.9917146,
  longitude: 35.3294433,
} as const;

export const ADANA_DISTRICTS = [
  { name: 'Seyhan', slug: 'seyhan' },
  { name: 'Çukurova', slug: 'cukurova' },
  { name: 'Yüreğir', slug: 'yuregir' },
  { name: 'Sarıçam', slug: 'saricam' },
] as const;

/** Legacy articles superseded by newer URLs — excluded from sitemap, noindex at render. */
export const NOINDEX_ARTICLE_SLUGS = new Set([
  'uludag-sozluk-pazar-degeri-eksi-sozluk',
  'bosanma-davasi-nasil-acilir-adana',
  'velayet-davasi-mahkeme-kriterleri',
]);

export const CANONICAL_ARTICLE_REPLACEMENTS: Record<string, string> = {
  'bosanma-davasi-nasil-acilir-adana': 'adanada-bosanma-davasi-nasil-acilir',
  'velayet-davasi-mahkeme-kriterleri': 'adanada-velayet-davasi-ve-cocugun-ustun-yarari',
};

export const ARTICLE_SLUGS = [
  'adana-aile-hukuku-rehberi',
  'adana-anlasmali-bosanma',
  'bosanma-davasi-nasil-acilir-adana',
  'velayet-davasi-mahkeme-kriterleri',
  'istirak-nafakasi-rehberi',
  'bosanmada-mal-paylasimi',
  'adana-aile-mahkemesi-sureci',
  'cekismeli-bosanma-sebepleri',
  'aile-konutu-serhi-bosanma',
  'ziynet-alacagi-davasi',
  'aym-suresiz-nafaka-duzenlemesini-iptal-etti',
  'adanada-bosanma-davasi-nasil-acilir',
  'adanada-nafaka-davasi-ve-nafaka-artirim-sureci',
  'adanada-velayet-davasi-ve-cocugun-ustun-yarari',
] as const;

export const PAGE_SLUGS = [
  'adana-aile-hukuku-avukati',
  'adana-bosanma-avukati',
  'adana-anlasmali-bosanma-avukati',
  'adana-cekismeli-bosanma-avukati',
  'adana-velayet-davasi-avukati',
  'adana-nafaka-davasi-avukati',
  'adana-mal-paylasimi-avukati',
  'adana-ziynet-alacagi-avukati',
  'aile-konutu-serhi-avukati',
  'uzaklastirma-karari-avukati',
  'adana-ilce-aile-hukuku-avukati',
  'hakkimizda',
  'iletisim',
] as const;

export const NAV_ITEMS = [
  { label: 'Ana Sayfa', href: '/' },
  { label: 'Aile Hukuku', href: '/adana-aile-hukuku-avukati/' },
  { label: 'Boşanma', href: '/adana-bosanma-avukati/' },
  { label: 'Velayet', href: '/adana-velayet-davasi-avukati/' },
  { label: 'Nafaka', href: '/adana-nafaka-davasi-avukati/' },
  { label: 'Mal Paylaşımı', href: '/adana-mal-paylasimi-avukati/' },
  { label: 'Makaleler', href: '/makaleler/' },
  { label: 'Hakkımızda', href: '/hakkimizda/' },
  { label: 'İletişim', href: '/iletisim/' },
] as const;

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=75`;

export const SERVICE_CARDS = [
  {
    title: 'Adana Aile Hukuku',
    href: '/adana-aile-hukuku-avukati/',
    desc: 'Genel danışmanlık ve dava takibi',
    image: unsplash('photo-1589829545856-d10d557cf95f'),
    imageAlt: 'Adana aile hukuku avukatı — adalet terazisi ve hukuk teması',
  },
  {
    title: 'Boşanma Davaları',
    href: '/adana-bosanma-avukati/',
    desc: 'Anlaşmalı ve çekişmeli boşanma',
    image: unsplash('photo-1454165804606-c3d57bc86b40'),
    imageAlt: 'Adana boşanma avukatı — mahkeme dosyası ve evrak incelemesi',
  },
  {
    title: 'Anlaşmalı Boşanma',
    href: '/adana-anlasmali-bosanma-avukati/',
    desc: 'Protokol ve mahkeme süreci',
    image: unsplash('photo-1450101499163-c8848c66ca85'),
    imageAlt: 'Anlaşmalı boşanma davası — sözleşme ve hukuki belgeler',
  },
  {
    title: 'Çekişmeli Boşanma',
    href: '/adana-cekismeli-bosanma-avukati/',
    desc: "Sebep, delil ve fer'iler",
    image: unsplash('photo-1600880292203-757bb62b4baf'),
    imageAlt: 'Çekişmeli boşanma davası — mahkeme ve hukuki süreç',
  },
  {
    title: 'Velayet Davaları',
    href: '/adana-velayet-davasi-avukati/',
    desc: 'Çocuğun üstün yararı',
    image: unsplash('photo-1573496359142-b8d87734a5a2'),
    imageAlt: 'Velayet davası — aile hukuku dosyası ve danışmanlık',
  },
  {
    title: 'Nafaka Davaları',
    href: '/adana-nafaka-davasi-avukati/',
    desc: 'İştirak ve yoksulluk nafakası',
    image: unsplash('photo-1497366216548-37526070297c'),
    imageAlt: 'Nafaka davası — hesaplama ve hukuki evrak',
  },
  {
    title: 'Mal Paylaşımı',
    href: '/adana-mal-paylasimi-avukati/',
    desc: 'Tasfiye ve edinilmiş mallar',
    image: unsplash('photo-1560518883-ce09059eeffa'),
    imageAlt: 'Mal paylaşımı davası — konut ve mal rejimi belgeleri',
  },
  {
    title: 'Ziynet Alacağı',
    href: '/adana-ziynet-alacagi-avukati/',
    desc: 'İspat ve talep süreci',
    image: unsplash('photo-1519741497674-611481863552'),
    imageAlt: 'Ziynet alacağı davası — mücevher ve hukuki değerlendirme',
  },
  {
    title: 'Aile Konutu Şerhi',
    href: '/aile-konutu-serhi-avukati/',
    desc: 'TMK 194 koruması',
    image: unsplash('photo-1511285560929-80b456fea0bc'),
    imageAlt: 'Aile konutu şerhi — konut ve tapu hukuku teması',
  },
  {
    title: 'Uzaklaştırma Kararı',
    href: '/uzaklastirma-karari-avukati/',
    desc: '6284 koruma tedbirleri',
    image: unsplash('photo-1556761175-b413da4baf72'),
    imageAlt: 'Uzaklaştırma kararı — koruma tedbiri ve hukuk kütüphanesi',
  },
] as const;
