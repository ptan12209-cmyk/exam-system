/**
 * ExamHub AI Engine — pooled LLM access with automatic failover.
 *
 * Providers (all OpenAI-compatible wire format):
 *  1. OpenRouter  — free-tier text model (default: google/gemma-4-26b-a4b-it)
 *  2. Google AI Studio — Gemini (text + vision), doubles as failover pool
 *
 * Keys live server-side only. Never import this file from client components.
 */

export type AiRole = "system" | "user" | "assistant"

export interface AiMessage {
    role: AiRole
    content: string | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
    >
}

interface ProviderConfig {
    id: string
    baseUrl: string
    apiKey: string | undefined
    model: string
    supportsVision: boolean
}

function getProviders(): ProviderConfig[] {
    const providers: ProviderConfig[] = []

    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (openrouterKey) {
        providers.push({
            id: "openrouter",
            baseUrl: "https://openrouter.ai/api/v1",
            apiKey: openrouterKey,
            model: process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it",
            // Free gemma text model — enable vision here too if the model
            // supports images by setting OPENROUTER_VISION=1.
            supportsVision: process.env.OPENROUTER_VISION === "1",
        })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
        providers.push({
            id: "aistudio",
            // Google AI Studio exposes an OpenAI-compatible endpoint.
            baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
            apiKey: geminiKey,
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
            supportsVision: true,
        })
    }

    return providers
}

export function aiEngineConfigured(): boolean {
    return getProviders().length > 0
}

export class AiEngineError extends Error {
    constructor(
        message: string,
        public readonly statusCode = 502,
        public readonly code = "AI_ENGINE_ERROR"
    ) {
        super(message)
    }
}

export interface ChatOptions {
    messages: AiMessage[]
    /** Prefer vision-capable providers (image inputs present). */
    needsVision?: boolean
    temperature?: number
    maxTokens?: number
    timeoutMs?: number
}

export interface ChatResult {
    text: string
    providerId: string
    model: string
}

/**
 * Run a chat completion through the provider pool. On failure (rate limit,
 * 5xx, timeout) the next provider is tried; the last error is rethrown.
 */
export async function chat(options: ChatOptions): Promise<ChatResult> {
    const providers = getProviders()
    if (providers.length === 0) {
        throw new AiEngineError(
            "AI Engine chưa được cấu hình. Thêm OPENROUTER_API_KEY hoặc GEMINI_API_KEY.",
            503,
            "AI_NOT_CONFIGURED"
        )
    }

    const needsVision = options.needsVision ||
        options.messages.some((m) => Array.isArray(m.content))

    const candidates = needsVision
        ? providers.filter((p) => p.supportsVision)
        : providers
    const pool = candidates.length > 0 ? candidates : providers

    let lastError: unknown = null
    for (const provider of pool) {
        try {
            const res = await fetch(`${provider.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${provider.apiKey}`,
                    "Content-Type": "application/json",
                    // Optional attribution headers for OpenRouter
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://examhub.app",
                    "X-Title": "ExamHub AI Engine",
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages: options.messages,
                    temperature: options.temperature ?? 0.4,
                    max_tokens: options.maxTokens ?? 4096,
                }),
                signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
            })

            if (!res.ok) {
                const bodyText = await res.text().catch(() => "")
                lastError = new Error(`[${provider.id}] HTTP ${res.status}: ${bodyText.slice(0, 300)}`)
                // 429/5xx → try next provider in the pool
                continue
            }

            const data = (await res.json()) as {
                choices?: { message?: { content?: string } }[]
            }
            const text = data.choices?.[0]?.message?.content ?? ""
            if (!text.trim()) {
                lastError = new Error(`[${provider.id}] empty completion`)
                continue
            }
            return { text, providerId: provider.id, model: provider.model }
        } catch (err) {
            lastError = err
            continue
        }
    }

    throw new AiEngineError(
        `Tất cả nhà cung cấp AI đều lỗi. Lỗi cuối: ${lastError instanceof Error ? lastError.message : "không rõ"}`,
        502,
        "AI_POOL_EXHAUSTED"
    )
}
