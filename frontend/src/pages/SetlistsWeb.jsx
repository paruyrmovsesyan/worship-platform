import { useCallback, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import { getSongCoverStyle } from '../utils/songCover';
import './SetlistsWeb.css';

function getNextSundayDate() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const addDays = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + addDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function getRelativeDateLabel(dateStr, lang) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const dict = {
    am: {
      today: 'Այսօր',
      tomorrow: 'Վաղը',
      yesterday: 'Երեկ',
      inDays: (n) => `${n} օրից`,
      daysAgo: (n) => `${n} օր առաջ`,
    },
    en: {
      today: 'Today',
      tomorrow: 'Tomorrow',
      yesterday: 'Yesterday',
      inDays: (n) => `in ${n}d`,
      daysAgo: (n) => `${n}d ago`,
    },
    ru: {
      today: 'Сегодня',
      tomorrow: 'Завтра',
      yesterday: 'Вчера',
      inDays: (n) => `через ${n} дн.`,
      daysAgo: (n) => `${n} дн. назад`,
    },
  }[lang] || {
    today: 'Այսօր',
    tomorrow: 'Վաղը',
    yesterday: 'Երեկ',
    inDays: (n) => `${n} օրից`,
    daysAgo: (n) => `${n} օր առաջ`,
  };

  if (diffDays === 0) return { text: dict.today, tone: 'highlight' };
  if (diffDays === 1) return { text: dict.tomorrow, tone: 'soon' };
  if (diffDays === -1) return { text: dict.yesterday, tone: 'past' };
  if (diffDays > 1 && diffDays <= 7) return { text: dict.inDays(diffDays), tone: 'soon' };
  if (diffDays < -1 && diffDays >= -7) return { text: dict.daysAgo(Math.abs(diffDays)), tone: 'past' };
  return null;
}

