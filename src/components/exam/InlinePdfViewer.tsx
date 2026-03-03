"use client"

import { useState, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

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

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages)
        setLoading(false)
    }, [])

    const onDocumentLoadError = useCallback((err: Error) => {
        console.error("PDF load error:", err)
        setError("Không thể tải file PDF")
        setLoading(false)
    }, [])

    const content = (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-card border-b border-border/50">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-foreground">
                        Trang {currentPage}/{numPages || "..."}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                        disabled={scale <= 0.5}
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
                    <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                        disabled={scale >= 2.5}
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    {modal && onClose && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground ml-2" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-muted/10 flex justify-center">
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                )}
                {error && (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <FileText className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading=""
                    className="py-4"
                >
                    <Page
                        pageNumber={currentPage}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="shadow-lg rounded-lg overflow-hidden mx-auto"
                    />
                </Document>
            </div>

            {/* Page navigation */}
            {numPages > 1 && (
                <div className="flex items-center justify-center gap-4 p-3 bg-card border-t border-border/50">
                    <Button
                        variant="outline" size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="border-border text-muted-foreground h-8"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
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
                                        "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
                                        currentPage === page
                                            ? "bg-indigo-600 text-white"
                                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
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
                        className="border-border text-muted-foreground h-8"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    )

    if (modal) {
        return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-3xl h-[90vh] glass-card rounded-2xl overflow-hidden flex flex-col">
                    {content}
                </div>
            </div>
        )
    }

    return content
}
