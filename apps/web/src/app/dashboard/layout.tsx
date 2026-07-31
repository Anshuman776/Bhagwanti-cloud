"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "../../store/authStore"
import { Loader2, Server } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  // Handle client-side hydration of local storage store
  useEffect(() => {
    // Wait until Zustand rehydrates state from localStorage
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
    })

    // If already hydrated (subsequent page visits)
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true)
    }

    return () => unsub()
  }, [])

  // Guard routing checks
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isHydrated, isAuthenticated, router])

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#030303] text-[#f5f5f7] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
        <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
          Initializing Cloud Session...
        </span>
      </div>
    )
  }

  // Double check auth state before rendering children
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#030303] text-[#f5f5f7] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
        <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
          Redirecting to Login...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030303]">
      {children}
    </div>
  )
}
