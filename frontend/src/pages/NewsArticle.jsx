import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useIsPWA } from '../hooks/useIsPWA';
import { getFallbackNews, fetchNewsDetail, formatNewsDate, formatNewsVersion, getNewsImageUrl } from '../utils/news';
import './News.css';

const copyByLanguage = {
  am: { back: 'Վերադառնալ նորություններին', copy: 'Հղումը պատճենել', copied: 'Հղումը պատճենված է', contents: 'Բովանդակություն', preface: 'Նախաբան', closing: 'Եզրափակում' },
  hy: { back: 'Վերադառնալ նորություններին', copy: 'Հղումը պատճենել', copied: 'Հղումը պատճենված է', contents: 'Բովանդակություն', preface: 'Նախաբան', closing: 'Եզրափակում' },
  en: { back: 'Back to news', copy: 'Copy link', copied: 'Link copied', contents: 'Contents', preface: 'Introduction', closing: 'Conclusion' },
  ru: { back: 'Вернуться к новостям', copy: 'Скопировать ссылку', copied: 'Ссылка скопирована', contents: 'Содержание', preface: 'Введение', closing: 'Заключение' },
};

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M10 17l-5-5 5-5" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function parseArticleBlocks(content) {
  const rawBlocks = String(content || '').split(/\r?\n\s*\r?\n/).map(value => value.trim()).filter(Boolean);
  const blocks = [];
  let headingIndex = 0;

  rawBlocks.forEach(value => {
    if (/^[•*-]\s+/.test(value)) {
      const lastBlock = blocks[blocks.length - 1];
      const item = value.replace(/^[•*-]\s+/, '');
      if (lastBlock?.type === 'list') lastBlock.items.push(item);
      else blocks.push({ type: 'list', items: [item] });
      return;
    }

    if (value.startsWith('## ') || (/^\p{Extended_Pictographic}/u.test(value) && value.length < 140)) {
      const text = value.startsWith('## ') ? value.slice(3) : value;
      blocks.push({ type: 'heading', text, id: `news-section-${headingIndex}` });
      headingIndex += 1;
      return;
    }

    if (value.startsWith('> ')) {
      blocks.push({ type: 'quote', text: value.slice(2) });
      return;
    }

    blocks.push({ type: 'paragraph', text: value });
  });

  return blocks;
}

function renderArticleBlock(block, index) {
    const key = `${index}-${block.text?.slice(0, 24) || block.items?.[0]?.slice(0, 24)}`;
    if (block.type === 'heading') return <h2 className="news-reader-section" id={block.id} key={key}>{block.text}</h2>;
    if (block.type === 'quote') return <blockquote key={key}>{block.text}</blockquote>;
    if (block.type === 'list') return <ul key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{item}</li>)}</ul>;
    return <p key={key}>{block.text}</p>;
}

function ArticleBody({ blocks }) {
  return blocks.map(renderArticleBlock);
}

function groupArticleSections(blocks, copy) {
  const sections = [];
  const prefaceBlocks = [];
  let currentSection = null;

  blocks.forEach(block => {
    if (block.type === 'heading') {
      currentSection = { id: block.id, title: block.text, blocks: [block] };
      sections.push(currentSection);
      return;
    }

    if (currentSection) currentSection.blocks.push(block);
    else prefaceBlocks.push(block);
  });

  if (prefaceBlocks.length) {
    sections.unshift({
      id: 'news-preface',
      title: copy.preface,
      blocks: [{ type: 'heading', id: 'news-preface', text: copy.preface }, ...prefaceBlocks],
    });
  }

  const lastSection = sections[sections.length - 1];
  if (lastSection && lastSection.id !== 'news-preface') {
    let lastStructuredBlockIndex = -1;
    for (let index = lastSection.blocks.length - 1; index >= 0; index -= 1) {
      const block = lastSection.blocks[index];
      if (block.type === 'list' || block.type === 'quote') {
        lastStructuredBlockIndex = index;
        break;
      }
    }
    const closingBlocks = lastSection.blocks.slice(lastStructuredBlockIndex + 1);
    const hasSeparateClosing = lastStructuredBlockIndex > 0 && closingBlocks.length > 0 && closingBlocks.every(block => block.type === 'paragraph');

    if (hasSeparateClosing) {
      lastSection.blocks = lastSection.blocks.slice(0, lastStructuredBlockIndex + 1);
      sections.push({
        id: 'news-closing',
        title: copy.closing,
        blocks: [{ type: 'heading', id: 'news-closing', text: copy.closing }, ...closingBlocks],
      });
    }
  }

  return sections;
}

