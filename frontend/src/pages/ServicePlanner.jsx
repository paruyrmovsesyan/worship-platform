import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './ServicePlanner.css';

const DEFAULT_TIMELINE = [
  { id: '1', category: 'prayer', title: 'Բացման խոսք և Աղոթք (Opening Prayer)', duration: 5, notes: 'Առաջնորդ' },
  { id: '2', category: 'worship', title: 'Փառաբանության բաժին (4 երգ)', duration: 25, notes: 'Worship Band' },
  { id: '3', category: 'announcement', title: 'Եկեղեցական հայտարարություններ և ընծա', duration: 6, notes: 'Հովվական թիմ' },
  { id: '4', category: 'sermon', title: 'Աստծո Խոսքի Պատգամ / Քարոզ', duration: 35, notes: 'Հովիվ' },
  { id: '5', category: 'worship', title: 'Արձագանքման երգ և ծառայություն', duration: 8, notes: 'Worship Band' },
  { id: '6', category: 'prayer', title: 'Օրհնություն և Հաղորդակցություն', duration: 3, notes: 'Բոլորը' },
];

const DEFAULT_ROSTER = [
  { id: 'r1', role: 'Փառաբանության Առաջնորդ (Worship Leader)', person: '', status: 'accepted' },
  { id: 'r2', role: 'Ակուստիկ Կիթառ (Acoustic Guitar)', person: '', status: 'accepted' },
  { id: 'r3', role: 'Էլեկտրական Կիթառ (Electric Guitar)', person: '', status: 'pending' },
  { id: 'r4', role: 'Ստեղնաշարային / Դաշնամուր (Keys)', person: '', status: 'accepted' },
  { id: 'r5', role: 'Բաս Կիթառ (Bass)', person: '', status: 'pending' },
  { id: 'r6', role: 'Հարվածային գործիքներ (Drums)', person: '', status: 'accepted' },
  { id: 'r7', role: 'Բեք-Վոկալ (Vocals)', person: '', status: 'pending' },
  { id: 'r8', role: 'Հնչյունային Օպերատոր (Sound)', person: '', status: 'accepted' },
  { id: 'r9', role: 'Մեդիա / Պրոյեկտոր / OBS', person: '', status: 'accepted' },
];

const CATEGORY_META = {
  worship: { icon: '🎵', label: 'Պաշտամունք' },
  prayer: { icon: '🙏', label: 'Աղոթք' },
  sermon: { icon: '📖', label: 'Քարոզ' },
  announcement: { icon: '📢', label: 'Հայտարարություն' },
  communion: { icon: '🍞', label: 'Հաղորդություն' },
  media: { icon: '🎬', label: 'Մեդիա' },
};

const LOCAL_PLANS_KEY = 'wp_service_plans_cache';

