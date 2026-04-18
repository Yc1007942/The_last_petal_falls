/**
 * Audio Manager — Howler.js wrapper + Web Audio API synthesis
 */
import { Howl, Howler } from 'howler';

class AudioManager {
  constructor() {
    this.tracks = {};
    this.currentBGM = null;
    this.initialized = false;
    this.audioCtx = null;
    this.glitchOsc = null;
    this.glitchGain = null;
  }

  /**
   * Initialize all audio tracks
   */
  init() {
    // BGM tracks
    this.tracks.illusion = new Howl({
      src: ['/audio/music_normal_1.mp3'],
      loop: true,
      volume: 0,
      preload: true,
    });

    this.tracks.struggle = new Howl({
      src: ['/audio/music_normal_2.mp3'],
      loop: true,
      volume: 0,
      preload: true,
    });

    this.tracks.storm = new Howl({
      src: ['/audio/music_decaying.mp3'],
      loop: true,
      volume: 0,
      preload: true,
    });

    // Rebirth reuses the illusion track at lower volume with different rate
    this.tracks.rebirth = new Howl({
      src: ['/audio/music_normal_1.mp3'],
      loop: true,
      volume: 0,
      rate: 0.85,  // slightly slower
      preload: true,
    });

    // Set up Web Audio API for synthetic SFX
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this._setupGlitchSynth();

    this.initialized = true;
  }

  /**
   * Set up reusable glitch synth nodes
   */
  _setupGlitchSynth() {
    // Master gain for glitch sounds
    this.glitchGain = this.audioCtx.createGain();
    this.glitchGain.gain.value = 0;
    this.glitchGain.connect(this.audioCtx.destination);
  }

  /**
   * Play/crossfade to a BGM track
   * @param {string} name - track name
   * @param {number} fadeDuration - seconds
   */
  playBGM(name, fadeDuration = 2) {
    const track = this.tracks[name];
    if (!track) return;

    // Fade out current
    if (this.currentBGM && this.currentBGM !== name) {
      const old = this.tracks[this.currentBGM];
      if (old.playing()) {
        old.fade(old.volume(), 0, fadeDuration * 1000);
        const oldName = this.currentBGM;
        setTimeout(() => {
          if (this.currentBGM !== oldName) {
            this.tracks[oldName].stop();
          }
        }, fadeDuration * 1000 + 100);
      }
    }

    // Fade in new
    if (!track.playing()) {
      track.play();
    }
    const targetVol = name === 'rebirth' ? 0.35 : 0.55;
    track.fade(track.volume(), targetVol, fadeDuration * 1000);
    this.currentBGM = name;
  }

  /**
   * Synthesize and play a harsh glitch SFX
   * Used when forcefully healing entities
   */
  playGlitchSFX() {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Create a short burst of filtered noise
    const bufferSize = ctx.sampleRate * 0.08; // 80ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter sweep for that harsh, synthetic feel
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.06);
    filter.Q.value = 8;

    // Gain envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    // Distortion
    const distortion = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = (Math.PI + 10) * x / (Math.PI + 10 * Math.abs(x));
    }
    distortion.curve = curve;

    source.connect(filter);
    filter.connect(distortion);
    distortion.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.08);
  }

  /**
   * Play thunder SFX
   */
  playThunder() {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Brown noise burst
    const bufferSize = ctx.sampleRate * 2.5; // 2.5 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastVal = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastVal = (lastVal + 0.02 * white) / 1.02;
      data[i] = lastVal * 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 2);

    // Volume envelope — sharp attack, long decay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + 2.5);
  }

  /**
   * Play ambient wind chime for rebirth
   */
  playWindChime() {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const ctx = this.audioCtx;
    // Pentatonic frequencies (C, D, E, G, A across octaves)
    const freqs = [523, 587, 659, 784, 880, 1047, 1175];

    const playNote = (delay) => {
      const now = ctx.currentTime + delay;
      const freq = freqs[Math.floor(Math.random() * freqs.length)];

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2);
    };

    // Play 3-4 notes with random timing
    const noteCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < noteCount; i++) {
      playNote(Math.random() * 4);
    }
  }

  /**
   * Unlock audio context on user interaction
   */
  unlock() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    // Howler auto-handles unlock but just in case
    Howler.ctx && Howler.ctx.resume && Howler.ctx.resume();
  }

  /**
   * Duck BGM volume when glitch is playing
   */
  duckBGM(duration = 0.1) {
    if (!this.currentBGM) return;
    const track = this.tracks[this.currentBGM];
    const baseVol = this.currentBGM === 'rebirth' ? 0.35 : 0.55;
    
    track.fade(track.volume(), baseVol * 0.3, 50);
    
    if (this._duckTimeout) clearTimeout(this._duckTimeout);
    
    this._duckTimeout = setTimeout(() => {
      track.fade(track.volume(), baseVol, duration * 1000);
    }, 80);
  }
}

export const audioManager = new AudioManager();
