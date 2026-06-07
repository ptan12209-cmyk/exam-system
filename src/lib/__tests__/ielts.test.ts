/// <reference types="jest" />
import { correctCountToBand } from '../ielts'

describe('correctCountToBand - Reading & Listening Band Conversions', () => {
  // Test Reading conversions
  test('40 correct = Band 9.0 (Reading)', () => {
    expect(correctCountToBand(40, 'reading')).toBe(9.0)
  })

  test('30 correct = Band 7.0 (Reading)', () => {
    expect(correctCountToBand(30, 'reading')).toBe(7.0)
  })

  test('19 correct = Band 5.5 (Reading)', () => {
    expect(correctCountToBand(19, 'reading')).toBe(5.5)
  })

  test('0 correct = Band 0.0 (Reading)', () => {
    expect(correctCountToBand(0, 'reading')).toBe(0.0)
  })

  test('negative input = Band 0.0 (Reading)', () => {
    expect(correctCountToBand(-5, 'reading')).toBe(0.0)
  })

  test('input > 40 = Band 9.0 (Reading)', () => {
    expect(correctCountToBand(50, 'reading')).toBe(9.0)
  })

  // Test Listening conversions (IDP Chuẩn)
  test('39-40 correct = Band 9.0 (Listening)', () => {
    expect(correctCountToBand(40, 'listening')).toBe(9.0)
    expect(correctCountToBand(39, 'listening')).toBe(9.0)
  })

  test('37-38 correct = Band 8.5 (Listening)', () => {
    expect(correctCountToBand(38, 'listening')).toBe(8.5)
    expect(correctCountToBand(37, 'listening')).toBe(8.5)
  })

  test('32-34 correct = Band 7.5 (Listening)', () => {
    expect(correctCountToBand(34, 'listening')).toBe(7.5)
    expect(correctCountToBand(33, 'listening')).toBe(7.5)
    expect(correctCountToBand(32, 'listening')).toBe(7.5)
  })

  test('30-31 correct = Band 7.0 (Listening)', () => {
    expect(correctCountToBand(31, 'listening')).toBe(7.0)
    expect(correctCountToBand(30, 'listening')).toBe(7.0)
  })

  test('26-29 correct = Band 6.5 (Listening)', () => {
    expect(correctCountToBand(29, 'listening')).toBe(6.5)
    expect(correctCountToBand(28, 'listening')).toBe(6.5)
    expect(correctCountToBand(27, 'listening')).toBe(6.5)
    expect(correctCountToBand(26, 'listening')).toBe(6.5)
  })

  test('0 correct = Band 0.0 (Listening)', () => {
    expect(correctCountToBand(0, 'listening')).toBe(0.0)
  })

  // Boundary check helper tests for Reading
  test.each([
    [39, 9.0], [38, 8.5], [35, 8.0], [33, 7.5],
    [30, 7.0], [27, 6.5], [23, 6.0], [19, 5.5],
    [15, 5.0], [12, 4.5], [8, 4.0], [5, 3.5],
    [4, 3.0], [3, 2.5], [2, 2.0], [1, 1.0],
  ])('%i correct = Band %s (Reading)', (correct: number, expected: number) => {
    expect(correctCountToBand(correct, 'reading')).toBe(expected)
  })
})
