import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './Support.css';

const CATEGORY_META = {
  songs:    { title: '🎵 Երգեր & Ակորդներ',                   color: '#00F0FF' },
  setlists: { title: '📋 Երգացանկեր & Live Mode',             color: '#9D72FF' },
  offline:  { title: '📱 Օֆլայն Ռեժիմ & Ծրագիր',            color: '#38EF7D' },
  account:  { title: '🔐 Անձնական Հաշիվ & Կարգավորումներ',   color: '#F09819' },
  other:    { title: '💬 Այլ',                                 color: '#aaaaaa' },
};

// Default fallback FAQs (shown if data/admin_faq.json hasn't been populated yet)
const DEFAULT_FAQS = [
  { id: 's1', category: 'songs',    question: 'Ինչպե՞ս փոխել երգի տոնայնությունը (տրանսպոզիցիա անել):', answer: 'Երգի էջում սեղմեք Տոնայնության (Key) կոճակը կամ օգտագործեք + / - կոճակները: Ակորդներն ակնթարթորեն կփոխվեն Ձեր ընտրած տոնայնությանը:' },
  { id: 's2', category: 'songs',    question: 'Ինչպե՞ս ավելացնել երգը «Նախընտրածներ» ցանկում:',        answer: 'Երգի էջում սեղմեք սրտիկի (♥) կոճակը: Պահպանված երգերը հասանելի կլինեն Ձեր անձնական գրադարանում նաև օֆլայն ռեժիմում:' },
  { id: 's3', category: 'songs',    question: 'Ինչպե՞ս արտահանել կամ տպել երգի ակորդները:',             answer: 'Երգի էջի վերևի աջ անկյունում սեղմեք «Տպել» կամ «PDF / TXT» կոճակը` երաժիշտների համար թղթային տարբերակ ունենալու համար:' },
  { id: 's4', category: 'songs',    question: 'Ի՞նչ անել, եթե երգում նկատել եմ սխալ ակորդ կամ տեքստ:', answer: 'Սեղմեք երգի էջում գտնվող «Առաջարկել խմբագրում» կոճակը, լրացրեք ճշգրտումը և մեր ադմինները կվերանայեն այն:' },
  { id: 'l1', category: 'setlists', question: 'Ինչպե՞ս ստեղծել նոր երգացանկ:',                          answer: '«Երգացանկեր» բաժնում սեղմեք «Ստեղծել Երգացանկ»: Ավելացրեք երգեր որոնման միջոցով, դասավորեք հերթականությունը և պահպանեք:' },
  { id: 'l2', category: 'setlists', question: 'Ի՞նչ է Live Mode-ը և ինչպես օգտվել դրանից:',             answer: 'Live Mode-ը նախատեսված է կիրակնօրյա ծառայությունների և փորձերի համար: Այն ցույց է տալիս ակորդները մեծ տառաչափով:' },
  { id: 'l3', category: 'setlists', question: 'Ինչպե՞ս կիսվել երգացանկով թիմի հետ:',                    answer: 'Երգացանկի էջում սեղմեք «Կիսվել» կոճակը: Դուք կստանաք ուղիղ հղում կամ QR կոդ, որը կարող եք ուղարկել Ձեր երաժիշտներին:' },
  { id: 'o1', category: 'offline',  question: 'Ինչպե՞ս է աշխատում օֆլայն ռեժիմը առանց ինտերնետի:',      answer: 'Worship Platform-ն ավտոմատ պահպանում է Ձեր դիտած երգերն ու երգացանկերը սարքում: Ինտերնետ կապն անջատվելիս ծրագիրը շարունակում է աշխատել անխափան:' },
  { id: 'o2', category: 'offline',  question: 'Ինչպե՞ս տեղադրել ծրագիրը հեռախոսի կամ համակարգչի վրա:',  answer: 'Բրաուզերի մենյուից ընտրեք «Ավելացնել գլխավոր էկրանին» (Add to Home Screen / Install App): Ծրագիրը կտեղադրվի որպես իսկական App:' },
  { id: 'a1', category: 'account',  question: 'Ինչպե՞ս փոխել գաղտնաբառը կամ անձնական տվյալները:',       answer: 'Մտեք «Կարգավորումներ» բաժին: Այնտեղ կարող եք թարմացնել Ձեր անունը, էլ. հասցեն, փոխել գաղտնաբառը և կառավարել ակտիվ սեսիաները:' },
  { id: 'a2', category: 'account',  question: 'Ինչպե՞ս փոխել ակորդների գույնը կամ ոճը:',                answer: '«Կարգավորումներ» -> «Ծրագրի կարգավորումներ» բաժնում կարող եք ընտրել ակորդների գույնը (Ոսկեգույն, Կապույտ, Կանաչ) և միացնել OLED Dark mode-ը:' },
];

