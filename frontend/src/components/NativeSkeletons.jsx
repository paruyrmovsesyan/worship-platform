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

export function SongViewSkeleton() {
  return (
    <div className="wp-skeleton-root song-view-skeleton animate-fade-in" aria-busy="true">
      {/* Top action row */}
      <div className="sv-skeleton-topbar">
        <Skeleton width={38} height={38} borderRadius={12} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={38} height={38} borderRadius={12} />
          <Skeleton width={38} height={38} borderRadius={12} />
          <Skeleton width={38} height={38} borderRadius={12} />
        </div>
      </div>

      {/* Song Hero Header */}
      <div className="sv-skeleton-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton width={36} height={24} borderRadius={8} />
          <Skeleton width="60%" height={26} borderRadius={8} />
        </div>
        <Skeleton width="40%" height={16} borderRadius={6} />
        <div className="sv-skeleton-toolbar" style={{ marginTop: 6 }}>
          <Skeleton width={64} height={28} borderRadius={14} />
          <Skeleton width={64} height={28} borderRadius={14} />
          <Skeleton width={80} height={28} borderRadius={14} />
        </div>
      </div>

      {/* Repeating Chords & Lyrics Strophes */}
      {[1, 2, 3].map((strophe) => (
        <div key={strophe} className="sv-skeleton-strophe">
          <Skeleton width={50} height={18} borderRadius={6} />
          <div className="sv-skeleton-chord-row">
            <Skeleton width={30} height={16} borderRadius={4} />
            <Skeleton width={30} height={16} borderRadius={4} />
            <Skeleton width={30} height={16} borderRadius={4} />
          </div>
          <Skeleton width="88%" height={18} borderRadius={6} />
          <div className="sv-skeleton-chord-row">
            <Skeleton width={30} height={16} borderRadius={4} />
            <Skeleton width={30} height={16} borderRadius={4} />
          </div>
          <Skeleton width="75%" height={18} borderRadius={6} />
        </div>
      ))}
    </div>
  );
}

export function SetlistsAppSkeleton() {
  return (
    <div className="wp-skeleton-root setlists-skeleton animate-fade-in" aria-busy="true">
      {/* Search & Actions */}
      <div className="setlists-skeleton-header">
        <Skeleton width="100%" height={46} borderRadius={16} />
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
          <Skeleton width={80} height={32} borderRadius={16} />
          <Skeleton width={90} height={32} borderRadius={16} />
          <Skeleton width={85} height={32} borderRadius={16} />
        </div>
      </div>

      {/* Setlist Cards */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="setlists-skeleton-card">
          <Skeleton width={48} height={48} borderRadius={14} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="65%" height={20} borderRadius={6} />
            <div style={{ display: 'flex', gap: 10 }}>
              <Skeleton width={70} height={14} borderRadius={4} />
              <Skeleton width={50} height={14} borderRadius={4} />
            </div>
          </div>
          <Skeleton width={32} height={20} borderRadius={10} />
        </div>
      ))}
    </div>
  );
}

export function SetlistEditorSkeleton() {
  return (
    <div className="wp-skeleton-root setlist-editor-skeleton animate-fade-in" aria-busy="true">
      {/* Hero Header */}
      <div className="wp-skeleton-card">
        <Skeleton width="50%" height={24} borderRadius={8} />
        <Skeleton width="35%" height={16} borderRadius={6} />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Skeleton width={80} height={30} borderRadius={12} />
          <Skeleton width={80} height={30} borderRadius={12} />
        </div>
      </div>

      {/* Song Items List */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="se-skeleton-item">
          <Skeleton width={24} height={24} borderRadius={6} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="55%" height={18} borderRadius={6} />
            <Skeleton width="30%" height={14} borderRadius={4} />
          </div>
          <Skeleton width={44} height={22} borderRadius={8} />
        </div>
      ))}
    </div>
  );
}

