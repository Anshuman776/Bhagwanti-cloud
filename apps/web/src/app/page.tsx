"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "../store/authStore"
import { 
  Server, 
  ArrowRight, 
  Lock, 
  Database,
  GitBranch,
  Terminal as TerminalIcon,
  Activity,
  Layers,
  Shield,
  Brain,
  Globe2,
  ExternalLink,
  Code2
} from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [logoFailed, setLogoFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)

  // Auto-redirect to real dashboard if session is active
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated() && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, router])

  return (
    <div className="relative min-h-screen bg-[#030303] text-[#f5f5f7] bg-cyber-grid selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden font-sans">
      
      {/* Background radial soft lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-radial-gradient pointer-events-none z-0 opacity-80" />
      <div className="absolute top-[200px] right-1/4 w-[500px] h-[500px] bg-radial-gradient pointer-events-none z-0 opacity-60 filter blur-3xl" />

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {/* Brand Banner Header */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-zinc-900 pb-6 mb-10 gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16 rounded-full border-2 border-amber-500 overflow-hidden shadow-lg bg-zinc-950 flex items-center justify-center shrink-0">
              {!logoFailed ? (
                <img 
                  src="/logo.jpg" 
                  alt="Bhagwanti Logo"
                  className="w-full h-full object-cover object-center"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-amber-600 to-yellow-500 font-bold text-black text-xl font-serif">
                  B
                </div>
              )}
            </div>
            
            <div className="text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400">
                Bhagwanti Cloud
              </h1>
              <p className="text-xs md:text-sm font-semibold tracking-wider text-zinc-400 uppercase mt-0.5">
                Turn Any Server Into Your Own Cloud
              </p>
            </div>
          </div>

          {/* Dedicated Quote */}
          <div className="text-center md:text-right border-l md:border-l-0 md:border-r border-amber-500/20 px-4 md:pr-6 md:pl-0 max-w-sm">
            <p className="text-xs md:text-sm font-serif italic text-amber-500/90 leading-relaxed">
              &ldquo;She taught us values, we build the cloud.&rdquo;
            </p>
            <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase mt-1">
              &mdash; In her blessings, we build the future.
            </p>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center py-20 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs font-mono">
            <span>✨ Phase 1-6 Fully Completed & Running</span>
          </div>
          
          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Deploy & Manage Apps On Your Own <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-400">Debian 13 Hardware</span>
          </h2>
          
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Bhagwanti Cloud is an open-source, self-hosted PaaS platform. Connect your old laptops or servers, stream live telemetry metrics, open secure browser terminals, and deploy Docker services in seconds.
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <button 
              onClick={() => router.push("/login")}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-bold text-black bg-white hover:bg-zinc-200 transition-all gap-1.5 shadow-xl shadow-white/5"
            >
              <span>Launch Cloud Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <a 
              href="https://github.com/anshuman-cloud/bhagwanti-cloud"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-bold text-zinc-300 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 transition-all gap-1.5"
            >
              <span>View GitHub Repository</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* 3-Column Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mb-12 border-t border-zinc-900 pt-12">
          
          {/* COLUMN 1: LEFT FEATURE LIST */}
          <div className="space-y-6 lg:col-span-1">
            <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-amber-500 border-b border-zinc-900 pb-2 text-left">
              Core Capabilities
            </h3>
            
            <div className="space-y-5 text-left">
              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Activity className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">One-Click Deploy</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    Deploy applications from GitHub repositories directly to your remote servers.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Layers className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">Remote Docker Control</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    Start, stop, rebuild, and inspect containers running on target node daemons.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Activity className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">Real-time Telemetry</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    Stream hardware metrics (CPU, RAM, Disk, Network) via secure WebSockets.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <TerminalIcon className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">PTY Web Terminal</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    Run secure, fully-interactive host shells inside your browser.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2 & 3: DETAILS */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-amber-500 border-b border-zinc-900 pb-2 text-left">
              Consolidated Infrastructure
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
                  <Server className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Agentless Debian Connection</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  No daemon installation is needed on target nodes. Simply generate keypairs, authorize connections, and query statistics securely via SSH parameters.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Secure & Private</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your server. Your data. 100% under your control. By hosting the controller backend locally, you maintain complete ownership of your infrastructure credentials.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
                  <Brain className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Telemetry Engine</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Streams live telemetry values from target servers using remote script decoders. Monitors disk sectors, network packages, and memory lines continuously.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
                  <Database className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Database Persistence</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Active SQLAlchemy and Alembic schema management stores user tokens and host profiles securely inside PostgreSQL or SQLite fallbacks.
                </p>
              </div>
            </div>
          </div>

          {/* COLUMN 4: RIGHT MASCOT CARD */}
          <div className="space-y-6 lg:col-span-1">
            <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-amber-500 border-b border-zinc-900 pb-2 text-left">
              Host Highlights
            </h3>

            {/* Mascot Frame */}
            <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 flex flex-col items-center justify-center space-y-3.5 text-center">
              <div className="relative w-28 h-28 rounded-full border-4 border-amber-500/80 overflow-hidden shadow-xl bg-black">
                {!photoFailed ? (
                  <img 
                    src="/bhagwanti.jpg" 
                    alt="Bhagwanti Poster"
                    className="w-full h-full object-cover object-center"
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-amber-600 to-yellow-500 font-bold text-black text-4xl font-serif">
                    B
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Brand Mascot</p>
                <p className="text-xs font-bold text-amber-500 mt-1">Mata Bhagwanti</p>
                <p className="text-[9px] text-zinc-400 italic max-w-[150px] mx-auto mt-0.5 leading-normal">
                  &ldquo;Your Server. Your Cloud. Your Control.&rdquo;
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM BANNER SERVICES & LINKS */}
        <section className="border-t border-zinc-900 pt-10 pb-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-zinc-200 mb-1">
              All-in-One Cloud Platform
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              Deploy, Manage, Monitor & Scale your applications with ease on Debian 13 systems.
            </p>

            {/* Bottom Grid Icons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 max-w-2xl mx-auto mb-8 text-[11px] font-mono text-zinc-400">
              <div className="p-3 rounded bg-zinc-950/60 border border-zinc-900 flex flex-col items-center justify-center space-y-1">
                <GitBranch className="w-4 h-4 text-sky-400" />
                <span>GitHub Deploy</span>
              </div>
              <div className="p-3 rounded bg-zinc-950/60 border border-zinc-900 flex flex-col items-center justify-center space-y-1">
                <Globe2 className="w-4 h-4 text-emerald-400" />
                <span>Custom Domains</span>
              </div>
              <div className="p-3 rounded bg-zinc-950/60 border border-zinc-900 flex flex-col items-center justify-center space-y-1">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>SSL Certificates</span>
              </div>
              <div className="p-3 rounded bg-zinc-950/60 border border-zinc-900 flex flex-col items-center justify-center space-y-1">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Docker Support</span>
              </div>
              <div className="p-3 rounded bg-zinc-950/60 border border-zinc-900 flex flex-col items-center justify-center space-y-1">
                <Database className="w-4 h-4 text-pink-400" />
                <span>Backups & Restore</span>
              </div>
            </div>

            {/* Footer metadata */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-900/60 pt-6 gap-4 text-xs text-zinc-500 font-mono">
              <div className="flex items-center space-x-1.5">
                <span>github.com/anshuman-cloud/bhagwanti-cloud</span>
              </div>

              <div className="flex items-center space-x-2">
                <span>Star ⭐ the repo if you like it!</span>
                <span>•</span>
                <span>Follow for more amazing projects 🚀</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
