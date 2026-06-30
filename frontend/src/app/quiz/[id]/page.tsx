"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import BadgePopup from "@/components/BadgePopup"
import { Brain, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Lightbulb, SkipForward, Clock, Download } from "lucide-react"
import Link from "next/link"

export default function QuizDetail() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const paramTimer = parseInt(searchParams.get("timer") || "30", 10)
  const [data, setData] = useState<any>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hintText, setHintText] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [answerResult, setAnswerResult] = useState<any>(null)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(paramTimer)
  const [fillBlankValue, setFillBlankValue] = useState("")
  const [badgePopup, setBadgePopup] = useState<any>(null)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    api.quizzes.get(id as string).then((res) => {
      setData(res)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (autoAdvanceTimer === null) return
    if (autoAdvanceTimer > 0) {
      const id = setTimeout(() => setAutoAdvanceTimer(autoAdvanceTimer - 1), 1000)
      return () => clearTimeout(id)
    }
    handleNext()
  }, [autoAdvanceTimer])

  useEffect(() => {
    if (!data) return
    setTimeLeft(paramTimer)
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
  }, [data, currentQ])

  useEffect(() => {
    setFillBlankValue("")
  }, [currentQ])

  useEffect(() => {
    if (timeLeft !== 0 || !data || answers[currentQ] !== undefined) return
    handleNext()
  }, [timeLeft])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Quiz not found</p>
          <Link href="/quiz" className="btn-primary">Generate New Quiz</Link>
        </div>
      </div>
    )
  }

  const handleAnswer = async (answer: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const newAnswers = { ...answers, [currentQ]: answer }
    setAnswers(newAnswers)
    const q = data.questions[currentQ]
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
    if (hintUsed || hintLoading || !data) return
    setHintLoading(true)
    try {
      const res = await api.quizzes.hint(data.questions[currentQ].id)
      setHintText(res.hint)
      setHintUsed(true)
    } catch {}
    setHintLoading(false)
  }

  const handleSkip = () => {
    const newAnswers = { ...answers, [currentQ]: "__skipped__" }
    setAnswers(newAnswers)
    if (currentQ < data.questions.length - 1) {
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
    if (currentQ < data.questions.length - 1) {
      setHintText(null)
      setHintUsed(false)
      setCurrentQ(currentQ + 1)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async (finalAnswers?: Record<number, string>) => {
    const ans = finalAnswers || answers
    let s = 0
    const r = data.questions.map((q: any, i: number) => {
      const userAnswer = ans[i]
      const a = (userAnswer || "").trim().toLowerCase()
      const c = (q.correct_answer || "").trim().toLowerCase()
      const v = (q.options?.[userAnswer]?.toString() || "").trim().toLowerCase()
      const correct = a !== "" && (a === c || v === c)
      if (correct) s++
      return { ...q, userAnswer: ans[i], correct }
    })
    setScore(s)
    setResults(r)

    // AI-judge fill-blank answers
    let aiScore = s
    const aiResults = await Promise.all(
      r.map(async (q: any) => {
        if (q.question_type === "fill_blank" && q.userAnswer) {
          try {
            const res = await api.quizzes.judgeAnswer({
              question_text: q.question_text,
              correct_answer: q.correct_answer,
              user_answer: q.userAnswer,
            })
            if (res.correct && !q.correct) aiScore++
            if (!res.correct && q.correct) aiScore--
            return { ...q, correct: res.correct }
          } catch { return q }
        }
        return q
      })
    )
    setScore(aiScore)
    setResults(aiResults)

    setShowResult(true)
    api.quizzes.complete({ score: aiScore, total_questions: data.questions.length, quiz_id: data.quiz.id }).catch(() => {})
    const wrong = aiResults.filter((q: any) => !q.correct)
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
        quiz_id: data.quiz.id,
      }).catch(() => {})
    }
    api.achievements.check({ event: "quiz_complete", data: { score: aiScore, total_questions: data.questions.length } })
      .then((res) => { if (res.new_achievements?.length > 0) setBadgePopup(res.new_achievements[0]) })
      .catch(() => {})
  }

  const handleExport = async () => {
    try {
      const exported = await api.quizzes.export(id as string)
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${exported.title.replace(/[^a-z0-9]/gi, "_")}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  if (showResult) {
    const accuracy = Math.round((score / data.questions.length) * 100)
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
            <p className="text-gray-400 text-sm mb-8">{data.quiz.title}</p>
            <div className="text-6xl font-bold gradient-text mb-2">{score}/{data.questions.length}</div>
            <p className={`text-lg font-semibold ${gradeColor} mb-6`}>{grade}</p>
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-200">{accuracy}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-200">{data.questions.length}</div>
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={handleExport} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Export JSON
            </button>
            <Link href="/quiz" className="btn-primary flex-1 text-center">New Quiz</Link>
            <Link href="/dashboard" className="btn-primary flex-1 text-center">Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  const q = data.questions[currentQ]

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold truncate">{data.quiz.title}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-mono">{currentQ + 1}/{data.questions.length}</span>
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
          <div className="progress-bar-fill" style={{ width: `${((currentQ + 1) / data.questions.length) * 100}%` }} />
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
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 text-sm font-medium mr-3">{key}</span>
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
          <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0 || autoAdvanceTimer !== null} className="btn-ghost disabled:opacity-30">
            <ArrowLeft className="w-4 h-4 mr-1 inline" /> Previous
          </button>
          {answerResult ? (
            <div className="flex items-center gap-3">
              {autoAdvanceTimer !== null && autoAdvanceTimer > 0 && (
                <button onClick={handleUndo} className="btn-secondary text-sm px-4 py-2">Undo</button>
              )}
              <span className="text-sm text-gray-500 font-mono">
                Next in <span className="text-purple-400 font-semibold">{autoAdvanceTimer}</span>
              </span>
            </div>
          ) : (
            <button onClick={handleNext} disabled={answers[currentQ] === undefined} className="btn-primary">
              {currentQ < data.questions.length - 1 ? "Next Question" : "Finish Quiz"}
            </button>
          )}
        </div>
      </div>
      <BadgePopup badge={badgePopup} onClose={() => setBadgePopup(null)} />
    </div>
  )
}
