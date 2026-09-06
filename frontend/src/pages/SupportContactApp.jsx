import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePageReady } from '../hooks/usePageReady';
import './SupportContactApp.css';

const CATEGORY_META = {
  songs:    { title: '🎵 Երգեր & Ակորդներ',                   color: '#00F0FF' },
  setlists: { title: '📋 Երգացանկեր & Live Mode',             color: '#9D72FF' },
  offline:  { title: '📱 Օֆլայն Ռեժիմ & Ծրագիր',            color: '#38EF7D' },
  account:  { title: '🔐 Անձնական Հաշիվ & Կարգավորումներ',   color: '#F09819' },
  other:    { title: '💬 Այլ',                                 color: '#aaaaaa' },
};

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

export default function SupportContactApp({ initialTab }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  usePageReady(false);

  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    return location.pathname.includes('contact') ? 'contact' : 'faq';
  });

  // Sync tab if URL changes between /contact and /support
  useEffect(() => {
    if (location.pathname.includes('contact')) {
      setActiveTab('contact');
    } else if (location.pathname.includes('support')) {
      setActiveTab('faq');
    }
  }, [location.pathname]);

  // FAQ State
  const [allFaqs, setAllFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqSearch, setFaqSearch] = useState('');
  const [activeFaqCategory, setActiveFaqCategory] = useState('all');
  const [openFaqId, setOpenFaqId] = useState(null);

  // Contact Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    contact: user?.email || '',
    subject: 'question',
    message: ''
  });
  const [formSending, setFormSending] = useState(false);
  const [formStatus, setFormStatus] = useState({ type: '', msg: '' });
  const formRef = useRef(null);

  // Sync user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        contact: prev.contact || user.email || user.name || ''
      }));
    }
  }, [user]);

  // Fetch FAQs
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
      .finally(() => setLoadingFaqs(false));
  }, []);

  const categoryIds = useMemo(() => {
    return ['all', ...Object.keys(CATEGORY_META).filter(id =>
      allFaqs.some(f => (f.category || 'songs') === id)
    )];
  }, [allFaqs]);

  const filteredFaqs = useMemo(() => {
    const byCategory = activeFaqCategory === 'all'
      ? allFaqs
      : allFaqs.filter(f => (f.category || 'songs') === activeFaqCategory);

    if (!faqSearch.trim()) return byCategory;
    const q = faqSearch.toLowerCase().trim();
    return byCategory.filter(item =>
      (item.question && item.question.toLowerCase().includes(q)) ||
      (item.answer && item.answer.toLowerCase().includes(q))
    );
  }, [allFaqs, activeFaqCategory, faqSearch]);

  const groupedFaqs = useMemo(() => {
    const grouped = {};
    for (const cat of Object.keys(CATEGORY_META)) {
      const items = filteredFaqs.filter(f => (f.category || 'songs') === cat);
      if (items.length > 0) grouped[cat] = items;
    }
    const knownCats = new Set(Object.keys(CATEGORY_META));
    const others = filteredFaqs.filter(f => !knownCats.has(f.category || 'songs'));
    if (others.length > 0) grouped['other'] = [...(grouped['other'] || []), ...others];
    return grouped;
  }, [filteredFaqs]);

  const toggleFaq = (id) => setOpenFaqId(prev => prev === id ? null : id);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) return;
    setFormSending(true);
    setFormStatus({ type: '', msg: '' });

    const subjectMap = {
      question: '❓ Հարց կամ օգնություն',
      feature: '💡 Առաջարկություն',
      bug: '🛠 Սխալի մասին հայտնում (Bug report)',
      other: '💬 Այլ'
    };
    const formattedSubject = subjectMap[formData.subject] || formData.subject;

    try {
      const res = await fetch('/account_api.php?action=send_support_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          contact: formData.contact,
          subject: formattedSubject,
          message: formData.message
        })
      });
      const data = await res.json();

      if (data.ok) {
        setFormStatus({
          type: 'success',
          msg: data.message || t('contact.success', 'Ձեր հաղորդագրությունը հաջողությամբ ուղարկվեց։ Շնորհակալություն։')
        });
        setFormData(prev => ({ ...prev, message: '' }));
      } else {
        const fallbackRes = await fetch('/contact_api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email || formData.contact,
            message: `[${formattedSubject}] ${formData.message} (Contact: ${formData.contact})`
          })
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.ok) {
          setFormStatus({
            type: 'success',
            msg: t('contact.success', 'Ձեր հաղորդագրությունը հաջողությամբ ուղարկվեց։ Շնորհակալություն։')
          });
          setFormData(prev => ({ ...prev, message: '' }));
        } else {
          setFormStatus({
            type: 'error',
            msg: data.error || fallbackData.error || t('contact.error', 'Սխալ է տեղի ունեցել։ Խնդրում ենք փորձել կրկին։')
          });
        }
      }
    } catch (err) {
      setFormStatus({
        type: 'error',
        msg: t('contact.networkError', 'Ցանցային սխալ։ Խնդրում ենք ստուգել կապը։')
      });
    }

    setFormSending(false);
  };

  const handleGoToContact = () => {
    setActiveTab('contact');
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="sca-page animate-fade-in">
      {/* ── Top Bar ── */}
      <div className="sca-top-bar">
        <button
          type="button"
          className="sca-back-btn"
          onClick={handleBack}
          aria-label="Հետ"
          title="Հետ"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="sca-title-box">
          <h1 className="sca-title">{t('profile.supportTitle', 'Աջակցություն և կապ')}</h1>
          <p className="sca-subtitle">
            {language === 'am'
              ? 'Ինչպե՞ս կարող ենք օգնել Ձեզ'
              : language === 'ru'
              ? 'Чем мы можем вам помочь'
              : 'How can we help you today?'}
          </p>
        </div>
      </div>

      {/* ── Quick Channels Bento Strip ── */}
      <div className="sca-channels-grid">
        <a
          href="https://t.me/worship_platform_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="sca-channel-card telegram"
        >
          <div className="sca-channel-icon telegram-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>
          <div className="sca-channel-info">
            <div className="sca-channel-badge">24/7 Բոտ</div>
            <span className="sca-channel-title">Telegram Բոտ</span>
            <span className="sca-channel-sub">@worship_platform_bot</span>
          </div>
        </a>

        <a href="mailto:worship@pmstudio.am" className="sca-channel-card email">
          <div className="sca-channel-icon email-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="sca-channel-info">
            <div className="sca-channel-badge email-badge">Email</div>
            <span className="sca-channel-title">Էլ. փոստ</span>
            <span className="sca-channel-sub">worship@pmstudio.am</span>
          </div>
        </a>

        <Link to="/documentation" className="sca-channel-card docs">
          <div className="sca-channel-icon docs-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="sca-channel-info">
            <div className="sca-channel-badge docs-badge">Guide</div>
            <span className="sca-channel-title">Ուղեցույցներ</span>
            <span className="sca-channel-sub">Փաստաթղթեր</span>
          </div>
        </Link>
      </div>

      {/* ── Segmented Control Tabs ── */}
      <div className="sca-tab-switch">
        <button
          type="button"
          className={`sca-tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
          onClick={() => setActiveTab('faq')}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{language === 'am' ? 'Հարց ու պատասխան (FAQ)' : language === 'ru' ? 'Вопросы и ответы (FAQ)' : 'FAQ & Help'}</span>
        </button>
        <button
          type="button"
          className={`sca-tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          <span>{language === 'am' ? 'Ուղարկել նամակ' : language === 'ru' ? 'Написать нам' : 'Contact Us'}</span>
        </button>
      </div>

      {/* ── TAB 1: FAQ SECTION ── */}
      {activeTab === 'faq' && (
        <div className="sca-faq-tab animate-fade-in">
          {/* Search Box */}
          <div className="sca-search-wrap">
            <svg className="sca-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="sca-search-input"
              placeholder={language === 'am' ? 'Որոնել հարցեր, թեմաներ...' : 'Search questions...'}
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
            />
            {faqSearch && (
              <button
                type="button"
                className="sca-search-clear"
                onClick={() => setFaqSearch('')}
                aria-label="Clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="sca-chips-scroll">
            {categoryIds.map(catId => (
              <button
                key={catId}
                type="button"
                className={`sca-chip ${activeFaqCategory === catId ? 'active' : ''}`}
                onClick={() => setActiveFaqCategory(catId)}
              >
                {catId === 'all' ? '✨ Բոլորը' : (CATEGORY_META[catId]?.title || catId)}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          {loadingFaqs ? (
            <div className="sca-loading">
              <div className="sca-spinner" />
              <p>{language === 'am' ? 'Բեռնվում է...' : 'Loading...'}</p>
            </div>
          ) : Object.keys(groupedFaqs).length === 0 ? (
            <div className="sca-empty-box">
              <p>🔍 {language === 'am' ? `Հարց չի գտնվել «${faqSearch}» որոնման համար` : `No questions found for "${faqSearch}"`}</p>
              <button
                type="button"
                className="sca-btn-clear"
                onClick={() => {
                  setFaqSearch('');
                  setActiveFaqCategory('all');
                }}
              >
                {language === 'am' ? 'Մաքրել որոնումը' : 'Clear search'}
              </button>
            </div>
          ) : (
            <div className="sca-accordion-list">
              {Object.entries(groupedFaqs).map(([catId, items]) => {
                const meta = CATEGORY_META[catId] || { title: catId, color: '#aaa' };
                return (
                  <div key={catId} className="sca-cat-group">
                    <h3 className="sca-cat-header" style={{ color: meta.color }}>
                      {meta.title}
                    </h3>
                    <div className="sca-cards-stack">
                      {items.map(item => {
                        const isOpen = openFaqId === item.id;
                        return (
                          <div key={item.id} className={`sca-faq-item ${isOpen ? 'open' : ''}`}>
                            <button
                              type="button"
                              className="sca-faq-q"
                              onClick={() => toggleFaq(item.id)}
                            >
                              <span className="sca-faq-q-text">{item.question}</span>
                              <span className="sca-faq-chevron">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </span>
                            </button>
                            {isOpen && (
                              <div className="sca-faq-a animate-fade-in">
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

          {/* Bottom Help Callout */}
          <div className="sca-help-banner">
            <div className="sca-help-text">
              <h4>💬 {language === 'am' ? 'Դեռ ունե՞ք հարցեր կամ աջակցության կարիք' : 'Still have questions?'}</h4>
              <p>{language === 'am' ? 'Մեր թիմը սիրով կպատասխանի Ձեր բոլոր հարցերին:' : 'Our team is always ready to assist you.'}</p>
            </div>
            <button
              type="button"
              className="sca-help-btn"
              onClick={handleGoToContact}
            >
              ✍️ {language === 'am' ? 'Գրել հաղորդագրություն' : 'Send message'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: CONTACT MESSAGE FORM ── */}
      {activeTab === 'contact' && (
        <div className="sca-contact-tab animate-fade-in" ref={formRef}>
          <form className="sca-form-card" onSubmit={handleFormSubmit}>
            <div className="sca-form-header">
              <h3>{t('contact.sendMessageTitle', 'Ուղարկել Հաղորդագրություն')}</h3>
              <p>{t('contact.sendMessageDesc', 'Լրացրեք ձևանմուշը և մեր թիմը կպատասխանի հնարավորինս շուտ։')}</p>
            </div>

            {formStatus.msg && (
              <div className={`sca-alert ${formStatus.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {formStatus.type === 'success' ? '✓ ' : '⚠ '}
                {formStatus.msg}
              </div>
            )}

            <div className="sca-form-row">
              <div className="sca-field">
                <label>{t('contact.name', 'Անուն Ազգանուն')}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder={t('contact.yourName', 'Ձեր անունը')}
                  required
                  disabled={formSending}
                />
              </div>

              <div className="sca-field">
                <label>{t('contact.email', 'Էլ. հասցե (Email)')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="example@email.com"
                  required
                  disabled={formSending}
                />
              </div>
            </div>

            <div className="sca-form-row">
              <div className="sca-field">
                <label>{t('support.topicLabel', 'Թեմա')}</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  disabled={formSending}
                >
                  <option value="question">❓ Հարց կամ օգնություն</option>
                  <option value="feature">💡 Առաջարկություն</option>
                  <option value="bug">🛠 Սխալի մասին հայտնում (Bug report)</option>
                  <option value="other">💬 Այլ</option>
                </select>
              </div>

              <div className="sca-field">
                <label>{t('support.contactLabel', 'Ձեր կոնտակտը (Telegram / Հեռախոս)')}</label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleFormChange}
                  placeholder="@username կամ հեռախոս..."
                  disabled={formSending}
                />
              </div>
            </div>

            <div className="sca-field">
              <label>{t('contact.message', 'Հաղորդագրություն')}</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleFormChange}
                placeholder={t('support.messagePlaceholder', 'Նկարագրեք Ձեր հարցը կամ առաջարկությունը...')}
                rows="4"
                required
                disabled={formSending}
              />
            </div>

            <button
              type="submit"
              className="sca-submit-btn"
              disabled={formSending}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>{formSending ? t('contact.submitting', 'Ուղարկվում է...') : t('contact.submit', 'Ուղարկել Հաղորդագրությունը')}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
