"use client";

import { Input } from "@/components/ui/input";

interface ScheduleFieldsProps {
  isScheduled: boolean;
  onScheduledChange: (checked: boolean) => void;
  startTime: string;
  onStartTimeChange: (value: string) => void;
  endTime: string;
  onEndTimeChange: (value: string) => void;
}

export function ScheduleFields({
  isScheduled,
  onScheduledChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
}: ScheduleFieldsProps) {
  return (
    <>
      <label className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))]/60 p-3">
        <span>Bật lịch thi</span>
        <input
          type="checkbox"
          checked={isScheduled}
          onChange={(e) => onScheduledChange(e.target.checked)}
        />
      </label>
      {isScheduled && (
        <div className="grid gap-3 grid-cols-1">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Thời gian bắt đầu</span>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Thời gian kết thúc</span>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
