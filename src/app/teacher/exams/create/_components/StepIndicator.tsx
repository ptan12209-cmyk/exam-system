"use client";

import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: "info" | "answers";
  onStepChange: (step: "info" | "answers") => void;
}

export function StepIndicator({ currentStep, onStepChange }: StepIndicatorProps) {
  return (
    <div className="mt-10 inline-flex rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-1">
      <button
        onClick={() => onStepChange("info")}
        className={cn(
          "rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
          currentStep === "info"
            ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
            : "text-[hsl(var(--muted-foreground))]"
        )}
      >
        Thông tin
      </button>
      <button
        onClick={() => onStepChange("answers")}
        className={cn(
          "rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
          currentStep === "answers"
            ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
            : "text-[hsl(var(--muted-foreground))]"
        )}
      >
        Đáp án
      </button>
    </div>
  );
}
