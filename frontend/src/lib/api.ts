import API_URL from "@/lib/config"

async function getToken(): Promise<string | null> {
  const { data } = await import("./supabase").then((m) => m.supabase.auth.getSession())
  return data.session?.access_token || null
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Request failed")
  }
  return res.json()
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; full_name?: string }) =>
      request("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  },
  users: {
    getProfile: () => request("/api/users/me"),
    updateProfile: (data: any) =>
      request("/api/users/me", { method: "PUT", body: JSON.stringify(data) }),
  },
  quizzes: {
    list: () => request("/api/quizzes/"),
    get: (id: string) => request(`/api/quizzes/${id}`),
    delete: (id: string) => request(`/api/quizzes/${id}`, { method: "DELETE" }),
    generate: (data: { topic: string; num_questions: number; difficulty: string }) =>
      request("/api/quizzes/generate", { method: "POST", body: JSON.stringify(data) }),
    hint: (question_id: string) =>
      request("/api/quizzes/hint", { method: "POST", body: JSON.stringify({ question_id }) }),
    complete: (data: { score: number; total_questions: number; quiz_id?: string }) =>
      request("/api/quizzes/complete", { method: "POST", body: JSON.stringify(data) }),
    judgeAnswer: (data: { question_text: string; correct_answer: string; user_answer: string; question_type?: string }) =>
      request("/api/quizzes/judge-answer", { method: "POST", body: JSON.stringify(data) }),
    export: (id: string) => request(`/api/quizzes/${id}/export`),

  },
  documents: {
    list: () => request("/api/documents/"),
    delete: (id: string) => request(`/api/documents/${id}`, { method: "DELETE" }),
    upload: async (file: File) => {
      const token = await getToken()
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || "Upload failed")
      }
      return res.json()
    },
    generateQuiz: (docId: string, numQuestions: number, difficulty: string) =>
      request(`/api/documents/${docId}/generate-quiz?num_questions=${numQuestions}&difficulty=${difficulty}`, {
        method: "POST",
      }),
  },
  rooms: {
    create: (data: { topic: string; num_questions: number; difficulty: string; time_per_question: number; video_enabled?: boolean }) =>
      request("/api/rooms/create", { method: "POST", body: JSON.stringify(data) }),
    createFromDocument: (data: { document_id: string; room_name: string; num_questions: number; difficulty: string; time_per_question: number; video_enabled?: boolean }) =>
      request("/api/rooms/create-from-document", { method: "POST", body: JSON.stringify(data) }),
    join: (roomCode: string, guestName?: string) =>
      request("/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ room_code: roomCode, guest_name: guestName }),
      }),
    get: (code: string) => request(`/api/rooms/${code}`),
  },
  achievements: {
    list: () => request("/api/achievements"),
    check: (data: { event: string; data?: any }) =>
      request("/api/achievements/check", { method: "POST", body: JSON.stringify(data) }),
  },
  flashcards: {
    list: () => request("/api/flashcards"),
    generate: (data: { wrong_answers: any[]; quiz_id: string }) =>
      request("/api/flashcards/generate", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/flashcards/${id}`, { method: "DELETE" }),
    toggleReview: (id: string) => request(`/api/flashcards/${id}/review`, { method: "PATCH" }),
  },
  livekit: {
    token: (data: { room_name: string; identity: string; name?: string }) =>
      request("/api/livekit/token", { method: "POST", body: JSON.stringify(data) }),
  },
  chat: {
    suggestions: () => request("/api/chat/suggestions"),
    message: (data: { messages: { role: string; content: string }[]; profile?: string }) =>
      request("/api/chat/message", { method: "POST", body: JSON.stringify(data) }),
    upload: async (file: File) => {
      const token = await getToken()
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`${API_URL}/api/chat/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || "Upload failed")
      }
      return res.json()
    },
  },
}
