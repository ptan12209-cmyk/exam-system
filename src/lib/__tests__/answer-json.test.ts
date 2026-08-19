import { describe, expect, it } from "vitest"
import { ANSWER_JSON_SAMPLE, parseAnswerJson } from "@/lib/answer-json"

describe("parseAnswerJson", () => {
  it("loads all three answer formats", () => {
    const result = parseAnswerJson(ANSWER_JSON_SAMPLE)

    expect(result.multipleChoice).toEqual([
      { question: 1, answer: "A" },
      { question: 2, answer: "C" },
    ])
    expect(result.trueFalse[0]).toEqual({
      question: 1,
      a: true,
      b: false,
      c: true,
      d: false,
    })
    expect(result.shortAnswer.map((item) => item.answer)).toEqual(["42", "-1.5"])
  })

  it("normalizes multiple-choice answers and numeric short answers", () => {
    const result = parseAnswerJson(JSON.stringify({
      multiple_choice: [{ question: 1, answer: " b " }],
      true_false: [],
      short_answer: [{ question: 1, answer: 3.14 }],
    }))

    expect(result.multipleChoice[0].answer).toBe("B")
    expect(result.shortAnswer[0].answer).toBe("3.14")
  })

  it("allows custom starting question numbers for any section", () => {
    const result = parseAnswerJson(JSON.stringify({
      multiple_choice: [{ question: 21, answer: "A" }, { question: 22, answer: "B" }],
      true_false: [{ question: 5, a: true, b: false, c: true, d: false }],
      short_answer: [{ question: 10, answer: "42" }, { question: 11, answer: "99" }],
    }))

    expect(result.multipleChoice).toEqual([
      { question: 21, answer: "A" },
      { question: 22, answer: "B" },
    ])
    expect(result.trueFalse[0].question).toBe(5)
    expect(result.shortAnswer[0].question).toBe(10)
    expect(result.shortAnswer[1].question).toBe(11)
  })

  it("allows non-consecutive and arbitrary question numbers", () => {
    const result = parseAnswerJson(JSON.stringify({
      multiple_choice: [{ question: 2, answer: "A" }, { question: 14, answer: "B" }],
      true_false: [{ question: 99, a: true, b: false, c: true, d: false }],
      short_answer: [{ question: 7, answer: "42" }, { question: 50, answer: "-1.5" }],
    }))

    expect(result.multipleChoice).toEqual([
      { question: 2, answer: "A" },
      { question: 14, answer: "B" },
    ])
    expect(result.trueFalse[0].question).toBe(99)
    expect(result.shortAnswer[0].question).toBe(7)
    expect(result.shortAnswer[1].question).toBe(50)
  })

  it("rejects malformed JSON and invalid options", () => {
    expect(() => parseAnswerJson("{"))
      .toThrow("JSON không hợp lệ")
    expect(() => parseAnswerJson(JSON.stringify({
      multiple_choice: [{ question: 1, answer: "E" }],
      true_false: [],
      short_answer: [],
    }))).toThrow("multiple_choice.0.answer")
  })

  it("rejects blank short answers", () => {
    expect(() => parseAnswerJson(JSON.stringify({
      multiple_choice: [],
      true_false: [],
      short_answer: [{ question: 1, answer: "   " }],
    }))).toThrow("short_answer.0.answer")
  })
})
