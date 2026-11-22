import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateQrMatrix } from '../utils/qrSvg';
import { nativeShare } from '../utils/nativeFeatures';
import { Glass } from 'glisse';
import './ChurchHub.css';

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ChurchHub() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => {
    const tParam = searchParams.get('tab');
    return ['feed', 'calendar', 'rehearsals', 'directory', 'pulse'].includes(tParam) ? tParam : 'feed';
  });
  const [feedScope, setFeedScope] = useState(0); // 0 = global, >0 = church_id
  const [typeFilter, setTypeFilter] = useState('all'); // all | announcement | event | prayer

  const [posts, setPosts] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const [calendarItems, setCalendarItems] = useState([]);
  const [calMode, setCalMode] = useState('month'); // 'month' | 'week'
  const [calFilter, setCalFilter] = useState('all'); // 'all' | 'event' | 'rehearsal'
  const [calCursor, setCalCursor] = useState(() => new Date());
  const [selectedCalDate, setSelectedCalDate] = useState(() => toIsoDate(new Date()));

  const [rehearsals, setRehearsals] = useState([]);
  const [loadingRehearsals, setLoadingRehearsals] = useState(false);
  const [showRehearsalModal, setShowRehearsalModal] = useState(false);
  const [rehTitle, setRehTitle] = useState('');
  const [rehDate, setRehDate] = useState(() => toIsoDate(new Date()));
  const [rehTime, setRehTime] = useState('18:00');
  const [rehLocation, setRehLocation] = useState('');
  const [rehRepeat, setRehRepeat] = useState(false);
  const [rehSetlistId, setRehSetlistId] = useState(0);
  const [rehNotes, setRehNotes] = useState('');
  const [userSetlists, setUserSetlists] = useState([]);

  const [churches, setChurches] = useState([]);
  const [churchQuery, setChurchQuery] = useState('');
  const [loadingChurches, setLoadingChurches] = useState(false);

  const [memberships, setMemberships] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);

  // Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [postType, setPostType] = useState('prayer');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postEventDate, setPostEventDate] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [postAnon, setPostAnon] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Create Church / Worship Group modal
  const [showCreateChurch, setShowCreateChurch] = useState(false);
  const [newChurchType, setNewChurchType] = useState('church'); // 'church' | 'worship_group'
  const [newChurchName, setNewChurchName] = useState('');
  const [newChurchCity, setNewChurchCity] = useState('');
  const [newChurchService, setNewChurchService] = useState('');
  const [newChurchDesc, setNewChurchDesc] = useState('');
  const [newChurchOpen, setNewChurchOpen] = useState(true);
  const [inviteCodeInput, setInviteCodeInput] = useState(() => (searchParams.get('join') || '').toUpperCase());
  const [qrInviteTarget, setQrInviteTarget] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [fbText, setFbText] = useState('');
  const [feedback, setFeedback] = useState('');

  const ui = useMemo(() => {
    if (language === 'ru') {
      return {
        title: 'Церковь и Община',
        subtitle: 'Объявления, события, календарь, репетиции, молитвы и общины',
        tabs: { feed: 'Лента', calendar: 'Календарь', rehearsals: 'Репетиции', directory: 'Церкви', pulse: 'Моя церковь' },
        globalFeed: 'Общее сообщество',
        types: { all: 'Все', announcement: 'Объявления', event: 'События', prayer: 'Молитвы' },
        newPost: 'Написать / Попросить молитву',
        prayBtn: 'Молюсь',
        going: 'Приду',
        cant: 'Не смогу',
        join: 'Присоединиться',
        applied: 'Заявка отправлена',
        joined: 'Вы в церкви',
        createChurch: 'Создать церковь / группу',
        joinByCode: 'Войти по коду',
        searchChurches: 'Поиск церкви или города...',
        loginNeeded: 'Войдите, чтобы публиковать записи, подтверждать участие и присоединяться к общине.',
        login: 'Войти',
      };
    }
    if (language === 'en') {
      return {
        title: 'Church & Community',
        subtitle: 'Announcements, calendar, rehearsals, prayer requests, and worship groups',
        tabs: { feed: 'Feed', calendar: 'Calendar', rehearsals: 'Rehearsals', directory: 'Churches', pulse: 'My Church' },
        globalFeed: 'Worship Community',
        types: { all: 'All', announcement: 'Announcements', event: 'Events', prayer: 'Prayers' },
        newPost: 'Share Post / Prayer Request',
        prayBtn: 'Praying',
        going: 'Going',
        cant: "Can't go",
        join: 'Join',
        applied: 'Pending',
        joined: 'Member',
        createChurch: 'Create Church / Group',
        joinByCode: 'Join by Code',
        searchChurches: 'Search church or city...',
        loginNeeded: 'Sign in to post updates, RSVP to services & rehearsals, and join a group.',
        login: 'Sign In',
      };
    }
    return {
      title: 'Եկեղեցի և Համայնք',
      subtitle: 'Հայտարարություններ, օրացույց, փորձեր, աղոթքի խնդրանքներ և համայնքներ',
      tabs: { feed: 'Հոսք', calendar: 'Օրացույց', rehearsals: 'Փորձեր', directory: 'Եկեղեցիներ', pulse: 'Իմ եկեղեցին' },
      globalFeed: 'Ընդհանուր համայնք',
      types: { all: 'Բոլորը', announcement: 'Հայտարարություններ', event: 'Միջոցառումներ', prayer: 'Աղոթքներ' },
      newPost: 'Գրառում կամ Աղոթքի խնդրանք',
      prayBtn: 'Աղոթում եմ',
      going: 'Կգամ',
      cant: 'Չեմ կարող',
      join: 'Միանալ',
      applied: 'Սպասման մեջ է',
      joined: 'Անդամ եք',
      createChurch: 'Ստեղծել եկեղեցի կամ խումբ',
      joinByCode: 'Միանալ կոդով',
      searchChurches: 'Որոնել եկեղեցի կամ քաղաք...',
      loginNeeded: 'Մուտք գործեք՝ գրառում կատարելու, փորձերին արձագանքելու և խմբին միանալու համար։',
      login: 'Մուտք',
    };
  }, [language]);

  const showToast = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  const loadFeed = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch(
        `/church_api.php?action=get_feed&church_id=${feedScope}&type=${encodeURIComponent(typeFilter)}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      setPosts(data?.ok && Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setPosts([]);
    }
    setLoadingFeed(false);
  }, [feedScope, typeFilter]);

  const loadChurches = useCallback(async (q = '') => {
    setLoadingChurches(true);
    try {
      const res = await fetch(`/church_api.php?action=list_churches&q=${encodeURIComponent(q)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setChurches(data?.ok && Array.isArray(data.churches) ? data.churches : []);
    } catch {
      setChurches([]);
    }
    setLoadingChurches(false);
  }, []);

  const loadMyChurch = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setMembers([]);
      setPendingMembers([]);
      return;
    }
    try {
      const res = await fetch('/church_api.php?action=my_church', { credentials: 'include' });
      const data = await res.json();
      if (data?.ok) {
        setMemberships(data.memberships || []);
        setMembers(data.members || []);
        setPendingMembers(data.pending || []);
      }
    } catch { /* ignore network error */ }
  }, [user]);

  const loadCalendar = useCallback(async () => {
    try {
      const res = await fetch(`/church_api.php?action=get_calendar&church_id=${feedScope}`, { credentials: 'include' });
      const data = await res.json();
      setCalendarItems(data?.ok && Array.isArray(data.items) ? data.items : []);
    } catch {
      setCalendarItems([]);
    }
  }, [feedScope]);

  const loadRehearsals = useCallback(async () => {
    setLoadingRehearsals(true);
    try {
      const res = await fetch(`/church_api.php?action=list_rehearsals&church_id=${feedScope}`, { credentials: 'include' });
      const data = await res.json();
      setRehearsals(data?.ok && Array.isArray(data.rehearsals) ? data.rehearsals : []);
    } catch {
      setRehearsals([]);
    }
    setLoadingRehearsals(false);
  }, [feedScope]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadFeed();
    });
    return () => { active = false; };
  }, [loadFeed]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadMyChurch();
    });
    return () => { active = false; };
  }, [loadMyChurch]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      let active = true;
      Promise.resolve().then(() => { if (active) loadCalendar(); });
      return () => { active = false; };
    }
    if (activeTab === 'rehearsals') {
      let active = true;
      Promise.resolve().then(() => { if (active) loadRehearsals(); });
      return () => { active = false; };
    }
    if (activeTab !== 'directory') return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadChurches(churchQuery);
    });
    return () => { active = false; };
  }, [activeTab, churchQuery, loadChurches, loadCalendar, loadRehearsals]);

  useEffect(() => {
    if (!showRehearsalModal || !user) return;
    fetch('/setlists_api.php?action=get_setlists', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setUserSetlists(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [showRehearsalModal, user]);

  const approvedChurches = useMemo(
    () => memberships.filter((m) => m.my_status === 'approved'),
    [memberships],
  );

  const primaryChurch = approvedChurches[0] || memberships[0] || null;
  const isLeader = primaryChurch && ['pastor', 'leader'].includes(primaryChurch.my_role);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?next=/church');
      return;
    }
    if (postBody.trim().length < 3) return;
    setSubmittingPost(true);
    try {
      const res = await fetch('/church_api.php?action=create_post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          church_id: feedScope,
          type: postType,
          title: postTitle,
          body: postBody,
          event_date: postEventDate,
          location: postLocation,
          is_anonymous: postAnon,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setPostTitle('');
        setPostBody('');
        setPostEventDate('');
        setPostLocation('');
        setPostAnon(false);
        setShowComposer(false);
        loadFeed();
        showToast('Հրապարակվեց');
      }
    } catch { /* ignore network error */ }
    setSubmittingPost(false);
  };

  const handleTogglePray = async (postId) => {
    if (!user) {
      navigate('/login?next=/church');
      return;
    }
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextPrayed = !p.has_prayed;
        return {
          ...p,
          has_prayed: nextPrayed,
          pray_count: Math.max(0, Number(p.pray_count || 0) + (nextPrayed ? 1 : -1)),
        };
      }),
    );
    try {
      const res = await fetch('/church_api.php?action=toggle_pray', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await res.json();
      if (data?.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, has_prayed: data.has_prayed, pray_count: data.pray_count } : p,
          ),
        );
      }
    } catch { /* ignore network error */ }
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await fetch('/church_api.php?action=delete_post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await res.json();
      if (data?.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch { /* ignore network error */ }
  };

  const handleJoinChurch = async (churchId, inviteCode = '') => {
    if (!user) {
      navigate('/login?next=/church');
      return;
    }
    try {
      const res = await fetch('/church_api.php?action=join_church', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ church_id: churchId, invite_code: inviteCode }),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast(data.status === 'approved' ? 'Միացաք եկեղեցուն' : 'Հայտը ուղարկվեց');
        setInviteCodeInput('');
        await Promise.all([loadChurches(churchQuery), loadMyChurch()]);
      } else {
        showToast(data?.error || 'Սխալ');
      }
    } catch { /* ignore network error */ }
  };

  const handleCreateChurch = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?next=/church');
      return;
    }
    try {
      const res = await fetch('/church_api.php?action=create_church', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newChurchName,
          city: newChurchCity,
          service_time: newChurchService,
          description: newChurchDesc,
          church_type: newChurchType,
          is_open: newChurchOpen,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        const createdName = newChurchName;
        setShowCreateChurch(false);
        setNewChurchName('');
        setNewChurchCity('');
        setNewChurchService('');
        setNewChurchDesc('');
        await Promise.all([loadMyChurch(), loadChurches(churchQuery)]);
        setFeedScope(data.church_id);
        setActiveTab('pulse');
        setQrInviteTarget({ name: createdName, invite_code: data.invite_code });
        showToast(`Ստեղծվեց • Կոդ՝ ${data.invite_code}`);
      }
    } catch { /* ignore network error */ }
  };

  const handleRsvp = async (targetType, targetId, status) => {
    if (!user) {
      navigate('/login?next=/church');
      return;
    }
    try {
      const res = await fetch('/church_api.php?action=rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ target_type: targetType, target_id: targetId, status }),
      });
      const data = await res.json();
      if (data?.ok) {
        const applyPatch = (item) =>
          Number(item.id) === Number(targetId)
            ? {
                ...item,
                my_rsvp: data.my_rsvp,
                rsvp_going_count: data.rsvp_going_count,
                rsvp_cant_count: data.rsvp_cant_count,
              }
            : item;
        if (targetType === 'event') setPosts((prev) => prev.map((p) => (p.type === 'event' ? applyPatch(p) : p)));
        if (targetType === 'rehearsal') setRehearsals((prev) => prev.map(applyPatch));
        setCalendarItems((prev) => prev.map((c) => (c.kind === targetType ? applyPatch(c) : c)));
      }
    } catch { /* ignore */ }
  };

  const handleCreateRehearsal = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?next=/church');
      return;
    }
    const chosenSet = userSetlists.find((s) => Number(s.id) === Number(rehSetlistId));
    try {
      const res = await fetch('/church_api.php?action=create_rehearsal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          church_id: feedScope,
          title: rehTitle,
          rehearsal_date: rehDate,
          rehearsal_time: rehTime,
          location: rehLocation,
          repeat_weekly: rehRepeat,
          setlist_id: rehSetlistId,
          setlist_title: chosenSet?.name || chosenSet?.title || '',
          notes: rehNotes,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setShowRehearsalModal(false);
        setRehTitle('');
        setRehLocation('');
        setRehNotes('');
        loadRehearsals();
        loadCalendar();
        showToast('Փորձը պլանավորվեց');
      }
    } catch { /* ignore */ }
  };

  const handleDeleteRehearsal = async (id) => {
    try {
      const res = await fetch('/church_api.php?action=delete_rehearsal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data?.ok) {
        setRehearsals((prev) => prev.filter((r) => r.id !== id));
      }
    } catch { /* ignore */ }
  };

  const handleManageMember = async (targetUserId, decision, val = 'member') => {
    if (!primaryChurch) return;
    try {
      const payload =
        decision === 'ministry'
          ? { church_id: primaryChurch.id, target_user_id: targetUserId, decision, ministry: val }
          : { church_id: primaryChurch.id, target_user_id: targetUserId, decision, role: val };
      const res = await fetch('/church_api.php?action=manage_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.ok) {
        loadMyChurch();
        showToast('Թարմացվեց');
      }
    } catch { /* ignore network error */ }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (fbText.trim().length < 3) return;
    try {
      const res = await fetch('/church_api.php?action=submit_feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category: 'community_feedback', message: fbText }),
      });
      const data = await res.json();
      if (data?.ok) {
        setShowFeedbackModal(false);
        setFbText('');
        showToast('Շնորհակալություն արձագանքի համար');
      }
    } catch { /* ignore */ }
  };

  const calendarCells = useMemo(() => {
    const base = new Date(calCursor);
    const cells = [];
    if (calMode === 'week') {
      const dayIdx = base.getDay();
      const mondayOffset = dayIdx === 0 ? -6 : 1 - dayIdx;
      const start = new Date(base);
      start.setDate(base.getDate() + mondayOffset);
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        cells.push({ date: d, iso: toIsoDate(d), outside: false });
      }
    } else {
      const year = base.getFullYear();
      const month = base.getMonth();
      const first = new Date(year, month, 1);
      const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
      const start = new Date(year, month, 1 - startOffset);
      for (let i = 0; i < 42; i += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        cells.push({ date: d, iso: toIsoDate(d), outside: d.getMonth() !== month });
      }
    }
    return cells;
  }, [calCursor, calMode]);

  const exactDayCalendarItems = useMemo(() => {
    const byKind = calendarItems.filter((i) => calFilter === 'all' || i.kind === calFilter);
    return byKind.filter((i) => i.date === selectedCalDate);
  }, [calendarItems, calFilter, selectedCalDate]);

  const dayCalendarItems = useMemo(() => {
    const byKind = calendarItems.filter((i) => calFilter === 'all' || i.kind === calFilter);
    return exactDayCalendarItems.length > 0 ? exactDayCalendarItems : byKind;
  }, [calendarItems, calFilter, exactDayCalendarItems]);

  const qrMatrix = useMemo(() => {
    if (!qrInviteTarget?.invite_code) return null;
    const url = `${window.location.origin}/church?join=${qrInviteTarget.invite_code}`;
    return { url, matrix: generateQrMatrix(url) };
  }, [qrInviteTarget]);

  return (
    <div className="church-page animate-fade-in">
      <header className="church-hero-bar">
        <div>
          <h1>{ui.title}</h1>
          <p>{ui.subtitle}</p>
        </div>

        <Glass className="church-segmented" role="tablist">
          {['feed', 'calendar', 'rehearsals', 'directory', 'pulse'].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {ui.tabs[tab]}
            </button>
          ))}
        </Glass>
      </header>

      {feedback && <div className="church-toast">{feedback}</div>}

      {!user && (
        <div className="church-guest-banner">
          <span>{ui.loginNeeded}</span>
          <Link to="/login?next=/church" className="church-amber-btn">
            {ui.login}
          </Link>
        </div>
      )}

      {activeTab === 'feed' && (
        <div className="church-feed-layout">
          <div className="church-feed-controls">
            <div className="church-pill-row">
              <button
                type="button"
                className={`church-pill ${feedScope === 0 ? 'active' : ''}`}
                onClick={() => setFeedScope(0)}
              >
                🌐 {ui.globalFeed}
              </button>
              {approvedChurches.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  className={`church-pill ${feedScope === Number(ch.id) ? 'active' : ''}`}
                  onClick={() => setFeedScope(Number(ch.id))}
                >
                  ⛪ {ch.name}
                </button>
              ))}
            </div>

            <div className="church-pill-row">
              {['all', 'announcement', 'event', 'prayer'].map((tKey) => (
                <button
                  key={tKey}
                  type="button"
                  className={`church-pill small ${typeFilter === tKey ? 'active' : ''}`}
                  onClick={() => setTypeFilter(tKey)}
                >
                  {ui.types[tKey]}
                </button>
              ))}
            </div>
          </div>

          <div className="church-compose-bar">
            <button
              type="button"
              className="church-amber-btn"
              onClick={() => (user ? setShowComposer((v) => !v) : navigate('/login?next=/church'))}
            >
              + {ui.newPost}
            </button>
            <Link to="/service-planner" className="church-pill">
              📅 Ծառայության պլանավորում
            </Link>
          </div>

          {showComposer && (
            <form className="church-card church-composer" onSubmit={handleCreatePost}>
              <div className="church-type-selector">
                {[
                  { id: 'prayer', label: '🙏 Աղոթքի խնդրանք' },
                  { id: 'announcement', label: '📢 Հայտարարություն' },
                  { id: 'event', label: '📅 Միջոցառում' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={postType === opt.id ? 'active' : ''}
                    onClick={() => setPostType(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="church-input"
                placeholder="Վերնագիր (ըստ ցանկության)"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
              />
              <textarea
                className="church-input"
                rows={3}
                required
                placeholder={
                  postType === 'prayer'
                    ? 'Կիսվեք ձեր աղոթքի կարիքով...'
                    : 'Մանրամասներ համայնքի համար...'
                }
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
              />

              {postType === 'event' && (
                <div className="church-two-col">
                  <input
                    type="text"
                    className="church-input"
                    placeholder="Ամսաթիվ / Ժամ (օր. Կիրակի 11:00)"
                    value={postEventDate}
                    onChange={(e) => setPostEventDate(e.target.value)}
                  />
                  <input
                    type="text"
                    className="church-input"
                    placeholder="Վայր"
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value)}
                  />
                </div>
              )}

              <div className="church-composer-foot">
                {postType === 'prayer' ? (
                  <label className="church-checkbox">
                    <input
                      type="checkbox"
                      checked={postAnon}
                      onChange={(e) => setPostAnon(e.target.checked)}
                    />
                    <span>Անանուն</span>
                  </label>
                ) : (
                  <span />
                )}
                <button type="submit" className="church-amber-btn" disabled={submittingPost}>
                  {submittingPost ? '...' : 'Հրապարակել'}
                </button>
              </div>
            </form>
          )}

          <div className="church-posts-list">
            {loadingFeed ? (
              <div className="church-card">Բեռնվում է...</div>
            ) : posts.length === 0 ? (
              <div className="church-card church-empty">
                <p>Այստեղ դեռ գրառումներ չկան։ Եղեք առաջինը՝ կիսվելով աղոթքի խնդրանքով կամ հայտարարությամբ։</p>
              </div>
            ) : (
              posts.map((post) => (
                <article key={post.id} className={`church-card church-post type-${post.type}`}>
                  <div className="church-post-head">
                    <span className={`church-type-badge ${post.type}`}>
                      {post.type === 'prayer'
                        ? '🙏 Աղոթք'
                        : post.type === 'event'
                        ? '📅 Միջոցառում'
                        : '📢 Հայտարարություն'}
                    </span>
                    <span className="church-post-meta">
                      {post.author_name} • {String(post.created_at || '').slice(0, 16)}
                    </span>
                  </div>
                  {post.title ? <h3 className="church-post-title">{post.title}</h3> : null}
                  <p className="church-post-body">{post.body}</p>
                  {(post.event_date || post.location) && (
                    <div className="church-event-chips">
                      {post.event_date && <span>🕒 {post.event_date}</span>}
                      {post.location && <span>📍 {post.location}</span>}
                    </div>
                  )}
                  <div className="church-post-actions">
                    <button
                      type="button"
                      className={`church-pray-btn ${post.has_prayed ? 'active' : ''}`}
                      onClick={() => handleTogglePray(post.id)}
                    >
                      <span>🙏 {ui.prayBtn}</span>
                      <strong>{post.pray_count || 0}</strong>
                    </button>
                    {post.type === 'event' && (
                      <div className="church-rsvp-group">
                        <button
                          type="button"
                          className={`church-rsvp-btn going ${post.my_rsvp === 'going' ? 'active' : ''}`}
                          onClick={() => handleRsvp('event', post.id, 'going')}
                        >
                          ✓ {ui.going} ({post.rsvp_going_count || 0})
                        </button>
                        <button
                          type="button"
                          className={`church-rsvp-btn cant ${post.my_rsvp === 'cant' ? 'active' : ''}`}
                          onClick={() => handleRsvp('event', post.id, 'cant')}
                        >
                          {ui.cant}
                        </button>
                      </div>
                    )}
                    {user && Number(user.id) === Number(post.user_id) && (
                      <button
                        type="button"
                        className="church-del-btn"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        Ջնջել
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="church-feed-layout">
          <div className="church-card">
            <div className="church-cal-toolbar">
              <div className="church-pill-row">
                <button
                  type="button"
                  className="church-pill"
                  onClick={() => {
                    const d = new Date(calCursor);
                    if (calMode === 'week') d.setDate(d.getDate() - 7);
                    else d.setMonth(d.getMonth() - 1);
                    setCalCursor(d);
                  }}
                >
                  ‹
                </button>
                <strong style={{ minWidth: 130, textAlign: 'center' }}>
                  {calCursor.toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'hy-AM', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
                <button
                  type="button"
                  className="church-pill"
                  onClick={() => {
                    const d = new Date(calCursor);
                    if (calMode === 'week') d.setDate(d.getDate() + 7);
                    else d.setMonth(d.getMonth() + 1);
                    setCalCursor(d);
                  }}
                >
                  ›
                </button>
              </div>
              <div className="church-pill-row">
                <button
                  type="button"
                  className={`church-pill small ${calMode === 'month' ? 'active' : ''}`}
                  onClick={() => setCalMode('month')}
                >
                  {language === 'ru' ? 'Месяц' : language === 'en' ? 'Month' : 'Ամիս'}
                </button>
                <button
                  type="button"
                  className={`church-pill small ${calMode === 'week' ? 'active' : ''}`}
                  onClick={() => setCalMode('week')}
                >
                  {language === 'ru' ? 'Неделя' : language === 'en' ? 'Week' : 'Շաբաթ'}
                </button>
                {['all', 'event', 'rehearsal'].map((fk) => (
                  <button
                    key={fk}
                    type="button"
                    className={`church-pill small ${calFilter === fk ? 'active' : ''}`}
                    onClick={() => setCalFilter(fk)}
                  >
                    {fk === 'all' ? ui.types.all : fk === 'event' ? ui.types.event : ui.tabs.rehearsals}
                  </button>
                ))}
              </div>
            </div>

            <div className="church-cal-grid">
              {(language === 'ru'
                ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                : language === 'en'
                ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                : ['Երկ', 'Երք', 'Չոր', 'Հնգ', 'Ուր', 'Շբթ', 'Կիր']
              ).map((dow) => (
                <div key={dow} className="church-cal-dow">
                  {dow}
                </div>
              ))}
              {calendarCells.map((cell) => {
                const dots = calendarItems.filter(
                  (it) => it.date === cell.iso && (calFilter === 'all' || it.kind === calFilter),
                );
                const isToday = cell.iso === toIsoDate(new Date());
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    className={`church-cal-cell ${cell.outside ? 'is-outside' : ''} ${isToday ? 'is-today' : ''} ${selectedCalDate === cell.iso ? 'is-selected' : ''}`}
                    onClick={() => setSelectedCalDate(cell.iso)}
                  >
                    <span>{cell.date.getDate()}</span>
                    {dots.length > 0 && (
                      <div className="church-cal-dots">
                        {dots.slice(0, 3).map((d, i) => (
                          <span key={i} className={`church-cal-dot ${d.kind}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="church-posts-list">
            {exactDayCalendarItems.length === 0 && dayCalendarItems.length > 0 && (
              <div className="church-card" style={{ padding: '12px 16px', fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                📅 <strong>{selectedCalDate}</strong> ամսաթվին գրանցում չկա — ստորև ցուցադրված են առաջիկա միջոցառումներն ու փորձերը.
              </div>
            )}
            {dayCalendarItems.length === 0 ? (
              <div className="church-card church-empty">
                <p>Ընտրված օրվա կամ համայնքի համար միջոցառումներ և փորձեր դեռ չկան։</p>
              </div>
            ) : (
              dayCalendarItems.map((item) => (
                <article key={`${item.kind}_${item.id}`} className="church-card church-post">
                  <div className="church-post-head">
                    <span className={`church-type-badge ${item.kind === 'rehearsal' ? 'announcement' : 'event'}`}>
                      {item.kind === 'rehearsal' ? `🎵 ${ui.tabs.rehearsals}` : `📅 ${ui.types.event}`}
                    </span>
                    <span className="church-post-meta">{item.date_label || item.date}</span>
                  </div>
                  <h3 className="church-post-title">{item.title}</h3>
                  {item.subtitle && <p className="church-post-body">{item.subtitle}</p>}
                  {item.location && (
                    <div className="church-event-chips">
                      <span>📍 {item.location}</span>
                    </div>
                  )}
                  <div className="church-post-actions">
                    <div className="church-rsvp-group">
                      <button
                        type="button"
                        className={`church-rsvp-btn going ${item.my_rsvp === 'going' ? 'active' : ''}`}
                        onClick={() => handleRsvp(item.kind, item.id, 'going')}
                      >
                        ✓ {ui.going} ({item.rsvp_going_count || 0})
                      </button>
                      <button
                        type="button"
                        className={`church-rsvp-btn cant ${item.my_rsvp === 'cant' ? 'active' : ''}`}
                        onClick={() => handleRsvp(item.kind, item.id, 'cant')}
                      >
                        {ui.cant}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'rehearsals' && (
        <div className="church-feed-layout">
          <div className="church-compose-bar">
            <button
              type="button"
              className="church-amber-btn"
              onClick={() => (user ? setShowRehearsalModal(true) : navigate('/login?next=/church?tab=rehearsals'))}
            >
              + {language === 'ru' ? 'Назначить репетицию' : language === 'en' ? 'Schedule Rehearsal' : 'Պլանավորել փորձ'}
            </button>
            <Link to="/setlists" className="church-pill">
              🎼 {language === 'ru' ? 'Списки песен' : language === 'en' ? 'Setlists' : 'Երգացանկեր'}
            </Link>
          </div>

          <div className="church-posts-list">
            {loadingRehearsals ? (
              <div className="church-card">Բեռնվում է...</div>
            ) : rehearsals.length === 0 ? (
              <div className="church-card church-empty">
                <p>Դեռ պլանավորված փորձեր չկան։ Պլանավորեք փորձ, կցեք երգացանկ և հավաքեք թիմի մասնակցությունը (RSVP)։</p>
              </div>
            ) : (
              rehearsals.map((r) => (
                <article key={r.id} className="church-card church-post">
                  <div className="church-post-head">
                    <span className="church-type-badge announcement">
                      🎵 {r.rehearsal_date} {r.rehearsal_time} {r.repeat_weekly ? '• 🔁' : ''}
                    </span>
                    <span className="church-post-meta">{r.created_by_name}</span>
                  </div>
                  <h3 className="church-post-title">{r.title}</h3>
                  {r.notes && <p className="church-post-body">{r.notes}</p>}
                  <div className="church-event-chips">
                    {r.location && <span>📍 {r.location}</span>}
                    {r.setlist_title && (
                      <span
                        style={{ cursor: r.setlist_id ? 'pointer' : 'default' }}
                        onClick={() => r.setlist_id && navigate(`/setlists/${r.setlist_id}`)}
                      >
                        🎼 {r.setlist_title}
                      </span>
                    )}
                  </div>
                  <div className="church-post-actions">
                    <div className="church-rsvp-group">
                      <button
                        type="button"
                        className={`church-rsvp-btn going ${r.my_rsvp === 'going' ? 'active' : ''}`}
                        onClick={() => handleRsvp('rehearsal', r.id, 'going')}
                      >
                        ✓ {ui.going} ({r.rsvp_going_count || 0})
                      </button>
                      <button
                        type="button"
                        className={`church-rsvp-btn cant ${r.my_rsvp === 'cant' ? 'active' : ''}`}
                        onClick={() => handleRsvp('rehearsal', r.id, 'cant')}
                      >
                        {ui.cant} ({r.rsvp_cant_count || 0})
                      </button>
                    </div>
                    {user && Number(user.id) === Number(r.created_by) && (
                      <button type="button" className="church-del-btn" onClick={() => handleDeleteRehearsal(r.id)}>
                        Ջնջել
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'directory' && (
        <div className="church-directory-layout">
          <div className="church-directory-bar">
            <input
              type="search"
              className="church-input church-search-inp"
              placeholder={ui.searchChurches}
              value={churchQuery}
              onChange={(e) => setChurchQuery(e.target.value)}
            />
            <div className="church-invite-join">
              <input
                type="text"
                className="church-input"
                placeholder="Կոդ (օր. A1B2C3)"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                className="church-pill"
                onClick={() => inviteCodeInput && handleJoinChurch(0, inviteCodeInput)}
              >
                {ui.joinByCode}
              </button>
            </div>
            <button
              type="button"
              className="church-amber-btn"
              onClick={() => (user ? setShowCreateChurch(true) : navigate('/login?next=/church'))}
            >
              + {ui.createChurch}
            </button>
          </div>

          <div className="church-grid">
            {loadingChurches ? (
              <div className="church-card">Բեռնվում է...</div>
            ) : churches.length === 0 ? (
              <div className="church-card church-empty">
                <p>Եկեղեցիներ դեռ չկան։ Կարող եք ստեղծել Ձեր եկեղեցու էջը հիմա։</p>
              </div>
            ) : (
              churches.map((c) => (
                <div key={c.id} className="church-card church-dir-card">
                  <div className="church-dir-head">
                    <h3>{c.name}</h3>
                    <span className="church-member-badge">{c.member_count || 0} անդամ</span>
                  </div>
                  {c.city && <div className="church-dir-meta">📍 {c.city}</div>}
                  {c.service_time && <div className="church-dir-meta">🕒 {c.service_time}</div>}
                  {c.description && <p className="church-dir-desc">{c.description}</p>}
                  <div className="church-dir-foot">
                    {c.my_status === 'approved' ? (
                      <button
                        type="button"
                        className="church-pill active"
                        onClick={() => {
                          setFeedScope(Number(c.id));
                          setActiveTab('feed');
                        }}
                      >
                        ✓ {ui.joined} • Բացել հոսքը
                      </button>
                    ) : c.my_status === 'pending' ? (
                      <span className="church-pill">{ui.applied}</span>
                    ) : (
                      <button
                        type="button"
                        className="church-amber-btn"
                        onClick={() => handleJoinChurch(c.id)}
                      >
                        {ui.join}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'pulse' && (
        <div className="church-pulse-layout">
          {!primaryChurch ? (
            <div className="church-card church-empty">
              <h3>Դեռ չեք միացել եկեղեցու</h3>
              <p>Գտեք Ձեր եկեղեցին ցանկում կամ ստեղծեք նոր եկեղեցական համայնք։</p>
              <div className="church-compose-bar">
                <button type="button" className="church-amber-btn" onClick={() => setActiveTab('directory')}>
                  Բացել ցանկը
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="church-card church-pulse-header">
                <div>
                  <span className="church-type-badge announcement">{primaryChurch.my_role}</span>
                  <h2>{primaryChurch.name}</h2>
                  <p>
                    {primaryChurch.city ? `📍 ${primaryChurch.city} • ` : ''}
                    {primaryChurch.service_time || 'Կիրակնօրյա ծառայություն'}
                  </p>
                </div>
                {primaryChurch.invite_code && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="church-invite-box">
                      <small>Հրավերի կոդ</small>
                      <strong>{primaryChurch.invite_code}</strong>
                    </div>
                    <button
                      type="button"
                      className="church-pill"
                      onClick={() => setQrInviteTarget(primaryChurch)}
                    >
                      QR Հրավեր
                    </button>
                    <button
                      type="button"
                      className="church-pill"
                      onClick={() => setShowFeedbackModal(true)}
                    >
                      Արձագանք
                    </button>
                  </div>
                )}
              </div>

              {isLeader && pendingMembers.length > 0 && (
                <div className="church-card">
                  <h3>Սպասող հայտեր ({pendingMembers.length})</h3>
                  <div className="church-members-list">
                    {pendingMembers.map((m) => (
                      <div key={m.user_id} className="church-member-row">
                        <span>{m.user_name}</span>
                        <div className="church-member-btns">
                          <button
                            type="button"
                            className="church-amber-btn"
                            onClick={() => handleManageMember(m.user_id, 'approve')}
                          >
                            Հաստատել
                          </button>
                          <button
                            type="button"
                            className="church-del-btn"
                            onClick={() => handleManageMember(m.user_id, 'reject')}
                          >
                            Մերժել
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="church-card">
                <h3>Անդամներ ({members.length})</h3>
                <div className="church-members-list">
                  {members.map((m) => (
                    <div key={m.user_id} className="church-member-row">
                      <div>
                        <strong>{m.user_name}</strong>
                        <small className="church-role-tag">
                          {m.role}{m.ministry ? ` · ${m.ministry}` : ''}
                        </small>
                      </div>
                      {isLeader && (
                        <div className="church-member-selects">
                          <select
                            className="church-role-select"
                            value={m.ministry || ''}
                            onChange={(e) => handleManageMember(m.user_id, 'ministry', e.target.value)}
                            aria-label="Ministry"
                          >
                            <option value="">Ծառայություն (ոչ մի)</option>
                            <option value="worship">Փառաբանություն</option>
                            <option value="kids">Մանկական</option>
                            <option value="prayer">Աղոթք</option>
                            <option value="media">Մեդիա</option>
                            <option value="hospitality">Հյուրընկալություն</option>
                          </select>
                          {Number(m.user_id) !== Number(user?.id) && (
                            <select
                              className="church-role-select"
                              value={m.role}
                              onChange={(e) => handleManageMember(m.user_id, 'role', e.target.value)}
                            >
                              <option value="member">Member</option>
                              <option value="worship_leader">Worship Leader</option>
                              <option value="leader">Leader</option>
                              <option value="pastor">Pastor</option>
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showCreateChurch && createPortal(
        <div className="church-modal-backdrop" onClick={() => setShowCreateChurch(false)}>
          <form className="church-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCreateChurch}>
            <h3>{ui.createChurch}</h3>
            <div className="church-type-selector">
              <button
                type="button"
                className={newChurchType === 'church' ? 'active' : ''}
                onClick={() => setNewChurchType('church')}
              >
                ⛪ Եկեղեցի
              </button>
              <button
                type="button"
                className={newChurchType === 'worship_group' ? 'active' : ''}
                onClick={() => setNewChurchType('worship_group')}
              >
                🎵 Փառաբանության խումբ
              </button>
            </div>
            <input
              type="text"
              className="church-input"
              required
              placeholder={newChurchType === 'worship_group' ? 'Խմբի անվանումը' : 'Եկեղեցու անվանումը'}
              value={newChurchName}
              onChange={(e) => setNewChurchName(e.target.value)}
            />
            <input
              type="text"
              className="church-input"
              placeholder="Քաղաք (օր. Երևան)"
              value={newChurchCity}
              onChange={(e) => setNewChurchCity(e.target.value)}
            />
            <input
              type="text"
              className="church-input"
              placeholder="Հավաքների / Փորձերի ժամ (օր. Կիրակի 11:00)"
              value={newChurchService}
              onChange={(e) => setNewChurchService(e.target.value)}
            />
            <textarea
              className="church-input"
              rows={3}
              placeholder="Նկարագրություն"
              value={newChurchDesc}
              onChange={(e) => setNewChurchDesc(e.target.value)}
            />
            <label className="church-checkbox">
              <input
                type="checkbox"
                checked={newChurchOpen}
                onChange={(e) => setNewChurchOpen(e.target.checked)}
              />
              <span>Բաց միացում (առանց հաստատման սպասելու)</span>
            </label>
            <div className="church-modal-foot">
              <button type="button" className="church-pill" onClick={() => setShowCreateChurch(false)}>
                Փակել
              </button>
              <button type="submit" className="church-amber-btn">
                Ստեղծել
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {showRehearsalModal && createPortal(
        <div className="church-modal-backdrop" onClick={() => setShowRehearsalModal(false)}>
          <form className="church-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCreateRehearsal}>
            <h3>🎵 Պլանավորել փորձ</h3>
            <input
              type="text"
              className="church-input"
              required
              placeholder="Փորձի վերնագիրը (օր. Կիրակնօրյա փորձ)"
              value={rehTitle}
              onChange={(e) => setRehTitle(e.target.value)}
            />
            <div className="church-two-col">
              <input type="date" className="church-input" required value={rehDate} onChange={(e) => setRehDate(e.target.value)} />
              <input type="time" className="church-input" value={rehTime} onChange={(e) => setRehTime(e.target.value)} />
            </div>
            <input
              type="text"
              className="church-input"
              placeholder="Վայր (օր. Հիմնական դահլիճ)"
              value={rehLocation}
              onChange={(e) => setRehLocation(e.target.value)}
            />
            {userSetlists.length > 0 && (
              <select className="church-input" value={rehSetlistId} onChange={(e) => setRehSetlistId(Number(e.target.value))}>
                <option value={0}>Կցել երգացանկ (ըստ ցանկության)</option>
                {userSetlists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.title}
                  </option>
                ))}
              </select>
            )}
            <textarea
              className="church-input"
              rows={2}
              placeholder="Նշումներ երաժիշտներին..."
              value={rehNotes}
              onChange={(e) => setRehNotes(e.target.value)}
            />
            <label className="church-checkbox">
              <input type="checkbox" checked={rehRepeat} onChange={(e) => setRehRepeat(e.target.checked)} />
              <span>Կրկնել ամեն շաբաթ</span>
            </label>
            <div className="church-modal-foot">
              <button type="button" className="church-pill" onClick={() => setShowRehearsalModal(false)}>
                Փակել
              </button>
              <button type="submit" className="church-amber-btn">
                Պահպանել
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {qrInviteTarget && qrMatrix && createPortal(
        <div className="church-modal-backdrop" onClick={() => setQrInviteTarget(null)}>
          <div className="church-modal" onClick={(e) => e.stopPropagation()}>
            <h3>QR Հրավեր • {qrInviteTarget.name}</h3>
            <div className="church-qr-wrap">
              <div className="church-qr-box">
                <svg width="180" height="180" viewBox={`0 0 ${qrMatrix.matrix.length} ${qrMatrix.matrix.length}`} shapeRendering="crispEdges">
                  <rect width={qrMatrix.matrix.length} height={qrMatrix.matrix.length} fill="#ffffff" />
                  {qrMatrix.matrix.map((row, r) =>
                    row.map((cell, c) =>
                      cell === 1 ? <rect key={`${r}_${c}`} x={c} y={r} width={1} height={1} fill="#111827" /> : null,
                    ),
                  )}
                </svg>
              </div>
              <strong>Կոդ՝ {qrInviteTarget.invite_code}</strong>
              <button
                type="button"
                className="church-amber-btn"
                onClick={() => nativeShare({ title: qrInviteTarget.name, text: `Միացեք «${qrInviteTarget.name}» խմբին կոդով՝ ${qrInviteTarget.invite_code}`, url: qrMatrix.url })}
              >
                Ուղարկել հրավերի հղումը
              </button>
            </div>
            <div className="church-modal-foot">
              <button type="button" className="church-pill" onClick={() => setQrInviteTarget(null)}>
                Փակել
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showFeedbackModal && createPortal(
        <div className="church-modal-backdrop" onClick={() => setShowFeedbackModal(false)}>
          <form className="church-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitFeedback}>
            <h3>Արձագանք կամ առաջարկ</h3>
            <textarea
              className="church-input"
              rows={4}
              required
              placeholder="Գրեք ձեր առաջարկը կամ խնդրի նկարագրությունը..."
              value={fbText}
              onChange={(e) => setFbText(e.target.value)}
            />
            <div className="church-modal-foot">
              <button type="button" className="church-pill" onClick={() => setShowFeedbackModal(false)}>
                Փակել
              </button>
              <button type="submit" className="church-amber-btn">
                Ուղարկել
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
