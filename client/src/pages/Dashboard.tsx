import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileText, TrendingUp, Clock, CheckCircle2, Scale, Gavel, Users, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";


export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: cases } = trpc.cases.list.useQuery();

  // All roles use the same dashboard - no redirects

  const stats = {
    total: cases?.length || 0,
    new: cases?.filter(c => c.status === "new" || c.status === "pending_review").length || 0,
    inProgress: cases?.filter(c => c.status === "in_review" || c.status === "more_info_needed").length || 0,
    completed: cases?.filter(c => c.status === "settled" || c.status === "settlement_paid_out" || c.status === "closed").length || 0,
  };

  const successRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const recentCases = cases?.slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Professional Header */}
        <div className="border-b border-border pb-4 sm:pb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Scale className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-4xl font-serif font-bold text-foreground">
              Welcome back, {user?.name}
            </h1>
          </div>
          <p className="text-sm sm:text-lg text-muted-foreground font-light ml-8 sm:ml-11">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </p>
        </div>

        {/* Key Metrics - Professional Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card className="border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-600 transition-all duration-300 shadow-sm hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Total Cases
                </CardTitle>
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  <FileText className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-100">
                {stats.total}
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-light">
                All active cases
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-600 transition-all duration-300 shadow-sm hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  New Cases
                </CardTitle>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-center border border-blue-200 dark:border-blue-800">
                  <Clock className="w-6 h-6 text-blue-700 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-blue-700 dark:text-blue-400">
                {stats.new}
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-light">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-600 transition-all duration-300 shadow-sm hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  In Progress
                </CardTitle>
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950 rounded-lg flex items-center justify-center border border-amber-200 dark:border-amber-800">
                  <Gavel className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-amber-700 dark:text-amber-400">
                {stats.inProgress}
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-light">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all duration-300 shadow-sm hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Completed
                </CardTitle>
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950 rounded-lg flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
                {stats.completed}
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-light">
                Successfully closed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Litigation Performance - Professional Design */}
        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-border bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-amber-700 dark:text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-serif">Litigation Performance</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground font-light mt-1">
                    Your case resolution metrics and success rate
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right ml-13 sm:ml-0">
                <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
                  {successRate}%
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                  Success Rate
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-muted-foreground">Case Completion Progress</span>
                  <span className="font-semibold">{stats.completed} / {stats.total} cases</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-2xl font-serif font-bold text-blue-700 dark:text-blue-400">
                    {stats.new}
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Pending Review
                  </p>
                </div>
                <div className="text-center border-x border-border">
                  <div className="text-2xl font-serif font-bold text-amber-700 dark:text-amber-400">
                    {stats.inProgress}
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Active Cases
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
                    {stats.completed}
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Resolved
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Cases - Professional Table Design */}
        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-border bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-serif">Recent Cases</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground font-light mt-1">
                    Latest case activity and updates
                  </p>
                </div>
              </div>
              <Link href="/admin/cases">
                <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                  View All Cases
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentCases.length > 0 ? (
              <div className="divide-y divide-border">
                {recentCases.map((caseItem) => (
                  <Link key={caseItem.id} href={`/admin/cases/${caseItem.id}`}>
                    <div className="p-3 sm:p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2 truncate group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
                            {caseItem.title}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
                            {caseItem.description || "No description provided"}
                          </p>
                          <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(caseItem.createdAt).toLocaleDateString()}
                            </span>
                            {caseItem.clientId && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Client ID: {caseItem.clientId}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 sm:ml-6 flex-wrap">
                          <span className={`px-4 py-2 rounded-lg text-sm font-medium border-2 ${
                            caseItem.status === "new" 
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" :
                            caseItem.status === "pending_review" 
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800" :
                            caseItem.status === "in_review"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" :
                            caseItem.status === "more_info_needed"
                              ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" :
                            caseItem.status === "ready_for_attorney"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" :
                            caseItem.status === "sent_to_attorney"
                              ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800" :
                            caseItem.status === "accepted_by_attorney"
                              ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800" :
                            caseItem.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" :
                            caseItem.status === "settled"
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" :
                            caseItem.status === "settlement_paid_out"
                              ? "bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950 dark:text-lime-400 dark:border-lime-800" :
                            caseItem.status === "closed"
                              ? "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700" :
                              "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
                          }`}>
                            {caseItem.status === "new" ? "New" : 
                             caseItem.status === "pending_review" ? "Pending Review" : 
                             caseItem.status === "in_review" ? "In Review" : 
                             caseItem.status === "more_info_needed" ? "More Information Needed" : 
                             caseItem.status === "ready_for_attorney" ? "Ready for Attorney" : 
                             caseItem.status === "sent_to_attorney" ? "Sent to Attorney" : 
                             caseItem.status === "accepted_by_attorney" ? "Accepted by Attorney" : 
                             caseItem.status === "rejected" ? "Rejected Case" : 
                             caseItem.status === "settled" ? "Settled" : 
                             caseItem.status === "settlement_paid_out" ? "Settlement Paid Out" : 
                             "Closed"}
                          </span>
                          <span className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
                            caseItem.priority === "urgent" 
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                            caseItem.priority === "high" 
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" :
                            caseItem.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" :
                              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {caseItem.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-serif font-semibold mb-2">No cases yet</h3>
                <p className="text-muted-foreground mb-6 font-light">
                  Get started by creating your first case
                </p>
                <Link href="/admin/cases">
                  <Button className="gap-2">
                    <FileText className="w-4 h-4" />
                    Create New Case
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
