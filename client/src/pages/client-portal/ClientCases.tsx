import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsivePagination } from "@/components/ResponsivePagination";
import { trpc } from "@/lib/trpc";
import { FileText, Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  new: "New", pending_review: "Pending Review", in_review: "In Review",
  more_info_needed: "More Info Needed", ready_for_attorney: "Ready for Attorney",
  sent_to_attorney: "Sent to Attorney", accepted_by_attorney: "Accepted by Attorney",
  rejected: "Rejected", settled: "Settled", settlement_paid_out: "Settlement Paid Out", closed: "Closed",
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

type SortField = "title" | "status" | "priority" | "caseType" | "createdAt";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

export default function ClientCases() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: cases, isLoading } = trpc.clientPortal.myCases.useQuery();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === "asc"
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const filteredAndSortedCases = useMemo(() => {
    if (!cases) return [];

    let filtered = cases.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.caseType?.toLowerCase().includes(q) ||
        (statusLabels[c.status] || c.status).toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "priority":
          comparison = a.priority.localeCompare(b.priority);
          break;
        case "caseType":
          comparison = (a.caseType || "").localeCompare(b.caseType || "");
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [cases, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedCases.length / ITEMS_PER_PAGE);
  const paginatedCases = filteredAndSortedCases.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <ClientLayout>
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">My Cases</h1>
              <p className="text-slate-600 mt-2 text-lg">View and track all your cases</p>
            </div>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input placeholder="Search cases by title, type, or status..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10 border-slate-300" />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <p className="text-slate-500">Loading cases...</p>
            </CardContent>
          </Card>
        ) : filteredAndSortedCases.length > 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[60px] pl-4">#</TableHead>
                    <TableHead>
                      <button className="flex items-center font-medium hover:text-indigo-600 transition-colors" onClick={() => handleSort("title")}>
                        Title {getSortIcon("title")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center font-medium hover:text-indigo-600 transition-colors" onClick={() => handleSort("caseType")}>
                        Type {getSortIcon("caseType")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center font-medium hover:text-indigo-600 transition-colors" onClick={() => handleSort("status")}>
                        Status {getSortIcon("status")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center font-medium hover:text-indigo-600 transition-colors" onClick={() => handleSort("priority")}>
                        Priority {getSortIcon("priority")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center font-medium hover:text-indigo-600 transition-colors" onClick={() => handleSort("createdAt")}>
                        Created {getSortIcon("createdAt")}
                      </button>
                    </TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCases.map((caseItem) => (
                    <TableRow key={caseItem.id} className="hover:bg-indigo-50/50 cursor-pointer" onClick={() => setLocation(`/client-portal/cases/${caseItem.id}`)}>
                      <TableCell className="pl-4 text-slate-500 text-sm">
                        {caseItem.id}
                      </TableCell>
                      <TableCell className="font-medium text-indigo-700 hover:text-indigo-900">
                        {caseItem.title}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {caseItem.caseType || "--"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[caseItem.status] || ""}>
                          {statusLabels[caseItem.status] || caseItem.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${priorityColors[caseItem.priority] || ""} capitalize`}>
                          {caseItem.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {new Date(caseItem.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {caseItem.dueDate ? new Date(caseItem.dueDate).toLocaleDateString() : "--"}
                      </TableCell>
                      <TableCell>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <div className="px-4 pb-4">
                <ResponsivePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAndSortedCases.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  itemLabel="cases"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <FileText className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Cases Found</h3>
              <p className="text-slate-600 text-lg">
                {searchQuery ? "No cases match your search criteria" : "Your cases will appear here once they have been created."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
