import { useMemo, useState } from 'react';
import { noteIndex } from '../utils/chordTransposer';

// Comprehensive Dictionary for all 12 chromatic keys (Major & Minor) + Common Extensions
const GUITAR_SHAPES = {
  // C
  C: { muted: [0], open: [3, 5], fingers: [[1, 3], [2, 2], [4, 1]] },
  Cm: { muted: [0], open: [], fingers: [[1, 3], [2, 5], [3, 5], [4, 4], [5, 3]], base: 3 },
  C7: { muted: [0], open: [5], fingers: [[1, 3], [2, 2], [3, 3], [4, 1]] },
  Cmaj7: { muted: [0], open: [3, 5], fingers: [[1, 3], [2, 2]] },
  
  // C# / Db
  'C#': { muted: [0], open: [], fingers: [[1, 4], [2, 6], [3, 6], [4, 6], [5, 4]], base: 4 },
  'C#m': { muted: [0], open: [], fingers: [[1, 4], [2, 6], [3, 6], [4, 5], [5, 4]], base: 4 },
  Db: { muted: [0], open: [], fingers: [[1, 4], [2, 6], [3, 6], [4, 6], [5, 4]], base: 4 },
  Dbm: { muted: [0], open: [], fingers: [[1, 4], [2, 6], [3, 6], [4, 5], [5, 4]], base: 4 },

  // D
  D: { muted: [0, 1], open: [2], fingers: [[3, 2], [4, 3], [5, 2]] },
  Dm: { muted: [0, 1], open: [2], fingers: [[3, 2], [4, 3], [5, 1]] },
  D7: { muted: [0, 1], open: [2], fingers: [[3, 2], [4, 1], [5, 2]] },
  Dmaj7: { muted: [0, 1], open: [2], fingers: [[3, 2], [4, 2], [5, 2]] },
  Dsus4: { muted: [0, 1], open: [2], fingers: [[3, 2], [4, 3], [5, 3]] },

  // D# / Eb
  'D#': { muted: [0, 1], open: [], fingers: [[2, 1], [3, 3], [4, 4], [5, 3]] },
  'D#m': { muted: [0], open: [], fingers: [[1, 6], [2, 8], [3, 8], [4, 7], [5, 6]], base: 6 },
  Eb: { muted: [0, 1], open: [], fingers: [[2, 1], [3, 3], [4, 4], [5, 3]] },
  Ebm: { muted: [0], open: [], fingers: [[1, 6], [2, 8], [3, 8], [4, 7], [5, 6]], base: 6 },

  // E
  E: { muted: [], open: [0, 4, 5], fingers: [[1, 2], [2, 2], [3, 1]] },
  Em: { muted: [], open: [0, 3, 4, 5], fingers: [[1, 2], [2, 2]] },
  E7: { muted: [], open: [0, 2, 4, 5], fingers: [[1, 2], [3, 1]] },
  Esus4: { muted: [], open: [0, 4, 5], fingers: [[1, 2], [2, 2], [3, 2]] },

  // F
  F: { muted: [], open: [], fingers: [[0, 1], [1, 3], [2, 3], [3, 2], [4, 1], [5, 1]] },
  Fm: { muted: [], open: [], fingers: [[0, 1], [1, 3], [2, 3], [3, 1], [4, 1], [5, 1]] },
  F7: { muted: [], open: [], fingers: [[0, 1], [1, 3], [2, 1], [3, 2], [4, 1], [5, 1]] },
  Fmaj7: { muted: [0, 1], open: [4, 5], fingers: [[2, 3], [3, 2], [4, 1]] },

  // F# / Gb
  'F#': { muted: [], open: [], fingers: [[0, 2], [1, 4], [2, 4], [3, 3], [4, 2], [5, 2]], base: 2 },
  'F#m': { muted: [], open: [], fingers: [[0, 2], [1, 4], [2, 4], [3, 2], [4, 2], [5, 2]], base: 2 },
  Gb: { muted: [], open: [], fingers: [[0, 2], [1, 4], [2, 4], [3, 3], [4, 2], [5, 2]], base: 2 },
  Gbm: { muted: [], open: [], fingers: [[0, 2], [1, 4], [2, 4], [3, 2], [4, 2], [5, 2]], base: 2 },

  // G
  G: { muted: [], open: [2, 3, 4], fingers: [[0, 3], [1, 2], [5, 3]] },
  Gm: { muted: [], open: [], fingers: [[0, 3], [1, 5], [2, 5], [3, 3], [4, 3], [5, 3]], base: 3 },
  G7: { muted: [], open: [2, 3, 4], fingers: [[0, 3], [1, 2], [5, 1]] },
  Gsus4: { muted: [], open: [2, 3], fingers: [[0, 3], [1, 3], [4, 1], [5, 3]] },

  // G# / Ab
  'G#': { muted: [], open: [], fingers: [[0, 4], [1, 6], [2, 6], [3, 5], [4, 4], [5, 4]], base: 4 },
  'G#m': { muted: [], open: [], fingers: [[0, 4], [1, 6], [2, 6], [3, 4], [4, 4], [5, 4]], base: 4 },
  Ab: { muted: [], open: [], fingers: [[0, 4], [1, 6], [2, 6], [3, 5], [4, 4], [5, 4]], base: 4 },
  Abm: { muted: [], open: [], fingers: [[0, 4], [1, 6], [2, 6], [3, 4], [4, 4], [5, 4]], base: 4 },

  // A
  A: { muted: [0], open: [1, 5], fingers: [[2, 2], [3, 2], [4, 2]] },
  Am: { muted: [0], open: [1, 5], fingers: [[2, 2], [3, 2], [4, 1]] },
  A7: { muted: [0], open: [1, 3, 5], fingers: [[2, 2], [4, 2]] },
  Asus4: { muted: [0], open: [1, 5], fingers: [[2, 2], [3, 2], [4, 3]] },

  // A# / Bb
  'A#': { muted: [0], open: [], fingers: [[1, 1], [2, 3], [3, 3], [4, 3], [5, 1]] },
  'A#m': { muted: [0], open: [], fingers: [[1, 1], [2, 3], [3, 3], [4, 2], [5, 1]] },
  Bb: { muted: [0], open: [], fingers: [[1, 1], [2, 3], [3, 3], [4, 3], [5, 1]] },
  Bbm: { muted: [0], open: [], fingers: [[1, 1], [2, 3], [3, 3], [4, 2], [5, 1]] },

  // B
  B: { muted: [0], open: [], fingers: [[1, 2], [2, 4], [3, 4], [4, 4], [5, 2]], base: 2 },
  Bm: { muted: [0], open: [], fingers: [[1, 2], [2, 4], [3, 4], [4, 3], [5, 2]], base: 2 },
  B7: { muted: [0], open: [5], fingers: [[1, 2], [2, 1], [3, 2], [4, 0]] }
};

