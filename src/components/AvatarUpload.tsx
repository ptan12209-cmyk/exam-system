"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface AvatarUploadProps {
    currentUrl?: string | null
    onUploadComplete: (url: string) => void
    onRemove?: () => void
}

export function AvatarUpload({ currentUrl, onUploadComplete, onRemove }: AvatarUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentUrl || null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (file: File) => {
        setError(null)

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("Vui lòng chọn file ảnh")
            return
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError("Kích thước file tối đa 2MB")
            return
        }

        // Show preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Upload to server
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("/api/upload-avatar", {
                method: "POST",
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Upload failed")
            }

            onUploadComplete(data.url)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi khi tải ảnh lên")
            setPreview(currentUrl || null)
        } finally {
            setUploading(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleRemove = async () => {
        if (!onRemove) return

        setUploading(true)
        try {
            const response = await fetch("/api/upload-avatar", {
                method: "DELETE"
            })

            if (!response.ok) {
                throw new Error("Failed to remove avatar")
            }

            setPreview(null)
            onRemove()
        } catch (err) {
            setError("Lỗi khi xóa ảnh")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Avatar Preview */}
            <div
                className={`relative w-32 h-32 rounded-full overflow-hidden border-4 transition-all ${isDragging
                        ? "border-blue-500 border-dashed scale-105"
                        : "border-gray-200 dark:border-slate-700"
                    } ${uploading ? "opacity-50" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {preview ? (
                    <Image
                        src={preview}
                        alt="Avatar"
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <User className="w-16 h-16 text-white" />
                    </div>
                )}

                {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}
            </div>

            {/* Upload Buttons */}
            <div className="flex gap-2">
                <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    Tải ảnh lên
                </Button>

                {preview && onRemove && (
                    <Button
                        type="button"
                        onClick={handleRemove}
                        disabled={uploading}
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Xóa
                    </Button>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                }}
                className="hidden"
            />

            {/* Error message */}
            {error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            {/* Help text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                JPG, PNG, WebP • Tối đa 2MB<br />
                Kéo thả hoặc click để tải lên
            </p>
        </div>
    )
}
