import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import { getSongCoverStyle } from '../utils/songCover';
import './Setlists.css';

const VIEW_MODE_KEY = 'pwa_setlists_view_mode_v1';

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

export default function SetlistsApp() {
  const [setlists, setSetlists] = useState([]);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  usePageReady(loading || authLoading);
  const { t, language } = useLanguage();

  const [teams, setTeams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetTeamId, setNewSetTeamId] = useState('');
  const [newSetDate, setNewSetDate] = useState('');
  const [newSetDesc, setNewSetDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, personal, team, shared
  const [timeframeFilter, setTimeframeFilter] = useState('all'); // all, upcoming, past
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name, items
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) || 'grid';
    } catch {
      return 'grid';
    }
  });

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    window.clearTimeout(window.__slToastTimer);
    window.__slToastTimer = window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const changeViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {}
  };

  const fetchSetlists = useCallback(() => {
    fetch('/setlists_api.php?action=get_setlists')
      .then((res) => res.json())
      .then((data) => {
        setSetlists(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(t('setlists.errorLoad', 'Չհաջողվեց բեռնել երգացանկերը'));
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchSetlists();
    fetch('/teams_api.php?action=get_teams')
      .then((res) => res.json())
      .then((data) => setTeams(data.ok ? data.teams : []))
      .catch(() => {});
  }, [user, fetchSetlists]);

  // Close menus on outside click
  useEffect(() => {
    const handleDocClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  // Lock body scroll and mark modal open so MobileNav is hidden
  useEffect(() => {
    if (!showCreateModal && !inviteSetlist) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sl-modal-open');
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('sl-modal-open');
    };
  }, [showCreateModal, inviteSetlist]);

  // Duplicate Setlist
  const handleDuplicate = async (e, listId) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!isOnline) {
      showToast(language === 'am' ? 'Գործողությունը հնարավոր չէ օֆլայն ռեժիմում' : 'Action not available offline');
      return;
    }
    setActionLoadingId(listId);
    try {
      const res = await fetch('/setlists_api.php?action=duplicate_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: listId }),
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

  // Delete Setlist
  const handleDelete = async (e, listId) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!isOnline) {
      showToast(language === 'am' ? 'Գործողությունը հնարավոր չէ օֆլայն ռեժիմում' : 'Action not available offline');
      return;
    }
    const confirmMsg =
      t('setlists.confirmDelete') ||
      (language === 'am'
        ? 'Վստա՞հ եք, որ ցանկանում եք ջնջել այս երգացանկը:'
        : 'Are you sure you want to delete this setlist?');
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(listId);
    try {
      const res = await fetch('/setlists_api.php?action=delete_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: listId }),
      });
      const data = await res.json();
      if (data.ok) {
        setSetlists((prev) => prev.filter((s) => String(s.id) !== String(listId)));
        showToast(
          language === 'am'
            ? 'Երգացանկը ջնջվեց'
            : language === 'ru'
            ? 'Сет-лист удален'
            : 'Setlist deleted'
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

  // Share Setlist
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
      let shareUrl = `${window.location.origin}/setlists/${list.id}`;
      if (data.ok && data.token) {
        shareUrl = `${window.location.origin}/setlists/public?token=${data.token}`;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: list.name,
            text: `Worship Setlist: ${list.name}`,
            url: shareUrl,
          });
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return;
        }
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
        prompt('Copy link:', shareUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Invite via Chat State & Handlers
  const [inviteSetlist, setInviteSetlist] = useState(null);
  const [inviteChats, setInviteChats] = useState([]);
  const [inviteChatsLoading, setInviteChatsLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteCanEdit, setInviteCanEdit] = useState(false);
  const [sendingInviteChatId, setSendingInviteChatId] = useState(null);

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
    } catch (e) {
      alert('Network error');
    } finally {
      setSendingInviteChatId(null);
    }
  };

  // Create Setlist
  const handleCreateSetlist = async () => {
    if (!newSetName.trim()) return;
    if (!isOnline) {
      showToast(language === 'am' ? 'Երգացանկ ստեղծելու համար անհրաժեշտ է ինտերնետ կապ' : 'Internet connection required to create setlist');
      return;
    }
    setIsCreating(true);

    try {
      const body = { name: newSetName.trim() };
      if (newSetTeamId) body.team_id = newSetTeamId;
      if (newSetDate) body.service_date = newSetDate;
      if (newSetDesc.trim()) body.description = newSetDesc.trim();

      const res = await fetch('/setlists_api.php?action=create_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        alert(data.message || t('setlists.limitReached', 'Setlist limit reached.'));
      } else {
        alert(data.error || t('setlists.createFailed', 'Failed to create setlist'));
      }
    } catch (err) {
      alert(t('setlists.networkError', 'Network error'));
    } finally {
      setIsCreating(false);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter & Sort Setlists
  const filteredSetlists = useMemo(() => {
    return setlists
      .filter((s) => {
        // Timeframe Filter (Upcoming vs Past)
        if (timeframeFilter === 'upcoming') {
          const isUpcoming = s.service_date ? s.service_date >= todayStr : true;
          if (!isUpcoming) return false;
        } else if (timeframeFilter === 'past') {
          const isPast = s.service_date ? s.service_date < todayStr : false;
          if (!isPast) return false;
        }

        // Category Filter
        if (categoryFilter === 'personal' && (s.access_role === 'team' || s.access_role === 'shared'))
          return false;
        if (categoryFilter === 'team' && s.access_role !== 'team') return false;
        if (categoryFilter === 'shared' && s.access_role !== 'shared') return false;

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
  }, [setlists, timeframeFilter, categoryFilter, searchQuery, sortBy, todayStr]);

  // Timeframe counts (Upcoming vs Past vs All)
  const timeframeCounts = useMemo(() => {
    let upcoming = 0;
    let past = 0;
    for (const s of setlists) {
      if (s.service_date) {
        if (s.service_date >= todayStr) upcoming++;
        else past++;
      } else {
        upcoming++;
      }
    }
    return { all: setlists.length, upcoming, past };
  }, [setlists, todayStr]);

  const timeframeLabels = {
    am: { all: 'Բոլորը', upcoming: 'Առաջիկա', past: 'Անցած / Պատմություն' },
    en: { all: 'All', upcoming: 'Upcoming', past: 'Past / Archive' },
    ru: { all: 'Все', upcoming: 'Предстоящие', past: 'Прошедшие' },
  }[language] || { all: 'Բոլորը', upcoming: 'Առաջիկա', past: 'Անցած' };

  // Statistics
  const stats = useMemo(() => {
    const totalSongs = setlists.reduce((sum, s) => sum + Number(s.items_count || 0), 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = setlists
      .filter((s) => s.service_date && s.service_date >= todayStr)
      .sort((a, b) => a.service_date.localeCompare(b.service_date))[0];
    return {
      totalSets: setlists.length,
      totalSongs,
      upcoming,
    };
  }, [setlists]);

  // Categories with counts
  const categoryCounts = useMemo(() => {
    let personal = 0;
    let team = 0;
    let shared = 0;
    for (const s of setlists) {
      if (s.access_role === 'team') team++;
      else if (s.access_role === 'shared') shared++;
      else personal++;
    }
    return { all: setlists.length, personal, team, shared };
  }, [setlists]);

  const categoryLabels = {
    am: { all: 'Բոլորը', personal: 'Անձնական', team: 'Թիմային', shared: 'Համատեղ' },
    en: { all: 'All', personal: 'Personal', team: 'Team', shared: 'Shared' },
    ru: { all: 'Все', personal: 'Личные', team: 'Командные', shared: 'Общие' },
  }[language] || { all: 'Բոլորը', personal: 'Անձնական', team: 'Թիմային', shared: 'Համատեղ' };

  const sortLabels = {
    am: {
      newest: 'Նորագույն',
      oldest: 'Հնագույն',
      name: 'Անվանում (Ա-Ֆ)',
      items: 'Երգերի քանակ',
    },
    en: {
      newest: 'Newest',
      oldest: 'Oldest',
      name: 'Name (A-Z)',
      items: 'Most Songs',
    },
    ru: {
      newest: 'Сначала новые',
      oldest: 'Сначала старые',
      name: 'По названию (А-Я)',
      items: 'По числу песен',
    },
  }[language] || {
    newest: 'Նորագույն',
    oldest: 'Հնագույն',
    name: 'Անվանում (Ա-Ֆ)',
    items: 'Երգերի քանակ',
  };

  const namePresets = [
    language === 'am' ? 'Կիրակնօրյա ծառայություն' : language === 'ru' ? 'Воскресное служение' : 'Sunday Service',
    language === 'am' ? 'Երիտասարդական' : language === 'ru' ? 'Молодежное' : 'Youth Service',
    language === 'am' ? 'Աղոթքի ժամ' : language === 'ru' ? 'Молитвенное' : 'Prayer Night',
    language === 'am' ? 'Փորձ' : language === 'ru' ? 'Репетиция' : 'Rehearsal',
  ];

  if (!user) {
    return (
      <div className="setlists-page animate-fade-in">
        <div className="setlists-page-header">
          <h1 className="sl-title">
            <span>{t('nav.setlists')}</span>
          </h1>
        </div>
        <div className="login-prompt">
          <div className="prompt-icon">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>{t('nav.login')}</h2>
          <p>{t('setlists.loginPrompt', 'Խնդրում ենք մուտք գործել՝ երգացանկեր ստեղծելու և դիտելու համար:')}</p>
          <Link to="/login?next=/setlists" className="btn btn-primary">
            {t('nav.login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="setlists-page animate-fade-in sl-pwa-enhanced">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="sl-toast-notice animate-fade-in">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Offline Notice */}
      {!isOnline && (
        <div className="sl-app-offline-notice animate-fade-in">
          <span>📡 Օֆլայն ռեժիմ</span> — Դուք դիտում եք պահպանված երգացանկերը: Կապը վերականգնելուց հետո կկարողանաք ստեղծել կամ փոփոխել:
        </div>
      )}

      {/* Header */}
      <div className="setlists-page-header sl-app-header">
        <div className="sl-app-header-top">
          <h1 className="sl-title sl-app-title">
            <span className="sl-title-text">{t('nav.setlists')}</span>
            <span className="count-badge">{setlists.length}</span>
          </h1>
          <button
            type="button"
            className="btn btn-primary btn-new-set sl-app-new-btn"
            onClick={() => setShowCreateModal(true)}
            aria-label={t('setlists.newSetlist')}
            title={t('setlists.newSetlist')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span className="sl-new-btn-text-full">{t('setlists.newSetlist')}</span>
            <span className="sl-new-btn-text-short">
              {language === 'am' ? 'Նոր' : language === 'ru' ? 'Новый' : 'New'}
            </span>
          </button>
        </div>
        <p className="sl-app-subtitle">
          {language === 'am'
            ? 'Կազմակերպեք և վարեք պաշտամունքի երգացանկերը'
            : language === 'ru'
            ? 'Планируйте и проводите служения прославления'
            : 'Plan, organize and lead worship services'}
        </p>
      </div>

      {/* Summary / Stats Banner */}
      {!loading && setlists.length > 0 && (
        <div className="sl-app-stats-bar animate-fade-in">
          <div className="sl-app-stat-card">
            <div className="sl-app-stat-icon sets-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
              </svg>
            </div>
            <div className="sl-app-stat-info">
              <span className="sl-app-stat-val">{stats.totalSets}</span>
              <span className="sl-app-stat-lbl">
                {language === 'am' ? 'Երգացանկ' : language === 'ru' ? 'Сет-листов' : 'Setlists'}
              </span>
            </div>
          </div>

          <div className="sl-app-stat-card">
            <div className="sl-app-stat-icon songs-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <div className="sl-app-stat-info">
              <span className="sl-app-stat-val">{stats.totalSongs}</span>
              <span className="sl-app-stat-lbl">
                {language === 'am' ? 'Երգ ընդհանուր' : language === 'ru' ? 'Всего песен' : 'Total songs'}
              </span>
            </div>
          </div>

          {stats.upcoming && (
            <div
              className="sl-app-stat-card upcoming-card"
              onClick={() => navigate(`/setlists/${stats.upcoming.id}`)}
              title={language === 'am' ? 'Բացել առաջիկա ծառայությունը' : 'Open upcoming service'}
            >
              <div className="sl-app-stat-icon upcoming-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className="sl-app-stat-info">
                <div className="sl-app-stat-badge">
                  {language === 'am' ? 'Առաջիկա' : language === 'ru' ? 'Ближайший' : 'Upcoming'}
                </div>
                <span className="sl-app-stat-val upcoming-title">{stats.upcoming.name}</span>
                <span className="sl-app-stat-lbl">{stats.upcoming.service_date}</span>
              </div>
              <svg className="sl-app-upcoming-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Search & Toolbar */}
      <div className="sl-app-toolbar">
        {/* Search Bar */}
        <div className="sl-app-search-box">
          <svg className="sl-app-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="sl-app-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'am'
                ? 'Որոնել երգացանկ...'
                : language === 'ru'
                ? 'Поиск сет-листа...'
                : 'Search setlists...'
            }
          />
          {searchQuery && (
            <button
              type="button"
              className="sl-app-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>

        {/* View mode & Sort controls */}
        <div className="sl-app-toolbar-controls">
          <div className="sl-app-sort-select-wrapper">
            <select
              className="sl-app-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort setlists"
            >
              <option value="newest">{sortLabels.newest}</option>
              <option value="oldest">{sortLabels.oldest}</option>
              <option value="name">{sortLabels.name}</option>
              <option value="items">{sortLabels.items}</option>
            </select>
            <svg className="sl-app-sort-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          <div className="sl-app-view-toggle">
            <button
              type="button"
              className={`sl-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => changeViewMode('grid')}
              title={language === 'am' ? 'Ցանցային տեսք' : 'Grid view'}
              aria-label="Grid view"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button
              type="button"
              className={`sl-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => changeViewMode('list')}
              title={language === 'am' ? 'Ցուցակային տեսք' : 'List view'}
              aria-label="List view"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Timeframe Filter (Upcoming / Past / All) */}
      <div className="sl-app-timeframe-bar">
        <button
          type="button"
          className={`sl-timeframe-tab ${timeframeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setTimeframeFilter('all')}
        >
          {timeframeLabels.all}
          <span className="sl-tab-badge">{timeframeCounts.all}</span>
        </button>
        <button
          type="button"
          className={`sl-timeframe-tab ${timeframeFilter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setTimeframeFilter('upcoming')}
        >
          {timeframeLabels.upcoming}
          <span className="sl-tab-badge">{timeframeCounts.upcoming}</span>
        </button>
        <button
          type="button"
          className={`sl-timeframe-tab ${timeframeFilter === 'past' ? 'active' : ''}`}
          onClick={() => setTimeframeFilter('past')}
        >
          {timeframeLabels.past}
          <span className="sl-tab-badge">{timeframeCounts.past}</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="sl-app-categories-scroll">
        <button
          type="button"
          className={`sl-app-cat-chip ${categoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          {categoryLabels.all}
          <span className="sl-chip-badge">{categoryCounts.all}</span>
        </button>
        <button
          type="button"
          className={`sl-app-cat-chip ${categoryFilter === 'personal' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('personal')}
        >
          {categoryLabels.personal}
          <span className="sl-chip-badge">{categoryCounts.personal}</span>
        </button>
        {categoryCounts.team > 0 && (
          <button
            type="button"
            className={`sl-app-cat-chip ${categoryFilter === 'team' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('team')}
          >
            {categoryLabels.team}
            <span className="sl-chip-badge">{categoryCounts.team}</span>
          </button>
        )}
        {categoryCounts.shared > 0 && (
          <button
            type="button"
            className={`sl-app-cat-chip ${categoryFilter === 'shared' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('shared')}
          >
            {categoryLabels.shared}
            <span className="sl-chip-badge">{categoryCounts.shared}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}

      {/* Setlists Grid / List */}
      {loading || authLoading ? (
        <div className="sl-app-loading-state">
          <div className="sl-app-spinner"></div>
          <p>{language === 'am' ? 'Բեռնվում է...' : 'Loading...'}</p>
        </div>
      ) : filteredSetlists.length === 0 ? (
        <div className="sl-app-empty-state animate-fade-in">
          <div className="sl-app-empty-glow">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          {searchQuery ? (
            <>
              <h3>{language === 'am' ? 'Երգացանկեր չեն գտնվել' : 'No setlists found'}</h3>
              <p className="sl-app-empty-desc">
                {language === 'am'
                  ? `«${searchQuery}» հարցմամբ ոչինչ չի գտնվել`
                  : `No results matching "${searchQuery}"`}
              </p>
              <button
                type="button"
                className="btn btn-secondary sl-app-empty-action"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
              >
                {language === 'am' ? 'Մաքրել որոնումը' : 'Clear Search'}
              </button>
            </>
          ) : (
            <>
              <h3>{language === 'am' ? 'Երգացանկեր դեռ չկան' : t('setlists.empty')}</h3>
              <p className="sl-app-empty-desc">
                {language === 'am'
                  ? 'Ստեղծեք Ձեր առաջին երգացանկը, ընտրեք երգեր և կազմակերպեք պաշտամունքը'
                  : 'Create your first setlist, add songs and lead worship effortlessly'}
              </p>
              <button
                type="button"
                className="btn btn-primary sl-app-empty-action"
                onClick={() => setShowCreateModal(true)}
              >
                + {t('setlists.newSetlist')}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={`sl-grid sl-app-container sl-view-${viewMode}`}>
          {filteredSetlists.map((list, idx) => {
            const relDate = getRelativeDateLabel(list.service_date, language);
            const isMenuOpen = activeMenuId === list.id;
            const isActionBusy = actionLoadingId === list.id;

            return (
              <div
                key={list.id}
                className={`sl-card sl-app-card animate-fade-in ${viewMode === 'grid' ? 'sl-card-grid' : 'sl-card-row'}`}
                style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}
                onClick={() => navigate(`/setlists/${list.id}`)}
              >
                {/* Cover / Icon */}
                <div
                  className="sl-cover sl-app-cover"
                  style={getSongCoverStyle(list.id || idx, list.name || '')}
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 6h13"></path>
                    <path d="M8 12h13"></path>
                    <path d="M8 18h13"></path>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </div>

                {/* Info */}
                <div className="sl-info sl-app-info">
                  <div className="sl-app-card-top-row">
                    <h3 className="sl-app-name" title={list.name}>
                      {list.name}
                    </h3>
                  </div>

                  {/* Dates & Subtitle */}
                  <div className="sl-app-meta-row">
                    {list.service_date ? (
                      <span className="sl-app-date-chip">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {list.service_date}
                      </span>
                    ) : (
                      <span className="sl-app-date-chip dim">
                        {t('setlists.unknownDate', 'Առանց ամսաթվի')}
                      </span>
                    )}

                    {relDate && (
                      <span className={`sl-app-rel-badge tone-${relDate.tone}`}>
                        {relDate.text}
                      </span>
                    )}

                    <span className="sl-songs-count">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                        <path d="M9 18V5l12-2v13"></path>
                      </svg>
                      {list.items_count} {t('setlists.songsCount')}
                    </span>
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="sl-meta sl-app-bottom-meta">
                    <div className="sl-app-tags">
                      <span className="sl-badge sl-app-role-badge">
                        {list.access_role === 'team' ? (
                          <>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                            </svg>
                            {list.team_name || 'Team'}
                          </>
                        ) : list.access_role === 'shared' ? (
                          <>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                            </svg>
                            {t('setlists.typeShared')}
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            {t('setlists.typePersonal')}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Quick action buttons */}
                    <div className="sl-app-actions" onClick={(e) => e.stopPropagation()}>
                      {/* Live Mode Quick Launch */}
                      <button
                        type="button"
                        className="sl-app-btn-live"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/setlists/${list.id}/live`);
                        }}
                        title="Live ռեժիմ"
                        aria-label="Launch live mode"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span className="sl-app-btn-live-text">Live</span>
                      </button>

                      {/* 3-dots Context Menu Button */}
                      <div className="sl-app-menu-wrap">
                        <button
                          type="button"
                          className="sl-app-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : list.id);
                          }}
                          aria-label="Setlist actions"
                          disabled={isActionBusy}
                        >
                          ⋮
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="sl-app-dropdown animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="sl-app-dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                navigate(`/setlists/${list.id}`);
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                              </svg>
                              {t('setlists.edit', 'Խմբագրել')}
                            </button>

                            <button
                              type="button"
                              className="sl-app-dropdown-item"
                              onClick={(e) => handleDuplicate(e, list.id)}
                            >
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              {language === 'am' ? 'Կրկնօրինակել' : language === 'ru' ? 'Дублировать' : 'Duplicate'}
                            </button>

                            <button
                              type="button"
                              className="sl-app-dropdown-item"
                              onClick={(e) => handleOpenInviteModal(e, list)}
                            >
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                              </svg>
                              {language === 'am' ? 'Հրավիրել չաթով' : language === 'ru' ? 'Пригласить в чат' : 'Invite via chat'}
                            </button>

                            <button
                              type="button"
                              className="sl-app-dropdown-item"
                              onClick={(e) => handleShare(e, list)}
                            >
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                              </svg>
                              {t('setlists.share', 'Կիսվել')}
                            </button>

                            {list.access_role === 'owner' && (
                              <button
                                type="button"
                                className="sl-app-dropdown-item delete-item"
                                onClick={(e) => handleDelete(e, list.id)}
                              >
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                {t('setlists.delete', 'Ջնջել')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && createPortal(
        <div className="sl-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="sl-modal sl-app-create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sl-modal-header">
              <h2>{t('setlists.newSetlist')}</h2>
              <button
                type="button"
                className="sl-modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Quick Name Presets */}
            <div className="sl-app-preset-chips">
              {namePresets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className="sl-app-preset-chip"
                  onClick={() => {
                    setNewSetName(preset);
                    if (!newSetDate) {
                      setNewSetDate(getNextSundayDate());
                    }
                  }}
                >
                  + {preset}
                </button>
              ))}
            </div>

            <div className="sl-form-group">
              <label>{t('setlists.nameField', 'Երգացանկի անվանում')}</label>
              <input
                type="text"
                className="sl-input"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder={t('setlists.namePlaceholder', 'Օր.՝ Կիրակնօրյա ծառայություն')}
                autoFocus
              />
            </div>

            {/* Service Date + Next Sunday Shortcut */}
            <div className="sl-form-group">
              <div className="sl-app-date-label-row">
                <label>{t('setlists.dateField', 'Ծառայության ամսաթիվ')}</label>
                <button
                  type="button"
                  className="sl-app-quick-date-btn"
                  onClick={() => setNewSetDate(getNextSundayDate())}
                >
                  📅 {language === 'am' ? 'Հաջորդ կիրակին' : language === 'ru' ? 'След. воскресенье' : 'Next Sunday'}
                </button>
              </div>
              <input
                type="date"
                className="sl-input"
                value={newSetDate}
                onChange={(e) => setNewSetDate(e.target.value)}
              />
            </div>

            {/* Team Selection */}
            {teams.length > 0 && (
              <div className="sl-form-group">
                <label>{t('setlists.assignTeam', 'Կցել թիմին (ըստ ցանկության)')}</label>
                <div className="sl-select-wrapper">
                  <select
                    className="sl-select"
                    value={newSetTeamId}
                    onChange={(e) => setNewSetTeamId(e.target.value)}
                  >
                    <option value="">{t('setlists.personalTeam', '-- Անձնական --')}</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <svg className="sl-select-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            )}

            {/* Description / Notes */}
            <div className="sl-form-group">
              <label>{t('setlists.descField', 'Նշումներ / Նկարագրություն')}</label>
              <textarea
                className="sl-input sl-textarea"
                rows={3}
                value={newSetDesc}
                onChange={(e) => setNewSetDesc(e.target.value)}
                placeholder={
                  language === 'am'
                    ? 'Օր.՝ Ծառայության թեմա, հատուկ հայտարարություններ...'
                    : 'Notes, themes or instructions...'
                }
              />
            </div>

            <div className="sl-modal-actions">
              <div className="sl-modal-actions-main">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  {t('setlists.cancelBtn', 'Չեղարկել')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateSetlist}
                  disabled={!newSetName.trim() || isCreating}
                >
                  {isCreating ? t('setlists.creatingBtn', 'Ստեղծվում է...') : t('setlists.createBtn', 'Ստեղծել')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Invite via Chat Modal */}
      {inviteSetlist && createPortal(
        <div className="sl-modal-overlay" onClick={() => setInviteSetlist(null)}>
          <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sl-modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                  {language === 'am' ? 'Հրավիրել չաթով' : language === 'ru' ? 'Пригласить в чат' : 'Invite via Chat'}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  {inviteSetlist.name}
                </div>
              </div>
              <button
                type="button"
                className="sl-modal-close"
                onClick={() => setInviteSetlist(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="sl-form-group">
              <label>
                {language === 'am' ? 'Հաղորդագրություն (ըստ ցանկության)' : language === 'ru' ? 'Сообщение (необязательно)' : 'Message (optional)'}
              </label>
              <textarea
                className="sl-input sl-textarea"
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

            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                  {language === 'am' ? 'Խմբագրման իրավունք' : language === 'ru' ? 'Право редактирования' : 'Edit permission'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {language === 'am' ? 'Մասնակիցները կարող են փոփոխել երգացանկը' : language === 'ru' ? 'Участники могут изменять сет-лист' : 'Participants can edit the setlist'}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={inviteCanEdit}
                  onChange={(e) => setInviteCanEdit(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#00d4ff' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {language === 'am' ? 'Ընտրեք չաթը' : language === 'ru' ? 'Выберите чат' : 'Select a chat'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {inviteChatsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
                  {language === 'am' ? 'Բեռնվում է...' : language === 'ru' ? 'Загрузка...' : 'Loading...'}
                </div>
              ) : inviteChats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
                  {language === 'am' ? 'Չաթեր չկան' : language === 'ru' ? 'Нет чатов' : 'No chats found'}
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
                        cursor: sendingInviteChatId ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.1)',
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
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {c.type === 'group' ? (language === 'am' ? 'Խումբ' : language === 'ru' ? 'Группа' : 'Group') : (language === 'am' ? 'Անձնական չաթ' : language === 'ru' ? 'Личный чат' : 'Direct')}
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
                        {isSending ? '...' : (language === 'am' ? 'Ուղարկել ➔' : language === 'ru' ? 'Отправить ➔' : 'Send ➔')}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="sl-modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={() => setInviteSetlist(null)}
              >
                {language === 'am' ? 'Փակել' : language === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
