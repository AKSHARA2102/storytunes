"use client";

import { useState } from "react";

const DURATION_OPTIONS_MIN = [10, 15, 20, 30, 45, 60, 90, 120, 150, 180];

export default function Home() {
  const [series, setSeries] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [durationUnit, setDurationUnit] = useState("min");
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  async function handleGenerate() {
    if (!series.trim()) {
      setValidationError("Please enter a movie, show, or book title first.");
      setPlaylist(null);
      return;
    }
    setValidationError("");
    setLoading(true);

    const response = await fetch(
      `http://127.0.0.1:8000/generate?series=${encodeURIComponent(series)}&duration_minutes=${durationMinutes}`
    );
    const data = await response.json();
    setPlaylist(data);
    setLoading(false);
  }

  function displayLabel(minutes: number) {
    if (durationUnit === "hr") {
      return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} hr`;
    }
    return `${minutes} min`;
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">🎵 StoryTunes</h1>

      <input
        type="text"
        placeholder="Enter a movie, show, or book..."
        value={series}
        onChange={(e) => setSeries(e.target.value)}
        className="bg-white text-black px-4 py-2 rounded w-80 mb-4"
      />

      <div className="flex items-center gap-2 mb-6">
        <select
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="bg-white text-black px-3 py-2 rounded w-32"
        >
          {DURATION_OPTIONS_MIN.map((m) => (
            <option key={m} value={m}>
              {displayLabel(m)}
            </option>
          ))}
        </select>

        <select
          value={durationUnit}
          onChange={(e) => setDurationUnit(e.target.value)}
          className="bg-white text-black px-3 py-2 rounded"
        >
          <option value="min">show as minutes</option>
          <option value="hr">show as hours</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        className="bg-purple-600 px-6 py-2 rounded font-semibold"
      >
        {loading ? "Generating..." : "Generate Playlist"}
      </button>

      {validationError && (
        <p className="mt-4 text-yellow-400">{validationError}</p>
      )}

      {playlist && !playlist.error && (
        <div className="mt-8 text-center max-w-xl">
          <h2 className="text-2xl font-bold">{playlist.title}</h2>
          <p className="text-gray-400 mb-4">{playlist.theme}</p>
          <ul>
            {playlist.songs?.map((song: any, i: number) => (
              <li key={i} className="mb-2">
                <span className="font-semibold">{song.name}</span> — {song.artist}
                {song.genre && (
                  <span className="text-xs bg-purple-800 px-2 py-0.5 rounded ml-2">{song.genre}</span>
                )}
                <div className="text-sm text-gray-500">{song.reason}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {playlist && playlist.error === "unrecognized_series" && (
        <p className="mt-6 text-yellow-400">
          I couldn't confidently recognize "{series}" as a movie, book, or show. Please check the spelling or try a different title.
        </p>
      )}

      {playlist && playlist.error && playlist.error !== "unrecognized_series" && (
        <p className="mt-6 text-red-400">Something went wrong generating the playlist. Try again.</p>
      )}
    </main>
  );
}