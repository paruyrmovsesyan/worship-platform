import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './PrintStudio.css';

function sanitizeFileName(value) {
  return String(value || 'worship-document')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function splitPrintSections(value) {
  return String(value || '')
    .split(/\n\s*\n/g)
    .map(section => section.trim())
    .filter(Boolean);
}

function PrintDocument({ documents, settings, documentTitle }) {
  return (
    <section
      className={`print-studio-document columns-${settings.columns}`}
      style={{ '--print-font-size': `${settings.fontSize}px` }}
      aria-label="Տպվող փաստաթուղթ"
    >
      {documentTitle ? <header className="print-document-setlist-title"><h1>{documentTitle}</h1></header> : null}
      {documents.map((document, index) => (
        <article className="print-song-document" key={`${document.id || document.title}-${index}`}>
          <header>
            <div>
              <h2>{document.title}</h2>
              {document.artist ? <p>{document.artist}</p> : null}
            </div>
            <dl>
              {document.key ? <div><dt>Key</dt><dd>{document.key}</dd></div> : null}
              {Number(document.bpm) > 0 ? <div><dt>BPM</dt><dd>{document.bpm}</dd></div> : null}
            </dl>
          </header>
          <div className="print-song-body">
            {settings.showChords && document.chords ? (
              <div className="print-chords">
                {splitPrintSections(document.chords).map((section, sectionIndex) => (
                  <pre
                    className="print-song-section"
                    key={`${document.id || document.title}-chords-${sectionIndex}`}
                    dangerouslySetInnerHTML={{ __html: section }}
                  />
                ))}
              </div>
            ) : (
              <div className="print-lyrics">
                {splitPrintSections(document.lyrics || 'Տեքստը հասանելի չէ։').map((section, sectionIndex) => (
                  <pre className="print-song-section" key={`${document.id || document.title}-lyrics-${sectionIndex}`}>{section}</pre>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
      <footer className="print-document-footer">
        <span>WORSHIP PLATFORM</span>
        <span>{new Date().toLocaleDateString('hy-AM')}</span>
      </footer>
    </section>
  );
}

export default function PrintStudio({
  isOpen,
  onClose,
  documents = [],
  documentTitle = '',
  defaultShowChords = true,
}) {
  const exportRef = useRef(null);
  const [settings, setSettings] = useState({
    fontSize: 14,
    showChords: defaultShowChords,
    columns: 1,
  });
  const [isExporting, setIsExporting] = useState(false);
  const fileName = useMemo(
    () => sanitizeFileName(documentTitle || documents[0]?.title || 'worship-document'),
    [documentTitle, documents],
  );

  if (!isOpen) return null;

  const updateSettings = patch => setSettings(current => ({ ...current, ...patch }));

  const handlePrint = () => {
    document.body.classList.add('web-printing');
    window.requestAnimationFrame(() => {
      window.print();
      window.setTimeout(() => document.body.classList.remove('web-printing'), 300);
    });
  };

  const handlePdfExport = async () => {
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (canvas.height * renderWidth) / canvas.width;
      const image = canvas.toDataURL('image/jpeg', 0.92);
      let offset = 0;
      let page = 0;
      while (offset < renderHeight) {
        if (page > 0) pdf.addPage();
        pdf.addImage(image, 'JPEG', margin, margin - offset, renderWidth, renderHeight, undefined, 'FAST');
        offset += pageHeight - margin * 2;
        page += 1;
      }
      pdf.save(`${fileName}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="print-studio-overlay" onMouseDown={onClose}>
      <aside className="print-studio-panel" role="dialog" aria-modal="true" aria-label="Print and PDF Studio" onMouseDown={event => event.stopPropagation()}>
        <header className="print-studio-header">
          <div>
            <span>EXPORT STUDIO</span>
            <h2>Print & PDF Studio</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Փակել">×</button>
        </header>

        <div className="print-studio-settings">
          <div className="print-setting-row">
            <span>Ձևաչափ</span>
            <strong>A4 · 210 × 297 mm</strong>
          </div>
          <label className="print-setting-row">
            <span>Տառաչափ</span>
            <select value={settings.fontSize} onChange={event => updateSettings({ fontSize: Number(event.target.value) })}>
              {[12, 14, 16, 18, 20, 22].map(size => <option key={size} value={size}>{size}px</option>)}
            </select>
          </label>
          <div className="print-setting-row">
            <span>Ակորդներ</span>
            <button type="button" className={`print-switch ${settings.showChords ? 'active' : ''}`} onClick={() => updateSettings({ showChords: !settings.showChords })} aria-pressed={settings.showChords}>
              <span />
            </button>
          </div>
          <div className="print-setting-row">
            <span>Սյունակներ</span>
            <div className="print-column-switch">
              {[1, 2].map(columns => (
                <button type="button" key={columns} className={settings.columns === columns ? 'active' : ''} onClick={() => updateSettings({ columns })}>{columns}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="print-preview-shell">
          <div className="print-preview-scale">
            <PrintDocument documents={documents} settings={settings} documentTitle={documentTitle} />
          </div>
        </div>

        <footer className="print-studio-actions">
          <button type="button" className="secondary" onClick={handlePrint}>
            <span>Տպել</span>
          </button>
          <button type="button" className="primary" onClick={handlePdfExport} disabled={isExporting}>
            <span>{isExporting ? 'Պատրաստվում է...' : 'PDF ներբեռնել'}</span>
          </button>
        </footer>
      </aside>

      <div className="print-export-host" aria-hidden="true">
        <div ref={exportRef}>
          <PrintDocument documents={documents} settings={settings} documentTitle={documentTitle} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
