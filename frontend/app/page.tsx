"use client";

import { useState } from "react";

export default function Home() {
  const [series, setSeries] = useState("");
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const response = await fetch(
      `http://127.0.0.1:8000/generate?series=${encodeURIComponent(series)}`
    );
    const data = await response.json();
    setPlaylist(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">🎵 StoryTunes</h1>

      <input
        type="text"
        placeholder="Enter a movie, show, or book..."
        value={series}
        onChange={(e) => setSeries(e.target.value)}
        className="text-black px-4 py-2 rounded w-80 mb-4"
      />

      <button
        onClick={handleGenerate}
        className="bg-purple-600 px-6 py-2 rounded font-semibold"
      >
        {loading ? "Generating..." : "Generate Playlist"}
      </button>

      {playlist && (
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold">{playlist.title}</h2>
          <p className="text-gray-400 mb-4">{playlist.theme}</p>
          <ul>
            {playlist.songs.map((song: any, i: number) => (
              <li key={i} className="mb-1">
                {song.name} — {song.artist}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}