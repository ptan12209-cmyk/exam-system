/**
 * Centralized style constants for teacher pages
 * Use these to ensure consistency across all teacher interfaces
 */

export const TEACHER_STYLES = {
    page: {
        background: "bg-gray-50 dark:bg-slate-900",
        padding: "p-4 md:p-8",
        container: "max-w-7xl mx-auto"
    },
    card: {
        base: "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm",
        hover: "hover:shadow-md transition-shadow",
        padding: "p-6",
        header: "border-b border-gray-100 dark:border-slate-800"
    },
    text: {
        heading: "text-2xl font-bold text-gray-800 dark:text-white",
        subheading: "text-gray-500 dark:text-gray-400 text-sm",
        body: "text-gray-600 dark:text-gray-300",
        label: "text-gray-700 dark:text-gray-300 font-medium",
        muted: "text-gray-500 dark:text-gray-400"
    },
    button: {
        primary: "bg-blue-600 hover:bg-blue-700 text-white",
        secondary: "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700",
        danger: "bg-red-600 hover:bg-red-700 text-white",
        ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
    },
    input: {
        base: "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    },
    spacing: {
        sectionGap: "gap-6",
        cardGap: "gap-4",
        elementGap: "gap-2"
    },
    grid: {
        stats: "grid grid-cols-2 md:grid-cols-4 gap-4",
        cards: "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
    }
} as const

/**
 * Color palettes for different statistics/elements
 */
export const STAT_COLORS = {
    blue: {
        icon: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-100 dark:border-blue-900"
    },
    green: {
        icon: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-900/20",
        border: "border-green-100 dark:border-green-900"
    },
    yellow: {
        icon: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        border: "border-yellow-100 dark:border-yellow-900"
    },
    purple: {
        icon: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900/20",
        border: "border-purple-100 dark:border-purple-900"
    },
    red: {
        icon: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-100 dark:border-red-900"
    },
    orange: {
        icon: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-900/20",
        border: "border-orange-100 dark:border-orange-900"
    }
} as const
