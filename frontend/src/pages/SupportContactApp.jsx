import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePageReady } from '../hooks/usePageReady';
import './SupportContactApp.css';

const CATEGORY_META = {
  songs: {
    title: {
      am: '🎵 Երգեր և Ակորդներ',
      ru: '🎵 Песни и аккорды',
      en: '🎵 Songs & Chords'
    },
    color: '#00F0FF'
  },
  setlists: {
    title: {
      am: '📋 Երգացանկեր և Live Mode',
      ru: '📋 Сет-листы и Live Mode',
      en: '📋 Setlists & Live Mode'
    },
    color: '#9D72FF'
  },
  offline: {
    title: {
      am: '📱 Օֆլայն Ռեժիմ և Ծրագիր',
      ru: '📱 Офлайн-режим и приложение',
      en: '📱 Offline Mode & App'
    },
    color: '#38EF7D'
  },
  account: {
    title: {
      am: '🔐 Անձնական Հաշիվ և Կարգավորումներ',
      ru: '🔐 Аккаунт и настройки',
      en: '🔐 Account & Settings'
    },
    color: '#F09819'
  },
  other: {
    title: {
      am: '💬 Այլ',
      ru: '💬 Другое',
      en: '💬 Other'
    },
    color: '#aaaaaa'
  },
};

const getCategoryTitle = (catId, lang) => {
  const meta = CATEGORY_META[catId];
  if (!meta) return catId;
  if (typeof meta.title === 'string') return meta.title;
  return meta.title[lang] || meta.title.am || meta.title.en || catId;
};

