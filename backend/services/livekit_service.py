import os
import datetime
from livekit import api as livekit_api

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")


def generate_token(identity: str, room_name: str, name: str = "") -> str | None:
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        return None

    builder = (
        livekit_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_ttl(datetime.timedelta(hours=1))
        .with_grants(
            livekit_api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )
    )
    if name:
        builder = builder.with_name(name)
    return builder.to_jwt()
