"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook quản lý upload và parse file PDF cho bài thi.
 * Nhận client Supabase và callback onError, cung cấp state cho file PDF,
 * URL, file PDF đáp án, trạng thái upload/parse, và hàm handlePdfUpload.
 *
 * @param supabase - Client Supabase đã khởi tạo.
 * @param onError - Callback nhận thông báo lỗi (string | null).
 * @returns Object chứa các state file, URL, trạng thái upload/parse và handlePdfUpload.
 * @example
 * const { pdfFile, pdfUrl, uploadingPdf, handlePdfUpload } = usePdfUpload(supabase, setError);
 */
export function usePdfUpload(
  supabase: ReturnType<typeof createClient>,
  onError: (msg: string | null) => void
) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      onError("Chỉ chấp nhận file PDF");
      return;
    }

    setPdfFile(file);
    setUploadingPdf(true);
    onError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập");

      const safeFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${user.id}/${Date.now()}_${safeFileName}`;

      const { error: uploadError } = await supabase.storage.from("exam-pdfs").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("exam-pdfs").getPublicUrl(fileName);
      setPdfUrl(publicUrl);
    } catch (err) {
      onError("Lỗi upload file: " + (err as Error).message);
      setPdfFile(null);
    } finally {
      setUploadingPdf(false);
    }
  };

  return {
    pdfFile, setPdfFile,
    pdfUrl, setPdfUrl,
    answerPdfFile, setAnswerPdfFile,
    uploadingPdf, setUploadingPdf,
    parsingPdf, setParsingPdf,
    parseSuccess, setParseSuccess,
    handlePdfUpload,
  };
}
