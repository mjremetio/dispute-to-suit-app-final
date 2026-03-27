import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, AlertCircle, FileText } from "lucide-react";
import { useMemo } from "react";

interface DocumentChecklistProps {
  caseId: number;
  caseType: string;
  compact?: boolean;
}

export default function DocumentChecklist({ caseId, caseType, compact = false }: DocumentChecklistProps) {
  const { data: checklist, isLoading } = trpc.cases.checklist.useQuery(
    { caseId, caseType },
    { enabled: !!caseType }
  );

  if (isLoading || !checklist) {
    return null;
  }

  const allRequiredComplete = checklist.requiredCompleted === checklist.requiredTotal;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 text-xs font-medium ${allRequiredComplete ? "text-emerald-600" : "text-amber-600"}`}>
          {allRequiredComplete ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {checklist.requiredCompleted}/{checklist.requiredTotal} required docs
        </div>
        <div className="text-xs text-slate-400">
          ({checklist.completed}/{checklist.total} total)
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-600" />
          Document Checklist
        </h4>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          allRequiredComplete
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {checklist.requiredCompleted}/{checklist.requiredTotal} required
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            allRequiredComplete ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${checklist.total > 0 ? (checklist.completed / checklist.total) * 100 : 0}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {checklist.items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
              item.fulfilled
                ? "bg-emerald-50 border border-emerald-200"
                : item.required
                ? "bg-amber-50/50 border border-amber-200/50"
                : "bg-slate-50 border border-slate-200/50"
            }`}
          >
            {item.fulfilled ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <Circle className={`h-4 w-4 mt-0.5 shrink-0 ${item.required ? "text-amber-400" : "text-slate-300"}`} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  item.fulfilled ? "text-emerald-800" : "text-slate-700"
                }`}>
                  {item.label}
                </span>
                {item.required && !item.fulfilled && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                    Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {!allRequiredComplete && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Upload all required documents before submitting for review
          </p>
        </div>
      )}
    </div>
  );
}
