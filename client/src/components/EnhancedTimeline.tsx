import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderPlus,
  CheckCircle2,
  FileUp,
  FileX,
  MessageSquare,
  UserPlus,
  Edit,
  Clock,
  AlertTriangle,
  Briefcase,
  ArrowRightLeft,
  LogIn,
  Shield,
  Activity,
  Filter,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useMemo } from "react";

interface TimelineEntry {
  id: number;
  userId: number | null;
  action: string;
  description: string | null;
  metadata: string | null;
  createdAt: string | Date;
  userName?: string | null;
  userRole?: string | null;
}

interface EnhancedTimelineProps {
  timeline: TimelineEntry[];
  accentColor?: string; // "blue" | "amber" etc.
}

type TimelineFilter = "all" | "case" | "task" | "document" | "comment" | "user";

function getActionIcon(action: string) {
  switch (action) {
    case "case_created":
      return <FolderPlus className="w-4 h-4" />;
    case "case_updated":
    case "case_status_changed":
      return <Edit className="w-4 h-4" />;
    case "task_created":
      return <Briefcase className="w-4 h-4" />;
    case "task_completed":
      return <CheckCircle2 className="w-4 h-4" />;
    case "task_updated":
    case "task_status_changed":
      return <ArrowRightLeft className="w-4 h-4" />;
    case "task_deleted":
      return <AlertTriangle className="w-4 h-4" />;
    case "document_uploaded":
      return <FileUp className="w-4 h-4" />;
    case "document_deleted":
      return <FileX className="w-4 h-4" />;
    case "comment_added":
      return <MessageSquare className="w-4 h-4" />;
    case "user_invited":
    case "user_created":
      return <UserPlus className="w-4 h-4" />;
    case "login":
      return <LogIn className="w-4 h-4" />;
    case "partner_approved":
    case "partner_rejected":
      return <Shield className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
}

function getActionColor(action: string): string {
  if (action.includes("created") || action.includes("uploaded")) return "bg-green-500";
  if (action.includes("completed")) return "bg-emerald-500";
  if (action.includes("deleted") || action.includes("rejected")) return "bg-red-500";
  if (action.includes("updated") || action.includes("changed")) return "bg-blue-500";
  if (action.includes("comment")) return "bg-purple-500";
  if (action.includes("login")) return "bg-slate-500";
  return "bg-blue-500";
}

function getActionCategory(action: string): string {
  if (action.startsWith("case_")) return "case";
  if (action.startsWith("task_")) return "task";
  if (action.startsWith("document_")) return "document";
  if (action.startsWith("comment_")) return "comment";
  return "user";
}

function getRoleBadgeColor(role: string | null | undefined): string {
  switch (role) {
    case "admin": return "bg-red-500/15 text-red-400 border-red-500/25";
    case "paralegal": return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    case "partner": return "bg-blue-500/15 text-blue-400 border-blue-500/25";
    case "cro": return "bg-purple-500/15 text-purple-400 border-purple-500/25";
    default: return "bg-slate-500/15 text-slate-400 border-slate-500/25";
  }
}

export default function EnhancedTimeline({ timeline, accentColor = "blue" }: EnhancedTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");

  const filteredTimeline = useMemo(() => {
    if (filter === "all") return timeline;
    return timeline.filter((entry) => getActionCategory(entry.action) === filter);
  }, [timeline, filter]);

  // Count by category for filter badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: timeline.length };
    timeline.forEach((entry) => {
      const cat = getActionCategory(entry.action);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [timeline]);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p>No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "case", "task", "document", "comment"] as TimelineFilter[]).map((f) => {
            const count = f === "all" ? categoryCounts.all : (categoryCounts[f] || 0);
            if (f !== "all" && count === 0) return null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline entries */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-1">
          {filteredTimeline.map((activity, index) => {
            const isLast = index === filteredTimeline.length - 1;
            const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });
            const fullDate = format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a");

            return (
              <div key={activity.id} className="relative flex gap-2 sm:gap-4 group">
                {/* Icon dot */}
                <div className="relative z-10 shrink-0">
                  <div
                    className={`w-[24px] h-[24px] sm:w-[30px] sm:h-[30px] rounded-full flex items-center justify-center text-white ${getActionColor(
                      activity.action
                    )}`}
                  >
                    {getActionIcon(activity.action)}
                  </div>
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 ${isLast ? "" : ""}`}>
                  <div className="bg-card border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">
                          {activity.description || activity.action.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {activity.userName && (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <span className="font-medium">{activity.userName}</span>
                              {activity.userRole && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(
                                    activity.userRole
                                  )}`}
                                >
                                  {activity.userRole}
                                </Badge>
                              )}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground" title={fullDate}>
                            {timeAgo}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 capitalize opacity-60"
                      >
                        {activity.action.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filteredTimeline.length === 0 && filter !== "all" && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">
            No {filter} activities found.{" "}
            <button
              className="text-primary underline"
              onClick={() => setFilter("all")}
            >
              Show all activities
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
