"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "../../store/authStore"
import { api } from "../../lib/api"
import { 
  Server, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ChevronRight
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore(state => state.setAuth)
  
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!email || !password) {
      setError("Please fill in all fields")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      if (isLogin) {
        // Authenticate User
        const res = await api.post("/auth/login", { email, password }, { skipAuth: true })
        
        // Fetch User Info
        const userData = await api.get("/auth/me", {
          headers: { "Authorization": `Bearer ${res.access_token}` }
        })

        // Set Auth Store & redirect
        setAuth(res.access_token, res.refresh_token, userData)
        setSuccess("Login successful! Redirecting...")
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000)
      } else {
        // Register User
        await api.post("/auth/register", { email, password }, { skipAuth: true })
        setSuccess("Registration successful! You can now log in.")
        setIsLogin(true)
        setPassword("")
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#030303] text-[#f5f5f7] bg-cyber-grid flex items-center justify-center px-4 font-sans overflow-hidden">
      
      {/* Background soft glow spots */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-radial-gradient pointer-events-none z-0 opacity-80" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-xl border border-zinc-900 bg-[#09090b]/80 backdrop-blur-xl shadow-2xl relative z-10"
      >
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-12 h-12 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shadow-lg shadow-amber-500/5 mb-3 cursor-pointer" onClick={() => router.push("/")}>
            <Server className="w-5 h-5 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {isLogin ? "Welcome to Bhagwanti Cloud" : "Create your Admin Account"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {isLogin ? "Enter your credentials to manage your nodes" : "Register the system administrator credentials"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-900 mb-6">
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}
            className={`py-2 rounded-md text-xs font-semibold transition-all ${isLogin ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
            className={`py-2 rounded-md text-xs font-semibold transition-all ${!isLogin ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Create Account
          </button>
        </div>

        {/* Auth alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-950/20 text-red-400 text-xs flex items-center gap-2.5 text-left"
            >
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 text-xs flex items-center gap-2.5 text-left"
            >
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input forms */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="email" 
                placeholder="admin@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-880 rounded-lg pl-10 pr-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Secret Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="password" 
                placeholder="••••••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-880 rounded-lg pl-10 pr-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 py-2.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-white/5"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? "Sign In to Dashboard" : "Register Admin Profile"}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-zinc-900 pt-5 text-center">
          <button 
            onClick={() => router.push("/")}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono tracking-widest uppercase inline-flex items-center gap-1 transition-colors"
          >
            ← Return to Landing Page
          </button>
        </div>
      </motion.div>
    </div>
  )
}
