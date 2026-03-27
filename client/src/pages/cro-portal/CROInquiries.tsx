import CROLayout from "@/components/CROLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ClipboardList, Clock, CheckCircle, XCircle, FileText, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { ResponsivePagination } from "@/components/ResponsivePagination";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;
type SortField = "clientName" | "clientEmail" | "createdAt" | "status";
type SortOrder = "asc" | "desc";

export default function CROInquiries() {
  const [, setLocation] = useLocation();
  const { data: inquiries, isLoading } = trpc.cro.myInquiries.useQuery();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortOrder === "asc"
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = (inquiries || []).filter((inq) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      inq.clientFirstName.toLowerCase().includes(q) ||
      inq.clientLastName.toLowerCase().includes(q) ||
      inq.clientEmail.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || inq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any, bVal: any;
    if (sortField === "clientName") {
      aVal = `${a.clientFirstName} ${a.clientLastName}`.toLowerCase();
      bVal = `${b.clientFirstName} ${b.clientLastName}`.toLowerCase();
    } else if (sortField === "createdAt") {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    } else {
      aVal = ((a as any)[sortField] || "").toLowerCase();
      bVal = ((b as any)[sortField] || "").toLowerCase();
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <CROLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">My Inquiries</h1>
                <p className="text-slate-600 mt-2 text-lg">Track the status of your submitted intake inquiries</p>
              </div>
            </div>
            <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white shadow-md" onClick={() => setLocation("/cro-portal/intake")}>
              <Plus className="w-5 h-5 mr-2" /> New Inquiry
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by client name or email..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center"><p className="text-slate-500">Loading inquiries...</p></CardContent>
          </Card>
        ) : sorted.length > 0 ? (
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-2xl font-serif">Inquiries</CardTitle>
              <CardDescription>Showing {paginated.length} of {sorted.length} inquiries</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("clientName")}>
                      <div className="flex items-center">Client Name <SortIcon field="clientName" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("clientEmail")}>
                      <div className="flex items-center">Email <SortIcon field="clientEmail" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                      <div className="flex items-center">Date <SortIcon field="createdAt" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                      <div className="flex items-center">Status <SortIcon field="status" /></div>
                    </TableHead>
                    <TableHead>Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((inquiry) => (
                    <TableRow key={inquiry.id}>
                      <TableCell className="text-sm text-muted-foreground">#{inquiry.id}</TableCell>
                      <TableCell className="font-medium">{inquiry.clientFirstName} {inquiry.clientLastName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inquiry.clientEmail}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(inquiry.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                      <TableCell>
                        {inquiry.caseId ? (
                          <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => setLocation(`/cro-portal/cases/${inquiry.caseId}`)}>
                            <FileText className="w-4 h-4 mr-1" /> #{inquiry.caseId}
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-400">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginated.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No inquiries match your filters</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <ClipboardList className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Inquiries Yet</h3>
              <p className="text-slate-600 text-lg mb-6">Submit your first intake inquiry to get started</p>
              <Button onClick={() => setLocation("/cro-portal/intake")} size="lg" className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-5 h-5 mr-2" /> File Intake Inquiry
              </Button>
            </CardContent>
          </Card>
        )}

        <ResponsivePagination currentPage={currentPage} totalPages={totalPages} totalItems={sorted.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} itemLabel="inquiries" />
      </div>
    </CROLayout>
  );
}
