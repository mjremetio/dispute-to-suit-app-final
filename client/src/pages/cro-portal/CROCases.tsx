import CROLayout from "@/components/CROLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FileText, Search, Eye } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  new: "New",
  pending_review: "Pending Review",
  in_review: "In Review",
  more_info_needed: "More Info Needed",
  ready_for_attorney: "Ready for Attorney",
  sent_to_attorney: "Sent to Attorney",
  accepted_by_attorney: "Accepted",
  rejected: "Rejected",
  settled: "Settled",
  settlement_paid_out: "Paid Out",
  closed: "Closed",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  in_review: "bg-purple-50 text-purple-700 border-purple-200",
  more_info_needed: "bg-orange-50 text-orange-700 border-orange-200",
  ready_for_attorney: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sent_to_attorney: "bg-cyan-50 text-cyan-700 border-cyan-200",
  accepted_by_attorney: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  settled: "bg-teal-50 text-teal-700 border-teal-200",
  settlement_paid_out: "bg-lime-50 text-lime-700 border-lime-200",
  closed: "bg-slate-50 text-slate-700 border-slate-200",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function CROCases() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: cases, isLoading } = trpc.cro.myCases.useQuery();

  const filteredCases = cases?.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.caseType?.toLowerCase().includes(q));
  });

  return (
    <CROLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">My Cases</h1>
              <p className="text-slate-600 mt-2 text-lg">View cases assigned to you</p>
            </div>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input placeholder="Search cases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 border-slate-300" />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="border-slate-200"><CardContent className="py-16 text-center"><p className="text-slate-500">Loading cases...</p></CardContent></Card>
        ) : filteredCases && filteredCases.length > 0 ? (
          <div className="space-y-4">
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Title</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-1">Action</div>
            </div>
            {filteredCases.map((caseItem) => (
              <Card key={caseItem.id} className="border-slate-200 hover:border-amber-300 transition-colors cursor-pointer" onClick={() => setLocation(`/cro-portal/cases/${caseItem.id}`)}>
                <CardContent className="py-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-1 text-sm text-slate-500">#{caseItem.id}</div>
                    <div className="md:col-span-4">
                      <p className="font-medium text-slate-900 truncate">{caseItem.title}</p>
                    </div>
                    <div className="md:col-span-2 text-sm text-slate-600">{caseItem.caseType || "--"}</div>
                    <div className="md:col-span-2">
                      <Badge variant="outline" className={statusColors[caseItem.status] || ""}>
                        {statusLabels[caseItem.status] || caseItem.status}
                      </Badge>
                    </div>
                    <div className="md:col-span-1">
                      <Badge variant="secondary" className={priorityColors[caseItem.priority] || ""}>
                        {caseItem.priority}
                      </Badge>
                    </div>
                    <div className="md:col-span-1 text-sm text-slate-600">
                      {new Date(caseItem.createdAt).toLocaleDateString()}
                    </div>
                    <div className="md:col-span-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <FileText className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Cases Yet</h3>
              <p className="text-slate-600 text-lg">Cases will appear here once your intake inquiries are processed</p>
            </CardContent>
          </Card>
        )}
      </div>
    </CROLayout>
  );
}
