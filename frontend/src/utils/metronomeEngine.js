/**
 * Smart Metronome & Visual Click Engine (Web Audio API)
 * Sample-accurate timing, offline synthesized clicks, and visual pulse dispatch.
 */

class MetronomeEngine {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.bpm = 120;
    this.beatsPerBar = 4;
    this.currentBeat = 0;
    this.nextNoteTime = 0.0;
    this.scheduleAheadTime = 0.1; // seconds
    this.timerWorker = null;
    this.timerId = null;
    this.soundType = 'woodblock'; // 'woodblock' | 'digital' | 'beep' | 'cowbell'
    this.volume = 0.8;
    this.listeners = new Set();
    this.tapTimes = [];
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event) {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('Metronome listener error:', err);
      }
    });
  }

  setBpm(bpm) {
    const val = Math.max(30, Math.min(280, Math.round(bpm)));
    this.bpm = val;
    this.notify({ type: 'bpm_change', bpm: val });
  }

  setBeatsPerBar(beats) {
    this.beatsPerBar = Math.max(1, Math.min(16, Math.round(beats)));
    this.notify({ type: 'signature_change', beatsPerBar: this.beatsPerBar });
  }

  setSoundType(type) {
    this.soundType = type;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  playClick(time, isAccent) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const baseVol = this.volume;

    if (this.soundType === 'digital') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(isAccent ? 1760 : 880, time);
      gain.gain.setValueAtTime(baseVol * (isAccent ? 0.9 : 0.6), time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
      osc.start(time);
      osc.stop(time + 0.04);
    } else if (this.soundType === 'cowbell') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 800 : 540, time);
      gain.gain.setValueAtTime(baseVol * 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
      osc.start(time);
      osc.stop(time + 0.09);
    } else if (this.soundType === 'beep') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 1400 : 900, time);
      gain.gain.setValueAtTime(baseVol * 0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      osc.start(time);
      osc.stop(time + 0.05);
    } else {
      // Woodblock (warm, percussive band default)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);
      gain.gain.setValueAtTime(baseVol * (isAccent ? 1.0 : 0.7), time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
      osc.start(time);
      osc.stop(time + 0.035);
    }
  }

  scheduler() {
    if (!this.isPlaying || !this.audioCtx) return;

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      const isAccent = this.currentBeat === 0;
      this.playClick(this.nextNoteTime, isAccent);

      // Schedule visual notification synchronously with audio delay
      const beatNum = this.currentBeat + 1;
      const delayMs = Math.max(0, (this.nextNoteTime - this.audioCtx.currentTime) * 1000);

      setTimeout(() => {
        if (this.isPlaying) {
          this.notify({
            type: 'beat',
            beat: beatNum,
            totalBeats: this.beatsPerBar,
            isAccent,
            bpm: this.bpm,
          });
        }
      }, delayMs);

      // Advance to next beat
      const secondsPerBeat = 60.0 / this.bpm;
      this.nextNoteTime += secondsPerBeat;
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerBar;
    }
  }

  start() {
    this.initAudio();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioCtx ? this.audioCtx.currentTime + 0.05 : 0;

    const runLoop = () => {
      if (!this.isPlaying) return;
      this.scheduler();
      this.timerId = window.requestAnimationFrame(runLoop);
    };

    runLoop();
    this.notify({ type: 'start', bpm: this.bpm, beatsPerBar: this.beatsPerBar });
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      window.cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
    this.currentBeat = 0;
    this.notify({ type: 'stop' });
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  tapTempo() {
    const now = Date.now();
    // Reset if last tap was more than 2.5 seconds ago
    if (this.tapTimes.length > 0 && now - this.tapTimes[this.tapTimes.length - 1] > 2500) {
      this.tapTimes = [];
    }

    this.tapTimes.push(now);
    if (this.tapTimes.length > 5) {
      this.tapTimes.shift();
    }

    if (this.tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this.tapTimes.length; i++) {
        intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 0) {
        const calculatedBpm = Math.round(60000 / avgInterval);
        this.setBpm(calculatedBpm);
        return calculatedBpm;
      }
    }
    return this.bpm;
  }
}

export const metronomeEngine = new MetronomeEngine();
