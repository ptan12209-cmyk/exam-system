export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[hsl(var(--background))]">
      <div className="flex flex-col items-center gap-5">
        {/* Animated pulse ring */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--foreground))]/10 animate-ping" />
          <div className="absolute inset-1 rounded-full border-2 border-t-[hsl(var(--foreground))] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--foreground))]" />
        </div>

        {/* Label */}
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))] animate-pulse">
          Đang tải
        </p>
      </div>
    </div>
  )
}
