import random
from groq import Groq
from config.settings import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)

CHAT_SYSTEM_PROMPT = """You are QuizzBot, an educational AI assistant. Keep every response under 200 words. Be concise, direct, and helpful. Use markdown only when needed."""


def _random_seed() -> int:
    return random.randint(0, 2**31 - 1)


def chat_with_context(messages: list[dict], profile: str | None = None) -> str:
    system = CHAT_SYSTEM_PROMPT
    if profile:
        system += f"\n\nUser info (only use when relevant): {profile}"
    formatted = [{"role": "system", "content": system}]
    for m in messages:
        formatted.append({"role": m["role"], "content": m["content"]})

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=formatted,
        temperature=0.9,
        seed=_random_seed(),
        frequency_penalty=0.5,
        presence_penalty=0.5,
        max_tokens=2048,
    )
    return response.choices[0].message.content.strip()


def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    mime_map = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "m4a": "audio/mp4",
        "ogg": "audio/ogg",
        "webm": "audio/webm",
    }
    ext = filename.lower().split(".")[-1]
    mime = mime_map.get(ext, "audio/mpeg")

    transcription = client.audio.transcriptions.create(
        model="whisper-large-v3",
        file=(filename, audio_bytes, mime),
    )
    return transcription.text