export default function ServicePlanner() {
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState(null);
  const [title, setTitle] = useState('Կիրակնօրյա Պաշտամունքի Ծառայություն');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('11:00');
  const [timeline, setTimeline] = useState(DEFAULT_TIMELINE);
  const [roster, setRoster] = useState(DEFAULT_ROSTER);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Song picker modal state
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [allSongs, setAllSongs] = useState([]);
  const [songQuery, setSongQuery] = useState('');
  const [newRoleName, setNewRoleName] = useState('');

  const applyPlanState = (plan) => {
    if (!plan) return;
    setPlanId(plan.id || null);
    setTitle(plan.title || 'Կիրակնօրյա Պաշտամունքի Ծառայություն');
    setDate(plan.date || new Date().toISOString().split('T')[0]);
    setStartTime(plan.start_time || '11:00');
    setTimeline(Array.isArray(plan.timeline) && plan.timeline.length > 0 ? plan.timeline : DEFAULT_TIMELINE);
    setRoster(Array.isArray(plan.roster) && plan.roster.length > 0 ? plan.roster : DEFAULT_ROSTER);
  };

  // Load saved plans from API or localStorage fallback on mount
  useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      try {
        const res = await fetch('/service_planner_api.php?action=get_plans');
        if (res.ok) {
          const data = await res.json();
          if (active && data.ok && Array.isArray(data.plans) && data.plans.length > 0) {
            setPlans(data.plans);
            localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(data.plans));
            applyPlanState(data.plans[data.plans.length - 1]);
            return;
          }
        }
      } catch {
        // Fallback to local cache
      }
      try {
        const cached = JSON.parse(localStorage.getItem(LOCAL_PLANS_KEY) || '[]');
        if (active && Array.isArray(cached) && cached.length > 0) {
          setPlans(cached);
          applyPlanState(cached[cached.length - 1]);
        }
      } catch {
        // Ignore
      }
    };
    loadPlans();
    return () => { active = false; };
  }, []);

  // Auto-calculate start time for each item based on duration
  const timelineWithCalculatedTimes = useMemo(() => {
    const [h, m] = (startTime || '11:00').split(':').map(Number);
    const baseMinutes = (Number.isFinite(h) ? h : 11) * 60 + (Number.isFinite(m) ? m : 0);

    const result = [];
    let accumulated = 0;
    for (const item of timeline) {
      const itemStartMin = baseMinutes + accumulated;
      const hours = Math.floor(itemStartMin / 60) % 24;
      const mins = itemStartMin % 60;
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      accumulated += parseInt(item.duration, 10) || 0;
      result.push({
        ...item,
        calculatedTime: formattedTime,
      });
    }
    return result;
  }, [startTime, timeline]);

  const totalDuration = useMemo(() => {
    return timeline.reduce((acc, item) => acc + (parseInt(item.duration, 10) || 0), 0);
  }, [timeline]);

  const endClockTime = useMemo(() => {
    const [h, m] = (startTime || '11:00').split(':').map(Number);
    const totalMins = (Number.isFinite(h) ? h : 11) * 60 + (Number.isFinite(m) ? m : 0) + totalDuration;
    const hours = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }, [startTime, totalDuration]);

  const handleAddItem = (category = 'worship') => {
    setTimeline((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        category,
        title: 'Նոր բաժին',
        duration: 5,
        notes: '',
      },
    ]);
  };

  const handleOpenSongPicker = async () => {
    setShowSongPicker(true);
    if (allSongs.length === 0) {
      try {
        const res = await fetch('/api.php');
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllSongs(data);
        } else if (Array.isArray(data?.songs)) {
          setAllSongs(data.songs);
        }
      } catch {
        // Ignore
      }
    }
  };

  const handleAddSongToTimeline = (song) => {
    const songTitle = song.title_hy || song.title || 'Երգ';
    const songKey = song.song_key ? ` [${song.song_key}]` : '';
    setTimeline((prev) => [
      ...prev,
      {
        id: `song_${song.id}_${Date.now()}`,
        category: 'worship',
        song_id: song.id,
        title: `🎵 ${songTitle}${songKey}`,
        duration: 5,
        notes: song.bpm ? `${song.bpm} BPM` : 'Worship Band',
      },
    ]);
    setShowSongPicker(false);
  };

  const handleMoveItem = (index, direction) => {
    setTimeline((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleRemoveItem = (id) => {
    setTimeline((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setTimeline((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRosterChange = (id, field, value) => {
    setRoster((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddRosterRole = () => {
    const clean = newRoleName.trim();
    if (!clean) return;
    setRoster((prev) => [
      ...prev,
      { id: `r_${Date.now()}`, role: clean, person: '', status: 'pending' },
    ]);
    setNewRoleName('');
  };

  const handleRemoveRosterRole = (id) => {
    setRoster((prev) => prev.filter((r) => r.id !== id));
  };

  const handleNewPlan = () => {
    setPlanId(`srv_${Date.now()}`);
    setTitle('Նոր Ծառայության Պլան');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('11:00');
    setTimeline(DEFAULT_TIMELINE);
    setRoster(DEFAULT_ROSTER);
  };

  const handleSave = async () => {
    setSaving(true);
    const currentId = planId || `srv_${Date.now()}`;
    const payload = {
      id: currentId,
      title,
      date,
      start_time: startTime,
      timeline,
      roster,
    };

    try {
      const res = await fetch('/service_planner_api.php?action=save_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const savedPlan = data?.plan || payload;
      setPlanId(savedPlan.id);
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === savedPlan.id);
        const updated = exists
          ? prev.map((p) => (p.id === savedPlan.id ? savedPlan : p))
          : [...prev, savedPlan];
        localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(updated));
        return updated;
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch {
      // Save locally if offline
      setPlanId(currentId);
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === currentId);
        const updated = exists
          ? prev.map((p) => (p.id === currentId ? payload : p))
          : [...prev, payload];
        localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(updated));
        return updated;
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planId) return;
    try {
      await fetch('/service_planner_api.php?action=delete_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId }),
      });
    } catch {
      // Ignore
    }
    const remaining = plans.filter((p) => p.id !== planId);
    setPlans(remaining);
    localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(remaining));
    if (remaining.length > 0) {
      applyPlanState(remaining[remaining.length - 1]);
    } else {
      handleNewPlan();
    }
  };

  const filteredSongs = useMemo(() => {
    const q = songQuery.trim().toLowerCase();
    if (!q) return allSongs.slice(0, 30);
    return allSongs
      .filter((s) => {
        const t = `${s.title_hy || ''} ${s.title || ''} ${s.song_key || ''}`.toLowerCase();
        return t.includes(q);
      })
      .slice(0, 30);
  }, [allSongs, songQuery]);

  return (
    <div className="service-planner-page">
      {/* Saved Plans Switcher Bar */}
      <div className="sp-plans-switcher">
        <div className="sp-plans-left">
          <span className="sp-switcher-label">📂 Պահպանված ծառայություններ՝</span>
          <select
            className="sp-plan-select"
            value={planId || ''}
            onChange={(e) => {
              const found = plans.find((p) => p.id === e.target.value);
              if (found) applyPlanState(found);
            }}
          >
            {plans.length === 0 && <option value="">Ընթացիկ սևագիր</option>}
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.date} — {p.title}
              </option>
            ))}
          </select>
          <button type="button" className="sp-new-plan-btn" onClick={handleNewPlan}>
            + Նոր ծառայություն
          </button>
          {planId && plans.length > 0 && (
            <button
              type="button"
              className="sp-del-plan-btn"
              onClick={handleDeletePlan}
              title="Ջնջել ընտրված ծառայությունը"
            >
              🗑️
            </button>
          )}
        </div>
        <Link to="/setlists" className="sp-back-link">
          ← Սեթլիստներ
        </Link>
      </div>

      <div className="sp-header">
        <div className="sp-title-area">
          <h1>📅 Ծառայության Պլանավորիչ & Run-of-Show</h1>
          <div className="sp-meta-bar">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sp-title-input"
              placeholder="Ծառայության անվանումը..."
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="sp-time-chip">
              <span>Սկիզբ՝</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="sp-summary-pill">
              ⏱️ Տևողություն՝ <strong>{totalDuration} րոպե</strong> (Ավարտ՝ <strong>{endClockTime}</strong>)
            </div>
          </div>
        </div>

        <div className="sp-actions-bar">
          <button type="button" className="sp-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Պահպանվում է...' : savedNotice ? '✓ Պահպանվեց' : '💾 Պահպանել Պլանը'}
          </button>
          <button
            type="button"
            className="sp-btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ Տպել / PDF
          </button>
        </div>
      </div>

      <div className="sp-grid">
        {/* Run of Show Timeline */}
        <div className="sp-card">
          <div className="sp-card-title">
            <span>⏱️ Ծառայության Ընթացակարգ (Order of Service)</span>
            <div className="sp-card-header-btns">
              <button
                type="button"
                onClick={handleOpenSongPicker}
                className="sp-add-song-btn"
              >
                🎵 + Ավելացնել երգ բազայից
              </button>
              <button
                type="button"
                onClick={() => handleAddItem('worship')}
                className="sp-add-item-btn"
              >
                + Ավելացնել բաժին
              </button>
            </div>
          </div>

          <div className="sp-timeline-list">
            {timelineWithCalculatedTimes.map((item, idx) => (
              <div key={item.id} className="sp-timeline-item">
                <div className="sp-item-reorder">
                  <button
                    type="button"
                    onClick={() => handleMoveItem(idx, -1)}
                    disabled={idx === 0}
                    title="Բարձրացնել"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveItem(idx, 1)}
                    disabled={idx === timelineWithCalculatedTimes.length - 1}
                    title="Իջեցնել"
                  >
                    ↓
                  </button>
                </div>

                <span className="sp-item-time">{item.calculatedTime}</span>

                <div className="sp-item-dur-box">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={item.duration}
                    onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)}
                    className="sp-item-duration-input"
                  />
                  <span>ր</span>
                </div>

                <select
                  className="sp-item-cat-select"
                  value={item.category || 'worship'}
                  onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                  title="Բաժնի տեսակը"
                >
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.icon} {meta.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                  className="sp-item-title-input"
                  placeholder="Բաժնի վերնագիրը..."
                />

                {item.song_id && (
                  <Link
                    to={`/song/${item.song_id}`}
                    className="sp-item-song-link"
                    title="Բացել երգը"
                  >
                    ↗
                  </Link>
                )}

                <input
                  type="text"
                  placeholder="Նշումներ (Թիմ / Անձ)..."
                  value={item.notes || ''}
                  onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                  className="sp-item-notes-input"
                />

                <button
                  type="button"
                  className="sp-item-remove-btn"
                  onClick={() => handleRemoveItem(item.id)}
                  title="Հեռացնել"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Team Rostering */}
        <div className="sp-card">
          <div className="sp-card-title">
            <span>👥 Ծառայողների Թիմ (Roster)</span>
            <span className="sp-roster-count">
              {roster.filter((r) => r.status === 'accepted').length}/{roster.length} հաստատված
            </span>
          </div>

          <div className="sp-roster-list">
            {roster.map((r) => (
              <div key={r.id} className="sp-roster-item">
                <div className="sp-roster-info">
                  <div className="sp-roster-role">{r.role}</div>
                  <input
                    type="text"
                    placeholder="Նշանակել ծառայողի անունը..."
                    value={r.person}
                    onChange={(e) => handleRosterChange(r.id, 'person', e.target.value)}
                    className="sp-roster-person-input"
                  />
                </div>

                <div className="sp-roster-right">
                  <select
                    value={r.status}
                    onChange={(e) => handleRosterChange(r.id, 'status', e.target.value)}
                    className={`sp-status-badge sp-status-${r.status}`}
                  >
                    <option value="accepted">✓ Հաստատված</option>
                    <option value="pending">⏳ Սպասման մեջ</option>
                    <option value="declined">✕ Մերժված</option>
                  </select>
                  <button
                    type="button"
                    className="sp-roster-del-btn"
                    onClick={() => handleRemoveRosterRole(r.id)}
                    title="Հեռացնել դերը"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="sp-add-role-bar">
            <input
              type="text"
              placeholder="Նոր դեր (օր.՝ Թարգմանիչ, Տեսախցիկ)..."
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRosterRole()}
            />
            <button type="button" onClick={handleAddRosterRole}>
              + Ավելացնել
            </button>
          </div>
        </div>
      </div>

      {/* Song Picker Modal */}
      {showSongPicker && (
        <div className="sp-modal-overlay" onClick={() => setShowSongPicker(false)}>
          <div className="sp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h3>🎵 Ավելացնել երգ ծառայության ծրագրում</h3>
              <button type="button" onClick={() => setShowSongPicker(false)}>✕</button>
            </div>
            <input
              type="text"
              className="sp-song-search"
              placeholder="Որոնել երգի վերնագրով կամ տոնայնությամբ..."
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              autoFocus
            />
            <div className="sp-song-picker-list">
              {filteredSongs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="sp-song-picker-row"
                  onClick={() => handleAddSongToTimeline(s)}
                >
                  <span className="sp-song-picker-title">{s.title_hy || s.title}</span>
                  <span className="sp-song-picker-meta">
                    {s.song_key && <strong className="sp-key-tag">{s.song_key}</strong>}
                    {s.bpm && <span>{s.bpm} BPM</span>}
                  </span>
                </button>
              ))}
              {filteredSongs.length === 0 && (
                <div className="sp-song-picker-empty">Երգեր չգտնվեցին</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
