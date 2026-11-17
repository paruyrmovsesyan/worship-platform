import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './ChurchHub.css';

export default function ChurchHub() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'directory' | 'pulse'
  const [feedScope, setFeedScope] = useState(0); // 0 = global, >0 = church_id
  const [typeFilter, setTypeFilter] = useState('all'); // all | announcement | event | prayer

  const [posts, setPosts] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

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

  // Create Church modal
  const [showCreateChurch, setShowCreateChurch] = useState(false);
  const [newChurchName, setNewChurchName] = useState('');
  const [newChurchCity, setNewChurchCity] = useState('');
  const [newChurchService, setNewChurchService] = useState('');
  const [newChurchDesc, setNewChurchDesc] = useState('');
  const [newChurchOpen, setNewChurchOpen] = useState(true);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [feedback, setFeedback] = useState('');

  const ui = useMemo(() => {
    if (language === 'ru') {
      return {
        title: 'Церковь и Община',
        subtitle: 'Объявления, события, молитвенные нужды и поиск поместной церкви',
        tabs: { feed: 'Лента', directory: 'Церкви', pulse: 'Моя церковь' },
        globalFeed: 'Общее сообщество',
        types: { all: 'Все', announcement: 'Объявления', event: 'События', prayer: 'Молитвы' },
        newPost: 'Написать / Попросить молитву',
        prayBtn: 'Молюсь',
        prayingCount: 'молятся',
        join: 'Присоединиться',
        applied: 'Заявка отправлена',
        joined: 'Вы в церкви',
        createChurch: 'Создать церковь',
        joinByCode: 'Войти по коду',
        searchChurches: 'Поиск церкви или города...',
        loginNeeded: 'Войдите, чтобы публиковать записи, молиться и присоединяться к общине.',
        login: 'Войти',
      };
    }
    if (language === 'en') {
      return {
        title: 'Church & Community',
        subtitle: 'Announcements, upcoming gatherings, prayer requests, and local congregations',
        tabs: { feed: 'Feed', directory: 'Churches', pulse: 'My Church' },
        globalFeed: 'Worship Community',
        types: { all: 'All', announcement: 'Announcements', event: 'Events', prayer: 'Prayers' },
        newPost: 'Share Post / Prayer Request',
        prayBtn: 'Praying',
        prayingCount: 'praying',
        join: 'Join',
        applied: 'Pending',
        joined: 'Member',
        createChurch: 'Create Church',
        joinByCode: 'Join by Code',
        searchChurches: 'Search church or city...',
        loginNeeded: 'Sign in to post updates, pray for others, and join your local congregation.',
        login: 'Sign In',
      };
    }
    return {
      title: 'Եկեղեցի և Համայնք',
      subtitle: 'Հայտարարություններ, միջոցառումներ, աղոթքի խնդրանքներ և եկեղեցիների ցանկ',
      tabs: { feed: 'Հոսք', directory: 'Եկեղեցիներ', pulse: 'Իմ եկեղեցին' },
      globalFeed: 'Ընդհանուր համայնք',
      types: { all: 'Բոլորը', announcement: 'Հայտարարություններ', event: 'Միջոցառումներ', prayer: 'Աղոթքներ' },
      newPost: 'Գրառում կամ Աղոթքի խնդրանք',
      prayBtn: 'Աղոթում եմ',
      prayingCount: 'աղոթում են',
      join: 'Միանալ',
      applied: 'Սպասման մեջ է',
      joined: 'Անդամ եք',
      createChurch: 'Ստեղծել եկեղեցի',
      joinByCode: 'Միանալ կոդով',
      searchChurches: 'Որոնել եկեղեցի կամ քաղաք...',
      loginNeeded: 'Մուտք գործեք՝ հայտարարություն գրելու, աղոթելու և Ձեր եկեղեցուն միանալու համար։',
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
    if (activeTab !== 'directory') return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadChurches(churchQuery);
    });
    return () => { active = false; };
  }, [activeTab, churchQuery, loadChurches]);

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
          is_open: newChurchOpen,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setShowCreateChurch(false);
        setNewChurchName('');
        setNewChurchCity('');
        setNewChurchService('');
        setNewChurchDesc('');
        await Promise.all([loadMyChurch(), loadChurches(churchQuery)]);
        setFeedScope(data.church_id);
        setActiveTab('pulse');
        showToast(`Եկեղեցին ստեղծվեց • Կոդ՝ ${data.invite_code}`);
      }
    } catch { /* ignore network error */ }
  };

  const handleManageMember = async (targetUserId, decision, role = 'member') => {
    if (!primaryChurch) return;
    try {
      const res = await fetch('/church_api.php?action=manage_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          church_id: primaryChurch.id,
          target_user_id: targetUserId,
          decision,
          role,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        loadMyChurch();
        showToast('Թարմացվեց');
      }
    } catch { /* ignore network error */ }
  };

  return (
    <div className="church-page animate-fade-in">
      <header className="church-hero-bar">
        <div>
          <h1>{ui.title}</h1>
          <p>{ui.subtitle}</p>
        </div>

        <div className="church-segmented" role="tablist">
          {['feed', 'directory', 'pulse'].map((tab) => (
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
        </div>
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
                  <div className="church-invite-box">
                    <small>Հրավերի կոդ</small>
                    <strong>{primaryChurch.invite_code}</strong>
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
                        <small className="church-role-tag">{m.role}</small>
                      </div>
                      {isLeader && Number(m.user_id) !== Number(user?.id) && (
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
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showCreateChurch && (
        <div className="church-modal-backdrop" onClick={() => setShowCreateChurch(false)}>
          <form className="church-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCreateChurch}>
            <h3>{ui.createChurch}</h3>
            <input
              type="text"
              className="church-input"
              required
              placeholder="Եկեղեցու անվանումը"
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
              placeholder="Հավաքների ժամ (օր. Կիրակի 11:00)"
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
        </div>
      )}
    </div>
  );
}
