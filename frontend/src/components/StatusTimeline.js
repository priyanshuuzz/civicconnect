import { Check, FileInput, UserCheck, Play, CircleCheck, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "submitted", label: "Submitted", icon: FileInput },
  { key: "assigned", label: "Assigned", icon: UserCheck },
  { key: "in_progress", label: "In Progress", icon: Play },
  { key: "resolved", label: "Resolved", icon: CircleCheck },
  { key: "closed", label: "Closed", icon: Archive },
];

export default function StatusTimeline({ currentStatus }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="w-full" data-testid="status-timeline">
      {/* Desktop horizontal */}
      <div className="hidden sm:flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-[2px] bg-slate-100 rounded-full" />
        <div
          className="absolute top-5 left-0 h-[2px] bg-blue-600 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((step, i) => {
          const isComplete = i < currentIdx;
          const isCurrent = i === currentIdx;
          const StepIcon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center relative z-10" data-testid={`timeline-step-${step.key}`}>
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                  isComplete && "bg-blue-600 text-white shadow-sm shadow-blue-200",
                  isCurrent && "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm shadow-blue-200",
                  !isComplete && !isCurrent && "bg-white border-2 border-slate-200 text-slate-400"
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
              </div>
              <span
                className={cn(
                  "mt-2.5 text-[11px] font-semibold text-center whitespace-nowrap",
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
          const StepIcon = step.icon;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                    isComplete && "bg-blue-600 text-white",
                    isCurrent && "bg-blue-600 text-white ring-4 ring-blue-100",
                    !isComplete && !isCurrent && "bg-white border-2 border-slate-200 text-slate-400"
                  )}
                >
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-0.5 h-6", isComplete ? "bg-blue-600" : "bg-slate-200")} />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium pt-1.5",
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
