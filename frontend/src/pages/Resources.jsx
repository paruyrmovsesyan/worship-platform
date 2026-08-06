import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Resources.css';

export default function Resources() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedItem]);

  const categories = {
    am: [
      { id: 'guides', icon: '📖', title: 'Ուղեցույցներ', color: '#00F0FF', items: [
        { id: 'g1', title: 'Worship Platform-ի սկզբնական քայլերը', desc: 'Ամբողջական ուղեցույց նոր օգտատերերի համար:', time: '5 րոպե', link: '/documentation', content: 'Բարի գալուստ Worship Platform! Այս ուղեցույցում դուք կսովորեք, թե ինչպես փնտրել երգեր, ստեղծել Ձեր առաջին երգացանկը, տրանսպոզիցիա անել ակորդները և հրավիրել թիմի անդամներին։' },
        { id: 'g2', title: 'Առաջին երգացանկի ստեղծումը', desc: 'Քայլ առ քայլ երգացանկի ստեղծում և համատեղում:', time: '8 րոպե', link: '/setlists', content: 'Երգացանկերի բաժնում սեղմեք "Ստեղծել Երգացանկ" կոճակը: Ավելացրեք երգեր որոնման միջոցով, դասավորեք հերթականությունը և կիսվեք Ձեր թիմի հետ:' },
        { id: 'g3', title: 'Թիմի հրավեր և դերեր', desc: 'Ինչպես ավելացնել թիմի անդամներ և տրամադրել դերեր:', time: '3 րոպե', link: '/friends', content: 'Ընկերների բաժնում կարող եք գտնել Ձեր երաժիշտներին և ուղարկել հարցում: Միացած անդամները կկարողանան տեսնել Ձեր կողմից հանրայնացված երգացանկերը։' },
      ]},
      { id: 'tutorials', icon: '🎓', title: 'Դասընթացներ', color: '#9D72FF', items: [
        { id: 't1', title: 'Ակորդների տրանսպոզիցիայի օգտագործումը', desc: 'Ակնթարթորեն փոխեք ցանկացած երգի տոնայնությունը:', time: '4 րոպե', link: '/transpose', content: 'Տրանսպոզիտոր գործիքը թույլ է տալիս մեկ սեղմումով փոխել տոնայնությունը, ընտրել Flat (♭) կամ Sharp (♯) նոտացիան և տպել ակորդները:' },
        { id: 't2', title: 'Երգացանկերի ընդլայնված ֆունկցիաները', desc: 'Հերթականություն, նշումներ և փորձերի պլանավորում:', time: '10 րոպե', link: '/setlists', content: 'Օգտագործեք Live Mode-ը փորձերի և կիրակնօրյա ծառայությունների ժամանակ: Այն ցույց է տալիս ակորդները մեծ տառաչափով և թույլ է տալիս արագ անցումներ կատարել:' },
        { id: 't3', title: 'Ակորդների արտահանում և տպագրություն', desc: 'Ներբեռնեք և տպեք ակորդները Ձեր երաժիշտների համար:', time: '3 րոպե', link: '/songs', content: 'Ցանկացած երգի էջում սեղմեք տպագրման կամ PDF արտահանման կոճակը` երաժիշտների համար թղթային տարբերակ ունենալու համար:' },
      ]},
      { id: 'songs', icon: '🎵', title: 'Երգերի Ռեսուրսներ', color: '#38EF7D', items: [
        { id: 's1', title: 'Ամենաշատ Օգտագործվող Երգերը', desc: 'Այս տարվա ամենասիրված պաշտամունքի երգերը:', time: 'Ցուցակ', link: '/songs', content: 'Որոնեք մեր գրադարանը ըստ ժանրերի, տոնայնության և BPM-ի: Բոլոր երգերը պարունակում են ճշգրիտ ակորդներ և տեքստեր:' },
        { id: 's2', title: 'Երգեր ըստ Տոնայնության', desc: 'Ֆիլտրեք գրադարանը ըստ երաժշտական տոնայնության:', time: 'Ուղեցույց', link: '/songs', content: 'Ընտրեք Ձեր ձայնադիապազոնին համապատասխան տոնայնությունը երգերի որոնման ֆիլտրերից:' },
        { id: 's3', title: 'BPM-ի ուղեցույց', desc: 'Ինչպես կառուցել էներգիայի դինամիկան BPM-ով:', time: '6 րոպե', link: '/setlists', content: 'Երգացանկ կազմելիս սկսեք բարձր BPM ունեցող երգերից և աստիճանաբար անցեք ավելի դանդաղ, խորը պաշտամունքային երգերի:' },
      ]},
      { id: 'practices', icon: '💡', title: 'Լավագույն Փորձեր', color: '#F09819', items: [
        { id: 'p1', title: 'Անցումների կառավարումը պաշտամունքի ժամանակ', desc: 'Պահպանեք մթնոլորտը երգերի միջև:', time: '7 րոպե', link: '/community', content: 'Երգերի միջև սահուն անցումներ կատարելու համար նախապես պլանավորեք պադերը (Pads) կամ ստեղնաշարային ֆոնը նույն տոնայնության մեջ:' },
        { id: 'p2', title: 'Կիրակնօրյա ծառայության կառուցվածքը', desc: 'Հաջողված կառուցվածքներ համաշխարհային առաջնորդներից:', time: '9 րոպե', link: '/community', content: 'Standard 4-Song Flow: 1. Praise (Fast) -> 2. Joyful Praise (Mid-Fast) -> 3. Worship (Mid-Slow) -> 4. Deep Worship (Slow).' },
        { id: 'p3', title: 'Թիմի հետ հաղորդակցությունը', desc: 'Գործիքներ և սովորություններ արդյունավետ հաղորդակցության համար:', time: '5 րոպե', link: '/friends', content: 'Ուղարկեք երգացանկերը թիմին առնվազն 3 օր առաջ, որպեսզի յուրաքանչյուր երաժիշտ ժամանակ ունենա պատրաստվելու:' },
      ]},
    ],
    en: [
      { id: 'guides', icon: '📖', title: 'Guides', color: '#00F0FF', items: [
        { id: 'g1', title: 'Getting Started with Worship Platform', desc: 'A complete walkthrough for new users.', time: '5 min read', link: '/documentation', content: 'Welcome to Worship Platform! Learn how to search songs, build setlists, transpose chords, and invite team members.' },
        { id: 'g2', title: 'Building Your First Setlist', desc: 'Step-by-step guide to creating and sharing a setlist.', time: '8 min read', link: '/setlists', content: 'Click "Create Setlist" in the setlist tab, add songs via search, arrange order, and share with your team.' },
        { id: 'g3', title: 'Inviting Your Team', desc: 'How to add team members and assign roles.', time: '3 min read', link: '/friends', content: 'Connect with your worship team in the Friends section to share public setlists in real time.' },
      ]},
      { id: 'tutorials', icon: '🎓', title: 'Tutorials', color: '#9D72FF', items: [
        { id: 't1', title: 'Using the Chord Transposer', desc: 'Instantly change keys for any song in your library.', time: '4 min read', link: '/transpose', content: 'Use our instant chord transposer to switch keys, toggle flats/sharps, and print chord charts.' },
        { id: 't2', title: 'Advanced Setlist Features', desc: 'Master ordering, notes, and rehearsal planning.', time: '10 min read', link: '/setlists', content: 'Use Live Mode during Sunday services for high-visibility chords and smooth transitions.' },
        { id: 't3', title: 'Exporting & Printing Chord Sheets', desc: 'Download and print charts for your musicians.', time: '3 min read', link: '/songs', content: 'Export clean chord charts to PDF directly from any song page.' },
      ]},
      { id: 'songs', icon: '🎵', title: 'Song Resources', color: '#38EF7D', items: [
        { id: 's1', title: 'Top Worship Songs 2024', desc: 'The most-used worship songs this year.', time: 'List', link: '/songs', content: 'Explore top worship songs with accurate lyrics and chord charts.' },
        { id: 's2', title: 'Songs by Key Reference', desc: 'Filter our entire library by musical key.', time: 'Reference', link: '/songs', content: 'Find songs matching your vocal range using key filters.' },
        { id: 's3', title: 'BPM Guide for Worship Flows', desc: 'How to build energy curves in your setlist using BPM.', time: '6 min read', link: '/setlists', content: 'Structure your service flow from energetic opening songs to deep worship ballads.' },
      ]},
      { id: 'practices', icon: '💡', title: 'Best Practices', color: '#F09819', items: [
        { id: 'p1', title: 'Leading Worship Transitions', desc: 'Keep momentum between songs during service.', time: '7 min read', link: '/community', content: 'Use ambient pads and smooth musical transitions between songs.' },
        { id: 'p2', title: 'Structuring a Sunday Morning Setlist', desc: 'Proven structures used by worship leaders globally.', time: '9 min read', link: '/community', content: '4-song flow: Fast Praise -> Mid Praise -> Worship -> Deep Worship.' },
        { id: 'p3', title: 'Communicating with Your Team', desc: 'Tools and habits for effective rehearsal communication.', time: '5 min read', link: '/friends', content: 'Send setlists to your musicians at least 3 days in advance.' },
      ]},
    ],
    ru: [
      { id: 'guides', icon: '📖', title: 'Руководства', color: '#00F0FF', items: [
        { id: 'g1', title: 'Первые шаги с Worship Platform', desc: 'Полное руководство для новых пользователей.', time: '5 мин', link: '/documentation', content: 'Добро пожаловать в Worship Platform! Узнайте, как искать песни, создавать сет-листы и транспонировать аккорды.' },
        { id: 'g2', title: 'Создание первого сет-листа', desc: 'Пошаговое руководство по созданию и публикации сет-листа.', time: '8 мин', link: '/setlists', content: 'Нажмите "Создать сет-лист", добавьте песни и поделитесь с вашей командой.' },
        { id: 'g3', title: 'Приглашение команды', desc: 'Как добавить членов команды и назначить роли.', time: '3 мин', link: '/friends', content: 'Приглашайте участников группы в разделе "Друзья" для совместной работы.' },
      ]},
      { id: 'tutorials', icon: '🎓', title: 'Обучение', color: '#9D72FF', items: [
        { id: 't1', title: 'Использование транспозитора аккордов', desc: 'Мгновенно меняйте тональность любой песни.', time: '4 мин', link: '/transpose', content: 'Транспонируйте тональность в один клик и распечатывайте аккорды.' },
        { id: 't2', title: 'Продвинутые функции сет-листов', desc: 'Управление порядком, заметки и планирование репетиций.', time: '10 мин', link: '/setlists', content: 'Используйте Live Mode на служениях для крупного отображения аккордов.' },
        { id: 't3', title: 'Экспорт и печать аккордов', desc: 'Скачивайте и распечатывайте аккорды для музыкантов.', time: '3 мин', link: '/songs', content: 'Скачивайте PDF аккордов прямо со страницы песни.' },
      ]},
      { id: 'songs', icon: '🎵', title: 'Ресурсы для песен', color: '#38EF7D', items: [
        { id: 's1', title: 'Топ песен 2024', desc: 'Самые популярные песни этого года.', time: 'Список', link: '/songs', content: 'Самые популярные прославления с точными аккордами.' },
        { id: 's2', title: 'Песни по тональности', desc: 'Фильтрация всей библиотеки по тональности.', time: 'Справочник', link: '/songs', content: 'Подбирайте песни под ваш вокальный диапазон.' },
        { id: 's3', title: 'Руководство по BPM', desc: 'Как строить энергетические кривые в сет-листе.', time: '6 мин', link: '/setlists', content: 'Планируйте темп и динамику вашего служения.' },
      ]},
      { id: 'practices', icon: '💡', title: 'Лучшие практики', color: '#F09819', items: [
        { id: 'p1', title: 'Переходы в прославлении', desc: 'Сохраняйте динамику между песнями во время служения.', time: '7 мин', link: '/community', content: 'Используйте пэды и плавные переходы между аккордами.' },
        { id: 'p2', title: 'Структура воскресного сет-листа', desc: 'Проверенные структуры от лидеров поклонения.', time: '9 мин', link: '/community', content: 'Эффективная структура: Быстрая хвала -> Средний темп -> Поклонение.' },
        { id: 'p3', title: 'Общение с вашей командой', desc: 'Инструменты и привычки для эффективного общения.', time: '5 мин', link: '/friends', content: 'Отправляйте сет-листы музыкантам минимум за 3 дня до служения.' },
      ]},
    ],
  }[language] || [];

  const allCategories = categories.length > 0 ? categories : [];

  const filteredCategories = allCategories
    .filter(cat => activeCategory === 'all' || cat.id === activeCategory)
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(cat => cat.items.length > 0);

  return (
    <div className="resources-page">
      {/* HERO BANNER */}
      <div className="resources-hero">
        <div className="resources-hero-bg" />
        <div className="resources-hero-content">
          <span className="resources-badge">📚 {t('nav.resources', 'ՌԵՍՈՒՐՍՆԵՐ & ՈՒՂԵՑՈՒՅՑՆԵՐ')}</span>
          <h1>{t('resources.title', 'Բարձրացրեք Ձեր պաշտամունքի թիմի որակը')}</h1>
          <p>{t('resources.subtitle', 'Ուսումնասիրեք մեր ուղեցույցները, տեսադասընթացները և լավագույն փորձառությունները:')}</p>
          
          <div className="resources-search-wrapper">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={t('resources.search', 'Փնտրել ուղեցույցներ, դասընթացներ, թեմաներ...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      <div className="resources-main-container">
        {/* CATEGORY TABS */}
        <div className="resources-cat-tabs">
          <button 
            className={`cat-tab-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            ✨ {t('common.all', 'Բոլորը')}
          </button>
          {allCategories.map(cat => (
            <button 
              key={cat.id}
              className={`cat-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span>{cat.icon}</span> {cat.title}
            </button>
          ))}
        </div>

        {/* QUICK TOOLS SHORTCUT BANNER */}
        <div className="resources-tools-banner">
          <div className="tool-chip" onClick={() => navigate('/transpose')}>
            <span className="tool-icon">🎹</span>
            <div>
              <strong>{t('nav.transposer', 'Տրանսպոզիտոր')}</strong>
              <small>{t('resources.transposeDesc', 'Ակնթարթային ակորդների փոփոխում')}</small>
            </div>
          </div>
          <div className="tool-chip" onClick={() => navigate('/setlists')}>
            <span className="tool-icon">📋</span>
            <div>
              <strong>{t('nav.setlists', 'Երգացանկեր')}</strong>
              <small>{t('resources.setlistDesc', 'Կազմեք Ձեր կիրակնօրյա ծրագիրը')}</small>
            </div>
          </div>
          <div className="tool-chip" onClick={() => navigate('/community')}>
            <span className="tool-icon">🌐</span>
            <div>
              <strong>{t('nav.community', 'Համայնք')}</strong>
              <small>{t('resources.communityDesc', 'Փորձի փոխանակում թիմերի միջև')}</small>
            </div>
          </div>
        </div>

        {/* BENTO GRID */}
        <div className="resources-bento-sections">
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="bento-category-block">
              <div className="bento-cat-header">
                <span className="bento-cat-icon" style={{ background: cat.color + '18', border: `1px solid ${cat.color}40`, color: cat.color }}>
                  {cat.icon}
                </span>
                <h2 style={{ color: cat.color }}>{cat.title}</h2>
              </div>

              <div className="bento-items-grid">
                {cat.items.map((item) => (
                  <div 
                    key={item.id} 
                    className="bento-resource-card"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="bento-card-top">
                      <span className="bento-time-badge">{item.time}</span>
                      <span className="bento-arrow-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </span>
                    </div>
                    <div className="bento-card-body">
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL MODAL (Rendered at document.body via Portal) */}
      {selectedItem && createPortal(
        <div className="resource-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="resource-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-badge">{selectedItem.time}</span>
              <button className="modal-close-btn" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <h2>{selectedItem.title}</h2>
            <p className="modal-desc">{selectedItem.desc}</p>
            <div className="modal-content-box">
              <p>{selectedItem.content}</p>
            </div>
            <div className="modal-actions">
              {selectedItem.link && (
                <button 
                  className="modal-action-btn primary" 
                  onClick={() => { 
                    setSelectedItem(null); 
                    window.scrollTo(0, 0);
                    navigate(selectedItem.link); 
                  }}
                >
                  {t('resources.openTool', 'Բացել Գործիքը')} →
                </button>
              )}
              <button className="modal-action-btn secondary" onClick={() => setSelectedItem(null)}>
                {t('common.close', 'Փակել')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
