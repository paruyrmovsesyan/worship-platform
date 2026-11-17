import { createContext, useContext } from 'react';

export const MediaContext = createContext(null);

export function useMediaPlayer() {
  return useContext(MediaContext);
}

export const CHRISTIAN_RADIO_STATIONS = [
  {
    id: 'worship247',
    name: { am: 'Փառաբանություն 24/7', ru: 'Прославление 24/7', en: 'Worship 24/7' },
    genre: { am: 'Անընդմեջ փառաբանություն', ru: 'Непрерывная хвала', en: 'Non-stop Praise & Worship' },
    streamUrl: 'https://ice24.securenetsystems.net/WPOS',
    accent: '#f7b500',
  },
  {
    id: 'acoustic_prayer',
    name: { am: 'Աղոթքի և Խաղաղ Ալիք', ru: 'Молитва и Тишина', en: 'Soaking Prayer & Instrumental' },
    genre: { am: 'Խաղաղ և գործիքային երաժշտություն', ru: 'Инструментальная музыка для молитвы', en: 'Instrumental Prayer Ambient' },
    streamUrl: 'https://s2.radio.co/s9e5f1a8d2/listen',
    accent: '#38bdf8',
  },
  {
    id: 'word_radio',
    name: { am: 'Խոսք և Քարոզ', ru: 'Слово и Проповедь', en: 'Word & Teaching Radio' },
    genre: { am: 'Հոգևոր ուսուցումներ և աուդիո գրքեր', ru: 'Библейские чтения и разборы', en: 'Bible Teaching & Devotionals' },
    streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KLOVE.mp3',
    accent: '#34d399',
  },
];

export const CURATED_MEDIA_CHANNELS = [
  {
    id: 'm1',
    category: 'worship',
    title: { am: 'Երևան Պաշտամունք — Կենդանի հավաք', ru: 'Ереван Прославление — Живое собрание', en: 'Live Sunday Worship Gathering' },
    speaker: 'Worship Collective',
    duration: '42:15',
    youtubeId: '5qap5aO4i9A',
    gradient: 'linear-gradient(135deg, #2b1d07, #7c5206)',
  },
  {
    id: 'm2',
    category: 'sermon',
    title: { am: 'Սաղմոս 23 — Հովվի առաջնորդությունը', ru: 'Псалом 22 — Водительство Пастыря', en: 'Psalm 23 — Walking With The Shepherd' },
    speaker: { am: 'Քարոզ և Խոսքի Սերտողություն', ru: 'Разбор Писания', en: 'Scripture Teaching' },
    duration: '36:40',
    youtubeId: 'lTRiuFIWV54',
    gradient: 'linear-gradient(135deg, #0b1b30, #163e67)',
  },
  {
    id: 'm3',
    category: 'teaching',
    title: { am: 'Ինչպես առաջնորդել պաշտամունքային թիմ', ru: 'Как вести команду прославления', en: 'Building A Healthy Worship Team' },
    speaker: 'Worship Leadership Academy',
    duration: '24:10',
    youtubeId: 'DWcJFNfaw9c',
    gradient: 'linear-gradient(135deg, #1b1730, #422b7a)',
  },
  {
    id: 'm4',
    category: 'acoustic',
    title: { am: 'Գիշերային Աղոթքի Ակուստիկա', ru: 'Вечерняя акустическая молитва', en: 'Late Night Acoustic Devotional' },
    speaker: 'Acoustic Session',
    duration: '51:00',
    youtubeId: 'jfKfPfyJRdk',
    gradient: 'linear-gradient(135deg, #0a241f, #115345)',
  },
];
