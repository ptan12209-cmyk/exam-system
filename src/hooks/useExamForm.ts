"use client";

import { useState, useMemo } from "react";

/**
 * Hook quản lý trạng thái form tạo bài thi.
 * Cung cấp state và setter cho các trường: tiêu đề, môn học, thời gian,
 * số lần làm bài, lịch hẹn, thời gian bắt đầu/kết thúc,
 * số lượng câu hỏi trắc nghiệm/đúng sai/tự luận,
 * thông báo, hiển thị điểm, mức bảo mật, và tổng số câu hỏi.
 *
 * @returns Object chứa các state, setter tương ứng và `totalQuestions`.
 * @example
 * const {
 *   title, setTitle,
 *   subject, setSubject,
 *   totalQuestions
 * } = useExamForm();
 */
export function useExamForm() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("other");
  const [duration, setDuration] = useState(15);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [isScheduled, setIsScheduled] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [enableTF, setEnableTF] = useState(false);
  const [enableSA, setEnableSA] = useState(false);
  const [mcCount, setMcCount] = useState(12);
  const [tfCount, setTfCount] = useState(4);
  const [saCount, setSaCount] = useState(6);
  const [sendNotification, setSendNotification] = useState(true);
  const [scoreVisibilityMode, setScoreVisibilityMode] = useState<"always" | "never" | "threshold">("always");
  const [scoreThreshold, setScoreThreshold] = useState(5.0);
  const [securityLevel, setSecurityLevel] = useState(1);

  const totalQuestions = useMemo(
    () => mcCount + (enableTF ? tfCount : 0) + (enableSA ? saCount : 0),
    [mcCount, tfCount, saCount, enableTF, enableSA]
  );

  return {
    // State values
    title,
    subject,
    duration,
    maxAttempts,
    isScheduled,
    startTime,
    endTime,
    enableTF,
    enableSA,
    mcCount,
    tfCount,
    saCount,
    sendNotification,
    scoreVisibilityMode,
    scoreThreshold,
    securityLevel,
    // Setters
    setTitle,
    setSubject,
    setDuration,
    setMaxAttempts,
    setIsScheduled,
    setStartTime,
    setEndTime,
    setEnableTF,
    setEnableSA,
    setMcCount,
    setTfCount,
    setSaCount,
    setSendNotification,
    setScoreVisibilityMode,
    setScoreThreshold,
    setSecurityLevel,
    // Computed
    totalQuestions,
  };
}
