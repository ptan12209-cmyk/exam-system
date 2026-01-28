'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2 } from 'lucide-react'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface PDFViewerProps {
    url: string
    page: number
    className?: string
}

export function PDFViewer({ url, page, className = '' }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [scale, setScale] = useState(1.0)

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        setLoading(false)
    }

    function onDocumentLoadError(error: Error) {
        console.error('PDF load error:', error)
        setError('Không thể tải PDF. Vui lòng thử lại.')
        setLoading(false)
    }

    // Auto-adjust scale based on container width
    function onPageLoadSuccess() {
        const container = document.querySelector('.pdf-container')
        if (container) {
            const containerWidth = container.clientWidth
            const optimalScale = containerWidth / 600 // Assuming PDF is ~600px wide at scale 1
            setScale(Math.min(optimalScale, 1.5)) // Max scale 1.5
        }
    }

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${className}`}>
                <div className="text-red-500 text-center">
                    <p className="font-semibold mb-2">❌ {error}</p>
                    <p className="text-sm text-gray-500">Vui lòng thử tải lại trang</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`pdf-container flex flex-col items-center h-full overflow-auto ${className}`}>
            {loading && (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            )}

            <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                }
                className="w-full"
            >
                <Page
                    pageNumber={page}
                    scale={scale}
                    onLoadSuccess={onPageLoadSuccess}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="mx-auto"
                    loading={
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    }
                />
            </Document>

            {!loading && numPages > 0 && (
                <div className="text-xs text-gray-500 mt-2 pb-2">
                    Trang {page} / {numPages}
                </div>
            )}
        </div>
    )
}
