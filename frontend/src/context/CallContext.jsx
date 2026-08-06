import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useWebRtcAudioCall } from '../hooks/useWebRtcAudioCall';
import AudioCallModal from '../components/AudioCallModal';

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export function CallProvider({ children }) {
  const { user } = useAuth();
  const userId = Number(user?.id || user?.user_id || 0);
  const audioCall = useWebRtcAudioCall(0, userId);

  return (
    <CallContext.Provider value={audioCall}>
      {children}
      {user && <AudioCallModal {...audioCall} />}
    </CallContext.Provider>
  );
}
