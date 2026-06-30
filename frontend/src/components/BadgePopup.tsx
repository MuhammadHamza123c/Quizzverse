"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { X, Sparkles } from "lucide-react"

const CONFETTI_COLORS = ["#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#fbbf24", "#fb923c", "#818cf8", "#2dd4bf"]

function playChime() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: `${6 + Math.random() * 8}px`,
    rotation: `${Math.random() * 360}deg`,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes confetti-shimmer {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: p.left,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `confetti-fall ${p.duration} ease-in ${p.delay} forwards`,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  )
}

interface BadgePopupProps {
  badge: { name: string; description: string; icon: string } | null
  onClose: () => void
}

export default function BadgePopup({ badge, onClose }: BadgePopupProps) {
  const [visible, setVisible] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (badge) {
      setVisible(true)
      setShowConfetti(true)
      playChime()
      const t = setTimeout(() => {
        setVisible(false)
        setShowConfetti(false)
        setTimeout(onClose, 400)
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [badge, onClose])

  const handleClose = useCallback(() => {
    setVisible(false)
    setShowConfetti(false)
    setTimeout(onClose, 400)
  }, [onClose])

  if (!badge) return null

  return (
    <>
      {showConfetti && <Confetti />}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-500 ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      >
        <div
          className={`relative p-8 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.1] shadow-[0_0_60px_-10px_rgba(139,92,246,0.3)] max-w-sm w-full mx-4 text-center transition-all duration-500 ${
            visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/10 flex items-center justify-center animate-bounce">
              <span className="text-4xl animate-ping-slow">{badge.icon}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-300">
              Achievement Unlocked
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">{badge.name}</h2>
          <p className="text-sm text-gray-400 mb-6">{badge.description}</p>

          <Link
            href="/achievements"
            onClick={handleClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/10 border border-purple-500/20 text-sm font-medium text-purple-300 hover:from-purple-500/30 hover:to-cyan-500/20 hover:border-purple-500/30 transition-all"
          >
            View All Achievements
          </Link>
        </div>
      </div>
    </>
  )
}