export default function Support() {
  const { t } = useLanguage();
  usePageReady(false);

  const [allFaqs, setAllFaqs]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openFaqId, setOpenFaqId]     = useState(null);

  // Fetch FAQs from admin_faq.json (managed by admin panel)
  useEffect(() => {
    fetch('/data/admin_faq.json?_=' + Date.now())
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAllFaqs(data);
        } else {
          setAllFaqs(DEFAULT_FAQS);
        }
      })
      .catch(() => {
        setAllFaqs(DEFAULT_FAQS);
      })
      .finally(() => setLoading(false));
  }, []);

  // Build category list dynamically from data
  const categoryIds = ['all', ...Object.keys(CATEGORY_META).filter(id =>
    allFaqs.some(f => (f.category || 'songs') === id)
  )];

  // Filter FAQs
  const filteredByCategory = activeCategory === 'all'
    ? allFaqs
    : allFaqs.filter(f => (f.category || 'songs') === activeCategory);

  const filteredFaqs = filteredByCategory.filter(item =>
    item.question.toLowerCase().includes(search.toLowerCase()) ||
    item.answer.toLowerCase().includes(search.toLowerCase())
  );

  // Group filtered by category (preserving order)
  const grouped = Object.keys(CATEGORY_META).reduce((acc, cat) => {
    const items = filteredFaqs.filter(f => (f.category || 'songs') === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // Also collect uncategorized / "other"
  const knownCats = new Set(Object.keys(CATEGORY_META));
  const otherItems = filteredFaqs.filter(f => !knownCats.has(f.category || 'songs'));
  if (otherItems.length > 0) grouped['other'] = [...(grouped['other'] || []), ...otherItems];

  const toggleFaq = (id) => setOpenFaqId(prev => prev === id ? null : id);

  return (
    <div className="support-faq-page">
      {/* HERO */}
      <div className="support-faq-hero">
        <div className="hero-glow-bg" />
        <div className="support-faq-hero-content">
          <span className="faq-badge">❓ {t('landing.footer.support', 'ԱՋԱԿՑՈՒԹՅԱՆ ԿԵՆՏՐՈՆ')}</span>
          <h1>{t('support.heroTitle', 'Հաճախ Տրվող Հարցեր (FAQ)')}</h1>
          <p>{t('support.subtitle', 'Գտեք արագ պատասխաններ Worship Platform-ի օգտագործման, երգերի, երգացանկերի և ֆունկցիաների վերաբերյալ։')}</p>

          <div className="faq-search-wrapper">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Փնտրել հարցեր, թեմաներ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      <div className="support-faq-container">
        {/* CATEGORY TABS */}
        <div className="faq-category-tabs">
          {categoryIds.map(catId => (
            <button
              key={catId}
              className={`faq-tab-btn ${activeCategory === catId ? 'active' : ''}`}
              onClick={() => setActiveCategory(catId)}
            >
              {catId === 'all' ? '✨ Բոլոր Հարցերը' : (CATEGORY_META[catId]?.title || catId)}
            </button>
          ))}
        </div>

        {/* FAQ SECTIONS */}
        {loading ? (
          <div className="faq-loading">
            <div className="faq-loading-spinner" />
            <p>Բեռնվում է...</p>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="faq-empty-state">
            <p>🔍 Հարց չի գտնվել «{search}» որոնման համար։</p>
          </div>
        ) : (
          <div className="faq-sections-list">
            {Object.entries(grouped).map(([catId, items]) => {
              const meta = CATEGORY_META[catId] || { title: catId, color: '#aaa' };
              return (
                <div key={catId} className="faq-category-block">
                  <h2 className="faq-cat-title" style={{ color: meta.color }}>
                    {meta.title}
                  </h2>
                  <div className="faq-accordion-group">
                    {items.map(item => {
                      const isOpen = openFaqId === item.id;
                      return (
                        <div key={item.id} className={`faq-card ${isOpen ? 'open' : ''}`}>
                          <button className="faq-card-question" onClick={() => toggleFaq(item.id)}>
                            <span>{item.question}</span>
                            <span className="faq-arrow-icon">
                              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </span>
                          </button>
                          {isOpen && (
                            <div className="faq-card-answer">
                              <p>{item.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM CONTACT BANNER */}
        <div className="faq-help-banner">
          <div className="help-banner-content">
            <h3>💬 Դեռ ունե՞ք հարցեր կամ աջակցության կարիք</h3>
            <p>Մեր թիմը միշտ պատրաստ է օգնել Ձեզ։ Կապվեք մեզ հետ կամ ուղարկեք հաղորդագրություն։</p>
          </div>
          <div className="help-banner-actions">
            <Link to="/contact" className="help-btn primary">
              ✉️ Կապի Էջ & Հաղորդագրություն
            </Link>
            <a href="https://t.me/worship_platform_bot" target="_blank" rel="noopener noreferrer" className="help-btn telegram">
              📱 Telegram Բոտ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
