/// <reference types="jest" />
import { calculateNextReview } from '../spaced-repetition'

describe('spaced-repetition - SM-2 Scheduling Algorithm', () => {
  test('Quality < 3 resets repetitions and sets interval to 1 day', () => {
    const card = { ease_factor: 2.5, interval_days: 10, repetitions: 3 }
    const result = calculateNextReview(card, 2) // quality = 2 (forgotten)

    expect(result.repetitions).toBe(0)
    expect(result.interval_days).toBe(1)
    expect(result.ease_factor).toBe(2.5) // ease factor remains unchanged
    
    // next_review_date should be approximately 1 day in the future
    const expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() + 1)
    const resultDate = new Date(result.next_review_date)
    
    expect(resultDate.getDate()).toBe(expectedDate.getDate())
  })

  test('Quality >= 3 (correct response) on first repetition sets interval to 1 day', () => {
    const card = { ease_factor: 2.5, interval_days: 0, repetitions: 0 }
    const result = calculateNextReview(card, 4) // quality = 4

    expect(result.repetitions).toBe(1)
    expect(result.interval_days).toBe(1)
    
    // ease factor increases/decreases slightly based on quality
    expect(result.ease_factor).toBeGreaterThan(0)
  })

  test('Quality >= 3 (correct response) on second repetition sets interval to 6 days', () => {
    const card = { ease_factor: 2.5, interval_days: 1, repetitions: 1 }
    const result = calculateNextReview(card, 5) // quality = 5 (perfect)

    expect(result.repetitions).toBe(2)
    expect(result.interval_days).toBe(6)
    
    // For quality 5, ease factor increases
    expect(result.ease_factor).toBe(2.6) // 2.5 + 0.1
  })

  test('Quality >= 3 (correct response) on subsequent repetitions scales interval by ease factor', () => {
    const card = { ease_factor: 2.0, interval_days: 6, repetitions: 2 }
    const result = calculateNextReview(card, 4) // quality = 4

    expect(result.repetitions).toBe(3)
    // interval = Math.round(6 * 2.0) = 12
    expect(result.interval_days).toBe(12)
  })

  test('Ease factor does not drop below 1.3', () => {
    const card = { ease_factor: 1.35, interval_days: 5, repetitions: 2 }
    const result = calculateNextReview(card, 0) // quality = 0 (complete blackout)
    
    // when quality < 3, repetitions resets to 0 and interval is 1. Ease factor is unchanged.
    expect(result.ease_factor).toBe(1.35)

    // Let's test low quality correct response (quality = 3) which decreases ease factor
    const cardCorrect = { ease_factor: 1.35, interval_days: 5, repetitions: 2 }
    const resultCorrect = calculateNextReview(cardCorrect, 3) // quality = 3
    expect(resultCorrect.ease_factor).toBe(1.3) // 1.35 - 0.14 = 1.21, but capped to 1.3
  })
})
