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

export default function Home() {
  const [series, setSeries] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [validationError, setValidationError] = useState("");
  const [spotifyResult, setSpotifyResult] = useState<any>(null);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

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
    setLoading(true);

    const response = await fetch(
      `http://127.0.0.1:8000/generate?series=${encodeURIComponent(series)}&duration_minutes=${durationMinutes}`
    );
    const data = await response.json();
    setPlaylist(data);
    setLoading(false);
  }

  async function handleAddToSpotify() {
    setCreatingPlaylist(true);
    const response = await fetch("http://127.0.0.1:8000/create-playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: playlist.title,
        songs: playlist.songs.map((s: any) => ({ name: s.name, artist: s.artist })),
      }),
    });
    const data = await response.json();
    setSpotifyResult(data);
    setCreatingPlaylist(false);
    if (data.playlist_url) setSpotifyConnected(true);
  }

  function estimatedSongCount(minutes: number) {
    return Math.max(3, Math.min(Math.round(minutes / 3.5), 40));
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
  }

  return (
    <main className="relative min-h-screen bg-[#0a0712] text-white flex flex-col items-center px-6 py-16 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-[28rem] h-[28rem] bg-rose-600/20 rounded-full blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-float-slow" />

      {/* Spotify connection chip - top right */}
      <div className="absolute top-6 right-6 z-10">
        {spotifyConnected ? (
          <div className="flex items-center gap-2 bg-white/5 border border-green-500/20 rounded-full px-4 py-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-white/70">Spotify Connected</span>
          </div>
        ) : (
          <a
            href="http://127.0.0.1:8000/login"
            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition"
          >
            <span className="w-2 h-2 rounded-full bg-white/20" />
            Connect Spotify
          </a>
        )}
      </div>

      <div className="relative text-center mb-12 max-w-2xl animate-fade-in-up">
        <div className="inline-block mb-4 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs tracking-wide text-indigo-300">
          AI-CURATED · STORY-DRIVEN
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-indigo-300 via-rose-300 to-amber-200 bg-clip-text text-transparent">
          Every Story Has a Soundtrack
        </h1>
        <p className="text-white/50 text-lg">
          Turn any movie, show, or book into a playlist that follows its emotional arc.
        </p>
      </div>

      <div className="relative w-full max-w-xl backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl shadow-indigo-900/30 animate-fade-in-up">
        <input
          type="text"
          placeholder={`Try "${EXAMPLE_SERIES[placeholderIndex]}"...`}
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          disabled={loading}
          className="w-full bg-white/10 text-white placeholder-white/30 px-4 py-3 rounded-xl mb-6 border border-white/10 focus:border-indigo-400/50 outline-none transition disabled:opacity-50"
        />

        {/* Duration slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/50">Playlist duration</span>
            <span className="text-sm font-semibold text-indigo-300">
              {formatDuration(durationMinutes)} · ≈ {estimatedSongCount(durationMinutes)} songs
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={DURATION_OPTIONS_MIN.length - 1}
            step={1}
            value={DURATION_OPTIONS_MIN.indexOf(durationMinutes)}
            onChange={(e) => setDurationMinutes(DURATION_OPTIONS_MIN[Number(e.target.value)])}
            disabled={loading}
            className="w-full accent-indigo-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-white/25 mt-1">
            <span>10 min</span>
            <span>3 hr</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-600 hover:brightness-110 transition py-3 rounded-xl font-semibold shadow-lg shadow-indigo-900/40 disabled:opacity-70"
        >
          {loading ? "Working on it..." : "Generate Playlist"}
        </button>

        {validationError && (
          <p className="mt-3 text-yellow-400 text-sm text-center animate-fade-in">{validationError}</p>
        )}
      </div>

      {loading && (
        <div className="relative flex flex-col items-center mt-16 animate-fade-in">
          <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin mb-5" />
          <p key={loadingStepIndex} className="text-white/70 text-sm animate-fade-in mb-3">
            {LOADING_STEPS[loadingStepIndex]}
          </p>
          <div className="flex gap-1.5">
            {LOADING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= loadingStepIndex ? "w-6 bg-indigo-400" : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {!playlist && !loading && (
        <div className="relative text-center mt-16 text-white/30 animate-fade-in">
          <p className="text-3xl mb-2">✨</p>
          <p>No playlist yet. Enter your favorite story above.</p>
        </div>
      )}

      {playlist && !playlist.error && !loading && (
        <div className="relative w-full max-w-2xl mt-14">
          <div className="text-center mb-8 animate-fade-in-up">
            <h2 className="text-3xl font-bold mb-2">{playlist.title}</h2>
            <p className="text-rose-300/70 text-sm tracking-wide">{playlist.theme}</p>
          </div>

          <div className="space-y-3">
            {playlist.songs?.map((song: any, i: number) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-fade-in-up group backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-indigo-400/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/30 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{song.name}</span>
                    <span className="text-white/50"> — {song.artist}</span>
                  </div>
                  {song.genre && (
                    <span className="text-xs bg-gradient-to-r from-indigo-800/50 to-rose-800/50 border border-white/10 px-3 py-1 rounded-full text-white/80">
                      {song.genre}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/40 mt-1">{song.reason}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 animate-fade-in-up">
            <button
              onClick={handleAddToSpotify}
              disabled={creatingPlaylist}
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 transition px-8 py-3 rounded-xl font-semibold shadow-lg shadow-green-900/40 disabled:opacity-70"
            >
              {creatingPlaylist ? "Adding to Spotify..." : "Add to Spotify"}
            </button>

            {spotifyResult?.playlist_url && (
              <p className="mt-4 animate-fade-in">
                <a
                  href={spotifyResult.playlist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline"
                >
                  Open your playlist on Spotify
                </a>
                <br />
                <span className="text-sm text-white/40">
                  Found {spotifyResult.tracks_found} of {spotifyResult.tracks_requested} songs
                </span>
              </p>
            )}

            {spotifyResult?.error === "not_connected" && (
              <p className="mt-4 text-yellow-400 text-sm animate-fade-in">
                Please click "Connect Spotify" above first, then try again.
              </p>
            )}
          </div>
        </div>
      )}

      {playlist && playlist.error === "unrecognized_series" && !loading && (
        <p className="relative mt-10 text-yellow-400 text-center animate-fade-in">
          Couldn't recognize "{series}" as a movie, book, or show.<br />
          <span className="text-white/40 text-sm">Try checking the spelling, or a more well-known title.</span>
        </p>
      )}

      {playlist && playlist.error && playlist.error !== "unrecognized_series" && !loading && (
        <p className="relative mt-10 text-red-400 text-center animate-fade-in">Something went wrong generating the playlist. Try again.</p>
      )}
    </main>
  );
}