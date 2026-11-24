import './NativeSkeletons.css';

export function Skeleton({
  variant = 'rect',
  width,
  height,
  borderRadius,
  className = '',
  style = {},
  ...props
}) {
  const isCircular = variant === 'circle' || variant === 'circular';
  const customStyle = {
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...(borderRadius !== undefined ? { borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius } : {}),
    ...style,
  };

  return (
    <div
      className={`wp-skeleton ${isCircular ? 'wp-skeleton--circular' : ''} ${className}`.trim()}
      style={customStyle}
      aria-hidden="true"
      {...props}
    />
  );
}

/* =========================================================
   1. SONG VIEW SKELETON (Երգի բացման էջ)
   ========================================================= */
export function SongViewSkeleton() {
  return (
    <div className="wp-skeleton-root song-view-skeleton animate-fade-in" aria-busy="true">
      {/* Top action row */}
      <div className="sv-skeleton-topbar">
        <div className="sv-skeleton-header-left">
          <Skeleton width={38} height={38} borderRadius={12} />
          <div className="sv-skeleton-title-area">
            <Skeleton width="65%" height={24} borderRadius={8} />
            <Skeleton width="35%" height={15} borderRadius={6} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={36} height={36} borderRadius={12} />
          <Skeleton width={36} height={36} borderRadius={12} />
          <Skeleton width={36} height={36} borderRadius={12} />
        </div>
      </div>

      {/* Meta Bar: Key, BPM, Capo, Font Stepper */}
      <div className="sv-skeleton-meta-bar">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Skeleton width={48} height={28} borderRadius={12} />
          <Skeleton width={64} height={28} borderRadius={12} />
          <Skeleton width={44} height={28} borderRadius={12} />
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Skeleton width={26} height={26} borderRadius={8} />
          <Skeleton width={24} height={16} borderRadius={4} />
          <Skeleton width={26} height={26} borderRadius={8} />
        </div>
      </div>

      {/* Segmented Control Tabs (Chords, Lyrics, Both) */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="sv-skeleton-segmented">
          <Skeleton width={90} height={28} borderRadius={10} />
          <Skeleton width={70} height={28} borderRadius={10} />
          <Skeleton width={85} height={28} borderRadius={10} />
        </div>
      </div>

      {/* Song Sheet Container: Verses & Chorus with Chords & Lyrics */}
      <div className="sv-skeleton-sheet">
        {/* Verse 1 */}
        <div className="sv-skeleton-strophe">
          <Skeleton width={60} height={20} borderRadius={6} />
          
          <div className="sv-skeleton-chords-line">
            <Skeleton width={28} height={18} borderRadius={4} />
            <Skeleton width={34} height={18} borderRadius={4} />
            <Skeleton width={28} height={18} borderRadius={4} />
            <Skeleton width={32} height={18} borderRadius={4} />
          </div>
          <Skeleton width="88%" height={19} borderRadius={6} />

          <div className="sv-skeleton-chords-line" style={{ marginTop: 4 }}>
            <Skeleton width={32} height={18} borderRadius={4} />
            <Skeleton width={38} height={18} borderRadius={4} />
            <Skeleton width={28} height={18} borderRadius={4} />
          </div>
          <Skeleton width="94%" height={19} borderRadius={6} />

          <div className="sv-skeleton-chords-line" style={{ marginTop: 4 }}>
            <Skeleton width={30} height={18} borderRadius={4} />
            <Skeleton width={36} height={18} borderRadius={4} />
          </div>
          <Skeleton width="72%" height={19} borderRadius={6} />
        </div>

        {/* Chorus */}
        <div className="sv-skeleton-strophe">
          <Skeleton width={78} height={20} borderRadius={6} style={{ background: 'var(--skeleton-accent-tint)' }} />
          
          <div className="sv-skeleton-chords-line">
            <Skeleton width={30} height={18} borderRadius={4} />
            <Skeleton width={36} height={18} borderRadius={4} />
            <Skeleton width={34} height={18} borderRadius={4} />
            <Skeleton width={30} height={18} borderRadius={4} />
          </div>
          <Skeleton width="92%" height={19} borderRadius={6} />

          <div className="sv-skeleton-chords-line" style={{ marginTop: 4 }}>
            <Skeleton width={34} height={18} borderRadius={4} />
            <Skeleton width={30} height={18} borderRadius={4} />
            <Skeleton width={32} height={18} borderRadius={4} />
          </div>
          <Skeleton width="84%" height={19} borderRadius={6} />

          <div className="sv-skeleton-chords-line" style={{ marginTop: 4 }}>
            <Skeleton width={28} height={18} borderRadius={4} />
            <Skeleton width={32} height={18} borderRadius={4} />
          </div>
          <Skeleton width="66%" height={19} borderRadius={6} />
        </div>

        {/* Verse 2 */}
        <div className="sv-skeleton-strophe">
          <Skeleton width={60} height={20} borderRadius={6} />
          
          <div className="sv-skeleton-chords-line">
            <Skeleton width={28} height={18} borderRadius={4} />
            <Skeleton width={34} height={18} borderRadius={4} />
            <Skeleton width={30} height={18} borderRadius={4} />
          </div>
          <Skeleton width="86%" height={19} borderRadius={6} />
          <Skeleton width="80%" height={19} borderRadius={6} style={{ marginTop: 8 }} />
        </div>
      </div>

      {/* Floating Bottom Autoscroll Player Dock */}
      <div className="sv-skeleton-floating-player">
        <Skeleton variant="circle" width={36} height={36} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="50%" height={13} borderRadius={4} />
          <Skeleton width="100%" height={6} borderRadius={3} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Skeleton width={28} height={28} borderRadius={8} />
          <Skeleton width={28} height={28} borderRadius={8} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   2. SONGS LIST & PAGE SKELETON (Երգերի ցանկ)
   ========================================================= */
export function SongsListSkeleton({ count = 7 }) {
  return (
    <div className="wp-skeleton-root" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 0 96px' }} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="songs-skeleton-item" style={{ pointerEvents: 'none' }}>
          {/* Song Cover Thumbnail */}
          <Skeleton width={48} height={48} borderRadius={14} style={{ flexShrink: 0 }} />

          {/* Song Info: Title, Artist, Key & BPM tags */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <Skeleton width={i % 2 === 0 ? '65%' : '78%'} height={17} borderRadius={6} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Skeleton width="36%" height={13} borderRadius={4} />
              <div style={{ display: 'flex', gap: 4 }}>
                <Skeleton width={26} height={18} borderRadius={6} />
                <Skeleton width={44} height={18} borderRadius={6} />
              </div>
            </div>
          </div>

          {/* Action buttons (Add to setlist, Star) */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <Skeleton width={32} height={32} borderRadius={10} />
            <Skeleton width={32} height={32} borderRadius={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SongsPageSkeleton() {
  return (
    <div className="wp-skeleton-root songs-page-skeleton animate-fade-in" aria-busy="true">
      {/* Search Input Box */}
      <div className="songs-skeleton-search">
        <Skeleton width="100%" height={46} borderRadius={16} />
      </div>

      {/* Language / Category Chips */}
      <div className="songs-skeleton-chips-row">
        <Skeleton width={74} height={32} borderRadius={16} style={{ background: 'var(--skeleton-accent-tint)' }} />
        <Skeleton width={78} height={32} borderRadius={16} />
        <Skeleton width={82} height={32} borderRadius={16} />
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={72} height={32} borderRadius={16} />
      </div>

      {/* Key Selector Chips */}
      <div className="songs-skeleton-keys-row">
        {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((k) => (
          <Skeleton key={k} width={34} height={28} borderRadius={10} />
        ))}
      </div>

      {/* Sort & Count Row */}
      <div className="songs-skeleton-sort-bar">
        <Skeleton width={90} height={16} borderRadius={4} />
        <Skeleton width={120} height={28} borderRadius={10} />
      </div>

      {/* Track Items */}
      <SongsListSkeleton count={6} />
    </div>
  );
}

/* =========================================================
   3. SETLISTS SKELETON (Սեթլիստների ցանկ)
   ========================================================= */
export function SetlistsAppSkeleton() {
  return (
    <div className="wp-skeleton-root setlists-skeleton animate-fade-in" aria-busy="true">
      {/* Top Header: Title + Create Button */}
      <div className="setlists-skeleton-header-row">
        <Skeleton width={130} height={26} borderRadius={8} />
        <Skeleton width={96} height={34} borderRadius={16} />
      </div>

      {/* Stats Grid with Upcoming Service Hero */}
      <div className="setlists-skeleton-stats-grid">
        <div className="setlists-skeleton-stat-card">
          <Skeleton variant="circle" width={32} height={32} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Skeleton width={32} height={18} borderRadius={4} />
            <Skeleton width={50} height={12} borderRadius={3} />
          </div>
        </div>

        <div className="setlists-skeleton-stat-card">
          <Skeleton variant="circle" width={32} height={32} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Skeleton width={32} height={18} borderRadius={4} />
            <Skeleton width={50} height={12} borderRadius={3} />
          </div>
        </div>

        <div className="setlists-skeleton-stat-card" style={{ background: 'var(--skeleton-accent-tint)' }}>
          <Skeleton width={34} height={34} borderRadius={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Skeleton width={60} height={12} borderRadius={3} />
            <Skeleton width="80%" height={16} borderRadius={4} />
          </div>
        </div>
      </div>

      {/* Search Input & Filter Pills */}
      <Skeleton width="100%" height={44} borderRadius={16} />
      <div style={{ display: 'flex', gap: 8, overflowX: 'hidden' }}>
        <Skeleton width={74} height={32} borderRadius={16} style={{ background: 'var(--skeleton-accent-tint)' }} />
        <Skeleton width={82} height={32} borderRadius={16} />
        <Skeleton width={76} height={32} borderRadius={16} />
        <Skeleton width={88} height={32} borderRadius={16} />
      </div>

      {/* Setlist Cards with Calendar Badge */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="setlists-skeleton-card">
          {/* Calendar Badge */}
          <div className="setlists-skeleton-date-badge">
            <Skeleton width={26} height={11} borderRadius={3} />
            <Skeleton width={22} height={18} borderRadius={4} />
          </div>

          {/* Details: Title, Meta, Tag Pill */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <Skeleton width={i % 2 === 0 ? '60%' : '75%'} height={19} borderRadius={6} />
            <Skeleton width="45%" height={13} borderRadius={4} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Skeleton width={56} height={20} borderRadius={8} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Skeleton variant="circle" width={18} height={18} />
                <Skeleton width={60} height={12} borderRadius={3} />
              </div>
            </div>
          </div>

          <Skeleton width={20} height={20} borderRadius={6} style={{ flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   4. SETLIST EDITOR SKELETON (Սեթլիստի խմբագրիչ)
   ========================================================= */
export function SetlistEditorSkeleton() {
  return (
    <div className="wp-skeleton-root setlist-editor-skeleton animate-fade-in" aria-busy="true">
      {/* Top Header: Back + Title + Action icons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton width={36} height={36} borderRadius={12} />
          <Skeleton width={140} height={22} borderRadius={6} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={36} height={36} borderRadius={12} />
          <Skeleton width={36} height={36} borderRadius={12} />
        </div>
      </div>

      {/* Setlist Hero Card */}
      <div className="se-skeleton-hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton width={100} height={22} borderRadius={8} />
          <Skeleton width={60} height={22} borderRadius={8} />
        </div>
        <Skeleton width="70%" height={26} borderRadius={8} />
        <Skeleton width="45%" height={15} borderRadius={4} />

        {/* 4 Action Pills */}
        <div className="se-skeleton-action-row" style={{ marginTop: 4 }}>
          <Skeleton width={100} height={34} borderRadius={14} style={{ background: 'var(--skeleton-accent-tint)' }} />
          <Skeleton width={90} height={34} borderRadius={14} />
          <Skeleton width={80} height={34} borderRadius={14} />
          <Skeleton width={75} height={34} borderRadius={14} />
        </div>

        {/* Team Members */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <div style={{ display: 'flex', gap: -6 }}>
            <Skeleton variant="circle" width={26} height={26} />
            <Skeleton variant="circle" width={26} height={26} style={{ marginLeft: 6 }} />
            <Skeleton variant="circle" width={26} height={26} style={{ marginLeft: 6 }} />
          </div>
          <Skeleton width={80} height={14} borderRadius={4} />
        </div>
      </div>

      {/* Section Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
        <Skeleton width={140} height={18} borderRadius={6} />
        <Skeleton width="100%" height={1} borderRadius={1} />
      </div>

      {/* Draggable Song Items List */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="se-skeleton-item">
          {/* Drag Handle & Number */}
          <Skeleton width={16} height={22} borderRadius={4} />
          <Skeleton width={26} height={26} borderRadius={8} />

          {/* Title & Subtitle */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <Skeleton width={i % 2 === 0 ? '60%' : '72%'} height={18} borderRadius={6} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Skeleton width="35%" height={13} borderRadius={4} />
              <Skeleton width={30} height={18} borderRadius={6} />
              <Skeleton width={46} height={18} borderRadius={6} />
            </div>
          </div>

          {/* Transpose Controls */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Skeleton width={24} height={24} borderRadius={6} />
            <Skeleton width={24} height={24} borderRadius={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   5. BIBLE CHAPTER SKELETON (Աստվածաշնչի ընթերցման էջ)
   ========================================================= */
export function BibleChapterSkeleton() {
  return (
    <div className="wp-skeleton-root bible-chapter-skeleton animate-fade-in" aria-busy="true">
      {/* Sticky Reader Topbar: Book, Chapter, Translation, Audio, Aa */}
      <div className="bible-skeleton-topbar">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Skeleton width={92} height={32} borderRadius={12} />
          <Skeleton width={48} height={32} borderRadius={12} />
          <Skeleton width={82} height={32} borderRadius={12} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Skeleton width={32} height={32} borderRadius={10} />
          <Skeleton width={32} height={32} borderRadius={10} />
          <Skeleton width={32} height={32} borderRadius={10} />
        </div>
      </div>

      {/* Chapter Title */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
        <Skeleton width={110} height={26} borderRadius={8} />
      </div>

      {/* Numbered Verses Stream */}
      {[
        { v: 1, lines: ['95%', '88%', '65%'] },
        { v: 2, lines: ['92%', '80%'] },
        { v: 3, lines: ['98%', '94%', '70%'] },
        { v: 4, lines: ['89%', '75%'] },
        { v: 5, lines: ['96%', '90%', '55%'] },
        { v: 6, lines: ['90%', '82%'] },
        { v: 7, lines: ['94%', '88%', '74%'] },
        { v: 8, lines: ['91%', '68%'] },
      ].map((item) => (
        <div key={item.v} className="bible-skeleton-verse-row">
          <Skeleton width={16} height={16} borderRadius={4} style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="bible-skeleton-verse-body">
            {item.lines.map((w, idx) => (
              <Skeleton key={idx} width={w} height={18} borderRadius={6} />
            ))}
          </div>
        </div>
      ))}

      {/* Bottom Chapter Navigation Footer */}
      <div className="bible-skeleton-nav-footer">
        <Skeleton width={120} height={38} borderRadius={14} />
        <Skeleton width={120} height={38} borderRadius={14} />
      </div>
    </div>
  );
}

/* =========================================================
   6. CHATS LIST & THREAD SKELETON (Չաթեր)
   ========================================================= */
export function ChatsListSkeleton() {
  return (
    <div className="wp-skeleton-root chats-list-skeleton animate-fade-in" aria-busy="true">
      {/* Header: Title + New Chat */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={120} height={26} borderRadius={8} />
        <Skeleton width={36} height={36} borderRadius={12} />
      </div>

      {/* Search Input Box */}
      <Skeleton width="100%" height={44} borderRadius={16} />

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={74} height={30} borderRadius={14} style={{ background: 'var(--skeleton-accent-tint)' }} />
        <Skeleton width={80} height={30} borderRadius={14} />
        <Skeleton width={85} height={30} borderRadius={14} />
      </div>

      {/* Chat Rows */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="chat-row-skeleton">
          {/* Avatar with Online indicator */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Skeleton variant="circle" width={50} height={50} />
            <Skeleton variant="circle" width={12} height={12} style={{ position: 'absolute', bottom: 0, right: 0, border: '2px solid rgba(0,0,0,0.5)' }} />
          </div>

          {/* Name, Time, Snippet & Badge */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width={i % 2 === 0 ? '50%' : '65%'} height={18} borderRadius={6} />
              <Skeleton width={36} height={12} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width="75%" height={14} borderRadius={4} />
              {i % 2 === 0 && <Skeleton width={20} height={20} borderRadius={10} style={{ background: 'var(--skeleton-accent-tint)' }} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatThreadSkeleton() {
  return (
    <div className="wp-skeleton-root chat-thread-skeleton animate-fade-in" aria-busy="true">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--skeleton-card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton width={34} height={34} borderRadius={10} />
          <Skeleton variant="circle" width={40} height={40} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Skeleton width={130} height={18} borderRadius={6} />
            <Skeleton width={60} height={12} borderRadius={4} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={34} height={34} borderRadius={10} />
          <Skeleton width={34} height={34} borderRadius={10} />
        </div>
      </div>

      {/* Message Stream */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'flex-end', overflow: 'hidden' }}>
        {/* Date Divider */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Skeleton width={70} height={20} borderRadius={10} />
        </div>

        {/* Incoming */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Skeleton variant="circle" width={30} height={30} style={{ flexShrink: 0 }} />
          <div className="chat-bubble-skeleton left">
            <Skeleton width={180} height={16} borderRadius={4} />
            <Skeleton width={120} height={16} borderRadius={4} />
            <Skeleton width={40} height={10} borderRadius={3} style={{ alignSelf: 'flex-end', marginTop: 2 }} />
          </div>
        </div>

        {/* Outgoing */}
        <div className="chat-bubble-skeleton right">
          <Skeleton width={210} height={16} borderRadius={4} />
          <Skeleton width={160} height={16} borderRadius={4} />
          <Skeleton width={90} height={16} borderRadius={4} />
          <div style={{ display: 'flex', gap: 4, alignSelf: 'flex-end', marginTop: 2 }}>
            <Skeleton width={40} height={10} borderRadius={3} />
            <Skeleton width={14} height={10} borderRadius={2} />
          </div>
        </div>

        {/* Incoming */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Skeleton variant="circle" width={30} height={30} style={{ flexShrink: 0 }} />
          <div className="chat-bubble-skeleton left">
            <Skeleton width={140} height={16} borderRadius={4} />
            <Skeleton width={40} height={10} borderRadius={3} style={{ alignSelf: 'flex-end', marginTop: 2 }} />
          </div>
        </div>

        {/* Outgoing Audio Message */}
        <div className="chat-bubble-skeleton right" style={{ width: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skeleton variant="circle" width={32} height={32} />
            <Skeleton width={110} height={18} borderRadius={6} />
            <Skeleton width={30} height={12} borderRadius={3} />
          </div>
        </div>
      </div>

      {/* Composer Input Bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Skeleton width={38} height={38} borderRadius={12} />
        <Skeleton width="100%" height={46} borderRadius={24} />
        <Skeleton variant="circle" width={42} height={42} />
      </div>
    </div>
  );
}

/* =========================================================
   7. USER PROFILE SKELETON (Օգտատիրոջ պրոֆիլ)
   ========================================================= */
export function UserProfileSkeleton() {
  return (
    <div className="wp-skeleton-root user-profile-skeleton animate-fade-in" aria-busy="true">
      {/* Top Header */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton width={36} height={36} borderRadius={12} />
        <Skeleton width={110} height={22} borderRadius={6} />
        <div style={{ width: 36 }} />
      </div>

      {/* Avatar & Name Wrap */}
      <div className="up-skeleton-avatar-wrap">
        <div style={{ position: 'relative' }}>
          <Skeleton variant="circle" width={88} height={88} />
          <Skeleton variant="circle" width={26} height={26} style={{ position: 'absolute', bottom: 0, right: 0 }} />
        </div>
        <Skeleton width={150} height={24} borderRadius={8} />
        <Skeleton width={90} height={14} borderRadius={5} />
        <Skeleton width={120} height={24} borderRadius={12} style={{ marginTop: 2 }} />
      </div>

      {/* Stats 3-card Grid */}
      <div className="up-skeleton-stats-grid">
        <div className="up-skeleton-stat-card">
          <Skeleton width={36} height={22} borderRadius={6} />
          <Skeleton width={60} height={12} borderRadius={3} />
        </div>
        <div className="up-skeleton-stat-card">
          <Skeleton width={36} height={22} borderRadius={6} />
          <Skeleton width={60} height={12} borderRadius={3} />
        </div>
        <div className="up-skeleton-stat-card">
          <Skeleton width={36} height={22} borderRadius={6} />
          <Skeleton width={60} height={12} borderRadius={3} />
        </div>
      </div>

      {/* Settings Action Rows */}
      <div className="up-skeleton-menu-list">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="up-skeleton-menu-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skeleton width={32} height={32} borderRadius={10} />
              <Skeleton width={i === 5 ? 70 : 130} height={16} borderRadius={5} />
            </div>
            <Skeleton width={16} height={16} borderRadius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   8. FRIENDS SKELETON (Ընկերներ)
   ========================================================= */
export function FriendsSkeleton() {
  return (
    <div className="wp-skeleton-root friends-skeleton animate-fade-in" aria-busy="true">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={120} height={26} borderRadius={8} />
        <Skeleton width={36} height={36} borderRadius={12} />
      </div>

      {/* Search & Tabs */}
      <Skeleton width="100%" height={44} borderRadius={16} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={120} height={32} borderRadius={16} style={{ background: 'var(--skeleton-accent-tint)' }} />
        <Skeleton width={96} height={32} borderRadius={16} />
      </div>

      {/* Friend Cards */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="setlists-skeleton-card">
          <Skeleton variant="circle" width={48} height={48} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <Skeleton width={i % 2 === 0 ? '50%' : '65%'} height={18} borderRadius={6} />
            <Skeleton width="40%" height={13} borderRadius={4} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Skeleton width={74} height={32} borderRadius={14} style={{ background: 'var(--skeleton-accent-tint)' }} />
            <Skeleton width={32} height={32} borderRadius={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   9. CHURCH FEED SKELETON (Եկեղեցի)
   ========================================================= */
export function ChurchFeedSkeleton() {
  return (
    <div className="wp-skeleton-root church-feed-skeleton animate-fade-in" aria-busy="true">
      {/* Church Hero Card */}
      <div className="church-hero-skeleton">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Skeleton variant="circle" width={60} height={60} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="70%" height={22} borderRadius={8} />
            <Skeleton width="45%" height={14} borderRadius={4} />
          </div>
        </div>

        {/* 4 Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 6, overflowX: 'hidden' }}>
          <Skeleton width={80} height={30} borderRadius={14} style={{ background: 'var(--skeleton-accent-tint)' }} />
          <Skeleton width={75} height={30} borderRadius={14} />
          <Skeleton width={85} height={30} borderRadius={14} />
          <Skeleton width={70} height={30} borderRadius={14} />
        </div>
      </div>

      {/* Feed Post Cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="church-post-skeleton">
          {/* Post Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skeleton variant="circle" width={40} height={40} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Skeleton width={120} height={16} borderRadius={5} />
              <Skeleton width={70} height={12} borderRadius={3} />
            </div>
          </div>

          {/* Post Text */}
          <Skeleton width="95%" height={16} borderRadius={5} />
          <Skeleton width="85%" height={16} borderRadius={5} />
          <Skeleton width="60%" height={16} borderRadius={5} />

          {/* Post Image Thumbnail */}
          {i === 1 && <Skeleton width="100%" height={150} borderRadius={14} style={{ marginTop: 4 }} />}

          {/* Post Footer Actions */}
          <div style={{ display: 'flex', gap: 16, paddingTop: 6, borderTop: '1px solid var(--skeleton-card-border)' }}>
            <Skeleton width={50} height={20} borderRadius={6} />
            <Skeleton width={50} height={20} borderRadius={6} />
            <Skeleton width={40} height={20} borderRadius={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   10. NEWS & ARTICLE SKELETON (Նորություններ)
   ========================================================= */
export function NewsSkeleton() {
  return (
    <div className="wp-skeleton-root news-skeleton animate-fade-in" aria-busy="true">
      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={74} height={32} borderRadius={16} style={{ background: 'var(--skeleton-accent-tint)' }} />
        <Skeleton width={100} height={32} borderRadius={16} />
        <Skeleton width={90} height={32} borderRadius={16} />
      </div>

      {/* Featured News Cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="news-card-skeleton">
          {/* 16:9 Thumbnail Image */}
          <Skeleton width="100%" height={170} borderRadius={16} />

          {/* Tag & Date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width={80} height={22} borderRadius={8} style={{ background: 'var(--skeleton-accent-tint)' }} />
            <Skeleton width={70} height={14} borderRadius={4} />
          </div>

          {/* Title & Excerpt */}
          <Skeleton width="85%" height={22} borderRadius={6} />
          <Skeleton width="96%" height={15} borderRadius={4} />
          <Skeleton width="65%" height={15} borderRadius={4} />
        </div>
      ))}
    </div>
  );
}

export function NewsArticleSkeleton() {
  return (
    <div className="wp-skeleton-root news-article-skeleton animate-fade-in" aria-busy="true">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton width={36} height={36} borderRadius={12} />
        <Skeleton width={80} height={24} borderRadius={10} style={{ background: 'var(--skeleton-accent-tint)' }} />
      </div>

      {/* Title */}
      <Skeleton width="90%" height={28} borderRadius={8} />
      <Skeleton width="65%" height={28} borderRadius={8} />
      <Skeleton width={140} height={14} borderRadius={4} />

      {/* Hero Banner */}
      <Skeleton width="100%" height={210} borderRadius={20} />

      {/* Article Body */}
      <Skeleton width="100%" height={17} borderRadius={5} />
      <Skeleton width="95%" height={17} borderRadius={5} />
      <Skeleton width="90%" height={17} borderRadius={5} />
      <Skeleton width="75%" height={17} borderRadius={5} />

      <Skeleton width={160} height={22} borderRadius={6} style={{ marginTop: 12 }} />
      <Skeleton width="98%" height={17} borderRadius={5} />
      <Skeleton width="92%" height={17} borderRadius={5} />
      <Skeleton width="60%" height={17} borderRadius={5} />
    </div>
  );
}

/* =========================================================
   11. MOBILE HUB SKELETON (Գլխավոր էջ)
   ========================================================= */
export function MobileHubSkeleton() {
  return (
    <div className="wp-skeleton-root mobile-hub-skeleton animate-fade-in" aria-busy="true">
      {/* Top Greeting Bar */}
      <div className="hub-skeleton-greeting">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton variant="circle" width={42} height={42} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Skeleton width={130} height={18} borderRadius={5} />
            <Skeleton width={80} height={13} borderRadius={3} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={36} height={36} borderRadius={12} />
          <Skeleton width={36} height={36} borderRadius={12} />
        </div>
      </div>

      {/* Daily Verse Hero Card */}
      <div className="hub-skeleton-verse-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={86} height={22} borderRadius={8} style={{ background: 'var(--skeleton-accent-tint)' }} />
          <Skeleton width={70} height={14} borderRadius={4} />
        </div>
        <Skeleton width="55%" height={20} borderRadius={6} />
        <Skeleton width="94%" height={16} borderRadius={5} />
        <Skeleton width="88%" height={16} borderRadius={5} />
        <Skeleton width="60%" height={16} borderRadius={5} />

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Skeleton width={100} height={32} borderRadius={14} style={{ background: 'var(--skeleton-accent-tint)' }} />
          <Skeleton width={80} height={32} borderRadius={14} />
          <Skeleton width={80} height={32} borderRadius={14} />
        </div>
      </div>

      {/* Quick Nav 4-Item Grid */}
      <div className="hub-skeleton-quick-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="hub-skeleton-quick-item">
            <Skeleton width={54} height={54} borderRadius={18} />
            <Skeleton width={50} height={13} borderRadius={4} />
          </div>
        ))}
      </div>

      {/* Upcoming Service Card */}
      <div className="setlists-skeleton-card">
        <Skeleton width={48} height={48} borderRadius={14} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="70%" height={18} borderRadius={6} />
          <Skeleton width="45%" height={13} borderRadius={4} />
        </div>
        <Skeleton width={20} height={20} borderRadius={6} />
      </div>

      {/* Recent Songs Carousel placeholder */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'hidden' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={140} height={100} borderRadius={16} />
            <Skeleton width="80%" height={15} borderRadius={5} />
            <Skeleton width="50%" height={12} borderRadius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   12. SUPPORT & CONTACT SKELETON
   ========================================================= */
export function SupportContactSkeleton() {
  return (
    <div className="wp-skeleton-root" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px', maxWidth: 720, margin: '0 auto' }} aria-busy="true">
      <Skeleton width={160} height={26} borderRadius={8} />
      <Skeleton width="100%" height={44} borderRadius={16} />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="wp-skeleton-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="75%" height={18} borderRadius={6} />
            <Skeleton width={20} height={20} borderRadius={6} />
          </div>
        </div>
      ))}
      <div className="wp-skeleton-card" style={{ padding: '20px', alignItems: 'center', textAlign: 'center' }}>
        <Skeleton width={120} height={22} borderRadius={6} />
        <Skeleton width={180} height={14} borderRadius={4} />
        <Skeleton width={140} height={38} borderRadius={16} style={{ marginTop: 6 }} />
      </div>
    </div>
  );
}

/* =========================================================
   13. MODAL LIST SKELETON (Մոդալների ցանկեր)
   ========================================================= */
export function ModalListSkeleton({ rows = 4 }) {
  return (
    <div className="modal-list-skeleton wp-skeleton-root" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="modal-row-skeleton">
          <Skeleton width={38} height={38} borderRadius={10} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <Skeleton width={i % 2 === 0 ? '65%' : '80%'} height={16} borderRadius={5} />
            <Skeleton width="40%" height={12} borderRadius={4} />
          </div>
          <Skeleton width={28} height={28} borderRadius={8} style={{ flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   14. ROUTE SKELETON FALLBACK (Էջին համապատասխան Route Fallback)
   ========================================================= */
export function RouteSkeletonFallback({ pathname }) {
  const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');

  if (currentPath.startsWith('/song/')) {
    return <SongViewSkeleton />;
  }
  if (currentPath.startsWith('/songs')) {
    return <SongsPageSkeleton />;
  }
  if (currentPath.startsWith('/setlist/') || currentPath.startsWith('/setlist-editor/')) {
    return <SetlistEditorSkeleton />;
  }
  if (currentPath.startsWith('/setlists')) {
    return <SetlistsAppSkeleton />;
  }
  if (currentPath.startsWith('/bible')) {
    return <BibleChapterSkeleton />;
  }
  if (currentPath.startsWith('/chat/')) {
    return <ChatThreadSkeleton />;
  }
  if (currentPath.startsWith('/chats')) {
    return <ChatsListSkeleton />;
  }
  if (currentPath.startsWith('/profile') || currentPath.startsWith('/user/')) {
    return <UserProfileSkeleton />;
  }
  if (currentPath.startsWith('/friends')) {
    return <FriendsSkeleton />;
  }
  if (currentPath.startsWith('/news/') && currentPath.length > 6) {
    return <NewsArticleSkeleton />;
  }
  if (currentPath.startsWith('/news')) {
    return <NewsSkeleton />;
  }
  if (currentPath.startsWith('/church')) {
    return <ChurchFeedSkeleton />;
  }
  if (currentPath.startsWith('/support')) {
    return <SupportContactSkeleton />;
  }

  // Home / Default Fallback
  return <MobileHubSkeleton />;
}
