"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js", { updateViaCache: "none" })
                .then((registration) => {
                    console.log("SW registered:", registration.scope)

                    // Force check for SW updates immediately
                    registration.update()

                    // Auto-update when new SW is found
                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing
                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (newWorker.state === "activated") {
                                    console.log("New SW activated, reloading for fresh content...")
                                    window.location.reload()
                                }
                            })
                        }
                    })
                })
                .catch((error) => {
                    console.log("SW registration failed:", error)
                })
        }
    }, [])

    return null
}
