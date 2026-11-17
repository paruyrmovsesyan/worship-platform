import { useState, useRef, useEffect, useCallback } from 'react';
import { CHRISTIAN_RADIO_STATIONS, MediaContext } from '../utils/mediaData';

export function MediaProvider({ children }) {
  const audioRef = useRef(null);
  const [activeStation, setActiveStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [muted, setMuted] = useState(false);
  const [streamError, setStreamError] = useState('');

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      setStreamError('');
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };
    const handleError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
      setStreamError('Աուդիո հոսքը ժամանակավորապես անհասանելի է');
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const playStation = useCallback(async (station = CHRISTIAN_RADIO_STATIONS[0]) => {
    const audio = audioRef.current;
    if (!audio || !station) return;
    setStreamError('');

    if (activeStation?.id === station.id) {
      if (isPlaying) {
        audio.pause();
        return;
      }
      setIsBuffering(true);
      try {
        await audio.play();
      } catch {
        setIsBuffering(false);
        setStreamError('Սեղմեք կրկին՝ նվագարկելու համար');
      }
      return;
    }

    setActiveStation(station);
    setIsBuffering(true);
    audio.src = station.streamUrl;
    audio.muted = muted;
    try {
      await audio.play();
    } catch {
      setIsBuffering(false);
      setStreamError('Չհաջողվեց միանալ ռադիո հոսքին');
    }
  }, [activeStation, isPlaying, muted]);

  const stopRadio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setActiveStation(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setStreamError('');
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  return (
    <MediaContext.Provider
      value={{
        activeStation,
        isPlaying,
        isBuffering,
        muted,
        streamError,
        playStation,
        stopRadio,
        toggleMute,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}
