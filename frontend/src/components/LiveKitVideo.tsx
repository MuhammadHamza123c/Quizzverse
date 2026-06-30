"use client"

import { useState, useEffect, useCallback } from "react"
import { LiveKitRoom, useTracks, TrackLoop, ParticipantTile } from "@livekit/components-react"
import "@livekit/components-styles"
import { Video, VideoOff, Loader2 } from "lucide-react"
import { Track } from "livekit-client"
import { api } from "@/lib/api"

interface Props {
  roomId: string
  identity: string
  name?: string
  enabled: boolean
  isHost: boolean
  onToggle: (enabled: boolean) => void
  height?: number
}

function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false })

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500">
        Waiting for participants...
      </div>
    )
  }

  return (
    <div className="grid gap-px p-px h-full" style={{ gridTemplateColumns: `repeat(${Math.min(tracks.length, 2)}, 1fr)` }}>
      <style>{`.lk-participant-name { display: none !important; }`}</style>
      <style>{`.lk-participant-placeholder { display: none !important; }`}</style>
      <TrackLoop tracks={tracks}>
        <div className="relative rounded overflow-hidden bg-black/40">
          <ParticipantTile />
        </div>
      </TrackLoop>
    </div>
  )
}

export default function LiveKitVideo({ roomId, identity, name, enabled, isHost, onToggle, height = 180 }: Props) {
  const [token, setToken] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [livekitUrl, setLivekitUrl] = useState("")

  const fetchToken = useCallback(async () => {
    setConnecting(true)
    try {
      const res = await api.livekit.token({ room_name: roomId, identity, name })
      setToken(res.token)
      setLivekitUrl(res.url)
    } catch {
      setToken("")
    }
    setConnecting(false)
  }, [roomId, identity, name])

  useEffect(() => {
    if (enabled && !token) fetchToken()
    if (!enabled) setToken("")
  }, [enabled, token, fetchToken])

  return (
    <div className="space-y-2">
      {isHost && (
        <button
          onClick={() => onToggle(!enabled)}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
            enabled
              ? "border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/15"
              : "border-purple-500/25 bg-purple-500/10 text-purple-400 hover:bg-purple-500/15"
          }`}
        >
          {enabled ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          {enabled ? "Disable Video" : "Enable Video"}
        </button>
      )}

      {connecting && enabled && (
        <div className="flex items-center justify-center py-6 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Connecting...
        </div>
      )}

      {enabled && token && livekitUrl && (
        <div className="rounded-lg overflow-hidden border border-white/[0.08] bg-black/60">
          <LiveKitRoom
            serverUrl={livekitUrl}
            token={token}
            connect={true}
            audio={true}
            video={true}
            options={{ adaptiveStream: true, dynacast: true }}
            style={{ height: `${height}px` }}
          >
            <VideoGrid />
          </LiveKitRoom>
        </div>
      )}
    </div>
  )
}
