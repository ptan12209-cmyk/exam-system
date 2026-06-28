"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Clock, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { OPTIONS, type Option, type TFAnswer, type SAAnswer } from "./types";

interface AnswerEntryProps {
  mcCount: number;
  tfCount: number;
  saCount: number;
  correctAnswers: (Option | null)[];
  onCorrectAnswersChange: (answers: (Option | null)[]) => void;
  tfAnswers: TFAnswer[];
  onTfAnswersChange: (answers: TFAnswer[]) => void;
  saAnswers: SAAnswer[];
  onSaAnswersChange: (answers: SAAnswer[]) => void;
  enableTF: boolean;
  enableSA: boolean;
  answerTab: "mc" | "tf" | "sa";
  onAnswerTabChange: (tab: "mc" | "tf" | "sa") => void;
  totalQuestions: number;
  answerPdfFile: File | null;
  onAnswerPdfFileChange: (file: File | null) => void;
  parsingPdf: boolean;
  parseSuccess: boolean;
  onParsePdf: (fileToUse?: File) => Promise<void>;
  sendNotification: boolean;
  onSendNotificationChange: (checked: boolean) => void;
  securityLevel: number;
  onSecurityLevelChange: (level: number) => void;
  onImportFromBank?: () => void;
}

export function AnswerEntry({
  mcCount,
  tfCount,
  saCount,
  correctAnswers,
  onCorrectAnswersChange,
  tfAnswers,
  onTfAnswersChange,
  saAnswers,
  onSaAnswersChange,
  enableTF,
  enableSA,
  answerTab,
  onAnswerTabChange,
  totalQuestions,
  answerPdfFile,
  onAnswerPdfFileChange,
  parsingPdf,
  parseSuccess,
  onParsePdf,
  sendNotification,
  onSendNotificationChange,
  securityLevel,
  onSecurityLevelChange,
  onImportFromBank,
}: AnswerEntryProps) {
  const answerPdfRef = useRef<HTMLInputElement>(null);

  return (
    <section className="mt-8 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => onAnswerTabChange("mc")}
          className={cn(
            "rounded-full px-4 py-2 text-sm",
            answerTab === "mc"
              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
              : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]"
          )}
        >
          Trắc nghiệm
        </button>
        <button
          onClick={() => onAnswerTabChange("tf")}
          className={cn(
            "rounded-full px-4 py-2 text-sm",
            answerTab === "tf"
              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
              : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]"
          )}
        >
          Đúng/Sai
        </button>
        <button
          onClick={() => onAnswerTabChange("sa")}
          className={cn(
            "rounded-full px-4 py-2 text-sm",
            answerTab === "sa"
              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
              : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]"
          )}
        >
          Tự luận
        </button>
        {onImportFromBank && (
          <button
            type="button"
            onClick={onImportFromBank}
            className="rounded-full px-4 py-2 text-sm bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/25 transition-all font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" /> Nhập từ Kho đề
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <Clock className="h-4 w-4" />
          {totalQuestions} câu
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
          <Label className="mb-2 block">PDF đáp án</Label>
          <div className="flex gap-2">
            <Input
              ref={answerPdfRef}
              type="file"
              accept=".pdf"
              onChange={(e) => onAnswerPdfFileChange(e.target.files?.[0] || null)}
              className="rounded-xl"
            />
            <Button
              type="button"
              onClick={() => void onParsePdf()}
              disabled={parsingPdf}
              className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"
            >
              {parsingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
          {parseSuccess && (
            <p className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Đã quét đáp án thành công
            </p>
          )}
        </div>

        {answerTab === "mc" && (
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Đáp án trắc nghiệm</h3>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">{mcCount} câu</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: mcCount }, (_, i) => (
                <label
                  key={i}
                  className="space-y-2 rounded-2xl border border-[hsl(var(--border))]/60 p-4"
                >
                  <span className="text-sm font-medium">Câu {i + 1}</span>
                  <select
                    value={correctAnswers[i] || ""}
                    onChange={(e) => {
                      const next = [...correctAnswers];
                      next[i] = e.target.value as Option;
                      onCorrectAnswersChange(next);
                    }}
                    className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm"
                  >
                    <option value="">Chọn đáp án</option>
                    {OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {answerTab === "tf" && (
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Đúng / Sai</h3>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">{tfCount} câu</span>
            </div>
            <div className="space-y-4">
              {Array.from({ length: tfCount }, (_, i) => {
                const baseQ = mcCount + i + 1;
                const item = tfAnswers[i] || {
                  question: baseQ,
                  a: true,
                  b: true,
                  c: true,
                  d: true,
                };
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-[hsl(var(--border))]/60 p-5 hover:bg-[hsl(var(--muted))]/5 transition-colors"
                  >
                    <p className="mb-4 font-semibold text-sm tracking-tight border-b border-[hsl(var(--border))]/40 pb-2 flex items-center justify-between">
                      CÂU HỎI {baseQ}
                      <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] tracking-[0.2em] uppercase">Đúng / Sai</span>
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                      {(["a", "b", "c", "d"] as const).map((sub) => (
                        <div key={sub} className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] text-center">Ý ({sub.toUpperCase()})</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...tfAnswers];
                                if (!next[i]) next[i] = { question: baseQ, a: true, b: true, c: true, d: true };
                                next[i] = { ...next[i], [sub]: true };
                                onTfAnswersChange(next);
                              }}
                              className={cn(
                                "rounded-xl border py-2 text-xs font-bold transition-all active:scale-95",
                                item[sub] === true ? "bg-emerald-500 text-white border-transparent shadow-sm" : "border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))]"
                              )}
                            >
                              ĐÚNG
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...tfAnswers];
                                if (!next[i]) next[i] = { question: baseQ, a: true, b: true, c: true, d: true };
                                next[i] = { ...next[i], [sub]: false };
                                onTfAnswersChange(next);
                              }}
                              className={cn(
                                "rounded-xl border py-2 text-xs font-bold transition-all active:scale-95",
                                item[sub] === false ? "bg-rose-500 text-white border-transparent shadow-sm" : "border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))]"
                              )}
                            >
                              SAI
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {answerTab === "sa" && (
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Tự luận / Ngắn</h3>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">{saCount} câu</span>
            </div>
            <div className="space-y-3">
              {Array.from({ length: saCount }, (_, i) => {
                const effectiveTf = enableTF ? tfCount : 0;
                const baseQ = mcCount + effectiveTf + i + 1;
                const item = saAnswers[i] || { question: baseQ, answer: "" };
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-[hsl(var(--border))]/60 p-4"
                  >
                    <Label className="mb-2 block">Câu {item.question}</Label>
                    <Input
                      value={String(item.answer)}
                      onChange={(e) => {
                        const next = [...saAnswers];
                        next[i] = { ...item, answer: e.target.value };
                        onSaAnswersChange(next);
                      }}
                      className="rounded-xl"
                      placeholder="Nhập đáp án..."
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))]/60 p-4 text-sm">
            <span>Gửi thông báo cho học sinh</span>
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={(e) => onSendNotificationChange(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))]/60 p-4 text-sm">
            <span>Mức bảo mật</span>
            <select
              value={securityLevel}
              onChange={(e) => onSecurityLevelChange(Number(e.target.value))}
              className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm"
            >
              <option value={1}>Thấp</option>
              <option value={2}>Trung bình</option>
              <option value={3}>Cao</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
