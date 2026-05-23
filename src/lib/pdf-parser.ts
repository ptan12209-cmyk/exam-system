export interface ParsedAnswers {
  multiple_choice?: string[];
  true_false?: { a?: boolean; b?: boolean; c?: boolean; d?: boolean }[];
  short_answer?: { answer: number | string }[];
}

export async function parsePdfAnswers(file: File): Promise<ParsedAnswers> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/worker/extract-answers", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({} as { detail?: string }));
      throw new Error(errorData.detail || "Không thể parse PDF");
    }
    const data = await response.json();
    return {
      multiple_choice: Array.isArray(data.multiple_choice) ? data.multiple_choice : [],
      true_false: Array.isArray(data.true_false) ? data.true_false : [],
      short_answer: Array.isArray(data.short_answer) ? data.short_answer : [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
