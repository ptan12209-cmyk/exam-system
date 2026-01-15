// Utility function for shuffling arrays with seed
// Uses seeded random for consistent shuffling per student per exam

export function seededRandom(seed: number): () => number {
    return () => {
        seed = seed * 16807 % 2147483647
        return (seed - 1) / 2147483646
    }
}

export function createShuffleSeed(examId: string, studentId: string): number {
    // Create a deterministic seed from exam and student IDs
    // This ensures same student gets same order each time
    const combined = examId + studentId
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash) || 1
}

export interface ShuffleMapping<T> {
    shuffled: T[]
    originalIndices: number[]  // shuffled[i] was originally at originalIndices[i]
    shuffledIndices: number[]  // original[i] is now at shuffledIndices[i]
}

export function shuffleWithMapping<T>(array: T[], seed: number): ShuffleMapping<T> {
    const random = seededRandom(seed)
    const indices = array.map((_, i) => i)

    // Fisher-Yates shuffle on indices
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
            ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }

    const shuffled = indices.map(i => array[i])
    const shuffledIndices = new Array(array.length)
    indices.forEach((originalIndex, newIndex) => {
        shuffledIndices[originalIndex] = newIndex
    })

    return {
        shuffled,
        originalIndices: indices,
        shuffledIndices
    }
}

// Map shuffled answer back to original position
export function mapAnswerToOriginal(
    shuffledAnswers: (string | null)[],
    originalIndices: number[]
): (string | null)[] {
    const original = new Array(shuffledAnswers.length).fill(null)
    shuffledAnswers.forEach((answer, shuffledIndex) => {
        const originalIndex = originalIndices[shuffledIndex]
        original[originalIndex] = answer
    })
    return original
}
