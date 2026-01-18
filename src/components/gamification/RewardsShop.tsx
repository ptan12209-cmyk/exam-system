"use client"

import { useState, useEffect } from "react"
import { Gift, ShoppingCart, Loader2, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Reward {
    id: string
    name: string
    description: string
    icon: string
    xp_cost: number
    stock: number
    category: string
}

interface RewardsShopProps {
    initialXp?: number
}

export function RewardsShop({ initialXp = 0 }: RewardsShopProps) {
    const [rewards, setRewards] = useState<Reward[]>([])
    const [userXp, setUserXp] = useState(initialXp)
    const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
    const [redeeming, setRedeeming] = useState(false)
    const [redeemResult, setRedeemResult] = useState<{ success: boolean; message: string } | null>(null)

    useEffect(() => {
        fetchRewards()
    }, [])

    async function fetchRewards() {
        try {
            const res = await fetch("/api/rewards")
            const data = await res.json()
            if (res.ok) {
                setRewards(data.rewards || [])
                setUserXp(data.userXp || 0)
                setRedeemedIds(new Set(data.redeemedRewards?.map((r: { reward_id: string }) => r.reward_id) || []))
            }
        } catch (error) {
            console.error("Failed to fetch rewards:", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleRedeem() {
        if (!selectedReward) return

        setRedeeming(true)
        setRedeemResult(null)

        try {
            const res = await fetch("/api/rewards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rewardId: selectedReward.id })
            })
            const data = await res.json()

            if (res.ok && data.success) {
                setRedeemResult({ success: true, message: `Đã đổi ${data.rewardName}! Còn ${data.remainingXp} XP` })
                setUserXp(data.remainingXp)
                setRedeemedIds(prev => new Set([...prev, selectedReward.id]))
            } else {
                setRedeemResult({ success: false, message: data.error || "Không thể đổi phần thưởng" })
            }
        } catch (error) {
            setRedeemResult({ success: false, message: "Lỗi kết nối" })
            console.error("Redeem error:", error)
        } finally {
            setRedeeming(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    const categories = [...new Set(rewards.map(r => r.category))]

    return (
        <div className="space-y-6">
            {/* XP Balance Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Số dư XP</p>
                        <p className="text-2xl font-bold text-white">{userXp.toLocaleString()}</p>
                    </div>
                </div>
                <ShoppingCart className="w-8 h-8 text-yellow-500/50" />
            </div>

            {/* Rewards by Category */}
            {categories.map(category => (
                <div key={category} className="space-y-3">
                    <h3 className="text-lg font-semibold text-white capitalize flex items-center gap-2">
                        {category === "avatar" && "🎭"}
                        {category === "badge" && "🏅"}
                        {category === "bonus" && "💎"}
                        {category === "physical" && "📦"}
                        {category || "Khác"}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {rewards
                            .filter(r => r.category === category)
                            .map(reward => {
                                const canAfford = userXp >= reward.xp_cost
                                const alreadyOwned = redeemedIds.has(reward.id) && reward.category !== "bonus"
                                const outOfStock = reward.stock === 0

                                return (
                                    <button
                                        key={reward.id}
                                        onClick={() => !alreadyOwned && !outOfStock && setSelectedReward(reward)}
                                        disabled={alreadyOwned || outOfStock}
                                        className={cn(
                                            "relative p-4 rounded-xl border transition-all text-left",
                                            alreadyOwned
                                                ? "bg-green-500/10 border-green-500/30 cursor-default"
                                                : outOfStock
                                                    ? "bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed"
                                                    : canAfford
                                                        ? "bg-slate-800 border-slate-700 hover:border-yellow-500/50 hover:bg-slate-700/50 cursor-pointer"
                                                        : "bg-slate-800/50 border-slate-700 opacity-60 cursor-pointer"
                                        )}
                                    >
                                        {/* Owned Badge */}
                                        {alreadyOwned && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        {/* Icon */}
                                        <div className="text-4xl mb-3">{reward.icon}</div>

                                        {/* Name & Description */}
                                        <h4 className="font-semibold text-white mb-1">{reward.name}</h4>
                                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                                            {reward.description}
                                        </p>

                                        {/* Price */}
                                        <div className={cn(
                                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
                                            canAfford ? "bg-yellow-500/20 text-yellow-500" : "bg-slate-700 text-slate-400"
                                        )}>
                                            ⭐ {reward.xp_cost.toLocaleString()}
                                        </div>

                                        {/* Stock indicator */}
                                        {reward.stock > 0 && reward.stock <= 10 && (
                                            <p className="text-xs text-orange-400 mt-2">
                                                Còn {reward.stock} phần
                                            </p>
                                        )}
                                        {outOfStock && (
                                            <p className="text-xs text-red-400 mt-2">Hết hàng</p>
                                        )}
                                    </button>
                                )
                            })}
                    </div>
                </div>
            ))}

            {/* Confirm Dialog */}
            <Dialog open={!!selectedReward} onOpenChange={() => {
                setSelectedReward(null)
                setRedeemResult(null)
            }}>
                <DialogContent className="bg-slate-900 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-white">
                            <span className="text-4xl">{selectedReward?.icon}</span>
                            {selectedReward?.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {selectedReward?.description}
                        </DialogDescription>
                    </DialogHeader>

                    {redeemResult ? (
                        <div className={cn(
                            "p-4 rounded-lg flex items-center gap-3",
                            redeemResult.success ? "bg-green-500/20" : "bg-red-500/20"
                        )}>
                            {redeemResult.success ? (
                                <Check className="w-6 h-6 text-green-500" />
                            ) : (
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            )}
                            <p className={redeemResult.success ? "text-green-400" : "text-red-400"}>
                                {redeemResult.message}
                            </p>
                        </div>
                    ) : (
                        <div className="py-4">
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                <span className="text-slate-400">Chi phí</span>
                                <span className="text-yellow-500 font-bold">
                                    ⭐ {selectedReward?.xp_cost.toLocaleString()} XP
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg mt-2">
                                <span className="text-slate-400">Số dư hiện tại</span>
                                <span className="text-white font-bold">{userXp.toLocaleString()} XP</span>
                            </div>
                            {selectedReward && userXp < selectedReward.xp_cost && (
                                <p className="text-red-400 text-sm mt-3 text-center">
                                    Bạn cần thêm {(selectedReward.xp_cost - userXp).toLocaleString()} XP
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {redeemResult?.success ? (
                            <Button
                                onClick={() => {
                                    setSelectedReward(null)
                                    setRedeemResult(null)
                                }}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                Đóng
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedReward(null)}
                                    disabled={redeeming}
                                    className="border-slate-600 text-slate-300"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleRedeem}
                                    disabled={redeeming || !selectedReward || userXp < selectedReward.xp_cost}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                                >
                                    {redeeming ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        "Xác nhận đổi"
                                    )}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
