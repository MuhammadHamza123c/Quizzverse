<div align="center">
  <img src="./frontend/logo.png" alt="QuizzVerse Logo" width="120" />
  <h1>QuizzVerse</h1>
  <p><strong>AI-Powered Quiz Platform — Learn, Compete, Master</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.2.9-black?style=flat-square&logo=next.js" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/FastAPI-0.115+-00a86b?style=flat-square&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Supabase-FFE800?style=flat-square&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/Groq-Cloud-f97316?style=flat-square&logo=groq" alt="Groq Cloud" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS 4" />
  </p>
</div>

---

## Overview

**QuizzVerse** is a full-stack AI-powered quiz platform that lets you generate smart quizzes on any topic, play solo or with friends in real-time multiplayer rooms, review mistakes with AI-powered flashcards, and earn achievements — all powered by Groq Cloud AI.

### Live Demo

| Frontend | Backend API |
|---|---|
| [quizzverse.vercel.app](https://quizzverse.vercel.app) | [quizzverse-backend.vercel.app](https://quizzverse-backend.vercel.app) |

---

## Features

### 🤖 AI-Powered Quiz Generation
- Generate quizzes on **23+ topics** with one click (Science, Math, History, Programming, Mythology, Robotics, etc.)
- Upload **PDF, DOCX, or TXT files** — AI reads and creates questions from your content
- Custom topic input for anything not in the list
- Three question types: **Multiple Choice**, **True/False**, **Fill-in-the-Blank**
- Configurable difficulty (Easy / Medium / Hard), question count, and timer

### 🎮 Real-Time Multiplayer Rooms
- Create or join rooms with a **6-character code**
- **Topic-based** or **document-based** quiz generation for rooms
- Each player progresses at their own pace (individual question pacing)
- Scoring system: 10 points per correct answer + speed bonus (up to 10 extra)
- Streak tracking — maintain streaks for bragging rights
- Live leaderboard broadcast via **WebSockets**
- **QR code invite** — scan or share link to join instantly
- Video rooms via **LiveKit** integration (host-toggleable)

### 🧠 AI QuizzBot Chat
- Ask questions, get explanations, practice concepts
- Upload **audio** (transcribed via Whisper), images, or documents
- 4 quick suggestion chips: Explain, Practice, Summarize, Tips
- Markdown rendering for rich responses

### 📚 Wrong Answer Review Bank
- Every wrong answer automatically becomes a **flashcard**
- Review page with filter tabs (All / Unreviewed / Reviewed)
- Difficulty filter to focus on hard concepts
- Flip-to-reveal card UI with explanation
- Mark reviewed as you master topics

### 🏆 Achievements & Badges
- **14 achievements** across quiz-taking, flashcards, documents, and rooms
- Examples: First Steps, Perfect Score, On Fire (3 quizzes), Legend (10 rooms won)
- Real-time badge popup with **CSS confetti animation** and chime sound
- Progress bars for milestone-based achievements

### 📊 Dashboard & Profiles
- Stats: total quizzes, quizzes played, total score, average score
- Recent quizzes list with source badges and quick actions
- Editable profile: name, university, department, grade
- Quiz export as JSON download

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16.2.9](https://nextjs.org/) (App Router, Turbopack) |
| **UI Library** | [React 19.2.4](https://react.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Auth** | [@supabase/supabase-js](https://supabase.com/docs/reference/javascript) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **QR Codes** | [qrcode.react](https://github.com/zpao/qrcode.react) |
| **Markdown** | [react-markdown](https://github.com/remarkjs/react-markdown) + rehype-raw + remark-gfm |
| **Video** | [LiveKit](https://livekit.io/) (`@livekit/components-react`, `livekit-client`) |

### Backend

| Layer | Technology |
|---|---|
| **Framework** | [FastAPI](https://fastapi.tiangolo.com/) |
| **Runtime** | [Uvicorn](https://www.uvicorn.org/) |
| **AI Provider** | [Groq Cloud](https://groq.com/) (`openai/gpt-oss-120b`, `whisper-large-v3`) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Auth** | Supabase Auth (GoTrue) |
| **Storage** | Supabase Storage |
| **WebSockets** | [websockets](https://websockets.readthedocs.io/) >= 13.0 |
| **JWT** | [python-jose](https://github.com/mpdavis/python-jose) |
| **File Parsing** | PyPDF (PDF), python-docx (DOCX) |
| **Video Tokens** | [LiveKit API](https://livekit.io/) |

### AI Configuration

All AI calls use these parameters:
- **Model:** `openai/gpt-oss-120b`
- **Temperature:** 1.0
- **Frequency Penalty:** 0.5
- **Presence Penalty:** 0.5
- **Note:** This model does **not** support `response_format: json_object` — all prompts use plain text with JSON instructions.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Landing  │  │  Quiz    │  │  Multiplayer     │  │
│  │  Page     │  │  Player  │  │  Rooms           │  │
│  ├──────────┤  ├──────────┤  ├──────────────────┤  │
│  │  Auth     │  │  Chat    │  │  Flashcards      │  │
│  │  (Supabase)│  │(QuizzBot)│  │  & Review        │  │
│  ├──────────┤  ├──────────┤  ├──────────────────┤  │
│  │Dashboard │  │Documents │  │  Achievements     │  │
│  │  & Stats │  │  Upload  │  │  & Profile        │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                    API Client (api.ts)              │
└──────────────┬──────────────────────────┬──────────┘
               │ HTTP (REST)              │ WebSocket
               ▼                          ▼
┌──────────────────────────┐   ┌────────────────────┐
│    FastAPI Backend        │   │  WebSocket Manager  │
│  ┌──────────────────────┐ │   │  (room_manager.py)  │
│  │  API Endpoints       │ │   │                     │
│  │  /api/auth/*         │ │   │  • submit_answer    │
│  │  /api/quizzes/*      │ │   │  • skip_question    │
│  │  /api/rooms/*        │ │   │  • next_question    │
│  │  /api/documents/*    │ │   │  • start_quiz       │
│  │  /api/chat/*         │ │   │  • request_hint     │
│  │  /api/flashcards/*   │ │   │  • video_toggle     │
│  │  /api/achievements/* │ │   └────────────────────┘
│  │  /api/livekit/*      │ │
│  │  /api/users/*        │ │
│  └──────────────────────┘ │
│  ┌──────────────────────┐ │
│  │  Services            │ │
│  │  • ai_service.py     │ │
│  │  • chat_service.py   │ │
│  │  • doc_parser.py     │ │
│  │  • livekit_service.py│ │
│  └──────────────────────┘ │
└──────────────┬────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────┐
│   Supabase   │  │Groq Cloud│
│  (PostgreSQL)│  │   AI     │
│  • Auth      │  │ (LLM +   │
│  • Storage   │  │ Whisper) │
│  • Real-time │  └──────────┘
└──────────────┘

```

### Key Architectural Decisions

- **WebSocket + REST fallback:** Vercel serverless functions don't support WebSockets. The backend handles WebSockets locally while REST APIs serve as fallbacks for quiz start and player list sync via polling.
- **Individual question pacing:** Each player in a multiplayer room progresses independently — no waiting for others to finish before moving to the next question.
- **Two-pass scoring for fill-in-blank:** First an exact match (case-insensitive), then transliteration normalization + fuzzy matching, then an AI semantic judge as final fallback.
- **Badge achievements:** Stored per-user as JSON files in Supabase Storage, checked on relevant events (quiz complete, room won, etc.).

---

## Project Structure

```
quizzverse/
├── backend/                          # Python FastAPI backend
│   ├── api/                          # REST API endpoints
│   │   ├── achievements.py           # Badge system
│   │   ├── auth.py                   # Signup / Login
│   │   ├── chat.py                   # QuizzBot AI chat
│   │   ├── dependencies.py           # Auth middleware
│   │   ├── documents.py              # Document upload & quiz gen
│   │   ├── flashcards.py             # Wrong answer flashcards
│   │   ├── livekit.py                # Video room tokens
│   │   ├── quizzes.py                # Quiz CRUD & judge
│   │   ├── rooms.py                  # Room CRUD
│   │   └── users.py                  # Profile management
│   ├── config/
│   │   └── settings.py               # Environment variables
│   ├── db/
│   │   └── supabase_client.py        # Supabase client setup
│   ├── migrations/
│   │   └── 001_flashcards.sql         # Flashcard table DDL
│   ├── services/
│   │   ├── ai_service.py             # Groq AI: quiz gen, hints, judge
│   │   ├── chat_service.py           # QuizzBot conversation logic
│   │   ├── doc_parser.py             # PDF/DOCX/TXT parsing
│   │   └── livekit_service.py        # LiveKit token generation
│   ├── websocket/
│   │   └── room_manager.py           # WebSocket multiplayer logic
│   ├── main.py                       # FastAPI app & router setup
│   └── requirements.txt
│
├── frontend/                         # Next.js 16 frontend
│   ├── public/                       # Static assets
│   │   ├── logo.png
│   │   └── ...
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── globals.css           # Global styles
│   │   │   ├── login/                # Login page
│   │   │   ├── signup/               # Signup page
│   │   │   ├── dashboard/            # User dashboard
│   │   │   ├── quiz/                 # Quiz generator & player
│   │   │   ├── quiz/[id]/            # Individual quiz view
│   │   │   ├── documents/            # Document upload & quiz
│   │   │   ├── rooms/create/         # Room creation wizard
│   │   │   ├── rooms/join/           # Join room by code
│   │   │   ├── rooms/[code]/         # Live multiplayer room
│   │   │   ├── chat/                 # QuizzBot AI chat
│   │   │   ├── flashcards/           # Flashcard review
│   │   │   ├── review/               # Wrong answer bank
│   │   │   ├── achievements/         # Badge display
│   │   │   ├── profile/              # User profile
│   │   │   └── auth/callback/        # Auth redirect handler
│   │   ├── components/
│   │   │   ├── Navbar.tsx            # Sidebar navigation
│   │   │   ├── BadgePopup.tsx        # Achievement celebration
│   │   │   └── LiveKitVideo.tsx      # Video room component
│   │   ├── lib/
│   │   │   ├── api.ts                # API client with auth
│   │   │   ├── config.ts             # API/WS URL derivation
│   │   │   └── supabase.ts           # Frontend Supabase client
│   │   └── types/
│   │       └── index.ts              # TypeScript interfaces
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── postcss.config.mjs
│
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- **A Supabase project** ([Create one here](https://supabase.com/dashboard/projects))
- **A Groq API key** ([Get one here](https://console.groq.com/))
- **(Optional) A LiveKit project** for video rooms

### 1. Clone the Repository

```bash
git clone https://github.com/MuhammadHamza123c/Quizzverse.git
cd QuizzVerse
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=gsk_your-groq-key

# Optional — for video rooms:
LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

Run the migration in your Supabase SQL Editor:

```sql
-- From backend/migrations/001_flashcards.sql
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  quiz_title TEXT DEFAULT '',
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'mcq',
  options JSONB,
  correct_answer TEXT NOT NULL,
  user_wrong_answer TEXT,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_reviewed ON flashcards(reviewed);
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for interactive Swagger docs.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in `frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## API Endpoints

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Create account with email & password |
| POST | `/api/auth/login` | No | Login, returns access_token |

### Users (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Yes | Get profile data |
| PUT | `/api/users/me` | Yes | Update profile |

### Quizzes (`/api/quizzes`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/quizzes/generate` | Yes | Generate AI quiz by topic |
| POST | `/api/quizzes/complete` | Yes | Submit score & update stats |
| GET | `/api/quizzes/` | Yes | List user's quizzes (latest 50) |
| GET | `/api/quizzes/{quiz_id}` | No | Get quiz with all questions |
| GET | `/api/quizzes/{quiz_id}/export` | No | Export quiz as JSON |
| POST | `/api/quizzes/judge-answer` | Yes | AI judge fill-in-the-blank |
| POST | `/api/quizzes/hint` | Yes | Get AI hint for question |
| DELETE | `/api/quizzes/{quiz_id}` | Yes | Delete quiz & related data |

### Documents (`/api/documents`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/documents/upload` | Yes | Upload PDF/DOCX/TXT/JSON |
| POST | `/api/documents/{id}/generate-quiz` | Yes | Generate quiz from document |
| GET | `/api/documents/` | Yes | List user's documents |
| DELETE | `/api/documents/{id}` | Yes | Delete document |

### Rooms (`/api/rooms`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/rooms/create` | Yes | Create room with AI quiz |
| POST | `/api/rooms/create-from-document` | Yes | Create room from document |
| POST | `/api/rooms/join` | Yes | Join room by code |
| GET | `/api/rooms/{room_code}` | No | Get room details + participants |

### Chat (`/api/chat`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat/message` | Yes | Send message to QuizzBot |
| POST | `/api/chat/upload` | Yes | Upload file for AI processing |

### Flashcards (`/api/flashcards`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/flashcards/generate` | Yes | Create from wrong answers |
| GET | `/api/flashcards` | Yes | List all flashcards |
| PATCH | `/api/flashcards/{id}/review` | Yes | Toggle reviewed status |
| DELETE | `/api/flashcards/{id}` | Yes | Delete flashcard |

### Achievements (`/api/achievements`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/achievements` | Yes | List badges with progress |
| POST | `/api/achievements/check` | Yes | Check & award by event |

### WebSocket (`/ws/{room_id}`)

| Event Type | Direction | Description |
|------------|-----------|-------------|
| `submit_answer` | Client → Server | Submit an answer |
| `skip_question` | Client → Server | Skip current question |
| `next_question` | Client → Server | Request next question |
| `start_quiz` | Client → Server | Host starts the quiz |
| `request_hint` | Client → Server | Request AI hint |
| `video_toggle` | Client → Server | Host toggles video |
| `answer_result` | Server → Client | Answer judged result |
| `new_question` | Server → Client | Next question data |
| `player_list` | Server → Client | Updated player list |
| `leaderboard` | Server → Client | Updated scores |
| `quiz_started` | Server → Client | Quiz has started |
| `quiz_end` | Server → Client | Quiz has ended |
| `player_done` | Server → Client | Player finished all questions |

---

## Database Tables (Supabase PostgreSQL)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profile data & stats | `id`, `full_name`, `university`, `department`, `grade`, `total_quizzes_played`, `total_score` |
| `quizzes` | Generated quizzes | `id`, `title`, `topic`, `difficulty`, `source` ("ai"/"document"), `created_by` |
| `questions` | Quiz questions | `id`, `quiz_id`, `question_type` ("mcq"/"true_false"/"fill_blank"), `options`, `correct_answer` |
| `flashcards` | Wrong answer flashcards | `id`, `user_id`, `quiz_id`, `question_text`, `user_wrong_answer`, `reviewed` |
| `documents` | Uploaded files | `id`, `user_id`, `file_name`, `content_text`, `word_count` |
| `rooms` | Multiplayer rooms | `id`, `room_code`, `quiz_id`, `host_id`, `status`, `settings` |
| `room_participants` | Room players | `id`, `room_id`, `user_id`, `score`, `streak` |
| `room_questions` | Room quiz questions | `id`, `room_id`, `question_id`, `time_limit_seconds` |

---

## Achievement Badges

| ID | Name | Type | Requirement | Icon |
|---|---|---|---|---|
| `first_quiz` | First Steps | Boolean | Complete first quiz | 🎯 |
| `perfect_score` | Perfect Score | Boolean | 100% on a quiz | 💯 |
| `quiz_master` | Quiz Master | Progress | 10 quizzes | 🎓 |
| `half_century` | Half Century | Progress | 50 quizzes | 🏆 |
| `on_fire` | On Fire | Progress | 3 quizzes in a row | 🔥 |
| `double_digit` | Double Digits | Boolean | Score 10+ on a quiz | 🔟 |
| `flashcard_fanatic` | Flashcard Fanatic | Progress | 10 flashcards | 🃏 |
| `card_collector` | Card Collector | Progress | 25 flashcards | 📇 |
| `deck_master` | Deck Master | Progress | 100 flashcards | 📚 |
| `document_scholar` | Document Scholar | Boolean | Generate from document | 📄 |
| `paper_trail` | Paper Trail | Progress | 5 documents uploaded | 📑 |
| `room_champion` | Room Champion | Boolean | Win a multiplayer room | 👑 |
| `crowd_favorite` | Crowd Favorite | Progress | Win 3 rooms | ⭐ |
| `legend` | Legend | Progress | Win 10 rooms | 💎 |

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build    # Builds with `next build`
```

Set these environment variables in your Vercel project:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_API_URL` | `https://quizzverse-backend.vercel.app` |

### Backend → Vercel (Serverless Functions)

Set these environment variables in your Vercel project:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your service role key |
| `GROQ_API_KEY` | Your Groq API key |

> **Note:** Vercel serverless functions have a **10-second timeout** on the Hobby plan. AI quiz generation may exceed this — the backend pre-generates titles separately and uses timeout-safe practices.

### Important Deployment Notes

- **WebSocket** does not work on Vercel serverless functions — multiplayer rooms use REST polling fallbacks for quiz start and player list sync.
- The `openai/gpt-oss-120b` model on Groq does **not** support `response_format: json_object` — all prompts use plain text with embedded JSON instructions.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is private and unlicensed — all rights reserved.

---

<div align="center">
  <p>Designed &amp; developed by <strong>Hamza</strong></p>
  <p>
    <a href="https://quizzverse.vercel.app">QuizzVerse</a> ·
    <a href="https://github.com/MuhammadHamza123c/Quizzverse">GitHub</a>
  </p>
</div>
