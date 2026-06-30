"use client"

import { Suspense } from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"
import { User, Save, Sparkles, ArrowLeft, GraduationCap, Building2, BookOpen } from "lucide-react"

function ProfileContent() {
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({ full_name: "", university: "", department: "", grade: "" })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const isNew = searchParams.get("new") === "true"
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push("/login")
      setUser(data.session.user)
      try {
        const profile = await api.users.getProfile()
        setForm({
          full_name: profile.full_name || "",
          university: profile.university || "",
          department: profile.department || "",
          grade: profile.grade || "",
        })
      } catch {
        setForm({ full_name: data.session.user.user_metadata.full_name || "", university: "", department: "", grade: "" })
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)
    try {
      await api.users.updateProfile(form)
      setSuccess(true)
      if (isNew) setTimeout(() => router.push("/dashboard"), 1500)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-lg mx-auto">
        {isNew && (
          <div className="card p-6 mb-8 border-purple-500/30 bg-gradient-to-br from-purple-500/8 to-cyan-500/5 text-center animate-fade-in-up">
            <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold">Welcome to QuizzVerse!</h2>
            <p className="text-sm text-gray-400 mt-1">Set up your profile to get started</p>
          </div>
        )}

        <div className="card p-8 animate-scale-in">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-500/15">
              <User className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{isNew ? "Complete Profile" : "My Profile"}</h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2">
                <Save className="w-4 h-4" /> Profile saved! {isNew ? "Redirecting..." : ""}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" placeholder="John Doe" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> University
              </label>
              <input type="text" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} className="input-field" placeholder="e.g. FAST University" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Department
                </label>
                <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input-field" placeholder="Computer Science" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5" /> Grade
                </label>
                <input type="text" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="input-field" placeholder="A, 3.5 GPA" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {loading ? <div className="spinner" /> : <Save className="w-4 h-4" />}
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}
