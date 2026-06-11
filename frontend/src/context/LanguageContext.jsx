import React, { createContext, useState, useContext, useEffect } from 'react';

const translations = {
  am: {
    nav: {
      home: 'Գլխավոր',
      songs: 'Երգեր',
      sets: 'Երգացանկեր',
      teams: 'Թիմ',
      community: 'Համայնք',
      pricing: 'Գներ',
      resources: 'Ռեսուրսներ',
      news: 'Նորություններ',
      login: 'Մուտք',
      register: 'Գրանցվել',
      logout: 'Դուրս գալ',
      search: 'Որոնել...',
      setlists: 'Երգացանկեր'
    },
    landing: {
      heroTitle1: 'Կազմակերպի՛ր',
      heroTitle2: 'Քո Պաշտամունքային Թիմը',
      heroSubtitle: 'Ծառայությունների պլանավորում, ակորդների հասանելիություն, ու թիմային համագործակցություն — մեկ հարթակում:',
      startBtn: 'Սկսել անվճար',
      watchDemo: 'Դիտել Demo',
      popularSongs: 'Հայտնի Երգեր',
      communityPicks: 'Համայնքի Ընտրություն',
      latestNews: 'Վերջին Նորություններ',
      browse: 'Թերթել',
      footerRights: '© 2024 Worship Platform. Բոլոր իրավունքները պաշտպանված են:',
    },
    songs: {
      title: 'Երգարան',
      search: 'Որոնել երգեր, հեղինակներ...',
      tableTitle: 'Անվանում',
      tableKey: 'Տոն.',
      tableBpm: 'BPM',
      tableAuthor: 'Հեղինակ',
      tableAdded: 'Ավելացված',
      openReader: 'Բացել',
      noResults: 'Ոչ մի արդյունք չի գտնվել',
      loading: 'Բեռնվում է...',
      sortTitle: 'Կարգ. Անուն',
      sortBpm: 'Կարգ. BPM',
      sortKey: 'Կարգ. Տոն.',
      sortRecent: 'Վերջին ավելացվածը',
    },
    setlists: {
      loginPrompt: 'Խնդրում ենք մուտք գործել՝ երգացանկեր կազմելու համար։',
      newSetlist: '+ Նոր Երգացանկ',
      errorLoad: 'Չհաջողվեց բեռնել երգացանկերը',
      colTitle: 'Անվանում',
      colDate: 'Ամսաթիվ',
      colSongs: 'Երգեր',
      colType: 'Տեսակ',
      loading: 'Բեռնվում է...',
      empty: 'Դուք չունեք պահպանված երգացանկեր',
      unknownDate: 'Անհայտ',
      songsCount: 'երգ',
      typeShared: 'Համատեղ',
      typePersonal: 'Անձնական',
      edit: 'Խմբագրել',
      errorFetch: 'Չհաջողվեց բեռնել երգացանկի տվյալները',
      goBack: 'Հետ գնալ',
      addSong: '+ Ավելացնել երգ',
      closeSearch: 'Փակել փնտրումը',
      searchPlaceholder: 'Փնտրել երգ ավելացնելու համար...',
      searchBtn: 'Փնտրել',
      addBtn: 'Ավելացնել',
      emptySetlist: 'Երգացանկը դատարկ է։ Ավելացրեք երգեր փնտրման միջոցով։',
      noKey: 'Չկա',
      remove: 'Հեռացնել',
      confirmRemove: 'Համոզվա՞ծ եք, որ ուզում եք հեռացնել:'
    },
    news: { 
      title: 'Նորություններ և Թարմացումներ'
    },
    teams: {
      hero: 'Ղեկավարի՛ր Քո Թիմը Վստահությամբ',
      badge: 'Պաշտամունքային Ղեկավարների համար',
      subtitle: 'Ամեն ինչ, ինչ անհրաժեշտ է քո պաշտամունքային թիմը համակարգելու համար՝ մեկ հզոր, հեշտ օգտագործվող հարթակում:',
      cta: 'Տեսնել Գները',
      ctaJoin: 'Սկսել Անվճար',
      dashboard: 'Գնալ Վահանակ',
      featuresTitle: 'Այն Ամենը, Ինչ Քո Թիմին Անհրաժեշտ Է',
      ctaTitle: 'Պատրա՞ստ ես զինել քո թիմը:',
      ctaSub: 'Միացիր հազարավոր պաշտամունքային թիմերին, ովքեր արդեն օգտագործում են Worship Platform-ը:'
    },
    pricing: {
      badge: 'Պարզ Գներ',
      title: 'Պլաններ Բոլոր Թիմերի Համար',
      subtitle: 'Սկսիր անվճար: Ընդլայնիր, երբ Քո ծառայությունն աճի:',
      faqTitle: 'Հաճախ Տրվող Հարցեր',
      popular: 'Ամենապահանջված'
    },
    community: {
      title: 'Համայնքային Ֆորում',
      subtitle: 'Կապ հաստատիր աշխարհի տարբեր երկրների պաշտամունքային ղեկավարների հետ:',
      trending: '🔥 Թրենդային Թեմաներ',
      resources: '📌 Ռեսուրսներ',
      browseLibrary: '🎵 Թերթել Երգարանը',
      createSetlist: '📋 Ստեղծել Երգացանկ',
      latestNews: '📰 Վերջին Նորությունները',
      replies: 'պատասխան',
      share: 'Կիսվել'
    },
    resources: {
      title: 'Ռեսուրսներ',
      subtitle: 'Ուղեցույցներ, ձեռնարկներ և գործիքներ քո թիմի հաջողության համար:',
      search: 'Որոնել ռեսուրսներ...'
    },
    songView: {
      key: 'Տոնայնություն:',
      tempo: 'Տեմպ:',
      addToSetlist: 'Ավելացնել երգացանկում',
      download: 'Ներբեռնել',
      edit: 'Խմբագրել',
      noLyrics: 'Տեքստը կամ ակորդները բացակայում են:'
    }
  },
  en: {
    nav: {
      home: 'Home',
      songs: 'Songs',
      sets: 'Sets',
      teams: 'Teams',
      community: 'Community',
      pricing: 'Pricing',
      resources: 'Resources',
      news: 'News',
      login: 'Log In',
      register: 'Get Started',
      logout: 'Log Out',
      search: 'Search songs…',
      setlists: 'Setlists'
    },
    landing: {
      heroTitle1: 'Equip Your',
      heroTitle2: 'Worship Team',
      heroSubtitle: 'Streamline Service Planning, Access Modern Chords, and Collaborate Freely.',
      startBtn: 'Start for Free',
      watchDemo: 'Watch Demo',
      popularSongs: 'Popular Songs',
      communityPicks: 'Community Picks',
      latestNews: 'Latest News',
      browse: 'Browse',
      footerRights: '© 2024 Worship Platform. All rights reserved.',
    },
    songs: {
      title: 'Song Library',
      search: 'Search songs, artists...',
      tableTitle: 'Title',
      tableKey: 'Key',
      tableBpm: 'BPM',
      tableAuthor: 'Artist',
      tableAdded: 'Added',
      openReader: 'Open',
      noResults: 'No results found',
      loading: 'Loading...',
      sortTitle: 'Sort: Title A–Z',
      sortBpm: 'Sort: BPM',
      sortKey: 'Sort: Key',
      sortRecent: 'Recently Added',
    },
    setlists: {
      loginPrompt: 'Please log in to create and manage setlists.',
      newSetlist: '+ New Setlist',
      errorLoad: 'Failed to load setlists',
      colTitle: 'Title',
      colDate: 'Date',
      colSongs: 'Songs',
      colType: 'Type',
      loading: 'Loading...',
      empty: 'You have no saved setlists',
      unknownDate: 'Unknown',
      songsCount: 'songs',
      typeShared: 'Shared',
      typePersonal: 'Personal',
      edit: 'Edit',
      errorFetch: 'Failed to fetch setlist data',
      goBack: 'Go Back',
      addSong: '+ Add Song',
      closeSearch: 'Close Search',
      searchPlaceholder: 'Search song to add...',
      searchBtn: 'Search',
      addBtn: 'Add',
      emptySetlist: 'Setlist is empty. Add songs using search.',
      noKey: 'None',
      remove: 'Remove',
      confirmRemove: 'Are you sure you want to remove this?'
    },
    news: { title: 'News & Updates' },
    teams: {
      hero: 'Lead Your Team With Confidence',
      badge: 'For Worship Leaders',
      subtitle: 'Everything you need to coordinate your worship team in one powerful, easy-to-use platform.',
      cta: 'See Plans & Pricing',
      ctaJoin: 'Start Free Trial',
      dashboard: 'Go to Dashboard',
      featuresTitle: 'Everything Your Team Needs',
      ctaTitle: 'Ready to Equip Your Team?',
      ctaSub: 'Join thousands of worship teams already using Worship Platform.'
    },
    pricing: {
      badge: 'Simple Pricing',
      title: 'Plans for Every Team',
      subtitle: 'Start free. Upgrade as your ministry grows. Cancel anytime.',
      faqTitle: 'Frequently Asked Questions',
      popular: 'Most Popular'
    },
    community: {
      title: 'Community Forum',
      subtitle: 'Connect with worship leaders and musicians from around the world.',
      trending: '🔥 Trending Topics',
      resources: '📌 Resources',
      browseLibrary: '🎵 Browse Song Library',
      createSetlist: '📋 Create a Setlist',
      latestNews: '📰 Latest News',
      replies: 'replies',
      share: 'Share'
    },
    resources: {
      title: 'Resources',
      subtitle: 'Guides, tutorials, and tools to help your worship team thrive.',
      search: 'Search resources…'
    },
    songView: {
      key: 'Key:',
      tempo: 'Tempo:',
      addToSetlist: 'Add to Setlist',
      download: 'Download',
      edit: 'Edit',
      noLyrics: 'Lyrics or chords are missing.'
    }
  },
  ru: {
    nav: {
      home: 'Главная',
      songs: 'Песни',
      sets: 'Сет-листы',
      teams: 'Команда',
      community: 'Сообщество',
      pricing: 'Цены',
      resources: 'Ресурсы',
      news: 'Новости',
      login: 'Войти',
      register: 'Начать',
      logout: 'Выйти',
      search: 'Искать песни…',
      setlists: 'Сет-листы'
    },
    landing: {
      heroTitle1: 'Снарядите',
      heroTitle2: 'Вашу Команду',
      heroSubtitle: 'Планирование служений, доступ к аккордам и командное сотрудничество — на одной платформе.',
      startBtn: 'Начать бесплатно',
      watchDemo: 'Смотреть Demo',
      popularSongs: 'Популярные Песни',
      communityPicks: 'Выбор Сообщества',
      latestNews: 'Последние Новости',
      browse: 'Просмотр',
      footerRights: '© 2024 Worship Platform. Все права защищены.',
    },
    songs: {
      title: 'Библиотека Песен',
      search: 'Поиск песен, авторов...',
      tableTitle: 'Название',
      tableKey: 'Тон.',
      tableBpm: 'BPM',
      tableAuthor: 'Автор',
      tableAdded: 'Добавлено',
      openReader: 'Открыть',
      noResults: 'Результаты не найдены',
      loading: 'Загрузка...',
      sortTitle: 'Сорт.: Название',
      sortBpm: 'Сорт.: BPM',
      sortKey: 'Сорт.: Тональность',
      sortRecent: 'Недавно добавленные',
    },
    setlists: {
      loginPrompt: 'Пожалуйста, войдите, чтобы создавать сет-листы.',
      newSetlist: '+ Новый Сет-лист',
      errorLoad: 'Не удалось загрузить сет-листы',
      colTitle: 'Название',
      colDate: 'Дата',
      colSongs: 'Песни',
      colType: 'Тип',
      loading: 'Загрузка...',
      empty: 'У вас нет сохраненных сет-листов',
      unknownDate: 'Неизвестно',
      songsCount: 'песен',
      typeShared: 'Общий',
      typePersonal: 'Личный',
      edit: 'Редактировать',
      errorFetch: 'Не удалось загрузить данные сет-листа',
      goBack: 'Назад',
      addSong: '+ Добавить песню',
      closeSearch: 'Закрыть поиск',
      searchPlaceholder: 'Искать песню...',
      searchBtn: 'Найти',
      addBtn: 'Добавить',
      emptySetlist: 'Сет-лист пуст. Добавьте песни через поиск.',
      noKey: 'Нет',
      remove: 'Удалить',
      confirmRemove: 'Вы уверены, что хотите удалить?'
    },
    news: { title: 'Новости и Обновления' },
    teams: {
      hero: 'Руководите Командой с Уверенностью',
      badge: 'Для Лидеров Поклонения',
      subtitle: 'Всё необходимое для координации команды поклонения на одной платформе.',
      cta: 'Посмотреть Цены',
      ctaJoin: 'Начать Бесплатно',
      dashboard: 'В Панель Управления',
      featuresTitle: 'Всё, что нужно вашей команде',
      ctaTitle: 'Готовы снарядить команду?',
      ctaSub: 'Присоединяйтесь к тысячам команд, уже использующим Worship Platform.'
    },
    pricing: {
      badge: 'Простые Цены',
      title: 'Планы для Любой Команды',
      subtitle: 'Начните бесплатно. Переходите на следующий уровень по мере роста.',
      faqTitle: 'Часто Задаваемые Вопросы',
      popular: 'Популярный'
    },
    community: {
      title: 'Форум Сообщества',
      subtitle: 'Общайтесь с лидерами поклонения и музыкантами со всего мира.',
      trending: '🔥 Популярные Темы',
      resources: '📌 Ресурсы',
      browseLibrary: '🎵 Смотреть Библиотеку',
      createSetlist: '📋 Создать Сет-лист',
      latestNews: '📰 Последние Новости',
      replies: 'ответов',
      share: 'Поделиться'
    },
    resources: {
      title: 'Ресурсы',
      subtitle: 'Руководства, обучение и инструменты для вашей команды.',
      search: 'Поиск ресурсов…'
    },
    songView: {
      key: 'Том:',
      tempo: 'Темп:',
      addToSetlist: 'В сет-лист',
      download: 'Скачать',
      edit: 'Редактировать',
      noLyrics: 'Текст или аккорды отсутствуют.'
    }
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(localStorage.getItem('worship_lang') || 'am');

  useEffect(() => {
    localStorage.setItem('worship_lang', language);
    // Set html lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback: try English, then return key
        let fallback = translations['en'];
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) fallback = fallback[fk];
          else return key;
        }
        return typeof fallback === 'string' ? fallback : key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, lang: language, setLang: setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
