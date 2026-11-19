import { createContext, useContext } from 'react';

export const MediaContext = createContext(null);

export function useMediaPlayer() {
  return useContext(MediaContext);
}

export const CHRISTIAN_RADIO_STATIONS = [
  {
    id: 'worship247',
    name: { am: 'Փառաբանություն 24/7', ru: 'Прославление 24/7', en: 'Worship 24/7' },
    genre: { am: 'Անընդմեջ փառաբանություն և երկրպագություն', ru: 'Непрерывная хвала и поклонение', en: 'Non-stop Praise & Worship' },
    streamUrl: 'https://streams.cbnradio.com/praise-MP3-128',
    synthProfile: { rootFreq: 130.81, tempoMs: 4200, style: 'worship' },
    accent: '#f7b500',
  },
  {
    id: 'acoustic_prayer',
    name: { am: 'Աղոթքի և Խաղաղ Ալիք', ru: 'Молитва и Тишина', en: 'Soaking Prayer & Instrumental' },
    genre: { am: 'Խաղաղ և գործիքային երաժշտություն աղոթքի համար', ru: 'Инструментальная музыка для молитвы', en: 'Instrumental Prayer Ambient' },
    streamUrl: 'https://streams.cbnradio.com/selah-MP3-128',
    synthProfile: { rootFreq: 146.83, tempoMs: 5600, style: 'ambient' },
    accent: '#38bdf8',
  },
  {
    id: 'word_radio',
    name: { am: 'Խոսք և Հոգևոր Երգեր', ru: 'Слово и Духовные Песни', en: 'Scripture & Hymns Radio' },
    genre: { am: 'Ավանդական հոգևոր երգեր և Սուրբ Գրքի ընթերցում', ru: 'Христианские гимны и чтения', en: 'Classic Hymns & Devotionals' },
    streamUrl: 'https://ice24.securenetsystems.net/WPOS',
    synthProfile: { rootFreq: 164.81, tempoMs: 4800, style: 'hymns' },
    accent: '#34d399',
  },
];

export const CURATED_MEDIA_CHANNELS = [
  {
    id: 'm1',
    category: 'worship',
    title: { am: 'Կենդանի Պաշտամունք — Միասնական Երկրպագություն', ru: 'Живое Прославление — Собрание Хвалы', en: 'Live Sunday Worship Gathering' },
    speaker: 'Worship Collective',
    duration: '42:15',
    youtubeId: 'nQWFzMvCfLE',
    gradient: 'linear-gradient(135deg, #2b1d07, #7c5206)',
  },
  {
    id: 'm2',
    category: 'sermon',
    title: { am: 'Սաղմոս 23 — Տերն է իմ Հովիվը (Խոսքի սերտողություն)', ru: 'Псалом 22 — Господь Пастырь мой', en: 'Psalm 23 — Walking With The Shepherd' },
    speaker: { am: 'Քարոզ և Խոսքի Սերտողություն', ru: 'Разбор Писания', en: 'Scripture Teaching' },
    duration: '36:40',
    youtubeId: 'oZ3r1D7X3vQ',
    gradient: 'linear-gradient(135deg, #0b1b30, #163e67)',
  },
  {
    id: 'm3',
    category: 'teaching',
    title: { am: 'Ինչպես կառուցել և առաջնորդել փառաբանության թիմ', ru: 'Как вести команду прославления', en: 'Building A Healthy Worship Team' },
    speaker: 'Worship Leadership Academy',
    duration: '24:10',
    youtubeId: 'r6tH55syq0o',
    gradient: 'linear-gradient(135deg, #1b1730, #422b7a)',
  },
  {
    id: 'm4',
    category: 'acoustic',
    title: { am: 'Գիշերային Աղոթքի Ակուստիկ Երկրպագություն', ru: 'Вечерняя акустическая молитва', en: 'Late Night Acoustic Devotional' },
    speaker: 'Acoustic Worship Session',
    duration: '51:00',
    youtubeId: 'sIaT8Jl2zpI',
    gradient: 'linear-gradient(135deg, #0a241f, #115345)',
  },
];
