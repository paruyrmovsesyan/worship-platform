const fallbackNewsByLanguage = {
  am: [
    {
      id: 1,
      slug: 'dynamic-transposition',
      date: '2024-04-12 09:00:00',
      published_at: '2024-04-12 09:00:00',
      tag: 'Թարմացում',
      title: 'Նոր հնարավորություն՝ դինամիկ տոնայնություն',
      excerpt: 'Այժմ կարող եք փոխել երգի տոնայնությունը մեկ քլիքով:',
      content: 'Նոր transposition գործիքը օգնում է արագ պատրաստել երգերը տարբեր ձայնային տիրույթների համար։',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 2,
      slug: 'setlist-planning-guide',
      date: '2024-04-28 09:00:00',
      published_at: '2024-04-28 09:00:00',
      tag: 'Ուղեցույց',
      title: 'Երգացանկերի պլանավորման գաղտնիքները',
      excerpt: 'Ինչպես արագ հավաքել ծառայության երգացանկը և պահել թիմի աշխատանքը նույն տեղում։',
      content: 'Լավ երգացանկը միայն երգերի ցուցակ չէ․ այն ծառայության ընթացքն է։',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 3,
      slug: 'collaborate-with-friends',
      date: '2024-05-18 09:00:00',
      published_at: '2024-05-18 09:00:00',
      tag: 'Համագործակցություն',
      title: 'Համագործակցեք ընկերների և թիմի հետ',
      excerpt: 'Կիսվեք երգերով, երգացանկերով և նշումներով՝ չկորցնելով աշխատանքի ընթացքը։',
      content: 'Ընկերների և չաթի համակարգը օգնում է երգերը քննարկել հենց հարթակի ներսում։',
      image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=1200',
    },
  ],
  en: [
    {
      id: 1,
      slug: 'dynamic-transposition',
      date: '2024-04-12 09:00:00',
      published_at: '2024-04-12 09:00:00',
      tag: 'Update',
      title: 'New Feature: Dynamic Transposition',
      excerpt: 'You can now change a song key with a single tap.',
      content: 'The new transposition tool helps you prepare songs quickly for different vocal ranges.',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 2,
      slug: 'setlist-planning-guide',
      date: '2024-04-28 09:00:00',
      published_at: '2024-04-28 09:00:00',
      tag: 'Guide',
      title: 'Setlist Planning Secrets',
      excerpt: 'How to build a service setlist faster and keep your team aligned.',
      content: 'A great setlist is not only a list of songs. It shapes the flow of the whole service.',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 3,
      slug: 'collaborate-with-friends',
      date: '2024-05-18 09:00:00',
      published_at: '2024-05-18 09:00:00',
      tag: 'Collaboration',
      title: 'Collaborate with Friends and Team',
      excerpt: 'Share songs, setlists, and notes without losing your workflow.',
      content: 'The friends and chat system helps you discuss songs directly inside the platform.',
      image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=1200',
    },
  ],
  ru: [
    {
      id: 1,
      slug: 'dynamic-transposition',
      date: '2024-04-12 09:00:00',
      published_at: '2024-04-12 09:00:00',
      tag: 'Обновление',
      title: 'Новая функция: динамическая тональность',
      excerpt: 'Теперь можно менять тональность песни одним нажатием.',
      content: 'Новый инструмент транспозиции помогает быстро подготовить песни для разных вокальных диапазонов.',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 2,
      slug: 'setlist-planning-guide',
      date: '2024-04-28 09:00:00',
      published_at: '2024-04-28 09:00:00',
      tag: 'Руководство',
      title: 'Секреты планирования сет-листа',
      excerpt: 'Как быстрее собрать сет-лист служения и держать команду в одном ритме.',
      content: 'Хороший сет-лист - это не просто список песен. Он формирует ход всего служения.',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200',
    },
    {
      id: 3,
      slug: 'collaborate-with-friends',
      date: '2024-05-18 09:00:00',
      published_at: '2024-05-18 09:00:00',
      tag: 'Совместная работа',
      title: 'Работайте вместе с друзьями и командой',
      excerpt: 'Делитесь песнями, сет-листами и заметками без потери рабочего процесса.',
      content: 'Система друзей и чатов помогает обсуждать песни прямо внутри платформы.',
      image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=1200',
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
    return filenames?.length ? `/uploads/news/${filenames[filenames.length - 1]}` : '';
  }

  return /^(?:https?:\/\/|\/)/i.test(url) ? url : '';
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
