"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Copy, Check, Share2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExamLinkDialogProps {
    examId: string
    examTitle: string
    open: boolean
    onClose: () => void
}

export function ExamLinkDialog({ examId, examTitle, open, onClose }: ExamLinkDialogProps) {
    const [copied, setCopied] = useState(false)

    // Generate the shareable link
    const shareableLink = typeof window !== 'undefined'
        ? `${window.location.origin}/student/exams/${examId}/take`
        : ''

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareableLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: examTitle,
                    text: `Làm bài thi: ${examTitle}`,
                    url: shareableLink,
                })
            } catch (err) {
                console.error('Share failed:', err)
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Đề thi đã được tạo!
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Chia sẻ link này cho học sinh để họ có thể làm bài
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Exam Title */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tên đề thi</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{examTitle}</p>
                    </div>

                    {/* Link Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Link truy cập
                        </label>
                        <div className="flex items-center gap-2">
                            <Input
                                readOnly
                                value={shareableLink}
                                className="font-mono text-xs bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleCopy}
                                className={cn(
                                    "flex-shrink-0 transition-all",
                                    copied
                                        ? "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-700 text-green-600 dark:text-green-400"
                                        : "border-gray-300 dark:border-slate-700"
                                )}
                            >
                                {copied ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                        {copied && (
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Đã copy vào clipboard!
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={handleCopy}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                        </Button>

                        {typeof navigator !== 'undefined' && 'share' in navigator && (
                            <Button
                                onClick={handleShare}
                                variant="outline"
                                className="flex-1 border-gray-300 dark:border-slate-700"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Chia sẻ
                            </Button>
                        )}

                        <Button
                            onClick={() => window.open(shareableLink, '_blank')}
                            variant="outline"
                            size="icon"
                            className="border-gray-300 dark:border-slate-700"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="text-center">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        Đóng
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
