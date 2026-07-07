import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getFallbackNews, fetchNewsList, formatNewsDate } from '../utils/news';
import './News.css';

export default function News() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNewsList({ language, limit: 30 })
      .then(items => {
        if (!cancelled) setArticles(items.length ? items : getFallbackNews(language));
      })
      .catch(() => {
        if (!cancelled) setArticles(getFallbackNews(language));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

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
            <article
              key={item.slug || item.id}
              className={`news-list-card ${index === 0 ? 'featured' : ''}`}
              onClick={() => navigate(`/news/${item.slug}`)}
            >
              <div
                className="news-card-media"
                style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined}
              />
              <div className="news-card-body">
                <div className="news-card-meta">
                  <span className="news-tag">{item.tag}</span>
                  <span>{formatNewsDate(item.published_at || item.date, language)}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
