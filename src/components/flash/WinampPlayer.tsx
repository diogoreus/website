import { useState, useRef, useEffect, useCallback } from 'react';
import { trackWinampControl, trackWinampTrackChange, trackWinampInteraction } from '../../scripts/analytics';

interface Track {
  title: string;
  artist: string;
  src: string;
}

interface WinampPlayerProps {
  className?: string;
}

const playlist: Track[] = [
  { title: 'Electric Dreams', artist: 'Diogo Reus', src: '/audio/track1.mp3' },
  { title: 'Pixel Perfect', artist: 'Diogo Reus', src: '/audio/track2.mp3' },
  { title: 'Flash Forward', artist: 'Diogo Reus', src: '/audio/track3.mp3' },
];

export default function WinampPlayer({ className = '' }: WinampPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [userVolume, setUserVolume] = useState(0.75);
  const [spectrumData, setSpectrumData] = useState<number[]>(new Array(16).fill(20));
  const [hasAudio, setHasAudio] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);

  const currentTrack = playlist[currentTrackIndex];

  // Initialize Web Audio API for spectrum analyzer
  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }, []);

  // Animate spectrum analyzer
  const updateSpectrum = useCallback(() => {
    if (!analyserRef.current || !isPlaying) {
      // Generate fake spectrum when not playing or no analyser
      if (!isPlaying) {
        setSpectrumData(prev => prev.map(() => 15 + Math.random() * 10));
      }
      animationRef.current = requestAnimationFrame(updateSpectrum);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Map to 16 bars
    const bars = [];
    const step = Math.floor(dataArray.length / 16);
    for (let i = 0; i < 16; i++) {
      const value = dataArray[i * step];
      bars.push(Math.max(15, (value / 255) * 100));
    }
    setSpectrumData(bars);

    animationRef.current = requestAnimationFrame(updateSpectrum);
  }, [isPlaying]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateSpectrum);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [updateSpectrum]);

  // Era visibility fade effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const ratio = entries[0].intersectionRatio;
        const targetVolume = ratio > 0.3 ? userVolume : userVolume * (ratio / 0.3);
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, Math.min(1, targetVolume));
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1] }
    );

    // Observe the Flash era section
    const flashSection = document.getElementById('era-flash');
    if (flashSection) {
      observer.observe(flashSection);
    }

    return () => observer.disconnect();
  }, [userVolume]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (currentTrackIndex < playlist.length - 1) {
        setCurrentTrackIndex(prev => prev + 1);
      } else {
        setCurrentTrackIndex(0);
        setIsPlaying(false);
      }
    };
    const handleError = () => {
      setHasAudio(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrackIndex]);

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    }
  }, [currentTrackIndex]);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = async () => {
    if (!audioRef.current) return;

    initAudioContext();

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      trackWinampControl('play', currentTrackIndex);
    } catch (e) {
      // Autoplay blocked - user interaction required
      console.log('Playback requires user interaction');
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    trackWinampControl('pause', currentTrackIndex);
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    trackWinampControl('stop', currentTrackIndex);
  };

  const handlePrev = () => {
    const newIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    trackWinampTrackChange(currentTrackIndex, newIndex);
    setCurrentTrackIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentTrackIndex === playlist.length - 1 ? 0 : currentTrackIndex + 1;
    trackWinampTrackChange(currentTrackIndex, newIndex);
    setCurrentTrackIndex(newIndex);
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, x / rect.width));
    setVolume(newVolume);
    setUserVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    trackWinampInteraction('volume', newVolume);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    trackWinampInteraction('seek', newTime / duration);
  };

  const seekProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} className={`winamp-player ${className}`}>
      <audio ref={audioRef} src={currentTrack.src} preload="metadata" />

      {/* Title bar */}
      <div className="winamp-titlebar">
        <div className="titlebar-left">
          <span className="winamp-logo">&#9654;</span>
          <span className="titlebar-text">WINAMP</span>
        </div>
        <div className="titlebar-buttons">
          <button className="title-btn minimize" aria-label="Minimize">_</button>
          <button className="title-btn maximize" aria-label="Maximize">&#9633;</button>
          <button className="title-btn close" aria-label="Close">&#215;</button>
        </div>
      </div>

      {/* Display area */}
      <div className="winamp-display">
        <div className="display-inner">
          {/* Bitrate/kHz info */}
          <div className="display-info">
            <span className="info-item bitrate">320</span>
            <span className="info-label">kbps</span>
            <span className="info-item khz">44</span>
            <span className="info-label">kHz</span>
            <span className="info-item stereo">stereo</span>
          </div>

          {/* Track time */}
          <div className="display-time">
            <span className="time-current">{formatTime(currentTime)}</span>
            <span className="time-separator">/</span>
            <span className="time-total">{formatTime(duration)}</span>
          </div>

          {/* Scrolling track name */}
          <div className="display-marquee">
            <div className="marquee-content" style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}>
              <span>{currentTrack.artist} - {currentTrack.title}</span>
              <span className="marquee-spacer">***</span>
              <span>{currentTrack.artist} - {currentTrack.title}</span>
              {!hasAudio && <span className="marquee-spacer">[DEMO MODE]</span>}
            </div>
          </div>

          {/* Spectrum analyzer */}
          <div className="spectrum-analyzer">
            {spectrumData.map((height, i) => (
              <div
                key={i}
                className="spectrum-bar"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Seek bar */}
      <div className="winamp-seekbar">
        <div className="seek-track" onClick={handleSeek}>
          <div className="seek-progress" style={{ width: `${seekProgress}%` }} />
          <div className="seek-handle" style={{ left: `${seekProgress}%` }} />
        </div>
      </div>

      {/* Control buttons */}
      <div className="winamp-controls">
        <button className="control-btn prev" aria-label="Previous" onClick={handlePrev}>
          <span>&#9664;&#9664;</span>
        </button>
        <button
          className={`control-btn play ${isPlaying ? 'active' : ''}`}
          aria-label="Play"
          onClick={handlePlay}
        >
          <span>&#9654;</span>
        </button>
        <button
          className={`control-btn pause ${!isPlaying && currentTime > 0 ? 'active' : ''}`}
          aria-label="Pause"
          onClick={handlePause}
        >
          <span>&#10074;&#10074;</span>
        </button>
        <button className="control-btn stop" aria-label="Stop" onClick={handleStop}>
          <span>&#9632;</span>
        </button>
        <button className="control-btn next" aria-label="Next" onClick={handleNext}>
          <span>&#9654;&#9654;</span>
        </button>
        <button className="control-btn eject" aria-label="Eject">
          <span>&#9167;</span>
        </button>
      </div>

      {/* Volume and balance */}
      <div className="winamp-sliders">
        <div className="slider-group">
          <span className="slider-label">VOL</span>
          <div className="slider-track" onClick={handleVolumeChange}>
            <div className="slider-fill" style={{ width: `${volume * 100}%` }} />
            <div className="slider-notches">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="notch" />
              ))}
            </div>
          </div>
        </div>
        <div className="slider-group">
          <span className="slider-label">BAL</span>
          <div className="slider-track balance">
            <div className="slider-center-marker" />
            <div className="slider-fill balance-fill" style={{ width: '50%', left: '25%' }} />
          </div>
        </div>
      </div>

      {/* Playlist indicator */}
      <div className="winamp-playlist">
        <span className="playlist-label">Track {currentTrackIndex + 1}/{playlist.length}</span>
      </div>

      {/* EQ button */}
      <div className="winamp-extras">
        <button className="extra-btn eq active">EQ</button>
        <button className="extra-btn pl">PL</button>
      </div>

      <style>{`
        .winamp-player {
          width: 280px;
          background: linear-gradient(180deg, #3a3a4a 0%, #2a2a38 50%, #1a1a25 100%);
          border-radius: 8px;
          padding: 4px;
          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          user-select: none;
        }

        /* Title bar */
        .winamp-titlebar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          background: linear-gradient(180deg, #4a4a5a 0%, #3a3a48 100%);
          border-radius: 4px 4px 0 0;
        }

        .titlebar-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .winamp-logo {
          color: #00ff00;
          font-size: 0.6rem;
          filter: drop-shadow(0 0 3px #00ff00);
        }

        .titlebar-text {
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.1em;
        }

        .titlebar-buttons {
          display: flex;
          gap: 3px;
        }

        .title-btn {
          width: 14px;
          height: 14px;
          border: none;
          border-radius: 2px;
          font-size: 0.6rem;
          line-height: 1;
          cursor: pointer;
          background: #3a3a48;
          color: #888;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .title-btn:hover {
          background: #4a4a58;
          color: #fff;
        }

        .title-btn.close:hover {
          background: #ff4444;
        }

        /* Display area */
        .winamp-display {
          background: #000000;
          border-radius: 4px;
          margin: 4px;
          padding: 8px;
          border: 2px inset #1a1a25;
        }

        .display-inner {
          position: relative;
        }

        .display-info {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 6px;
        }

        .info-item {
          color: #00ff00;
          text-shadow: 0 0 5px #00ff00;
        }

        .info-label {
          color: #008800;
          font-size: 0.55rem;
        }

        .info-item.stereo {
          margin-left: auto;
          color: #00ff00;
          font-size: 0.55rem;
        }

        .display-time {
          color: #00ff00;
          font-size: 1.1rem;
          text-shadow: 0 0 8px #00ff00;
          margin-bottom: 6px;
          font-variant-numeric: tabular-nums;
        }

        .time-separator,
        .time-total {
          color: #008800;
        }

        /* Scrolling marquee */
        .display-marquee {
          overflow: hidden;
          background: #001100;
          padding: 2px 4px;
          border-radius: 2px;
          margin-bottom: 8px;
        }

        .marquee-content {
          display: flex;
          gap: 1rem;
          white-space: nowrap;
          color: #00ff00;
          font-size: 0.65rem;
          animation: marquee 10s linear infinite;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .marquee-spacer {
          color: #008800;
        }

        /* Spectrum analyzer */
        .spectrum-analyzer {
          display: flex;
          gap: 2px;
          height: 24px;
          align-items: flex-end;
          background: #001100;
          padding: 2px;
          border-radius: 2px;
        }

        .spectrum-bar {
          flex: 1;
          background: linear-gradient(0deg, #00ff00 0%, #88ff00 50%, #ffff00 100%);
          border-radius: 1px;
          transition: height 0.05s ease-out;
          box-shadow: 0 0 3px rgba(0, 255, 0, 0.5);
          min-height: 15%;
        }

        /* Seek bar */
        .winamp-seekbar {
          padding: 4px 8px;
        }

        .seek-track {
          position: relative;
          height: 8px;
          background: linear-gradient(180deg, #1a1a25 0%, #2a2a38 100%);
          border-radius: 4px;
          border: 1px inset #0a0a10;
          cursor: pointer;
        }

        .seek-progress {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(180deg, #00cc00 0%, #008800 100%);
          border-radius: 3px;
          transition: width 0.1s linear;
        }

        .seek-handle {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: linear-gradient(180deg, #4a4a5a 0%, #3a3a48 100%);
          border-radius: 50%;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.5);
          transition: left 0.1s linear;
        }

        /* Control buttons */
        .winamp-controls {
          display: flex;
          justify-content: center;
          gap: 4px;
          padding: 8px;
        }

        .control-btn {
          width: 28px;
          height: 20px;
          border: none;
          border-radius: 3px;
          background: linear-gradient(180deg, #4a4a5a 0%, #2a2a38 100%);
          color: #888;
          font-size: 0.6rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 2px 3px rgba(0, 0, 0, 0.3);
          transition: all 0.1s ease;
        }

        .control-btn:hover {
          background: linear-gradient(180deg, #5a5a6a 0%, #3a3a48 100%);
          color: #fff;
        }

        .control-btn:active {
          transform: translateY(1px);
          box-shadow:
            inset 0 1px 3px rgba(0, 0, 0, 0.3),
            0 1px 1px rgba(0, 0, 0, 0.2);
        }

        .control-btn.active,
        .control-btn.play.active {
          color: #00ff00;
          text-shadow: 0 0 5px #00ff00;
        }

        /* Sliders */
        .winamp-sliders {
          display: flex;
          gap: 12px;
          padding: 4px 12px;
        }

        .slider-group {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .slider-label {
          color: #888;
          font-size: 0.55rem;
          width: 20px;
        }

        .slider-track {
          flex: 1;
          height: 6px;
          background: linear-gradient(180deg, #1a1a25 0%, #2a2a38 100%);
          border-radius: 3px;
          border: 1px inset #0a0a10;
          position: relative;
          cursor: pointer;
        }

        .slider-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(180deg, #00cc00 0%, #008800 100%);
          border-radius: 2px;
          pointer-events: none;
        }

        .slider-track.balance .slider-fill {
          left: auto;
        }

        .slider-center-marker {
          position: absolute;
          left: 50%;
          top: -2px;
          bottom: -2px;
          width: 2px;
          background: #3a3a48;
        }

        .slider-notches {
          display: flex;
          justify-content: space-between;
          position: absolute;
          inset: 0;
          padding: 0 2px;
          pointer-events: none;
        }

        .notch {
          width: 1px;
          height: 100%;
          background: rgba(0, 0, 0, 0.3);
        }

        /* Playlist indicator */
        .winamp-playlist {
          padding: 2px 12px;
          text-align: center;
        }

        .playlist-label {
          color: #00ff00;
          font-size: 0.55rem;
          text-shadow: 0 0 5px #00ff00;
        }

        /* Extra buttons */
        .winamp-extras {
          display: flex;
          gap: 4px;
          padding: 4px 12px 8px;
          justify-content: flex-end;
        }

        .extra-btn {
          padding: 2px 8px;
          border: none;
          border-radius: 3px;
          background: linear-gradient(180deg, #3a3a48 0%, #2a2a38 100%);
          color: #666;
          font-size: 0.55rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .extra-btn:hover {
          color: #888;
        }

        .extra-btn.active {
          background: linear-gradient(180deg, #2a2a38 0%, #1a1a25 100%);
          color: #00ff00;
          text-shadow: 0 0 5px #00ff00;
          box-shadow:
            inset 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .winamp-player {
            width: 100%;
            max-width: 280px;
          }
        }
      `}</style>
    </div>
  );
}
