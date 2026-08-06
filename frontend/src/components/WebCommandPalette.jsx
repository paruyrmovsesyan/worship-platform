import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { useLanguage } from '../context/LanguageContext';
import './WebCommandPalette.css';

const ACCENTS = [
  { id: 'cyan', label: 'Neon Cyan', color: '#2dd4ff' },
  { id: 'purple', label: 'Deep Purple', color: '#8b5cf6' },
  { id: 'amber', label: 'Amber Gold', color: '#f5b942' },
  { id: 'oled', label: 'OLED Pure Black', color: '#050505' },
];

const ICON_PATHS = {
  song: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  setlist: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  team: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  print: <><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18h1.4a1.6 1.6 0 0 0 0-3.2H12a1.8 1.8 0 0 1 0-3.6h1.7A7.3 7.3 0 0 0 21 6.9C21 4.8 17 3 12 3Z" /><circle cx="7.5" cy="9" r=".8" /><circle cx="10.5" cy="6.5" r=".8" /><circle cx="15" cy="7" r=".8" /></>,
  nav: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
};

function CommandIcon({ type }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ICON_PATHS[type] || ICON_PATHS.nav}
      </g>
    </svg>
  );
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

async function readJson(response) {
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

export default function WebCommandPalette() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const inputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [teams, setTeams] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accent, setAccent] = useState(() => localStorage.getItem('web_accent_theme') || 'cyan');
  const [ambient, setAmbient] = useState(() => Number(localStorage.getItem('web_ambient_strength') || 42));

  useEffect(() => {
    if (accent === 'cyan') {
      delete document.body.dataset.webAccent;
      delete document.documentElement.dataset.webAccent;
      localStorage.removeItem('web_accent_theme');
    } else {
      document.body.dataset.webAccent = accent;
      document.documentElement.dataset.webAccent = accent;
      localStorage.setItem('web_accent_theme', accent);
    }
    document.body.style.setProperty('--web-ambient-strength', String(ambient / 100));
    document.documentElement.style.setProperty('--web-ambient-strength', String(ambient / 100));
    localStorage.setItem('web_ambient_strength', String(ambient));
    window.dispatchEvent(new CustomEvent('worship:web-theme-change', {
      detail: { accent, ambient },
    }));
  }, [accent, ambient]);

  useEffect(() => {
    const openPalette = () => {
      if (!hasLoaded) setIsLoading(true);
      setIsOpen(true);
      setQuery('');
      setActiveIndex(0);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    };
    const handleGlobalKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        if (isOpen) {
          setIsOpen(false);
          setShowThemePanel(false);
        } else {
          openPalette();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    window.addEventListener('worship:open-command-palette', openPalette);
    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      window.removeEventListener('worship:open-command-palette', openPalette);
    };
  }, [hasLoaded, isOpen]);

  useEffect(() => {
    if (!isOpen || hasLoaded) return undefined;
    const controller = new AbortController();

    const requests = [
      fetch('/api.php', { signal: controller.signal }).then(readJson),
      user
        ? fetch('/setlists_api.php?action=get_setlists', { signal: controller.signal }).then(readJson)
        : Promise.resolve([]),
      user
        ? fetch('/teams_api.php?action=get_teams', { signal: controller.signal }).then(readJson)
        : Promise.resolve({ teams: [] }),
    ];

    Promise.all(requests)
      .then(([songData, setlistData, teamData]) => {
        setSongs(Array.isArray(songData) ? songData : []);
        setSetlists(Array.isArray(setlistData) ? setlistData : (setlistData?.setlists || []));
        setTeams(Array.isArray(teamData) ? teamData : (teamData?.teams || []));
        setHasLoaded(true);
      })
      .catch(error => {
        if (error.name !== 'AbortError') setHasLoaded(true);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [hasLoaded, isOpen, user]);

  const commands = useMemo(() => {
    const actions = [
      {
        id: 'new-setlist',
        group: 'Արագ գործողություններ',
        type: 'plus',
        title: 'Ստեղծել նոր երգացանկ',
        meta: 'Բացել նոր երգացանկի պատուհանը',
        shortcut: '⌘ N',
        run: () => {
          setIsOpen(false);
          if (user) {
            navigate('/setlists?create=1');
            window.dispatchEvent(new CustomEvent('worship:create-setlist'));
          } else {
            navigate('/login?next=/setlists?create=1');
          }
        },
      },
      {
        id: 'print-studio',
        group: 'Արագ գործողություններ',
        type: 'print',
        title: 'Բացել Print Studio',
        meta: 'Տպել կամ PDF արտահանել ընթացիկ նյութը',
        shortcut: '⌘ P',
        run: () => {
          window.dispatchEvent(new CustomEvent('worship:open-print-studio'));
          setIsOpen(false);
        },
      },
      {
        id: 'theme',
        group: 'Արագ գործողություններ',
        type: 'palette',
        title: 'Փոխել կայքի թեման',
        meta: 'Accent գույն և ambient լուսավորում',
        shortcut: '⌘ ,',
        run: () => setShowThemePanel(true),
      },
      { id: 'songs', group: 'Նավիգացիա', type: 'song', title: 'Երգարան', meta: 'Բոլոր երգերը', shortcut: '⌘ 1', run: () => { setIsOpen(false); navigate('/songs'); } },
      { id: 'setlists', group: 'Նավիգացիա', type: 'setlist', title: 'Երգացանկեր', meta: 'Ծրագրեր և ծառայություններ', shortcut: '⌘ 2', run: () => { setIsOpen(false); navigate('/setlists'); } },
      { id: 'community', group: 'Նավիգացիա', type: 'team', title: 'Համայնք', meta: 'Քննարկումներ և խորհուրդներ', shortcut: '⌘ 3', run: () => { setIsOpen(false); navigate('/community'); } },
      { id: 'profile', group: 'Նավիգացիա', type: 'profile', title: 'Անձնական էջ', meta: user ? 'Քո պրոֆիլը և կարգավորումները' : 'Մուտք գործել', shortcut: '⌘ 4', run: () => { setIsOpen(false); navigate(user ? '/profile' : '/login'); } },
    ];

    const dataResults = [
      ...songs.slice(0, 160).map(song => ({
        id: `song-${song.id}`,
        group: 'Արդյունքներ',
        type: 'song',
        title: getLocalizedTitle(song, language),
        meta: [song.artist, song.song_key ? `Key ${song.song_key}` : '', Number(song.bpm) > 0 ? `${song.bpm} BPM` : ''].filter(Boolean).join(' · '),
        run: () => {
          setIsOpen(false);
          navigate(`/song/${song.id}`);
        },
      })),
      ...setlists.map(setlist => ({
        id: `setlist-${setlist.id}`,
        group: 'Արդյունքներ',
        type: 'setlist',
        title: setlist.name,
        meta: [setlist.items_count != null ? `${setlist.items_count} երգ` : '', setlist.service_date || ''].filter(Boolean).join(' · '),
        run: () => {
          setIsOpen(false);
          navigate(`/setlists/${setlist.id}`);
        },
      })),
      ...teams.map(team => ({
        id: `team-${team.id}`,
        group: 'Արդյունքներ',
        type: 'team',
        title: team.name,
        meta: team.members_count != null ? `${team.members_count} անդամ` : 'Թիմ',
        run: () => {
          setIsOpen(false);
          navigate('/friends');
        },
      })),
    ];

    const normalizedQuery = normalizeText(deferredQuery);
    if (!normalizedQuery) return [...actions, ...dataResults.slice(0, 6)];

    return [...actions, ...dataResults]
      .filter(item => normalizeText(`${item.title} ${item.meta} ${item.group}`).includes(normalizedQuery))
      .slice(0, 16);
  }, [deferredQuery, language, navigate, setlists, songs, teams, user]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePaletteKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showThemePanel) setShowThemePanel(false);
        else setIsOpen(false);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex(index => Math.min(index + 1, Math.max(0, commands.length - 1)));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(index => Math.max(index - 1, 0));
      }
      if (event.key === 'Enter' && commands[activeIndex]) {
        event.preventDefault();
        commands[activeIndex].run();
      }
    };
    window.addEventListener('keydown', handlePaletteKey);
    return () => window.removeEventListener('keydown', handlePaletteKey);
  }, [activeIndex, commands, isOpen, showThemePanel]);

  if (!isOpen) return null;

  let previousGroup = '';

  return createPortal(
    <div className="web-command-overlay" role="presentation" onMouseDown={() => setIsOpen(false)}>
      <div className={`web-command-layout ${showThemePanel ? 'has-theme-panel' : ''}`} onMouseDown={event => event.stopPropagation()}>
        <section className="web-command-palette" role="dialog" aria-modal="true" aria-label="Quick Command Palette">
          <div className="web-command-search">
            <CommandIcon type="nav" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              placeholder="Որոնել երգ, երգացանկ, թիմ կամ գործողություն..."
              aria-label="Որոնել հրամաններ"
            />
            <kbd>{navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'} K</kbd>
          </div>

          <div className="web-command-results" role="listbox" aria-label="Հրամաններ և արդյունքներ">
            {isLoading ? <div className="web-command-empty">Բեռնվում է...</div> : null}
            {!isLoading && commands.length === 0 ? <div className="web-command-empty">Արդյունք չի գտնվել</div> : null}
            {commands.map((item, index) => {
              const showGroup = item.group !== previousGroup;
              previousGroup = item.group;
              return (
                <React.Fragment key={item.id}>
                  {showGroup ? <div className="web-command-group">{item.group}</div> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`web-command-row ${index === activeIndex ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={item.run}
                  >
                    <span className="web-command-icon"><CommandIcon type={item.type} /></span>
                    <span className="web-command-copy">
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                    </span>
                    {item.shortcut ? <kbd>{item.shortcut}</kbd> : <span className="web-command-enter">↵</span>}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <footer className="web-command-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> Շարժվել</span>
            <span><kbd>↵</kbd> Ընտրել</span>
            <span><kbd>Esc</kbd> Փակել</span>
          </footer>
        </section>

        {showThemePanel ? (
          <aside className="web-theme-panel" aria-label="Կայքի թեմա">
            <header>
              <div>
                <CommandIcon type="palette" />
                <strong>Փոխել թեման</strong>
              </div>
              <button type="button" onClick={() => setShowThemePanel(false)} aria-label="Փակել թեմայի կարգավորումները">×</button>
            </header>
            <p>Accent գույնը փոխում է միայն կառավարման տարրերը և ambient լուսավորությունը՝ պահպանելով ընթեռնելիությունը։</p>
            <div className="web-theme-options">
              {ACCENTS.map(option => (
                <button
                  type="button"
                  key={option.id}
                  className={accent === option.id ? 'active' : ''}
                  onClick={() => setAccent(option.id)}
                >
                  <span className="web-theme-dot" style={{ '--theme-color': option.color }} />
                  <span>{option.label}</span>
                  <span className="web-theme-check">{accent === option.id ? '✓' : ''}</span>
                </button>
              ))}
            </div>
            <label className="web-ambient-control">
              <span><strong>Ambient լուսավորում</strong><output>{ambient}%</output></span>
              <input type="range" min="0" max="100" value={ambient} onChange={event => setAmbient(Number(event.target.value))} />
            </label>
            <div className="web-theme-preview">
              <span />
              <strong>Կենդանի preview</strong>
              <button type="button">Գործողություն</button>
            </div>
            <button
              type="button"
              className="web-theme-reset-btn"
              onClick={() => {
                setAccent('cyan');
                setAmbient(42);
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              <span>{t('theme.resetDefault', 'Վերականգնել լռելայն')}</span>
            </button>
          </aside>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
