"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/profile?new=true")
      } else if (event === "USER_UPDATED") {
        router.push("/dashboard")
      }
    })

    const params = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = params.get("access_token")
    if (accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: params.get("refresh_token") || "",
      })
    }
  }, [router])

  return (
    <div className="min-h-[90vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-500 border-t-transparent" />
    </div>
  )
}
