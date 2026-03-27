import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { UserPlus, Clock, CheckCircle, XCircle, Copy, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ResponsivePagination } from "@/components/ResponsivePagination";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;
type SortField = "name" | "email" | "companyName" | "createdAt" | "status";
type SortOrder = "asc" | "desc";

export default function CROApplications() {
  const utils = trpc.useUtils();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvedInfo, setApprovedInfo] = useState<{ email: string; tempPassword: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: applications, isLoading } = trpc.croApplications.list.useQuery();

  const approveMutation = trpc.croApplications.approve.useMutation({
    onSuccess: (data, variables) => {
      const app = applications?.find((a) => a.id === variables.id);
      if (app && data.tempPassword) {
        setApprovedInfo({ email: app.email, tempPassword: data.tempPassword });
      }
      toast.success("CRO application approved — credentials sent via email");
      utils.croApplications.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.croApplications.reject.useMutation({
    onSuccess: () => {
      toast.success("CRO application rejected");
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectionReason("");
      utils.croApplications.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

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
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredApps = (applications || []).filter((app) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      app.name.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      (app.companyName || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedApps = [...filteredApps].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    if (sortField === "createdAt") {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    } else if (typeof aVal === "string") {
      aVal = (aVal || "").toLowerCase();
      bVal = (bVal || "").toLowerCase();
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedApps.length / ITEMS_PER_PAGE);
  const paginatedApps = sortedApps.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">CRO Applications</h1>
              <p className="text-slate-600 mt-2 text-lg">Review and approve CRO signup requests</p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or company..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card className="border-slate-200"><CardContent className="py-16 text-center"><p className="text-slate-500">Loading applications...</p></CardContent></Card>
        ) : (
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-2xl font-serif text-slate-900">Applications</CardTitle>
              <CardDescription>Showing {paginatedApps.length} of {sortedApps.length} applications</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                      <div className="flex items-center">Name <SortIcon field="name" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("email")}>
                      <div className="flex items-center">Email <SortIcon field="email" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("companyName")}>
                      <div className="flex items-center">Company <SortIcon field="companyName" /></div>
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                      <div className="flex items-center">Date <SortIcon field="createdAt" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                      <div className="flex items-center">Status <SortIcon field="status" /></div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedApps.length > 0 ? paginatedApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{app.email}</TableCell>
                      <TableCell>{app.companyName || "--"}</TableCell>
                      <TableCell className="text-sm">{app.phone || "--"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(app.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        {app.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate({ id: app.id })} disabled={approveMutation.isPending}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setRejectingId(app.id); setRejectionReason(""); setRejectDialogOpen(true); }}>Reject</Button>
                          </div>
                        ) : app.status === "rejected" && app.rejectionReason ? (
                          <span className="text-xs text-red-600 truncate max-w-[150px] block" title={app.rejectionReason}>{app.rejectionReason}</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {searchQuery || statusFilter !== "all" ? "No applications match your filters" : "No CRO applications found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <ResponsivePagination currentPage={currentPage} totalPages={totalPages} totalItems={sortedApps.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} itemLabel="applications" />

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject CRO Application</DialogTitle>
              <DialogDescription>Provide a reason for rejection.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} className="border-slate-300" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button variant="destructive" onClick={() => { if (rejectingId) rejectMutation.mutate({ id: rejectingId, rejectionReason }); }} className="flex-1" disabled={rejectMutation.isPending || !rejectionReason.trim()}>
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approved Info Dialog */}
        <Dialog open={!!approvedInfo} onOpenChange={() => setApprovedInfo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>CRO Account Created</DialogTitle>
              <DialogDescription>Credentials have been sent to the CRO via email.</DialogDescription>
            </DialogHeader>
            {approvedInfo && (
              <div className="space-y-4 py-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium">{approvedInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Temporary Password</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-1 rounded border text-sm font-mono">{approvedInfo.tempPassword}</code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(approvedInfo.tempPassword); toast.success("Password copied"); }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-500">The CRO has received their credentials via email and should change their password after first login.</p>
                <Button onClick={() => setApprovedInfo(null)} className="w-full">Done</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
