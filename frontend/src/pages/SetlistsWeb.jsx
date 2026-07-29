import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import { getSongCoverStyle } from '../utils/songCover';
import './SetlistsWeb.css';

export default function SetlistsWeb() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [setlists, setSetlists] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // all, personal, team, shared
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name, items

  // Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetTeamId, setNewSetTeamId] = useState('');
  const [newSetDate, setNewSetDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);

  usePageReady(isLoading || authLoading);

  const fetchSetlists = async () => {
    try {
      const res = await fetch('/setlists_api.php?action=get_setlists');
      const data = await res.json();
      setSetlists(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t('setlists.errorLoad', 'Չհաջողվեց բեռնել երգացանկերը։'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/teams_api.php?action=get_teams');
      const data = await res.json();
      if (data.ok) {
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    fetchSetlists();
    fetchTeams();
  }, [user]);

  // Handle Document Click for Action Menus
  useEffect(() => {
    const handleDocClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  const handleCreateSetlist = async (e) => {
    e.preventDefault();
    if (!newSetName.trim() || isCreating) return;
    setIsCreating(true);

    try {
      const body = { name: newSetName.trim() };
      if (newSetTeamId) body.team_id = newSetTeamId;
      if (newSetDate) body.service_date = newSetDate;

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
        fetchSetlists();
        navigate(`/setlists/${data.id}`);
      } else if (data.error === 'limit_reached') {
        alert(data.message || t('setlists.limitReached', 'Սահմանափակումը լրացել է։'));
      } else {
        alert(data.error || t('setlists.createFailed', 'Չհաջողվեց ստեղծել երգացանկը'));
      }
    } catch (err) {
      alert(t('setlists.networkError', 'Ցանցային սխալ'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (e, listId) => {
    e.stopPropagation();
    setActiveMenuId(null);
    try {
      const res = await fetch('/setlists_api.php?action=duplicate_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: listId })
      });
      const data = await res.json();
      if (data.ok) {
        fetchSetlists();
      } else {
        alert(data.error || 'Duplicate failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e, listId) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!window.confirm(t('setlists.confirmDelete', 'Վստա՞հ եք, որ ցանկանում եք ջնջել այս երգացանկը:'))) return;

    try {
      const res = await fetch('/setlists_api.php?action=delete_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: listId })
      });
      const data = await res.json();
      if (data.ok) {
        setSetlists(prev => prev.filter(s => String(s.id) !== String(listId)));
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered & Sorted Setlists
  const filteredSetlists = useMemo(() => {
    return setlists
      .filter(s => {
        // Category Filter
        if (activeCategory === 'personal' && s.access_role === 'team') return false;
        if (activeCategory === 'team' && s.access_role !== 'team') return false;
        if (activeCategory === 'shared' && s.access_role !== 'shared') return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
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
  }, [setlists, activeCategory, searchQuery, sortBy]);

  // Statistics
  const totalSongsInSets = useMemo(() => {
    return setlists.reduce((acc, s) => acc + Number(s.items_count || 0), 0);
  }, [setlists]);

  const teamSetsCount = useMemo(() => {
    return setlists.filter(s => s.access_role === 'team').length;
  }, [setlists]);

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
              <span className="stat-value">{setlists.length}</span>
              <span className="stat-label">{t('setlists.statTotalSets', 'Երգացանկեր')}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <span className="stat-value">{totalSongsInSets}</span>
              <span className="stat-label">{t('setlists.statTotalSongs', 'Ընդհանուր երգեր')}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <span className="stat-value">{teamSetsCount}</span>
              <span className="stat-label">{t('setlists.statTeamSets', 'Թիմային')}</span>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="setlists-toolbar">
          {/* Category Tabs */}
          <div className="category-tabs">
            {[
              { id: 'all', label: t('setlists.tabAll', 'Բոլորը'), count: setlists.length },
              { id: 'personal', label: t('setlists.tabPersonal', 'Անձնական'), count: setlists.filter(s => s.access_role !== 'team' && s.access_role !== 'shared').length },
              { id: 'team', label: t('setlists.tabTeam', 'Թիմային'), count: teamSetsCount },
              { id: 'shared', label: t('setlists.tabShared', 'Կիսված'), count: setlists.filter(s => s.access_role === 'shared').length }
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
            {filteredSetlists.map((list, idx) => (
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

                  {/* Actions Dropdown */}
                  <button
                    className="menu-trigger-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === list.id ? null : list.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <circle cx="12" cy="5" r="2"></circle>
                      <circle cx="12" cy="12" r="2"></circle>
                      <circle cx="12" cy="19" r="2"></circle>
                    </svg>
                  </button>

                  {activeMenuId === list.id && (
                    <div className="card-dropdown-menu" onClick={e => e.stopPropagation()}>
                      <button onClick={(e) => handleDuplicate(e, list.id)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>{t('setlists.duplicate', 'Կրկնօրինակել')}</span>
                      </button>
                      <button className="danger" onClick={(e) => handleDelete(e, list.id)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>{t('setlists.delete', 'Ջնջել')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="web-sl-body">
                  <h3 className="web-sl-title">{list.name}</h3>
                  <div className="web-sl-info-row">
                    <span className="sl-date-chip">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      {list.service_date || t('setlists.noDate', 'Առանց ամսաթվի')}
                    </span>
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
            ))}
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

            {filteredSetlists.map((list, idx) => (
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
                  <span className="row-title">{list.name}</span>
                </div>
                <div className="lh-col date">
                  <span className="text-secondary">{list.service_date || '—'}</span>
                </div>
                <div className="lh-col songs">
                  <span className="badge-chip">{list.items_count || 0} երգ</span>
                </div>
                <div className="lh-col team">
                  {list.access_role === 'team' ? (
                    <span className="role-tag team small">{list.team_name || 'Team'}</span>
                  ) : list.access_role === 'shared' ? (
                    <span className="role-tag shared small">Կիսված</span>
                  ) : (
                    <span className="role-tag personal small">Անձնական</span>
                  )}
                </div>
                <div className="lh-col actions" onClick={e => e.stopPropagation()}>
                  <button className="row-act-btn" onClick={(e) => handleDuplicate(e, list.id)} title="Duplicate">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  <button className="row-act-btn danger" onClick={(e) => handleDelete(e, list.id)} title="Delete">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
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
              </div>

              <div className="web-form-row">
                <div className="web-form-group flex-1">
                  <label>{t('setlists.dateField', 'Ծառայության ամսաթիվ')}</label>
                  <input
                    type="date"
                    className="web-inp"
                    value={newSetDate}
                    onChange={e => setNewSetDate(e.target.value)}
                  />
                </div>

                <div className="web-form-group flex-1">
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
    </div>
  );
}
