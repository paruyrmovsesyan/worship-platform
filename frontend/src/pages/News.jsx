import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './SongsApp.css';

export default function News() {
  const { t, language } = useLanguage();

  const newsData = {
    am: [
      { id: 1, date: 'Ապրիլ 12, 2024', title: 'Նոր Ֆունկցիա: Դինամիկ Տրանսպոզիցիա!', excerpt: 'Մենք ուրախ ենք տեղեկացնել մեր նոր հարթակի մեկնարկի մասին: Այժմ ակորդների որոնումն ու երգացանկերի կազմումը ավելի հեշտ է:', tag: 'Թարմացում', imgClass: 'bg-purple' },
      { id: 2, date: 'Ապրիլ 28, 2024', title: 'Երգացանկերի Պլանավորման Գաղտնիքները', excerpt: 'Այս շաբաթ մեր գրադարանը համալրվել է ավելի քան 50 նոր հայկական և միջազգային հոգևոր երգերով:', tag: 'Ուղեցույց', imgClass: 'bg-cyan' },
      { id: 3, date: 'Մայիս 15, 2024', title: 'Տարվա Լավագույն 10 Երգերը', excerpt: 'Բացահայտեք այս տարվա ամենաշատ օգտագործվող երգերը պաշտամունքային թիմերի կողմից ամբողջ աշխարհում:', tag: 'Երաժշտություն', imgClass: 'bg-blue' }
    ],
    en: [
      { id: 1, date: 'April 12, 2024', title: 'New Feature: Dynamic Transposition!', excerpt: 'We are excited to announce the launch of our new platform for worship teams. Finding chords and building setlists is now easier.', tag: 'Update', imgClass: 'bg-purple' },
      { id: 2, date: 'April 28, 2024', title: 'Mastering Your Setlist Planning', excerpt: 'This week our library was updated with over 50 new Armenian and international worship songs.', tag: 'Guide', imgClass: 'bg-cyan' },
      { id: 3, date: 'May 15, 2024', title: 'Top 10 Worship Songs of the Year', excerpt: 'Discover the most used songs by worship teams around the world this year.', tag: 'Music', imgClass: 'bg-blue' }
    ],
    ru: [
      { id: 1, date: '12 Апреля, 2024', title: 'Новая функция: Динамическая транспозиция!', excerpt: 'Мы рады объявить о запуске нашей новой платформы. Теперь искать аккорды и составлять сет-листы еще проще.', tag: 'Обновление', imgClass: 'bg-purple' },
      { id: 2, date: '28 Апреля, 2024', title: 'Секреты планирования сет-листа', excerpt: 'На этой неделе наша библиотека пополнилась более чем 50 новыми песнями.', tag: 'Руководство', imgClass: 'bg-cyan' },
      { id: 3, date: '15 Мая, 2024', title: 'Топ 10 песен года', excerpt: 'Узнайте самые популярные песни среди команд поклонения по всему миру в этом году.', tag: 'Музыка', imgClass: 'bg-blue' }
    ]
  };

  const mockNews = newsData[language] || newsData.en;


  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '48px' }}>
        <h1 className="page-title">{t('news.title')}</h1>
      </div>

      <div className="news-grid" style={{ display: 'grid', gap: '32px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {mockNews.map(item => (
          <div key={item.id} className="news-card glass-panel" style={{ 
            borderRadius: '16px', 
            overflow: 'hidden',
            transition: 'transform 0.3s, border-color 0.3s',
            cursor: 'pointer'
          }}>
            <div className={`news-image ${item.imgClass}`} style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <svg viewBox="0 0 24 24" width="48" height="48" fill="rgba(255,255,255,0.2)"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="badge">
                  {item.tag}
                </span>
                <span className="muted-text" style={{ fontSize: '0.85rem' }}>{item.date}</span>
              </div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', fontWeight: '700', lineHeight: '1.3' }}>{item.title}</h3>
              <p className="muted-text" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>{item.excerpt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
