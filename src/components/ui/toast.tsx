"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type, duration }])

    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  const success = useCallback((message: string, duration?: number) => toast(message, 'success', duration), [toast])
  const error = useCallback((message: string, duration?: number) => toast(message, 'error', duration), [toast])
  const warning = useCallback((message: string, duration?: number) => toast(message, 'warning', duration), [toast])
  const info = useCallback((message: string, duration?: number) => toast(message, 'info', duration), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const { id, message, type } = toast

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
    info: <Info className="h-5 w-5 text-cyan-400 shrink-0" />,
  }

  const borderColors = {
    success: 'border-emerald-500/20 bg-emerald-950/20 text-emerald-200',
    error: 'border-rose-500/20 bg-rose-950/20 text-rose-200',
    warning: 'border-amber-500/20 bg-amber-950/20 text-amber-200',
    info: 'border-cyan-500/20 bg-cyan-950/20 text-cyan-200',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.15 }}
      layout
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border backdrop-blur-md p-4 shadow-xl ${borderColors[type]}`}
    >
      {icons[type]}
      <p className="text-xs font-semibold leading-relaxed flex-1 select-none pr-2">
        {message}
      </p>
      <button
        onClick={() => onClose(id)}
        className="text-muted-foreground hover:text-foreground hover:bg-white/5 p-1 rounded-lg transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}
