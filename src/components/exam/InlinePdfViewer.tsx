"use client"

import { useState, useCallback, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, X, FileText, ExternalLink, RefreshCw, Layout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Set worker source locally to avoid cross-origin / CSP issues
if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
}

interface InlinePdfViewerProps {
    url: string
    className?: string
    /** If true, renders as full overlay modal */
    modal?: boolean
    onClose?: () => void
}

export function InlinePdfViewer({ url, className, modal = false, onClose }: InlinePdfViewerProps) {
    const [numPages, setNumPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [useIframe, setUseIframe] = useState(false)

    // Reset state on url change
    useEffect(() => {
        setLoading(true)
        setError(null)
        setCurrentPage(1)
    }, [url])

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages)
        setLoading(false)
        setError(null)
    }, [])

    const onDocumentLoadError = useCallback((err: Error) => {
        console.error("PDF load error:", err)
        setError("Không thể tải file PDF bằng Canvas renderer")
        setLoading(false)
    }, [])

    const content = (
        <div className={cn("flex flex-col h-full bg-[var(--os-card)] border border-[var(--os-border)] rounded-2xl overflow-hidden shadow-sm", className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-[var(--os-card)] border-b border-[var(--os-border)] text-[var(--os-fg)]">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--os-accent)]" />
                    <span className="text-xs font-semibold">
                        {useIframe ? "Trình xem nhúng" : `Trang ${currentPage}/${numPages || "..."}`}
                    </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                    {!useIframe && (
                        <>
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 rounded-lg text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)]"
                                onClick={() => setScale(s => Math.max(0.5, Number((s - 0.15).toFixed(2))))}
                                disabled={scale <= 0.5}
                                title="Thu nhỏ"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-[var(--os-muted)] font-mono w-11 text-center">{Math.round(scale * 100)}%</span>
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 rounded-lg text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)]"
                                onClick={() => setScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
                                disabled={scale >= 2.5}
                                title="Phóng to"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                        </>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)]"
                        onClick={() => setUseIframe(!useIframe)}
                        title="Đổi chế độ xem"
                    >
                        <Layout className="w-3.5 h-3.5 mr-1" />
                        {useIframe ? "Canvas" : "Trực tiếp"}
                    </Button>

                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)] transition-colors"
                        title="Mở tab mới"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {modal && onClose && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-[var(--os-muted)] ml-1" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* PDF Content Area */}
            <div className="flex-1 overflow-auto bg-[var(--os-bg)]/60 flex justify-center items-start relative min-h-[350px]">
                {useIframe ? (
                    <iframe
                        src={url}
                        className="w-full h-full min-h-[500px] border-0 rounded-b-2xl bg-white dark:bg-slate-950"
                        title="Tài liệu đề thi"
                    />
                ) : (
                    <>
                        {loading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--os-bg)]/80 backdrop-blur-sm gap-2">
                                <Loader2 className="w-7 h-7 animate-spin text-[var(--os-accent)]" />
                                <span className="text-xs text-[var(--os-muted)] font-mono">Đang tải đề thi PDF...</span>
                            </div>
                        )}

                        {error ? (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                                <FileText className="w-12 h-12 mb-3 text-rose-500 opacity-80" />
                                <p className="text-sm font-semibold text-[var(--os-fg)] mb-1">{error}</p>
                                <p className="text-xs text-[var(--os-muted)] mb-4 max-w-sm">
                                    Bạn có thể chuyển sang chế độ xem nhúng của trình duyệt để tiếp tục xem đề.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setError(null); setLoading(true); }}
                                        className="rounded-xl border-[var(--os-border)] text-xs font-semibold"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Thử lại
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setUseIframe(true)}
                                        className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:opacity-90 text-xs font-semibold"
                                    >
                                        <Layout className="w-3.5 h-3.5 mr-1.5" /> Xem qua trình duyệt
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Document
                                file={url}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={onDocumentLoadError}
                                loading=""
                                className="py-4 max-w-full"
                            >
                                <Page
                                    pageNumber={currentPage}
                                    scale={scale}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="shadow-md rounded-xl overflow-hidden mx-auto border border-[var(--os-border)]"
                                />
                            </Document>
                        )}
                    </>
                )}
            </div>

            {/* Page navigation (only in Canvas mode) */}
            {!useIframe && numPages > 1 && !error && (
                <div className="flex items-center justify-center gap-4 p-3 bg-[var(--os-card)] border-t border-[var(--os-border)]">
                    <Button
                        variant="outline" size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="border-[var(--os-border)] text-[var(--os-muted)] hover:text-[var(--os-fg)] h-8 rounded-xl"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Trước
                    </Button>
                    
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: Math.min(numPages, 7) }, (_, i) => {
                            let page: number
                            if (numPages <= 7) page = i + 1
                            else if (currentPage <= 4) page = i + 1
                            else if (currentPage >= numPages - 3) page = numPages - 6 + i
                            else page = currentPage - 3 + i

                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={cn(
                                        "w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all",
                                        currentPage === page
                                            ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] shadow-sm"
                                            : "border border-[var(--os-border)] text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:border-[var(--os-accent)]"
                                    )}
                                >
                                    {page}
                                </button>
                            )
                        })}
                    </div>

                    <Button
                        variant="outline" size="sm"
                        onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                        disabled={currentPage >= numPages}
                        className="border-[var(--os-border)] text-[var(--os-muted)] hover:text-[var(--os-fg)] h-8 rounded-xl"
                    >
                        Sau <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    )

    if (modal) {
        return (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col">
                    {content}
                </div>
            </div>
        )
    }

    return content
}
