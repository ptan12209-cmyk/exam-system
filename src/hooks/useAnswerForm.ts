"use client";

import { useState } from "react";
import type { Option, TFAnswer, SAAnswer } from "@/types/exam";

/**
 * Hook quản lý trạng thái đáp án cho form tạo bài thi.
 * Cho phép lưu đáp án trắc nghiệm (MC), đúng/sai (TF), tự luận (SA).
 *
 * @param initialMcCount - Số câu hỏi trắc nghiệm ban đầu (mặc định 12).
 * @returns Object chứa các mảng đáp án và các setter tương ứng.
 * @example
 * const { correctAnswers, setCorrectAnswers, mcAnswers, tfAnswers, saAnswers } = useAnswerForm(12);
 */
export function useAnswerForm(initialMcCount: number = 12) {
  const [correctAnswers, setCorrectAnswers] = useState<(Option | null)[]>(Array(initialMcCount).fill(null));
  const [mcAnswers, setMcAnswers] = useState<(Option | null)[]>([]);
  const [tfAnswers, setTfAnswers] = useState<TFAnswer[]>([]);
  const [saAnswers, setSaAnswers] = useState<SAAnswer[]>([]);

  return {
    correctAnswers, setCorrectAnswers,
    mcAnswers, setMcAnswers,
    tfAnswers, setTfAnswers,
    saAnswers, setSaAnswers,
  };
}
