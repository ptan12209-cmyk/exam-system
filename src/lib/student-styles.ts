/**
 * Centralized style constants for student pages
 * Student theme is more playful/colorful compared to teacher theme
 */

export const STUDENT_STYLES = {
    page: {
        background: "bg-gray-100 dark:bg-slate-950",
        padding: "p-4 md:p-8",
        container: "max-w-7xl mx-auto"
    },
    card: {
        base: "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-xl",
        hover: "hover:shadow-md transition-all",
        padding: "p-4 md:p-6",
        header: "border-b border-gray-100 dark:border-slate-800"
    },
    text: {
        heading: "text-2xl font-bold text-gray-900 dark:text-white",
        subheading: "text-gray-500 dark:text-gray-400 text-sm",
        body: "text-gray-600 dark:text-gray-300",
        label: "text-gray-700 dark:text-gray-300 font-medium",
        muted: "text-gray-500 dark:text-gray-400"
    },
    button: {
        primary: "bg-blue-600 hover:bg-blue-700 text-white",
        secondary: "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700",
        success: "bg-green-600 hover:bg-green-700 text-white",
        warning: "bg-yellow-600 hover:bg-yellow-700 text-white",
        ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
    },
    input: {
        base: "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    },
    sidebar: {
        width: "w-64",
        bg: "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800"
    },
    navbar: {
        height: "h-16",
        bg: "bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800"
    }
} as const

/**
 * Color palettes for student statistics
 * More vibrant than teacher colors
 */
export const STUDENT_STAT_COLORS = {
    xp: {
        icon: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-100 dark:bg-purple-900/30",
        border: "border-purple-100 dark:border-purple-900"
    },
    exams: {
        icon: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/30",
        border: "border-blue-100 dark:border-blue-900"
    },
    completed: {
        icon: "text-green-600 dark:text-green-400",
        bg: "bg-green-100 dark:bg-green-900/30",
        border: "border-green-100 dark:border-green-900"
    },
    score: {
        icon: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        border: "border-yellow-100 dark:border-yellow-900"
    },
    streak: {
        icon: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-100 dark:bg-orange-900/30",
        border: "border-orange-100 dark:border-orange-900"
    },
    achievement: {
        icon: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-100 dark:border-amber-900"
    },
    level: {
        icon: "text-indigo-600 dark:text-indigo-400",
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        border: "border-indigo-100 dark:border-indigo-900"
    }
} as const

/**
 * Gradient styles for student UI elements
 */
export const STUDENT_GRADIENTS = {
    primary: "bg-gradient-to-r from-blue-600 to-purple-600",
    success: "bg-gradient-to-r from-green-500 to-emerald-500",
    warning: "bg-gradient-to-r from-yellow-500 to-orange-500",
    danger: "bg-gradient-to-r from-red-500 to-pink-500",
    arena: "bg-gradient-to-r from-purple-500 to-indigo-500",
    achievement: "bg-gradient-to-r from-yellow-500 to-orange-500"
} as const
