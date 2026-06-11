import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Resources.css';

export default function Resources() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { t, language } = useLanguage();

  const categories = {
    am: [
      { icon: '📖', title: 'Ուղեցույցներ', color: '#00F0FF', items: [
        { title: 'Worship Platform-ի սկզբնական քայլերը', desc: 'Ամբողջական ուղեցույց նոր օգտատերերի համար:', time: '5 րոպե' },
        { title: 'Առաջին երգացանկի ստեղծումը', desc: 'Քայլ առ քայլ երգացանկի ստեղծում և համատեղում:', time: '8 րոպե' },
        { title: 'Թիմի հրավեր', desc: 'Ինչպես ավելացնել թիմի անդամներ և տրամադրել դերեր:', time: '3 րոպե' },
      ]},
      { icon: '🎓', title: 'Դասընթացներ', color: '#9D72FF', items: [
        { title: 'Ակորդների տրանսպոզիցիայի օգտագործումը', desc: 'Ակնթարթորեն փոխեք ցանկացած երգի տոնայնությունը:', time: '4 րոպե' },
        { title: 'Երգացանկերի ընդլայնված ֆունկցիաները', desc: 'Հերթականություն, նշումներ և փորձերի պլանավորում:', time: '10 րոպե' },
        { title: 'Ակորդների արտահանում և տպագրություն', desc: 'Ներբեռնեք և տպեք ակորդները Ձեր երաժիշտների համար:', time: '3 րոպե' },
      ]},
      { icon: '🎵', title: 'Երգերի Ռեսուրսներ', color: '#38EF7D', items: [
        { title: '2024-ի Լավագույն 100 Երգերը', desc: 'Այս տարվա ամենաշատ օգտագործվող երգերը:', time: 'Ցուցակ' },
        { title: 'Երգեր ըստ Տոնայնության', desc: 'Ֆիլտրեք գրադարանը ըստ երաժշտական տոնայնության:', time: 'Ուղեցույց' },
        { title: 'BPM-ի ուղեցույց', desc: 'Ինչպես կառուցել էներգիայի դինամիկան BPM-ով:', time: '6 րոպե' },
      ]},
      { icon: '💡', title: 'Լավագույն Փորձեր', color: '#F09819', items: [
        { title: 'Անցումների կառավարումը պաշտամունքի ժամանակ', desc: 'Պահպանեք մթնոլորտը երգերի միջև:', time: '7 րոպե' },
        { title: 'Կիրակնօրյա ծառայության կառուցվածքը', desc: 'Հաջողված կառուցվածքներ համաշխարհային առաջնորդներից:', time: '9 րոպե' },
        { title: 'Թիմի հետ հաղորդակցությունը', desc: 'Գործիքներ և սովորություններ արդյունավետ հաղորդակցության համար:', time: '5 րոպե' },
      ]},
    ],
    en: [
      { icon: '📖', title: 'Guides', color: '#00F0FF', items: [
        { title: 'Getting Started with Worship Platform', desc: 'A complete walkthrough for new users.', time: '5 min read' },
        { title: 'Building Your First Setlist', desc: 'Step-by-step guide to creating and sharing a setlist.', time: '8 min read' },
        { title: 'Inviting Your Team', desc: 'How to add team members and assign roles.', time: '3 min read' },
      ]},
      { icon: '🎓', title: 'Tutorials', color: '#9D72FF', items: [
        { title: 'Using the Chord Transposer', desc: 'Instantly change keys for any song in your library.', time: '4 min read' },
        { title: 'Advanced Setlist Features', desc: 'Master ordering, notes, and rehearsal planning.', time: '10 min read' },
        { title: 'Exporting & Printing Chord Sheets', desc: 'Download and print charts for your musicians.', time: '3 min read' },
      ]},
      { icon: '🎵', title: 'Song Resources', color: '#38EF7D', items: [
        { title: 'Top 100 Worship Songs 2024', desc: 'The most-used worship songs this year.', time: 'List' },
        { title: 'Songs by Key: Complete Reference', desc: 'Filter our entire library by musical key.', time: 'Reference' },
        { title: 'BPM Guide for Worship Flows', desc: 'How to build energy curves in your setlist using BPM.', time: '6 min read' },
      ]},
      { icon: '💡', title: 'Best Practices', color: '#F09819', items: [
        { title: 'How to Lead Worship Transitions', desc: 'Keep momentum between songs during service.', time: '7 min read' },
        { title: 'Structuring a Sunday Morning Setlist', desc: 'Proven structures used by worship leaders globally.', time: '9 min read' },
        { title: 'Communicating with Your Team', desc: 'Tools and habits for effective rehearsal communication.', time: '5 min read' },
      ]},
    ],
    ru: [
      { icon: '📖', title: 'Руководства', color: '#00F0FF', items: [
        { title: 'Первые шаги с Worship Platform', desc: 'Полное руководство для новых пользователей.', time: '5 мин' },
        { title: 'Создание первого сет-листа', desc: 'Пошаговое руководство по созданию и публикации сет-листа.', time: '8 мин' },
        { title: 'Приглашение команды', desc: 'Как добавить членов команды и назначить роли.', time: '3 мин' },
      ]},
      { icon: '🎓', title: 'Обучение', color: '#9D72FF', items: [
        { title: 'Использование транспозитора аккордов', desc: 'Мгновенно меняйте тональность любой песни в библиотеке.', time: '4 мин' },
        { title: 'Продвинутые функции сет-листов', desc: 'Управление порядком, заметки и планирование репетиций.', time: '10 мин' },
        { title: 'Экспорт и печать аккордов', desc: 'Скачивайте и распечатывайте аккорды для музыкантов.', time: '3 мин' },
      ]},
      { icon: '🎵', title: 'Ресурсы для песен', color: '#38EF7D', items: [
        { title: 'Топ 100 песен 2024', desc: 'Самые популярные песни этого года.', time: 'Список' },
        { title: 'Песни по тональности: Справочник', desc: 'Фильтрация всей библиотеки по тональности.', time: 'Справочник' },
        { title: 'Руководство по BPM для прославления', desc: 'Как строить энергетические кривые в сет-листе с помощью BPM.', time: '6 мин' },
      ]},
      { icon: '💡', title: 'Лучшие практики', color: '#F09819', items: [
        { title: 'Как управлять переходами в прославлении', desc: 'Сохраняйте динамику между песнями во время служения.', time: '7 мин' },
        { title: 'Структура воскресного утреннего сет-листа', desc: 'Проверенные структуры, используемые лидерами поклонения по всему миру.', time: '9 мин' },
        { title: 'Общение с вашей командой', desc: 'Инструменты и привычки для эффективного общения на репетициях.', time: '5 мин' },
      ]},
    ],
  }[language] || [];

  const currentCategories = categories.length > 0 ? categories : [];
  
  const filtered = currentCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="resources-page">
      <div className="resources-header">
        <h1>{t('resources.title')}</h1>
        <p>{t('resources.subtitle')}</p>
        <div className="resources-search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder={t('resources.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="resources-container">
        {filtered.map((cat, i) => (
          <div key={i} className="resource-category">
            <div className="resource-cat-header">
              <span className="cat-icon" style={{ background: cat.color + '22', border: `1px solid ${cat.color}44` }}>
                {cat.icon}
              </span>
              <h2 style={{ color: cat.color }}>{cat.title}</h2>
            </div>
            <div className="resource-items">
              {cat.items.map((item, j) => (
                <div key={j} className="resource-item" onClick={() => {}}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                  <span className="resource-time">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
