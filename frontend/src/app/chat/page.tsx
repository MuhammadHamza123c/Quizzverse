"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { Bot, Send, Paperclip, Mic, Square, Loader2, FileText, Trash2, Zap, BookOpen, Lightbulb, Globe, Sparkles } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: number
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const suggestions = [
  { icon: Lightbulb, label: "Explain like I'm 5", text: "Explain how neural networks work like I'm five years old" },
  { icon: Zap, label: "Compare concepts", text: "What's the difference between SQL and NoSQL databases?" },
  { icon: BookOpen, label: "Create a cheat sheet", text: "Create a one-page cheat sheet for Python list and dict methods" },
  { icon: Globe, label: "Make a roadmap", text: "Create a 3-month study roadmap for learning web development" },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordTimerRef = useRef<any>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) router.push("/login")
      else {
        try { setProfile(await api.users.getProfile()) } catch {}
      }
    })
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (content?: string) => {
    const text = content || input
    if ((!text.trim() && !pendingFile) || loading) return

    if (pendingFile) {
      const file = pendingFile
      setPendingFile(null)
      setInput("")
      await uploadAndSend(file, text.trim())
      return
    }

    setInput("")
    const userMsg: Message = { role: "user" as const, content: text.trim(), timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    const apiMessages = [...messages, userMsg]
    const profileStr = profile ? Object.entries(profile).filter(([k]) => k !== "id" && k !== "avatar_url" && k !== "created_at" && profile[k]).map(([k, v]) => `${k.replace("_", " ")}: ${v}`).join(" | ") : ""

    try {
      const res = await api.chat.message({ messages: apiMessages, profile: profileStr || undefined })
      setMessages((prev) => [...prev, { role: "assistant", content: res.response, timestamp: Date.now() }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again.", timestamp: Date.now() }])
    }
    setLoading(false)
  }

  const uploadAndSend = async (file: File, userText: string) => {
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      setMessages((prev) => [...prev, { role: "assistant", content: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 20MB.` }])
      return
    }

    setUploading(true)
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    const icon = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext) ? "🖼️" : ["mp3", "wav", "m4a", "ogg"].includes(ext) ? "🎤" : "📄"
    const fileMsg: Message = { role: "user", content: `${icon} Uploaded: ${file.name}${userText ? ` — ${userText}` : ""}`, timestamp: Date.now() }
    setMessages((prev) => [...prev, fileMsg])

    try {
      const res = await api.chat.upload(file)
      setLoading(true)

      const maxLen = 3000
      const truncated = res.text.length > maxLen ? res.text.slice(0, maxLen) + "..." : res.text
      const instruction = userText
        ? `File: "${res.filename}"\n${truncated}\n\n${userText}`
        : `File: "${res.filename}"\n${truncated}\n\nWhat is this about?`

      const profileStr = profile ? Object.entries(profile).filter(([k]) => k !== "id" && k !== "avatar_url" && k !== "created_at" && profile[k]).map(([k, v]) => `${k.replace("_", " ")}: ${v}`).join(" | ") : ""
      const chatMessages = [...messages, fileMsg, { role: "user", content: instruction }]
      const aiRes = await api.chat.message({ messages: chatMessages, profile: profileStr || undefined })
      setMessages((prev) => [...prev, { role: "assistant", content: aiRes.response, timestamp: Date.now() }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to process file.", timestamp: Date.now() }])
    }
    setLoading(false)
    setUploading(false)
  }

  const handleSuggestion = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPendingFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setPendingFile(file)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" })
        setLoading(true)
        try {
          const res = await api.chat.upload(file)
          const transcribedText = res.text || ""
          if (transcribedText.trim()) sendMessage(transcribedText.trim())
        } catch {
          setMessages((prev) => [...prev, { role: "assistant", content: "Failed to transcribe audio." }])
        }
        setLoading(false)
      }

      recorder.start()
      setRecording(true)
      setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000)
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Microphone access denied or not available." }])
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setRecording(false)
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#04060c] z-40">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.03] bg-[#04060c]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-2">
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto relative"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="absolute inset-0 z-10 bg-purple-500/5 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border-2 border-dashed border-purple-500/30 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-purple-400" />
              </div>
              <p className="text-sm text-purple-400 font-medium">Drop your file here</p>
              <p className="text-xs text-gray-500 mt-1">PDF · DOCX · TXT · JSON · Images · Audio</p>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
          {messages.length === 0 && !dragOver && (
            <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
              <h2 className="text-3xl font-bold tracking-tight mb-3 bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">QuizzBot</h2>
              <p className="text-sm text-gray-500 mb-10 max-w-md leading-relaxed">
                Ask questions, upload documents, or get explanations on any topic.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s.text)}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] hover:border-purple-500/15 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/8 flex items-center justify-center shrink-0 group-hover:bg-purple-500/15 transition-colors group-hover:scale-105">
                      <s.icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-300 truncate">{s.label}</p>
                      <p className="text-[11px] text-gray-600 truncate">{s.text}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""} animate-fade-in-up`} style={{ animationDelay: `${i * 40}ms` }}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/15 to-cyan-500/10 border border-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
              )}
              <div className={`max-w-[88%] sm:max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-white/[0.025] border border-white/[0.05] text-gray-200"
                  : "bg-gradient-to-br from-purple-500/8 to-cyan-500/4 border border-purple-500/8 text-gray-200"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-gray-200 prose-strong:text-purple-300 prose-code:text-cyan-300 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-purple-400 prose-li:text-gray-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                {msg.timestamp && (
                  <div className={`text-[10px] text-gray-600 mt-1.5 ${msg.role === "user" ? "text-right" : ""}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3 animate-fade-in-up">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/15 to-cyan-500/10 border border-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/[0.025] border border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/[0.03] bg-[#04060c]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5">
          {pendingFile && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/8 border border-purple-500/12 text-sm">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300 truncate flex-1">{pendingFile.name}</span>
              <span className="text-[11px] text-gray-500">{(pendingFile.size / 1024).toFixed(0)}KB</span>
              <button onClick={() => setPendingFile(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-white/[0.04] transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-1.5 p-1.5 rounded-2xl border border-white/[0.05] bg-white/[0.015] transition-all focus-within:border-purple-500/25 focus-within:bg-white/[0.025]">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-purple-400 hover:bg-white/[0.04] transition-all shrink-0 disabled:opacity-30"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.json,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.m4a,.ogg" className="hidden" onChange={handleFileSelect} />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={uploading ? "Uploading..." : "Ask anything..."}
              disabled={loading || uploading}
              rows={1}
              className="flex-1 bg-transparent px-2 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none disabled:opacity-40 max-h-32"
              style={{ minHeight: "22px" }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = "auto"
                el.style.height = Math.min(el.scrollHeight, 128) + "px"
              }}
            />

            {recording ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-red-400 font-mono w-7 text-right">{recordTime}s</span>
                <button onClick={stopRecording} className="w-9 h-9 rounded-xl bg-red-500/12 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all animate-pulse">
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={startRecording}
                disabled={loading || uploading}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-rose-400 hover:bg-white/[0.04] transition-all shrink-0 disabled:opacity-30"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && !pendingFile) || loading || uploading}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all shrink-0 disabled:opacity-30 disabled:hover:shadow-none"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-600/60 text-center mt-2">May produce inaccurate information. Verify important facts.</p>
        </div>
      </div>
    </div>
  )
}
