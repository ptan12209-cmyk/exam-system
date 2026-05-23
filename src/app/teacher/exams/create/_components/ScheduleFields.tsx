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
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            type="datetime-local"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="rounded-xl"
          />
          <Input
            type="datetime-local"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="rounded-xl"
          />
        </div>
      )}
    </>
  );
}