const DEFAULT_FAQS = [
  {
    id: 's1',
    category: 'songs',
    question_am: 'Ինչպե՞ս փոխել երգի տոնայնությունը (տրանսպոզիցիա անել):',
    answer_am: 'Երգի էջում սեղմեք Տոնայնության (Key) կոճակը կամ օգտագործեք + / - կոճակները: Ակորդներն ակնթարթորեն կփոխվեն Ձեր ընտրած տոնայնությանը:',
    question_ru: 'Как изменить тональность песни (сделать транспозицию)?',
    answer_ru: 'На странице песни нажмите кнопку тональности (Key) или используйте кнопки + / -. Аккорды мгновенно транспонируются в выбранную тональность.',
    question_en: "How do I change a song's key (transpose)?",
    answer_en: 'On the song page, click the Key button or use the + / - buttons. Chords will instantly transpose to your chosen key.',
    question: 'Ինչպե՞ս փոխել երգի տոնայնությունը (տրանսպոզիցիա անել):',
    answer: 'Երգի էջում սեղմեք Տոնայնության (Key) կոճակը կամ օգտագործեք + / - կոճակները: Ակորդներն ակնթարթորեն կփոխվեն Ձեր ընտրած տոնայնությանը:'
  },
  {
    id: 's2',
    category: 'songs',
    question_am: 'Ինչպե՞ս ավելացնել երգը «Նախընտրածներ» ցանկում:',
    answer_am: 'Երգի էջում սեղմեք սրտիկի (♥) կոճակը: Պահպանված երգերը հասանելի կլինեն Ձեր անձնական գրադարանում նաև օֆլայն ռեժիմում:',
    question_ru: 'Как добавить песню в «Избранное»?',
    answer_ru: 'На странице песни нажмите значок сердечка (♥). Сохранённые песни будут доступны в вашей библиотеке даже без интернета.',
    question_en: 'How do I add a song to Favorites?',
    answer_en: 'Click the heart (♥) button on any song page. Saved songs will be available in your library and accessible offline.',
    question: 'Ինչպե՞ս ավելացնել երգը «Նախընտրածներ» ցանկում:',
    answer: 'Երգի էջում սեղմեք սրտիկի (♥) կոճակը: Պահպանված երգերը հասանելի կլինեն Ձեր անձնական գրադարանում նաև օֆլայն ռեժիմում:'
  },
  {
    id: 's3',
    category: 'songs',
    question_am: 'Ինչպե՞ս արտահանել կամ տպել երգի ակորդները:',
    answer_am: 'Երգի էջի վերևի աջ անկյունում սեղմեք «Տպել» կամ «PDF / TXT» կոճակը` երաժիշտների համար թղթային տարբերակ ունենալու համար:',
    question_ru: 'Как экспортировать или распечатать аккорды песни?',
    answer_ru: 'В правом верхнем углу страницы песни нажмите «Печать» или «PDF / TXT», чтобы получить удобный вариант для печати музыкантам.',
    question_en: 'How do I export or print song chords?',
    answer_en: 'In the top-right corner of the song page, click "Print" or "PDF / TXT" to get a ready-to-print chart for musicians.',
    question: 'Ինչպե՞ս արտահանել կամ տպել երգի ակորդները:',
    answer: 'Երգի էջի վերևի աջ անկյունում սեղմեք «Տպել» կամ «PDF / TXT» կոճակը` երաժիշտների համար թղթային տարբերակ ունենալու համար:'
  },
  {
    id: 's4',
    category: 'songs',
    question_am: 'Ի՞նչ անել, եթե երգում նկատել եմ սխալ ակորդ կամ տեքստ:',
    answer_am: 'Սեղմեք երգի էջում գտնվող «Առաջարկել խմբագրում» կոճակը, լրացրեք ճշգրտումը և մեր ադմինները կվերանայեն այն:',
    question_ru: 'Что делать, если я заметил ошибку в аккорде или тексте?',
    answer_ru: 'Нажмите кнопку «Предложить исправление» на странице песни, укажите правку, и наши модераторы проверят её.',
    question_en: 'What if I find an error in lyrics or chords?',
    answer_en: 'Click "Suggest Edit" on the song page, submit your correction, and our admins will review it.',
    question: 'Ի՞նչ անել, եթե երգում նկատել եմ սխալ ակորդ կամ տեքստ:',
    answer: 'Սեղմեք երգի էջում գտնվող «Առաջարկել խմբագրում» կոճակը, լրացրեք ճշգրտումը և մեր ադմինները կվերանայեն այն:'
  },
  {
    id: 'l1',
    category: 'setlists',
    question_am: 'Ինչպե՞ս ստեղծել նոր երգացանկ:',
    answer_am: '«Երգացանկեր» բաժնում սեղմեք «Ստեղծել Երգացանկ»: Ավելացրեք երգեր որոնման միջոցով, դասավորեք հերթականությունը և պահպանեք:',
    question_ru: 'Как создать новый сет-лист?',
    answer_ru: 'В разделе «Сет-листы» нажмите «Создать сет-лист». Добавьте песни через поиск, настройте порядок и сохраните.',
    question_en: 'How do I create a new setlist?',
    answer_en: 'In the "Setlists" section, click "Create Setlist". Add songs via search, arrange their order, and save.',
    question: 'Ինչպե՞ս ստեղծել նոր երգացանկ:',
    answer: '«Երգացանկեր» բաժնում սեղմեք «Ստեղծել Երգացանկ»: Ավելացրեք երգեր որոնման միջոցով, դասավորեք հերթականությունը և պահպանեք:'
  },
  {
    id: 'l2',
    category: 'setlists',
    question_am: 'Ի՞նչ է Live Mode-ը և ինչպես օգտվել դրանից:',
    answer_am: 'Live Mode-ը նախատեսված է կիրակնօրյա ծառայությունների և փորձերի համար: Այն ցույց է տալիս ակորդները մեծ տառաչափով և թույլ է տալիս արագ անցումներ կատարել երգից երգ:',
    question_ru: 'Что такое Live Mode и как им пользоваться?',
    answer_ru: 'Live Mode создан для богослужений и репетиций. Он отображает аккорды крупным шрифтом с удобным переключением между песнями.',
    question_en: 'What is Live Mode and how do I use it?',
    answer_en: 'Live Mode is tailored for rehearsals and worship services, offering large readable chords and fast navigation.',
    question: 'Ի՞նչ է Live Mode-ը և ինչպես օգտվել դրանից:',
    answer: 'Live Mode-ը նախատեսված է կիրակնօրյա ծառայությունների և փորձերի համար: Այն ցույց է տալիս ակորդները մեծ տառաչափով և թույլ է տալիս արագ անցումներ կատարել երգից երգ:'
  },
  {
    id: 'l3',
    category: 'setlists',
    question_am: 'Ինչպե՞ս կիսվել երգացանկով թիմի հետ:',
    answer_am: 'Երգացանկի էջում սեղմեք «Կիսվել» կոճակը: Դուք կարող եք ուղարկել հրավեր չաթով, ստանալ հանրային հղում կամ QR կոդ, որը կարող եք ուղարկել Ձեր երաժիշտներին:',
    question_ru: 'Как поделиться сет-листом с командой?',
    answer_ru: 'Нажмите «Поделиться» на странице сет-листа. Вы можете отправить приглашение в чат, скопировать ссылку или показать QR-код.',
    question_en: 'How do I share a setlist with my team?',
    answer_en: 'Click "Share" on the setlist page. You can send an invitation via chat, generate a public link, or use a QR code.',
    question: 'Ինչպե՞ս կիսվել երգացանկով թիմի հետ:',
    answer: 'Երգացանկի էջում սեղմեք «Կիսվել» կոճակը: Դուք կարող եք ուղարկել հրավեր չաթով, ստանալ հանրային հղում կամ QR կոդ, որը կարող եք ուղարկել Ձեր երաժիշտներին:'
  },
  {
    id: 'o1',
    category: 'offline',
    question_am: 'Ինչպե՞ս է աշխատում օֆլայն ռեժիմը առանց ինտերնետի:',
    answer_am: 'Worship Platform-ն ավտոմատ պահպանում է Ձեր դիտած երգերն ու երգացանկերը սարքում: Ինտերնետ կապն անջատվելիս ծրագիրը շարունակում է աշխատել անխափան:',
    question_ru: 'Как работает офлайн-режим без интернета?',
    answer_ru: 'Worship Platform автоматически сохраняет просмотренные песни и сет-листы на устройстве. При отсутствии сети приложение продолжает работать стабильно.',
    question_en: 'How does offline mode work without an internet connection?',
    answer_en: 'Worship Platform automatically caches viewed songs and setlists locally on your device. When offline, the app continues to operate seamlessly.',
    question: 'Ինչպե՞ս է աշխատում օֆլայն ռեժիմը առանց ինտերնետի:',
    answer: 'Worship Platform-ն ավտոմատ պահպանում է Ձեր դիտած երգերն ու երգացանկերը սարքում: Ինտերնետ կապն անջատվելիս ծրագիրը շարունակում է աշխատել անխափան:'
  },
  {
    id: 'o2',
    category: 'offline',
    question_am: 'Ինչպե՞ս տեղադրել ծրագիրը հեռախոսի կամ համակարգչի վրա:',
    answer_am: 'Բրաուզերի մենյուից ընտրեք «Ավելացնել գլխավոր էկրանին» (Add to Home Screen / Install App): Ծրագիրը կտեղադրվի որպես իսկական App:',
    question_ru: 'Как установить приложение на телефон или компьютер?',
    answer_ru: 'В меню браузера выберите «На экран „Домой“» (Add to Home Screen / Install App). Программа установится как автономное приложение.',
    question_en: 'How do I install the app on my phone or computer?',
    answer_en: 'In your browser menu, choose "Add to Home Screen" or "Install App". The app will be installed as a standalone application.',
    question: 'Ինչպե՞ս տեղադրել ծրագիրը հեռախոսի կամ համակարգչի վրա:',
    answer: 'Բրաուզերի մենյուից ընտրեք «Ավելացնել գլխավոր էկրանին» (Add to Home Screen / Install App): Ծրագիրը կտեղադրվի որպես իսկական App:'
  },
  {
    id: 'a1',
    category: 'account',
    question_am: 'Ինչպե՞ս փոխել գաղտնաբառը կամ անձնական տվյալները:',
    answer_am: 'Մտեք «Կարգավորումներ» բաժին: Այնտեղ կարող եք թարմացնել Ձեր անունը, էլ. հասցեն, փոխել գաղտնաբառը և կառավարել ակտիվ սեսիաները:',
    question_ru: 'Как изменить пароль или данные профиля?',
    answer_ru: 'Перейдите в раздел «Настройки». Там можно обновить имя, email, сменить пароль и управлять активными сессиями.',
    question_en: 'How do I change my password or profile details?',
    answer_en: 'Go to the "Settings" section. There you can update your name, email, change your password, and manage active sessions.',
    question: 'Ինչպե՞ս փոխել գաղտնաբառը կամ անձնական տվյալները:',
    answer: 'Մտեք «Կարգավորումներ» բաժին: Այնտեղ կարող եք թարմացնել Ձեր անունը, էլ. հասցեն, փոխել գաղտնաբառը և կառավարել ակտիվ սեսիաները:'
  },
  {
    id: 'a2',
    category: 'account',
    question_am: 'Ինչպե՞ս փոխել ակորդների գույնը կամ ոճը:',
    answer_am: '«Կարգավորումներ» -> «Ծրագրի կարգավորումներ» բաժնում կարող եք ընտրել ակորդների գույնը (Ոսկեգույն, Կապույտ, Կանաչ) և միացնել OLED Dark mode-ը:',
    question_ru: 'Как изменить цвет или стиль аккордов?',
    answer_ru: 'В разделе «Настройки» -> «Настройки приложения» вы можете выбрать цвет аккордов (Золотой, Голубой, Изумрудный) и включить OLED тёмную тему.',
    question_en: 'How do I change chord colors or theme style?',
    answer_en: 'Under "Settings" -> "App Preferences", you can customize chord colors (Gold, Electric Cyan, Emerald) and enable OLED dark mode.',
    question: 'Ինչպե՞ս փոխել ակորդների գույնը կամ ոճը:',
    answer: '«Կարգավորումներ» -> «Ծրագրի կարգավորումներ» բաժնում կարող եք ընտրել ակորդների գույնը (Ոսկեգույն, Կապույտ, Կանաչ) և միացնել OLED Dark mode-ը:'
  }
];

