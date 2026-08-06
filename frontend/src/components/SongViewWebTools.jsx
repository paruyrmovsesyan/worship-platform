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
  attachments,
  onOpenPrint,
  useFlats,
  onToggleFlats,
}) {
  return (
    <aside className="web-song-console" aria-label="Երգի կառավարման վահանակ">
      <div className="web-song-console__heading">
        <div>
          <span>SONG CONTROLS</span>
          <strong>Կատարման գործիքներ</strong>
        </div>
        <span className="web-song-console__status">Պատրաստ</span>
      </div>

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
          attachments.slice(0, 3).map(attachment => (
            <a key={attachment.id || attachment.url} href={attachment.url} target="_blank" rel="noreferrer">
              <ToolIcon><path d="M8 5v14l11-7Z" /></ToolIcon>
              <span>{attachment.title || 'Բացել նյութը'}</span>
            </a>
          ))
        ) : (
          <div className="web-media-empty">
            <ToolIcon><path d="M8 5v14l11-7Z" /></ToolIcon>
            <span>YouTube / Audio նյութ չկա</span>
          </div>
        )}
      </section>

      <button type="button" className="web-print-launch" onClick={onOpenPrint}>
        <ToolIcon><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></ToolIcon>
        <span>Print & PDF Studio</span>
      </button>
    </aside>
  );
}
