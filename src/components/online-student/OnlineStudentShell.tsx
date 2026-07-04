import { cn } from "@/lib/utils"

interface OnlineStudentShellProps {
  readonly children: React.ReactNode
  readonly className?: string
}

export function OnlineStudentShell({ children, className }: Readonly<OnlineStudentShellProps>) {
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-[#0B0A13] text-[#F1EDF9]",
        className
      )}
    >
      {children}
    </div>
  )
}
