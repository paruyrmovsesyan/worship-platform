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

  return (
    <div className="worship-studio-hub-page">
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
            📡 Band Live Follower
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'stems' ? 'active' : ''}`}
            onClick={() => setActiveTab('stems')}
          >
            🎛️ RehearsalMix & Stems
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'projection' ? 'active' : ''}`}
            onClick={() => setActiveTab('projection')}
          >
            📽️ Live Projection & OBS
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'ai_studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai_studio')}
          >
            ✨ AI Chords & Translate
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'planner' ? 'active' : ''}`}
            onClick={() => setActiveTab('planner')}
          >
            📅 Service Planner
          </button>
          <button
            type="button"
            className={`wsh-tab-pill ${activeTab === 'metronome' ? 'active' : ''}`}
            onClick={() => setActiveTab('metronome')}
          >
            ⏱️ Smart Metronome
          </button>
        </div>
      </div>

      {/* Song Selector Strip for tools that work with a song */}
      {['stems', 'projection', 'ai_studio'].includes(activeTab) && (
        <div className="wsh-song-selector-bar">
          <label className="wsh-sel-label">Ընտրված երգ՝</label>
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
          {selectedSong && (
            <button
              type="button"
              className="wsh-open-song-btn"
              onClick={() => navigate(`/song/${selectedSong.id}`)}
              title="Բացել երգի ամբողջական էջը"
            >
              📄 Բացել երգի էջը ↗
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
                <strong>👑 Worship Leader / Ղեկավար</strong>
                <span>Սեղմեք «Սկսել Live Բեմ»։ Կգեներացվի STAGE-XXXX կոդ։ Երբ դուք փոխեք երգը, բոլորի մոտ այն կփոխվի։</span>
              </div>
              <div className="wsh-help-box">
                <strong>🎸 Երաժիշտ / Թիմի անդամ</strong>
                <span>Սեղմեք «Միանալ», ընտրեք ցուցակից առաջնորդի սեսիան կամ մուտքագրեք կոդը։</span>
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
              <h3>🎛️ RehearsalMix & Stems Mixer (Առանձնացված Շերտերի Միքշեր)</h3>
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
                    📽️ Բացել Պրոյեկտորը Նոր Պատուհանով ↗
                  </button>
                  <button
                    type="button"
                    className="wsh-btn-copy"
                    onClick={() => {
                      const url = `${window.location.origin}/projection/${selectedSong.id}`;
                      navigator.clipboard?.writeText(url);
                      alert('OBS Browser Source հղումը պատճենվեց՝ ' + url);
                    }}
                  >
                    📋 Պատճենել OBS Browser Source Link
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
              <h3>✨ Worship AI Studio (Ակորդների Գեներացում & Թարգմանություն)</h3>
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
            <button
              type="button"
              className="wsh-btn-launch"
              onClick={() => navigate('/service-planner')}
            >
              🚀 Բացել Ամբողջ Պլանավորիչը ↗
            </button>
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
                Անցնել Ծառայության Պլանավորման Էջ →
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
          <div className="wsh-tool-body" style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
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
