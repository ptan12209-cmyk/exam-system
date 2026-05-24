"use client"

import { useState, useEffect } from "react"
import { Check, Lock, Crown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Title {
    id: string
    name: string
    display_text: string
    color: string
    unlock_xp: number | null
    isUnlocked: boolean
    isEquipped: boolean
}

interface TitleSelectorProps {
    onEquip?: (title: Title) => void
}

export function TitleSelector({ onEquip }: TitleSelectorProps) {
    const [titles, setTitles] = useState<Title[]>([])
    const [equippedId, setEquippedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [equipping, setEquipping] = useState<string | null>(null)
    const [userXp, setUserXp] = useState(0)

    useEffect(() => {
        fetchTitles()
    }, [])

    async function fetchTitles() {
        try {
            const res = await fetch("/api/titles")
            const data = await res.json()
            if (res.ok) {
                setTitles(data.titles || [])
                setEquippedId(data.equippedTitleId)
                setUserXp(data.userXp || 0)
            }
        } catch (error) {
            console.error("Failed to fetch titles:", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleEquip(title: Title) {
        if (!title.isUnlocked || equipping) return

        setEquipping(title.id)
        try {
            const res = await fetch("/api/titles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ titleId: title.id === equippedId ? null : title.id })
            })

            if (res.ok) {
                const newEquippedId = title.id === equippedId ? null : title.id
                setEquippedId(newEquippedId)
                setTitles(prev => prev.map(t => ({
                    ...t,
                    isEquipped: t.id === newEquippedId
                })))
                onEquip?.(title)
            }
        } catch (error) {
            console.error("Equip failed:", error)
        } finally {
            setEquipping(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]/40">
                <h3 className="font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2 tracking-tight">
                    <Crown className="w-5 h-5 text-amber-500 animate-pulse" />
                    Danh hiệu đạt được
                </h3>
                <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/75 px-3 py-1 rounded-full">
                    {userXp.toLocaleString()} XP tích lũy
                </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
                {titles.map(title => {
                    const isEquipped = title.id === equippedId
                    const isLocked = !title.isUnlocked

                    return (
                        <button
                            key={title.id}
                            onClick={() => handleEquip(title)}
                            disabled={isLocked || equipping === title.id}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 text-left",
                                isEquipped
                                    ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.06)] animate-pulse"
                                    : isLocked
                                        ? "bg-[hsl(var(--card))]/35 border-[hsl(var(--border))]/50 opacity-45 cursor-not-allowed"
                                        : "bg-[hsl(var(--card))]/75 border-[hsl(var(--border))]/60 hover:border-amber-500/40 hover:bg-[hsl(var(--card))] cursor-pointer hover:shadow-xs"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {/* Title display with glow effect if equipped */}
                                <span
                                    className={cn(
                                        "text-base font-extrabold tracking-tight transition-colors duration-200",
                                        isEquipped && "filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.15)]"
                                    )}
                                    style={{ color: isLocked ? "hsl(var(--muted-foreground))" : title.color }}
                                >
                                    [{title.display_text}]
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* XP Requirement pill */}
                                {title.unlock_xp !== null && title.unlock_xp > 0 && (
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                                        isLocked
                                            ? "bg-[hsl(var(--muted))]/80 text-[hsl(var(--muted-foreground))]/70 border-[hsl(var(--border))]/40"
                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    )}>
                                        Yêu cầu {title.unlock_xp.toLocaleString()} XP
                                    </span>
                                )}

                                {/* Status icons */}
                                <div className="flex items-center justify-center w-6 h-6">
                                    {equipping === title.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                    ) : isEquipped ? (
                                        <Check className="w-4.5 h-4.5 text-amber-500 stroke-[3.5]" />
                                    ) : isLocked ? (
                                        <Lock className="w-4 h-4 text-[hsl(var(--muted-foreground))]/60" />
                                    ) : null}
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// Display equipped title badge as a beautiful clean pill
export function TitleBadge({ title }: { title?: { display_text: string; color: string } }) {
    if (!title) return null

    return (
        <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold border select-none tracking-tight"
            style={{
                color: title.color,
                backgroundColor: `${title.color}12`,
                borderColor: `${title.color}25`
            }}
        >
            {title.display_text}
        </span>
    )
}

