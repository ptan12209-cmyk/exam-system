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

  it("rejects gaps and duplicate question numbers within a group", () => {
    expect(() => parseAnswerJson(JSON.stringify({
      multiple_choice: [{ question: 1, answer: "A" }, { question: 3, answer: "B" }],
      true_false: [],
      short_answer: [],
    }))).toThrow("phải là câu 2")

    expect(() => parseAnswerJson(JSON.stringify({
      multiple_choice: [],
      true_false: [{ question: 2, a: true, b: true, c: false, d: false }],
      short_answer: [],
    }))).toThrow("phải là câu 1")
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
