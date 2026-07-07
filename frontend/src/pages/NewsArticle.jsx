import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getFallbackNews, fetchNewsDetail, formatNewsDate } from '../utils/news';
import './News.css';

export default function NewsArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNewsDetail({ slug, language })
      .then(item => {
        if (!cancelled) setArticle(item);
      })
      .catch(() => {
        if (!cancelled) setArticle(getFallbackNews(language).find(item => item.slug === slug) || null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, language]);

  if (loading) {
    return <div className="news-page"><div className="news-state">{t('newsState.loading')}</div></div>;
  }

  if (!article) {
    return (
      <div className="news-page">
        <div className="news-state">
          <h1>{t('newsState.notFound')}</h1>
          <button className="news-back-btn" onClick={() => navigate('/news')}>{t('newsState.back')}</button>
        </div>
      </div>
    );
  }

  return (
    <article className="news-article-page">
      <button className="news-back-btn" onClick={() => navigate('/news')}>{t('newsState.backToNews')}</button>
      <div
        className="news-article-hero"
        style={article.image_url ? { backgroundImage: `url("${article.image_url}")` } : undefined}
      >
        <div className="news-article-overlay">
          <div className="news-card-meta">
            <span className="news-tag">{article.tag}</span>
            <span>{formatNewsDate(article.published_at || article.date, language)}</span>
          </div>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
        </div>
      </div>
      <div className="news-article-content">
        {String(article.content || article.excerpt || '')
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
      </div>
    </article>
  );
}