function getGuitarShape(chordStr) {
  if (!chordStr) return GUITAR_SHAPES.C;

  // 1. Strip slash part e.g. "C/E" -> "C", "D/F#" -> "D"
  const cleanChord = String(chordStr).split('/')[0].trim();

  // 2. Direct lookup if exact shape exists
  if (GUITAR_SHAPES[cleanChord]) {
    return GUITAR_SHAPES[cleanChord];
  }

  // 3. Parse Root & Accidental & Quality
  const match = cleanChord.match(/^([A-G])([#b]?)(.*)$/i);
  if (!match) return GUITAR_SHAPES.C;

  const rootStr = match[1].toUpperCase() + (match[2] || '');
  const quality = (match[3] || '').toLowerCase();
  const isMinor = quality.startsWith('m') && !quality.startsWith('maj');

  // Try Root + 'm' or Root
  const baseKey = `${rootStr}${isMinor ? 'm' : ''}`;
  if (GUITAR_SHAPES[baseKey]) {
    return GUITAR_SHAPES[baseKey];
  }

  // 4. Algorithmic Barre Transposition fallback from E-shape / A-shape
  const rootSemis = noteIndex(rootStr);
  if (rootSemis < 0) return GUITAR_SHAPES.C;

  // E-string based barre (root on E string = string 0)
  // E is at index 4
  let fretOffset = (rootSemis - 4 + 12) % 12;
  if (fretOffset === 0) fretOffset = 12;

  if (isMinor) {
    return {
      muted: [],
      open: [],
      fingers: [[0, fretOffset], [1, fretOffset + 2], [2, fretOffset + 2], [3, fretOffset], [4, fretOffset], [5, fretOffset]],
      base: fretOffset
    };
  }

  return {
    muted: [],
    open: [],
    fingers: [[0, fretOffset], [1, fretOffset + 2], [2, fretOffset + 2], [3, fretOffset + 1], [4, fretOffset], [5, fretOffset]],
    base: fretOffset
  };
}

function GuitarDiagram({ chord }) {
  const shape = useMemo(() => getGuitarShape(chord), [chord]);

  return (
    <div className="chord-guitar">
      <div className="chord-string-status">
        {[0, 1, 2, 3, 4, 5].map(string => (
          <span key={string}>{shape.muted.includes(string) ? '×' : (shape.open.includes(string) ? '○' : '')}</span>
        ))}
      </div>
      <div className="chord-fretboard">
        {shape.fingers.map(([string, fret], index) => (
          <span
            key={`${string}-${fret}-${index}`}
            className="chord-finger"
            style={{
              '--string': string,
              '--fret': shape.base ? fret - shape.base + 1 : fret,
            }}
          >
            {index + 1}
          </span>
        ))}
        {shape.base ? <small>{shape.base}fr</small> : null}
      </div>
      <div className="chord-string-labels">{['E', 'A', 'D', 'G', 'B', 'e'].map(label => <span key={label}>{label}</span>)}</div>
    </div>
  );
}

function PianoDiagram({ chord }) {
  const tones = useMemo(() => {
    if (!chord) return new Set([0, 4, 7]);

    const activeSet = new Set();
    const parts = String(chord).split('/');
    const mainChord = parts[0].trim();
    const bassNote = parts[1] ? parts[1].trim() : null;

    // Parse main chord root
    const rootMatch = mainChord.match(/^([A-G](?:#|b)?)/i);
    const rootIndex = noteIndex(rootMatch ? rootMatch[1] : 'C');
    if (rootIndex >= 0) {
      const qualityStr = mainChord.slice(rootMatch[0].length).toLowerCase();
      const isMinor = qualityStr.startsWith('m') && !qualityStr.startsWith('maj');
      const isDim = qualityStr.includes('dim') || qualityStr.includes('°');
      const isAug = qualityStr.includes('aug') || qualityStr.includes('+');
      const isSus4 = qualityStr.includes('sus4') || qualityStr.includes('sus');
      const isSus2 = qualityStr.includes('sus2');
      const is7 = qualityStr.includes('7');
      const isMaj7 = qualityStr.includes('maj7') || qualityStr.includes('m7');

      // Root
      activeSet.add(rootIndex);

      // Third / Sus
      if (isSus4) {
        activeSet.add((rootIndex + 5) % 12);
      } else if (isSus2) {
        activeSet.add((rootIndex + 2) % 12);
      } else if (isMinor || isDim) {
        activeSet.add((rootIndex + 3) % 12);
      } else {
        activeSet.add((rootIndex + 4) % 12);
      }

      // Fifth
      if (isDim) {
        activeSet.add((rootIndex + 6) % 12);
      } else if (isAug) {
        activeSet.add((rootIndex + 8) % 12);
      } else {
        activeSet.add((rootIndex + 7) % 12);
      }

      // Seventh
      if (isMaj7) {
        activeSet.add((rootIndex + 11) % 12);
      } else if (is7) {
        activeSet.add((rootIndex + 10) % 12);
      }
    }

    // Slash Bass Note e.g. D/F# -> F#
    if (bassNote) {
      const bassIndex = noteIndex(bassNote);
      if (bassIndex >= 0) {
        activeSet.add(bassIndex);
      }
    }

    return activeSet;
  }, [chord]);

  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return (
    <div className="chord-piano" aria-label={`${chord} piano notes`}>
      {notes.map((note, index) => {
        const isActive = tones.has(index);
        const isBlack = note.includes('#');
        return (
          <span
            key={note}
            className={`${isBlack ? 'black' : 'white'} ${isActive ? 'active' : ''}`}
          >
            {!isBlack ? note : (isActive ? '●' : '')}
          </span>
        );
      })}
    </div>
  );
}

export default function ChordDiagramPopover({ chord, position, onMouseEnter, onMouseLeave, onClose }) {
  const [instrument, setInstrumentState] = useState(() => {
    try {
      return localStorage.getItem('wp_chord_diagram_instrument') || 'guitar';
    } catch {
      return 'guitar';
    }
  });

  const handleSelectInstrument = (inst) => {
    setInstrumentState(inst);
    try {
      localStorage.setItem('wp_chord_diagram_instrument', inst);
    } catch {}
  };

  if (!chord || !position) return null;

  return (
    <aside
      className="chord-diagram-popover"
      style={{ left: position.left, top: position.top }}
      role="tooltip"
      aria-label={`${chord} chord diagram`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong>{chord}</strong>
          {onClose && (
            <button
              type="button"
              className="chord-popover-close-btn"
              onClick={onClose}
              aria-label="Close chord diagram"
            >
              ✕
            </button>
          )}
        </div>
        <div className="chord-instrument-tabs">
          <button type="button" className={instrument === 'guitar' ? 'active' : ''} onClick={() => handleSelectInstrument('guitar')}>Կիթառ</button>
          <button type="button" className={instrument === 'piano' ? 'active' : ''} onClick={() => handleSelectInstrument('piano')}>Դաշնամուր</button>
        </div>
      </header>
      {instrument === 'guitar' ? <GuitarDiagram chord={chord} /> : <PianoDiagram chord={chord} />}
    </aside>
  );
}
