"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js", { updateViaCache: "none" })
                .then((registration) => {
                    console.log("SW registered:", registration.scope)
                    // No auto-reload: the browser checks for SW updates on
                    // navigations; hashed build assets are content-addressed.
                })
                .catch((error) => {
                    console.log("SW registration failed:", error)
                })
        }
    }, [])

    return null
}
