import { CheckCircle, Circle, AlertCircle, XCircle, Clock } from "lucide-react";

const pipelineStages = [
  { key: "new", label: "Intake", description: "Case filed" },
  { key: "pending_review", label: "Pending Review", description: "Awaiting paralegal review" },
  { key: "in_review", label: "In Review", description: "Under paralegal review" },
  { key: "ready_for_attorney", label: "Ready for Attorney", description: "Documents prepared" },
  { key: "sent_to_attorney", label: "Sent to Attorney", description: "Submitted to attorney" },
  { key: "accepted_by_attorney", label: "Accepted", description: "Attorney accepted case" },
  { key: "settled", label: "Settled", description: "Settlement negotiated" },
  { key: "settlement_paid_out", label: "Paid Out", description: "Settlement received" },
  { key: "closed", label: "Closed", description: "Case resolved" },
];

const specialStatuses: Record<string, { label: string; color: string; icon: typeof AlertCircle }> = {
  more_info_needed: { label: "More Info Needed", color: "text-orange-600 bg-orange-50 border-orange-200", icon: AlertCircle },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-50 border-red-200", icon: XCircle },
};

function getStageIndex(status: string): number {
  const idx = pipelineStages.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function CaseStageTimeline({
  currentStatus,
  createdAt,
  updatedAt,
  compact = false,
}: {
  currentStatus: string;
  createdAt?: string;
  updatedAt?: string;
  compact?: boolean;
}) {
  const isSpecial = currentStatus in specialStatuses;
  const currentIdx = getStageIndex(currentStatus);

  if (compact) {
    return (
      <div className="w-full">
        {/* Compact horizontal dots */}
        <div className="flex items-center gap-1">
          {pipelineStages.map((stage, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx && !isSpecial;
            return (
              <div key={stage.key} className="flex items-center gap-1">
                <div
                  className={`w-3 h-3 rounded-full transition-all ${
                    isCompleted
                      ? "bg-green-500"
                      : isCurrent
                        ? "bg-indigo-600 ring-2 ring-indigo-200"
                        : "bg-slate-200"
                  }`}
                  title={`${stage.label}${isCompleted ? " (Completed)" : isCurrent ? " (Current)" : ""}`}
                />
                {idx < pipelineStages.length - 1 && (
                  <div className={`w-4 h-0.5 ${isCompleted ? "bg-green-500" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
        {isSpecial && (
          <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${specialStatuses[currentStatus].color}`}>
            {currentStatus === "rejected" ? (
              <XCircle className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {specialStatuses[currentStatus].label}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Special status banner */}
      {isSpecial && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${specialStatuses[currentStatus].color}`}>
          {currentStatus === "rejected" ? (
            <XCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{specialStatuses[currentStatus].label}</span>
        </div>
      )}

      {/* Vertical timeline */}
      <div className="relative">
        {pipelineStages.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx && !isSpecial;
          const isFuture = idx > currentIdx || (isSpecial && idx >= currentIdx);

          return (
            <div key={stage.key} className="relative flex gap-4">
              {/* Vertical line */}
              {idx < pipelineStages.length - 1 && (
                <div
                  className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-8px)] ${
                    isCompleted ? "bg-green-400" : "bg-slate-200"
                  }`}
                />
              )}

              {/* Icon */}
              <div className="z-10 shrink-0">
                {isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center ring-4 ring-indigo-100">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                    <Circle className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 flex-1 min-w-0 ${isFuture ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${
                    isCurrent ? "text-indigo-700" : isCompleted ? "text-slate-900" : "text-slate-400"
                  }`}>
                    {stage.label}
                  </p>
                  {isCurrent && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${
                  isCurrent ? "text-indigo-500" : isCompleted ? "text-slate-500" : "text-slate-300"
                }`}>
                  {stage.description}
                </p>
                {idx === 0 && createdAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {isCurrent && updatedAt && (
                  <p className="text-xs text-indigo-400 mt-1">
                    Since {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
