import { AlertTriangle, Clock, Flame } from "lucide-react";
import { useMemo } from "react";

interface EscalationAlertProps {
  createdAt: string | Date;
  status: string;
  priority: string;
}

/**
 * Shows a visual alert when a case has been pending review for too long.
 * Thresholds: 24h = warning, 48h = high, 72h = urgent
 */
export default function EscalationAlert({ createdAt, status, priority }: EscalationAlertProps) {
  const escalation = useMemo(() => {
    if (status !== "pending_review") return null;

    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours >= 72) {
      return {
        level: "critical",
        label: `${Math.floor(ageHours)}h pending`,
        icon: Flame,
        className: "bg-red-100 text-red-800 border-red-300 animate-pulse",
        iconClassName: "text-red-600",
      };
    } else if (ageHours >= 48) {
      return {
        level: "high",
        label: `${Math.floor(ageHours)}h pending`,
        icon: AlertTriangle,
        className: "bg-orange-100 text-orange-800 border-orange-300",
        iconClassName: "text-orange-600",
      };
    } else if (ageHours >= 24) {
      return {
        level: "warning",
        label: `${Math.floor(ageHours)}h pending`,
        icon: Clock,
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        iconClassName: "text-yellow-600",
      };
    }

    return null;
  }, [createdAt, status]);

  if (!escalation) return null;

  const Icon = escalation.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${escalation.className}`}>
      <Icon className={`h-3 w-3 ${escalation.iconClassName}`} />
      {escalation.label}
    </span>
  );
}
