'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface PDFViewerProps {
    url: string
    page: number
    className?: string
}

export function PDFViewer({ url, page, className = '' }: PDFViewerProps) {
    const [loading, setLoading] = useState(true)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // Detect mobile
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
        setLoading(false)
    }, [])

    // For mobile: Use Google Docs Viewer (works everywhere)
    if (isMobile) {
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`

        return (
            <div className={`relative w-full h-full ${className}`}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                )}
                <iframe
                    src={googleDocsUrl}
                    className="w-full h-full border-0"
                    title="PDF Viewer"
                    onLoad={() => setLoading(false)}
                />
            </div>
        )
    }

    // For desktop: Use object tag with fallback
    const pdfUrl = `${url}#page=${page}`

    return (
        <div className={`relative w-full h-full ${className}`}>
            <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full"
            >
                <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title="PDF Viewer"
                />
            </object>
        </div>
    )
}
