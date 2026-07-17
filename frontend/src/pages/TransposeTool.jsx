import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { renderWithChords, transposeChordText, transposeRoot } from '../utils/chordTransposer';
import './TransposeTool.css';

const DRAFT_KEY = 'transpose_tool_draft_v1';
const CHORD_ROOT_REGEX = /(^|[\s([])([A-G](?:#|b)?)(?=(?:maj|min|m|dim|aug|sus|add|no|[0-9/(\s)\],:;]|$))/;

function readDraft() {
  try {
    return localStorage.getItem(DRAFT_KEY) || '';
  } catch {
    return '';
  }
}

export default function TransposeTool() {
  const { t } = useLanguage();
  const [input, setInput] = useState(readDraft);
  const [semitones, setSemitones] = useState(0);
  const [useFlats, setUseFlats] = useState(false);
  const [copyState, setCopyState] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, input);
    } catch {}
  }, [input]);

  const output = useMemo(
    () => transposeChordText(input, semitones, useFlats),
    [input, semitones, useFlats]
  );
  const renderedOutput = useMemo(
    () => renderWithChords(input, semitones, useFlats),
    [input, semitones, useFlats]
  );
  const detectedRoot = useMemo(() => input.match(CHORD_ROOT_REGEX)?.[2] || '', [input]);
  const targetRoot = detectedRoot ? transposeRoot(detectedRoot, semitones, useFlats) : '';

  const changeSemitones = (delta) => {
    setSemitones(current => Math.max(-12, Math.min(12, current + delta)));
    setCopyState('');
  };

  const copyOutput = async () => {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    window.setTimeout(() => setCopyState(''), 1800);
  };

  const clearAll = () => {
    setInput('');
    setSemitones(0);
    setCopyState('');
  };

  return (
    <div className="transpose-page">
      <header className="transpose-header">
        <div>
          <span className="transpose-kicker">{t('transposer.kicker')}</span>
          <h1>{t('transposer.title')}</h1>
          <p>{t('transposer.description')}</p>
        </div>
        <button type="button" className="transpose-clear" onClick={clearAll} disabled={!input && semitones === 0}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" />
          </svg>
          {t('transposer.clear')}
        </button>
      </header>

      <section className="transpose-controls" aria-label={t('transposer.controls')}>
        <div className="transpose-control-group">
          <span className="transpose-control-label">{t('transposer.shift')}</span>
          <div className="transpose-stepper">
            <button type="button" onClick={() => changeSemitones(-1)} disabled={semitones <= -12} aria-label={t('transposer.down')} title={t('transposer.down')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14" /></svg>
            </button>
            <button type="button" className="transpose-step-value" onClick={() => setSemitones(0)} title={t('transposer.resetShift')}>
              <strong>{semitones > 0 ? `+${semitones}` : semitones}</strong>
              <small>{t('transposer.semitones')}</small>
            </button>
            <button type="button" onClick={() => changeSemitones(1)} disabled={semitones >= 12} aria-label={t('transposer.up')} title={t('transposer.up')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        <div className="transpose-control-group">
          <span className="transpose-control-label">{t('transposer.notation')}</span>
          <div className="transpose-notation" role="group" aria-label={t('transposer.notation')}>
            <button type="button" className={!useFlats ? 'active' : ''} onClick={() => setUseFlats(false)}>♯ {t('transposer.sharps')}</button>
            <button type="button" className={useFlats ? 'active' : ''} onClick={() => setUseFlats(true)}>♭ {t('transposer.flats')}</button>
          </div>
        </div>

        <div className="transpose-key-preview" aria-live="polite">
          <span>{t('transposer.detectedKey')}</span>
          <strong>{detectedRoot ? `${detectedRoot} → ${targetRoot}` : '—'}</strong>
        </div>
      </section>

      <div className="transpose-workspace">
        <section className="transpose-panel">
          <div className="transpose-panel-header">
            <div>
              <span>{t('transposer.inputLabel')}</span>
              <small>{t('transposer.inputHint')}</small>
            </div>
            <span className="transpose-char-count">{input.length}</span>
          </div>
          <textarea
            className="transpose-input"
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder={t('transposer.placeholder')}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </section>

        <section className="transpose-panel transpose-result-panel">
          <div className="transpose-panel-header">
            <div>
              <span>{t('transposer.resultLabel')}</span>
              <small>{semitones === 0 ? t('transposer.originalKey') : `${semitones > 0 ? '+' : ''}${semitones} ${t('transposer.semitones')}`}</small>
            </div>
            <button type="button" className="transpose-copy" onClick={copyOutput} disabled={!output.trim()}>
              {copyState === 'copied' ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              )}
              {copyState === 'copied' ? t('transposer.copied') : t('transposer.copy')}
            </button>
          </div>

          {output ? (
            <div className="transpose-output" dangerouslySetInnerHTML={{ __html: renderedOutput }} />
          ) : (
            <div className="transpose-empty">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 7h16M7 4l-3 3 3 3M20 17H4m13-3 3 3-3 3" /></svg>
              <p>{t('transposer.empty')}</p>
            </div>
          )}
          {copyState === 'error' && <p className="transpose-copy-error">{t('transposer.copyError')}</p>}
        </section>
      </div>
    </div>
  );
}
