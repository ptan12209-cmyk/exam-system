"use client"

/**
 * DEPRECATED: This local BottomNav component is now deprecated.
 * Mobile navigation is now handled globally at the root layout level by components/pwa/MobileNav.tsx.
 * Rendering this locally on pages causes duplication/double bottom navigation bars on mobile screen sizes.
 * Returning null to safely prevent duplication across old legacy imports.
 */

export function BottomNav() {
    return null
}

export function TeacherBottomNav() {
    return null
}
