import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Power,
  KeyRound,
  Copy,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ResponsivePagination } from "@/components/ResponsivePagination";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;
type SortField = "name" | "email" | "assignedClientCount" | "uploadCount" | "pendingReviewCount" | "lastSignedIn";
type SortOrder = "asc" | "desc";

export default function CROManagement() {
  const utils = trpc.useUtils();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCroId, setSelectedCroId] = useState<number | null>(null);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<{ id: number; name: string; isActive: boolean } | null>(null);
  const [resetPasswordInfo, setResetPasswordInfo] = useState<{ email: string; tempPassword: string } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string; email: string } | null>(null);

  const { data: cros, isLoading } = trpc.croManagement.list.useQuery();

  const { data: croDetail, isLoading: isDetailLoading } = trpc.croManagement.getById.useQuery(
    { id: selectedCroId! },
    { enabled: !!selectedCroId && detailDialogOpen }
  );

  const toggleActiveMutation = trpc.croManagement.toggleActive.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`CRO ${variables.isActive ? "activated" : "deactivated"} successfully`);
      setToggleConfirmOpen(false);
      setToggleTarget(null);
      utils.croManagement.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPasswordMutation = trpc.croManagement.resetPassword.useMutation({
    onSuccess: (data) => {
      if (resetTarget) {
        setResetPasswordInfo({ email: resetTarget.email, tempPassword: data.tempPassword });
      }
      setResetConfirmOpen(false);
      setResetTarget(null);
      toast.success("Password reset successfully — credentials sent via email");
      utils.croManagement.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortOrder === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const filteredCros = (cros || []).filter((cro) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (cro.name || "").toLowerCase().includes(q) || (cro.email || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? cro.isActive : !cro.isActive);
    return matchesSearch && matchesStatus;
  });

  const sortedCros = [...filteredCros].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    if (sortField === "lastSignedIn") {
      aVal = a.lastSignedIn ? new Date(a.lastSignedIn).getTime() : 0;
      bVal = b.lastSignedIn ? new Date(b.lastSignedIn).getTime() : 0;
    } else if (typeof aVal === "string") {
      aVal = (aVal || "").toLowerCase();
      bVal = (bVal || "").toLowerCase();
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCros.length / ITEMS_PER_PAGE);
  const paginatedCros = sortedCros.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalCros = (cros || []).length;
  const activeCros = (cros || []).filter((c) => c.isActive).length;
  const inactiveCros = totalCros - activeCros;
  const totalAssignedClients = (cros || []).reduce((sum, c) => sum + c.assignedClientCount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">CRO Management</h1>
              <p className="text-slate-600 mt-2 text-lg">Manage Credit Repair Organizations and monitor their activity</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total CROs</p>
                  <p className="text-2xl font-bold">{totalCros}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{activeCros}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold">{inactiveCros}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Assigned Clients</p>
                  <p className="text-2xl font-bold">{totalAssignedClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* CRO Table */}
        {isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <p className="text-slate-500">Loading CROs...</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-2xl font-serif text-slate-900">CRO Directory</CardTitle>
              <CardDescription>
                Showing {paginatedCros.length} of {sortedCros.length} CROs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                      <div className="flex items-center">
                        Name <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("email")}>
                      <div className="flex items-center">
                        Email <SortIcon field="email" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("assignedClientCount")}>
                      <div className="flex items-center">
                        Clients <SortIcon field="assignedClientCount" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("uploadCount")}>
                      <div className="flex items-center">
                        Uploads <SortIcon field="uploadCount" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("pendingReviewCount")}>
                      <div className="flex items-center">
                        Pending <SortIcon field="pendingReviewCount" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("lastSignedIn")}>
                      <div className="flex items-center">
                        Last Active <SortIcon field="lastSignedIn" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCros.length > 0 ? (
                    paginatedCros.map((cro) => (
                      <TableRow key={cro.id}>
                        <TableCell className="font-medium">{cro.name || "--"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{cro.email || "--"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {cro.assignedClientCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {cro.uploadCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cro.pendingReviewCount > 0 ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Clock className="w-3 h-3 mr-1" />
                              {cro.pendingReviewCount}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cro.lastSignedIn ? format(new Date(cro.lastSignedIn), "MMM d, yyyy") : "Never"}
                        </TableCell>
                        <TableCell>
                          {cro.isActive ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="View Details"
                              onClick={() => {
                                setSelectedCroId(cro.id);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title={cro.isActive ? "Deactivate" : "Activate"}
                              onClick={() => {
                                setToggleTarget({ id: cro.id, name: cro.name || "CRO", isActive: !cro.isActive });
                                setToggleConfirmOpen(true);
                              }}
                            >
                              <Power className={`w-4 h-4 ${cro.isActive ? "text-red-500" : "text-green-500"}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Reset Password"
                              onClick={() => {
                                setResetTarget({ id: cro.id, name: cro.name || "CRO", email: cro.email || "" });
                                setResetConfirmOpen(true);
                              }}
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        {searchQuery || statusFilter !== "all" ? "No CROs match your filters" : "No CROs found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <ResponsivePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedCros.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemLabel="CROs"
        />

        {/* CRO Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CRO Details</DialogTitle>
              <DialogDescription>View detailed information about this CRO</DialogDescription>
            </DialogHeader>
            {isDetailLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : croDetail ? (
              <div className="space-y-6 py-4">
                {/* CRO Info */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Name</p>
                      <p className="font-medium">{croDetail.name || "--"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium break-all">{croDetail.email || "--"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <p>
                        {croDetail.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Last Sign In</p>
                      <p className="font-medium">
                        {croDetail.lastSignedIn ? format(new Date(croDetail.lastSignedIn), "MMM d, yyyy h:mm a") : "Never"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clients */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Clients ({croDetail.clients.length})
                  </h3>
                  {croDetail.clients.length > 0 ? (
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Stage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {croDetail.clients.map((client: any) => (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">
                                {client.firstName} {client.lastName}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{client.email || "--"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{client.stage || "lead"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No clients assigned</p>
                  )}
                </div>

                {/* Cases */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Assigned Cases ({croDetail.cases.length})
                  </h3>
                  {croDetail.cases.length > 0 ? (
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {croDetail.cases.slice(0, 10).map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {(c.status || "").replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "--"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {croDetail.cases.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          ...and {croDetail.cases.length - 10} more cases
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No cases assigned</p>
                  )}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Toggle Active Confirmation */}
        <AlertDialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {toggleTarget?.isActive ? "Activate" : "Deactivate"} CRO
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {toggleTarget?.isActive ? "activate" : "deactivate"}{" "}
                <strong>{toggleTarget?.name}</strong>?
                {!toggleTarget?.isActive && " They will no longer be able to log in or access the CRO portal."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={toggleTarget?.isActive ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                onClick={() => {
                  if (toggleTarget) {
                    toggleActiveMutation.mutate({ id: toggleTarget.id, isActive: toggleTarget.isActive });
                  }
                }}
                disabled={toggleActiveMutation.isPending}
              >
                {toggleActiveMutation.isPending
                  ? "Processing..."
                  : toggleTarget?.isActive
                    ? "Activate"
                    : "Deactivate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset Password Confirmation */}
        <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset CRO Password</AlertDialogTitle>
              <AlertDialogDescription>
                This will generate a new temporary password for <strong>{resetTarget?.name}</strong> and send it to their email ({resetTarget?.email}). The CRO should change their password after logging in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (resetTarget) {
                    resetPasswordMutation.mutate({ id: resetTarget.id });
                  }
                }}
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Password Reset Info Dialog */}
        <Dialog open={!!resetPasswordInfo} onOpenChange={() => setResetPasswordInfo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Password Reset Successful</DialogTitle>
              <DialogDescription>New credentials have been sent to the CRO via email.</DialogDescription>
            </DialogHeader>
            {resetPasswordInfo && (
              <div className="space-y-4 py-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium">{resetPasswordInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Temporary Password</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-1 rounded border text-sm font-mono">{resetPasswordInfo.tempPassword}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          navigator.clipboard.writeText(resetPasswordInfo.tempPassword);
                          toast.success("Password copied");
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  The CRO has received their new credentials via email and should change their password after logging in.
                </p>
                <Button onClick={() => setResetPasswordInfo(null)} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
