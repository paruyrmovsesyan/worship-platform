import { API_BASE_URL } from './nativeConfig';

const fallbackNewsByLanguage = {
  am: [
    {
      id: 101,
      slug: 'bible-new-ararat-parallel-reader',
      date: '2026-11-18 10:00:00',
      published_at: '2026-11-18 10:00:00',
      release_version: '5.4.0',
      tag: 'Նորարարություն',
      title: 'Աստվածաշունչ՝ Նոր Արարատ (NAT), NRT, ESV և զուգահեռ համեմատում',
      excerpt: 'Կարդացեք 66 գրքից բաղկացած Աստվածաշունչը՝ զուգահեռ թարգմանություններով, աուդիո ընթերցմամբ, ընդգծումներով և օֆֆլայն փաթեթով։',
      content: 'Աստվածաշնչի նոր ընթերցիչը ներառում է Նոր Արարատ, Արարատ, ռուսերեն NRT և անգլերեն ESV թարգմանությունները, համարների կողք-կողքի համեմատում, գունային ընդգծումներ, անձնական նշումներ և ընթերցանության պլաններ։',
      image_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 102,
      slug: 'church-prayer-calendar-and-radio',
      date: '2026-11-17 12:00:00',
      published_at: '2026-11-17 12:00:00',
      release_version: '5.4.0',
      tag: 'Համայնք',
      title: 'Եկեղեցի և Աղոթք, Օրացույց և 24/7 Քրիստոնեական Ռադիո',
      excerpt: 'Միացեք համայնքային աղոթքի խնդրանքներին, հաստատեք փորձերի մասնակցությունը (RSVP) և լսեք 24/7 փառաբանության ռադիո։',
      content: 'Նոր «Եկեղեցի և Աղոթք» ու «Մեդիա և Ռադիո» բաժինները միավորում են եկեղեցական հայտարարությունները, աղոթքի պատը, փորձերի օրացույցը և անընդհատ հնչող 24/7 ռադիոն։',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 103,
      slug: 'pro-studio-and-live-stage-v2',
      date: '2026-11-16 09:00:00',
      published_at: '2026-11-16 09:00:00',
      release_version: '5.4.0',
      tag: 'Թարմացում',
      title: 'Worship Pro Studio և Բեմական Live Ռեժիմ v2',
      excerpt: 'Բեմական վայրկյանաչափ, տոնայնության ներդաշնակ անցումներ, Chords-Only արագ թերթիկ և 8-ալիքային RehearsalMix ստեմս միքշեր։',
      content: 'Pro Studio հավաքականն ու Live ռեժիմը համալրվել են բեմական վայրկյանաչափով, երգերի միջև տոնայնության անցումների հուշումներով, Bluetooth ոտնակի կառավարմամբ և Worship AI Studio գործիքներով։',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200',
    },
  ],
  en: [
    {
      id: 101,
      slug: 'bible-new-ararat-parallel-reader',
      date: '2026-11-18 10:00:00',
      published_at: '2026-11-18 10:00:00',
      release_version: '5.4.0',
      tag: 'Innovation',
      title: 'Bible Reader: New Ararat (NAT), NRT, ESV & Parallel Compare',
      excerpt: 'Read all 66 books with parallel translations, audio narration, verse highlights, personal notes, and offline packs.',
      content: 'The new Bible Reader brings full Armenian New Ararat, Ararat, Russian NRT, and English ESV translations with side-by-side verse comparison and reading plans.',
      image_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 102,
      slug: 'church-prayer-calendar-and-radio',
      date: '2026-11-17 12:00:00',
      published_at: '2026-11-17 12:00:00',
      release_version: '5.4.0',
      tag: 'Community',
      title: 'Church & Prayer Wall, Rehearsal RSVP & 24/7 Worship Radio',
      excerpt: 'Join community prayer requests, RSVP to team rehearsals, and stream 24/7 worship radio with the persistent mini-player.',
      content: 'The new Church & Prayer and Media & Radio hubs unite church announcements, prayer requests, rehearsal scheduling, and 24/7 streaming radio.',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 103,
      slug: 'pro-studio-and-live-stage-v2',
      date: '2026-11-16 09:00:00',
      published_at: '2026-11-16 09:00:00',
      release_version: '5.4.0',
      tag: 'Update',
      title: 'Worship Pro Studio & Live Stage Mode v2',
      excerpt: 'Stage stopwatch, harmonic key transitions, quick Chords-Only sheet, Bluetooth pedal control, and 8-channel Stems Mixer.',
      content: 'Worship Pro Studio and Setlist Live Mode now feature real-time leader sync, stage timer, harmonic transition hints, and AI Studio tools.',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200',
    },
  ],
  ru: [
    {
      id: 101,
      slug: 'bible-new-ararat-parallel-reader',
      date: '2026-11-18 10:00:00',
      published_at: '2026-11-18 10:00:00',
      release_version: '5.4.0',
      tag: 'Инновации',
      title: 'Библия: Новый Арарат (NAT), NRT, ESV и параллельное сравнение',
      excerpt: 'Читайте все 66 книг Библии с параллельными переводами, аудиочтением, выделениями, заметками и офлайн-пакетом.',
      content: 'Новый раздел Библии включает переводы Новый Арарат, Арарат, русский NRT и английский ESV со сравнением стихов и планами чтения.',
      image_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 102,
      slug: 'church-prayer-calendar-and-radio',
      date: '2026-11-17 12:00:00',
      published_at: '2026-11-17 12:00:00',
      release_version: '5.4.0',
      tag: 'Сообщество',
      title: 'Церковь и Молитва, Календарь репетиций и Радио 24/7',
      excerpt: 'Присоединяйтесь к молитвенным нуждам, подтверждайте участие в репетициях (RSVP) и слушайте христианское радио 24/7.',
      content: 'Новые разделы «Церковь и Молитва» и «Медиа и Радио» объединяют церковные объявления, молитвенную стену, календарь репетиций и радио 24/7.',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 103,
      slug: 'pro-studio-and-live-stage-v2',
      date: '2026-11-16 09:00:00',
      published_at: '2026-11-16 09:00:00',
      release_version: '5.4.0',
      tag: 'Обновление',
      title: 'Worship Pro Studio и Сценический Live-режим v2',
      excerpt: 'Сценический секундомер, гармонические переходы тональностей, быстрый лист аккордов и 8-канальный микшер стемов.',
      content: 'Worship Pro Studio и режим Live дополнены секундомером сцены, подсказками переходов между песнями, поддержкой Bluetooth-педали и AI Studio.',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200',
    },
  ],
};

