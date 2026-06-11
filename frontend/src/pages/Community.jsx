import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Community.css';

export default function Community() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('All');
  const [likedPosts, setLikedPosts] = useState({});
  
  const tagColors = {
    Question: '#0A84FF',
    Discussion: '#BF5AF2',
    Tip: '#FFD60A',
    Resource: '#32D74B'
  };
  
  const tabs = {
    am: ['Ամբողջը', 'Հարցեր', 'Քննարկում', 'Ռեսուրսներ', 'Խորհուրդներ'],
    en: ['All', 'Questions', 'Discussion', 'Resources', 'Tips'],
    ru: ['Все', 'Вопросы', 'Обсуждение', 'Ресурсы', 'Советы']
  }[language] || ['All', 'Questions', 'Discussion', 'Resources', 'Tips'];

  const enTabs = ['All', 'Questions', 'Discussion', 'Resources', 'Tips'];
  const activeEnTab = enTabs[tabs.indexOf(activeTab)] || 'All';

  const posts = {
    am: [
      { id: 1, avatar: '🎸', user: 'Դավիթ Մ.', time: '2 ժամ առաջ', title: 'Լավագույն ակուստիկ երգերը փոքր եկեղեցիների համար:', body: 'Մենք ունենք փոքր եկեղեցի և հիմնականում ակուստիկ գործիքներ ենք օգտագործում: Խորհուրդ կտա՞ք երգեր:', likes: 24, replies: 8, tag: 'Question' },
      { id: 2, avatar: '🎹', user: 'Սառա Կ.', time: '5 ժամ առաջ', title: 'Ինչպե՞ս եք կառուցում Կիրակնօրյա երգացանկը:', body: 'Ես փորձարկում եմ տարբեր հերթականություններ՝ սկսելով բարձր տեմպից կամ դանդաղ զարգացումից: Ի՞նչն է աշխատում ձեզ մոտ:', likes: 41, replies: 15, tag: 'Discussion' },
      { id: 3, avatar: '🎤', user: 'Արամ Ռ.', time: '1 օր առաջ', title: 'Խորհուրդներ երգերի միջև սահուն անցումների համար', body: 'Ամենամեծ մարտահրավերներից մեկը անցումների ժամանակ մթնոլորտը պահելն է: Ահա որոշ տեխնիկաներ...', likes: 67, replies: 22, tag: 'Tip' },
      { id: 4, avatar: '🥁', user: 'Մարիա Տ.', time: '2 օր առաջ', title: 'Նոր ակորդներ՝ Hillsong United հավաքածու', body: 'Հենց նոր վերբեռնեցի 12 նոր երգ Hillsong-ի վերջին ալբոմից: Բոլորը տրանսպոզիցիայի հնարավորությամբ:', likes: 89, replies: 6, tag: 'Resource' },
    ],
    en: [
      { id: 1, avatar: '🎸', user: 'David M.', time: '2 hours ago', title: 'Best acoustic worship songs for small congregations?', body: 'We have a small church with mostly acoustic instruments. Looking for song recommendations that work well without a full band...', likes: 24, replies: 8, tag: 'Question' },
      { id: 2, avatar: '🎹', user: 'Sarah K.', time: '5 hours ago', title: 'How do you structure your Sunday morning setlist?', body: "I've been experimenting with different song orders - starting with high energy vs slow build. What works for your church?", likes: 41, replies: 15, tag: 'Discussion' },
      { id: 3, avatar: '🎤', user: 'James R.', time: '1 day ago', title: 'Tips for transitioning between songs smoothly', body: 'One of the biggest challenges is keeping momentum during transitions. Here are some techniques that have helped us...', likes: 67, replies: 22, tag: 'Tip' },
      { id: 4, avatar: '🥁', user: 'Maria T.', time: '2 days ago', title: 'New chord charts added: Hillsong United collection', body: "Just uploaded 12 new charts from Hillsong United's latest album. All transposable. Let me know if you find errors!", likes: 89, replies: 6, tag: 'Resource' },
    ],
    ru: [
      { id: 1, avatar: '🎸', user: 'Давид М.', time: '2 часа назад', title: 'Лучшие акустические песни для небольших церквей?', body: 'У нас небольшая церковь и в основном акустические инструменты. Ищу рекомендации по песням...', likes: 24, replies: 8, tag: 'Question' },
      { id: 2, avatar: '🎹', user: 'Сара К.', time: '5 часов назад', title: 'Как вы строите воскресный сет-лист?', body: 'Я экспериментирую с разным порядком песен - начинать с высокой энергии или с медленного развития. Что работает у вас?', likes: 41, replies: 15, tag: 'Discussion' },
      { id: 3, avatar: '🎤', user: 'Джеймс Р.', time: '1 день назад', title: 'Советы по плавным переходам между песнями', body: 'Одна из главных проблем — сохранить атмосферу во время переходов. Вот несколько техник...', likes: 67, replies: 22, tag: 'Tip' },
      { id: 4, avatar: '🥁', user: 'Мария Т.', time: '2 дня назад', title: 'Добавлены новые аккорды: сборник Hillsong United', body: 'Только что загрузила 12 новых песен из последнего альбома Hillsong. Все с транспозицией!', likes: 89, replies: 6, tag: 'Resource' },
    ]
  }[language] || [];

  const toggleLike = (postId) => {
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const filtered = activeEnTab === 'All' ? posts : posts.filter(p => p.tag === activeEnTab.slice(0, -1));

  return (
    <div className="community-page">
      <div className="community-header">
        <div className="community-container">
          <h1>{t('community.title')}</h1>
          <p>{t('community.subtitle')}</p>
          <div className="community-tabs">
            {tabs.map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="community-container community-body">
        <div className="posts-list">
          {filtered.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-avatar">{post.avatar}</div>
              <div className="post-content">
                <div className="post-meta">
                  <span className="post-user">{post.user}</span>
                  <span className="post-time">{post.time}</span>
                  <span className="post-tag" style={{ background: tagColors[post.tag] + '22', color: tagColors[post.tag], border: `1px solid ${tagColors[post.tag]}44` }}>
                    {tabs[enTabs.indexOf(post.tag + 's')]?.slice(0, -1) || post.tag}
                  </span>
                </div>
                <h3 className="post-title">{post.title}</h3>
                <p className="post-body">{post.body}</p>
                <div className="post-actions">
                  <button
                    className="post-action-btn"
                    onClick={() => toggleLike(post.id)}
                    style={{ color: likedPosts[post.id] ? '#FF4A6A' : undefined, borderColor: likedPosts[post.id] ? 'rgba(255,74,106,0.3)' : undefined }}
                  >
                    {likedPosts[post.id] ? '♥' : '♡'} {post.likes + (likedPosts[post.id] ? 1 : 0)}
                  </button>
                  <button className="post-action-btn">💬 {post.replies} {t('community.replies')}</button>
                  <button className="post-action-btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}>{t('community.share')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="community-sidebar">
          <div className="sidebar-widget">
            <h3>{t('community.trending')}</h3>
            <ul>
              {['Setlist Planning', 'Chord Transposition', 'Acoustic Worship', 'Team Coordination', 'Song Selection'].map(t => (
                <li key={t}><span className="trend-dot" />#{t.replace(' ', '')}</li>
              ))}
            </ul>
          </div>
          <div className="sidebar-widget">
            <h3>{t('community.resources')}</h3>
            <ul>
              <li onClick={() => navigate('/songs')}>{t('community.browseLibrary')}</li>
              <li onClick={() => navigate('/setlists')}>{t('community.createSetlist')}</li>
              <li onClick={() => navigate('/news')}>{t('community.latestNews')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
