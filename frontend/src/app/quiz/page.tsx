"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import BadgePopup from "@/components/BadgePopup"
import { supabase } from "@/lib/supabase"
import { Brain, Sparkles, Loader2, AlertCircle, ArrowLeft, CheckCircle2, Zap, Clock, Target, Lightbulb, Atom, Globe, Microscope, ScrollText, Calculator, FlaskConical, Landmark, SkipForward, Dna, Telescope, Palette, Music, Dumbbell, Leaf, Cpu, Briefcase, BookOpen, HeartPulse, X, Wrench, Stethoscope, PawPrint, Languages, Bot, Download, Upload } from "lucide-react"

export default function QuizPage() {
  const [topic, setTopic] = useState("")
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState("medium")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [quiz, setQuiz] = useState<any>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [hintText, setHintText] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [answerResult, setAnswerResult] = useState<any>(null)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null)
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([])
  const [timePerQuestion, setTimePerQuestion] = useState(30)
  const [timeLeft, setTimeLeft] = useState(30)
  const [fillBlankValue, setFillBlankValue] = useState("")
  const [badgePopup, setBadgePopup] = useState<any>(null)
  const timerRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    api.quizzes.list().then(setRecentQuizzes).catch(() => {})
  }, [])

  const handleDeleteQuiz = async (quizId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await api.quizzes.delete(quizId)
      setRecentQuizzes((prev) => prev.filter((q) => q.id !== quizId))
    } catch {}
  }

  const handleExport = async (quizId: string) => {
    try {
      const data = await api.quizzes.export(quizId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${data.title.replace(/[^a-z0-9]/gi, "_")}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        alert("Invalid quiz file: must contain a 'questions' array.")
        return
      }
      await api.quizzes.import({
        title: data.title,
        topic: data.topic,
        difficulty: data.difficulty || "medium",
        questions: data.questions,
      })
      api.quizzes.list().then(setRecentQuizzes).catch(() => {})
    } catch (err) {
      alert("Failed to import quiz: " + (err instanceof Error ? err.message : "Invalid file"))
    }
    e.target.value = ""
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      router.push("/login")
      return
    }

    try {
      const result = await api.quizzes.generate({ topic, num_questions: numQuestions, difficulty })
      setQuiz(result)
      setCurrentQ(0)
      setAnswers({})
      setShowResult(false)
      setResults([])
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleAnswer = async (answer: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const newAnswers = { ...answers, [currentQ]: answer }
    setAnswers(newAnswers)
    const q = quiz.questions[currentQ]
    const a = (answer || "").trim().toLowerCase()
    const c = (q.correct_answer || "").trim().toLowerCase()
    const v = (q.options?.[answer]?.toString() || "").trim().toLowerCase()
    let isCorrect = a === c || v === c
    if (!isCorrect && q.question_type === "fill_blank" && answer.trim()) {
      try {
        const res = await api.quizzes.judgeAnswer({
          question_text: q.question_text, correct_answer: q.correct_answer, user_answer: answer,
        })
        isCorrect = res.correct
      } catch {}
    }
    setAnswerResult({ correct: isCorrect, correct_answer: q.correct_answer, explanation: q.explanation })
    setAutoAdvanceTimer(4)
  }

  const handleUndo = () => {
    const newAnswers = { ...answers }
    delete newAnswers[currentQ]
    setAnswers(newAnswers)
    setAnswerResult(null)
    setAutoAdvanceTimer(null)
  }

  const handleHint = async () => {
    if (hintUsed || hintLoading || !quiz) return
    setHintLoading(true)
    try {
      const res = await api.quizzes.hint(quiz.questions[currentQ].id)
      setHintText(res.hint)
      setHintUsed(true)
    } catch {}
    setHintLoading(false)
  }

  const handleSkip = () => {
    const newAnswers = { ...answers, [currentQ]: "__skipped__" }
    setAnswers(newAnswers)
    if (currentQ < quiz.questions.length - 1) {
      setHintText(null)
      setHintUsed(false)
      setCurrentQ(currentQ + 1)
    } else {
      finishQuiz(newAnswers)
    }
  }

  const handleNext = () => {
    setAnswerResult(null)
    setAutoAdvanceTimer(null)
    if (currentQ < quiz.questions.length - 1) {
      setHintText(null)
      setHintUsed(false)
      setCurrentQ(currentQ + 1)
    } else {
      finishQuiz()
    }
  }

  useEffect(() => {
    if (autoAdvanceTimer === null) return
    if (autoAdvanceTimer > 0) {
      const id = setTimeout(() => setAutoAdvanceTimer(autoAdvanceTimer - 1), 1000)
      return () => clearTimeout(id)
    }
    handleNext()
  }, [autoAdvanceTimer])

  useEffect(() => {
    if (!quiz) return
    setTimeLeft(timePerQuestion)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [quiz, currentQ])

  useEffect(() => {
    setFillBlankValue("")
  }, [currentQ])

  useEffect(() => {
    if (timeLeft !== 0 || !quiz || answers[currentQ] !== undefined) return
    handleNext()
  }, [timeLeft])

  const finishQuiz = async (finalAnswers?: Record<number, string>) => {
    const ans = finalAnswers || answers
    let s = 0
    const r: any[] = quiz.questions.map((q: any, i: number) => {
      const userAnswer = ans[i]
      const a = (userAnswer || "").trim().toLowerCase()
      const c = (q.correct_answer || "").trim().toLowerCase()
      const v = (q.options?.[userAnswer]?.toString() || "").trim().toLowerCase()
      const correct = a !== "" && (a === c || v === c)
      if (correct) s++
      return { ...q, userAnswer: ans[i], correct }
    })

    // AI-judge fill-blank answers
    let finalScore = s
    const finalResults = await Promise.all(
      r.map(async (q: any) => {
        if (q.question_type === "fill_blank" && q.userAnswer) {
          try {
            const res = await api.quizzes.judgeAnswer({
              question_text: q.question_text,
              correct_answer: q.correct_answer,
              user_answer: q.userAnswer,
            })
            if (res.correct && !q.correct) finalScore++
            if (!res.correct && q.correct) finalScore--
            return { ...q, correct: res.correct }
          } catch { return q }
        }
        return q
      })
    )
    setScore(finalScore)
    setResults(finalResults)
    setShowResult(true)
    api.quizzes.complete({ score: s, total_questions: quiz.questions.length, quiz_id: quiz.quiz_id }).catch(() => {})
    const wrong = r.filter((q: any) => !q.correct)
    if (wrong.length > 0) {
      api.flashcards.generate({
        wrong_answers: wrong.map((q: any) => ({
          question_text: q.question_text,
          question_type: q.question_type || "mcq",
          options: q.options || null,
          correct_answer: q.correct_answer,
          user_wrong_answer: q.userAnswer || null,
          explanation: q.explanation || null,
          difficulty: q.difficulty || "medium",
        })),
        quiz_id: quiz.quiz_id,
      }).catch(() => {})
    }
    api.achievements.check({ event: "quiz_complete", data: { score: s, total_questions: quiz.questions.length } })
      .then((res) => { if (res.new_achievements?.length > 0) setBadgePopup(res.new_achievements[0]) })
      .catch(() => {})
  }

  if (showResult && quiz) {
    const accuracy = Math.round((score / quiz.questions.length) * 100)
    const grade = accuracy >= 80 ? "Excellent!" : accuracy >= 60 ? "Good Job!" : accuracy >= 40 ? "Keep Trying!" : "Needs Practice"
    const gradeColor = accuracy >= 80 ? "text-emerald-400" : accuracy >= 60 ? "text-cyan-400" : accuracy >= 40 ? "text-amber-400" : "text-red-400"

    return (
      <div className="min-h-screen py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 text-center mb-8 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6 border border-purple-500/15">
              <Brain className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Quiz Complete!</h1>
            <p className="text-gray-400 text-sm mb-8">{quiz.title}</p>

            <div className="text-6xl font-bold gradient-text mb-2">{score}/{quiz.questions.length}</div>
            <p className={`text-lg font-semibold ${gradeColor} mb-6`}>{grade}</p>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-200">{accuracy}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-200">{quiz.questions.length}</div>
                <div className="text-xs text-gray-500">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-200">{score}</div>
                <div className="text-xs text-gray-500">Correct</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {results.map((q, i) => (
              <div key={i} className={`card p-4 animate-fade-in-up ${q.correct ? "border-emerald-500/20" : "border-red-500/20"}`} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${q.correct ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                    {q.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium mb-1">{q.question_text}</p>
                    <p className="text-xs text-gray-500">
                      Your answer: <span className={q.correct ? "text-emerald-400" : "text-red-400"}>{q.userAnswer}</span>
                      {!q.correct && <> &middot; Correct: <span className="text-emerald-400">{q.correct_answer}</span></>}
                    </p>
                    {q.explanation && <p className="text-xs text-gray-600 mt-1">{q.explanation}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleExport(quiz.quiz_id)} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Export JSON
            </button>
            <button onClick={() => { setQuiz(null); setShowResult(false) }} className="btn-primary flex-1 text-center">
              New Quiz
            </button>
            <Link href="/dashboard" className="btn-primary flex-1 text-center">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (quiz) {
    const q = quiz.questions[currentQ]
    return (
      <div className="min-h-screen py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold truncate">{quiz.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-mono">{currentQ + 1}/{quiz.questions.length}</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className={`font-mono font-bold text-lg min-w-[2.5ch] text-center ${
                  timeLeft <= 5 ? "text-red-400 animate-breathe" : "text-cyan-400"
                }`}>
                  {timeLeft}
                </span>
              </div>
            </div>
          </div>

          <div className="progress-bar mb-4">
            <div className="progress-bar-fill" style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }} />
          </div>

          <div className="flex items-center justify-end gap-2 mb-6">
            <button
              onClick={handleHint}
              disabled={hintUsed || hintLoading || answers[currentQ] !== undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                hintUsed
                  ? "bg-amber-500/10 text-amber-400/50 cursor-default"
                  : hintLoading
                    ? "bg-amber-500/10 text-amber-400"
                    : answers[currentQ] !== undefined
                      ? "bg-gray-500/10 text-gray-500 cursor-default"
                      : "bg-amber-500/12 text-amber-300 hover:bg-amber-500/20 hover:-translate-y-0.5 cursor-pointer"
              }`}
            >
              {hintLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lightbulb className="w-3.5 h-3.5" />
              )}
              {hintLoading ? "Thinking..." : hintUsed ? "Hint Used" : "Hint"}
            </button>
            <button
              onClick={handleSkip}
              disabled={answers[currentQ] !== undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                answers[currentQ] !== undefined
                  ? "bg-gray-500/10 text-gray-500 cursor-default"
                  : "bg-gray-500/12 text-gray-400 hover:bg-gray-500/20 hover:-translate-y-0.5 cursor-pointer"
              }`}
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
          </div>

          {hintText && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/8 border border-amber-500/15 animate-slide-down">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200/90 leading-relaxed">{hintText}</p>
              </div>
            </div>
          )}

          <div className="card p-8 mb-6 animate-scale-in">
            <div className="flex items-center gap-2 mb-6">
              <span className={`badge ${
                q.question_type === "mcq" ? "badge-purple" :
                q.question_type === "true_false" ? "badge-medium" : "badge-easy"
              }`}>{q.question_type.replace("_", " ")}</span>
              <span className="text-xs text-gray-500">Question {currentQ + 1}</span>
            </div>

            <h2 className="text-xl font-medium mb-6 leading-relaxed">{q.question_text}</h2>

            <div className="space-y-3">
              {q.question_type === "true_false" && q.options ? (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(q.options).map(([key, val]) => (
                    <button key={key} onClick={() => handleAnswer(key)}
                      className={`py-4 px-6 rounded-xl border text-lg font-semibold transition-all ${
                        answers[currentQ] === key
                          ? "border-purple-500 bg-purple-500/10 shadow-sm"
                          : "border-purple-500/10 hover:border-purple-500/30 bg-purple-500/[0.02] hover:bg-purple-500/5"
                      }`}
                    >{val as string}</button>
                  ))}
                </div>
              ) : q.options && Object.entries(q.options).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    answers[currentQ] === key
                      ? "border-purple-500 bg-purple-500/10 shadow-sm shadow-purple-500/10"
                      : "border-purple-500/10 hover:border-purple-500/30 bg-purple-500/[0.02] hover:bg-purple-500/5"
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 text-sm font-medium mr-3">
                    {key}
                  </span>
                  <span className="text-gray-300">{val as string}</span>
                </button>
              ))}

              {q.question_type === "fill_blank" && (
                <input
                  type="text"
                  value={fillBlankValue}
                  onChange={(e) => setFillBlankValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && fillBlankValue.trim()) {
                      if (timerRef.current) {
                        clearInterval(timerRef.current)
                        timerRef.current = null
                      }
                      handleAnswer(fillBlankValue)
                    }
                  }}
                  className="input-field"
                  placeholder="Type your answer..."
                />
              )}
            </div>

            {answerResult && (
              <div className={`mt-6 p-5 rounded-xl ${
                answerResult.correct
                  ? "bg-emerald-500/8 border border-emerald-500/15"
                  : "bg-red-500/8 border border-red-500/15"
              } animate-slide-down`}>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    answerResult.correct ? "bg-emerald-500/15" : "bg-red-500/15"
                  }`}>
                    <span className={`font-bold text-lg ${answerResult.correct ? "text-emerald-400" : "text-red-400"}`}>
                      {answerResult.correct ? "✓" : "✗"}
                    </span>
                  </div>
                  <div>
                    <p className={`font-semibold ${answerResult.correct ? "text-emerald-400" : "text-red-400"}`}>
                      {answerResult.correct ? "Correct!" : "Wrong!"}
                    </p>
                  </div>
                </div>
                {!answerResult.correct && (
                  <p className="text-sm text-gray-400 mt-2 ml-11">
                    <span className="text-gray-500">Correct answer: </span>
                    <span className="text-emerald-400 font-medium">{answerResult.correct_answer}</span>
                  </p>
                )}
                {answerResult.explanation && (
                  <p className="text-xs text-gray-500 mt-2 ml-11 leading-relaxed">{answerResult.explanation}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0 || autoAdvanceTimer !== null}
              className="btn-ghost disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4 mr-1 inline" /> Previous
            </button>
            {answerResult ? (
              <div className="flex items-center gap-3">
                {autoAdvanceTimer !== null && autoAdvanceTimer > 0 && (
                  <button onClick={handleUndo} className="btn-secondary text-sm px-4 py-2">
                    Undo
                  </button>
                )}
                <span className="text-sm text-gray-500 font-mono">
                  Next in <span className="text-purple-400 font-semibold">{autoAdvanceTimer}</span>
                </span>
              </div>
            ) : (
              <button
                onClick={handleNext}
                disabled={answers[currentQ] === undefined}
                className="btn-primary"
              >
                {currentQ < quiz.questions.length - 1 ? "Next Question" : "Finish Quiz"}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-24 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/15 to-cyan-500/10 flex items-center justify-center mx-auto mb-5 border border-purple-500/10 shadow-lg shadow-purple-500/5">
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Generate a Quiz</h1>
          <p className="text-gray-500 mt-2">Choose a topic and let AI create questions instantly</p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3.5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Topics */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Quick Topics</label>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: "Science", icon: Atom, gradient: "from-cyan-500/10 to-blue-600/5", border: "hover:border-cyan-500/25", text: "text-cyan-400", bg: "bg-cyan-500/10" },
                { label: "Math", icon: Calculator, gradient: "from-purple-500/10 to-purple-600/5", border: "hover:border-purple-500/25", text: "text-purple-400", bg: "bg-purple-500/10" },
                { label: "Physics", icon: FlaskConical, gradient: "from-amber-500/10 to-orange-600/5", border: "hover:border-amber-500/25", text: "text-amber-400", bg: "bg-amber-500/10" },
                { label: "History", icon: Landmark, gradient: "from-orange-500/10 to-red-600/5", border: "hover:border-orange-500/25", text: "text-orange-400", bg: "bg-orange-500/10" },
                { label: "Biology", icon: Microscope, gradient: "from-emerald-500/10 to-green-600/5", border: "hover:border-emerald-500/25", text: "text-emerald-400", bg: "bg-emerald-500/10" },
                { label: "Geography", icon: Globe, gradient: "from-blue-500/10 to-indigo-600/5", border: "hover:border-blue-500/25", text: "text-blue-400", bg: "bg-blue-500/10" },
                { label: "Literature", icon: ScrollText, gradient: "from-pink-500/10 to-rose-600/5", border: "hover:border-pink-500/25", text: "text-pink-400", bg: "bg-pink-500/10" },
                { label: "Technology", icon: Lightbulb, gradient: "from-violet-500/10 to-purple-600/5", border: "hover:border-violet-500/25", text: "text-violet-400", bg: "bg-violet-500/10" },
                { label: "Chemistry", icon: Dna, gradient: "from-teal-500/10 to-emerald-600/5", border: "hover:border-teal-500/25", text: "text-teal-400", bg: "bg-teal-500/10" },
                { label: "Astronomy", icon: Telescope, gradient: "from-indigo-500/10 to-blue-600/5", border: "hover:border-indigo-500/25", text: "text-indigo-400", bg: "bg-indigo-500/10" },
                { label: "Art", icon: Palette, gradient: "from-rose-500/10 to-pink-600/5", border: "hover:border-rose-500/25", text: "text-rose-400", bg: "bg-rose-500/10" },
                { label: "Music", icon: Music, gradient: "from-fuchsia-500/10 to-purple-600/5", border: "hover:border-fuchsia-500/25", text: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
                { label: "Sports", icon: Dumbbell, gradient: "from-red-500/10 to-orange-600/5", border: "hover:border-red-500/25", text: "text-red-400", bg: "bg-red-500/10" },
                { label: "Nature", icon: Leaf, gradient: "from-green-500/10 to-emerald-600/5", border: "hover:border-green-500/25", text: "text-green-400", bg: "bg-green-500/10" },
                { label: "Programming", icon: Cpu, gradient: "from-sky-500/10 to-cyan-600/5", border: "hover:border-sky-500/25", text: "text-sky-400", bg: "bg-sky-500/10" },
                { label: "Psychology", icon: HeartPulse, gradient: "from-pink-500/10 to-rose-600/5", border: "hover:border-pink-500/25", text: "text-pink-400", bg: "bg-pink-500/10" },
                { label: "Philosophy", icon: Brain, gradient: "from-stone-500/10 to-yellow-600/5", border: "hover:border-stone-500/25", text: "text-stone-400", bg: "bg-stone-500/10" },
                { label: "Engineering", icon: Wrench, gradient: "from-slate-500/10 to-gray-600/5", border: "hover:border-slate-500/25", text: "text-slate-400", bg: "bg-slate-500/10" },
                { label: "Economics", icon: Briefcase, gradient: "from-yellow-500/10 to-amber-600/5", border: "hover:border-yellow-500/25", text: "text-yellow-400", bg: "bg-yellow-500/10" },
                { label: "Medicine", icon: Stethoscope, gradient: "from-lime-500/10 to-green-600/5", border: "hover:border-lime-500/25", text: "text-lime-400", bg: "bg-lime-500/10" },
                { label: "Animals", icon: PawPrint, gradient: "from-amber-500/10 to-yellow-600/5", border: "hover:border-amber-500/25", text: "text-amber-400", bg: "bg-amber-500/10" },
                { label: "Languages", icon: Languages, gradient: "from-teal-500/10 to-blue-600/5", border: "hover:border-teal-500/25", text: "text-teal-400", bg: "bg-teal-500/10" },
                { label: "Mythology", icon: BookOpen, gradient: "from-violet-500/10 to-pink-600/5", border: "hover:border-violet-500/25", text: "text-violet-400", bg: "bg-violet-500/10" },
                { label: "Robotics", icon: Bot, gradient: "from-sky-500/10 to-indigo-600/5", border: "hover:border-sky-500/25", text: "text-sky-400", bg: "bg-sky-500/10" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setTopic(item.label)}
                  className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                    topic === item.label
                      ? `bg-gradient-to-br ${item.gradient} ${item.border.replace("hover:", "")} shadow-sm`
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-purple-500/15"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${topic === item.label ? item.bg : "bg-white/[0.04]"} flex items-center justify-center transition-all group-hover:scale-110`}>
                    <item.icon className={`w-4 h-4 ${topic === item.label ? item.text : "text-gray-500"}`} />
                  </div>
                  <span className={`text-xs font-medium ${topic === item.label ? "text-white" : "text-gray-500 group-hover:text-gray-300"} transition-colors`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Topic */}
          <div className="card p-6">
            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Custom Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Pakistan History, Python, World War II..."
                  required
                />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2.5">
                    <span className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center text-xs text-purple-400 font-bold">#</span>
                    Questions
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNumQuestions(Math.max(1, numQuestions - 1))}
                      className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 hover:border-purple-500/25 hover:bg-purple-500/5 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-all"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold gradient-text-simple">{numQuestions}</span>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">questions</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNumQuestions(Math.min(20, numQuestions + 1))}
                      className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 hover:border-purple-500/25 hover:bg-purple-500/5 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-all"
                    >
                      +
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2.5 mt-5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Timer (seconds)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTimePerQuestion(Math.max(5, timePerQuestion - 5))}
                      className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/25 hover:bg-cyan-500/5 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-all"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold gradient-text-simple">{timePerQuestion}</span>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">sec / q</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTimePerQuestion(Math.min(120, timePerQuestion + 5))}
                      className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/25 hover:bg-cyan-500/5 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2.5">
                    <span className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center text-xs text-amber-400 font-bold">!</span>
                    Difficulty
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { value: "easy", label: "Easy", color: "text-emerald-400", dot: "bg-emerald-400", active: "border-emerald-500/30 bg-emerald-500/8" },
                      { value: "medium", label: "Medium", color: "text-amber-400", dot: "bg-amber-400", active: "border-amber-500/30 bg-amber-500/8" },
                      { value: "hard", label: "Hard", color: "text-red-400", dot: "bg-red-400", active: "border-red-500/30 bg-red-500/8" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDifficulty(opt.value)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          difficulty === opt.value
                            ? `${opt.active} ${opt.color}`
                            : "border-transparent text-gray-500 hover:bg-white/[0.03] hover:text-gray-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${difficulty === opt.value ? opt.dot : "bg-gray-600"}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Quiz
              </>
            )}
          </button>
        </form>

        {recentQuizzes.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Quizzes</h2>
              <div className="ml-auto flex items-center gap-2">
                <label className="btn-ghost text-xs px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Import
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recentQuizzes.slice(0, 6).map((q: any) => (
                <div key={q.id} className="relative group/card">
                  <Link
                    href={`/quiz/${q.id}`}
                    className="card p-4 hover:border-purple-500/20 transition-all block"
                  >
                    <p className="text-sm font-medium truncate group-hover/card:text-purple-300 transition-colors pr-5">{q.title}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className={`badge ${
                        q.difficulty === "easy" ? "badge-easy" : q.difficulty === "hard" ? "badge-hard" : "badge-medium"
                      }`}>{q.difficulty}</span>
                      <span>{q.question_count} questions</span>
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.preventDefault(); handleExport(q.id) }}
                      className="w-6 h-6 rounded-full bg-white/[0.04] hover:bg-purple-500/15 flex items-center justify-center"
                    >
                      <Download className="w-3 h-3 text-gray-500 hover:text-purple-400" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteQuiz(q.id, e)}
                      className="w-6 h-6 rounded-full bg-white/[0.04] hover:bg-red-500/15 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BadgePopup badge={badgePopup} onClose={() => setBadgePopup(null)} />
    </div>
  )
}