export const getFallbackNews = (language = 'am') => fallbackNewsByLanguage[language] || fallbackNewsByLanguage.am;

export const fallbackNews = getFallbackNews('am');

export const apiLanguage = (language) => {
  if (language === 'am' || language === 'hy') return 'hy';
  if (language === 'ru') return 'ru';
  return 'en';
};

export const formatNewsDate = (value, language = 'hy') => {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = apiLanguage(language) === 'ru' ? 'ru-RU' : apiLanguage(language) === 'en' ? 'en-US' : 'hy-AM';
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatNewsVersion = (value) => {
  const version = String(value || '').trim();
  if (!version) return '';
  return /^v/i.test(version) ? version : `v${version}`;
};

export const getWebNewsImageUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';

  const looksMalformed = url.includes('](') || url.includes('/Users/') || url.includes('\\');
  if (looksMalformed) {
    const filenames = url.match(/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp|gif)/gi);
    return filenames?.length ? `${API_BASE_URL}/uploads/news/${filenames[filenames.length - 1]}` : '';
  }

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return '';
};

export const getNewsImageUrl = (article) => {
  const imageUrl = getWebNewsImageUrl(article?.image_url);
  if (!imageUrl) return '';

  const version = article.updated_at || article.published_at || article.date || article.id;
  if (!version) return imageUrl;

  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}news_v=${encodeURIComponent(String(version))}`;
};

export const getCachedNewsList = (language = 'am') => {
  try {
    const langKey = apiLanguage(language);
    const cached = localStorage.getItem(`wp_news_cache_${langKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return getFallbackNews(language);
};

export const fetchNewsList = async ({ language = 'hy', limit = 20, featured = false } = {}) => {
  const langKey = apiLanguage(language);
  const params = new URLSearchParams({
    action: 'list',
    lang: langKey,
    limit: String(limit),
  });
  if (featured) params.set('featured', '1');
  params.set('_', String(Date.now()));

  const res = await fetch(`/news_api.php?${params.toString()}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || !data.ok || !Array.isArray(data.articles)) {
    throw new Error(data.error || 'Failed to load news');
  }

  // Update local cache if fetching full list
  if (!featured && data.articles.length > 0) {
    try {
      localStorage.setItem(`wp_news_cache_${langKey}`, JSON.stringify(data.articles));
    } catch (e) {}
  }

  return data.articles;
};

export const fetchNewsDetail = async ({ slug, language = 'hy' }) => {
  const params = new URLSearchParams({
    action: 'detail',
    lang: apiLanguage(language),
    slug,
    _: String(Date.now()),
  });
  const res = await fetch(`/news_api.php?${params.toString()}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || !data.ok || !data.article) {
    throw new Error(data.error || 'News article not found');
  }
  return data.article;
};
