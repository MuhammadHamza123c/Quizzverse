export interface Profile {
  id: string
  full_name: string
  university?: string
  department?: string
  grade?: string
  avatar_url?: string
  total_quizzes_played: number
  total_score: number
}

export interface Quiz {
  id: string
  title: string
  topic?: string
  difficulty: string
  question_count: number
  source: "ai" | "document"
  created_by?: string
  is_public: boolean
  play_count: number
  created_at: string
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  question_type: "mcq" | "true_false" | "fill_blank"
  options?: Record<string, string>
  correct_answer: string
  explanation?: string
  difficulty: string
  order_index: number
}

export interface Room {
  id: string
  room_code: string
  quiz_id: string
  host_id: string
  status: "waiting" | "active" | "ended"
  max_players: number
  settings: { time_per_question: number; show_explanations: boolean }
  created_at: string
}

export interface RoomParticipant {
  id: string
  room_id: string
  user_id?: string
  guest_name?: string
  score: number
  streak: number
  is_ready: boolean
}

export interface Document {
  id: string
  user_id: string
  file_name: string
  file_url: string
  word_count: number
  created_at: string
}
