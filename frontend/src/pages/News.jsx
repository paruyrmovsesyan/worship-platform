import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useIsPWA } from '../hooks/useIsPWA';
import { getFallbackNews, getCachedNewsList, fetchNewsList, formatNewsDate, formatNewsVersion, getNewsImageUrl } from '../utils/news';
import './News.css';

const copyByLanguage = {
  am: {
    subtitle: 'Բացահայտեք հարթակի վերջին թարմացումները, գործնական ուղեցույցներն ու համայնքի պատմությունները։',
    all: 'Բոլորը',
    search: 'Որոնել նորություններ',
    featured: 'Կարդալ ամբողջը',
    latest: 'Վերջին հրապարակումներ',
    results: 'հրապարակում',
    empty: 'Ձեր որոնմանը համապատասխան նորություն չի գտնվել։',
  },
  hy: {
    subtitle: 'Բացահայտեք հարթակի վերջին թարմացումները, գործնական ուղեցույցներն ու համայնքի պատմությունները։',
    all: 'Բոլորը',
    search: 'Որոնել նորություններ',
    featured: 'Կարդալ ամբողջը',
    latest: 'Վերջին հրապարակումներ',
    results: 'հրապարակում',
    empty: 'Ձեր որոնմանը համապատասխան նորություն չի գտնվել։',
  },
  en: {
    subtitle: 'Discover the latest platform updates, practical guides, and stories from the community.',
    all: 'All',
    search: 'Search news',
    featured: 'Read full story',
    latest: 'Latest stories',
    results: 'stories',
    empty: 'No stories match your search.',
  },
  ru: {
    subtitle: 'Последние обновления платформы, практические руководства и истории сообщества.',
    all: 'Все',
    search: 'Поиск новостей',
    featured: 'Читать полностью',
    latest: 'Последние публикации',
    results: 'публикаций',
    empty: 'По вашему запросу ничего не найдено.',
  },
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

export default function News() {
  const { t, language } = useLanguage();
  const isPWA = useIsPWA();
  const [articles, setArticles] = useState(() => getCachedNewsList(language));
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const copy = copyByLanguage[language] || copyByLanguage.am;

  useEffect(() => {
    let cancelled = false;
    setArticles(getCachedNewsList(language));

    fetchNewsList({ language, limit: 50 })
      .then(items => {
        if (!cancelled && Array.isArray(items) && items.length > 0) {
          setArticles(items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const tags = useMemo(
    () => [...new Set(articles.map(item => item.tag).filter(Boolean))],
    [articles],
  );

  const filteredArticles = useMemo(() => {
    const locale = language === 'am' ? 'hy' : language;
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return articles.filter(item => {
      const matchesTag = activeTag === 'all' || item.tag === activeTag;
      if (!matchesTag) return false;
      if (!normalizedQuery) return true;
      return [item.title, item.excerpt, item.tag, item.release_version]
        .filter(Boolean)
        .some(value => String(value).toLocaleLowerCase(locale).includes(normalizedQuery));
    });
  }, [activeTag, articles, language, query]);

  const showFeatured = activeTag === 'all' && !query.trim();
  const featuredArticle = showFeatured ? filteredArticles[0] : null;
  const listArticles = featuredArticle ? filteredArticles.slice(1) : filteredArticles;

  if (isPWA) {
    return (
      <div className="news-page">
        <header className="news-hero">
          <p className="news-eyebrow">{t('landing.latestNews', 'Վերջին Նորություններ')}</p>
          <h1>{t('news.title', 'Նորություններ և Թարմացումներ')}</h1>
        </header>
        {loading ? (
          <div className="news-state">{t('newsState.loading')}</div>
        ) : (
          <div className="news-list-grid">
            {articles.map((item, index) => (
              <article key={item.slug || item.id} className={`news-list-card ${index === 0 ? 'featured' : ''}`}>
                <Link to={`/news/${item.slug}`} className="news-pwa-card-link">
                  <div className="news-card-media" style={item.image_url ? { backgroundImage: `url("${getNewsImageUrl(item)}")` } : undefined} />
                  <div className="news-card-body">
                    <div className="news-card-meta">
                      <span className="news-tag">{item.tag}</span>
                      {item.release_version ? <span className="news-release-version">{formatNewsVersion(item.release_version)}</span> : null}
                      <span>{formatNewsDate(item.published_at || item.date, language)}</span>
                    </div>
                    <h2>{item.title}</h2>
                    <p>{item.excerpt}</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="news-page web-news-page">
      <header className="web-news-heading">
        <h1>{t('news.title', 'Նորություններ և թարմացումներ')}</h1>
        <p>{copy.subtitle}</p>
      </header>

      {loading ? (
        <div className="web-news-loading" aria-live="polite">
          <span /><span /><span />
          <p>{t('newsState.loading')}</p>
        </div>
      ) : (
        <>
          {featuredArticle ? (
            <article className="web-news-featured">
              <Link to={`/news/${featuredArticle.slug}`} className="web-news-featured-link">
                <div
                  className="web-news-featured-media"
                  style={featuredArticle.image_url ? { '--news-feature-image': `url("${getNewsImageUrl(featuredArticle)}")` } : undefined}
                >
                  {featuredArticle.image_url ? (
                    <img
                      src={getNewsImageUrl(featuredArticle)}
                      alt=""
                      onError={event => { event.currentTarget.hidden = true; }}
                    />
                  ) : null}
                </div>
                <div className="web-news-featured-copy">
                  <div className="web-news-meta">
                    {featuredArticle.tag ? <span className="web-news-category">{featuredArticle.tag}</span> : null}
                    {featuredArticle.release_version ? <span className="news-release-version">{formatNewsVersion(featuredArticle.release_version)}</span> : null}
                    <time>{formatNewsDate(featuredArticle.published_at || featuredArticle.date, language)}</time>
                  </div>
                  <h2>{featuredArticle.title}</h2>
                  <p>{featuredArticle.excerpt}</p>
                  <span className="web-news-read-link">{copy.featured}<ArrowIcon /></span>
                </div>
              </Link>
            </article>
          ) : null}

          <section className="web-news-feed" aria-labelledby="web-news-feed-title">
            <div className="web-news-toolbar">
              <div className="web-news-toolbar-title">
                <h2 id="web-news-feed-title">{copy.latest}</h2>
                <span>{filteredArticles.length} {copy.results}</span>
              </div>
              <label className="web-news-search">
                <SearchIcon />
                <input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={copy.search}
                  aria-label={copy.search}
                />
              </label>
            </div>

            <div className="web-news-filters" role="group" aria-label={copy.all}>
              <button type="button" className={activeTag === 'all' ? 'active' : ''} onClick={() => setActiveTag('all')}>{copy.all}</button>
              {tags.map(tag => (
                <button type="button" key={tag} className={activeTag === tag ? 'active' : ''} onClick={() => setActiveTag(tag)}>{tag}</button>
              ))}
            </div>

            {listArticles.length ? (
              <div className="web-news-grid">
                {listArticles.map(item => (
                  <article key={item.slug || item.id} className="web-news-card">
                    <Link to={`/news/${item.slug}`} className="web-news-card-link">
                      <div className="web-news-card-media">
                        {item.image_url ? (
                          <img
                            src={getNewsImageUrl(item)}
                            alt=""
                            loading="lazy"
                            onError={event => { event.currentTarget.hidden = true; }}
                          />
                        ) : null}
                      </div>
                      <div className="web-news-card-body">
                        <div className="web-news-meta">
                          {item.tag ? <span className="web-news-category">{item.tag}</span> : null}
                          {item.release_version ? <span className="news-release-version">{formatNewsVersion(item.release_version)}</span> : null}
                          <time>{formatNewsDate(item.published_at || item.date, language)}</time>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.excerpt}</p>
                        <span className="web-news-card-arrow"><ArrowIcon /></span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="web-news-empty">{copy.empty}</div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
