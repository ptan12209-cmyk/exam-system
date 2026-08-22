import { describe, it, expect } from "vitest"
import { extractJsonArray, extractJsonObject } from "../json-utils"

describe("ai json-utils", () => {
  it("extracts a plain JSON array", () => {
    expect(extractJsonArray('[{"a":1}]')).toEqual([{ a: 1 }])
  })

  it("extracts an array wrapped in markdown fences", () => {
    expect(extractJsonArray('```json\n[{"a":1},{"b":2}]\n```')).toHaveLength(2)
  })

  it("extracts an array surrounded by prose", () => {
    expect(extractJsonArray('Đây là kết quả:\n[1, 2, 3]\nHy vọng hữu ích!')).toEqual([1, 2, 3])
  })

  it("returns null when no array present", () => {
    expect(extractJsonArray("không có gì cả")).toBeNull()
  })

  it("returns null for malformed arrays", () => {
    expect(extractJsonArray("[{broken")).toBeNull()
  })

  it("extracts a JSON object", () => {
    const obj = extractJsonObject('Kết quả: {"multiple_choice":[{"question":1,"answer":"A"}]}')
    expect(obj).toHaveProperty("multiple_choice")
  })

  it("object extractor ignores arrays", () => {
    expect(extractJsonObject("[1,2]")).toBeNull()
  })
})
