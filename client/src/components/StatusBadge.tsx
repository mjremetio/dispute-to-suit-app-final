import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "NEW", className: "bg-slate-100 text-slate-700 border-slate-200" },
  pending_review: { label: "PENDING REVIEW", className: "bg-amber-100 text-amber-700 border-amber-200" },
  in_progress: { label: "IN REVIEW", className: "bg-blue-100 text-blue-700 border-blue-200" },
  ready_for_attorney: { label: "READY FOR ATTORNEY", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed: { label: "COMPLETED", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { label: "CLOSED", className: "bg-slate-200 text-slate-600 border-slate-300" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-slate-50 text-slate-600 border-slate-200" },
  medium: { label: "Medium", className: "bg-blue-50 text-blue-600 border-blue-200" },
  high: { label: "High", className: "bg-orange-50 text-orange-600 border-orange-200" },
  urgent: { label: "Urgent", className: "bg-red-50 text-red-600 border-red-200" },
};

interface StatusBadgeProps {
  status: string;
  type?: "status" | "priority";
}

export default function StatusBadge({ status, type = "status" }: StatusBadgeProps) {
  const config = type === "priority" ? PRIORITY_CONFIG : STATUS_CONFIG;
  const item = config[status] || { label: status.replace(/_/g, " ").toUpperCase(), className: "bg-slate-100 text-slate-700" };

  return (
    <Badge variant="outline" className={`${item.className} text-xs font-medium`}>
      {item.label}
    </Badge>
  );
}
