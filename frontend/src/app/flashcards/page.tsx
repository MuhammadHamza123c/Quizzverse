"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"
import BadgePopup from "@/components/BadgePopup"
import { Loader2, RotateCw, Trash2, CheckCircle2, Circle, BookOpen } from "lucide-react"

interface Flashcard {
  id: string
  quiz_id: string
  quiz_title?: string
  question_text: string
  question_type: string
  options: Record<string, string> | null
  correct_answer: string
  user_wrong_answer: string | null
  explanation: string | null
  difficulty: string
  created_at: string
  reviewed: boolean
}

export default function FlashcardsPage() {
  console.log("[Flashcards] rendering")
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState<Record<string, boolean>>({})
  const [error, setError] = useState("")
  const [badgePopup, setBadgePopup] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    console.log("[Flashcards] useEffect running")
    supabase.auth.getSession().then(async ({ data }) => {
      console.log("[Flashcards] session:", data?.session?.user?.id)
      if (!data.session) { console.log("[Flashcards] no session, redirecting"); return router.push("/login") }
      try {
        console.log("[Flashcards] calling api.flashcards.list()")
        const res = await api.flashcards.list()
        console.log("[Flashcards] response:", res)
        setFlashcards(res.flashcards || [])
      } catch (err: any) {
        console.error("[Flashcards] error:", err)
        setError(err.message)
      }
      setLoading(false)
    })
  }, [router])

  const toggleFlip = (id: string) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleReview = async (id: string) => {
    try {
      const res = await api.flashcards.toggleReview(id)
      const becameReviewed = res.flashcard.reviewed
      setFlashcards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, reviewed: becameReviewed } : c))
      )
      if (becameReviewed) {
        const reviewedCount = flashcards.filter((c) => c.id !== id && c.reviewed).length + 1
        const achRes = await api.achievements.check({ event: "flashcard_reviewed", data: { total_reviewed: reviewedCount } })
        if (achRes.new_achievements?.length > 0) setBadgePopup(achRes.new_achievements[0])
      }
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await api.flashcards.delete(id)
      setFlashcards((prev) => prev.filter((c) => c.id !== id))
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
            </div>
            <p className="text-sm text-gray-500 ml-[52px]">
              {flashcards.length} card{flashcards.length !== 1 ? "s" : ""}
              {flashcards.filter((c) => c.reviewed).length > 0 &&
                ` · ${flashcards.filter((c) => c.reviewed).length} reviewed`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/8 border border-red-500/15 text-sm text-red-400">{error}</div>
        )}

        {flashcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/10 to-cyan-500/5 border border-purple-500/10 flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">No Flashcards Yet</h2>
            <p className="text-sm text-gray-500 max-w-md mb-8">
              Flashcards are automatically created from questions you answer wrong in quizzes. Take a quiz and get some
              wrong to see them here!
            </p>
            <Link
              href="/quiz"
              className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              Take a Quiz
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flashcards.map((card) => (
              <div
                key={card.id}
                className="group relative perspective-[1000px]"
              >
                <button
                  onClick={() => toggleFlip(card.id)}
                  className="w-full text-left"
                >
                <div
                  className={`grid transition-transform duration-500 transform-3d min-h-[180px] rounded-2xl ${flipped[card.id] ? 'rotate-y-180' : ''}`}
                >
                  <div
                    className={`col-start-1 row-start-1 backface-hidden p-5 rounded-2xl border ${
                      card.reviewed
                        ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-purple-500/20"
                    }`}
                  >
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            card.difficulty === "easy"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : card.difficulty === "hard"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {card.difficulty}
                        </span>
                        {card.reviewed && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Reviewed
                          </span>
                        )}
                      </div>
                      {card.quiz_title && (
                        <div className="text-[11px] text-gray-400 truncate mt-1.5">{card.quiz_title}</div>
                      )}
                    </div>

                    <p className="text-sm text-gray-200 leading-relaxed line-clamp-4">{card.question_text}</p>
                    {card.options && (
                      <div className="mt-3 space-y-1">
                        {Object.entries(card.options).map(([key, val]) => (
                          <div
                            key={key}
                            className={`text-xs px-2.5 py-1.5 rounded-lg ${
                              key === card.correct_answer
                                ? "bg-emerald-500/8 text-emerald-300"
                                : key === card.user_wrong_answer
                                  ? "bg-red-500/8 text-red-300"
                                  : "bg-white/[0.03] text-gray-500"
                            }`}
                          >
                            <span className="font-medium mr-1.5">{key}.</span>
                            {val}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className={`col-start-1 row-start-1 backface-hidden p-5 rounded-2xl border rotate-y-180 ${
                      card.reviewed
                        ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-purple-500/20"
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-2">Correct answer:</p>
                    <p className="text-sm font-medium text-emerald-300 mb-3">
                      {card.options?.[card.correct_answer] || card.correct_answer}
                    </p>
                    {card.explanation && (
                      <>
                        <p className="text-xs text-gray-500 mb-1">Explanation:</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{card.explanation}</p>
                      </>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
                      <RotateCw className="w-3 h-3" /> Click to flip back
                    </div>
                  </div>
                </div>
                </button>

                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReview(card.id) }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      card.reviewed
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-gray-500 hover:text-emerald-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    {card.reviewed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(card.id) }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-white/[0.04] transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BadgePopup badge={badgePopup} onClose={() => setBadgePopup(null)} />
    </div>
  )
}