const getFaqQuestion = (faq, lang) => {
  if (lang === 'ru') return faq.question_ru || faq.question;
  if (lang === 'en') return faq.question_en || faq.question;
  return faq.question_am || faq.question;
};

const getFaqAnswer = (faq, lang) => {
  if (lang === 'ru') return faq.answer_ru || faq.answer;
  if (lang === 'en') return faq.answer_en || faq.answer;
  return faq.answer_am || faq.answer;
};

const UI_TEXT = {
  am: {
    back: 'Հետ',
    supportTitle: 'Աջակցություն և կապ',
    subtitle: 'Ինչպե՞ս կարող ենք օգնել Ձեզ',
    telegramBadge: '24/7 Բոտ',
    telegramTitle: 'Telegram Բոտ',
    emailBadge: 'Email',
    emailTitle: 'Էլ. փոստ',
    docsBadge: 'Ուղեցույց',
    docsTitle: 'Ուղեցույցներ',
    docsSub: 'Փաստաթղթեր',
    tabFaqFull: 'Հարց ու պատասխան (FAQ)',
    tabFaqShort: 'Հարցեր (FAQ)',
    tabContactFull: 'Ուղարկել նամակ',
    tabContactShort: 'Գրել նամակ',
    searchPlaceholder: 'Որոնել հարցեր, թեմաներ...',
    clearSearch: 'Մաքրել',
    allCategory: '✨ Բոլորը',
    loading: 'Բեռնվում է...',
    noResults: (q) => `Հարց չի գտնվել «${q}» որոնման համար`,
    clearSearchBtn: 'Մաքրել որոնումը',
    helpBannerTitle: 'Դեռ ունե՞ք հարցեր կամ աջակցության կարիք',
    helpBannerSub: 'Մեր թիմը սիրով կպատասխանի Ձեր բոլոր հարցերին:',
    helpBannerBtn: '✍️ Գրել հաղորդագրություն',
    formTitle: 'Ուղարկել Հաղորդագրություն',
    formDesc: 'Լրացրեք ձևանմուշը և մեր թիմը կպատասխանի հնարավորինս շուտ։',
    nameLabel: 'Անուն Ազգանուն',
    namePlaceholder: 'Ձեր անունը',
    emailLabel: 'Էլ. հասցե (Email)',
    topicLabel: 'Թեմա',
    topicQuestion: '❓ Հարց կամ օգնություն',
    topicFeature: '💡 Առաջարկություն',
    topicBug: '🛠 Սխալի մասին հայտնում (Bug report)',
    topicOther: '💬 Այլ',
    contactLabel: 'Ձեր կոնտակտը (Telegram / Հեռախոս)',
    contactPlaceholder: '@username կամ հեռախոս...',
    messageLabel: 'Հաղորդագրություն',
    messagePlaceholder: 'Նկարագրեք Ձեր հարցը կամ առաջարկությունը...',
    submitting: 'Ուղարկվում է...',
    submitBtn: 'Ուղարկել Հաղորդագրությունը',
    successMsg: 'Ձեր հաղորդագրությունը հաջողությամբ ուղարկվեց։ Շնորհակալություն։',
    errorMsg: 'Սխալ է տեղի ունեցել։ Խնդրում ենք փորձել կրկին։',
    networkErrorMsg: 'Ցանցային սխալ։ Խնդրում ենք ստուգել կապը։'
  },
  ru: {
    back: 'Назад',
    supportTitle: 'Поддержка и связь',
    subtitle: 'Чем мы можем вам помочь?',
    telegramBadge: '24/7 Бот',
    telegramTitle: 'Telegram-бот',
    emailBadge: 'Email',
    emailTitle: 'Эл. почта',
    docsBadge: 'Гайды',
    docsTitle: 'Руководства',
    docsSub: 'Документация',
    tabFaqFull: 'Вопросы и ответы (FAQ)',
    tabFaqShort: 'Вопросы (FAQ)',
    tabContactFull: 'Написать нам',
    tabContactShort: 'Написать',
    searchPlaceholder: 'Поиск вопросов, тем...',
    clearSearch: 'Очистить',
    allCategory: '✨ Все',
    loading: 'Загрузка...',
    noResults: (q) => `По запросу «${q}» вопросов не найдено`,
    clearSearchBtn: 'Очистить поиск',
    helpBannerTitle: 'Остались вопросы или нужна помощь?',
    helpBannerSub: 'Наша команда с радостью ответит на все ваши вопросы.',
    helpBannerBtn: '✍️ Написать сообщение',
    formTitle: 'Отправить сообщение',
    formDesc: 'Заполните форму, и наша команда свяжется с вами как можно скорее.',
    nameLabel: 'Имя и фамилия',
    namePlaceholder: 'Ваше имя',
    emailLabel: 'Эл. почта (Email)',
    topicLabel: 'Тема',
    topicQuestion: '❓ Вопрос или помощь',
    topicFeature: '💡 Предложение или идея',
    topicBug: '🛠 Сообщение об ошибке (Bug report)',
    topicOther: '💬 Другое',
    contactLabel: 'Ваш контакт (Telegram / Телефон)',
    contactPlaceholder: '@username или телефон...',
    messageLabel: 'Сообщение',
    messagePlaceholder: 'Опишите ваш вопрос или предложение...',
    submitting: 'Отправка...',
    submitBtn: 'Отправить сообщение',
    successMsg: 'Ваше сообщение успешно отправлено. Спасибо!',
    errorMsg: 'Произошла ошибка. Пожалуйста, попробуйте снова.',
    networkErrorMsg: 'Ошибка сети. Пожалуйста, проверьте подключение.'
  },
  en: {
    back: 'Back',
    supportTitle: 'Support & Contact',
    subtitle: 'How can we help you today?',
    telegramBadge: '24/7 Bot',
    telegramTitle: 'Telegram Bot',
    emailBadge: 'Email',
    emailTitle: 'Email',
    docsBadge: 'Guides',
    docsTitle: 'User Guides',
    docsSub: 'Documentation',
    tabFaqFull: 'Questions & Answers (FAQ)',
    tabFaqShort: 'FAQ',
    tabContactFull: 'Send a Message',
    tabContactShort: 'Contact',
    searchPlaceholder: 'Search questions, topics...',
    clearSearch: 'Clear',
    allCategory: '✨ All',
    loading: 'Loading...',
    noResults: (q) => `No questions found for "${q}"`,
    clearSearchBtn: 'Clear search',
    helpBannerTitle: 'Still have questions or need support?',
    helpBannerSub: 'Our team is always happy to assist you.',
    helpBannerBtn: '✍️ Send message',
    formTitle: 'Send Us a Message',
    formDesc: 'Fill out the form below and our team will get back to you promptly.',
    nameLabel: 'Full Name',
    namePlaceholder: 'Your name',
    emailLabel: 'Email Address',
    topicLabel: 'Topic',
    topicQuestion: '❓ Question or Support',
    topicFeature: '💡 Feature Suggestion',
    topicBug: '🛠 Bug Report',
    topicOther: '💬 Other',
    contactLabel: 'Your Contact (Telegram / Phone)',
    contactPlaceholder: '@username or phone number...',
    messageLabel: 'Message',
    messagePlaceholder: 'Describe your question or suggestion in detail...',
    submitting: 'Sending...',
    submitBtn: 'Send Message',
    successMsg: 'Your message has been sent successfully. Thank you!',
    errorMsg: 'An error occurred. Please try again.',
    networkErrorMsg: 'Network error. Please check your connection.'
  }
};

