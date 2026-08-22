/**
 * Robust JSON extraction from LLM output — handles markdown fences,
 * prose wrappers and trailing commentary.
 */

export function extractJsonArray(raw: string): unknown[] | null {
    const text = stripFences(raw)
    const start = text.indexOf("[")
    const end = text.lastIndexOf("]")
    if (start === -1 || end === -1 || end <= start) return null
    try {
        const parsed = JSON.parse(text.slice(start, end + 1))
        return Array.isArray(parsed) ? parsed : null
    } catch {
        return null
    }
}

export function extractJsonObject(raw: string): Record<string, unknown> | null {
    const text = stripFences(raw)
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start === -1 || end === -1 || end <= start) return null
    try {
        const parsed = JSON.parse(text.slice(start, end + 1))
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null
    } catch {
        return null
    }
}

function stripFences(text: string): string {
    let out = text.trim()
    if (out.startsWith("```json")) out = out.slice(7)
    else if (out.startsWith("```")) out = out.slice(3)
    if (out.endsWith("```")) out = out.slice(0, -3)
    return out.trim()
}
