/// <reference types="jest" />
import { formatTime, getScoreColor, getScoreMessage } from '../score-utils'

describe('score-utils - Helper functions for exam scores', () => {
  describe('formatTime', () => {
    test('converts 0 seconds to 0:00', () => {
      expect(formatTime(0)).toBe('0:00')
    })

    test('converts 65 seconds to 1:05', () => {
      expect(formatTime(65)).toBe('1:05')
    })

    test('converts 3600 seconds to 60:00', () => {
      expect(formatTime(3600)).toBe('60:00')
    })

    test('converts 125 seconds to 2:05', () => {
      expect(formatTime(125)).toBe('2:05')
    })
  })

  describe('getScoreColor', () => {
    test('returns emerald color for score >= 8', () => {
      expect(getScoreColor(8)).toBe('text-emerald-600 dark:text-emerald-400')
      expect(getScoreColor(9.5)).toBe('text-emerald-600 dark:text-emerald-400')
    })

    test('returns indigo color for score between 6.5 and 7.9', () => {
      expect(getScoreColor(6.5)).toBe('text-indigo-600 dark:text-indigo-400')
      expect(getScoreColor(7.9)).toBe('text-indigo-600 dark:text-indigo-400')
    })

    test('returns amber color for score between 5.0 and 6.4', () => {
      expect(getScoreColor(5.0)).toBe('text-amber-600 dark:text-amber-400')
      expect(getScoreColor(6.0)).toBe('text-amber-600 dark:text-amber-400')
    })

    test('returns red color for score < 5', () => {
      expect(getScoreColor(4.9)).toBe('text-red-600 dark:text-red-400')
      expect(getScoreColor(0)).toBe('text-red-600 dark:text-red-400')
    })
  })

  describe('getScoreMessage', () => {
    test('returns excellent message for score >= 8', () => {
      expect(getScoreMessage(8)).toBe('Làm tốt lắm')
    })

    test('returns good message for score >= 6.5', () => {
      expect(getScoreMessage(7)).toBe('Khá tốt')
    })

    test('returns passing message for score >= 5', () => {
      expect(getScoreMessage(5.5)).toBe('Đạt yêu cầu')
    })

    test('returns support message for score < 5', () => {
      expect(getScoreMessage(4.5)).toBe('Cần cố gắng thêm')
    })
  })
})
