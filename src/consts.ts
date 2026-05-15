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

export const SERVICE_CARDS = [
  { title: 'Adana Aile Hukuku', href: '/adana-aile-hukuku-avukati/', desc: 'Genel danışmanlık ve dava takibi' },
  { title: 'Boşanma Davaları', href: '/adana-bosanma-avukati/', desc: 'Anlaşmalı ve çekişmeli boşanma' },
  { title: 'Anlaşmalı Boşanma', href: '/adana-anlasmali-bosanma-avukati/', desc: 'Protokol ve mahkeme süreci' },
  { title: 'Çekişmeli Boşanma', href: '/adana-cekismeli-bosanma-avukati/', desc: 'Sebep, delil ve fer\'iler' },
  { title: 'Velayet Davaları', href: '/adana-velayet-davasi-avukati/', desc: 'Çocuğun üstün yararı' },
  { title: 'Nafaka Davaları', href: '/adana-nafaka-davasi-avukati/', desc: 'İştirak ve yoksulluk nafakası' },
  { title: 'Mal Paylaşımı', href: '/adana-mal-paylasimi-avukati/', desc: 'Tasfiye ve edinilmiş mallar' },
  { title: 'Ziynet Alacağı', href: '/adana-ziynet-alacagi-avukati/', desc: 'İspat ve talep süreci' },
  { title: 'Aile Konutu Şerhi', href: '/aile-konutu-serhi-avukati/', desc: 'TMK 194 koruması' },
  { title: 'Uzaklaştırma Kararı', href: '/uzaklastirma-karari-avukati/', desc: '6284 koruma tedbirleri' },
] as const;
