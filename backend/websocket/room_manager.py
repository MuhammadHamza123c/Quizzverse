import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from db.supabase_client import supabase
from typing import Dict
from services.ai_service import get_hint, judge_answer

class RoomManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.player_names: Dict[str, Dict[str, str]] = {}
        self.current_questions: Dict[str, int] = {}
        self.players_answered: Dict[str, set] = {}
        self.hints_used: Dict[str, Dict[str, int]] = {}
        self.room_questions: Dict[str, list] = {}
        self.room_total_questions: Dict[str, int] = {}
        self.player_questions: Dict[str, Dict[str, int]] = {}
        self.player_current_questions: Dict[str, Dict[str, str]] = {}
        self.players_done: Dict[str, set] = {}

    async def connect(self, room_id: str, user_id: str, websocket: WebSocket, url_guest_name: str = ""):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
            self.player_names[room_id] = {}
            self.current_questions[room_id] = 0
            self.players_answered[room_id] = set()
            self.hints_used[room_id] = {}
            self.room_questions[room_id] = []
            self.room_total_questions[room_id] = 0
            self.player_questions[room_id] = {}
            self.player_current_questions[room_id] = {}
            self.players_done[room_id] = set()

        display_name = "Player"
        participants = supabase.table("room_participants").select("*").eq("room_id", room_id).execute().data or []
        p = next((p for p in participants if p.get("user_id") == user_id), None)
        if p:
            display_name = p.get("guest_name") or display_name
        elif url_guest_name:
            display_name = url_guest_name

        self.active_connections[room_id][user_id] = websocket
        self.player_names[room_id][user_id] = display_name

        await self.broadcast_player_list(room_id)

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(user_id, None)
            if room_id in self.player_names:
                self.player_names[room_id].pop(user_id, None)
            if room_id in self.players_done:
                self.players_done[room_id].discard(user_id)
            if not self.active_connections[room_id]:
                for key in list(self.__dict__.keys()):
                    if isinstance(getattr(self, key), dict):
                        getattr(self, key).pop(room_id, None)
                return
            self.broadcast_player_list_sync(room_id)

    async def broadcast(self, room_id: str, message: dict):
        if room_id not in self.active_connections:
            return
        disconnected = []
        for uid, ws in self.active_connections[room_id].items():
            try:
                await ws.send_text(json.dumps(message))
            except:
                disconnected.append(uid)
        for uid in disconnected:
            self.disconnect(room_id, uid)

    async def send_to(self, user_id: str, room_id: str, message: dict):
        ws = self.active_connections.get(room_id, {}).get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except:
                self.disconnect(room_id, user_id)

    def broadcast_player_list_sync(self, room_id: str):
        connections = self.active_connections.get(room_id, {})
        names = self.player_names.get(room_id, {})
        host_id = None
        try:
            r = supabase.table("rooms").select("host_id").eq("id", room_id).single().execute()
            host_id = r.data.get("host_id") if r.data else None
        except:
            pass
        players = []
        for uid in connections:
            players.append({
                "id": uid,
                "name": names.get(uid, "Player"),
                "guest_name": names.get(uid, "Player"),
                "is_host": uid == host_id,
            })
        import asyncio
        asyncio.create_task(self.broadcast(room_id, {"type": "player_list", "players": players}))

    async def broadcast_player_list(self, room_id: str):
        self.broadcast_player_list_sync(room_id)

    async def broadcast_leaderboard(self, room_id: str):
        participants = supabase.table("room_participants").select("*").eq("room_id", room_id).order("score", desc=True).execute().data or []
        lb = [{"user_id": p["user_id"] if p.get("user_id") else p["id"], "name": p.get("guest_name", "Player"), "score": p.get("score", 0), "streak": p.get("streak", 0)} for p in participants]
        await self.broadcast(room_id, {"type": "leaderboard", "leaderboard": lb})

    async def handle_message(self, room_id: str, user_id: str, data: dict):
        msg_type = data.get("type")
        print(f"[handle_message] type={msg_type} user={user_id}")

        if msg_type == "submit_answer":
            question_id = data.get("question_id")
            selected_answer = data.get("answer")
            time_spent = data.get("time_spent", 0)
            print(f"[submit_answer] qid={question_id} user={user_id}")

            expected_qid = self.player_current_questions.get(room_id, {}).get(user_id)
            if expected_qid and question_id != expected_qid:
                return

            self.players_answered.setdefault(room_id, set()).add(user_id)

            question = supabase.table("questions").select("*").eq("id", question_id).single().execute()
            if not question.data:
                await self.send_to(user_id, room_id, {"type": "error", "message": "Question not found"})
                return

            if question.data.get("question_type") == "fill_blank":
                try:
                    loop = asyncio.get_event_loop()
                    is_correct = await loop.run_in_executor(None, judge_answer,
                        question.data["question_text"],
                        question.data["correct_answer"],
                        selected_answer.strip(),
                        "fill_blank",
                    )
                except:
                    is_correct = selected_answer.strip().lower() == question.data["correct_answer"].strip().lower()
            else:
                is_correct = selected_answer.strip().lower() == question.data["correct_answer"].strip().lower()
            points = 10 if is_correct else 0
            bonus = max(0, int((30 - time_spent) / 3)) if is_correct else 0
            total_points = points + bonus

            current_ps = supabase.table("room_participants").select("id, user_id, score, streak").eq("room_id", room_id).execute().data or []
            current_p = next((p for p in current_ps if p.get("user_id") == user_id or p.get("id") == user_id), None)
            if not current_p:
                await self.send_to(user_id, room_id, {"type": "error", "message": "Participant not found"})
                return

            old_score = (current_p.get("score", 0) or 0)
            current_streak = (current_p.get("streak", 0) or 0)
            new_score = old_score + total_points
            new_streak = current_streak + 1 if is_correct else 0

            id_field = "user_id" if current_p.get("user_id") else "id"
            id_value = current_p.get("user_id") if current_p.get("user_id") else current_p.get("id")
            supabase.table("room_participants").update({
                "score": new_score,
                "streak": new_streak,
            }).eq("room_id", room_id).eq(id_field, id_value).execute()

            await self.send_to(user_id, room_id, {
                "type": "answer_result",
                "correct": is_correct,
                "correct_answer": question.data["correct_answer"],
                "explanation": question.data["explanation"],
                "points_earned": total_points,
                "new_score": new_score,
            })

            await self.broadcast_leaderboard(room_id)

            if not is_correct and current_p.get("user_id"):
                try:
                    room = supabase.table("rooms").select("quiz_id").eq("id", room_id).single().execute()
                    if room.data:
                        qt = supabase.table("quizzes").select("title").eq("id", room.data["quiz_id"]).single().execute()
                        supabase.table("flashcards").insert({
                            "user_id": current_p["user_id"],
                            "quiz_id": room.data["quiz_id"],
                            "quiz_title": qt.data.get("title", "") if qt.data else "",
                            "question_text": question.data["question_text"],
                            "question_type": question.data.get("question_type", "mcq"),
                            "options": question.data.get("options"),
                            "correct_answer": question.data["correct_answer"],
                            "user_wrong_answer": selected_answer,
                            "explanation": question.data.get("explanation"),
                            "difficulty": question.data.get("difficulty", "medium"),
                            "reviewed": False,
                        }).execute()
                except Exception as e:
                    print(f"[flashcard_gen] ERROR: {e}")

        elif msg_type == "skip_question":
            question_id = data.get("question_id")

            expected_qid = self.player_current_questions.get(room_id, {}).get(user_id)
            if expected_qid and question_id != expected_qid:
                return

            self.players_answered.setdefault(room_id, set()).add(user_id)

            question = supabase.table("questions").select("*").eq("id", question_id).single().execute()
            if not question.data:
                await self.send_to(user_id, room_id, {"type": "error", "message": "Question not found"})
                return

            current_ps = supabase.table("room_participants").select("id, user_id, score, streak").eq("room_id", room_id).execute().data or []
            current_p = next((p for p in current_ps if p.get("user_id") == user_id or p.get("id") == user_id), None)
            old_score = (current_p.get("score", 0) or 0) if current_p else 0

            await self.send_to(user_id, room_id, {
                "type": "answer_result",
                "correct": False,
                "skipped": True,
                "correct_answer": question.data["correct_answer"],
                "explanation": question.data["explanation"],
                "points_earned": 0,
                "new_score": old_score,
            })

        elif msg_type == "next_question":
            room_qs = supabase.table("room_questions").select("*").eq("room_id", room_id).order("order_index").execute()
            if not room_qs.data:
                return
            self.room_total_questions[room_id] = len(room_qs.data)

            if not self.room_questions.get(room_id) or len(self.room_questions[room_id]) < len(room_qs.data):
                all_qs = []
                for rq in room_qs.data:
                    q = supabase.table("questions").select("*").eq("id", rq["question_id"]).single().execute()
                    if q.data:
                        all_qs.append({
                            "id": q.data["id"],
                            "question_text": q.data["question_text"],
                            "question_type": q.data["question_type"],
                            "options": q.data["options"],
                            "correct_answer": q.data["correct_answer"],
                            "explanation": q.data.get("explanation"),
                            "order_index": rq["order_index"],
                            "time_limit": rq["time_limit_seconds"],
                        })
                self.room_questions[room_id] = all_qs

            player_idx = self.player_questions.get(room_id, {}).get(user_id, 0)

            if player_idx >= len(self.room_questions[room_id]):
                self.players_done.setdefault(room_id, set()).add(user_id)
                await self.send_to(user_id, room_id, {"type": "player_done"})
                await self.check_all_done(room_id)
                return

            q_data = self.room_questions[room_id][player_idx]
            self.player_current_questions.setdefault(room_id, {})[user_id] = q_data["id"]
            self.player_questions.setdefault(room_id, {})[user_id] = player_idx + 1

            await self.send_to(user_id, room_id, {
                "type": "new_question",
                "question": {
                    "id": q_data["id"],
                    "question_text": q_data["question_text"],
                    "question_type": q_data["question_type"],
                    "options": q_data["options"],
                    "order_index": q_data["order_index"],
                    "time_limit": q_data["time_limit"],
                },
                "question_number": player_idx + 1,
                "total_questions": len(self.room_questions[room_id]),
            })

        elif msg_type == "start_quiz":
            try:
                room_data = supabase.table("rooms").select("host_id").eq("id", room_id).single().execute()
                if not room_data.data or room_data.data["host_id"] != user_id:
                    await self.send_to(user_id, room_id, {"type": "error", "message": "Only the host can start the quiz"})
                    return
                await self.broadcast(room_id, {"type": "quiz_started"})
            except Exception as e:
                print(f"[start_quiz] ERROR: {e}")
                await self.send_to(user_id, room_id, {"type": "error", "message": f"Failed to start: {str(e)}"})

        elif msg_type == "request_hint":
            question_id = data.get("question_id")
            if not question_id:
                await self.send_to(user_id, room_id, {"type": "error", "message": "Missing question_id"})
                return

            expected_qid = self.player_current_questions.get(room_id, {}).get(user_id)
            if expected_qid and question_id != expected_qid:
                return

            if room_id not in self.hints_used:
                self.hints_used[room_id] = {}
            used = self.hints_used[room_id].get(user_id, 0)
            if used >= 1:
                await self.send_to(user_id, room_id, {"type": "error", "message": "You already used a hint for this question"})
                return

            question = supabase.table("questions").select("*").eq("id", question_id).single().execute()
            if not question.data:
                await self.send_to(user_id, room_id, {"type": "error", "message": "Question not found"})
                return

            try:
                hint = get_hint(
                    question_text=question.data["question_text"],
                    question_type=question.data["question_type"],
                    options=question.data.get("options"),
                    correct_answer=question.data["correct_answer"],
                )
            except Exception as e:
                await self.send_to(user_id, room_id, {"type": "error", "message": "Failed to generate hint"})
                return

            self.hints_used[room_id][user_id] = used + 1
            await self.send_to(user_id, room_id, {"type": "hint", "hint": hint})

        elif msg_type == "video_toggle":
            enabled = data.get("enabled", False)
            try:
                room_data = supabase.table("rooms").select("host_id").eq("id", room_id).single().execute()
                if not room_data.data or room_data.data["host_id"] != user_id:
                    await self.send_to(user_id, room_id, {"type": "error", "message": "Only the host can toggle video"})
                    return
                await self.broadcast(room_id, {
                    "type": "video_toggle",
                    "enabled": enabled,
                    "livekit_room": room_id,
                })
            except Exception as e:
                print(f"[video_toggle] ERROR: {e}")
                await self.send_to(user_id, room_id, {"type": "error", "message": f"Failed to toggle video: {str(e)}"})

    async def check_all_done(self, room_id: str):
        all_ids = set(self.active_connections.get(room_id, {}).keys())
        done_ids = self.players_done.get(room_id, set())
        if not done_ids:
            return
        if all_ids and done_ids and done_ids == all_ids:
            participants = supabase.table("room_participants").select("*").eq("room_id", room_id).order("score", desc=True).execute().data or []
            lb = [{"user_id": p["user_id"] if p.get("user_id") else p["id"], "name": p.get("guest_name", "Player"), "score": p.get("score", 0), "streak": p.get("streak", 0)} for p in participants]
            await self.broadcast(room_id, {"type": "quiz_end", "leaderboard": lb})

room_manager = RoomManager()
