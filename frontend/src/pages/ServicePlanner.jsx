import { useState, useMemo } from 'react';
import './ServicePlanner.css';

const DEFAULT_TIMELINE = [
  { id: '1', title: 'Welcome & Opening Prayer', duration: 4, notes: 'Leader' },
  { id: '2', title: 'Worship Set (4 Songs)', duration: 25, notes: 'Band' },
  { id: '3', title: 'Church Announcements & Tithes', duration: 6, notes: 'Pastoral team' },
  { id: '4', title: 'Sermon / Message', duration: 35, notes: 'Pastor' },
  { id: '5', title: 'Response & Ministry Song', duration: 8, notes: 'Band' },
  { id: '6', title: 'Benediction & Fellowship', duration: 2, notes: 'All' },
];

const DEFAULT_ROSTER = [
  { id: 'r1', role: 'Worship Leader', person: '', status: 'accepted' },
  { id: 'r2', role: 'Acoustic Guitar', person: '', status: 'accepted' },
  { id: 'r3', role: 'Electric Guitar', person: '', status: 'pending' },
  { id: 'r4', role: 'Keys / Piano', person: '', status: 'accepted' },
  { id: 'r5', role: 'Bass', person: '', status: 'pending' },
  { id: 'r6', role: 'Drums', person: '', status: 'accepted' },
  { id: 'r7', role: 'Vocals (Soprano/Alto)', person: '', status: 'pending' },
  { id: 'r8', role: 'Sound Engineer', person: '', status: 'accepted' },
  { id: 'r9', role: 'Media / Projection / OBS', person: '', status: 'accepted' },
];

export default function ServicePlanner() {
  const [title, setTitle] = useState('Sunday Worship Service');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('11:00');
  const [timeline, setTimeline] = useState(DEFAULT_TIMELINE);
  const [roster, setRoster] = useState(DEFAULT_ROSTER);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Auto-calculate start time for each item based on duration
  const timelineWithCalculatedTimes = useMemo(() => {
    const [h, m] = startTime.split(':').map(Number);
    const baseMinutes = (h || 11) * 60 + (m || 0);

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

  const handleAddItem = () => {
    setTimeline((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title: 'New Service Item',
        duration: 5,
        notes: '',
      },
    ]);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/service_planner_api.php?action=save_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          date,
          start_time: startTime,
          timeline,
          roster,
        }),
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="service-planner-page">
      <div className="sp-header">
        <div className="sp-title-area">
          <h1>📅 Ministry Service Planner & Run-of-Show</h1>
          <div className="sp-meta-bar">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ fontSize: '1.1rem', width: '280px' }}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <span>Start:</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100px' }}
            />
            <span>Total: <strong>{totalDuration} mins</strong></span>
          </div>
        </div>

        <div className="sp-actions-bar">
          <button type="button" className="sp-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : savedNotice ? '✓ Saved!' : '💾 Save Plan'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🖨️ Print Run-of-Show
          </button>
        </div>
      </div>

      <div className="sp-grid">
        {/* Run of Show Timeline */}
        <div className="sp-card">
          <div className="sp-card-title">
            <span>⏱️ Order of Service (Timeline)</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="sp-add-item-btn"
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add Item
            </button>
          </div>

          <div className="sp-timeline-list">
            {timelineWithCalculatedTimes.map((item) => (
              <div key={item.id} className="sp-timeline-item">
                <span className="sp-item-time">{item.calculatedTime}</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={item.duration}
                  onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)}
                  className="sp-item-duration"
                  style={{ width: '45px', background: 'rgba(255, 255, 255, 0.06)', border: 'none', color: '#fff', padding: '2px 4px', borderRadius: '4px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>min</span>

                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                  className="sp-item-title-input"
                />

                <input
                  type="text"
                  placeholder="Notes (AV/Tech)..."
                  value={item.notes}
                  onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                  className="sp-item-notes-input"
                />

                <button
                  type="button"
                  className="sp-item-remove-btn"
                  onClick={() => handleRemoveItem(item.id)}
                  title="Remove item"
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
            <span>👥 Team Roster</span>
          </div>

          <div className="sp-roster-list">
            {roster.map((r) => (
              <div key={r.id} className="sp-roster-item">
                <div>
                  <div className="sp-roster-role">{r.role}</div>
                  <input
                    type="text"
                    placeholder="Assign person..."
                    value={r.person}
                    onChange={(e) => handleRosterChange(r.id, 'person', e.target.value)}
                    className="sp-roster-person-input"
                    style={{ textAlign: 'left', marginTop: '2px' }}
                  />
                </div>

                <select
                  value={r.status}
                  onChange={(e) => handleRosterChange(r.id, 'status', e.target.value)}
                  className={`sp-status-badge sp-status-${r.status}`}
                  style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="accepted">Accepted</option>
                  <option value="pending">Pending</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
