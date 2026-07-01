"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"
import BadgePopup from "@/components/BadgePopup"
import { FileText, Upload, Loader2, Sparkles, File, Play, ArrowRight, Clock, CheckCircle2, AlertCircle, CloudUpload, Trash2, Download } from "lucide-react"

export default function DocumentsPage() {
  const [user, setUser] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [quizResult, setQuizResult] = useState<any>(null)
  const [lastTimer, setLastTimer] = useState(30)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [badgePopup, setBadgePopup] = useState<any>(null)
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})
  const [timerSettings, setTimerSettings] = useState<Record<string, number>>({})
  const [error, setError] = useState("")
  const [roomNames, setRoomNames] = useState<Record<string, string>>({})
  const [roomCreating, setRoomCreating] = useState<string | null>(null)
  const [roomCreateError, setRoomCreateError] = useState("")
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push("/login")
      setUser(data.session.user)
      try {
        const docsData = await api.documents.list()
        setDocs(docsData || [])
      } catch (err: any) {
        setError(err.message)
      }
      setLoading(false)
    })
  }, [router])

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    setError("")
    try {
      const result = await api.documents.upload(file)
      setDocs([result, ...docs])
    } catch (err: any) {
      setError(err.message)
    }
    setUploading(false)
  }, [docs])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    e.target.value = ""
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    dragCounter.current = 0
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["pdf", "docx", "txt"].includes(ext || "")) {
      setError("Only PDF, DOCX, TXT, and JSON files are supported")
      return
    }
    await uploadFile(file)
  }, [uploadFile])

  const handleGenerateQuiz = async (docId: string, numQ: number, timer: number) => {
    setGenerating(docId)
    setError("")
    setQuizResult(null)
    try {
      const result = await api.documents.generateQuiz(docId, numQ, "medium")
      setQuizResult(result)
      setLastTimer(timer)
      api.achievements.check({ event: "document_quiz" })
        .then((res) => { if (res.new_achievements?.length > 0) setBadgePopup(res.new_achievements[0]) })
        .catch(() => {})
    } catch (err: any) {
      setError(err.message)
    }
    setGenerating(null)
  }

  const handleCreateRoomFromDocument = async (docId: string, roomName: string, numQ: number, timer: number) => {
    setRoomCreateError("")
    setRoomCreating(docId)
    try {
      const result = await api.rooms.createFromDocument({
        document_id: docId,
        room_name: roomName,
        num_questions: numQ,
        difficulty: "medium",
        time_per_question: timer,
      })
      router.push(`/rooms/${result.room_code}`)
    } catch (err: any) {
      setRoomCreateError(err.message || "Failed to create room")
    }
    setRoomCreating(null)
  }

  const handleDeleteDoc = async (docId: string) => {
    setDeleting(docId)
    setError("")
    try {
      await api.documents.delete(docId)
      setDocs(docs.filter(d => (d.document_id || d.id) !== docId))
    } catch (err: any) {
      setError(err.message)
    }
    setDeleting(null)
  }

  const handleExportDocQuiz = async (quizId: string) => {
    try {
      const exported = await api.quizzes.export(quizId)
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${exported.title.replace(/[^a-z0-9]/gi, "_")}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/15 to-cyan-500/10 flex items-center justify-center mx-auto mb-5 border border-purple-500/10 shadow-lg shadow-purple-500/5">
            <FileText className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-gray-500 mt-2">Upload PDF, DOCX, TXT, or JSON and generate AI-powered quizzes instantly</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3.5 mb-8 text-red-400 text-sm animate-scale-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="shrink-0 text-red-400/50 hover:text-red-400">&times;</button>
          </div>
        )}

        {/* Upload Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`card p-12 mb-10 text-center cursor-pointer transition-all duration-200 border-2 border-dashed ${
            dragging
              ? "border-purple-400 bg-purple-500/8 shadow-lg shadow-purple-500/10"
              : "border-white/10 hover:border-purple-500/30 hover:bg-white/[0.02]"
          }`}
        >
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.json" onChange={handleUpload} className="hidden" />
          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
              <p className="text-sm text-gray-400">Uploading your file...</p>
            </div>
          ) : dragging ? (
            <div className="flex flex-col items-center gap-4">
              <CloudUpload className="w-10 h-10 text-purple-300" />
              <p className="font-semibold text-purple-300">Drop your file here</p>
              <p className="text-sm text-gray-500">We accept PDF, DOCX, TXT, and JSON</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 flex items-center justify-center border border-purple-500/10">
                <Upload className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-300">
                  Drop a file here or <span className="text-purple-400 underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-gray-600 mt-1">PDF, DOCX, TXT, or JSON &middot; Max 10MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Quiz Generated Banner */}
        {quizResult && (
          <div className="card p-6 mb-10 border-emerald-500/25 animate-scale-in relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-emerald-300">Quiz Generated!</h3>
                <p className="text-sm text-gray-400 mt-0.5">{quizResult.title} &middot; {quizResult.questions?.length} questions &middot; {lastTimer}s per question</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link
                  href={`/quiz/${quizResult.quiz_id}?timer=${lastTimer}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Play className="w-4 h-4" /> Play Quiz
                </Link>
                <button onClick={() => handleExportDocQuiz(quizResult.quiz_id)} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-gray-400 hover:text-gray-300 hover:bg-white/[0.03] transition-all flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export
                </button>
                <button onClick={() => setQuizResult(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-gray-400 hover:text-gray-300 hover:bg-white/[0.03] transition-all">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document List */}
        {docs.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/8 to-cyan-500/8 flex items-center justify-center mx-auto mb-5 border border-purple-500/8">
              <FileText className="w-10 h-10 text-purple-400/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Documents Yet</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              Upload your first file above and let AI turn it into a quiz in seconds.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {docs.map((doc) => {
              const docId = doc.document_id || doc.id
              const isGenerating = generating === docId
              const numQ = questionCounts[docId] ?? 10
              const timer = timerSettings[docId] ?? 30
              return (
                <div key={docId} className="card p-5 card-glow animate-fade-in-up relative group">
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteDoc(docId)}
                    disabled={deleting === docId}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-red-500/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {deleting === docId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                    )}
                  </button>

                  {/* File info */}
                  <div className="flex items-start gap-4 mb-4 pr-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 flex items-center justify-center shrink-0 border border-cyan-500/10">
                      <File className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{doc.file_name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {doc.word_count || 0} words</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Just now"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Config + Generate */}
                  <div className="card p-4 bg-white/[0.02] border border-white/5">
                    {/* Stepper controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2.5">
                          <span className="w-4 h-4 rounded-md bg-purple-500/10 flex items-center justify-center text-[10px] text-purple-400 font-bold">#</span>
                          Questions
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQuestionCounts(prev => ({ ...prev, [docId]: Math.max(3, numQ - 1) }))}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 hover:border-purple-500/25 hover:bg-purple-500/5 flex items-center justify-center text-base text-gray-400 hover:text-white transition-all"
                          >−</button>
                          <div className="flex-1 text-center">
                            <span className="text-xl font-bold gradient-text-simple">{numQ}</span>
                            <p className="text-[9px] text-gray-600 uppercase tracking-wider">questions</p>
                          </div>
                          <button
                            onClick={() => setQuestionCounts(prev => ({ ...prev, [docId]: Math.min(30, numQ + 1) }))}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 hover:border-purple-500/25 hover:bg-purple-500/5 flex items-center justify-center text-base text-gray-400 hover:text-white transition-all"
                          >+</button>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          Timer (sec)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setTimerSettings(prev => ({ ...prev, [docId]: Math.max(5, timer - 5) }))}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 hover:border-cyan-500/25 hover:bg-cyan-500/5 flex items-center justify-center text-base text-gray-400 hover:text-white transition-all"
                          >−</button>
                          <div className="flex-1 text-center">
                            <span className="text-xl font-bold gradient-text-simple">{timer}</span>
                            <p className="text-[9px] text-gray-600 uppercase tracking-wider">sec / q</p>
                          </div>
                          <button
                            onClick={() => setTimerSettings(prev => ({ ...prev, [docId]: Math.min(120, timer + 5) }))}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 hover:border-cyan-500/25 hover:bg-cyan-500/5 flex items-center justify-center text-base text-gray-400 hover:text-white transition-all"
                          >+</button>
                        </div>
                      </div>
                    </div>

                    {/* Generate button */}
                    <button
                      onClick={() => handleGenerateQuiz(docId, numQ, timer)}
                      disabled={isGenerating}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isGenerating
                          ? "bg-purple-500/10 text-purple-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-500/10 to-cyan-500/5 border border-purple-500/20 text-purple-300 hover:from-purple-500/20 hover:to-cyan-500/10 hover:border-purple-500/40 hover:-translate-y-0.5"
                      }`}
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Quiz <ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BadgePopup badge={badgePopup} onClose={() => setBadgePopup(null)} />
    </div>
  )
}
