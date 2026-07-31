"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from 'next/dynamic'
import { useAuthStore } from "../../store/authStore"
import { api } from "../../lib/api"

const DynamicXterm = dynamic(() => import('../../components/XtermTerminal'), { ssr: false })
import { 
  Terminal as TerminalIcon, 
  Activity, 
  Cpu, 
  Layers, 
  Shield, 
  HardDrive, 
  Server, 
  ArrowRight, 
  Lock, 
  RefreshCw, 
  CheckCircle,
  Database,
  GitBranch,
  TerminalSquare,
  Search,
  Bell,
  Sun,
  ExternalLink,
  Code2,
  FolderHeart,
  Brain,
  Globe2,
  PlayCircle,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
  Wifi,
  Trash2,
  LogOut,
  PlusCircle,
  Key,
  RefreshCw as RefreshIcon
} from "lucide-react"

interface Project {
  name: string
  type: string
  status: "Running" | "Stopped" | "Building"
  repo: string
  port: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, clearAuth, refreshToken, accessToken } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "projects" | "terminal" | "monitoring" | "settings">("dashboard")
  
  // Real-time hardware telemetry values
  const [cpuUsage, setCpuUsage] = useState(0)
  const [ramUsage, setRamUsage] = useState(0)
  const [ramUsed, setRamUsed] = useState(0)
  const [ramTotal, setRamTotal] = useState(0)
  const [diskUsage, setDiskUsage] = useState(0)
  const [diskUsed, setDiskUsed] = useState(0)
  const [diskTotal, setDiskTotal] = useState(0)
  const [uptime, setUptime] = useState({ days: 0, hours: 0, mins: 0, secs: 0 })
  const [netIn, setNetIn] = useState(0)
  const [netOut, setNetOut] = useState(0)
  const [alerts, setAlerts] = useState<{id: string, type: string, message: string}[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  
  // Update alerts automatically when stats change
  useEffect(() => {
    const newAlerts = []
    if (cpuUsage > 90) newAlerts.push({ id: 'cpu', type: 'critical', message: `CRITICAL: CPU Usage is exceedingly high (${cpuUsage}%)` })
    if (ramUsage > 90) newAlerts.push({ id: 'ram', type: 'critical', message: `CRITICAL: Memory critically low. Usage at ${ramUsage}%` })
    if (diskUsage > 90) newAlerts.push({ id: 'disk', type: 'critical', message: `WARNING: Disk Space running out. Usage at ${diskUsage}%` })
    setAlerts(newAlerts)
  }, [cpuUsage, ramUsage, diskUsage])
  
  const [logoFailed, setLogoFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)

  // Node settings input
  const [nodeName, setNodeName] = useState("")
  const [nodeIP, setNodeIP] = useState("127.0.0.1")
  const [sshPort, setSshPort] = useState(22)
  const [sshUser, setSshUser] = useState("root")
  const [nodePrivateKey, setNodePrivateKey] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "testing">("connected")

  // Node list, keypairs
  const [nodesList, setNodesList] = useState<any[]>([])
  const [sshPublicKey, setSshPublicKey] = useState("")
  const [testingNodeId, setTestingNodeId] = useState<string | null>(null)

  // Docker Container states
  const [containers, setContainers] = useState<any[]>([])
  const [dockerError, setDockerError] = useState<string | null>(null)
  
  // Simulated list of projects (fallback)
  const [projects] = useState<Project[]>([
    { name: "portfolio", type: "React App", status: "Running", repo: "github.com/anshuman-cloud/portfolio", port: 3000 },
    { name: "chatbot", type: "FastAPI", status: "Running", repo: "github.com/anshuman-cloud/chatbot", port: 8000 },
    { name: "ai-assistant", type: "Python", status: "Running", repo: "github.com/anshuman-cloud/ai-assistant", port: 5000 }
  ])

  // Deploy request inputs
  const [deployName, setDeployName] = useState("")
  const [deployRepo, setDeployRepo] = useState("")
  const [deployPort, setDeployPort] = useState(3000)
  const [deployMessage, setDeployMessage] = useState<string | null>(null)

  // Terminal streams
  const [selectedNodeId, setSelectedNodeId] = useState<string>("local")
  
  // Container Logs
  const [logContainer, setLogContainer] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [logWs, setLogWs] = useState<WebSocket | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logLines])

  // 1. Live Telemetry stream connection
  useEffect(() => {
    if (!accessToken) return

    let ws: WebSocket | null = null
    let reconnectTimeout: any = null
    let isMounted = true

    const connectTelemetry = () => {
      if (!isMounted) return
      ws = new WebSocket(`ws://localhost:8000/api/v1/monitoring/ws?node_id=${selectedNodeId}&token=${accessToken}`)
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (!isMounted) return
          setCpuUsage(Math.round(data.cpu))
          setRamUsage(Math.round(data.ram))
          setRamUsed(data.ram_used_gb || 0)
          setRamTotal(data.ram_total_gb || 0)
          setDiskUsage(Math.round(data.disk))
          setDiskUsed(data.disk_used_gb || 0)
          setDiskTotal(data.disk_total_gb || 0)
          setUptime({
            days: Math.floor(data.uptime_seconds / 86400),
            hours: Math.floor((data.uptime_seconds % 86400) / 3600),
            mins: Math.floor((data.uptime_seconds % 3600) / 60),
            secs: Math.floor(data.uptime_seconds % 60)
          })
          setNetIn(data.net_in_cumulative_gb)
          setNetOut(data.net_out_cumulative_gb)
        } catch (e) {
          console.error("Failed to parse telemetry:", e)
        }
      }

      ws.onclose = () => {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectTelemetry, 5000)
        }
      }
    }

    connectTelemetry()

    return () => {
      isMounted = false
      if (ws) ws.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [accessToken, selectedNodeId])

  // 2. Fetch Docker Containers on mount or tab focus
  const fetchContainers = async () => {
    try {
      const res = await api.get(`/docker/containers?node_id=${selectedNodeId}`)
      setContainers(res)
      setDockerError(null)
    } catch (err: any) {
      setDockerError(err.message || "Docker daemon is currently offline")
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchContainers()
    }
  }, [accessToken, selectedNodeId])

  // 3. Fetch nodes lists & key pair setup
  const fetchNodes = async () => {
    try {
      const list = await api.get("/nodes")
      setNodesList(list)
      setSelectedNodeId(prev => (prev === "local" && list.length > 0) ? list[0].id : prev)
    } catch (e) {
      console.error("Failed to query nodes:", e)
    }
  }

  const generateKeys = async () => {
    try {
      const res = await api.post("/nodes/generate-keys", {})
      setSshPublicKey(res.public_key)
      setNodePrivateKey(res.private_key)
    } catch (e) {
      console.error("Failed to generate keys:", e)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchContainers()
      fetchNodes()
      generateKeys()
    }
  }, [accessToken])

  // Connect to interactive Web Terminal WebSocket
  // (Now handled inside DynamicXterm component when activeTab === "terminal")

  const handleToggleContainer = async (containerName: string) => {
    try {
      const res = await api.post(`/docker/containers/${containerName}/toggle?node_id=${selectedNodeId}`, {})
      setContainers(prev => prev.map(c => c.name === containerName ? { ...c, status: res.status } : c))
    } catch (err: any) {
      alert(err.message || "Failed to toggle container status")
    }
  }

  const openLogs = (containerName: string) => {
    setLogContainer(containerName)
    setLogLines([`[Bhagwanti Cloud] Connecting to logs for ${containerName}...`])
    
    if (logWs) {
      logWs.close()
    }
    
    const ws = new WebSocket(`ws://localhost:8000/api/v1/docker/containers/${containerName}/logs/ws?node_id=${selectedNodeId}&token=${accessToken}`)
    
    ws.onmessage = (event) => {
      setLogLines(prev => {
        const lines = event.data.split("\n")
        const updated = [...prev, ...lines]
        return updated.slice(-500) // keep last 500 lines
      })
    }
    
    ws.onclose = () => {
      setLogLines(prev => [...prev, `[Bhagwanti Cloud] Log stream disconnected.`])
    }
    
    setLogWs(ws)
  }

  const closeLogs = () => {
    if (logWs) {
      logWs.close()
      setLogWs(null)
    }
    setLogContainer(null)
  }

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeployMessage(null)
    try {
      const res = await api.post(`/docker/deploy?node_id=${selectedNodeId}`, {
        name: deployName,
        repo_url: deployRepo,
        port: deployPort
      })
      setDeployMessage(res.message)
      setDeployName("")
      setDeployRepo("")
      setTimeout(() => fetchContainers(), 2000)
    } catch (err: any) {
      alert(err.message || "Failed to boot deploy script")
    }
  }

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/nodes", {
        name: nodeName,
        ip_address: nodeIP,
        ssh_port: sshPort,
        ssh_user: sshUser,
        ssh_private_key: nodePrivateKey
      })
      alert("Debian 13 Target Node registered successfully!")
      setNodeName("")
      fetchNodes()
    } catch (e: any) {
      alert(e.message || "Failed to create node profile")
    }
  }

  const testNodeSSH = async (nodeId: string) => {
    setTestingNodeId(nodeId)
    try {
      const res = await api.post(`/nodes/${nodeId}/test-connection`, {})
      if (res.connected) {
        alert("SSH Ping Successful! Target is online and authenticated.")
      } else {
        alert("SSH Authentication failed. Please add your public key to target node.")
      }
      fetchNodes()
    } catch (err: any) {
      alert(err.message || "Connection sweep failed")
    } finally {
      setTestingNodeId(null)
    }
  }

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken })
      }
    } catch (e) {
      console.error(e)
    }
    clearAuth()
    router.push("/")
  }

  const userEmail = user?.email || "anshuman@example.com"
  const userInitial = userEmail[0].toUpperCase()

  return (
    <div className="relative min-h-screen bg-[#030303] text-[#f5f5f7] bg-cyber-grid selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden font-sans">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-radial-gradient pointer-events-none z-0 opacity-80" />
      
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {/* Brand Header Banner */}
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
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400">
                  Bhagwanti Cloud Console
                </h1>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                Admin Profile Session: {userEmail}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-right border-r border-zinc-900 pr-4 hidden lg:block">
              <p className="text-xs font-serif italic text-amber-500">
                &ldquo;She taught us values, we build the cloud.&rdquo;
              </p>
            </div>

            {/* Global Active Node Selector */}
            <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-1">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Active Node:</span>
              <select
                value={selectedNodeId}
                onChange={(e) => {
                  setSelectedNodeId(e.target.value)
                  setTerminalLines([`[Bhagwanti Cloud] Switching session target to ${e.target.value}...`])
                }}
                className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer pr-2"
              >
                <option value="local" className="bg-zinc-950">Local Server (Powershell)</option>
                {nodesList.map((n) => (
                  <option key={n.id} value={n.id} className="bg-zinc-950">{n.name} ({n.ip_address})</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleLogout}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold text-red-400 bg-red-950/20 border border-red-500/20 hover:bg-red-500/10 transition-colors gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* 3-Column Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mb-12">
          
          {/* COLUMN 1: LEFT FEATURE LIST */}
          <div className="space-y-6 lg:col-span-1">
            <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-amber-500 border-b border-zinc-900 pb-2 text-left">
              Core Capabilities
            </h3>
            
            <div className="space-y-5 text-left">
              <div className="flex items-start space-x-3.5 group cursor-pointer" onClick={() => setActiveTab("projects")}>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <PlayCircle className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">One-Click Deploy</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    Deploy your apps from GitHub in under 60 seconds.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 group cursor-pointer" onClick={() => setActiveTab("projects")}>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Layers className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">Full Server Control</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    Manage Docker, Services, Files, Logs & more from one place.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 group cursor-pointer" onClick={() => setActiveTab("monitoring")}>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Activity className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">Real-time Monitoring</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    CPU, RAM, Disk, Network monitored in real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 group cursor-pointer" onClick={() => setActiveTab("terminal")}>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <TerminalIcon className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">Web Terminal</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    Powerful terminal right inside your web browser.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2 & 3: MAIN DASHBOARD SHOWCASE (CENTERPIECE) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] shadow-2xl overflow-hidden">
              
              {/* Dashboard Browser Title Bar */}
              <div className="h-14 border-b border-zinc-900 px-4 flex items-center justify-between bg-zinc-950/40">
                <div className="flex items-center space-x-2.5">
                  <div className="flex space-x-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-zinc-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-zinc-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-zinc-800" />
                  </div>
                  
                  <div className="flex items-center space-x-1.5 ml-4">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    <span className="text-[11px] font-bold text-white tracking-wider uppercase font-mono">
                      Console Node
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2.5 relative">
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => setShowAlerts(!showAlerts)}
                    >
                      <Bell className={`w-4 h-4 ${alerts.length > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`} />
                      {alerts.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-[#09090b]" />
                      )}
                    </div>
                    
                    {showAlerts && (
                      <div className="absolute top-8 right-0 w-64 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-2 z-50">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-2 px-1">System Alerts</h4>
                        {alerts.length === 0 ? (
                          <p className="text-xs text-zinc-500 px-1 py-2">No active alerts.</p>
                        ) : (
                          <div className="space-y-1">
                            {alerts.map(a => (
                              <div key={a.id} className="p-2 rounded bg-red-950/20 border border-red-900/50">
                                <p className="text-[10px] text-red-400 font-mono font-bold">{a.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <span className="w-px h-4 bg-zinc-800 ml-2" />
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-amber-600/30 border border-amber-500/40 flex items-center justify-center font-bold text-[10px] text-amber-300">
                        {userInitial}
                      </div>
                      <div className="text-left hidden sm:block">
                        <p className="text-[10px] font-bold text-white">{userEmail.split("@")[0]}</p>
                        <p className="text-[8px] text-zinc-500 font-mono">System Admin</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Internal Content Area */}
              <div className="grid grid-cols-1 md:grid-cols-4 min-h-[480px]">
                
                {/* Sidebar Navigation */}
                <div className="md:col-span-1 border-r border-zinc-900 p-3 bg-zinc-950/20 text-left space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-2.5 block mb-2">
                    Controls
                  </span>
                  
                  <button 
                    onClick={() => setActiveTab("dashboard")}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-xs font-semibold transition-all ${activeTab === "dashboard" ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-bold" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"}`}
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab("projects")}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-xs font-semibold transition-all ${activeTab === "projects" ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-bold" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"}`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Projects</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab("terminal")}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-xs font-semibold transition-all ${activeTab === "terminal" ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-bold" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"}`}
                  >
                    <TerminalIcon className="w-3.5 h-3.5" />
                    <span>Terminal</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab("monitoring")}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-xs font-semibold transition-all ${activeTab === "monitoring" ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-bold" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"}`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Monitoring</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab("settings")}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-xs font-semibold transition-all ${activeTab === "settings" ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-bold" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"}`}
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </button>
                </div>

                {/* Dynamic Viewport */}
                <div className="md:col-span-3 p-5 flex flex-col justify-between text-left bg-zinc-950/20">
                  
                  {/* VIEW 1: OVERVIEW */}
                  {activeTab === "dashboard" && (
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h2 className="text-lg font-extrabold text-white tracking-tight">Active Node Monitor</h2>
                            <p className="text-[10px] text-zinc-500 font-medium">Real-time status updates from target node.</p>
                          </div>
                        </div>

                        {/* Hardware Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
                          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase">CPU Usage</p>
                            <p className={`text-xl font-bold font-mono mt-1 ${cpuUsage > 90 ? 'text-red-400' : 'text-white'}`}>{cpuUsage}%</p>
                            <div className="h-6 w-full mt-2">
                              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                                <path d="M0 25 L 10 20 L 20 22 L 30 15 L 40 18 L 50 12 L 60 20 L 70 8 L 80 14 L 90 5 L 100 12" fill="none" stroke={cpuUsage > 90 ? "#ef4444" : "#f59e0b"} strokeWidth="1.5" />
                              </svg>
                            </div>
                          </div>

                          <div className={`p-3 rounded-lg bg-zinc-900/60 border ${ramUsage > 90 ? 'border-red-500/50 bg-red-950/10' : 'border-zinc-800/80'}`}>
                            <div className="flex justify-between items-start">
                              <p className="text-[9px] font-bold text-zinc-500 uppercase">RAM Usage</p>
                              <p className="text-[9px] font-mono text-zinc-400">{ramUsed.toFixed(1)} GB / {ramTotal.toFixed(1)} GB</p>
                            </div>
                            <p className={`text-xl font-bold font-mono mt-1 ${ramUsage > 90 ? 'text-red-400' : 'text-white'}`}>{ramUsage}%</p>
                            <div className="h-6 w-full mt-2">
                              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                                <path d="M0 20 L 10 18 L 20 19 L 30 16 L 40 15 L 50 17 L 60 14 L 70 15 L 80 12 L 90 13 L 100 10" fill="none" stroke={ramUsage > 90 ? "#ef4444" : "#10b981"} strokeWidth="1.5" />
                              </svg>
                            </div>
                          </div>

                          <div className={`p-3 rounded-lg bg-zinc-900/60 border ${diskUsage > 90 ? 'border-red-500/50 bg-red-950/10' : 'border-zinc-800/80'}`}>
                            <div className="flex justify-between items-start">
                              <p className="text-[9px] font-bold text-zinc-500 uppercase">Disk Usage</p>
                              <p className="text-[9px] font-mono text-zinc-400">{diskUsed.toFixed(1)} GB / {diskTotal.toFixed(1)} GB</p>
                            </div>
                            <p className={`text-xl font-bold font-mono mt-1 ${diskUsage > 90 ? 'text-red-400' : 'text-white'}`}>{diskUsage}%</p>
                            <div className="h-6 w-full mt-2">
                              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                                <path d="M0 15 L 10 15 L 20 15 L 30 16 L 40 16 L 50 17 L 60 16 L 70 17 L 80 18 L 90 18 L 100 19" fill="none" stroke={diskUsage > 90 ? "#ef4444" : "#8b5cf6"} strokeWidth="1.5" />
                              </svg>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
                            <div>
                              <p className="text-[9px] font-bold text-zinc-500 uppercase">Connection</p>
                              <p className="text-xs font-bold text-emerald-400 mt-1.5">Online</p>
                            </div>
                            <div className="flex justify-end">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Projects / Docker containers Table */}
                          <div className="border border-zinc-900 rounded-lg p-3 bg-zinc-950/40">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">Active Containers</span>
                              <button onClick={fetchContainers} className="text-[8px] text-amber-500 hover:underline">Refresh</button>
                            </div>
                            
                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                              {!dockerError && containers.length > 0 ? (
                                containers.map((c) => (
                                  <div key={c.id} className="flex items-center justify-between p-2 rounded bg-zinc-900/40 border border-zinc-900 text-xs">
                                    <div className="flex items-center space-x-2">
                                      <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center font-mono text-[9px] text-amber-500">
                                        {c.name[0].toUpperCase()}
                                      </span>
                                      <div>
                                        <p className="font-bold text-zinc-200">{c.name}</p>
                                        <p className="text-[8px] text-zinc-500">{c.image.split(":")[0]}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button 
                                        onClick={() => openLogs(c.name)}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-colors bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                                      >
                                        Logs
                                      </button>
                                      <button 
                                        onClick={() => handleToggleContainer(c.name)}
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-colors ${c.status === "running" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400" : "bg-zinc-800 text-zinc-500 border-zinc-850 hover:bg-emerald-500/10 hover:text-emerald-400"}`}
                                      >
                                        ● {c.status}
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-zinc-500 font-mono text-center py-2">
                                  {dockerError || "No active container instances found."}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3.5 text-left">
                            <div className="border border-zinc-900 rounded-lg p-3 bg-zinc-950/40 text-xs">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2">Network Traffic</span>
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                <div>
                                  <p className="text-zinc-500">Cumulative In</p>
                                  <p className="font-bold text-emerald-400 mt-0.5">{netIn} GB</p>
                                </div>
                                <div>
                                  <p className="text-zinc-500">Cumulative Out</p>
                                  <p className="font-bold text-sky-400 mt-0.5">{netOut} GB</p>
                                </div>
                              </div>
                            </div>

                            <div className="border border-zinc-900 rounded-lg p-3 bg-zinc-950/40 text-xs">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2">System Specs</span>
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                <div>
                                  <p className="text-zinc-500">Uptime</p>
                                  <p className="font-bold text-zinc-200 mt-0.5">{uptime.days}d {uptime.hours}h {uptime.mins}m</p>
                                </div>
                                <div>
                                  <p className="text-zinc-500">Load Average</p>
                                  <p className="font-bold text-zinc-200 mt-0.5">0.42</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* VIEW 2: PROJECTS & GIT DEPLOYMENT */}
                  {activeTab === "projects" && (
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Application Projects</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Deploy new projects from Git or manage active containers.</p>
                          </div>
                        </div>

                        {/* Git deployment form */}
                        <form onSubmit={handleDeploy} className="p-4 rounded-lg bg-zinc-950 border border-zinc-900 space-y-3 mb-5 text-xs">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Deploy Application via Git</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">App Name</label>
                              <input 
                                type="text"
                                required
                                value={deployName}
                                onChange={(e) => setDeployName(e.target.value)}
                                placeholder="my-portfolio"
                                className="w-full bg-zinc-900 border border-zinc-800 text-[11px] rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Git Repository URL</label>
                              <input 
                                type="url"
                                required
                                value={deployRepo}
                                onChange={(e) => setDeployRepo(e.target.value)}
                                placeholder="https://github.com/anshuman-cloud/portfolio"
                                className="w-full bg-zinc-900 border border-zinc-800 text-[11px] rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                            <div className="flex items-center space-x-2 text-[9px] text-zinc-400 font-mono">
                              <span>Default Port:</span>
                              <input 
                                type="number" 
                                value={deployPort} 
                                onChange={(e) => setDeployPort(parseInt(e.target.value) || 3000)}
                                className="bg-zinc-900 border border-zinc-800 text-center w-14 rounded py-0.5" 
                              />
                            </div>

                            <button 
                              type="submit"
                              className="px-3.5 py-1.5 rounded bg-amber-500 text-black text-[11px] font-bold hover:bg-amber-400 transition-colors"
                            >
                              Boot Deploy Worker
                            </button>
                          </div>

                          {deployMessage && (
                            <p className="text-[9px] text-amber-400 font-mono mt-1 text-center bg-amber-500/10 py-1.5 rounded border border-amber-500/10">
                              {deployMessage}
                            </p>
                          )}
                        </form>

                        {/* List containers */}
                        <div className="space-y-2 max-h-[160px] overflow-y-auto">
                          {!dockerError && containers.length > 0 ? (
                            containers.map((c) => (
                              <div key={c.id} className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-855 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`w-2 h-2 rounded-full ${c.status === 'running' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                                    <h4 className="text-xs font-bold text-white">{c.name}</h4>
                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 font-mono">Image: {c.image.split(":")[0]}</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button 
                                    onClick={() => openLogs(c.name)}
                                    className="px-2.5 py-1 rounded text-[10px] font-bold border transition-colors bg-blue-950/30 text-blue-400 border-blue-900/50 hover:bg-blue-900/40"
                                  >
                                    Logs
                                  </button>
                                  <button 
                                    onClick={() => handleToggleContainer(c.name)}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${c.status === 'running' ? 'bg-zinc-800 text-red-400 border-zinc-700 hover:bg-red-950/20' : 'bg-amber-500 text-black border-amber-600 hover:bg-amber-400'}`}
                                  >
                                    {c.status === "running" ? "Stop" : "Start"}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-500 font-mono text-center py-2">
                              {dockerError || "No active container instances found."}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW 3: TERMINAL */}
                  {activeTab === "terminal" && (
                    <div className="flex-1 flex flex-col justify-between h-full">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Interactive Shell</h3>
                          <p className="text-[10px] text-zinc-500">Live Secure PTY shell channel inside the browser.</p>
                        </div>
                      </div>

                      {/* Display lines */}
                      <div className="flex-1 min-h-[350px]">
                        <DynamicXterm wsUrl={`ws://localhost:8000/api/v1/terminal/ws?node_id=${selectedNodeId}&token=${accessToken}`} />
                      </div>
                    </div>
                  )}

                  {/* VIEW 4: DETAILED MONITORING */}
                  {activeTab === "monitoring" && (
                    <div className="flex-1 flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Telemetry Engine</h3>
                        <p className="text-[10px] text-zinc-500">Real-time stats collected directly from system daemons.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-left">
                          <h4 className="text-xs font-bold text-zinc-300 mb-3 flex items-center justify-between font-mono">
                            <span>Core Streams</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          </h4>
                          
                          <div className="space-y-4 text-xs font-mono">
                            <div>
                              <div className="flex justify-between text-[10px] text-zinc-400">
                                <span>CPU Utilization</span>
                                <span>{cpuUsage}%</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${cpuUsage}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] text-zinc-400">
                                <span>RAM Allocated</span>
                                <span>{ramUsage}%</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${ramUsage}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] text-zinc-400">
                                <span>Disk Space Filled</span>
                                <span>{diskUsage}%</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${diskUsage}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-300 mb-1">Network Throughput</h4>
                            <p className="text-[8px] text-zinc-500 font-mono">Delta activity over network interfaces</p>
                          </div>
                          
                          <div className="h-24 w-full relative mt-3">
                            <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                              <path 
                                d={`M0 45 Q 10 20, 20 ${45 - cpuUsage/3} T 40 ${45 - ramUsage/3} T 60 15 T 80 35 T 100 45`} 
                                fill="none" 
                                stroke="#10b981" 
                                strokeWidth="1.5" 
                              />
                            </svg>
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-2">
                            <span>Tx Cumulative: {netOut} GB</span>
                            <span>Rx Cumulative: {netIn} GB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW 5: SETTINGS & SERVER NODES */}
                  {activeTab === "settings" && (
                    <div className="flex-1 flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Host Node Setup</h3>
                        <p className="text-[10px] text-zinc-500">Configure connection details for your target Debian 13 node agent.</p>
                      </div>

                      {/* Register form */}
                      <form onSubmit={handleAddNode} className="space-y-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 p-4 text-xs mb-5">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-900 pb-1.5">Add Target Debian 13 Node</span>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Node Name</label>
                            <input 
                              type="text" 
                              required
                              placeholder="debian-laptop"
                              value={nodeName} 
                              onChange={(e) => setNodeName(e.target.value)}
                              className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-[11px] rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">IP Address</label>
                            <input 
                              type="text" 
                              required
                              placeholder="192.168.1.150"
                              value={nodeIP} 
                              onChange={(e) => setNodeIP(e.target.value)}
                              className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-[11px] rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">SSH Port</label>
                            <input 
                              type="number" 
                              required
                              value={sshPort} 
                              onChange={(e) => setSshPort(parseInt(e.target.value) || 22)}
                              className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-[11px] rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">SSH User</label>
                            <input 
                              type="text" 
                              required
                              value={sshUser} 
                              onChange={(e) => setSshUser(e.target.value)}
                              className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-[11px] rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">SSH Private Key (Use generated below or add yours)</label>
                          <textarea 
                            value={nodePrivateKey}
                            onChange={(e) => setNodePrivateKey(e.target.value)}
                            required
                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                            className="w-full h-16 bg-zinc-950 border border-zinc-800 text-[9px] font-mono rounded p-2 text-zinc-400 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button 
                            type="submit"
                            className="px-3.5 py-1.5 rounded bg-white text-black text-[11px] font-bold hover:bg-zinc-200 transition-colors"
                          >
                            Register Node
                          </button>
                        </div>
                      </form>

                      {/* Display registered nodes list */}
                      <div className="space-y-2.5 rounded-lg bg-zinc-900/20 border border-zinc-900 p-4">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-900 pb-1.5">Registered Management Cluster</span>
                        {nodesList.length > 0 ? (
                          nodesList.map((n) => (
                            <div key={n.id} className="p-3 rounded bg-zinc-950 border border-zinc-900 flex justify-between items-center text-xs font-mono">
                              <div>
                                <p className="font-bold text-zinc-200">{n.name} ({n.ip_address}:{n.ssh_port})</p>
                                <p className="text-[9px] text-zinc-500 mt-0.5">Status: <span className={n.status === "online" ? "text-emerald-400" : "text-red-400"}>{n.status}</span></p>
                              </div>
                              <button 
                                onClick={() => testNodeSSH(n.id)}
                                disabled={testingNodeId === n.id}
                                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[10px]"
                              >
                                {testingNodeId === n.id ? "Pinging..." : "Test Connection"}
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-zinc-500 font-mono py-1">No custom nodes registered yet.</p>
                        )}
                      </div>

                      {/* Key pair helper card */}
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 mt-4 text-left">
                        <h4 className="text-xs font-bold text-amber-500 mb-1 flex items-center gap-1.5">
                          <Key className="w-4 h-4" />
                          <span>Generated Key Pair Authorization</span>
                        </h4>
                        <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
                          Copy the public key below and paste it into your target Debian laptop&apos;s `/root/.ssh/authorized_keys` file to authorize secure passwordless connection:
                        </p>
                        <textarea 
                          readOnly
                          value={sshPublicKey || "Generating cryptographic keypair..."}
                          className="w-full h-14 bg-zinc-950 border border-zinc-880 text-[8px] font-mono rounded p-2 text-amber-400 focus:outline-none"
                          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        />
                      </div>
                    </div>
                  )}



                </div>

              </div>

              {/* Dashboard Quick Actions Footer */}
              <div className="border-t border-zinc-900 p-3 bg-zinc-950/60 flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-600 hidden sm:inline">© 2026 Bhagwanti Cloud. All rights reserved.</span>
                <span className="text-zinc-500 block sm:hidden">Bhagwanti Core Agent v0.1</span>
                
                {/* Actions Grid */}
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <button onClick={() => { setActiveTab("projects") }} className="px-2.5 py-1 rounded bg-orange-600/20 border border-orange-500/20 text-orange-400 hover:bg-orange-600/30 transition-colors">Deploy App</button>
                  <button onClick={() => { setActiveTab("terminal") }} className="px-2.5 py-1 rounded bg-purple-600/20 border border-purple-500/20 text-purple-400 hover:bg-purple-600/30 transition-colors">Web Terminal</button>
                  <button onClick={() => { setActiveTab("dashboard") }} className="px-2.5 py-1 rounded bg-blue-600/20 border border-blue-500/20 text-blue-400 hover:bg-blue-600/30 transition-colors">Docker</button>
                  <button onClick={() => { setActiveTab("terminal") }} className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors">Logs</button>
                </div>
              </div>

            </div>
          </div>

          {/* COLUMN 4: RIGHT MASCOT CARD */}
          <div className="space-y-6 lg:col-span-1">
            <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-amber-500 border-b border-zinc-900 pb-2 text-left">
              Host Highlights
            </h3>

            <div className="space-y-3.5">
              <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-900 text-left">
                <div className="flex items-center space-x-2 text-amber-400 mb-1.5">
                  <Code2 className="w-4.5 h-4.5" />
                  <h4 className="text-xs font-bold text-zinc-200">Made for Developers</h4>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">Simple and fast bootstrapping, tailored for both beginners and veterans.</p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-900 text-left">
                <div className="flex items-center space-x-2 text-white mb-1.5">
                  <Server className="w-4.5 h-4.5" />
                  <h4 className="text-xs font-bold text-zinc-200">Self Hosted</h4>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">Works completely on your own hardware nodes, eliminating cloud provider markups.</p>
              </div>
            </div>

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
      </div>

      {/* Container Logs Modal */}
      {logContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900">
              <div className="flex items-center space-x-3">
                <TerminalSquare className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-white text-sm">Container Logs: {logContainer}</h3>
              </div>
              <button 
                onClick={closeLogs}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 p-4 bg-black overflow-y-auto font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {logLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
