"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBJECTS } from "@/lib/subjects";

interface ExamInfoFormProps {
  title: string;
  onTitleChange: (value: string) => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  maxAttempts: number;
  onMaxAttemptsChange: (value: number) => void;
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
          className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm"
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
    </div>
  );
}
