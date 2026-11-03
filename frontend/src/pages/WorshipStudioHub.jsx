import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveStageBar from '../components/LiveStageBar';
import SongStemsMixer from '../components/SongStemsMixer';
import SmartMetronome from '../components/SmartMetronome';
import WorshipAIStudioModal from '../components/WorshipAIStudioModal';
import './WorshipStudioHub.css';

export default function WorshipStudioHub() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('live_stage'); // 'live_stage' | 'stems' | 'projection' | 'ai_studio' | 'planner' | 'metronome'
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isAIStudioOpen, setIsAIStudioOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Fetch songs list for selection in tools
  useEffect(() => {
    let active = true;
    fetch('/api.php')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.songs || [];
        setSongs(list);
        if (list.length > 0) {
          setSelectedSong((prev) => prev || list[0]);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleCopyObsLink = (songId) => {
    const url = `${window.location.origin}/projection/${songId}`;
    navigator.clipboard?.writeText(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  return (
    <div className="worship-studio-hub-page">
      {/* Mobile / PWA Top Navigation Bar */}
      <div className="wsh-top-nav">
        <button
          type="button"
          className="wsh-back-btn"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/songs'))}
          aria-label="Վերադառնալ"
        >
          <span className="wsh-back-arrow">←</span>
          <span>Ետ</span>
        </button>
        <div className="wsh-top-badge">🎛️ Pro Studio</div>
        <button
          type="button"
          className="wsh-home-btn"
          onClick={() => navigate('/songs')}
          title="Երգերի գրադարան"
        >
          🎵
        </button>
      </div>

      {/* Studio Header */}
      <div className="wsh-header">
        <div className="wsh-header-badge">PRO WORSHIP SUITE 5.3.0</div>
        <h1 className="wsh-title">🎛️ Worship Pro Studio</h1>
        <p className="wsh-subtitle">
          Բեմական սինքրոնացում, առանձնացված շերտերի փորձերի միքշեր, եկեղեցու պրոյեկցիա, արհեստական բանականություն և ծառայության պլանավորող մեկ տեղում։
        </p>

        {/* Tab Pills */}
        <div className="wsh-tabs-scroll">
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'live_stage' ? 'active' : ''}`}
            onClick={() => setActiveTab('live_stage')}
          >
            <span className="wsh-tab-icon">📡</span>
            <span>Live Follower</span>
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'stems' ? 'active' : ''}`}
            onClick={() => setActiveTab('stems')}
          >
            <span className="wsh-tab-icon">🎛️</span>
            <span>Stems Միքշեր</span>
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'projection' ? 'active' : ''}`}
            onClick={() => setActiveTab('projection')}
          >
            <span className="wsh-tab-icon">📽️</span>
            <span>Պրոյեկցիա & OBS</span>
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'ai_studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai_studio')}
          >
            <span className="wsh-tab-icon">✨</span>
            <span>AI Studio</span>
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'planner' ? 'active' : ''}`}
            onClick={() => setActiveTab('planner')}
          >
            <span className="wsh-tab-icon">📅</span>
            <span>Service Planner</span>
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'metronome' ? 'active' : ''}`}
            onClick={() => setActiveTab('metronome')}
          >
            <span className="wsh-tab-icon">⏱️</span>
            <span>Մետրոնոմ</span>
          </button>
        </div>
      </div>

      {/* Song Selector Strip for tools that work with a song */}
      {['stems', 'projection', 'ai_studio'].includes(activeTab) && (
        <div className="wsh-song-selector-bar">
          <label className="wsh-sel-label">Ընտրված երգ՝</label>
          <div className="wsh-song-select-wrap">
            <select
              className="wsh-song-select"
              value={selectedSong ? selectedSong.id : ''}
              onChange={(e) => {
                const found = songs.find((s) => String(s.id) === String(e.target.value));
                if (found) setSelectedSong(found);
              }}
            >
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title_hy || s.title} {s.song_key ? `[${s.song_key}]` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedSong && (
            <button
              type="button"
              className="wsh-open-song-btn"
              onClick={() => navigate(`/song/${selectedSong.id}`)}
              title="Բացել երգի ամբողջական էջը"
            >
              📄 Բացել երգը ↗
            </button>
          )}
        </div>
      )}

      {/* Tab 1: Band Live Follower */}
      {activeTab === 'live_stage' && (
        <div className="wsh-panel-card">
          <div className="wsh-card-header">
            <div>
              <h3>📡 Band Live Follower (Բեմական Սինքրոնացում)</h3>
              <p className="wsh-card-desc">
                Worship Leader-ը ղեկավարում է երգացանկը, իսկ խմբի բոլոր երաժիշտների ու վոկալիստների էկրանները ավտոմատ բացում են ընթացիկ երգն ու տոնայնությունը իրական ժամանակում։
              </p>
            </div>
          </div>
          <div className="wsh-tool-body">
            <LiveStageBar
              currentSongId={selectedSong ? Number(selectedSong.id) : null}
              currentSongTitle={selectedSong?.title_hy || selectedSong?.title || ''}
              currentKey={selectedSong?.song_key || 'C'}
              currentCapo={0}
              currentSemi={0}
              currentBpm={selectedSong?.bpm || 120}
              onFollowSongChange={(newSongId) => {
                navigate(`/song/${newSongId}`);
              }}
            />
            <div className="wsh-help-grid">
              <div className="wsh-help-box">
                <div className="wsh-help-head">
                  <span className="wsh-help-icon">👑</span>
                  <strong>Worship Leader / Ղեկավար</strong>
                </div>
                <span>Սեղմեք «Սկսել Live Բեմ»։ Կգեներացվի STAGE-XXXX կոդ։ Երբ դուք փոխեք երգը կամ տոնայնությունը, բոլորի մոտ այն վայրկենապես կփոխվի։</span>
              </div>
              <div className="wsh-help-box">
                <div className="wsh-help-head">
                  <span className="wsh-help-icon">🎸</span>
                  <strong>Երաժիշտ / Թիմի անդամ</strong>
                </div>
                <span>Սեղմեք «Միանալ», ընտրեք ցուցակից առաջնորդի բեմական սեսիան կամ մուտքագրեք STAGE կոդը։</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: RehearsalMix & Stems Mixer */}
      {activeTab === 'stems' && (
        <div className="wsh-panel-card">
          <div className="wsh-card-header">
            <div>
              <h3>🎛️ RehearsalMix & Stems Mixer (Շերտերի Միքշեր)</h3>
              <p className="wsh-card-desc">
                8-ալիքային Web Audio պաշտամունքային սինթեզատոր և միքշեր տանը կամ բեմի ետնամասում անհատական փորձեր անելու համար։
              </p>
            </div>
          </div>
          <div className="wsh-tool-body">
            {selectedSong ? (
              <SongStemsMixer
                songTitle={selectedSong.title_hy || selectedSong.title}
                songKey={selectedSong.song_key || 'C'}
                initialBpm={selectedSong.bpm || 120}
                audioUrl={selectedSong.audio_url || ''}
              />
            ) : (
              <div className="wsh-placeholder">Ընտրեք երգ վերևի ցուցակից միքշերը բացելու համար։</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Live Lyrics Projection & OBS */}
      {activeTab === 'projection' && (
        <div className="wsh-panel-card">
          <div className="wsh-card-header">
            <div>
              <h3>📽️ Live Lyrics Projection & OBS Lower Thirds</h3>
              <p className="wsh-card-desc">
                Դահլիճի մեծ պրոյեկտորի էկրան, ուղիղ եթերների համար թափանցիկ ժապավեն (Lower Thirds) կամ բեմի Confidence Monitor:
              </p>
            </div>
          </div>
          <div className="wsh-tool-body">
            {selectedSong ? (
              <div className="wsh-proj-action-box">
                <div className="wsh-proj-preview-info">
                  <strong>Ընտրված երգ՝ {selectedSong.title_hy || selectedSong.title}</strong>
                  <span>Պատրաստ է պրոյեկտման առանձին պատուհանով կամ OBS Browser Source-ով։</span>
                </div>
                <div className="wsh-proj-btns-row">
                  <button
                    type="button"
                    className="wsh-btn-launch"
                    onClick={() => window.open(`/projection/${selectedSong.id}`, '_blank')}
                  >
                    📽️ Բացել Պրոյեկտորը ↗
                  </button>
                  <button
                    type="button"
                    className="wsh-btn-copy"
                    onClick={() => handleCopyObsLink(selectedSong.id)}
                  >
                    {copyFeedback ? '✅ Հղումը պատճենվեց!' : '📋 Պատճենել OBS Browser Source Link'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="wsh-placeholder">Ընտրեք երգ վերևի ցանկից պրոյեկցիան գործարկելու համար։</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Worship AI Studio */}
      {activeTab === 'ai_studio' && (
        <div className="wsh-panel-card">
          <div className="wsh-card-header">
            <div>
              <h3>✨ Worship AI Studio (Ակորդներ & Թարգմանություն)</h3>
              <p className="wsh-card-desc">
                Արհեստական բանականության և երաժշտական տեսության ներկառուցված շարժիչով ակորդների ստեղծում, հարստացում (Modern Voicing) և պոետիկ հայերեն թարգմանություն։
              </p>
            </div>
          </div>
          <div className="wsh-tool-body">
            <div className="wsh-ai-intro">
              <p>
                Ընտրեք երգը վերևի ցուցակից կամ բացեք AI Studio-ն՝ նոր տեքստ տեղադրելու համար։
              </p>
              <button
                type="button"
                className="wsh-btn-launch"
                onClick={() => setIsAIStudioOpen(true)}
              >
                ✨ Բացել Worship AI Studio-ն
              </button>
            </div>

            {selectedSong && (
              <WorshipAIStudioModal
                isOpen={isAIStudioOpen}
                onClose={() => setIsAIStudioOpen(false)}
                songTitle={selectedSong.title_hy || selectedSong.title}
                songKey={selectedSong.song_key || 'C'}
                lyrics={selectedSong.lyrics || ''}
                chords={selectedSong.chords || ''}
                onApplyResult={(newText) => {
                  alert('Արդյունքը պատճենվեց clipboard: Կարող եք տեղադրել երգի մեջ։');
                  navigator.clipboard?.writeText(newText);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Ministry Service Planner */}
      {activeTab === 'planner' && (
        <div className="wsh-panel-card">
          <div className="wsh-card-header">
            <div>
              <h3>📅 Ministry Service Planner & Team Rostering</h3>
              <p className="wsh-card-desc">
                Ծառայության րոպեական ծրագիր (Run-of-Show), երգացանկի ավելացում բազայից և ծառայողների թիմի գրաֆիկ։
              </p>
            </div>
          </div>
          <div className="wsh-tool-body">
            <div className="wsh-planner-preview-box">
              <p>
                Ծառայության պլանավորիչը թույլ է տալիս ստեղծել կիրակնօրյա ծրագիրը, հաշվարկել տևողությունը, նշանակել երաժիշտներին և արտահանել PDF կամ տպել։
              </p>
              <button
                type="button"
                className="wsh-btn-launch"
                onClick={() => navigate('/service-planner')}
              >
                🚀 Բացել Ծառայության Պլանավորման Էջը →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Smart Metronome */}
      {activeTab === 'metronome' && (
        <div className="wsh-panel-card">
          <div className="wsh-card-header">
            <div>
              <h3>⏱️ Smart Visual Click & Metronome Engine</h3>
              <p className="wsh-card-desc">
                Web Audio API բարձր ճշգրտության մետրոնոմ, չափեր (4/4, 3/4, 6/8), փայտե և էլեկտրոնային ձայներ, Tap Tempo և էկրանի լուսային զարկ (Pulse):
              </p>
            </div>
          </div>
          <div className="wsh-tool-body" style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
            <SmartMetronome
              initialBpm={selectedSong?.bpm || 120}
              initialSignature={4}
              enableScreenPulse={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
