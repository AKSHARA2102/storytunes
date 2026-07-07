from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "StoryTunes backend is alive"}

@app.get("/generate")
def generate_playlist(series: str):
    return {
        "series": series,
        "title": "Mischief Managed",
        "theme": "Wonder → Friendship → Courage → Hope",
        "songs": [
            {"name": "Fake Song One", "artist": "Fake Artist A"},
            {"name": "Fake Song Two", "artist": "Fake Artist B"},
            {"name": "Fake Song Three", "artist": "Fake Artist C"},
        ]
    }