export function ChatsListSkeleton() {
  return (
    <div className="wp-skeleton-root chats-list-skeleton animate-fade-in" aria-busy="true">
      {/* Search Header */}
      <Skeleton width="100%" height={44} borderRadius={16} />

      {/* Chat Rows */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="chat-row-skeleton">
          <Skeleton variant="circle" width={48} height={48} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width="45%" height={18} borderRadius={6} />
              <Skeleton width={40} height={12} borderRadius={4} />
            </div>
            <Skeleton width="75%" height={14} borderRadius={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatThreadSkeleton() {
  return (
    <div className="wp-skeleton-root chat-thread-skeleton animate-fade-in" aria-busy="true">
      {/* Chat Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--skeleton-card-border)' }}>
        <Skeleton width={34} height={34} borderRadius={10} />
        <Skeleton variant="circle" width={38} height={38} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width={120} height={18} borderRadius={6} />
          <Skeleton width={60} height={12} borderRadius={4} />
        </div>
      </div>

      {/* Message Bubbles */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-end', overflow: 'hidden' }}>
        <div className="chat-bubble-skeleton left">
          <Skeleton width={160} height={16} borderRadius={4} />
          <Skeleton width={90} height={12} borderRadius={4} />
        </div>
        <div className="chat-bubble-skeleton right">
          <Skeleton width={200} height={16} borderRadius={4} />
          <Skeleton width={130} height={16} borderRadius={4} />
          <Skeleton width={70} height={10} borderRadius={4} style={{ alignSelf: 'flex-end' }} />
        </div>
        <div className="chat-bubble-skeleton left">
          <Skeleton width={180} height={16} borderRadius={4} />
          <Skeleton width={120} height={16} borderRadius={4} />
        </div>
        <div className="chat-bubble-skeleton right">
          <Skeleton width={140} height={16} borderRadius={4} />
        </div>
      </div>

      {/* Composer Input Bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Skeleton width="100%" height={46} borderRadius={24} />
        <Skeleton variant="circle" width={42} height={42} />
      </div>
    </div>
  );
}

export function FriendsSkeleton() {
  return (
    <div className="wp-skeleton-root friends-skeleton animate-fade-in" aria-busy="true">
      <Skeleton width="100%" height={44} borderRadius={16} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={90} height={32} borderRadius={16} />
        <Skeleton width={90} height={32} borderRadius={16} />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="setlists-skeleton-card">
          <Skeleton variant="circle" width={46} height={46} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="50%" height={18} borderRadius={6} />
            <Skeleton width="30%" height={14} borderRadius={4} />
          </div>
          <Skeleton width={70} height={30} borderRadius={14} />
        </div>
      ))}
    </div>
  );
}

export function UserProfileSkeleton() {
  return (
    <div className="wp-skeleton-root user-profile-skeleton animate-fade-in" aria-busy="true">
      <div className="up-skeleton-avatar-wrap">
        <Skeleton variant="circle" width={88} height={88} />
        <Skeleton width={140} height={22} borderRadius={8} />
        <Skeleton width={90} height={14} borderRadius={6} />
      </div>

      <div className="up-skeleton-stats">
        <Skeleton width={80} height={50} borderRadius={14} />
        <Skeleton width={80} height={50} borderRadius={14} />
        <Skeleton width={80} height={50} borderRadius={14} />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        <Skeleton width="100%" height={54} borderRadius={16} />
        <Skeleton width="100%" height={54} borderRadius={16} />
        <Skeleton width="100%" height={54} borderRadius={16} />
      </div>
    </div>
  );
}

export function ChurchFeedSkeleton() {
  return (
    <div className="wp-skeleton-root church-feed-skeleton animate-fade-in" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="church-card-skeleton">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skeleton variant="circle" width={38} height={38} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width={110} height={16} borderRadius={6} />
              <Skeleton width={60} height={12} borderRadius={4} />
            </div>
            <Skeleton width={70} height={22} borderRadius={10} />
          </div>
          <Skeleton width="80%" height={18} borderRadius={6} />
          <Skeleton width="95%" height={14} borderRadius={4} />
          <Skeleton width="65%" height={14} borderRadius={4} />
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Skeleton width={50} height={26} borderRadius={12} />
            <Skeleton width={50} height={26} borderRadius={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsSkeleton() {
  return (
    <div className="wp-skeleton-root news-skeleton animate-fade-in" aria-busy="true">
      <Skeleton width="60%" height={28} borderRadius={10} />
      <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
        <Skeleton width={70} height={30} borderRadius={14} />
        <Skeleton width={80} height={30} borderRadius={14} />
        <Skeleton width={75} height={30} borderRadius={14} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="news-card-skeleton">
          <Skeleton width="100%" height={140} borderRadius={14} />
          <Skeleton width={80} height={18} borderRadius={8} />
          <Skeleton width="85%" height={20} borderRadius={6} />
          <Skeleton width="95%" height={14} borderRadius={4} />
        </div>
      ))}
    </div>
  );
}

export function NewsArticleSkeleton() {
  return (
    <div className="wp-skeleton-root news-skeleton animate-fade-in" aria-busy="true">
      <Skeleton width={40} height={40} borderRadius={12} />
      <Skeleton width="100%" height={190} borderRadius={18} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Skeleton width={80} height={22} borderRadius={10} />
        <Skeleton width={90} height={14} borderRadius={6} />
      </div>
      <Skeleton width="90%" height={26} borderRadius={8} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <Skeleton width="100%" height={16} borderRadius={6} />
        <Skeleton width="96%" height={16} borderRadius={6} />
        <Skeleton width="92%" height={16} borderRadius={6} />
        <Skeleton width="70%" height={16} borderRadius={6} />
      </div>
    </div>
  );
}

export function ModalListSkeleton({ rows = 4 }) {
  return (
    <div className="wp-skeleton-root modal-list-skeleton animate-fade-in" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="modal-row-skeleton">
          <Skeleton width={36} height={36} borderRadius={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="60%" height={16} borderRadius={6} />
            <Skeleton width="35%" height={12} borderRadius={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SupportContactSkeleton() {
  return (
    <div className="wp-skeleton-root" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-busy="true">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="wp-skeleton-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="70%" height={18} borderRadius={6} />
            <Skeleton width={20} height={20} borderRadius={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SongsListSkeleton() {
  return (
    <div className="wp-skeleton-root" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 14px 96px' }} aria-busy="true">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="track-item skeleton-item" style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Skeleton width={48} height={48} borderRadius={12} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="65%" height={16} borderRadius={6} />
            <Skeleton width="35%" height={13} borderRadius={4} />
          </div>
          <Skeleton width={32} height={20} borderRadius={8} />
        </div>
      ))}
    </div>
  );
}