export default function SupportContactApp({ initialTab }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  usePageReady(false);

  const txt = UI_TEXT[language] || UI_TEXT.am;

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
    return byCategory.filter(item => {
      const qCur = (getFaqQuestion(item, language) || '').toLowerCase();
      const aCur = (getFaqAnswer(item, language) || '').toLowerCase();
      const qAm = (item.question_am || item.question || '').toLowerCase();
      const aAm = (item.answer_am || item.answer || '').toLowerCase();
      const qRu = (item.question_ru || '').toLowerCase();
      const aRu = (item.answer_ru || '').toLowerCase();
      const qEn = (item.question_en || '').toLowerCase();
      const aEn = (item.answer_en || '').toLowerCase();
      return (
        qCur.includes(q) || aCur.includes(q) ||
        qAm.includes(q) || aAm.includes(q) ||
        qRu.includes(q) || aRu.includes(q) ||
        qEn.includes(q) || aEn.includes(q)
      );
    });
  }, [allFaqs, activeFaqCategory, faqSearch, language]);

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
      question: txt.topicQuestion,
      feature: txt.topicFeature,
      bug: txt.topicBug,
      other: txt.topicOther
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
          msg: data.message || txt.successMsg
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
            msg: txt.successMsg
          });
          setFormData(prev => ({ ...prev, message: '' }));
        } else {
          setFormStatus({
            type: 'error',
            msg: data.error || fallbackData.error || txt.errorMsg
          });
        }
      }
    } catch (err) {
      setFormStatus({
        type: 'error',
        msg: txt.networkErrorMsg
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
          aria-label={txt.back}
          title={txt.back}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="sca-title-box">
          <h1 className="sca-title">{txt.supportTitle}</h1>
          <p className="sca-subtitle">{txt.subtitle}</p>
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
            <div className="sca-channel-badge">{txt.telegramBadge}</div>
            <span className="sca-channel-title">{txt.telegramTitle}</span>
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
            <div className="sca-channel-badge email-badge">{txt.emailBadge}</div>
            <span className="sca-channel-title">{txt.emailTitle}</span>
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
            <div className="sca-channel-badge docs-badge">{txt.docsBadge}</div>
            <span className="sca-channel-title">{txt.docsTitle}</span>
            <span className="sca-channel-sub">{txt.docsSub}</span>
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
          <span className="sca-tab-text-full">{txt.tabFaqFull}</span>
          <span className="sca-tab-text-short">{txt.tabFaqShort}</span>
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
          <span className="sca-tab-text-full">{txt.tabContactFull}</span>
          <span className="sca-tab-text-short">{txt.tabContactShort}</span>
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
              placeholder={txt.searchPlaceholder}
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
            />
            {faqSearch && (
              <button
                type="button"
                className="sca-search-clear"
                onClick={() => setFaqSearch('')}
                aria-label={txt.clearSearch}
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
                {catId === 'all' ? txt.allCategory : getCategoryTitle(catId, language)}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          {loadingFaqs ? (
            <div className="sca-loading">
              <div className="sca-spinner" />
              <p>{txt.loading}</p>
            </div>
          ) : Object.keys(groupedFaqs).length === 0 ? (
            <div className="sca-empty-box">
              <p>🔍 {txt.noResults(faqSearch)}</p>
              <button
                type="button"
                className="sca-btn-clear"
                onClick={() => {
                  setFaqSearch('');
                  setActiveFaqCategory('all');
                }}
              >
                {txt.clearSearchBtn}
              </button>
            </div>
          ) : (
            <div className="sca-accordion-list">
              {Object.entries(groupedFaqs).map(([catId, items]) => {
                const meta = CATEGORY_META[catId] || { color: '#aaa' };
                const catTitle = getCategoryTitle(catId, language);
                return (
                  <div key={catId} className="sca-cat-group">
                    <h3 className="sca-cat-header" style={{ color: meta.color }}>
                      {catTitle}
                    </h3>
                    <div className="sca-cards-stack">
                      {items.map(item => {
                        const isOpen = openFaqId === item.id;
                        const question = getFaqQuestion(item, language);
                        const answer = getFaqAnswer(item, language);
                        return (
                          <div key={item.id} className={`sca-faq-item ${isOpen ? 'open' : ''}`}>
                            <button
                              type="button"
                              className="sca-faq-q"
                              onClick={() => toggleFaq(item.id)}
                            >
                              <span className="sca-faq-q-text">{question}</span>
                              <span className="sca-faq-chevron">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </span>
                            </button>
                            {isOpen && (
                              <div className="sca-faq-a animate-fade-in">
                                <p>{answer}</p>
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
              <h4>💬 {txt.helpBannerTitle}</h4>
              <p>{txt.helpBannerSub}</p>
            </div>
            <button
              type="button"
              className="sca-help-btn"
              onClick={handleGoToContact}
            >
              {txt.helpBannerBtn}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: CONTACT MESSAGE FORM ── */}
      {activeTab === 'contact' && (
        <div className="sca-contact-tab animate-fade-in" ref={formRef}>
          <form className="sca-form-card" onSubmit={handleFormSubmit}>
            <div className="sca-form-header">
              <h3>{txt.formTitle}</h3>
              <p>{txt.formDesc}</p>
            </div>

            {formStatus.msg && (
              <div className={`sca-alert ${formStatus.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {formStatus.type === 'success' ? '✓ ' : '⚠ '}
                {formStatus.msg}
              </div>
            )}

            <div className="sca-form-row">
              <div className="sca-field">
                <label>{txt.nameLabel}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder={txt.namePlaceholder}
                  required
                  disabled={formSending}
                />
              </div>

              <div className="sca-field">
                <label>{txt.emailLabel}</label>
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
                <label>{txt.topicLabel}</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  disabled={formSending}
                >
                  <option value="question">{txt.topicQuestion}</option>
                  <option value="feature">{txt.topicFeature}</option>
                  <option value="bug">{txt.topicBug}</option>
                  <option value="other">{txt.topicOther}</option>
                </select>
              </div>

              <div className="sca-field">
                <label>{txt.contactLabel}</label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleFormChange}
                  placeholder={txt.contactPlaceholder}
                  disabled={formSending}
                />
              </div>
            </div>

            <div className="sca-field">
              <label>{txt.messageLabel}</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleFormChange}
                placeholder={txt.messagePlaceholder}
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
              <span>{formSending ? txt.submitting : txt.submitBtn}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
