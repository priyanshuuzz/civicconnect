import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

export default function StatusTimeline({ currentStatus }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="w-full" data-testid="status-timeline">
      {/* Desktop horizontal */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200" />
        {/* Progress line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-blue-600 transition-all duration-500"
          style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((step, i) => {
          const isComplete = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className="flex flex-col items-center relative z-10" data-testid={`timeline-step-${step.key}`}>
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  isComplete && "bg-blue-600 text-white",
                  isCurrent && "bg-blue-600 text-white ring-4 ring-blue-100",
                  !isComplete && !isCurrent && "bg-white border-2 border-slate-300 text-slate-400"
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center",
                  (isComplete || isCurrent) ? "text-blue-700" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile vertical */}
      <div className="sm:hidden space-y-0">
        {STEPS.map((step, i) => {
          const isComplete = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isComplete && "bg-blue-600 text-white",
                    isCurrent && "bg-blue-600 text-white ring-4 ring-blue-100",
                    !isComplete && !isCurrent && "bg-white border-2 border-slate-300 text-slate-400"
                  )}
                >
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-0.5 h-6", isComplete ? "bg-blue-600" : "bg-slate-200")} />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium pt-1",
                (isComplete || isCurrent) ? "text-slate-900" : "text-slate-400"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
