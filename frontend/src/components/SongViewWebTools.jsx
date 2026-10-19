import { API_BASE_URL } from '../utils/nativeConfig';

const CHORD_COLORS = [
  { id: 'cyan', value: '#39d8ff', label: 'Cyan' },
  { id: 'purple', value: '#9a73ff', label: 'Purple' },
  { id: 'green', value: '#62d98b', label: 'Green' },
  { id: 'amber', value: '#f4b942', label: 'Amber' },
  { id: 'rose', value: '#ff7f9f', label: 'Rose' },
];

function resolveMediaUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^(https?:|\/\/|blob:|data:)/i.test(trimmed)) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

function isAudioAttachment(att) {
  if (!att) return false;
  const type = String(att.type || '').toLowerCase();
  if (type === 'audio') return true;
  const url = String(att.url || '').toLowerCase();
  const clean = url.split('?')[0].split('#')[0];
  return clean.endsWith('.mp3') || clean.endsWith('.m4a') || clean.endsWith('.wav') || clean.endsWith('.ogg') || clean.endsWith('.aac') || clean.endsWith('.flac');
}

function ToolIcon({ children }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

export default function SongViewWebTools({
  keys,
  activeKey,
  onKeyClick,
  capo,
  onCapoChange,
  fontSize,
  onDecreaseFont,
  onIncreaseFont,
  autoScrollActive,
  autoScrollSpeed,
  onToggleAutoScroll,
  onAutoScrollSpeedChange,
  chordColor,
  onChordColorChange,
  attachments,
  onOpenPrint,
  useFlats,
  onToggleFlats,
  isTwoColumn,
  onToggleTwoColumn,
  keepAwakeActive,
  onToggleKeepAwake,
  isStageFullscreen,
  onToggleStageFullscreen,
  viewMode,
  onToggleViewMode,
  onOpenAIStudio,
  onToggleStems,
  stemsOpen,
  songId,
}) {
  return (
    <aside className="web-song-console" aria-label="Երգի կառավարման վահանակ">
      <div className="web-song-console__heading">
        <div>
          <span>SONG CONTROLS</span>
          <strong>Կատարման գործիքներ</strong>
        </div>
        <span className="web-song-console__status">{keepAwakeActive ? '💡 Կենդանի բեմ' : 'Պատրաստ'}</span>
      </div>

      {/* Stage Performance Quick Controls */}
      <section className="web-tool-section web-stage-section">
        <div className="web-tool-label">
          <span>Բեմական ռեժիմ</span>
          <span className="web-shortcut-hint">Hotkeys: F, Space, [ ], C</span>
        </div>
        <div className="web-stage-grid">
          <button
            type="button"
            className={`web-stage-btn ${isTwoColumn ? 'active' : ''}`}
            onClick={onToggleTwoColumn}
            title="Երկսյունակ դասավորություն մեծ էկրանների համար"
          >
            <ToolIcon><path d="M4 4h7v16H4zM13 4h7v16h-7z" /></ToolIcon>
            <span>{isTwoColumn ? '2 Սյունակ' : '1 Սյունակ'}</span>
          </button>

          <button
            type="button"
            className={`web-stage-btn ${keepAwakeActive ? 'active' : ''}`}
            onClick={onToggleKeepAwake}
            title="Էկրանը պահել ակտիվ (չմարել կատարման ժամանակ)"
          >
            <ToolIcon><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></ToolIcon>
            <span>{keepAwakeActive ? 'Չմարել' : 'Էկրանը մարել'}</span>
          </button>

          <button
            type="button"
            className={`web-stage-btn ${isStageFullscreen ? 'active' : ''}`}
            onClick={onToggleStageFullscreen}
            title="Ամբողջ էկրանով բեմական ռեժիմ (F)"
          >
            <ToolIcon><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></ToolIcon>
            <span>{isStageFullscreen ? 'Ելք' : 'Fullscreen'}</span>
          </button>

          <button
            type="button"
            className={`web-stage-btn ${viewMode === 'lyrics' ? 'active' : ''}`}
            onClick={onToggleViewMode}
            title="Անջատել / միացնել ակորդների ցուցադրությունը (C)"
          >
            <ToolIcon><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></ToolIcon>
            <span>{viewMode === 'lyrics' ? 'Միայն բառեր' : 'Ակորդներ'}</span>
          </button>

          <button
            type="button"
            className={`web-stage-btn ${stemsOpen ? 'active' : ''}`}
            onClick={onToggleStems}
            title="RehearsalMix & Stems Mixer"
          >
            <ToolIcon><path d="M4 6h16M4 12h16M4 18h16" /></ToolIcon>
            <span>{stemsOpen ? 'Փակել Stems' : '🎛️ Stems'}</span>
          </button>

          <a
            href={`/projection/${songId}`}
            target="_blank"
            rel="noreferrer"
            className="web-stage-btn"
            title="Բացել պրոյեկտորի էկրանը առանձին պատուհանում"
            style={{ textDecoration: 'none' }}
          >
            <ToolIcon><path d="M2 3h20v14H2zM8 21h8M12 17v4" /></ToolIcon>
            <span>📽️ Projection</span>
          </a>
        </div>
      </section>

      <section className="web-tool-section">
        <div className="web-tool-label">
          <span>Տոնայնություն</span>
          <button type="button" className={useFlats ? 'active' : ''} onClick={onToggleFlats}>{useFlats ? '♭ Flats' : '♯ Sharps'}</button>
        </div>
        <div className="web-key-grid">
          {keys.map(key => (
            <button type="button" key={key} className={activeKey === key ? 'active' : ''} onClick={() => onKeyClick(key)}>{key}</button>
          ))}
        </div>
      </section>

      <section className="web-tool-section web-tool-grid">
        <label>
          <span>Capo</span>
          <select value={capo} onChange={event => onCapoChange(Number(event.target.value))}>
            <option value="0">Առանց capo</option>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(value => <option key={value} value={value}>Capo {value}</option>)}
          </select>
        </label>
        <div className="web-font-control">
          <span>Տառաչափ</span>
          <div>
            <button type="button" onClick={onDecreaseFont}>A−</button>
            <output>{fontSize}</output>
            <button type="button" onClick={onIncreaseFont}>A+</button>
          </div>
        </div>
      </section>

      <section className="web-tool-section">
        <div className="web-tool-label">
          <span>Auto-scroll</span>
          <output>{autoScrollSpeed.toFixed(1)}×</output>
        </div>
        <div className="web-auto-scroll">
          <button type="button" className={autoScrollActive ? 'active' : ''} onClick={onToggleAutoScroll} aria-label={autoScrollActive ? 'Դադարեցնել ավտոմատ սահքը' : 'Սկսել ավտոմատ սահքը'}>
            {autoScrollActive ? (
              <ToolIcon><path d="M8 5v14M16 5v14" /></ToolIcon>
            ) : (
              <ToolIcon><path d="m8 5 11 7-11 7V5Z" /></ToolIcon>
            )}
          </button>
          <input type="range" min="0.5" max="3" step="0.1" value={autoScrollSpeed} onChange={event => onAutoScrollSpeedChange(Number(event.target.value))} />
        </div>
      </section>

      <section className="web-tool-section">
        <div className="web-tool-label"><span>Ակորդների գույն</span></div>
        <div className="web-chord-swatches">
          {CHORD_COLORS.map(color => (
            <button
              type="button"
              key={color.id}
              className={chordColor === color.value ? 'active' : ''}
              style={{ '--swatch': color.value }}
              onClick={() => onChordColorChange(color.value)}
              aria-label={color.label}
              title={color.label}
            />
          ))}
        </div>
      </section>

      <section className="web-tool-section web-media-card">
        <span>Մեդիա և նյութեր</span>
        {attachments?.length ? (
          attachments.slice(0, 5).map(attachment => {
            const resolvedUrl = resolveMediaUrl(attachment.url);
            const isAudio = isAudioAttachment(attachment);
            return (
              <div key={attachment.id || attachment.url} style={{ marginBottom: '8px' }}>
                <a href={resolvedUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ToolIcon><path d="M8 5v14l11-7Z" /></ToolIcon>
                  <span>{attachment.title || 'Բացել նյութը'}</span>
                </a>
                {isAudio && (
                  <audio
                    controls
                    playsInline
                    src={resolvedUrl}
                    preload="metadata"
                    style={{ width: '100%', height: '32px', marginTop: '6px' }}
                  >
                    Ձեր դիտարկիչը չի աջակցում աուդիո նվագարկիչը:
                  </audio>
                )}
              </div>
            );
          })
        ) : (
          <div className="web-media-empty">
            <ToolIcon><path d="M8 5v14l11-7Z" /></ToolIcon>
            <span>YouTube / Audio նյութ չկա</span>
          </div>
        )}
      </section>

      <button
        type="button"
        className="web-print-launch"
        onClick={onOpenAIStudio}
        style={{
          background: 'linear-gradient(135deg, #6366f1, #9333ea)',
          marginBottom: '10px',
        }}
      >
        <ToolIcon><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" /></ToolIcon>
        <span>Worship AI Studio</span>
      </button>

      <button type="button" className="web-print-launch" onClick={onOpenPrint}>
        <ToolIcon><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></ToolIcon>
        <span>Print & PDF Studio</span>
      </button>
    </aside>
  );
}
