import React, { useState, useEffect } from 'react';
import { getOfflineStorageStats, triggerManualOfflineSync } from '../utils/webPwaEnhancements';
import './OfflineStorageManager.css';

export default function OfflineStorageManager() {
  const [stats, setStats] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadStats = async () => {
    try {
      const data = await getOfflineStorageStats();
      setStats(data);
    } catch (_) {}
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setProgress(5);
    setProgressText('Կապվում է սերվերի հետ...');
    setFeedback(null);

    const res = await triggerManualOfflineSync((percent, text) => {
      setProgress(percent);
      setProgressText(text);
    });

    setIsSyncing(false);
    if (res.ok) {
      setFeedback({ type: 'success', text: `Հաջողությամբ պահպանվեց ${res.count} երգ օֆֆլայն աշխատանքի համար։` });
      loadStats();
    } else {
      setFeedback({ type: 'error', text: res.error || 'Սինքրոնացման սխալ' });
    }

    setTimeout(() => {
      setProgress(0);
      setProgressText('');
    }, 4000);
  };

  const handleClearCache = async () => {
    if (!window.confirm('Մաքրե՞լ օֆֆլայն պահոցը և թարմացնել տվյալները։')) return;
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        for (const name of names) {
          if (name.includes('data') || name.includes('runtime')) {
            await caches.delete(name);
          }
        }
        localStorage.removeItem('wp_last_sync_at');
        await loadStats();
        setFeedback({ type: 'success', text: 'Օֆֆլայն պահոցը մաքրվեց։' });
        setTimeout(() => setFeedback(null), 3000);
      } catch (e) {
        setFeedback({ type: 'error', text: 'Չհաջողվեց մաքրել քեշը։' });
      }
    }
  };

  const formatDate = (iso) => {
    if (!iso) return 'Դեռ սինքրոնացված չէ';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('hy-AM', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return iso;
    }
  };

  return (
    <div className="offline-storage-manager">
      <div className="osm-header">
        <div className="osm-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="osm-title-area">
          <h3>Օֆֆլայն Գրադարանի Կառավարում</h3>
          <p>Պահպանեք երգերն ու սեթլիստները սարքում՝ առանց ինտերնետ կապի անխափան աշխատելու համար։</p>
        </div>
      </div>

      <div className="osm-metrics">
        <div className="osm-metric-card">
          <span className="osm-metric-label">Պահպանված երգեր</span>
          <strong className="osm-metric-value">{stats?.songsCount || 0} երգ</strong>
        </div>
        <div className="osm-metric-card">
          <span className="osm-metric-label">Զբաղեցրած տեղ</span>
          <strong className="osm-metric-value">{stats?.quotaUsedMB || '0.0'} MB</strong>
        </div>
        <div className="osm-metric-card">
          <span className="osm-metric-label">Վերջին թարմացում</span>
          <strong className="osm-metric-value osm-date">{formatDate(stats?.lastSyncedAt)}</strong>
        </div>
      </div>

      {isSyncing && (
        <div className="osm-progress-box">
          <div className="osm-progress-bar">
            <div className="osm-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="osm-progress-info">
            <span>{progressText}</span>
            <strong>{progress}%</strong>
          </div>
        </div>
      )}

      {feedback && (
        <div className={`osm-alert osm-alert-${feedback.type}`}>
          {feedback.text}
        </div>
      )}

      <div className="osm-actions">
        <button
          type="button"
          className="osm-btn osm-btn-primary"
          onClick={handleSyncAll}
          disabled={isSyncing}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
          <span>{isSyncing ? 'Սինքրոնացվում է...' : 'Ներբեռնել բոլոր երգերը օֆֆլայնի համար'}</span>
        </button>

        <button
          type="button"
          className="osm-btn osm-btn-ghost"
          onClick={handleClearCache}
          disabled={isSyncing}
          title="Մաքրել օֆֆլայն քեշը"
        >
          <span>Մաքրել քեշը</span>
        </button>
      </div>
    </div>
  );
}
