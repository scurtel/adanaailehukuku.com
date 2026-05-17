export const SITE_URL = 'https://adanaailehukuku.com';
export const SITE_NAME = 'Avukat Ceren Sümer Cilli';
export const SITE_TAGLINE = 'Adana Aile Hukuku';

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
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=75`;

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
    image: unsplash('photo-1505663694776-a7e4ef6ae560'),
    imageAlt: 'Çekişmeli boşanma davası — mahkeme ve hukuki süreç',
  },
  {
    title: 'Velayet Davaları',
    href: '/adana-velayet-davasi-avukati/',
    desc: 'Çocuğun üstün yararı',
    image: unsplash('photo-1589395590378-f402dc2e54a2'),
    imageAlt: 'Velayet davası — aile hukuku dosyası ve danışmanlık',
  },
  {
    title: 'Nafaka Davaları',
    href: '/adana-nafaka-davasi-avukati/',
    desc: 'İştirak ve yoksulluk nafakası',
    image: unsplash('photo-1554224311-9f0439705569'),
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
    image: unsplash('photo-1605100804763-247dfe55bf93'),
    imageAlt: 'Ziynet alacağı davası — mücevher ve hukuki değerlendirme',
  },
  {
    title: 'Aile Konutu Şerhi',
    href: '/aile-konutu-serhi-avukati/',
    desc: 'TMK 194 koruması',
    image: unsplash('photo-1568998036143-e77d90941dbb'),
    imageAlt: 'Aile konutu şerhi — konut ve tapu hukuku teması',
  },
  {
    title: 'Uzaklaştırma Kararı',
    href: '/uzaklastirma-karari-avukati/',
    desc: '6284 koruma tedbirleri',
    image: unsplash('photo-1589998055851-e9e8f4b5c082'),
    imageAlt: 'Uzaklaştırma kararı — koruma tedbiri ve hukuk kütüphanesi',
  },
] as const;
