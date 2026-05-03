import { LucideIcon } from "lucide-react"

interface StudentStatCardProps {
  readonly label: string
  readonly value: string | number
  readonly icon: LucideIcon
}

export function StudentStatCard({ label, value, icon: Icon }: Readonly<StudentStatCardProps>) {
  return (
    <div className="liquid-glass rounded-2xl p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
        <Icon className="h-5 w-5" strokeWidth={1.2} />
      </div>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{label}</div>
    </div>
  )
}
