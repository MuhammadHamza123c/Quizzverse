"use client"

import { useState, useEffect, useRef, Suspense, useCallback, type ReactNode } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { getWsUrl } from "@/lib/config"
import { supabase } from "@/lib/supabase"
import BadgePopup from "@/components/BadgePopup"
import LiveKitVideo from "@/components/LiveKitVideo"
import { Users, Trophy, Loader2, Play, Copy, Check, Crown, Clock, Sparkles, Medal, Star, ArrowLeft, Lightbulb, SkipForward, Brain, CheckCircle2, AlertCircle, Video, Grip, Download } from "lucide-react"
import Link from "next/link"

function RoomContent() {
  const { code } = useParams()
  const searchParams = useSearchParams()
  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [hostId, setHostId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gameState, setGameState] = useState<"waiting" | "playing" | "ended">("waiting")
  const [currentQ, setCurrentQ] = useState<any>(null)
  const [qNumber, setQNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [myScore, setMyScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<any>(null)
  const [hintText, setHintText] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [badgePopup, setBadgePopup] = useState<any>(null)
  const [answerPending, setAnswerPending] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [prevQuestions, setPrevQuestions] = useState<any[]>([])
  const [fillBlankValue, setFillBlankValue] = useState("")
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const timerRef = useRef<any>(null)
  const autoAdvanceIntervalRef = useRef<any>(null)
  const nextQuestionSentRef = useRef(false)
  const answerPendingTimeoutRef = useRef<any>(null)
  const pendingStartRef = useRef(false)

  const [videoEnabled, setVideoEnabled] = useState(false)
  const videoEnabledRef = useRef(false)
  const [videoPos, setVideoPos] = useState({ x: 16, y: 16 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 })
  const posInitialized = useRef(false)
  const [panelW, setPanelW] = useState(260)
  const [videoH, setVideoH] = useState(180)
  const [resizing, setResizing] = useState(false)
  const resizeStart = useRef({ x: 0, y: 0, w: 260, h: 180 })

  const prevQuestionsRef = useRef<any[]>([])
  const latestCurrentQ = useRef<any>(null)
  const latestQNumber = useRef(0)
  const latestSelectedAnswer = useRef<string | null>(null)
  const latestAnswerResult = useRef<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user || null)
      try {
        const roomData = await api.rooms.get(code as string)
        setRoom(roomData.room)
        setParticipants(roomData.participants || [])
        setHostId(roomData.room.host_id)
        setGameState(roomData.room.status === "active" ? "playing" : roomData.room.status === "ended" ? "ended" : "waiting")
      } catch {}
      setLoading(false)
    })
  }, [code])

  const userRef = useRef(user)
  userRef.current = user
  const hostIdRef = useRef(hostId)
  hostIdRef.current = hostId
  const isHost = !!(user?.id && hostId === user.id)
  const myIdentity = user?.id || searchParams.get("participant_id") || ""
  const myName = user?.user_metadata?.full_name || searchParams.get("guest_name") || user?.email?.split("@")[0] || "Player"

  useEffect(() => {
    if (!room) return

    const pid = searchParams.get("participant_id")
    const uid = userRef.current?.id
    const wsId = uid || pid || crypto.randomUUID()
    const gname = searchParams.get("guest_name") || ""
    const wsUrl = `${getWsUrl("/ws/" + room.id)}?participant_id=${wsId}&guest_name=${encodeURIComponent(gname)}`
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      setConnected(true)
      if (pendingStartRef.current) {
        pendingStartRef.current = false
        try { ws.current?.send(JSON.stringify({ type: "start_quiz" })) } catch {}
      }
    }

    ws.current.onerror = () => { setAnswerPending(false); if (answerPendingTimeoutRef.current) clearTimeout(answerPendingTimeoutRef.current) }
    ws.current.onclose = () => { setAnswerPending(false); if (answerPendingTimeoutRef.current) clearTimeout(answerPendingTimeoutRef.current) }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === "player_list") {
        setParticipants(msg.players || [])
      } else if (msg.type === "new_question") {
        nextQuestionSentRef.current = false
        if (answerPendingTimeoutRef.current) { clearTimeout(answerPendingTimeoutRef.current); answerPendingTimeoutRef.current = null }
        setAnswerPending(false)
        if (msg.question_number === 1) {
          prevQuestionsRef.current = []
          setPrevQuestions([])
        }
        const prevQ = latestCurrentQ.current
        const prevResult = latestAnswerResult.current
        const prevAnswer = latestSelectedAnswer.current
        const prevNum = latestQNumber.current
        if (prevQ && prevResult && prevNum > 0) {
          const exists = prevQuestionsRef.current.find((p) => p.qNumber === prevNum)
          if (!exists) {
            prevQuestionsRef.current = [...prevQuestionsRef.current, { ...prevQ, qNumber: prevNum, myAnswer: prevAnswer, answerResult: prevResult }]
            setPrevQuestions(prevQuestionsRef.current)
          }
        }
        setCurrentQ(msg.question)
        setQNumber(msg.question_number)
        setTotalQ(msg.total_questions)
        setTimeLeft(msg.question.time_limit || 30)
        setSelectedAnswer(null)
        setAnswerResult(null)
        setHintText(null)
        setHintLoading(false)
        setGameState("playing")
        setReviewMode(false)
        setReviewIndex(0)
        setFillBlankValue("")
        setShowReview(false)
      } else if (msg.type === "answer_result") {
        if (answerPendingTimeoutRef.current) { clearTimeout(answerPendingTimeoutRef.current); answerPendingTimeoutRef.current = null }
        setAnswerPending(false)
        setAnswerResult(msg)
        if (msg.new_score !== undefined) setMyScore(msg.new_score)
      } else if (msg.type === "leaderboard") {
        setLeaderboard(msg.leaderboard)
      } else if (msg.type === "quiz_end") {
        setGameState("ended")
        if (userRef.current?.id || searchParams.get("participant_id")) {
          const myId = userRef.current?.id || searchParams.get("participant_id")
          const ranked = [...msg.leaderboard || []].sort((a: any, b: any) => b.score - a.score)
          if (ranked.length > 0 && ranked[0].user_id === myId) {
            api.achievements.check({ event: "room_won" }).then((res) => {
              if (res.new_achievements?.length > 0) setBadgePopup(res.new_achievements[0])
            }).catch(() => {})
          }
        }
      } else if (msg.type === "hint") {
        setHintText(msg.hint)
        setHintLoading(false)
      } else if (msg.type === "quiz_started") {
        setGameState("playing")
        if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: "next_question" }))
      } else if (msg.type === "player_done") {
        setCurrentQ(null)
      } else if (msg.type === "video_toggle") {
        setVideoEnabled(msg.enabled)
        videoEnabledRef.current = msg.enabled
      } else if (msg.type === "error") {
        console.error("[WS] error:", msg.message)
      }
    }

    return () => { ws.current?.close() }
  }, [room])

  useEffect(() => {
    if (!currentQ || answerResult) return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [currentQ, answerResult])

  const handleNextQuestion = useCallback(() => {
    if (nextQuestionSentRef.current) return
    nextQuestionSentRef.current = true
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "next_question" }))
    }
  }, [])

  useEffect(() => {
    if (!answerResult) {
      if (autoAdvanceIntervalRef.current) {
        clearInterval(autoAdvanceIntervalRef.current)
        autoAdvanceIntervalRef.current = null
      }
      setAutoAdvanceTimer(null)
      nextQuestionSentRef.current = false
      return
    }

    setAutoAdvanceTimer(5)
    if (autoAdvanceIntervalRef.current) {
      clearInterval(autoAdvanceIntervalRef.current)
    }

    autoAdvanceIntervalRef.current = setInterval(() => {
      setAutoAdvanceTimer((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          if (autoAdvanceIntervalRef.current) {
            clearInterval(autoAdvanceIntervalRef.current)
            autoAdvanceIntervalRef.current = null
          }
          setAutoAdvanceTimer(null)
          handleNextQuestion()
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (autoAdvanceIntervalRef.current) {
        clearInterval(autoAdvanceIntervalRef.current)
        autoAdvanceIntervalRef.current = null
      }
    }
  }, [answerResult, handleNextQuestion])

  const handleStart = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "start_quiz" }))
    } else {
      pendingStartRef.current = true
    }
  }, [])

  const handleVideoToggle = (enabled: boolean) => {
    setVideoEnabled(enabled)
    videoEnabledRef.current = enabled
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "video_toggle", enabled }))
    }
  }

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, left: videoPos.x, top: videoPos.y }
  }, [videoPos])

  useEffect(() => {
    if (!posInitialized.current) {
      posInitialized.current = true
      setVideoPos({ x: window.innerWidth - 280, y: window.innerHeight - 340 })
    }
  }, [])

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      setVideoPos({
        x: Math.max(0, dragStart.current.left + (e.clientX - dragStart.current.x)),
        y: Math.max(0, dragStart.current.top + (e.clientY - dragStart.current.y)),
      })
    }
    const handleMouseUp = () => setDragging(false)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragging])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeStart.current = { x: e.clientX, y: e.clientY, w: panelW, h: videoH }
    setResizing(true)
  }

  useEffect(() => {
    if (!resizing) return
    const handleMouseMove = (e: MouseEvent) => {
      setPanelW(Math.max(180, resizeStart.current.w + (e.clientX - resizeStart.current.x)))
      setVideoH(Math.max(80, resizeStart.current.h + (e.clientY - resizeStart.current.y)))
    }
    const handleMouseUp = () => setResizing(false)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizing])

  const handleUndo = () => {
    if (autoAdvanceIntervalRef.current) {
      clearInterval(autoAdvanceIntervalRef.current)
      autoAdvanceIntervalRef.current = null
    }
    setAutoAdvanceTimer(null)
    nextQuestionSentRef.current = false
  }

  const handleAnswer = async (answer: string) => {
    if (answerPending || answerResult || !currentQ) return
    setSelectedAnswer(answer)
    setAnswerPending(true)
    setFillBlankValue("")
    if (timerRef.current) clearInterval(timerRef.current)

    answerPendingTimeoutRef.current = setTimeout(() => {
      setAnswerPending(false)
      answerPendingTimeoutRef.current = null
    }, 15000)

    latestCurrentQ.current = currentQ
    latestQNumber.current = qNumber
    latestSelectedAnswer.current = answer

    try {
      ws.current?.send(JSON.stringify({
        type: "submit_answer",
        question_id: currentQ.id,
        answer: answer,
        time_spent: (currentQ.time_limit || 30) - timeLeft,
      }))
    } catch {}
  }

  const handleSkip = () => {
    if (answerPending || answerResult || !currentQ) return
    setAnswerResult({ correct: false, skipped: true, correct_answer: "", explanation: "" })
    setAnswerPending(false)
    if (timerRef.current) clearInterval(timerRef.current)

    latestCurrentQ.current = currentQ
    latestQNumber.current = qNumber
    latestSelectedAnswer.current = null

    try {
      ws.current?.send(JSON.stringify({
        type: "skip_question",
        question_id: currentQ.id,
      }))
    } catch {}
  }

  const handleHint = () => {
    if (hintLoading || hintText || !currentQ) return
    setHintLoading(true)
    try {
      ws.current?.send(JSON.stringify({
        type: "request_hint",
        question_id: currentQ.id,
      }))
    } catch {}
  }

  const handleReview = () => {
    setReviewMode(true)
    setReviewIndex(prevQuestions.length - 1)
  }

  const handleReviewNav = (dir: "prev" | "next") => {
    setReviewIndex((prev) => dir === "prev" ? Math.max(0, prev - 1) : Math.min(prevQuestions.length - 1, prev + 1))
  }

  const handleExport = async () => {
    if (!room?.quiz_id) return
    try {
      const exported = await api.quizzes.export(room.quiz_id)
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${exported.title.replace(/[^a-z0-9]/gi, "_")}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  useEffect(() => {
    latestCurrentQ.current = currentQ
    latestQNumber.current = qNumber
    latestSelectedAnswer.current = selectedAnswer
    latestAnswerResult.current = answerResult
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold">Room not found</h2>
          <p className="text-gray-500">This room doesn't exist or has expired.</p>
          <Link href="/rooms/join" className="btn-primary inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</Link>
        </div>
      </div>
    )
  }

  // ──────────── VIDEO (persistent) ────────────
  const videoPanel = room?.settings?.video_enabled && (videoEnabled || isHost) && (
    <div
      className={`fixed z-50 shadow-2xl select-none ${dragging || resizing ? "transition-none" : "transition-all duration-200"}`}
      style={{ top: videoPos.y, left: videoPos.x, width: panelW }}
    >
      <div className="rounded-2xl overflow-hidden border border-white/[0.1] bg-gray-950/95 backdrop-blur-2xl shadow-[0_0_30px_-5px_rgba(139,92,246,0.15)]">
        <div
          className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06] cursor-grab active:cursor-grabbing bg-white/[0.02]"
          onMouseDown={handleDragStart}
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/10 flex items-center justify-center">
            <Video className="w-3 h-3 text-purple-400" />
          </div>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.15em]">Video Room</span>
          {videoEnabled ? (
            <span className="ml-auto flex items-center gap-1.5 text-[9px] text-emerald-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="ml-auto text-[9px] text-gray-600 uppercase tracking-wider">Off</span>
          )}
        </div>
        <div className="p-3">
          <LiveKitVideo
            roomId={room.id}
            identity={myIdentity}
            name={myName}
            enabled={videoEnabled}
            isHost={isHost}
            onToggle={handleVideoToggle}
            height={videoH}
          />
        </div>
        <div
          className="h-5 flex items-center justify-center cursor-nwse-resize hover:bg-white/[0.03] border-t border-white/[0.06] group"
          onMouseDown={handleResizeStart}
        >
          <div className="flex items-center justify-center">
            <Grip className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors rotate-45" />
          </div>
        </div>
      </div>
    </div>
  )

  // ──────────── CONTENT ────────────
  let content: ReactNode

  if (gameState === "waiting") {
    content = (
      <div className="min-h-screen py-24 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-purple-500/15 to-cyan-500/10 flex items-center justify-center text-purple-300">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs tracking-[0.35em] uppercase text-cyan-400 mb-2">Room lobby</p>
                <h1 className="text-3xl font-semibold">{room.topic || "Quiz"} Room</h1>
                <p className="mt-3 text-gray-400">Share the room code with friends, wait for players to join, and start the quiz when everyone is ready.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Room code</p>
                <div className="mt-2 font-mono text-3xl tracking-[0.35em] text-purple-300">{room.room_code}</div>
                <button onClick={() => { navigator.clipboard.writeText(room.room_code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="btn-secondary mt-4 w-full flex items-center justify-center gap-2 py-3 text-sm">
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy Code"}
                </button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Host</p>
                <p className="mt-2 text-xl font-semibold text-white">{participants.find((p: any) => p.is_host)?.guest_name || "Host"}</p>
                <p className="text-sm text-gray-400 mt-1">{participants.find((p: any) => p.is_host)?.guest_name ? "Host joined" : "Host not found"}</p>
                <div className="mt-6 rounded-2xl bg-white/[0.03] p-4 border border-white/5">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Players joined</p>
                  <p className="mt-2 text-3xl font-semibold">{participants.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">Players</h2>
                <p className="text-gray-400">All players are listed here as they join the room.</p>
              </div>
              <div className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-200">Live</div>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-10">
                <div className="spinner mx-auto mb-4" />
                <p className="text-sm text-gray-500">Waiting for players to join...</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {participants.map((p: any, i: number) => (
                  <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/10 flex items-center justify-center text-purple-300">
                      {p.is_host ? <Crown className="w-5 h-5 text-amber-300" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{p.guest_name || p.name || "Player"}</p>
                      <p className="text-xs text-gray-500">{p.is_host ? "Host" : "Participant"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isHost ? (
            <button onClick={handleStart} disabled={participants.length < 1} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg">
              <Play className="w-5 h-5" /> Start Quiz
            </button>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500">
              Waiting for host to start the quiz...
            </div>
          )}
        </div>
      </div>
    )
  } else if (gameState === "playing" && currentQ) {
    const isMcq = currentQ.question_type === "mcq"
    const isTrueFalse = currentQ.question_type === "true_false"
    const isFillBlank = currentQ.question_type === "fill_blank"

    content = (
      <div className="min-h-screen py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold truncate">{room.topic || "Quiz"} Room</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-mono">{qNumber}/{totalQ}</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className={`font-mono font-bold text-lg min-w-[2.5ch] text-center ${timeLeft <= 5 ? "text-red-400 animate-breathe" : "text-cyan-400"}`}>
                  {timeLeft}
                </span>
              </div>
            </div>
          </div>

          <div className="progress-bar mb-4">
            <div className="progress-bar-fill" style={{ width: `${(qNumber / totalQ) * 100}%` }} />
          </div>

          <div className="flex items-center justify-end gap-2 mb-6">
            <button
              onClick={handleHint}
              disabled={hintLoading || hintText || answerResult}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                hintText
                  ? "bg-amber-500/10 text-amber-400/50 cursor-default"
                  : hintLoading
                    ? "bg-amber-500/10 text-amber-400"
                    : answerResult
                      ? "bg-gray-500/10 text-gray-500 cursor-default"
                      : "bg-amber-500/12 text-amber-300 hover:bg-amber-500/20 hover:-translate-y-0.5 cursor-pointer"
              }`}
            >
              {hintLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
              {hintLoading ? "Thinking..." : hintText ? "Hint Used" : "Hint"}
            </button>
            <button
              onClick={handleSkip}
              disabled={!!answerResult}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                answerResult
                  ? "bg-gray-500/10 text-gray-500 cursor-default"
                  : "bg-gray-500/12 text-gray-400 hover:bg-gray-500/20 hover:-translate-y-0.5 cursor-pointer"
              }`}
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
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
                currentQ.question_type === "mcq" ? "badge-purple" :
                currentQ.question_type === "true_false" ? "badge-medium" : "badge-easy"
              }`}>{currentQ.question_type.replace("_", " ")}</span>
              <span className="text-xs text-gray-500">Question {qNumber}</span>
            </div>

            <h2 className="text-xl font-medium mb-6 leading-relaxed">{currentQ.question_text}</h2>

            <div className="space-y-3">
              {isTrueFalse && (
                <div className="grid grid-cols-2 gap-3">
                  {["true", "false"].map((key) => {
                    const val = currentQ.options?.[key] || key
                    return (
                      <button
                        key={key}
                        onClick={() => handleAnswer(key)}
                        disabled={!!answerResult}
                        className={`py-4 px-6 rounded-xl border text-lg font-semibold transition-all ${
                          selectedAnswer === key
                            ? answerResult?.correct
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : "border-red-500/40 bg-red-500/10 text-red-300"
                            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-purple-500/25 text-gray-300"
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {val as string}
                      </button>
                    )
                  })}
                </div>
              )}

              {isMcq && currentQ.options && (
                <div className="space-y-3">
                  {Object.entries(currentQ.options).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => handleAnswer(key)}
                      disabled={!!answerResult}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        selectedAnswer === key
                          ? answerResult?.correct
                            ? "border-purple-500 bg-purple-500/10 shadow-sm shadow-purple-500/10"
                            : "border-red-500/40 bg-red-500/10 text-red-300"
                          : answerResult && (key === answerResult.correct_answer || val === answerResult.correct_answer)
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-purple-500/10 hover:border-purple-500/30 bg-purple-500/[0.02] hover:bg-purple-500/5"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 text-sm font-medium mr-3">{key}</span>
                      <span className="text-gray-300">{val as string}</span>
                    </button>
                  ))}
                </div>
              )}

              {isFillBlank && (
                <div className="space-y-3">
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
                    disabled={!!answerResult}
                  />
                  <button
                    onClick={() => { if (fillBlankValue.trim() && !answerResult) handleAnswer(fillBlankValue.trim()) }}
                    disabled={!fillBlankValue.trim() || !!answerResult || answerPending}
                    className="btn-primary w-full"
                  >
                    {answerPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit Answer"}
                  </button>
                </div>
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
                    <span className="text-emerald-400 font-medium">{currentQ.options?.[answerResult.correct_answer] || answerResult.correct_answer}</span>
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
              onClick={() => setReviewMode(false)}
              disabled={qNumber <= 1 || autoAdvanceTimer !== null}
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
                onClick={handleNextQuestion}
                disabled={!!answerResult || !currentQ}
                className="btn-primary"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      </div>
    )
  } else if (gameState === "playing" && !currentQ) {
    content = (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="spinner mx-auto" />
          <h2 className="text-xl font-bold">You're Done!</h2>
          <p className="text-gray-500">Waiting for other players to finish...</p>
          {prevQuestions.length > 0 && (
            <button onClick={() => { setReviewMode(true); setReviewIndex(0) }} className="btn-ghost flex items-center gap-2 mx-auto">
              <Brain className="w-4 h-4" /> Review Answers
            </button>
          )}
          {reviewMode && prevQuestions.length > 0 && (
            <div className="max-w-2xl mx-auto text-left mt-6 space-y-4">
              {prevQuestions.map((rq, i) => (
                <div key={i} className="card p-4">
                  <p className="font-medium">{rq.question_text}</p>
                  <p className={`text-sm mt-1 ${rq.answerResult?.correct ? "text-emerald-400" : "text-red-400"}`}>
                    {rq.answerResult?.correct ? "Correct" : "Wrong"} — {rq.options?.[rq.answerResult?.correct_answer] || rq.answerResult?.correct_answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  } else if (gameState === "ended") {
    const sorted = [...leaderboard].sort((a: any, b: any) => b.score - a.score)
    const myId = user?.id || searchParams.get("participant_id")

    content = (
      <div className="min-h-screen py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Quiz Complete!</h1>
            <p className="text-gray-500 mt-2">Here's the final leaderboard</p>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Medal className="w-4 h-4" /> Leaderboard
            </h2>
            <div className="space-y-2">
              {sorted.map((p: any, i: number) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${
                  p.user_id === myId ? "border-purple-500/30 bg-purple-500/8" : "border-white/5 bg-white/[0.02]"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-gray-400/20 text-gray-400" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-white/[0.04] text-gray-500"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    {p.user_id === myId && <span className="text-[10px] text-purple-400">You</span>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{p.score}</p>
                    <p className="text-[10px] text-gray-600">pts</p>
                  </div>
                  {i === 0 && <Crown className="w-5 h-5 text-amber-400" />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleExport} className="btn-ghost flex-1 flex items-center justify-center gap-2 py-3">
              <Download className="w-4 h-4" /> Export JSON
            </button>
            <Link href="/dashboard" className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
              Dashboard
            </Link>
            <Link href="/rooms/create" className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3">
              New Room
            </Link>
          </div>
        </div>
        {badgePopup && <BadgePopup badge={badgePopup} onClose={() => setBadgePopup(null)} />}
      </div>
    )
  } else {
    content = null
  }

  return (
    <>
      {content}
      {videoPanel}
    </>
  )
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
      <RoomContent />
    </Suspense>
  )
}
