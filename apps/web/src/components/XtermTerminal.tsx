"use client"
import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface XtermTerminalProps {
  wsUrl: string
}

export default function XtermTerminal({ wsUrl }: XtermTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new Terminal({
      theme: {
        background: '#000000',
        foreground: '#e4e4e7',
        cursor: '#f59e0b',
        selectionBackground: '#27272a',
      },
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12,
      cursorBlink: true,
      convertEol: true // very important for websocket data
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(terminalRef.current)
    fitAddon.fit()

    // Handle window resize
    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    // Connect WebSocket
    const ws = new WebSocket(wsUrl)
    
    // Handle clipboard operations
    term.attachCustomKeyEventHandler((arg) => {
      // Allow Ctrl+C to copy if text is selected
      if (arg.ctrlKey && arg.code === "KeyC" && arg.type === "keydown") {
        if (term.hasSelection()) {
          document.execCommand('copy')
          term.clearSelection()
          return false // Prevent xterm from sending SIGINT
        }
      }
      
      // Allow Ctrl+V to paste
      if (arg.ctrlKey && arg.code === "KeyV" && arg.type === "keydown") {
        navigator.clipboard.readText().then(text => {
          // Send pasted text to backend PTY
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(text)
          }
        }).catch(() => {})
        return false // Prevent xterm default behavior
      }

      // Map Backspace to \x08 (Ctrl+H) to fix erase on some PTYs
      if (arg.code === "Backspace" && arg.type === "keydown") {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('\x08')
        }
        return false
      }
      
      return true
    })
    
    ws.onopen = () => {
      term.writeln('\x1b[33m[Bhagwanti Cloud] Secure session connected.\x1b[0m')
    }

    ws.onmessage = (event) => {
      term.write(event.data)
    }

    ws.onclose = () => {
      term.writeln('\r\n\x1b[31m[Bhagwanti Cloud] Secure SSH session closed.\x1b[0m')
    }

    // Capture user keystrokes and send to backend PTY
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      ws.close()
      term.dispose()
    }
  }, [wsUrl])

  return (
    <div className="w-full h-full p-2 bg-black rounded-lg border border-zinc-900 overflow-hidden">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  )
}
