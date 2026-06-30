"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { LogIn, Loader2, ArrowLeft, Users } from "lucide-react"

export default function JoinRoomPage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState("")
  const [guestName, setGuestName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomCode.trim()) { setError("Enter a room code"); return }
    setLoading(true)
    setError("")
    try {
      const result = await api.rooms.join(roomCode.trim().toUpperCase(), guestName.trim() || undefined)
      router.push(`/rooms/${result.room_code}?participant_id=${result.participant_id}&guest_name=${encodeURIComponent(guestName.trim() || "Player")}`)
    } catch (err: any) {
      setError(err.message || "Failed to join room")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen py-24 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/")} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Join Room</h1>
            <p className="text-sm text-gray-500">Enter the room code shared by your friend</p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="card p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="input-field text-center text-2xl tracking-[0.3em] font-bold"
              placeholder="XXXXXX"
              maxLength={6}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Your Name (optional)</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="input-field"
              placeholder="Enter your display name"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading || !roomCode.trim()} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  )
}
