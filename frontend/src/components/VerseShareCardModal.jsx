import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './VerseShareCardModal.css';

const CARD_THEMES = [
  {
    id: 'midnight',
    label: 'Midnight',
    stops: ['#090d1a', '#16213e', '#0c1224'],
    glow: 'rgba(247, 181, 0, 0.22)',
    textColor: '#f8fafc',
    refColor: '#f7b500',
    subColor: 'rgba(248, 250, 252, 0.56)',
    swatch: 'linear-gradient(135deg, #0b1020, #233359)',
  },
  {
    id: 'dawn',
    label: 'Dawn',
    stops: ['#22120c', '#572814', '#9e581e'],
    glow: 'rgba(253, 224, 71, 0.22)',
    textColor: '#fff8ee',
    refColor: '#fde68a',
    subColor: 'rgba(255, 248, 238, 0.65)',
    swatch: 'linear-gradient(135deg, #3c1c10, #b36624)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    stops: ['#041524', '#0b3252', '#092238'],
    glow: 'rgba(56, 189, 248, 0.24)',
    textColor: '#f0f9ff',
    refColor: '#38bdf8',
    subColor: 'rgba(224, 242, 254, 0.58)',
    swatch: 'linear-gradient(135deg, #061826, #0e4a7b)',
  },
  {
    id: 'olive',
    label: 'Olive',
    stops: ['#101913', '#1e3324', '#142218'],
    glow: 'rgba(134, 239, 172, 0.16)',
    textColor: '#f3f7f2',
    refColor: '#d9c484',
    subColor: 'rgba(243, 247, 242, 0.55)',
    swatch: 'linear-gradient(135deg, #122017, #2c4a35)',
  },
  {
    id: 'ivory',
    label: 'Ivory',
    stops: ['#faf6ef', '#f1e8d8', '#e8dcc7'],
    glow: 'rgba(180, 128, 22, 0.12)',
    textColor: '#1c1917',
    refColor: '#9a6500',
    subColor: 'rgba(28, 25, 23, 0.52)',
    swatch: 'linear-gradient(135deg, #faf6ef, #e5d7be)',
  },
];

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function VerseShareCardModal({
  isOpen,
  onClose,
  verseText,
  reference,
  translationName,
  language = 'am',
}) {
  const canvasRef = useRef(null);
  const [themeId, setThemeId] = useState('midnight');
  const [format, setFormat] = useState('story'); // 'story' (9:16) | 'square' (1:1)
  const [statusMsg, setStatusMsg] = useState('');
  const [sharing, setSharing] = useState(false);

  const activeTheme = CARD_THEMES.find((t) => t.id === themeId) || CARD_THEMES[0];

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = 1080;
    const height = format === 'story' ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, activeTheme.stops[0]);
    grad.addColorStop(0.55, activeTheme.stops[1]);
    grad.addColorStop(1, activeTheme.stops[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Soft ambient radial glow
    const rad = ctx.createRadialGradient(width * 0.5, height * 0.34, 40, width * 0.5, height * 0.38, width * 0.72);
    rad.addColorStop(0, activeTheme.glow);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle editorial border frame
    const pad = 64;
    ctx.strokeStyle = activeTheme.id === 'ivory' ? 'rgba(28, 25, 23, 0.12)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

    // 4. Adaptive verse typography
    const cleanText = `«${String(verseText || '').trim()}»`;
    const maxTextWidth = width - 220;
    const maxTextHeight = height * (format === 'story' ? 0.54 : 0.56);

    let fontSize = cleanText.length > 260 ? 38 : cleanText.length > 150 ? 48 : 58;
    let lines = [];
    let lineHeight = Math.round(fontSize * 1.48);

    while (fontSize >= 28) {
      ctx.font = `500 ${fontSize}px "Literata", Georgia, "Times New Roman", serif`;
      lines = wrapLines(ctx, cleanText, maxTextWidth);
      lineHeight = Math.round(fontSize * 1.48);
      if (lines.length * lineHeight <= maxTextHeight) break;
      fontSize -= 3;
    }

    const totalBlockH = lines.length * lineHeight + 130;
    let cursorY = Math.round((height - totalBlockH) / 2) + fontSize;

    // Small top gold decorative mark
    ctx.fillStyle = activeTheme.refColor;
    ctx.fillRect(width / 2 - 36, cursorY - fontSize - 56, 72, 4);

    // Draw verse lines centered
    ctx.fillStyle = activeTheme.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `500 ${fontSize}px "Literata", Georgia, "Times New Roman", serif`;
    for (const line of lines) {
      ctx.fillText(line, width / 2, cursorY);
      cursorY += lineHeight;
    }

    // Reference badge
    cursorY += 36;
    ctx.fillStyle = activeTheme.refColor;
    ctx.font = '700 34px "Onest", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(reference || '', width / 2, cursorY);

    if (translationName) {
      cursorY += 44;
      ctx.fillStyle = activeTheme.subColor;
      ctx.font = '500 24px "Onest", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(translationName, width / 2, cursorY);
    }

    // Subtle footer watermark
    ctx.fillStyle = activeTheme.subColor;
    ctx.font = '600 22px "Onest", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('WORSHIP PLATFORM', width / 2, height - 108);
  }, [isOpen, verseText, reference, translationName, activeTheme, format]);

  if (!isOpen) return null;

  const getPngBlob = () =>
    new Promise((resolve) => {
      if (!canvasRef.current) return resolve(null);
      canvasRef.current.toBlob((blob) => resolve(blob), 'image/png', 0.96);
    });

  const handleDownload = async () => {
    const blob = await getPngBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verse-${(reference || 'bible').replace(/[^\p{L}\d]+/gu, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatusMsg(language === 'ru' ? 'Изображение сохранено' : language === 'en' ? 'Image saved' : 'Նկարը պահպանվեց');
    setTimeout(() => setStatusMsg(''), 2200);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await getPngBlob();
      if (blob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const file = new File([blob], 'bible-verse.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: reference || 'Bible Verse',
            text: `${verseText} — ${reference}`,
          });
          setSharing(false);
          return;
        }
      }
      await handleDownload();
    } catch (_) {
      // User cancelled share sheet
    }
    setSharing(false);
  };

  return createPortal(
    <div className="vsc-overlay" onClick={onClose}>
      <div className="vsc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vsc-header">
          <div>
            <h3>{language === 'ru' ? 'Карточка стиха' : language === 'en' ? 'Verse Share Card' : 'Համարի նկար-քարտ'}</h3>
            <span>{reference}</span>
          </div>
          <button type="button" className="vsc-close" onClick={onClose} aria-label="Փակել">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="vsc-preview-wrap">
          <canvas
            ref={canvasRef}
            className={`vsc-canvas ${format === 'story' ? 'is-story' : 'is-square'}`}
          />
        </div>

        <div className="vsc-controls">
          <div className="vsc-format-pills">
            <button
              type="button"
              className={format === 'story' ? 'active' : ''}
              onClick={() => setFormat('story')}
            >
              Story 9:16
            </button>
            <button
              type="button"
              className={format === 'square' ? 'active' : ''}
              onClick={() => setFormat('square')}
            >
              Post 1:1
            </button>
          </div>

          <div className="vsc-swatches">
            {CARD_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`vsc-swatch ${themeId === t.id ? 'active' : ''}`}
                style={{ background: t.swatch }}
                onClick={() => setThemeId(t.id)}
                title={t.label}
                aria-label={t.label}
              />
            ))}
          </div>
        </div>

        {statusMsg && <div className="vsc-status">{statusMsg}</div>}

        <div className="vsc-actions">
          <button type="button" className="vsc-btn vsc-btn-secondary" onClick={handleDownload}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{language === 'ru' ? 'Скачать PNG' : language === 'en' ? 'Save PNG' : 'Պահպանել'}</span>
          </button>

          <button type="button" className="vsc-btn vsc-btn-primary" onClick={handleShare} disabled={sharing}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>{language === 'ru' ? 'Поделиться' : language === 'en' ? 'Share' : 'Կիսվել'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
