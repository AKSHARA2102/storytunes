import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai

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
  culture (for example, a song that became strongly linked to this series/movie/book
  through fan edits or social media, if you have reliable knowledge of that
  association) - include one if you're confident such a song exists, but do not guess
  or invent an association you're not sure about.
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
    {{"name": "song name", "artist": "artist name", "genre": "short genre/style tag, e.g. Orchestral, Rock, Folk-pop", "reason": "one sentence on why this fits"}}
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