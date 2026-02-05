'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// Cloudflare Turnstile Site Key - Get from https://dash.cloudflare.com/turnstile
// For development, use the test key: 1x00000000000000000000AA (always passes)
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: TurnstileOptions) => string
            reset: (widgetId: string) => void
            remove: (widgetId: string) => void
        }
        onloadTurnstileCallback?: () => void
    }
}

interface TurnstileOptions {
    sitekey: string
    callback: (token: string) => void
    'error-callback'?: () => void
    'expired-callback'?: () => void
    theme?: 'light' | 'dark' | 'auto'
    size?: 'normal' | 'compact'
}

interface CaptchaProps {
    onVerify: (token: string) => void
    onError?: () => void
    onExpire?: () => void
    theme?: 'light' | 'dark' | 'auto'
    className?: string
}

export function Captcha({ onVerify, onError, onExpire, theme = 'auto', className }: CaptchaProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState(false)

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile) return

        // Clear any existing widget
        if (widgetIdRef.current) {
            try {
                window.turnstile.remove(widgetIdRef.current)
            } catch (e) {
                // Widget might already be removed
            }
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => {
                onVerify(token)
            },
            'error-callback': () => {
                setError(true)
                onError?.()
            },
            'expired-callback': () => {
                onExpire?.()
            },
            theme
        })
    }, [onVerify, onError, onExpire, theme])

    useEffect(() => {
        // Load Turnstile script
        if (typeof window !== 'undefined' && !window.turnstile) {
            const script = document.createElement('script')
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback'
            script.async = true
            script.defer = true

            window.onloadTurnstileCallback = () => {
                setLoaded(true)
            }

            document.head.appendChild(script)

            return () => {
                document.head.removeChild(script)
                delete window.onloadTurnstileCallback
            }
        } else if (window.turnstile) {
            setLoaded(true)
        }
    }, [])

    useEffect(() => {
        if (loaded) {
            renderWidget()
        }
    }, [loaded, renderWidget])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current)
                } catch (e) {
                    // Widget might already be removed
                }
            }
        }
    }, [])

    if (error) {
        return (
            <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center ${className}`}>
                <p className="text-red-600 dark:text-red-400 text-sm">
                    Failed to load CAPTCHA. Please refresh the page.
                </p>
            </div>
        )
    }

    return (
        <div className={className}>
            <div ref={containerRef} className="flex justify-center" />
            {!loaded && (
                <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    )
}

/**
 * Hook to manage CAPTCHA state in forms
 */
export function useCaptcha() {
    const [token, setToken] = useState<string | null>(null)
    const [verified, setVerified] = useState(false)

    const onVerify = useCallback((newToken: string) => {
        setToken(newToken)
        setVerified(true)
    }, [])

    const onExpire = useCallback(() => {
        setToken(null)
        setVerified(false)
    }, [])

    const reset = useCallback(() => {
        setToken(null)
        setVerified(false)
    }, [])

    return {
        token,
        verified,
        onVerify,
        onExpire,
        reset
    }
}

/**
 * Server-side token verification
 * Call this in your API route to verify the CAPTCHA token
 */
export async function verifyCaptchaToken(token: string): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY

    if (!secretKey) {
        console.warn('TURNSTILE_SECRET_KEY not set, skipping verification')
        return true // Skip verification in development
    }

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret: secretKey,
                response: token
            })
        })

        const data = await response.json()
        return data.success === true
    } catch (error) {
        console.error('CAPTCHA verification failed:', error)
        return false
    }
}
