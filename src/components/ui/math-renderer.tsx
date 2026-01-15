"use client"

import { useEffect, useRef, useState } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

interface MathRendererProps {
    content: string
    className?: string
}

// Render LaTeX math formulas in text
// Supports inline math: $formula$ and display math: $$formula$$
export function MathRenderer({ content, className = "" }: MathRendererProps) {
    const [renderedHtml, setRenderedHtml] = useState("")

    useEffect(() => {
        let html = content

        // Replace display math $$...$$ first
        html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
            try {
                return katex.renderToString(formula.trim(), {
                    displayMode: true,
                    throwOnError: false
                })
            } catch {
                return `$$${formula}$$`
            }
        })

        // Replace inline math $...$
        html = html.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
            try {
                return katex.renderToString(formula.trim(), {
                    displayMode: false,
                    throwOnError: false
                })
            } catch {
                return `$${formula}$`
            }
        })

        setRenderedHtml(html)
    }, [content])

    return (
        <span
            className={className}
            dangerouslySetInnerHTML={{ __html: renderedHtml || content }}
        />
    )
}
