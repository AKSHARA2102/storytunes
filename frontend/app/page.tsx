"use client";

import { useState, useEffect } from "react";

const DURATION_OPTIONS_MIN = [10, 15, 20, 30, 45, 60, 90, 120, 150, 180];

const EXAMPLE_SERIES = ["Harry Potter", "Interstellar", "Arcane", "The Hunger Games", "Attack on Titan"];

const LOADING_STEPS = [
  "Reading the story...",
  "Finding important moments...",
  "Matching emotions to melodies...",
  "Curating the final tracklist...",
];

const TYPING_PHRASES = [
  "Every Story Has a Soundtrack.",
  "Every Character Has a Theme.",
  "Every Scene Has a Melody.",
  "Every Emotion Has a Beat.",
];

export default function Home() {
  const [series, setSeries] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [removedSongs, setRemovedSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [validationError, setValidationError] = useState("");
  const [spotifyResult, setSpotifyResult] = useState<any>(null);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  
  // Dynamic background bubble state
  const [bubbles, setBubbles] = useState<any[]>([]);

  // Theme state & hydration protection
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  // Typing animation states
  const [typedText, setTypedText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);

  // Theme mount effects
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Generate random background bubbles on client-mount
    const newBubbles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 20 + 8, // size range 8px to 28px
      left: Math.random() * 100, // horizontal positioning percentage
      delay: Math.random() * 12, // stagger animation start
      duration: Math.random() * 15 + 15, // float-up duration between 15s and 30s
      color: Math.random() > 0.5 ? "rgba(229, 9, 20, 0.08)" : "rgba(29, 185, 84, 0.08)",
    }));
    setBubbles(newBubbles);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Typing animation lifecycle hook
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = TYPING_PHRASES[phraseIndex];
    
    const handleTyping = () => {
      if (!isDeleting) {
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
        setTypingSpeed(80);
        
        if (typedText === currentPhrase) {
          timer = setTimeout(() => setIsDeleting(true), 2200);
          return;
        }
      } else {
        setTypedText(currentPhrase.substring(0, typedText.length - 1));
        setTypingSpeed(45);
        
        if (typedText === "") {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % TYPING_PHRASES.length);
        }
      }
    };

    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [typedText, isDeleting, phraseIndex, typingSpeed]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/spotify-status")
      .then((res) => res.json())
      .then((data) => setSpotifyConnected(data.connected))
      .catch(() => setSpotifyConnected(false));
  }, []);

  useEffect(() => {
    if (series) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % EXAMPLE_SERIES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [series]);

  useEffect(() => {
    if (!loading) {
      setLoadingStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 1400);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleGenerate() {
    if (!series.trim()) {
      setValidationError("Please enter a movie, show, or book title first.");
      setPlaylist(null);
      return;
    }
    setValidationError("");
    setSpotifyResult(null);
    setPlaylist(null);
    setSongs([]);
    setRemovedSongs([]);
    setLoading(true);

    const response = await fetch(
      `http://127.0.0.1:8000/generate?series=${encodeURIComponent(series)}&duration_minutes=${durationMinutes}`
    );
    const data = await response.json();
    setPlaylist(data);
    if (data.songs) setSongs(data.songs);
    setLoading(false);
  }

  async function handleAddToSpotify() {
    setCreatingPlaylist(true);
    const response = await fetch("http://127.0.0.1:8000/create-playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: playlist.title,
        songs: songs.map((s: any) => ({ name: s.name, artist: s.artist })),
      }),
    });
    const data = await response.json();
    setSpotifyResult(data);
    setCreatingPlaylist(false);
    if (data.playlist_url) setSpotifyConnected(true);
  }

  function removeSong(index: number) {
    const song = songs[index];
    setSongs(songs.filter((_, i) => i !== index));
    setRemovedSongs([...removedSongs, song]);
  }

  function restoreSong(index: number) {
    const song = removedSongs[index];
    setRemovedSongs(removedSongs.filter((_, i) => i !== index));
    setSongs([...songs, song]);
  }

  function moveSong(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= songs.length) return;
    const updated = [...songs];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setSongs(updated);
  }

  // Cover presets using elegant Spotify-like combinations
  const gradients = [
    "from-zinc-800 to-zinc-950 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-700/30",
    "from-red-950 to-zinc-900 dark:from-red-950 dark:to-zinc-950 border border-red-900/30",
    "from-emerald-950 to-zinc-900 dark:from-emerald-950 dark:to-zinc-950 border border-emerald-900/30",
    "from-zinc-900 to-red-950 dark:from-zinc-900 dark:to-red-950 border border-red-900/20",
    "from-zinc-900 to-emerald-950 dark:from-zinc-900 dark:to-emerald-950 border border-emerald-900/20",
  ];

  function estimatedSongCount(minutes: number) {
    return Math.max(3, Math.min(Math.round(minutes / 3.5), 40));
  }

  function shuffleSongs() {
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSongs(shuffled);
  }

  return (
    <main className="relative min-h-screen text-zinc-900 dark:text-zinc-100 flex flex-col items-center px-4 sm:px-6 py-12 overflow-hidden transition-colors duration-500">
      
      {/* Dynamic Floating Particles / Bubbles Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="absolute rounded-full pointer-events-none animate-bubble-float opacity-0"
            style={{
              width: `${b.size}px`,
              height: `${b.size}px`,
              left: `${b.left}%`,
              backgroundColor: b.color,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              filter: "blur(1.5px)",
            }}
          />
        ))}
      </div>

      {/* Background Aura Elements (Floating Blobs behind the grid) */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-red-500/15 dark:bg-red-900/15 rounded-full blur-[100px] animate-float-1 opacity-70" />
      <div className="pointer-events-none absolute top-1/4 -right-40 w-[35rem] h-[35rem] bg-emerald-500/15 dark:bg-emerald-900/15 rounded-full blur-[120px] animate-float-2 opacity-70" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 w-[30rem] h-[30rem] bg-zinc-400/15 dark:bg-zinc-800/10 rounded-full blur-[100px] animate-float-3 opacity-60" />

      {/* Top Navbar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-16 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e50914] to-[#1db954] flex items-center justify-center shadow-lg shadow-red-900/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
            StoryTunes
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Spotify Connection State */}
          {spotifyConnected ? (
            <div className="flex items-center gap-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-emerald-500/20 dark:border-emerald-500/10 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected</span>
            </div>
          ) : (
            <a
              href="http://127.0.0.1:8000/login"
              className="flex items-center gap-2 bg-white/60 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition duration-350"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              Connect Spotify
            </a>
          )}

          {/* Theme Switcher Button */}
          {theme !== null && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition duration-300 shadow-sm cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative text-center mb-12 max-w-3xl z-10 px-2">
        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 dark:border-red-900/30 text-xs font-semibold tracking-wider text-red-650 dark:text-red-400">
          AI PLAYLIST GENERATOR
        </div>
        
        {/* Dynamic Typing Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif tracking-tight mb-4 min-h-[80px] sm:min-h-[100px] md:min-h-[120px] bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent flex items-center justify-center">
          <span>{typedText}</span>
          <span className="inline-block w-1.5 h-9 sm:h-12 ml-1.5 bg-red-650 dark:bg-emerald-500 animate-pulse select-none" />
        </h1>

        <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base md:text-lg max-w-xl mx-auto font-sans mt-3">
          Turn any movie, show, or book into a custom music playlist that seamlessly translates its narrative emotional arc.
        </p>
      </section>

      {/* Input Box Card */}
      {!loading && (
        <section className="relative w-full max-w-xl bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/60 z-10 transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700 animate-[fadeIn_0.5s_ease-out]">
          <div className="relative mb-6">
            <input
              type="text"
              placeholder={`Try "${EXAMPLE_SERIES[placeholderIndex]}"...`}
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              disabled={loading}
              className="w-full bg-zinc-100/50 dark:bg-[#0d0d0f] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 px-4 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:border-red-500/50 dark:focus:border-emerald-500/40 outline-none transition-all duration-300 disabled:opacity-50 text-base shadow-inner"
            />
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Playlist duration</span>
              <span className="text-sm font-bold text-red-650 dark:text-emerald-400 transition-colors duration-300">
                {durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)} hr${durationMinutes % 60 ? ` ${durationMinutes % 60} min` : ""}`} · ≈ {estimatedSongCount(durationMinutes)} songs
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={DURATION_OPTIONS_MIN.length - 1}
              step={1}
              value={DURATION_OPTIONS_MIN.indexOf(durationMinutes)}
              disabled={loading}
              onChange={(e) => setDurationMinutes(DURATION_OPTIONS_MIN[Number(e.target.value)])}
              className="w-full accent-[#1db954] disabled:opacity-50"
            />
            <div className="flex justify-between text-[11px] font-medium text-zinc-400 dark:text-zinc-600 mt-2">
              <span>10 min</span>
              <span>3 hr</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#e50914] to-[#c10711] hover:from-[#c10711] hover:to-[#a0060e] text-white py-3.5 rounded-xl font-bold tracking-wide transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-red-500/20 dark:shadow-red-900/10 disabled:opacity-75 disabled:hover:scale-100 disabled:pointer-events-none cursor-pointer"
          >
            Generate Playlist
          </button>

          {validationError && (
            <p className="mt-4 text-red-650 dark:text-red-400 text-sm text-center font-medium animate-[fadeIn_0.3s_ease-out]">{validationError}</p>
          )}
        </section>
      )}

      {/* Immersive Spinning Film-Vinyl Record Deck (Turntable Loader) */}
      {loading && (
        <section className="relative w-full max-w-sm bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-2xl dark:shadow-black/70 z-10 flex flex-col items-center gap-6 animate-[fadeIn_0.4s_ease-out]">
          
          {/* Turntable Platter Plinth */}
          <div className="relative w-56 h-56 rounded-full bg-zinc-200 dark:bg-zinc-950 flex items-center justify-center shadow-inner border-4 border-zinc-300/40 dark:border-zinc-900/60 overflow-hidden">
            
            {/* Ambient Record Platter Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 via-transparent to-emerald-500/10" />

            {/* Spinning Vinyl Record Platter */}
            <div className="vinyl-grooves w-48 h-48 rounded-full border-4 border-zinc-800 dark:border-zinc-900 shadow-xl relative flex items-center justify-center animate-[spin_6s_linear_infinite]">
              
              {/* Film-Strip sprocket holes border layout (symbolizes Story + Tunes) */}
              <div className="absolute inset-2.5 rounded-full border-2 border-dashed border-zinc-700/50 dark:border-zinc-800/80 opacity-60" />

              {/* Record Center Label */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e50914] to-[#1db954] flex items-center justify-center text-[9px] font-bold text-white text-center p-2.5 shadow-md select-none leading-tight border border-zinc-900/30">
                STORY<br/>TUNES
              </div>

              {/* Center Spindle pin */}
              <div className="absolute w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-800 border border-zinc-500 dark:border-zinc-700" />
            </div>

            {/* Pivot Stylus Tone Arm (drops onto record when active) */}
            <div className="absolute top-2 right-4 w-6 h-36 origin-top transition-transform duration-1000 transform rotate-[18deg]">
              {/* Metallic Arm shaft */}
              <div className="w-1 bg-gradient-to-b from-zinc-300 to-zinc-500 h-28 mx-auto shadow-sm" />
              {/* Headshell Stylus Needle cartridge */}
              <div className="w-3 h-5 bg-zinc-800 dark:bg-zinc-700 rounded-sm mx-auto shadow relative">
                {/* Micro Red stylus indicator light */}
                <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>

            {/* Tone Arm Pivot Base */}
            <div className="absolute top-2 right-5 w-6 h-6 rounded-full bg-zinc-300 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 shadow-md" />

            {/* Rippling Soundwaves radiating from contact point */}
            <div className="absolute bottom-16 right-16 w-8 h-8 rounded-full border border-emerald-500/40 animate-ping opacity-75" />
            <div className="absolute bottom-16 right-16 w-8 h-8 rounded-full border border-red-500/30 animate-ping opacity-50 [animation-delay:0.3s]" />
          </div>
          
          {/* Loading Processing Step Messaging */}
          <div className="w-full text-center">
            <p key={loadingStepIndex} className="text-zinc-700 dark:text-zinc-200 text-sm font-bold mb-4 tracking-wide animate-[fadeIn_0.3s_ease-out]">
              {LOADING_STEPS[loadingStepIndex]}
            </p>
            
            {/* Progress indicators */}
            <div className="flex gap-2 justify-center">
              {LOADING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i <= loadingStepIndex 
                      ? "w-8 bg-gradient-to-r from-[#e50914] to-[#1db954]" 
                      : "w-2 bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State Banner */}
      {!playlist && !loading && (
        <section className="relative text-center mt-16 text-zinc-400 dark:text-zinc-500 z-10">
          <p className="text-4xl mb-3 animate-[pulse-glow_4s_infinite]">✨</p>
          <p className="font-medium text-sm">No playlist yet. Enter your favorite story above.</p>
        </section>
      )}

      {/* Resulting Playlist Tracklist */}
      {playlist && !playlist.error && !loading && (
        <section className="relative w-full max-w-2xl mt-16 z-10 animate-[fadeIn_0.5s_ease-out]">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-3 tracking-tight">{playlist.title}</h2>
            <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              🎵 Theme: {playlist.theme}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{songs.length} tracks</span>
            
            <button
              onClick={shuffleSongs}
              className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-white/60 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 transition shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Shuffle
            </button>
          </div>

          {/* Staggered list fade & slide animations */}
          <div className="space-y-2.5">
            {songs.map((song: any, i: number) => {
              const gradientIndex = i % gradients.length;

              return (
                <div
                  key={`${song.name}-${i}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  className="group relative flex items-center gap-3 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/85 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-705 rounded-xl px-4 py-3.5 transition-all duration-300 shadow-sm animate-track-fade"
                >
                  {/* Track ordering controls (visible on hover) */}
                  <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -left-8 md:relative md:left-0 md:mr-1">
                    <button
                      onClick={() => moveSong(i, -1)}
                      disabled={i === 0}
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20 transition cursor-pointer"
                      aria-label="Move track up"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M7 14l5-5 5 5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSong(i, 1)}
                      disabled={i === songs.length - 1}
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20 transition cursor-pointer"
                      aria-label="Move track down"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M7 10l5 5 5-5z" />
                      </svg>
                    </button>
                  </div>

                  {/* Track number / Play icon state */}
                  <div className="w-6 text-center text-zinc-400 dark:text-zinc-500 text-sm font-semibold shrink-0 group-hover:hidden">
                    {i + 1}
                  </div>
                  <div className="w-6 text-center text-red-650 dark:text-emerald-450 text-xs shrink-0 hidden group-hover:flex justify-center">
                    ▶
                  </div>

                  {/* Album Cover */}
                  {song.album_image_url ? (
                    <img
                      src={song.album_image_url}
                      alt={song.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 shadow-md border border-zinc-200 dark:border-zinc-800"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradients[gradientIndex]} shrink-0 flex items-center justify-center shadow-md`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-zinc-500 dark:text-zinc-400">
                        <path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}

                  {/* Song Metadata */}
                  <div className="min-w-0 flex-1 font-sans">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{song.name}</p>
                      {song.genre && (
                        <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 px-2 py-0.5 rounded-full text-zinc-500 dark:text-zinc-400">
                          {song.genre}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{song.artist}</p>
                  </div>

                  {/* Custom logic reason explanation */}
                  <div className="hidden lg:block max-w-[35%] text-[11px] text-zinc-500 dark:text-zinc-450 italic opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0 select-none pr-2 font-sans">
                    {song.reason}
                  </div>

                  {/* Remove Track Button */}
                  <button
                    onClick={() => removeSong(i)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-650 hover:bg-red-500/10 dark:hover:bg-red-500/15 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Remove track"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Recover Removed Tracks */}
          {removedSongs.length > 0 && (
            <div className="mt-6 p-4 bg-zinc-100/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
              <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-3 uppercase tracking-wider font-sans">Recently Removed</p>
              <div className="flex flex-wrap gap-2">
                {removedSongs.map((song, i) => (
                  <button
                    key={`${song.name}-${i}`}
                    onClick={() => restoreSong(i)}
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-550 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1.5 transition-all shadow-sm hover:scale-[1.02] font-sans cursor-pointer"
                  >
                    <span className="text-[#1db954] font-bold">+</span>
                    <span>{song.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Spotify Save Actions */}
          <div className="text-center mt-12">
            <button
              onClick={handleAddToSpotify}
              disabled={creatingPlaylist || songs.length === 0}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs uppercase tracking-widest px-10 py-4 rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:hover:scale-100 disabled:pointer-events-none font-sans cursor-pointer"
            >
              {creatingPlaylist ? "Adding to Spotify..." : "Save to Spotify"}
            </button>

            {spotifyResult?.playlist_url && (
              <div className="mt-6 p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl max-w-md mx-auto animate-[fadeIn_0.4s_ease-out] font-sans">
                <a
                  href={spotifyResult.playlist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline text-sm block mb-1"
                >
                  Open on Spotify ↗
                </a>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Imported {spotifyResult.tracks_found} of {spotifyResult.tracks_requested} songs successfully!
                </span>
              </div>
            )}

            {spotifyResult?.error === "not_connected" && (
              <p className="mt-4 text-red-550 dark:text-red-400 text-sm font-medium font-sans">
                Please connect your Spotify account in the top bar before trying to save.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Playlist Error States */}
      {playlist && playlist.error === "unrecognized_series" && !loading && (
        <section className="relative mt-12 p-6 bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 rounded-2xl text-center max-w-md z-10 animate-[fadeIn_0.3s_ease-out] font-sans">
          <p className="text-red-600 dark:text-red-400 font-bold mb-1">Unrecognized Title</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
            We couldn't match "{series}" to any movie, book, or show. Please verify the spelling or try a more well-known work.
          </p>
        </section>
      )}

      {playlist && playlist.error && playlist.error !== "unrecognized_series" && !loading && (
        <section className="relative mt-12 p-6 bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 rounded-2xl text-center max-w-md z-10 animate-[fadeIn_0.3s_ease-out] font-sans">
          <p className="text-red-655 dark:text-red-400 font-bold mb-1">Generation Failed</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">
            An unexpected error occurred while curating your playlist. Please try again.
          </p>
        </section>
      )}
    </main>
  );
}
