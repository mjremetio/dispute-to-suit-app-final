import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Search, Activity, CheckCircle, XCircle, Edit, FileText, User, Shield, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { ResponsivePagination } from "@/components/ResponsivePagination";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;
type SortField = "createdAt" | "action" | "userId";
type SortOrder = "asc" | "desc";

export default function ActivityLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  const { data: activities, isLoading } = trpc.activity.list.useQuery({ limit: 500 });

  const filteredActivities = activities?.filter(activity => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (activity.description || "").toLowerCase().includes(searchLower) ||
      activity.action.toLowerCase().includes(searchLower)
    );
  }) || [];

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === "createdAt") {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedActivities.length / ITEMS_PER_PAGE);
  const paginatedActivities = sortedActivities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getActionColor = (action: string) => {
    if (action.includes("created") || action.includes("approved")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (action.includes("deleted") || action.includes("rejected")) return "bg-red-100 text-red-700 border-red-200";
    if (action.includes("updated") || action.includes("modified")) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getActionIcon = (action: string) => {
    if (action.includes("created") || action.includes("approved")) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (action.includes("deleted") || action.includes("rejected")) return <XCircle className="w-4 h-4 text-red-600" />;
    if (action.includes("updated") || action.includes("modified")) return <Edit className="w-4 h-4 text-blue-600" />;
    if (action.includes("login") || action.includes("auth")) return <User className="w-4 h-4 text-amber-600" />;
    return <Activity className="w-4 h-4 text-slate-600" />;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Professional Header */}
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">Activity Logs</h1>
          <p className="text-slate-600 mt-2 text-lg">Comprehensive audit trail of all system activities and user actions</p>
        </div>

        {/* Search and Sort */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search activities by action, description, or user..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-12 h-12 border-slate-300 text-base"
                />
              </div>
              <div className="flex gap-1">
                {(["createdAt", "action", "userId"] as SortField[]).map((field) => (
                  <Button
                    key={field}
                    variant={sortField === field ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSort(field)}
                    className="text-xs"
                  >
                    {field === "createdAt" ? "Date" : field === "action" ? "Action" : "User"}
                    {sortField === field ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-serif text-slate-900">System Activity Timeline</CardTitle>
                <CardDescription className="text-base text-slate-600 mt-1">
                  Showing {paginatedActivities.length} of {sortedActivities.length} activities
                </CardDescription>
              </div>
              <Shield className="w-8 h-8 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Activity className="w-12 h-12 text-slate-300 animate-pulse mb-4" />
                <p className="text-lg font-serif text-slate-600">Loading activity logs...</p>
              </div>
            ) : paginatedActivities.length > 0 ? (
              <div className="space-y-4">
                {paginatedActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex gap-5 pb-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-6 px-6 py-4 rounded-lg transition-colors"
                  >
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="w-px h-full bg-slate-200 mt-3"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="font-medium text-slate-900 text-base leading-relaxed">{activity.description}</p>
                        <Badge className={`${getActionColor(activity.action)} font-medium`}>
                          {activity.action.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">
                            {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        {activity.userId && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>User ID: {activity.userId}</span>
                          </div>
                        )}
                        {activity.caseId && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span>Case ID: {activity.caseId}</span>
                          </div>
                        )}
                        {activity.ipAddress && (
                          <div className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">
                            {activity.ipAddress}
                          </div>
                        )}
                      </div>
                      {activity.metadata && (
                        <details className="mt-3">
                          <summary className="text-sm text-slate-600 cursor-pointer hover:text-amber-600 font-medium transition-colors">
                            View metadata details
                          </summary>
                          <pre className="mt-3 text-xs bg-slate-100 p-4 rounded-lg overflow-x-auto border border-slate-200 font-mono">
                            {activity.metadata}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Activity className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-serif text-slate-600">
                  {searchQuery ? "No activities match your search" : "No activities recorded yet"}
                </p>
                <p className="text-slate-500 mt-2">
                  {searchQuery ? "Try adjusting your search terms" : "System activity will appear here"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <ResponsivePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedActivities.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemLabel="activities"
        />
      </div>
    </DashboardLayout>
  );
}
