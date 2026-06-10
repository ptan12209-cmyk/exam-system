"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBJECTS } from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

interface ExamInfoFormProps {
  title: string;
  onTitleChange: (value: string) => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  maxAttempts: number;
  onMaxAttemptsChange: (value: number) => void;
  targetGrade: number | null;
  onTargetGradeChange: (value: number | null) => void;
  targetClasses: string;
  onTargetClassesChange: (value: string) => void;
  assignedTo: "normal" | "x";
  onAssignedToChange: (value: "normal" | "x") => void;
  // Hierarchy props
  selectedChapterId?: string;
  onChapterChange?: (value: string) => void;
  selectedLessonId?: string;
  onLessonChange?: (value: string) => void;
  selectedSectionId?: string;
  onSectionChange?: (value: string) => void;
  availableChapters?: any[];
  availableLessons?: any[];
  availableSections?: any[];
}

export function ExamInfoForm({
  title,
  onTitleChange,
  subject,
  onSubjectChange,
  duration,
  onDurationChange,
  maxAttempts,
  onMaxAttemptsChange,
  targetGrade,
  onTargetGradeChange,
  targetClasses,
  onTargetClassesChange,
  assignedTo,
  onAssignedToChange,
  selectedChapterId = "",
  onChapterChange,
  selectedLessonId = "",
  onLessonChange,
  selectedSectionId = "",
  onSectionChange,
  availableChapters = [],
  availableLessons = [],
  availableSections = [],
}: ExamInfoFormProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Tên đề thi</Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="VD: Đề thi HK1 Vật Lý 12"
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label>Môn học</Label>
        <select
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
        >
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Thời lượng (phút)</Label>
        <Input
          type="number"
          value={duration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label>Số lần làm</Label>
        <Input
          type="number"
          value={maxAttempts}
          onChange={(e) => onMaxAttemptsChange(Number(e.target.value))}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label>Khối lớp giao bài</Label>
        <select
          value={targetGrade === null ? "" : String(targetGrade)}
          onChange={(e) => onTargetGradeChange(e.target.value === "" ? null : Number(e.target.value))}
          className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
        >
          <option value="">Tất cả các khối</option>
          {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
            <option key={g} value={g}>
              Khối {g}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Lớp học cụ thể (tùy chọn)</Label>
        <Input
          value={targetClasses}
          onChange={(e) => onTargetClassesChange(e.target.value)}
          placeholder="VD: A1, A2 (phân tách bằng dấu phẩy, để trống = cả khối)"
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label className="text-sm font-medium">Đối tượng giao bài</Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onAssignedToChange("normal")}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center cursor-pointer",
              assignedTo === "normal"
                ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))]/5 text-[hsl(var(--foreground))]"
                : "border-[hsl(var(--border))]/60 hover:border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
            )}
          >
            <span className="font-semibold text-sm">Học sinh thường</span>
            <span className="text-xs opacity-75 mt-1">Giao bài cho học sinh đại trà</span>
          </button>
          <button
            type="button"
            onClick={() => onAssignedToChange("x")}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center cursor-pointer",
              assignedTo === "x"
                ? "border-[#C18CFF] bg-[#C18CFF]/10 text-[#C18CFF]"
                : "border-[hsl(var(--border))]/60 hover:border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
            )}
          >
            <span className="font-semibold text-sm flex items-center gap-1.5">
              Học sinh X <span className="inline-block w-2 h-2 rounded-full bg-[#C18CFF] animate-pulse"></span>
            </span>
            <span className="text-xs opacity-75 mt-1">Giao riêng cho học sinh X</span>
          </button>
        </div>
      </div>

      {/* Hierarchy: Phân tầng hệ thống bài tập */}
      {onChapterChange && (
        <div className="space-y-4 md:col-span-2 rounded-2xl border border-[hsl(var(--border))]/60 p-4">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4" /> Phân tầng hệ thống bài tập
          </Label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">Chương</Label>
              <select
                value={selectedChapterId}
                onChange={(e) => { onChapterChange(e.target.value); onLessonChange?.(""); onSectionChange?.("") }}
                disabled={!targetGrade || !subject}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))] disabled:opacity-50"
              >
                <option value="">-- Chọn chương --</option>
                {availableChapters.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">Bài học</Label>
              <select
                value={selectedLessonId}
                onChange={(e) => { onLessonChange?.(e.target.value); onSectionChange?.("") }}
                disabled={!selectedChapterId}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))] disabled:opacity-50"
              >
                <option value="">-- Chọn bài --</option>
                {availableLessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">Phần</Label>
              <select
                value={selectedSectionId}
                onChange={(e) => onSectionChange?.(e.target.value)}
                disabled={!selectedLessonId}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))] disabled:opacity-50"
              >
                <option value="">-- Chọn phần --</option>
                {availableSections.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          </div>
          {!targetGrade || !subject ? (
            <p className="text-xs text-amber-500">⚠️ Cần chọn Khối lớp và Môn học để sử dụng phân tầng.</p>
          ) : (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Phân tầng giúp gắn đề thi vào chương trình học (tuỳ chọn).</p>
          )}
        </div>
      )}
    </div>
  );
}
