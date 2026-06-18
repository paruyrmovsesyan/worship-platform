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
    megaMenu: {
      features: 'Հնարավորություններ',
      music: 'Երաժշտություն',
      management: 'Կառավարում',
      latestArrival: 'Նորություններ',
      discoverSongs: 'Բացահայտեք նոր երգեր, ակորդներ և ստեղծեք երգացանկեր:',
      readArticle: 'Կարդալ ավելին »',
      communityDesc: 'Միացեք մեր համայնքին, կիսվեք փորձով և գտեք նոր ընկերներ:',
      joinNow: 'Միանալ հիմա »',
      materials: 'Նյութեր',
      info: 'Տեղեկատվություն',
      contacts: 'Կապ'
    },
    landing: {
      heroTitle1: 'Կազմակերպի՛ր',
      heroTitle2: 'Քո Պաշտամունքային Թիմը',
      heroSubtitle: 'Ծառայությունների պլանավորում, ակորդների հասանելիություն, ու թիմային համագործակցություն — մեկ հարթակում:',
      startBtn: 'Սկսել անվճար',
      watchDemo: 'Դիտել Demo',
      popularSongs: 'Հայտնի Երգեր',
      communityPicks: 'Համայնքի Ընտրություն',
      browse: 'Թերթել',
      browseSongs: 'Երգեր',
      browseArtists: 'Արտիստներ',
      browseCollections: 'Հավաքածուներ',
      browseByKey: 'Ըստ տոնայնության',
      browseByBPM: 'Ըստ տեմպի',
      heroSubtitle1: 'Ավելի խելացի',
      latestNews: 'Վերջին Նորություններ',
      footerRights: '© 2026 Worship Platform. Բոլոր իրավունքները պաշտպանված են:',
      unknownArtist: 'Անհայտ արտիստ',
      picks: [
        { title: 'Երախտագիտություն', artist: 'Բրենդոն Լեյք', meta: 'Երգացանկ 14 · 9380 դիտում' },
        { title: 'Գերեզմաններից Պարտեզներ', artist: 'Bethel Worship', meta: 'Երգացանկ 17 · 320 դիտում' },
        { title: 'Ճանապարհ Բացող', artist: 'Sinach', meta: 'Երգացանկ 22 · 15k դիտում' }
      ],
      newsItems: [
        { date: 'Ապր 12, 2024', title: 'Նոր Հնարավորություն՝ Դինամիկ Տոնայնություն:', desc: 'Այժմ կարող եք փոխել երգի տոնայնությունը մեկ քլիքով:' },
        { date: 'Ապր 28, 2024', title: 'Տիրապետեք Երգացանկերի Պլանավորմանը', desc: 'Բացահայտեք, թե ինչպես է մեր գործիքը օգնում պլանավորել ծառայությունը:' },
        { date: 'Մայ 18, 2024', title: 'Համագործակցեք Ձեր Թիմի Հետ', desc: 'Կիսվեք ակորդներով և նշումներով Ձեր թիմի յուրաքանչյուր անդամի հետ:' }
      ],
      footer: {
        product: 'Պրոդուկտ',
        company: 'Ընկերություն',
        resources: 'Ռեսուրսներ',
        legal: 'Իրավական',
        songs: 'Երգեր',
        teams: 'Թիմ',
        pricing: 'Գներ',
        setlists: 'Երգացանկեր',
        about: 'Մեր մասին',
        blog: 'Բլոգ',
        careers: 'Կարիերա',
        community: 'Համայնք',
        documentation: 'Փաստաթղթեր',
        tutorials: 'Ուսուցում',
        support: 'Աջակցություն',
        privacyPolicy: 'Գաղտնիության քաղաքականություն',
        terms: 'Պայմաններ',
        cookies: 'Քուքիներ'
      }
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
      unknownArtist: 'Անհայտ արտիստ',
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
    megaMenu: {
      features: 'Features',
      music: 'Music',
      management: 'Management',
      latestArrival: 'Latest Updates',
      discoverSongs: 'Discover new songs, chords, and build your setlists.',
      readArticle: 'Read more »',
      communityDesc: 'Join our community, share your experience and connect with others.',
      joinNow: 'Join now »',
      materials: 'Materials',
      info: 'Information',
      contacts: 'Contacts'
    },
    landing: {
      heroTitle1: 'Equip Your',
      heroTitle2: 'Worship Team',
      heroSubtitle: 'Streamline Service Planning, Access Modern Chords, and Collaborate Freely.',
      startBtn: 'Start for Free',
      watchDemo: 'Watch Demo',
      popularSongs: 'Popular Songs',
      communityPicks: 'Community Picks',
      browse: 'Browse',
      browseSongs: 'Songs',
      browseArtists: 'Artists',
      browseCollections: 'Collections',
      browseByKey: 'By Key',
      browseByBPM: 'By BPM',
      heroSubtitle1: 'Smarter',
      latestNews: 'Latest News',
      footerRights: '© 2026 Worship Platform. All rights reserved.',
      unknownArtist: 'Unknown Artist',
      picks: [
        { title: 'Gratitude', artist: 'Brandon Lake', meta: 'Sets 14 · Rev 1 · 9380 plays' },
        { title: 'Graves Into Gardens', artist: 'Bethel Worship', meta: 'Sets 17 · Rev 5 · 320 plays' },
        { title: 'Way Maker', artist: 'Sinach', meta: 'Sets 22 · Rev 2 · 15k plays' }
      ],
      newsItems: [
        { date: 'Apr 12, 2024', title: 'New Feature: Dynamic Transposition!', desc: 'Worship teams can now instantly transpose songs to any key with a single click.' },
        { date: 'Apr 28, 2024', title: 'Mastering Your Setlist Planning', desc: 'Discover how our setlist builder helps worship leaders plan more effectively.' },
        { date: 'May 18, 2024', title: 'Collaborate with Your Whole Team', desc: 'Share chords, notes, and rehearsal plans with every member of your worship team.' }
      ],
      footer: {
        product: 'Product',
        company: 'Company',
        resources: 'Resources',
        legal: 'Legal',
        songs: 'Songs',
        teams: 'Teams',
        pricing: 'Pricing',
        setlists: 'Setlists',
        about: 'About',
        blog: 'Blog',
        careers: 'Careers',
        community: 'Community',
        documentation: 'Documentation',
        tutorials: 'Tutorials',
        support: 'Support',
        privacyPolicy: 'Privacy Policy',
        terms: 'Terms',
        cookies: 'Cookies'
      }
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
      unknownArtist: 'Unknown Artist',
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
    megaMenu: {
      features: 'Возможности',
      music: 'Музыка',
      management: 'Управление',
      latestArrival: 'Обновления',
      discoverSongs: 'Откройте для себя новые песни, аккорды и создавайте сет-листы.',
      readArticle: 'Читать далее »',
      communityDesc: 'Присоединяйтесь к нашему сообществу и делитесь опытом.',
      joinNow: 'Присоединиться »',
      materials: 'Материалы',
      info: 'Информация',
      contacts: 'Контакты'
    },
    landing: {
      heroTitle1: 'Снарядите',
      heroTitle2: 'Вашу Команду',
      heroSubtitle: 'Планирование служений, доступ к аккордам и командное сотрудничество — на одной платформе.',
      startBtn: 'Начать бесплатно',
      watchDemo: 'Смотреть Demo',
      popularSongs: 'Популярные Песни',
      communityPicks: 'Выбор сообщества',
      browse: 'Просмотр',
      browseSongs: 'Песни',
      browseArtists: 'Артисты',
      browseCollections: 'Коллекции',
      browseByKey: 'По тональности',
      browseByBPM: 'По темпу',
      heroSubtitle1: 'Умнее',
      latestNews: 'Последние Новости',
      footerRights: '© 2026 Worship Platform. Все права защищены.',
      unknownArtist: 'Неизвестный исполнитель',
      picks: [
        { title: 'Gratitude', artist: 'Brandon Lake', meta: 'Сет-листы 14 · 9380 просмптров' },
        { title: 'Graves Into Gardens', artist: 'Bethel Worship', meta: 'Сет-листы 17 · 320 просмотров' },
        { title: 'Way Maker', artist: 'Sinach', meta: 'Сет-листы 22 · 15k просмотров' }
      ],
      newsItems: [
        { date: 'Апр 12, 2024', title: 'Новая функция: Динамическая Тональность!', desc: 'Теперь команды могут транспонировать песни в один клик.' },
        { date: 'Апр 28, 2024', title: 'Мастер планирования', desc: 'Узнайте, как наш инструмент помогает планировать служение.' },
        { date: 'Май 18, 2024', title: 'Работайте вместе', desc: 'Делитесь аккордами и планами со всей командой.' }
      ],
      footer: {
        product: 'Продукт',
        company: 'Компания',
        resources: 'Ресурсы',
        legal: 'Правовая инф.',
        songs: 'Песни',
        teams: 'Команда',
        pricing: 'Цены',
        setlists: 'Сет-листы',
        about: 'О нас',
        blog: 'Блог',
        careers: 'Карьера',
        community: 'Сообщество',
        documentation: 'Документация',
        tutorials: 'Уроки',
        support: 'Поддержка',
        privacyPolicy: 'Политика конфиденциальности',
        terms: 'Условия',
        cookies: 'Файлы cookie'
      }
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
      unknownArtist: 'Неизвестный исполнитель',
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
        return typeof fallback === 'string' || typeof fallback === 'object' ? fallback : key;
      }
    }
    return typeof value === 'string' || typeof value === 'object' ? value : key;
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
