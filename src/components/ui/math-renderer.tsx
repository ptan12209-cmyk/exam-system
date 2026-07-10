"use client"

import { useMemo } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

interface MathRendererProps {
    content: string
    className?: string
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

/**
 * Render LaTeX safely:
 * 1. Extract math segments → KaTeX HTML
 * 2. Escape remaining text (prevent XSS via dangerouslySetInnerHTML)
 * 3. Re-insert KaTeX output
 */
function renderMathContent(content: string): string {
    if (!content) return ""

    const displayBlocks: string[] = []
    const inlineBlocks: string[] = []

    let working = content

    working = working.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula: string) => {
        const idx = displayBlocks.length
        try {
            displayBlocks.push(
                katex.renderToString(formula.trim(), {
                    displayMode: true,
                    throwOnError: false,
                    strict: "ignore",
                })
            )
        } catch {
            displayBlocks.push(escapeHtml(`$$${formula}$$`))
        }
        return `\u0000D${idx}\u0000`
    })

    working = working.replace(/\$([^$\n]+?)\$/g, (_, formula: string) => {
        const idx = inlineBlocks.length
        try {
            inlineBlocks.push(
                katex.renderToString(formula.trim(), {
                    displayMode: false,
                    throwOnError: false,
                    strict: "ignore",
                })
            )
        } catch {
            inlineBlocks.push(escapeHtml(`$${formula}$`))
        }
        return `\u0000I${idx}\u0000`
    })

    // Escape non-math text so raw HTML in content cannot execute
    let html = escapeHtml(working)

    html = html.replace(/\u0000D(\d+)\u0000/g, (_, i: string) => displayBlocks[Number(i)] ?? "")
    html = html.replace(/\u0000I(\d+)\u0000/g, (_, i: string) => inlineBlocks[Number(i)] ?? "")

    return html
}

// Supports inline math: $formula$ and display math: $$formula$$
export function MathRenderer({ content, className = "" }: MathRendererProps) {
    const renderedHtml = useMemo(() => renderMathContent(content || ""), [content])

    return (
        <span
            className={className}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
    )
}
