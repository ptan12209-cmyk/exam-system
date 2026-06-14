"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info" | "success"
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "danger",
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      onClose()
    }
  }

  const iconMap = {
    danger: <AlertTriangle className="h-7 w-7 text-red-500" />,
    warning: <AlertTriangle className="h-7 w-7 text-amber-500" />,
    info: <Info className="h-7 w-7 text-blue-500" />,
    success: <CheckCircle2 className="h-7 w-7 text-emerald-500" />,
  }

  const iconBgMap = {
    danger: "bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    warning: "bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    info: "bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    success: "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  }

  const dialogShadowMap = {
    danger: "shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] border-red-500/20",
    warning: "shadow-[0_0_50px_-12px_rgba(245,158,11,0.25)] border-amber-500/20",
    info: "shadow-[0_0_50px_-12px_rgba(59,130,246,0.25)] border-blue-500/20",
    success: "shadow-[0_0_50px_-12px_rgba(16,185,129,0.25)] border-emerald-500/20",
  }

  const buttonConfirmStyle = {
    danger: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-full shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]",
    warning: "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-full shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]",
    info: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]",
    success: "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]",
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-sm translate-x-[-50%] translate-y-[-50%] p-6 rounded-[2rem] duration-200 focus:outline-none bg-[hsl(var(--card))]/90 backdrop-blur-md transition-all border",
        dialogShadowMap[variant]
      )}>
        <DialogHeader className="flex flex-col items-center gap-3 text-center">
          <div className={cn("flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-300 hover:rotate-12", iconBgMap[variant])}>
            {iconMap[variant]}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-white">{title}</DialogTitle>
          <DialogDescription className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs mt-1 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-full border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/20 transition-all duration-200 active:scale-95"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={cn("w-full transition-all duration-200 active:scale-95", buttonConfirmStyle[variant])}
          >
            {loading ? (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
