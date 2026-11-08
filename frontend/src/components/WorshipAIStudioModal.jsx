import { useState } from 'react';
import { useFeatureFlags } from '../utils/featureFlags';
import { BetaBadge } from './BetaBadge';
import './WorshipAIStudioModal.css';

export default function WorshipAIStudioModal({
  isOpen,
  onClose,
  songTitle = '',
  songKey = 'C',
  lyrics = '',
  chords = '',
  onApplyResult,
  inline = false,
}) {
  const { isBeta } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState('chords'); // 'chords' | 'stylize' | 'translate'
  const [targetKey, setTargetKey] = useState(songKey || 'C');
  const [stylizeMode, setStylizeMode] = useState('enhance'); // 'enhance' | 'simplify'
  const [customSourceText, setCustomSourceText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultText, setResultText] = useState('');
  const [modeNote, setModeNote] = useState('');
  const [copied, setCopied] = useState(false);

  const defaultSource = activeTab === 'stylize'
    ? (chords || lyrics || '')
    : (lyrics || chords || '');
  const sourceText = customSourceText !== null ? customSourceText : defaultSource;
  const setSourceText = (val) => setCustomSourceText(val);

  if (!inline && !isOpen) return null;

  const handleGenerateChords = async () => {
    setLoading(true);
    setError('');
    setResultText('');
    setModeNote('');
    try {
      const res = await fetch('/api_lyrics_assistant.php?action=generate_chords_for_lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: songTitle,
          lyrics: sourceText || lyrics || chords,
          key: targetKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Չհաջողվեց գեներացնել ակորդները');
      setResultText(data.data?.chords_sheet || '');
      if (data.data?.mode === 'music_theory_engine') {
        setModeNote('Երաժշտական տեսության ներկառուցված շարժիչ (Diatonic Worship Harmony)');
      } else {
        setModeNote('AI Neural Studio');
      }
    } catch (err) {
      setError(err.message || 'Տեղի ունեցավ սխալ');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    setLoading(true);
    setError('');
    setResultText('');
    setModeNote('');
    try {
      const res = await fetch('/api_lyrics_assistant.php?action=worship_poetic_translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: sourceText || lyrics || chords,
          target_lang: 'hy',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Չհաջողվեց մշակել տեքստը');
      setResultText(data.data?.translated_lyrics || '');
      if (data.data?.note) setModeNote(data.data.note);
    } catch (err) {
      setError(err.message || 'Տեղի ունեցավ սխալ');
    } finally {
      setLoading(false);
    }
  };

  const handleStylizeChords = async () => {
    setLoading(true);
    setError('');
    setResultText('');
    setModeNote('');
    try {
      const res = await fetch('/api_lyrics_assistant.php?action=chord_stylizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chords: sourceText || chords || lyrics,
          style: stylizeMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Չհաջողվեց ձևափոխել ակորդները');
      setResultText(data.data?.stylized_chords || '');
      setModeNote(
        stylizeMode === 'enhance'
          ? 'Ժամանակակից Worship Հարմոնիա (sus4, add9, maj7, m7)'
          : 'Պարզեցված ակորդներ սկսնակների համար'
      );
    } catch (err) {
      setError(err.message || 'Տեղի ունեցավ սխալ');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard?.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const content = (
    <div className={inline ? 'ai-studio-inline-card' : 'ai-studio-modal'} onClick={(e) => e.stopPropagation()}>
      <div className="ai-studio-header">
        <div className="ai-studio-title-wrap">
          <div className="ai-studio-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Worship AI Studio
              {isBeta('worship_ai_studio') && <BetaBadge label="BETA" />}
            </span>
          </div>
          {songTitle && <span className="ai-studio-subtitle">Ակտիվ երգ՝ {songTitle}</span>}
        </div>
        {!inline && onClose && (
          <button type="button" className="ai-studio-close-btn" onClick={onClose} aria-label="Փակել">
            ✕
          </button>
        )}
      </div>

      <div className="ai-studio-tabs">
        <button
          type="button"
          className={`ai-studio-tab-btn ${activeTab === 'chords' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('chords');
            setSourceText(lyrics || chords || '');
            setResultText('');
            setError('');
          }}
        >
          Ակորդների Գեներացում
        </button>
        <button
          type="button"
          className={`ai-studio-tab-btn ${activeTab === 'stylize' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('stylize');
            setSourceText(chords || lyrics || '');
            setResultText('');
            setError('');
          }}
        >
          Modern Voicing & Պարզեցում
        </button>
        <button
          type="button"
          className={`ai-studio-tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('translate');
            setSourceText(lyrics || chords || '');
            setResultText('');
            setError('');
          }}
        >
          Պոետիկ Թարգմանություն
        </button>
      </div>

      <div className="ai-studio-body">
        {error && (
          <div className="ai-studio-error">
            {error}
          </div>
        )}

        {activeTab === 'chords' && (
          <div className="ai-studio-panel">
            <p className="ai-studio-desc">
              Վերլուծում է երգի տեքստն ու բաժինները ([Տուն], [Կրկներգ], [Կամուրջ]) և ավտոմատ կառուցում է պաշտամունքային ակորդային հարմոնիա ընտրված տոնայնությամբ։
            </p>
            <div className="ai-studio-controls-row">
              <label className="ai-studio-field-label">Ընտրել տոնայնությունը (Key)՝</label>
              <div className="ai-studio-key-pills">
                {['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb', 'Am', 'Em', 'Dm', 'Bm'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`ai-key-pill ${targetKey === k ? 'active' : ''}`}
                    onClick={() => setTargetKey(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="ai-studio-action-btn"
              disabled={loading}
              onClick={handleGenerateChords}
            >
              {loading ? 'Գեներացվում են ակորդները...' : `Ստեղծել Ակորդներ (${targetKey} տոնայնությամբ)`}
            </button>
          </div>
        )}

        {activeTab === 'stylize' && (
          <div className="ai-studio-panel">
            <p className="ai-studio-desc">
              Փոխակերպեք երգի ակորդները ժամանակակից Worship հնչողության (add9, sus4, maj7, m7) կամ պարզեցրեք սկսնակ երաժիշտների համար։
            </p>
            <div className="ai-studio-mode-cards">
              <button
                type="button"
                className={`ai-mode-card ${stylizeMode === 'enhance' ? 'active' : ''}`}
                onClick={() => setStylizeMode('enhance')}
              >
                <span className="ai-mode-card-title">Modern Worship Voicing</span>
                <span className="ai-mode-card-sub">Հարստացնել add9, sus4, maj7, m7 ակորդներով</span>
              </button>
              <button
                type="button"
                className={`ai-mode-card ${stylizeMode === 'simplify' ? 'active' : ''}`}
                onClick={() => setStylizeMode('simplify')}
              >
                <span className="ai-mode-card-title">Սկսնակների Պարզ Ակորդներ</span>
                <span className="ai-mode-card-sub">Հեռացնել բարդ կոտորակային (slash) և sus/7 ակորդները</span>
              </button>
            </div>
            <button
              type="button"
              className="ai-studio-action-btn"
              disabled={loading}
              onClick={handleStylizeChords}
            >
              {loading ? 'Մշակվում են ակորդները...' : 'Կիրառել Ակորդների Ձևափոխումը'}
            </button>
          </div>
        )}

        {activeTab === 'translate' && (
          <div className="ai-studio-panel">
            <p className="ai-studio-desc">
              Օտարալեզու պաշտամունքի երգերի պոետիկ հայերեն թարգմանություն և տեքստի բաժանում կանոնավոր տների ու կրկներգերի։
            </p>
            <button
              type="button"
              className="ai-studio-action-btn"
              disabled={loading}
              onClick={handleTranslate}
            >
              {loading ? 'Թարգմանվում և կառուցվածքավորվում է...' : 'Թարգմանել և Կառուցվածքավորել Հայերեն'}
            </button>
          </div>
        )}

        <div className="ai-studio-source-section">
          <label className="ai-studio-field-label">
            Ելակետային տեքստ / ակորդներ (կարող եք խմբագրել կամ տեղադրել ցանկացած տեքստ)՝
          </label>
          <textarea
            className="ai-studio-source-textarea"
            rows={inline ? 7 : 5}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Տեղադրեք երգի բառերը կամ ակորդներով տեքստը այստեղ..."
          />
        </div>

        {resultText && (
          <div className="ai-studio-result-wrap">
            <div className="ai-studio-result-header">
              <div>
                <span className="ai-studio-result-badge">Արդյունքը պատրաստ է</span>
                {modeNote && <span className="ai-studio-mode-note">{modeNote}</span>}
              </div>
              <div className="ai-studio-result-actions">
                <button
                  type="button"
                  className="ai-studio-copy-btn"
                  onClick={handleCopy}
                >
                  {copied ? '✓ Պատճենվեց' : 'Պատճենել'}
                </button>
                {onApplyResult && (
                  <button
                    type="button"
                    className="ai-studio-apply-btn"
                    onClick={() => {
                      onApplyResult(resultText, activeTab);
                      if (onClose) onClose();
                    }}
                  >
                    ✓ Կիրառել
                  </button>
                )}
              </div>
            </div>
            <pre className="ai-studio-result-box">{resultText}</pre>
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="ai-studio-overlay" onClick={onClose}>
      {content}
    </div>
  );
}
