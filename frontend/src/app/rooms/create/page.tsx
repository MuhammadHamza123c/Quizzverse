"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { Brain, Sparkles, Loader2, Clock, Atom, Calculator, FlaskConical, Landmark, Microscope, Globe, ScrollText, Lightbulb, Dna, Telescope, Palette, Music, Dumbbell, Leaf, Cpu, HeartPulse, Users, Copy, Check, ArrowLeft, Wrench, Stethoscope, PawPrint, Languages, BookOpen, Bot, Briefcase, Video, Share2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

const TOPICS = [
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
]

export default function CreateRoomPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<"topic" | "custom" | "document" | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login")
    })
  }, [router])
  const [selectedTopic, setSelectedTopic] = useState("")
  const [customTopic, setCustomTopic] = useState("")
  const [roomName, setRoomName] = useState("")
  const [numQuestions, setNumQuestions] = useState(10)
  const [difficulty, setDifficulty] = useState("medium")
  const [timePerQuestion, setTimePerQuestion] = useState(30)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [uploadedDoc, setUploadedDoc] = useState<any | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [stepError, setStepError] = useState("")

  const getChosenTopic = () => {
    if (mode === "custom") return customTopic.trim()
    return selectedTopic
  }

  const canAdvanceStep1 = () => {
    if (!mode) return false
    if (mode === "topic") return Boolean(selectedTopic)
    if (mode === "custom") return customTopic.trim().length > 0
    return true
  }

  const canAdvanceStep2 = () => {
    if (!roomName.trim()) return false
    if (mode === "document") return Boolean(uploadedDoc)
    return Boolean(getChosenTopic())
  }

  const handleNext = async () => {
    setStepError("")
    if (step === 1) {
      if (!canAdvanceStep1()) {
        setStepError("Choose a topic path before continuing.")
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (!canAdvanceStep2()) {
        setStepError(mode === "document" ? "Upload a document and enter a room name." : "Enter room details before continuing.")
        return
      }
      setStep(3)
    }
  }

  const handleBack = () => {
    setStepError("")
    setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3)
  }

  const uploadDocument = async (file: File) => {
    setUploadingDoc(true)
    setStepError("")
    try {
      const result = await api.documents.upload(file)
      setUploadedDoc(result)
    } catch (err: any) {
      setStepError(err.message || "Failed to upload document")
      setUploadedDoc(null)
    }
    setUploadingDoc(false)
  }

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDocumentFile(file)
    await uploadDocument(file)
  }

  const handleSubmitRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step !== 3) {
      setStepError("Finish all steps before creating the room.")
      return
    }

    const topic = getChosenTopic()
    if (mode === "document" && !uploadedDoc) {
      setStepError("Upload a document before creating the room.")
      return
    }
    if (!roomName.trim()) {
      setStepError("Give your room a name.")
      return
    }

    setLoading(true)
    setError("")
    setStepError("")

    try {
      if (mode === "document") {
        const result = await api.rooms.createFromDocument({
          document_id: uploadedDoc.id || uploadedDoc.document_id,
          room_name: roomName.trim(),
          num_questions: numQuestions,
          difficulty,
          time_per_question: timePerQuestion,
          video_enabled: videoEnabled,
        })
        setCreatedCode(result.room_code)
      } else {
        const result = await api.rooms.create({
          topic: topic,
          num_questions: numQuestions,
          difficulty,
          time_per_question: timePerQuestion,
          video_enabled: videoEnabled,
        })
        setCreatedCode(result.room_code)
      }
    } catch (err: any) {
      setError(err.message || "Failed to create room")
    }

    setLoading(false)
  }

  const handleCopy = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleModeSelect = (selectedMode: "topic" | "custom" | "document") => {
    setMode(selectedMode)
    setStepError("")
    if (selectedMode !== "topic") setSelectedTopic("")
    if (selectedMode !== "custom") setCustomTopic("")
    if (selectedMode !== "document") {
      setDocumentFile(null)
      setUploadedDoc(null)
    }
  }

  const stepTitles = [
    { label: "Pick a path", description: "Topic, custom topic, or document" },
    { label: "Room details", description: "Name, settings, and difficulty" },
    { label: "Create room", description: "Review and launch" },
  ]

  if (createdCode) {
    return (
      <div className="min-h-screen py-24 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/10 border border-purple-500/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">Room Created!</h1>
          <p className="text-gray-500">Share this code with your friends:</p>
          <div className="text-5xl font-bold tracking-[0.3em] gradient-text py-6 bg-white/[0.03] rounded-xl border border-white/5">
            {createdCode}
          </div>

          {typeof window !== "undefined" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/15 to-cyan-500/10 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Share Invite</p>
                  <p className="text-xs text-gray-500">Friends scan QR or click link to join</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shrink-0">
                  <QRCodeSVG value={`${window.location.origin}/rooms/join?code=${createdCode}`} size={110} />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="w-full bg-white/[0.03] rounded-xl px-3 py-2.5 flex items-center gap-2 border border-white/5">
                    <span className="text-[11px] text-gray-500 truncate flex-1">
                      {window.location.origin}/rooms/join?code={createdCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/rooms/join?code=${createdCode}`)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="text-purple-400 hover:text-purple-300 text-xs shrink-0 font-medium"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => {
                const url = `${window.location.origin}/rooms/join?code=${createdCode}`
                if (navigator.share) {
                  navigator.share({ title: "Join my quiz room!", url }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button onClick={handleCopy} className="btn-ghost flex items-center gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
            <button onClick={() => router.push(`/rooms/${createdCode}`)} className="btn-ghost flex items-center gap-2">
              <Users className="w-4 h-4" /> Enter Room
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col gap-6 mb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-purple-200 shadow-sm shadow-purple-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Live Room Builder
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white">Create Room</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">Three steps to build a live room from topic, custom topic, or document.</p>
            </div>
          </div>
          <button onClick={() => router.push("/")} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/[0.06]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {stepTitles.map((item, index) => (
            <div key={item.label} className={`rounded-[28px] border p-5 transition ${step === index + 1 ? "border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-violet-500/5 shadow-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"}`}>
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold transition ${step === index + 1 ? "bg-purple-500 text-white shadow-lg/5" : "bg-white/5 text-gray-300"}`}>
                  {index + 1}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{item.label}</h2>
                  <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-3">
                <button type="button" onClick={() => handleModeSelect("topic")}
                  className={`group rounded-[28px] border p-6 text-left shadow-lg/5 transition-all duration-200 ${mode === "topic" ? "border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-violet-500/5 ring-1 ring-purple-500/20" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"}`}>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-white/5 text-purple-300 shadow-sm shadow-purple-500/10">
                    <span className="text-xl font-bold">T</span>
                  </div>
                  <div className="text-sm font-semibold text-white mb-2">Choose from topic</div>
                  <p className="text-sm text-gray-400">Pick from ready-made categories and get started fast.</p>
                </button>
                <button type="button" onClick={() => handleModeSelect("document")}
                  className={`group rounded-[28px] border p-6 text-left shadow-lg/5 transition-all duration-200 ${mode === "document" ? "border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-violet-500/5 ring-1 ring-purple-500/20" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"}`}>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-white/5 text-cyan-300 shadow-sm shadow-cyan-500/10">
                    <span className="text-xl font-bold">D</span>
                  </div>
                  <div className="text-sm font-semibold text-white mb-2">Upload document</div>
                  <p className="text-sm text-gray-400">Generate questions from your own PDF, DOCX, or TXT document.</p>
                </button>
                <button type="button" onClick={() => handleModeSelect("custom")}
                  className={`group rounded-[28px] border p-6 text-left shadow-lg/5 transition-all duration-200 ${mode === "custom" ? "border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-violet-500/5 ring-1 ring-purple-500/20" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"}`}>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-white/5 text-amber-300 shadow-sm shadow-amber-500/10">
                    <span className="text-xl font-bold">C</span>
                  </div>
                  <div className="text-sm font-semibold text-white mb-2">Custom topic</div>
                  <p className="text-sm text-gray-400">Type your own topic if you want full control over the room theme.</p>
                </button>
              </div>

              {mode === "topic" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">Select a topic below to create your room around it.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TOPICS.map((item) => (
                      <button key={item.label} type="button" onClick={() => setSelectedTopic(item.label)}
                        className={`group rounded-2xl p-4 border text-left transition ${selectedTopic === item.label ? `border-purple-500/50 bg-purple-500/5` : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTopic === item.label ? item.bg : "bg-white/[0.04]"}`}>
                          <item.icon className={`w-5 h-5 ${selectedTopic === item.label ? item.text : "text-gray-400"}`} />
                        </div>
                        <div className="mt-3 text-sm font-medium text-white">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "custom" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">Enter your custom topic</label>
                  <input
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. World History, Startup Marketing, Climate Science"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:border-purple-500/40 focus:outline-none"
                  />
                </div>
              )}

              {mode === "document" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">Upload a document in the next step</label>
                  <p className="text-sm text-gray-400">You will upload a document that the room quiz is generated from.</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                  <h2 className="text-sm font-semibold text-white mb-3">Room name</h2>
                  <input
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Friendly room name"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-gray-500 focus:border-purple-500/40 focus:outline-none"
                  />
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                  <h2 className="text-sm font-semibold text-white mb-3">Room type</h2>
                  <p className="text-sm text-gray-300">
                    {mode === "topic" && `Topic: ${selectedTopic}`}
                    {mode === "custom" && `Custom topic: ${customTopic}`}
                    {mode === "document" && (uploadedDoc ? `Document: ${uploadedDoc.file_name}` : "Upload a document file below.")}
                  </p>
                </div>
              </div>

              {mode === "document" && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Upload document</h2>
                      <p className="text-sm text-gray-400">PDF, DOCX, or TXT only.</p>
                    </div>
                    {uploadingDoc && <Loader2 className="w-5 h-5 animate-spin text-purple-400" />}
                  </div>
                  <label className="block w-full rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-gray-400 cursor-pointer hover:border-purple-500/50 hover:text-white">
                    <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleDocumentChange} />
                    {uploadedDoc ? (
                      <div>
                        <div className="font-medium text-white">{uploadedDoc.file_name}</div>
                        <p className="text-sm text-gray-400 mt-1">Document uploaded. Proceed to step 3.</p>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">Click to upload</div>
                        <p className="text-sm text-gray-400 mt-1">Choose a document to generate a quiz room from.</p>
                      </div>
                    )}
                  </label>
                </div>
              )}

              <div className="card p-6 space-y-5 bg-white/5 border border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2.5">
                      <span className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center text-xs text-purple-400 font-bold">#</span>
                      Questions
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setNumQuestions(Math.max(10, numQuestions - 1))}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 hover:border-purple-500/25 hover:bg-purple-500/5 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-all">−</button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold gradient-text-simple">{numQuestions}</span>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">questions</p>
                      </div>
                      <button type="button" onClick={() => setNumQuestions(Math.min(30, numQuestions + 1))}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 hover:border-purple-500/25 hover:bg-purple-500/5 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-all">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2.5">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      Timer (seconds)
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setTimePerQuestion(Math.max(5, timePerQuestion - 5))}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/25 hover:bg-cyan-500/5 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-all">−</button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold gradient-text-simple">{timePerQuestion}</span>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">sec / q</p>
                      </div>
                      <button type="button" onClick={() => setTimePerQuestion(Math.min(120, timePerQuestion + 5))}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/25 hover:bg-cyan-500/5 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-all">+</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2.5">
                    <span className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center text-xs text-amber-400 font-bold">!</span>
                    Difficulty
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "easy", label: "Easy", color: "text-emerald-400", dot: "bg-emerald-400", active: "border-emerald-500/30 bg-emerald-500/8" },
                      { value: "medium", label: "Medium", color: "text-amber-400", dot: "bg-amber-400", active: "border-amber-500/30 bg-amber-500/8" },
                      { value: "hard", label: "Hard", color: "text-red-400", dot: "bg-red-400", active: "border-red-500/30 bg-red-500/8" },
                    ].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setDifficulty(opt.value)}
                        className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                          difficulty === opt.value
                            ? `${opt.active} ${opt.color}`
                            : "bg-white/[0.02] border-white/5 text-gray-500 hover:bg-white/[0.04]"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block mr-2 ${opt.dot}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center">
                        <Video className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-400">Enable video chat</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={videoEnabled}
                      onClick={() => setVideoEnabled(!videoEnabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        videoEnabled ? "bg-purple-500" : "bg-white/[0.08]"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        videoEnabled ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </label>
                  <p className="text-[11px] text-gray-600 mt-1.5 ml-7">Host can toggle live video during the game</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Room summary</div>
                  <h2 className="text-lg font-semibold text-white">{roomName || "Untitled room"}</h2>
                  <p className="text-sm text-gray-400">{mode === "topic" && `Topic: ${selectedTopic}`}{mode === "custom" && `Custom topic: ${customTopic}`}{mode === "document" && `Document: ${uploadedDoc?.file_name || "No document"}`}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="text-gray-400 mb-1">Questions</div>
                    <div className="font-semibold text-white">{numQuestions}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="text-gray-400 mb-1">Timer</div>
                    <div className="font-semibold text-white">{timePerQuestion}s</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="text-gray-400 mb-1">Difficulty</div>
                    <div className="font-semibold text-white">{difficulty}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="text-gray-400 mb-1">Video</div>
                    <div className={`font-semibold ${videoEnabled ? "text-purple-400" : "text-gray-500"}`}>{videoEnabled ? "Enabled" : "Off"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {(stepError || error) && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 mt-6">
            {stepError || error}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={handleBack} disabled={step === 1}
            className="w-full sm:w-auto rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-gray-300 transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50">
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {step < 3 ? (
              <button type="button" onClick={handleNext}
                className="w-full sm:w-auto rounded-2xl bg-purple-500/90 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500">
                Continue
              </button>
            ) : (
              <button onClick={handleSubmitRoom}
                className="w-full sm:w-auto rounded-2xl bg-emerald-500/90 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
                {loading ? "Creating room..." : "Create room"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
