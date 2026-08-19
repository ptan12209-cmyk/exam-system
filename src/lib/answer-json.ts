import { z } from "zod"
import type { MCAnswer, SAAnswer, TFAnswer } from "@/types/exam"

const multipleChoiceSchema = z.object({
  question: z.number().int().positive(),
  answer: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(["A", "B", "C", "D"])),
}).strict()

const trueFalseSchema = z.object({
  question: z.number().int().positive(),
  a: z.boolean(),
  b: z.boolean(),
  c: z.boolean(),
  d: z.boolean(),
}).strict()

const shortAnswerSchema = z.object({
  question: z.number().int().positive(),
  answer: z
    .union([z.string().trim().min(1), z.number().finite()])
    .transform(String),
}).strict()

const answerDocumentSchema = z.object({
  multiple_choice: z.array(multipleChoiceSchema).max(500).default([]),
  true_false: z.array(trueFalseSchema).max(500).default([]),
  short_answer: z.array(shortAnswerSchema).max(500).default([]),
}).strict()

export interface ParsedAnswerJson {
  multipleChoice: MCAnswer[]
  trueFalse: TFAnswer[]
  shortAnswer: SAAnswer[]
}

export const ANSWER_JSON_SAMPLE = JSON.stringify(
  {
    multiple_choice: [
      { question: 1, answer: "A" },
      { question: 2, answer: "C" },
    ],
    true_false: [
      { question: 1, a: true, b: false, c: true, d: false },
    ],
    short_answer: [
      { question: 1, answer: "42" },
      { question: 2, answer: "-1.5" },
    ],
  },
  null,
  2
)

function formatIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  const path = issue.path.length ? issue.path.join(".") : "JSON"
  return `${path}: ${issue.message}`
}

function assertSequentialGroup(questions: number[], groupName: string): void {
  if (questions.length === 0) return
  const start = questions[0]
  const expected = Array.from({ length: questions.length }, (_, index) => start + index)
  const invalidIndex = questions.findIndex((question, index) => question !== expected[index])

  if (invalidIndex !== -1) {
    throw new Error(
      `Số câu trong phần ${groupName} phải liên tục tăng dần (bắt đầu từ câu ${start}). Vị trí ${invalidIndex + 1} phải là câu ${expected[invalidIndex]}, hiện đang là câu ${questions[invalidIndex]}.`
    )
  }
}

export function parseAnswerJson(input: string): ParsedAnswerJson {
  let raw: unknown
  try {
    raw = JSON.parse(input)
  } catch {
    throw new Error("JSON không hợp lệ. Hãy kiểm tra dấu ngoặc, dấu phẩy và dấu ngoặc kép.")
  }

  const parsed = answerDocumentSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(formatIssue(parsed.error))
  }

  const { multiple_choice, true_false, short_answer } = parsed.data
  const total = multiple_choice.length + true_false.length + short_answer.length
  if (total === 0) {
    throw new Error("JSON phải có ít nhất một đáp án.")
  }

  assertSequentialGroup(
    multiple_choice.map((item) => item.question),
    "trắc nghiệm"
  )
  assertSequentialGroup(
    true_false.map((item) => item.question),
    "đúng/sai"
  )
  assertSequentialGroup(
    short_answer.map((item) => item.question),
    "trả lời ngắn"
  )

  return {
    multipleChoice: multiple_choice,
    trueFalse: true_false,
    shortAnswer: short_answer.map((item) => ({
      ...item,
      answer: item.answer.trim(),
    })),
  }
}
