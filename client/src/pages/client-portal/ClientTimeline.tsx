import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Clock, FileText, MessageSquare, UserCheck, ArrowRight, Activity, Briefcase } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";

const actionIcons: Record<string, ReactNode> = {
  status_change: <ArrowRight className="w-4 h-4" />,
  comment_added: <MessageSquare className="w-4 h-4" />,
  document_uploaded: <FileText className="w-4 h-4" />,
  document_signed: <UserCheck className="w-4 h-4" />,
  assignment_changed: <UserCheck className="w-4 h-4" />,
};

const actionColors: Record<string, string> = {
  status_change: "bg-blue-100 text-blue-600",
  comment_added: "bg-purple-100 text-purple-600",
  document_uploaded: "bg-emerald-100 text-emerald-600",
  document_signed: "bg-green-100 text-green-600",
  assignment_changed: "bg-amber-100 text-amber-600",
};

const actionLabels: Record<string, string> = {
  status_change: "Status Changed",
  comment_added: "Comment Added",
  document_uploaded: "Document Uploaded",
  document_signed: "Document Signed",
  assignment_changed: "Assignment Changed",
};

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function ClientTimeline() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  const { data: cases } = trpc.clientPortal.myCases.useQuery();

  // Auto-select first case when data loads
  useEffect(() => {
    if (cases && cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(String(cases[0].id));
    }
  }, [cases, selectedCaseId]);

  const caseId = selectedCaseId ? Number(selectedCaseId) : undefined;

  const { data: timeline, isLoading } = trpc.clientPortal.getCaseTimeline.useQuery(
    { caseId: caseId! },
    { enabled: !!caseId }
  );

  return (
    <ClientLayout>
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">Activity Log</h1>
          <p className="text-slate-600 mt-2 text-lg">Timeline of all activity on your cases</p>
        </div>

        {/* Case Selector */}
        {cases && cases.length > 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-indigo-600 shrink-0" />
                <label className="text-sm font-medium text-slate-700 shrink-0">Viewing activity for:</label>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a case" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        Case #{c.id} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {!caseId ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <Clock className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Active Case</h3>
              <p className="text-slate-600">Activity will appear once your case is created.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center text-slate-500">Loading activity...</CardContent>
          </Card>
        ) : timeline && timeline.length > 0 ? (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

            <div className="space-y-6">
              {timeline.map((entry: any, idx: number) => {
                const actionType = entry.action || "status_change";
                const iconColorClass = actionColors[actionType] || "bg-slate-100 text-slate-600";
                const icon = actionIcons[actionType] || <Activity className="w-4 h-4" />;
                const label = actionLabels[actionType] || actionType;

                return (
                  <div key={entry.id || idx} className="relative flex gap-4 pl-1">
                    {/* Timeline dot */}
                    <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${iconColorClass}`}>
                      {icon}
                    </div>

                    {/* Content card */}
                    <Card className="flex-1 border-slate-200 shadow-sm">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {label}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {formatRelative(entry.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 mt-1">{entry.description}</p>
                            {entry.userName && (
                              <p className="text-xs text-slate-400 mt-1">by {entry.userName}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-lg">No activity yet</p>
              <p className="text-slate-400 text-sm mt-1">Case activity and updates will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