export default function SetlistsWeb() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [setlists, setSetlists] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // all, personal, team, shared
  const [timeframeFilter, setTimeframeFilter] = useState('all'); // all, upcoming, past
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name, items

  // Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetTeamId, setNewSetTeamId] = useState('');
  const [newSetDate, setNewSetDate] = useState('');
  const [newSetDesc, setNewSetDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Action Menu & Feedback State
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Invite via Chat State
  const [inviteSetlist, setInviteSetlist] = useState(null);
  const [inviteChats, setInviteChats] = useState([]);
  const [inviteChatsLoading, setInviteChatsLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteCanEdit, setInviteCanEdit] = useState(false);
  const [sendingInviteChatId, setSendingInviteChatId] = useState(null);

  usePageReady(isLoading || authLoading);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    window.clearTimeout(window.__slWebToastTimer);
    window.__slWebToastTimer = window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const fetchSetlists = useCallback(async () => {
    try {
      const res = await fetch('/setlists_api.php?action=get_setlists');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSetlists(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.warn('Setlists load error:', err);
      setError(t('setlists.errorLoad', 'Չհաջողվեց բեռնել երգացանկերը։'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/teams_api.php?action=get_teams');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.ok) {
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.warn('Teams load error:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      const timer = window.setTimeout(() => setIsLoading(false), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      fetchSetlists();
      fetchTeams();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchSetlists, fetchTeams, user]);

  useEffect(() => {
    if (!user) return undefined;
    const handleSync = () => {
      fetchSetlists();
      fetchTeams();
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('worship:setlists-changed', handleSync);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleSync();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('worship:setlists-changed', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, fetchSetlists, fetchTeams]);

  useEffect(() => {
    if (!user) return undefined;
    const openCreateModal = () => setShowCreateModal(true);
    window.addEventListener('worship:create-setlist', openCreateModal);
    return () => window.removeEventListener('worship:create-setlist', openCreateModal);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    if (params.get('create') === '1') {
      const timer = window.setTimeout(() => setShowCreateModal(true), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [location.search, user]);

  // Handle Document Click for Action Menus
  useEffect(() => {
    const handleDocClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const namePresets = useMemo(() => {
    const presetsByLang = {
      am: ['Կիրակնօրյա ծառայություն', 'Երիտասարդական', 'Աղոթքի հանդիպում', 'Փորձ', 'Հատուկ միջոցառում'],
      ru: ['Воскресное служение', 'Молодежное', 'Молитвенное', 'Репетиция', 'Специальное'],
      en: ['Sunday Service', 'Youth Gathering', 'Prayer Night', 'Rehearsal', 'Special Event']
    };
    return presetsByLang[language] || presetsByLang.am;
  }, [language]);

  const handleCreateSetlist = async (e) => {
    if (e) e.preventDefault();
    if (!newSetName.trim() || isCreating) return;
    setIsCreating(true);

    try {
      const body = { name: newSetName.trim() };
      if (newSetTeamId) body.team_id = newSetTeamId;
      if (newSetDate) body.service_date = newSetDate;
      if (newSetDesc.trim()) body.description = newSetDesc.trim();

      const res = await fetch('/setlists_api.php?action=create_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.ok) {
        setShowCreateModal(false);
        setNewSetName('');
        setNewSetTeamId('');
        setNewSetDate('');
        setNewSetDesc('');
        fetchSetlists();
        navigate(`/setlists/${data.id}`);
      } else if (data.error === 'limit_reached') {
        alert(data.message || t('setlists.limitReached', 'Սահմանափակումը լրացել է։'));
      } else {
        alert(data.error || t('setlists.createFailed', 'Չհաջողվեց ստեղծել երգացանկը'));
      }
    } catch {
      alert(t('setlists.networkError', 'Ցանցային սխալ'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (e, listId) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setActionLoadingId(listId);
    try {
      const res = await fetch('/setlists_api.php?action=duplicate_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: listId })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(
          language === 'am'
            ? 'Երգացանկը կրկնօրինակվեց'
            : language === 'ru'
            ? 'Сет-лист продублирован'
            : 'Setlist duplicated'
        );
        fetchSetlists();
      } else {
        alert(data.error || 'Duplicate failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (e, listOrId) => {
    e.stopPropagation();
    setActiveMenuId(null);
    const listId = typeof listOrId === 'object' ? listOrId.id : listOrId;
    const isOwner = typeof listOrId === 'object' 
      ? (Boolean(listOrId.is_owner) || Number(listOrId.user_id) === Number(user?.id) || listOrId.access_role === 'owner') 
      : true;

    const confirmMsg = isOwner
      ? t('setlists.confirmDelete', 'Վստա՞հ եք, որ ցանկանում եք ջնջել այս երգացանկը:')
      : t('setlists.confirmRemoveFromMyList', 'Հեռացնե՞լ այս երգացանկը Ձեր հաշվից (համատեղ երգացանկը կմնա հեղինակի մոտ)։');

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(listId);
    try {
      const res = await fetch('/setlists_api.php?action=delete_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: listId })
      });
      const data = await res.json();
      if (data.ok) {
        setSetlists(prev => prev.filter(s => String(s.id) !== String(listId)));
        showToast(
          isOwner
            ? (language === 'am' ? 'Երգացանկը ջնջվեց' : language === 'ru' ? 'Сет-лист удален' : 'Setlist deleted')
            : (language === 'am' ? 'Երգացանկը հեռացվեց Ձեր հաշվից' : language === 'ru' ? 'Удалено из вашего аккаунта' : 'Removed from your account')
        );
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleShare = async (e, list) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setActionLoadingId(list.id);
    try {
      const res = await fetch('/setlists_api.php?action=generate_share_link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: list.id, is_editable: false }),
      });
      const data = await res.json();
      const token = data?.token || data?.share_token;
      let shareUrl = `${window.location.origin}/setlists/${list.id}`;
      if (data?.ok && token) {
        shareUrl = `${window.location.origin}/setlists/public?token=${token}`;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast(
          language === 'am'
            ? 'Հղումը պատճենվեց'
            : language === 'ru'
            ? 'Ссылка скопирована'
            : 'Link copied'
        );
      } else {
        window.prompt(
          language === 'am' ? 'Պատճենեք հղումը:' : 'Copy link:',
          shareUrl
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenInviteModal = (e, list) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setInviteSetlist(list);
    setInviteMessage('');
    setInviteCanEdit(false);
    setInviteChatsLoading(true);
    fetch('/chat_api.php?action=list_chats')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setInviteChats(data.chats || []);
        setInviteChatsLoading(false);
      })
      .catch(() => setInviteChatsLoading(false));
  };

  const handleSendChatInvite = async (chatId) => {
    if (!inviteSetlist) return;
    setSendingInviteChatId(chatId);
    try {
      const res = await fetch('/chat_api.php?action=send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message: inviteMessage.trim(),
          setlist_id: inviteSetlist.id,
          can_edit: inviteCanEdit,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setInviteSetlist(null);
        showToast(
          language === 'am'
            ? 'Հրավերն ուղարկվեց չաթում'
            : language === 'ru'
            ? 'Приглашение отправлено в чат'
            : 'Invite sent in chat'
        );
      } else {
        alert(data.error || 'Failed to send invite');
      }
    } catch {
      alert('Network error');
    } finally {
      setSendingInviteChatId(null);
    }
  };

  // Filtered & Sorted Setlists
  const filteredSetlists = useMemo(() => {
    return setlists
      .filter(s => {
        // Timeframe Filter (Upcoming vs Past)
        if (timeframeFilter === 'upcoming') {
          const isUpcoming = s.service_date ? s.service_date >= todayStr : true;
          if (!isUpcoming) return false;
        } else if (timeframeFilter === 'past') {
          const isPast = s.service_date ? s.service_date < todayStr : false;
          if (!isPast) return false;
        }

        // Category Filter
        if (activeCategory === 'personal' && (s.access_role === 'team' || s.access_role === 'shared')) return false;
        if (activeCategory === 'team' && s.access_role !== 'team') return false;
        if (activeCategory === 'shared' && s.access_role !== 'shared') return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = s.name?.toLowerCase().includes(q);
          const teamMatch = s.team_name?.toLowerCase().includes(q);
          const dateMatch = s.service_date?.toLowerCase().includes(q);
          return nameMatch || teamMatch || dateMatch;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
        if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'items') return (b.items_count || 0) - (a.items_count || 0);
        return 0;
      });
  }, [setlists, timeframeFilter, activeCategory, searchQuery, sortBy, todayStr]);

  // Statistics
  const stats = useMemo(() => {
    const totalSets = setlists.length;
    const totalSongs = setlists.reduce((acc, s) => acc + Number(s.items_count || 0), 0);
    const teamCount = setlists.filter(s => s.access_role === 'team').length;
    const sharedCount = setlists.filter(s => s.access_role === 'shared').length;
    const personalCount = setlists.filter(s => s.access_role !== 'team' && s.access_role !== 'shared').length;

    const sortedUpcoming = setlists
      .filter((s) => s.service_date && s.service_date >= todayStr)
      .sort((a, b) => (a.service_date || '').localeCompare(b.service_date || ''));
    const upcoming = sortedUpcoming[0] || null;

    let upcomingCount = 0;
    let pastCount = 0;
    for (const s of setlists) {
      if (s.service_date) {
        if (s.service_date >= todayStr) upcomingCount++;
        else pastCount++;
      } else {
        upcomingCount++;
      }
    }

    return {
      totalSets,
      totalSongs,
      teamCount,
      sharedCount,
      personalCount,
      upcoming,
      timeframeCounts: {
        all: totalSets,
        upcoming: upcomingCount,
        past: pastCount,
      }
    };
  }, [setlists, todayStr]);

  const timeframeLabels = useMemo(() => {
    if (language === 'am') return { all: 'Բոլորը', upcoming: 'Առաջիկա', past: 'Անցած / Պատմություն' };
    if (language === 'ru') return { all: 'Все', upcoming: 'Предстоящие', past: 'Прошедшие' };
    return { all: 'All', upcoming: 'Upcoming', past: 'Past' };
  }, [language]);

  if (!user && !authLoading) {
    return (
      <div className="setlists-web-page animate-fade-in">
        <div className="setlists-web-container">
          <div className="setlists-guest-card">
            <div className="guest-icon-glow">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
              </svg>
            </div>
            <h2>{t('setlists.guestTitle', 'Երգացանկերի Կառավարում')}</h2>
            <p>{t('setlists.guestDesc', 'Ստեղծեք ձեր սեփական երգացանկերը, կազմակերպեք պաշտամունքի ծառայությունները և կիսվեք ձեր թիմի հետ:')}</p>
            <div className="guest-actions">
              <Link to="/login?next=/setlists" className="web-btn primary">
                {t('nav.login', 'Մուտք')}
              </Link>
              <Link to="/register" className="web-btn secondary">
                {t('nav.register', 'Գրանցվել')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setlists-web-page animate-fade-in">
      <div className="setlists-web-container">
        
        {/* Hero Section */}
        <div className="setlists-hero">
          <div className="hero-content">
            <div className="hero-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
              </svg>
              <span>{t('nav.setlists', 'Երգացանկեր')}</span>
            </div>
            <h1 className="hero-title">{t('setlists.heroTitle', 'Պաշտամունքի Ծրագրեր')}</h1>
            <p className="hero-lead">{t('setlists.heroSubtitle', 'Կառավարեք ձեր երգացանկերը, պլանավորեք ծառայությունները և կիսվեք թիմի հետ:')}</p>
          </div>

          <div className="hero-actions">
            <button className="web-btn primary glow" onClick={() => setShowCreateModal(true)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>{t('setlists.newSetlist', 'Նոր երգացանկ')}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-value">{stats.totalSets}</span>
              <span className="stat-label">{t('setlists.statTotalSets', 'Երգացանկեր')}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <span className="stat-value">{stats.totalSongs}</span>
              <span className="stat-label">{t('setlists.statTotalSongs', 'Ընդհանուր երգեր')}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <span className="stat-value">{stats.teamCount}</span>
              <span className="stat-label">{t('setlists.statTeamSets', 'Թիմային')}</span>
            </div>

            {stats.upcoming && (
              <>
                <div className="stat-divider"></div>
                <div
                  className="stat-card stat-card-upcoming"
                  onClick={() => navigate(`/setlists/${stats.upcoming.id}`)}
                  title={language === 'am' ? 'Բացել առաջիկա ծառայությունը' : 'Open upcoming service'}
                >
                  <div className="stat-upcoming-header">
                    <span className="stat-upcoming-badge">
                      {language === 'am' ? 'Առաջիկա ծառայություն' : language === 'ru' ? 'Ближайшее служение' : 'Upcoming service'}
                    </span>
                    <span className="stat-upcoming-date">{stats.upcoming.service_date}</span>
                  </div>
                  <span className="stat-upcoming-title">{stats.upcoming.name}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timeframe Bar */}
        <div className="setlists-timeframe-bar">
          <div className="timeframe-tabs">
            <button
              type="button"
              className={`tf-tab-btn ${timeframeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTimeframeFilter('all')}
            >
              <span>{timeframeLabels.all}</span>
              <span className="tf-tab-badge">{stats.timeframeCounts.all}</span>
            </button>
            <button
              type="button"
              className={`tf-tab-btn ${timeframeFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setTimeframeFilter('upcoming')}
            >
              <span>{timeframeLabels.upcoming}</span>
              <span className="tf-tab-badge">{stats.timeframeCounts.upcoming}</span>
            </button>
            <button
              type="button"
              className={`tf-tab-btn ${timeframeFilter === 'past' ? 'active' : ''}`}
              onClick={() => setTimeframeFilter('past')}
            >
              <span>{timeframeLabels.past}</span>
              <span className="tf-tab-badge">{stats.timeframeCounts.past}</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="setlists-toolbar">
          {/* Category Tabs */}
          <div className="category-tabs">
            {[
              { id: 'all', label: t('setlists.tabAll', 'Բոլորը'), count: stats.totalSets },
              { id: 'personal', label: t('setlists.tabPersonal', 'Անձնական'), count: stats.personalCount },
              { id: 'team', label: t('setlists.tabTeam', 'Թիմային'), count: stats.teamCount },
              { id: 'shared', label: t('setlists.tabShared', 'Կիսված'), count: stats.sharedCount }
            ].map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeCategory === tab.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="tab-badge">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search & Layout Control */}
          <div className="toolbar-controls">
            <div className="search-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('setlists.searchPlaceholder', 'Որոնել երգացանկեր...')}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="sort-select-wrapper">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
                <option value="newest">{t('setlists.sortNewest', 'Նորերը սկզբում')}</option>
                <option value="oldest">{t('setlists.sortOldest', 'Հիները սկզբում')}</option>
                <option value="name">{t('setlists.sortName', 'Ըստ անվան')}</option>
                <option value="items">{t('setlists.sortItems', 'Ըստ երգերի քանակի')}</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                </svg>
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {error ? (
          <div className="web-error-card">
            <p>{error}</p>
          </div>
        ) : filteredSetlists.length === 0 ? (
          <div className="web-empty-state">
            <div className="empty-icon-glow">
              <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <h3>{searchQuery ? t('setlists.notFound', 'Երգացանկեր չեն գտնվել') : t('setlists.emptyTitle', 'Դեռ չկան երգացանկեր')}</h3>
            <p>{searchQuery ? t('setlists.notFoundDesc', 'Փորձեք այլ որոնման բառեր') : t('setlists.emptyDesc', 'Ստեղծեք ձեր առաջին երգացանկը՝ պաշտամունքի ծրագիրը կազմելու համար:')}</p>
            {!searchQuery && (
              <button className="web-btn primary glow mt-3" onClick={() => setShowCreateModal(true)}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>{t('setlists.newSetlist', 'Ստեղծել երգացանկ')}</span>
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="setlists-grid">
            {filteredSetlists.map((list, idx) => {
              const relDate = getRelativeDateLabel(list.service_date, language);
              return (
                <div
                  key={list.id}
                  className="web-sl-card animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}
                  onClick={() => navigate(`/setlists/${list.id}`)}
                >
                  {/* Cover Banner */}
                  <div
                    className="web-sl-cover"
                    style={getSongCoverStyle(list.id || idx, list.name || '')}
                  >
                    <div className="cover-icon-bg">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
                      </svg>
                    </div>

                    {/* Top Badge */}
                    <div className="cover-badge">
                      {list.access_role === 'team' ? (
                        <span className="role-tag team">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                          </svg>
                          {list.team_name || 'Team'}
                        </span>
                      ) : list.access_role === 'shared' ? (
                        <span className="role-tag shared">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                          </svg>
                          {t('setlists.typeShared', 'Կիսված')}
                        </span>
                      ) : (
                        <span className="role-tag personal">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          {t('setlists.typePersonal', 'Անձնական')}
                        </span>
                      )}
                    </div>

                    {/* Quick Live Mode & Actions Menu */}
                    <div className="cover-actions-group" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="quick-live-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/setlists/${list.id}/live`);
                        }}
                        title={language === 'am' ? 'Live ռեժիմ' : 'Live Mode'}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>Live</span>
                      </button>

                      <button
                        className="menu-trigger-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === list.id ? null : list.id);
                        }}
                        aria-label="Actions"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <circle cx="12" cy="5" r="2"></circle>
                          <circle cx="12" cy="12" r="2"></circle>
                          <circle cx="12" cy="19" r="2"></circle>
                        </svg>
                      </button>
                    </div>

                    {activeMenuId === list.id && (
                      <div className="card-dropdown-menu" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          navigate(`/setlists/${list.id}/live`);
                        }}>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                          <span>Live ռեժիմ</span>
                        </button>
                        <button onClick={(e) => handleDuplicate(e, list.id)}>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          <span>{t('setlists.duplicate', 'Կրկնօրինակել')}</span>
                        </button>
                        <button onClick={(e) => handleShare(e, list)}>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                          </svg>
                          <span>{language === 'am' ? 'Կիսվել հղումով' : 'Share link'}</span>
                        </button>
                        <button onClick={(e) => handleOpenInviteModal(e, list)}>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          <span>{language === 'am' ? 'Հրավիրել չաթով' : 'Invite via chat'}</span>
                        </button>
                        <button className="danger" onClick={(e) => handleDelete(e, list)}>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          <span>{list.access_role === 'owner' ? t('setlists.delete', 'Ջնջել') : t('setlists.removeFromMyList', 'Հեռացնել')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="web-sl-body">
                    <h3 className="web-sl-title" title={list.name}>{list.name}</h3>
                    {list.description && (
                      <p className="web-sl-desc">{list.description}</p>
                    )}
                    <div className="web-sl-info-row">
                      <div className="sl-date-group">
                        <span className="sl-date-chip">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          {list.service_date || t('setlists.noDate', 'Առանց ամսաթվի')}
                        </span>
                        {relDate && (
                          <span className={`sl-rel-badge tone-${relDate.tone}`}>
                            {relDate.text}
                          </span>
                        )}
                      </div>
                      <span className="sl-songs-chip">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18V5l12-2v13"></path>
                          <circle cx="6" cy="18" r="3"></circle>
                          <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                        {list.items_count || 0} {t('setlists.songsCount', 'երգ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE / LIST VIEW */
          <div className="setlists-list-view">
            <div className="list-header-row">
              <div className="lh-col name">{t('setlists.colName', 'Անվանում')}</div>
              <div className="lh-col date">{t('setlists.colDate', 'Ամսաթիվ')}</div>
              <div className="lh-col songs">{t('setlists.colSongs', 'Երգեր')}</div>
              <div className="lh-col team">{t('setlists.colTeam', 'Մուտք / Թիմ')}</div>
              <div className="lh-col actions"></div>
            </div>

            {filteredSetlists.map((list, idx) => {
              const relDate = getRelativeDateLabel(list.service_date, language);
              return (
                <div
                  key={list.id}
                  className="list-item-row animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}
                  onClick={() => navigate(`/setlists/${list.id}`)}
                >
                  <div className="lh-col name">
                    <div className="row-icon-bullet" style={getSongCoverStyle(list.id || idx, list.name || '')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
                      </svg>
                    </div>
                    <div className="row-title-group">
                      <span className="row-title">{list.name}</span>
                      {list.description && <span className="row-subtitle">{list.description}</span>}
                    </div>
                  </div>
                  <div className="lh-col date">
                    <div className="row-date-group">
                      <span className="text-secondary">{list.service_date || '—'}</span>
                      {relDate && (
                        <span className={`sl-rel-badge tone-${relDate.tone} small`}>
                          {relDate.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="lh-col songs">
                    <span className="badge-chip">{list.items_count || 0} {t('setlists.songsCount', 'երգ')}</span>
                  </div>
                  <div className="lh-col team">
                    {list.access_role === 'team' ? (
                      <span className="role-tag team small">{list.team_name || 'Team'}</span>
                    ) : list.access_role === 'shared' ? (
                      <span className="role-tag shared small">{t('setlists.typeShared', 'Կիսված')}</span>
                    ) : (
                      <span className="role-tag personal small">{t('setlists.typePersonal', 'Անձնական')}</span>
                    )}
                  </div>
                  <div className="lh-col actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="row-act-btn live"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/setlists/${list.id}/live`);
                      }}
                      title="Live ռեժիմ"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </button>
                    <button className="row-act-btn" onClick={(e) => handleDuplicate(e, list.id)} title={t('setlists.duplicate', 'Կրկնօրինակել')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    <button className="row-act-btn" onClick={(e) => handleShare(e, list)} title={language === 'am' ? 'Կիսվել հղումով' : 'Share'}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                    </button>
                    <button
                      className="row-act-btn danger"
                      onClick={(e) => handleDelete(e, list)}
                      title={list.access_role === 'owner' ? t('setlists.delete', 'Ջնջել') : t('setlists.removeFromMyList', 'Հեռացնել իմ ցանկից')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modern Creation Modal */}
      {showCreateModal && (
        <div className="web-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="web-modal-card animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <h3>{t('setlists.newSetlist', 'Ստեղծել Նոր Երգացանկ')}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateSetlist} className="modal-body">
              {/* Setlist Name & Presets */}
              <div className="web-form-group">
                <label>{t('setlists.nameField', 'Երգացանկի անվանումը')}</label>
                <input
                  type="text"
                  className="web-inp"
                  value={newSetName}
                  onChange={e => setNewSetName(e.target.value)}
                  placeholder={t('setlists.namePlaceholder', 'օր. Կիրակնօրյա Պաշտամունք')}
                  autoFocus
                  required
                />
                <div className="name-presets-chips">
                  {namePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`preset-chip ${newSetName === preset ? 'active' : ''}`}
                      onClick={() => setNewSetName(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Date & Quick Sunday Button */}
              <div className="web-form-group">
                <div className="label-with-action">
                  <label>{t('setlists.dateField', 'Ծառայության ամսաթիվ')}</label>
                  <button
                    type="button"
                    className="quick-date-btn"
                    onClick={() => setNewSetDate(getNextSundayDate())}
                  >
                    📅 {language === 'am' ? 'Հաջորդ կիրակին' : language === 'ru' ? 'След. воскресенье' : 'Next Sunday'}
                  </button>
                </div>
                <input
                  type="date"
                  className="web-inp"
                  value={newSetDate}
                  onChange={e => setNewSetDate(e.target.value)}
                />
              </div>

              {/* Team Selector */}
              {teams.length > 0 && (
                <div className="web-form-group">
                  <label>{t('setlists.assignTeam', 'Պատկանելություն')}</label>
                  <select
                    className="web-inp select"
                    value={newSetTeamId}
                    onChange={e => setNewSetTeamId(e.target.value)}
                  >
                    <option value="">{t('setlists.personalTeam', '🔒 Անձնական (միայն ինձ)')}</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>👥 {t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description / Notes */}
              <div className="web-form-group">
                <label>{t('setlists.descField', 'Նշումներ / Նկարագրություն')}</label>
                <textarea
                  className="web-inp textarea"
                  rows={2}
                  value={newSetDesc}
                  onChange={e => setNewSetDesc(e.target.value)}
                  placeholder={
                    language === 'am'
                      ? 'Օր.՝ Ծառայության թեմա, հատուկ հայտարարություններ...'
                      : 'Notes, themes or instructions...'
                  }
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="web-btn secondary" onClick={() => setShowCreateModal(false)}>
                  {t('setlists.cancelBtn', 'Չեղարկել')}
                </button>
                <button type="submit" className="web-btn primary glow" disabled={!newSetName.trim() || isCreating}>
                  {isCreating ? t('setlists.creatingBtn', 'Ստեղծվում է...') : t('setlists.createBtn', 'Ստեղծել')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite via Chat Modal */}
      {inviteSetlist && createPortal(
        <div className="web-modal-backdrop" onClick={() => setInviteSetlist(null)}>
          <div className="web-modal-card animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <div>
                  <h3>{language === 'am' ? 'Հրավիրել չաթով' : language === 'ru' ? 'Пригласить в чат' : 'Invite via Chat'}</h3>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                    {inviteSetlist.name}
                  </div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setInviteSetlist(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="web-form-group">
                <label>
                  {language === 'am' ? 'Հաղորդագրություն (ըստ ցանկության)' : language === 'ru' ? 'Сообщение (необязательно)' : 'Message (optional)'}
                </label>
                <textarea
                  className="web-inp textarea"
                  rows={2}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={
                    language === 'am'
                      ? `Հրավիրում եմ միանալ «${inviteSetlist.name}» երգացանկին`
                      : language === 'ru'
                      ? `Приглашаю присоединиться к сет-листу «${inviteSetlist.name}»`
                      : `Inviting you to join "${inviteSetlist.name}" setlist`
                  }
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                    {language === 'am' ? 'Խմբագրման իրավունք' : language === 'ru' ? 'Право редактирования' : 'Edit permission'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                    {language === 'am' ? 'Մասնակիցները կարող են փոփոխել երգացանկը' : language === 'ru' ? 'Участники могут изменять сет-лист' : 'Participants can edit the setlist'}
                  </div>
                </div>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={inviteCanEdit}
                    onChange={(e) => setInviteCanEdit(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#00d4ff' }}
                  />
                </label>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                {language === 'am' ? 'Ընտրեք չաթը' : language === 'ru' ? 'Выберите чат' : 'Select a chat'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {inviteChatsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.5)' }}>
                    {language === 'am' ? 'Բեռնվում է...' : 'Loading...'}
                  </div>
                ) : inviteChats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.5)' }}>
                    {language === 'am' ? 'Չաթեր չկան' : 'No chats found'}
                  </div>
                ) : (
                  inviteChats.map((c) => {
                    const isSending = sendingInviteChatId === c.id;
                    const chatTitle = c.type === 'group' ? c.name : (c.participant_names || 'Chat');
                    return (
                      <div
                        key={c.id}
                        onClick={() => !sendingInviteChatId && handleSendChatInvite(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.06)',
                          cursor: sendingInviteChatId ? 'not-allowed' : 'pointer',
                          transition: 'background 0.2s',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1rem',
                            flexShrink: 0,
                          }}
                        >
                          {c.type === 'group' ? '👥' : (chatTitle ? chatTitle.charAt(0).toUpperCase() : '👤')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chatTitle}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                            {c.type === 'group' ? (language === 'am' ? 'Խումբ' : 'Group') : (language === 'am' ? 'Անձնական չաթ' : 'Direct')}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={sendingInviteChatId !== null}
                          style={{
                            background: isSending ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.2)',
                            color: '#00d4ff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: sendingInviteChatId ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSending ? '...' : (language === 'am' ? 'Ուղարկել ➔' : 'Send ➔')}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="modal-footer" style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="web-btn secondary"
                  style={{ width: '100%' }}
                  onClick={() => setInviteSetlist(null)}
                >
                  {language === 'am' ? 'Փակել' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="web-toast-pill animate-pop-in">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
