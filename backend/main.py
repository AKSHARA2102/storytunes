import os
import json
from typing import List
from urllib import response
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import google.generativeai as genai
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from spotipy.exceptions import SpotifyException
import requests

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

sp_oauth = SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI"),
    scope="playlist-modify-public playlist-modify-private",
    cache_path=".spotify_cache",
)


@app.get("/")
def read_root():
    return {"message": "StoryTunes backend is alive"}


@app.get("/generate")
def generate_playlist(series: str, duration_minutes: int = 30, attempt: int = 1):
    estimated_songs = round(duration_minutes / 3.5)
    estimated_songs = max(3, min(estimated_songs, 40))

    prompt = f"""You are a music curator creating a playlist inspired by "{series}".

First, check: do you have reliable knowledge of a real movie, book, or TV show called
"{series}"? If you do NOT recognize this title with reasonable confidence, respond with
ONLY this JSON and nothing else: {{"error": "unrecognized_series"}}

If you do recognize it, think carefully about:
- The full story, not just the main character: important relationships and dynamics
  between characters (including fan-favorite pairings or dynamics, even between
  side characters), major plot twists, and turning points.
- The story's original language, setting, and cultural context. If the story is not
  originally in English, prefer songs in that original language or a closely related
  one, unless that would make good songs hard to find - use your judgment.
- Whether the story has well-known official soundtrack/score pieces, theme songs, or
  end-credit songs. If such songs strongly capture the story's emotional identity,
  include one or two of them alongside independently-released songs.
- Whether any songs are widely and specifically associated with this story in popular
  culture - include one if you're confident such an association exists, but do not
  guess or invent one you're not sure about.
- Matching each song's mood, lyrics, and tone to a specific emotional beat of the story,
  not just a generic genre match.
- Arrange songs in the same order as the story's actual emotional/chronological arc,
  from beginning to end.

This is attempt number {attempt}. If attempt is greater than 1, deliberately choose a
noticeably different angle, mood emphasis, or genre mix than a typical first attempt,
since the user was unsatisfied with a previous result.

The playlist should be approximately {duration_minutes} minutes long in total.

Return ONLY valid JSON, no other text, no markdown formatting, in exactly this shape:

{{
  "title": "a short, evocative playlist title",
  "theme": "a short arrow-separated emotional journey, e.g. Wonder -> Friendship -> Loss -> Hope",
  "songs": [
    {{"name": "song name", "artist": "artist name", "genre": "short genre/style tag", "reason": "one sentence on why this fits"}}
  ]
}}

Include exactly {estimated_songs} songs."""

    response = model.generate_content(prompt)
    raw_text = response.text.strip()

    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        playlist_data = json.loads(raw_text)
    except json.JSONDecodeError:
        return {"error": "AI did not return valid JSON", "raw": raw_text}

    if playlist_data.get("error") == "unrecognized_series":
        return {"error": "unrecognized_series", "series": series}

    playlist_data["series"] = series
    playlist_data["requested_duration"] = duration_minutes
    return playlist_data


@app.get("/login")
def spotify_login():
    auth_url = sp_oauth.get_authorize_url()
    return RedirectResponse(auth_url)


@app.get("/callback")
def spotify_callback(code: str):
    sp_oauth.get_access_token(code)
    # Send the user back to your frontend after Spotify approves access
    return RedirectResponse("http://localhost:3000?spotify_connected=true")

@app.get("/spotify-status")
def spotify_status():
    token_info = sp_oauth.get_cached_token()
    return {"connected": token_info is not None}


class Song(BaseModel):
    name: str
    artist: str


class PlaylistRequest(BaseModel):
    title: str
    songs: List[Song]




@app.post("/create-playlist")
def create_playlist(request: PlaylistRequest):
    token_info = sp_oauth.get_cached_token()
    print("Token info:", token_info)  # Debugging line
    if not token_info:
        return {"error": "not_connected"}

    sp = spotipy.Spotify(auth=token_info["access_token"])
    user_id = sp.current_user()["id"]
    print("User ID:", user_id)  # Debugging line

    try:
        import requests

        headers = {
    "Authorization": f"Bearer {token_info['access_token']}",
    "Content-Type": "application/json"
}

        payload = {
    "name": request.title,
    "public": True,
    "description": "Created by StoryTunes"
}

        response = requests.post("https://api.spotify.com/v1/me/playlists",headers=headers,json=payload)

        print(response.status_code)
        print(response.text)
        playlist = response.json()

      
    except SpotifyException as e:
        print("SpotifyException:", e)  # Debugging line
        return {"error": "spotify_error", "details": str(e)}

    track_uris = []
    for song in request.songs:
        query = f"track:{song.name} artist:{song.artist}"
        results = sp.search(q=query, type="track", limit=1)
        items = results["tracks"]["items"]
        if items:
            track_uris.append(items[0]["uri"])

    if track_uris:
        sp.playlist_add_items(playlist["id"], track_uris)

    return {
        "playlist_url": playlist["external_urls"]["spotify"],
        "tracks_found": len(track_uris),
        "tracks_requested": len(request.songs),
    }



@app.get("/debug-playlist-test")
def debug_playlist_test():
    token_info = sp_oauth.get_cached_token()
    if not token_info:
        return {"error": "not_connected"}

    access_token = token_info["access_token"]
    user_id_response = requests.get(
        "https://api.spotify.com/v1/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    user_id = user_id_response.json().get("id")

    response = requests.post(
        f"https://api.spotify.com/v1/users/{user_id}/playlists",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json={"name": "Debug Test Playlist", "public": True}
    )

    return {
        "status_code": response.status_code,
        "raw_body": response.text,
        "user_id": user_id
    }