function ArticleMeta({ article, language }) {
  return (
    <div className="news-reader-meta">
      {article.tag ? <span>{article.tag}</span> : null}
      {article.release_version ? <strong>{formatNewsVersion(article.release_version)}</strong> : null}
      <time>{formatNewsDate(article.published_at || article.date, language)}</time>
    </div>
  );
}

function ArticleContents({ sections, activeSection, label, onSelect }) {
  return (
    <nav className="news-reader-contents" aria-label={label}>
      <h2>{label}</h2>
      <ol>
        {sections.map((section, index) => (
          <li key={section.id} className={activeSection === section.id ? 'active' : ''}>
            <button type="button" aria-current={activeSection === section.id ? 'true' : undefined} onClick={() => onSelect(section.id)}>
              <span>{index + 1}</span>{section.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function NewsArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const isPWA = useIsPWA();
  const progressRef = useRef(null);
  const articleBodyRef = useRef(null);
  const mobileContentsRef = useRef(null);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState('news-preface');
  const copy = copyByLanguage[language] || copyByLanguage.am;
  const contentBlocks = article ? parseArticleBlocks(article.content || article.excerpt || '') : [];
  const sections = groupArticleSections(contentBlocks, copy);
  const selectedSection = sections.find(section => section.id === selectedSectionId) || sections[0];

  useEffect(() => {
    let cancelled = false;
    fetchNewsDetail({ slug, language })
      .then(item => {
        if (!cancelled) {
          setArticle(item);
          setSelectedSectionId('news-preface');
        }
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

  useEffect(() => {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [article, selectedSectionId]);

  const selectSection = sectionId => {
    setSelectedSectionId(sectionId);
    if (mobileContentsRef.current) mobileContentsRef.current.open = false;
    window.requestAnimationFrame(() => articleBodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const copyArticleLink = async () => {
    const copyWithSelection = () => {
      const input = document.createElement('textarea');
      input.value = window.location.href;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      return copied;
    };

    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(window.location.href);
      else if (!copyWithSelection()) throw new Error('Copy is unavailable');
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      if (copyWithSelection()) {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1800);
      } else {
        setLinkCopied(false);
      }
    }
  };

  if (loading) {
    return <div className={`news-page ${isPWA ? '' : 'web-news-article-state'}`}><div className="news-state">{t('newsState.loading')}</div></div>;
  }

  if (!article) {
    return (
      <div className={`news-page ${isPWA ? '' : 'web-news-article-state'}`}>
        <div className="news-state">
          <h1>{t('newsState.notFound')}</h1>
          <button className="news-back-btn" onClick={() => navigate('/news')}>{t('newsState.back')}</button>
        </div>
      </div>
    );
  }

  const imageUrl = getNewsImageUrl(article);

  return (
    <article className={`news-reader-page ${isPWA ? 'news-reader-app' : 'news-reader-web'}`}>
      <div className="news-reader-progress" aria-hidden="true"><span ref={progressRef} /></div>

      <div className="news-reader-shell">
        <button type="button" className="news-reader-back" onClick={() => navigate('/news')}>
          <ArrowLeftIcon />
          <span>{copy.back}</span>
        </button>

        <header className="news-reader-hero">
          <div className="news-reader-intro">
            <ArticleMeta article={article} language={language} />
            <h1>{article.title}</h1>
            {article.excerpt ? <p>{article.excerpt}</p> : null}
          </div>
          <figure className="news-reader-media">
            {imageUrl ? <img src={imageUrl} alt="" onError={event => { event.currentTarget.hidden = true; }} /> : null}
          </figure>
        </header>

        {sections.length ? (
          <details className="news-reader-mobile-contents" ref={mobileContentsRef}>
            <summary><ListIcon /><span>{copy.contents}</span></summary>
            <ArticleContents sections={sections} activeSection={selectedSection?.id} label={copy.contents} onSelect={selectSection} />
          </details>
        ) : null}

        <div className="news-reader-layout">
          {!isPWA && sections.length ? <ArticleContents sections={sections} activeSection={selectedSection?.id} label={copy.contents} onSelect={selectSection} /> : null}
          <div className="news-reader-body" ref={articleBodyRef}>
            <ArticleBody blocks={selectedSection?.blocks || contentBlocks} />
          </div>
        </div>

        <footer className="news-reader-actions">
          <button type="button" className="news-reader-back" onClick={() => navigate('/news')}>
            <ArrowLeftIcon />
            <span>{copy.back}</span>
          </button>
          <button type="button" className={`news-reader-copy ${linkCopied ? 'copied' : ''}`} onClick={copyArticleLink}>
            <LinkIcon />
            <span>{linkCopied ? copy.copied : copy.copy}</span>
          </button>
        </footer>
      </div>
    </article>
  );
}
