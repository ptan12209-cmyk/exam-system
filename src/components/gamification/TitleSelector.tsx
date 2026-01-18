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
                <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Danh hiệu
                </h3>
                <span className="text-sm text-slate-400">
                    {userXp.toLocaleString()} XP
                </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {titles.map(title => {
                    const isEquipped = title.id === equippedId
                    const isLocked = !title.isUnlocked

                    return (
                        <button
                            key={title.id}
                            onClick={() => handleEquip(title)}
                            disabled={isLocked || equipping === title.id}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                isEquipped
                                    ? "bg-yellow-500/20 border-yellow-500/50"
                                    : isLocked
                                        ? "bg-slate-800/30 border-slate-700 opacity-50 cursor-not-allowed"
                                        : "bg-slate-800 border-slate-700 hover:border-yellow-500/30 cursor-pointer"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {/* Title preview */}
                                <span
                                    className="text-lg font-medium"
                                    style={{ color: isLocked ? "#64748b" : title.color }}
                                >
                                    {title.display_text}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* XP requirement */}
                                {title.unlock_xp !== null && title.unlock_xp > 0 && (
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        isLocked
                                            ? "bg-slate-700 text-slate-400"
                                            : "bg-yellow-500/20 text-yellow-400"
                                    )}>
                                        {title.unlock_xp.toLocaleString()} XP
                                    </span>
                                )}

                                {/* Status icon */}
                                {equipping === title.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                                ) : isEquipped ? (
                                    <Check className="w-4 h-4 text-yellow-500" />
                                ) : isLocked ? (
                                    <Lock className="w-4 h-4 text-slate-500" />
                                ) : null}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// Display equipped title badge
export function TitleBadge({ title }: { title?: { display_text: string; color: string } }) {
    if (!title) return null

    return (
        <span
            className="px-2 py-0.5 rounded-full text-sm font-medium"
            style={{
                color: title.color,
                backgroundColor: `${title.color}20`
            }}
        >
            {title.display_text}
        </span>
    )
}
