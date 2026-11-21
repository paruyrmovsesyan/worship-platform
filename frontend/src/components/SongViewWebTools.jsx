import { useFeatureFlags } from '../utils/featureFlags';
import { BetaBadge, ComingSoonBadge } from './BetaBadge';

const CHORD_COLORS = [
  { id: 'cyan', value: '#39d8ff', label: 'Cyan' },
  { id: 'purple', value: '#9a73ff', label: 'Purple' },
  { id: 'green', value: '#62d98b', label: 'Green' },
  { id: 'amber', value: '#f4b942', label: 'Amber' },
  { id: 'rose', value: '#ff7f9f', label: 'Rose' },
];

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
  hasChords = true,
}) {
  const { isEnabled, isBeta, isSoon, isVisible } = useFeatureFlags();

  return (
    <aside className="web-song-console" aria-label="Երգի կառավարման վահանակ">
      <div className="web-song-console__heading">
        <div>
          <span>SONG CONTROLS</span>
          <strong>Կատարման գործիքներ</strong>
        </div>
        <span className="web-song-console__status">{keepAwakeActive ? 'Կենդանի բեմ' : 'Պատրաստ'}</span>
      </div>

      {/* Stage Performance Quick Controls */}
      <section className="web-tool-section web-stage-section">
        <div className="web-tool-label">
          <span>Բեմական ռեժիմ</span>
          <span className="web-shortcut-hint">F · Space · [ ] · C</span>
        </div>
        <div className="web-stage-grid">
          <button
            type="button"
            className={`web-stage-btn ${isTwoColumn ? 'active' : ''}`}
            onClick={onToggleTwoColumn}
            title="Երկսյունակ դասավորություն մեծ էկրանների համար"
          >
            <ToolIcon><path d="M4 4h7v16H4zM13 4h7v16h-7z" /></ToolIcon>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {isTwoColumn ? '2 Սյունակ' : '1 Սյունակ'}
              {isBeta('stage_two_column') && <BetaBadge style={{ fontSize: '0.62rem', padding: '1px 5px' }} />}
            </span>
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

          {hasChords && (
            <button
              type="button"
              className={`web-stage-btn ${viewMode === 'lyrics' ? 'active' : ''}`}
              onClick={onToggleViewMode}
              title="Անջատել / միացնել ակորդների ցուցադրությունը (C)"
            >
              <ToolIcon><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></ToolIcon>
              <span>{viewMode === 'lyrics' ? 'Միայն բառեր' : 'Ակորդներ'}</span>
            </button>
          )}

          {isVisible('rehearsal_stems') && (
            <button
              type="button"
              className={`web-stage-btn ${stemsOpen ? 'active' : ''} ${isSoon('rehearsal_stems') ? 'disabled' : ''}`}
              onClick={isSoon('rehearsal_stems') ? () => alert('Stems միքսերը շուտով հասանելի կլինի ծրագրում։') : onToggleStems}
              title={isSoon('rehearsal_stems') ? 'Stems միքսերը շուտով հասանելի կլինի' : 'RehearsalMix & Stems Mixer'}
            >
              <ToolIcon><path d="M4 6h16M4 12h16M4 18h16" /></ToolIcon>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {stemsOpen ? 'Փակել Stems' : 'Stems'}
                {isBeta('rehearsal_stems') && <BetaBadge style={{ fontSize: '0.62rem', padding: '1px 5px' }} />}
                {isSoon('rehearsal_stems') && <ComingSoonBadge style={{ fontSize: '0.62rem', padding: '1px 5px' }} />}
              </span>
            </button>
          )}

          {isVisible('lyrics_projection') && (
            isSoon('lyrics_projection') ? (
              <button
                type="button"
                className="web-stage-btn disabled"
                onClick={() => alert('Պրոյեկցիայի ռեժիմը շուտով հասանելի կլինի ծրագրում։')}
                title="Պրոյեկցիայի ռեժիմը շուտով հասանելի կլինի"
              >
                <ToolIcon><path d="M2 3h20v14H2zM8 21h8M12 17v4" /></ToolIcon>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Projection
                  <ComingSoonBadge style={{ fontSize: '0.62rem', padding: '1px 5px' }} />
                </span>
              </button>
            ) : (
              <a
                href={`/projection/${songId}`}
                target="_blank"
                rel="noreferrer"
                className="web-stage-btn"
                title="Բացել պրոյեկտորի էկրանը առանձին պատուհանում"
                style={{ textDecoration: 'none' }}
              >
                <ToolIcon><path d="M2 3h20v14H2zM8 21h8M12 17v4" /></ToolIcon>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Projection
                  {isBeta('lyrics_projection') && <BetaBadge style={{ fontSize: '0.62rem', padding: '1px 5px' }} />}
                </span>
              </a>
            )
          )}
        </div>
      </section>

      {hasChords && (
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
      )}

      <section className="web-tool-section web-tool-grid">
        {hasChords && (
          <label>
            <span>Capo</span>
            <select value={capo} onChange={event => onCapoChange(Number(event.target.value))}>
              <option value="0">Առանց capo</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(value => <option key={value} value={value}>Capo {value}</option>)}
            </select>
          </label>
        )}
        <div className="web-font-control" style={!hasChords ? { gridColumn: '1 / -1' } : undefined}>
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

      {hasChords && (
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
      )}

      {isEnabled('worship_ai_studio') && (
        <button
          type="button"
          className="web-print-launch"
          onClick={onOpenAIStudio}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #9333ea)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <ToolIcon><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" /></ToolIcon>
          <span>Worship AI Studio</span>
          {isBeta('worship_ai_studio') && <BetaBadge style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} />}
        </button>
      )}

      <button type="button" className="web-print-launch" onClick={onOpenPrint}>
        <ToolIcon><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></ToolIcon>
        <span>Print & PDF Studio</span>
      </button>
    </aside>
  );
}
