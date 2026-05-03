import { cn } from "@/lib/utils"

interface StudentShellProps {
  readonly children: React.ReactNode
  readonly className?: string
}

export function StudentShell({ children, className }: Readonly<StudentShellProps>) {
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
        className
      )}
    >
      {children}
    </div>
  )
}
