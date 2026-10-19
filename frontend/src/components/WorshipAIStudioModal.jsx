import React, { useState } from 'react';
import './WorshipAIStudioModal.css';

export default function WorshipAIStudioModal({
  isOpen,
  onClose,
  songTitle = '',
  lyrics = '',
  chords = '',
  onApplyResult,
}) {
  const [activeTab, setActiveTab] = useState('chords'); // 'chords' | 'translate' | 'stylize'
  const [targetKey, setTargetKey] = useState('C');
  const [stylizeMode, setStylizeMode] = useState('enhance'); // 'enhance' | 'simplify'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultText, setResultText] = useState('');

  if (!isOpen) return null;

  const handleGenerateChords = async () => {
    setLoading(true);
    setError('');
    setResultText('');
    try {
      const res = await fetch('/api_lyrics_assistant.php?action=generate_chords_for_lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: songTitle,
          lyrics: lyrics || chords,
          key: targetKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to generate chords');
      setResultText(data.data?.chords_sheet || '');
    } catch (err) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    setLoading(true);
    setError('');
    setResultText('');
    try {
      const res = await fetch('/api_lyrics_assistant.php?action=worship_poetic_translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: lyrics || chords,
          target_lang: 'hy',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to translate');
      setResultText(data.data?.translated_lyrics || '');
    } catch (err) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStylizeChords = async () => {
    setLoading(true);
    setError('');
    setResultText('');
    try {
      const res = await fetch('/api_lyrics_assistant.php?action=chord_stylizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chords: chords || lyrics,
          style: stylizeMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to stylize chords');
      setResultText(data.data?.stylized_chords || '');
    } catch (err) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-studio-overlay" onClick={onClose}>
      <div className="ai-studio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-studio-header">
          <div className="ai-studio-title">
            <span>✨ Worship AI Studio</span>
          </div>
          <button type="button" className="ai-studio-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ai-studio-tabs">
          <button
            type="button"
            className={`ai-studio-tab-btn ${activeTab === 'chords' ? 'active' : ''}`}
            onClick={() => { setActiveTab('chords'); setResultText(''); setError(''); }}
          >
            🎸 Generate Chords
          </button>
          <button
            type="button"
            className={`ai-studio-tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
            onClick={() => { setActiveTab('translate'); setResultText(''); setError(''); }}
          >
            ✍️ Poetic Armenian Translate
          </button>
          <button
            type="button"
            className={`ai-studio-tab-btn ${activeTab === 'stylize' ? 'active' : ''}`}
            onClick={() => { setActiveTab('stylize'); setResultText(''); setError(''); }}
          >
            🎨 Chord Stylizer (Worship/Simple)
          </button>
        </div>

        <div className="ai-studio-body">
          {error && (
            <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
              ⚠️ {error}
            </div>
          )}

          {activeTab === 'chords' && (
            <>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                AI analyzes lyrics and harmonizes full chord progression for standard church arrangement.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem' }}>Choose Key:</span>
                <select
                  value={targetKey}
                  onChange={(e) => setTargetKey(e.target.value)}
                  style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', padding: '6px 12px', borderRadius: '8px' }}
                >
                  {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'Am', 'Em', 'Dm'].map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="ai-studio-action-btn"
                disabled={loading}
                onClick={handleGenerateChords}
              >
                {loading ? 'Generating Harmonies...' : '✨ Generate Chords in ' + targetKey}
              </button>
            </>
          )}

          {activeTab === 'translate' && (
            <>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Translates foreign worship songs into singable Armenian poetry with matching meter, rhythm, and worship vocabulary.
              </p>
              <button
                type="button"
                className="ai-studio-action-btn"
                disabled={loading}
                onClick={handleTranslate}
              >
                {loading ? 'Translating Poetically...' : '✨ Translate into Armenian Church Lyrics'}
              </button>
            </>
          )}

          {activeTab === 'stylize' && (
            <>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Transform chords between modern worship voicing (sus4, 2, 7th, slash chords) or simplified beginner chords.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="stylizeMode"
                    value="enhance"
                    checked={stylizeMode === 'enhance'}
                    onChange={() => setStylizeMode('enhance')}
                  />
                  Modern Worship Voicing (sus4, add9, 7)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="stylizeMode"
                    value="simplify"
                    checked={stylizeMode === 'simplify'}
                    onChange={() => setStylizeMode('simplify')}
                  />
                  Simplify for Beginners
                </label>
              </div>
              <button
                type="button"
                className="ai-studio-action-btn"
                disabled={loading}
                onClick={handleStylizeChords}
              >
                {loading ? 'Stylizing Chords...' : '✨ Apply Chord Transformation'}
              </button>
            </>
          )}

          {resultText && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#38bdf8' }}>AI Result:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onApplyResult) onApplyResult(resultText);
                    onClose();
                  }}
                  style={{
                    background: '#10b981',
                    border: 'none',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Apply to Song
                </button>
              </div>
              <div className="ai-studio-result-box">{resultText}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
