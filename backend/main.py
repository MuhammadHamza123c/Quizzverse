from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import json

from api.auth import router as auth_router
from api.users import router as users_router
from api.quizzes import router as quizzes_router
from api.documents import router as documents_router
from api.rooms import router as rooms_router
from api.chat import router as chat_router
from api.flashcards import router as flashcards_router
from api.achievements import router as achievements_router
from api.livekit import router as livekit_router
from websocket.room_manager import room_manager

app = FastAPI(title="QuizzVerse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(quizzes_router)
app.include_router(documents_router)
app.include_router(rooms_router)
app.include_router(chat_router)
app.include_router(flashcards_router)
app.include_router(achievements_router)
app.include_router(livekit_router)

@app.get("/")
async def root():
    return {"message": "QuizzVerse API is running"}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_id: str = Query(""),
    participant_id: str = Query(""),
    guest_name: str = Query(""),
):
    ws_id = participant_id or user_id or f"anon_{id(websocket)}"
    await room_manager.connect(room_id, ws_id, websocket, url_guest_name=guest_name)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await room_manager.handle_message(room_id, ws_id, message)
    except WebSocketDisconnect:
        room_manager.disconnect(room_id, ws_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[WS] Error: {e}")
        room_manager.disconnect(room_id, ws_id)
