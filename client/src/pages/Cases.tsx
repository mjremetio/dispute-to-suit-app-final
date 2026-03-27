import { CASE_TYPES } from "@shared/caseChecklist";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useMemo, useRef, useCallback } from "react";
import { Plus, Search, Filter, Eye, Edit, Trash2, Upload, MessageSquare, MessageSquarePlus, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Shield, RefreshCw, Lock, Copy, CheckCircle, Mail } from "lucide-react";
import { ResponsivePagination } from "@/components/ResponsivePagination";
import { Link } from "wouter";
import { format } from "date-fns";
const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "pending_review", label: "Pending Review" },
  { value: "in_review", label: "In Review" },
  { value: "more_info_needed", label: "More Information Needed" },
  { value: "ready_for_attorney", label: "Ready for Attorney" },
  { value: "sent_to_attorney", label: "Sent to Attorney" },
  { value: "accepted_by_attorney", label: "Accepted by Attorney" },
  { value: "rejected", label: "Rejected Case" },
  { value: "settled", label: "Settled" },
  { value: "settlement_paid_out", label: "Settlement Paid Out" },
  { value: "closed", label: "Closed" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];


const DOC_CATEGORIES = [
  { value: "supporting_document", label: "Supporting Document" },
  { value: "credit_report", label: "Credit Report" },
  { value: "dispute_letter", label: "Dispute Letter" },
  { value: "correspondence", label: "Correspondence" },
  { value: "legal_filing", label: "Legal Filing" },
  { value: "evidence", label: "Evidence" },
  { value: "other", label: "Other" },
];

const ITEMS_PER_PAGE = 10;

type SortField = "id" | "title" | "caseType" | "status" | "priority" | "createdAt" | "dateSubmittedToAttorney" | "settlementPaidOutDate";
type SortDirection = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS_ORDER: Record<string, number> = { new: 1, pending_review: 2, in_review: 3, more_info_needed: 4, ready_for_attorney: 5, sent_to_attorney: 6, accepted_by_attorney: 7, rejected: 8, settled: 9, settlement_paid_out: 10, closed: 11 };

export default function Cases() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteCase, setDeleteCase] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showComments, setShowComments] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Quick upload state
  const [uploadCaseId, setUploadCaseId] = useState<number | null>(null);
  const [uploadCategory, setUploadCategory] = useState("supporting_document");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick comment state
  const [commentCaseId, setCommentCaseId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  // Bulk operations state
  const [selectedCases, setSelectedCases] = useState<Set<number>>(new Set());
  const [bulkStatusValue, setBulkStatusValue] = useState<string>("");
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeletePassword, setBulkDeletePassword] = useState("");
  const [bulkDeleteError, setBulkDeleteError] = useState("");

  const [newCase, setNewCase] = useState({
    title: "",
    description: "",
    status: "new",
    priority: "medium",
    caseType: "fcra_violation",
    estimatedValue: "",
    clientId: "",
    assignedCroId: "",
  });

  const [editCase, setEditCase] = useState<any>(null);

  // Client credentials popup state
  const [credentialsDialog, setCredentialsDialog] = useState<{
    open: boolean;
    username: string;
    password: string;
    clientName: string;
  }>({ open: false, username: "", password: "", clientName: "" });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: cases, refetch } = trpc.cases.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();
  const croUsers = useMemo(() => allUsers?.filter(u => u.role === 'cro') || [], [allUsers]);

  // Get case IDs for comment queries
  const caseIds = useMemo(() => cases?.map(c => c.id) || [], [cases]);

  const { data: commentCounts } = trpc.cases.getCounts.useQuery(
    { caseIds },
    { enabled: caseIds.length > 0 }
  );

  const { data: latestComments, refetch: refetchComments } = trpc.cases.getLatest.useQuery(
    { caseIds },
    { enabled: caseIds.length > 0 && showComments }
  );

  const createCaseMutation = trpc.cases.create.useMutation({
    onSuccess: (data) => {
      toast.success("Case created successfully");
      setIsCreateDialogOpen(false);
      setNewCase({ title: "", description: "", status: "new", priority: "medium", caseType: "fcra_violation", estimatedValue: "", clientId: "", assignedCroId: "" });
      refetch();

      // Show credentials popup if a new client account was created
      if (data.newClientCredentials) {
        setCredentialsDialog({
          open: true,
          username: data.newClientCredentials.username,
          password: data.newClientCredentials.password,
          clientName: data.newClientCredentials.clientName,
        });
      }
    },
    onError: (error) => toast.error(error.message || "Failed to create case"),
  });

  const updateCaseMutation = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success("Case updated successfully");
      setIsEditDialogOpen(false);
      setEditCase(null);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to update case"),
  });

  const deleteCaseMutation = trpc.cases.delete.useMutation({
    onSuccess: () => {
      toast.success("Case deleted successfully");
      setDeleteCase(null);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to delete case"),
  });

  const addCommentMutation = trpc.cases.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comment added successfully");
      setCommentCaseId(null);
      setCommentText("");
      refetchComments();
    },
    onError: (error: any) => toast.error(error.message || "Failed to add comment"),
  });

  const bulkUpdateStatusMutation = trpc.cases.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated status for ${data.affected} case(s)`);
      setSelectedCases(new Set());
      setBulkStatusValue("");
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to update cases"),
  });

  const bulkDeleteMutation = trpc.cases.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.affected} case(s) successfully`);
      setSelectedCases(new Set());
      setShowBulkDeleteDialog(false);
      setBulkDeletePassword("");
      setBulkDeleteError("");
      refetch();
    },
    onError: (error) => {
      setBulkDeleteError(error.message || "Failed to delete cases");
    },
  });

  const handleCreateCase = () => {
    if (!newCase.title.trim()) { toast.error("Please enter a case title"); return; }
    createCaseMutation.mutate({
      title: newCase.title,
      description: newCase.description || undefined,
      priority: newCase.priority as any,
      caseType: newCase.caseType,
      estimatedValue: newCase.estimatedValue ? parseFloat(newCase.estimatedValue) : undefined,
      clientId: newCase.clientId && newCase.clientId !== 'none' ? parseInt(newCase.clientId) : undefined,
      assignedCroId: newCase.assignedCroId && newCase.assignedCroId !== 'none' ? parseInt(newCase.assignedCroId) : undefined,
    });
  };

  const handleCopyCredential = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  const handleEditCase = () => {
    if (!editCase?.title?.trim()) { toast.error("Please enter a case title"); return; }
    updateCaseMutation.mutate({
      id: editCase.id,
      title: editCase.title,
      description: editCase.description || undefined,
      status: editCase.status,
      priority: editCase.priority,
      caseType: editCase.caseType,
      estimatedValue: editCase.estimatedValue ? parseFloat(editCase.estimatedValue) : undefined,
      clientId: editCase.clientId && editCase.clientId !== 'none' ? parseInt(editCase.clientId) : null,
      assignedCroId: editCase.assignedCroId && editCase.assignedCroId !== 'none' ? parseInt(editCase.assignedCroId) : null,
      settlementPaidOutDate: editCase.settlementPaidOutDate ? new Date(editCase.settlementPaidOutDate) : undefined,
      dateSubmittedToAttorney: editCase.dateSubmittedToAttorney ? new Date(editCase.dateSubmittedToAttorney) : undefined,
      googleDriveLink: editCase.googleDriveLink || undefined,
    });
  };

  const handleDeleteCase = () => {
    if (deleteCase) deleteCaseMutation.mutate({ id: deleteCase });
  };

  const openEditDialog = (caseItem: any) => {
    setEditCase({
      id: caseItem.id, title: caseItem.title, description: caseItem.description || "",
      status: caseItem.status, priority: caseItem.priority,
      caseType: caseItem.caseType || "fcra_violation", estimatedValue: caseItem.estimatedValue?.toString() || "",
      assignedCroId: caseItem.assignedCroId?.toString() || "",
      clientId: caseItem.clientId?.toString() || "",
      settlementPaidOutDate: caseItem.settlementPaidOutDate || "",
      dateSubmittedToAttorney: caseItem.dateSubmittedToAttorney || "",
      googleDriveLink: caseItem.googleDriveLink || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!uploadCaseId) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", uploadCaseId.toString());
      formData.append("category", uploadCategory);
      const response = await fetch("/api/upload-document", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      toast.success("Document uploaded successfully");
      setUploadCaseId(null);
      setUploadCategory("supporting_document");
      refetch();
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddComment = () => {
    if (!commentCaseId || !commentText.trim()) { toast.error("Please enter a comment"); return; }
    addCommentMutation.mutate({ caseId: commentCaseId, comment: commentText });
  };

  const handleBulkStatusUpdate = () => {
    if (!bulkStatusValue || selectedCases.size === 0) return;
    bulkUpdateStatusMutation.mutate({
      caseIds: Array.from(selectedCases),
      status: bulkStatusValue as any,
    });
  };

  const handleBulkDelete = () => {
    if (!bulkDeletePassword.trim()) { setBulkDeleteError("Password is required"); return; }
    setBulkDeleteError("");
    bulkDeleteMutation.mutate({
      caseIds: Array.from(selectedCases),
      password: bulkDeletePassword,
    });
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDirection === "asc"
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  // Filter and sort cases
  const filteredAndSortedCases = useMemo(() => {
    let result = cases?.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || [];

    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "id":
          comparison = a.id - b.id;
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "caseType":
          comparison = (a.caseType || "").localeCompare(b.caseType || "");
          break;
        case "status":
          comparison = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
          break;
        case "priority":
          comparison = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "dateSubmittedToAttorney":
          comparison = (a.dateSubmittedToAttorney ? new Date(a.dateSubmittedToAttorney).getTime() : 0) - (b.dateSubmittedToAttorney ? new Date(b.dateSubmittedToAttorney).getTime() : 0);
          break;
        case "settlementPaidOutDate":
          comparison = (a.settlementPaidOutDate ? new Date(a.settlementPaidOutDate).getTime() : 0) - (b.settlementPaidOutDate ? new Date(b.settlementPaidOutDate).getTime() : 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [cases, searchTerm, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil((filteredAndSortedCases?.length || 0) / ITEMS_PER_PAGE);
  const paginatedCases = filteredAndSortedCases?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "settled": return "default";
      case "settlement_paid_out": return "default";
      case "in_review": return "secondary";
      case "more_info_needed": return "secondary";
      case "pending_review": return "outline";
      case "closed": return "outline";
      default: return "outline";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      default: return "outline";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Case Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage and track all litigation cases</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Case</DialogTitle>
                <DialogDescription>Enter the details for the new litigation case</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Case Title *</Label>
                  <Input id="title" placeholder="e.g., Smith v. Experian FCRA Violation" value={newCase.title} onChange={(e) => setNewCase({ ...newCase, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Detailed case description and background..." value={newCase.description} onChange={(e) => setNewCase({ ...newCase, description: e.target.value })} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={newCase.clientId} onValueChange={(value) => setNewCase({ ...newCase, clientId: value })}>
                    <SelectTrigger><SelectValue placeholder="Select a client (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>{client.firstName} {client.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedCro">Assigned CRO</Label>
                  <Select value={newCase.assignedCroId} onValueChange={(value) => setNewCase({ ...newCase, assignedCroId: value })}>
                    <SelectTrigger><SelectValue placeholder="Select a CRO (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No CRO assigned</SelectItem>
                      {croUsers.map((cro) => (
                        <SelectItem key={cro.id} value={cro.id.toString()}>{cro.name || cro.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="caseType">Case Type</Label>
                    <Select value={newCase.caseType} onValueChange={(value) => setNewCase({ ...newCase, caseType: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CASE_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={newCase.priority} onValueChange={(value) => setNewCase({ ...newCase, priority: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (<SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Initial Status</Label>
                    <Select value={newCase.status} onValueChange={(value) => setNewCase({ ...newCase, status: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                    <Input id="estimatedValue" type="number" placeholder="25000" value={newCase.estimatedValue} onChange={(e) => setNewCase({ ...newCase, estimatedValue: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCase} disabled={createCaseMutation.isPending}>
                  {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search, Filter, and Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search cases by title or description..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <div className="w-48 sm:w-56">
                  <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_OPTIONS.map((status) => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant={showComments ? "default" : "outline"} size="icon" onClick={() => setShowComments(!showComments)}>
                        {showComments ? <EyeOff className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{showComments ? "Hide comments column" : "Show comments column"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedCases.size > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{selectedCases.size} case(s) selected</span>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedCases(new Set())}>
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Bulk Status Update */}
                  <div className="flex items-center gap-2">
                    <Select value={bulkStatusValue} onValueChange={setBulkStatusValue}>
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        <SelectValue placeholder="Change status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={!bulkStatusValue || bulkUpdateStatusMutation.isPending}
                      onClick={handleBulkStatusUpdate}
                    >
                      {bulkUpdateStatusMutation.isPending ? "Updating..." : "Apply Status"}
                    </Button>
                  </div>

                  <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

                  {/* Bulk Delete */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setShowBulkDeleteDialog(true);
                      setBulkDeletePassword("");
                      setBulkDeleteError("");
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cases Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={selectedCases.size > 0 && selectedCases.size === paginatedCases?.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCases(new Set(paginatedCases?.map((c) => c.id) || []));
                          } else {
                            setSelectedCases(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[80px] cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("id")}>
                      <div className="flex items-center">Case # <SortIcon field="id" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("title")}>
                      <div className="flex items-center">Title <SortIcon field="title" /></div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("caseType")}>
                      <div className="flex items-center">Type <SortIcon field="caseType" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("status")}>
                      <div className="flex items-center">Status <SortIcon field="status" /></div>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("priority")}>
                      <div className="flex items-center">Priority <SortIcon field="priority" /></div>
                    </TableHead>
                    {showComments && <TableHead className="min-w-[200px]">Latest Comment</TableHead>}
                    <TableHead className="hidden lg:table-cell cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("createdAt")}>
                      <div className="flex items-center">Created <SortIcon field="createdAt" /></div>
                    </TableHead>
                    <TableHead className="hidden xl:table-cell cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("dateSubmittedToAttorney")}>
                      <div className="flex items-center">Sent to Attorney <SortIcon field="dateSubmittedToAttorney" /></div>
                    </TableHead>
                    <TableHead className="hidden xl:table-cell cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("settlementPaidOutDate")}>
                      <div className="flex items-center">Settlement Paid <SortIcon field="settlementPaidOutDate" /></div>
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">Assigned CRO</TableHead>

                    <TableHead className="w-[220px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCases && paginatedCases.length > 0 ? (
                    paginatedCases.map((caseItem) => (
                      <TableRow key={caseItem.id} className={selectedCases.has(caseItem.id) ? "bg-primary/5" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedCases.has(caseItem.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedCases);
                              if (e.target.checked) newSelected.add(caseItem.id);
                              else newSelected.delete(caseItem.id);
                              setSelectedCases(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">#{caseItem.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate max-w-[200px]">{caseItem.title}</span>
                            {commentCounts && (commentCounts as any)[caseItem.id] > 0 && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {(commentCounts as any)[caseItem.id]}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize hidden md:table-cell">
                          {caseItem.caseType?.replace(/_/g, " ") || "—"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={caseItem.status}
                            onValueChange={(value) => {
                              updateCaseMutation.mutate({
                                id: caseItem.id,
                                status: value as "new" | "pending_review" | "in_review" | "more_info_needed" | "ready_for_attorney" | "sent_to_attorney" | "accepted_by_attorney" | "rejected" | "settled" | "settlement_paid_out" | "closed",
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-[140px] sm:w-[160px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={getPriorityVariant(caseItem.priority)}>{caseItem.priority}</Badge>
                        </TableCell>
                        {showComments && (
                          <TableCell>
                            {latestComments && (latestComments as any)[caseItem.id] ? (
                              <div className="max-w-[250px]">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  {(latestComments as any)[caseItem.id].userName} &middot; {format(new Date((latestComments as any)[caseItem.id].createdAt), "MMM d, h:mm a")}
                                </p>
                                <p className="text-sm truncate">{(latestComments as any)[caseItem.id].comment}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No comments</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          {format(new Date(caseItem.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden xl:table-cell">
                          {caseItem.dateSubmittedToAttorney ? format(new Date(caseItem.dateSubmittedToAttorney), "MMM d, yyyy") : <span className="text-muted-foreground/50 italic text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden xl:table-cell">
                          {caseItem.settlementPaidOutDate ? format(new Date(caseItem.settlementPaidOutDate), "MMM d, yyyy") : <span className="text-muted-foreground/50 italic text-xs">—</span>}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {caseItem.assignedCroId ? (
                            <span className="text-sm">{croUsers.find(c => c.id === caseItem.assignedCroId)?.name || 'CRO #' + caseItem.assignedCroId}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <Link href={`/admin/cases/${caseItem.id}`}><Eye className="w-4 h-4" /></Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Case</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(caseItem)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Case</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUploadCaseId(caseItem.id)}>
                                    <Upload className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Upload Document</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCommentCaseId(caseItem.id); setCommentText(""); }}>
                                    <MessageSquarePlus className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Comment</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteCase(caseItem.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Case</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={showComments ? 9 : 8} className="text-center py-12 text-muted-foreground">
                        {searchTerm || statusFilter !== "all"
                          ? "No cases match your search criteria"
                          : "No cases yet. Create your first case to get started."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <ResponsivePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedCases?.length || 0}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemLabel="cases"
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Case</DialogTitle>
            <DialogDescription>Update the case details</DialogDescription>
          </DialogHeader>
          {editCase && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Case Title *</Label>
                <Input id="edit-title" value={editCase.title} onChange={(e) => setEditCase({ ...editCase, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" value={editCase.description} onChange={(e) => setEditCase({ ...editCase, description: e.target.value })} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client">Client</Label>
                <Select value={editCase.clientId || ""} onValueChange={(value) => setEditCase({ ...editCase, clientId: value })}>
                  <SelectTrigger><SelectValue placeholder="Select a client (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>{client.firstName} {client.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-caseType">Case Type</Label>
                  <Select value={editCase.caseType} onValueChange={(value) => setEditCase({ ...editCase, caseType: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CASE_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select value={editCase.priority} onValueChange={(value) => setEditCase({ ...editCase, priority: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (<SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editCase.status} onValueChange={(value) => setEditCase({ ...editCase, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-estimatedValue">Estimated Value ($)</Label>
                  <Input id="edit-estimatedValue" type="number" value={editCase.estimatedValue} onChange={(e) => setEditCase({ ...editCase, estimatedValue: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-settlementPaidOutDate">Settlement Paid Out Date</Label>
                  <Input 
                    id="edit-settlementPaidOutDate" 
                    type="date" 
                    value={editCase.settlementPaidOutDate ? new Date(editCase.settlementPaidOutDate).toISOString().split('T')[0] : ''} 
                    onChange={(e) => setEditCase({ ...editCase, settlementPaidOutDate: e.target.value ? new Date(e.target.value).toISOString() : '' })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dateSubmittedToAttorney">Date Submitted to Attorney</Label>
                  <Input 
                    id="edit-dateSubmittedToAttorney" 
                    type="date" 
                    value={editCase.dateSubmittedToAttorney ? new Date(editCase.dateSubmittedToAttorney).toISOString().split('T')[0] : ''} 
                    onChange={(e) => setEditCase({ ...editCase, dateSubmittedToAttorney: e.target.value ? new Date(e.target.value).toISOString() : '' })} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assignedCro">Assigned CRO</Label>
                <Select value={editCase.assignedCroId || ""} onValueChange={(value) => setEditCase({ ...editCase, assignedCroId: value })}>
                  <SelectTrigger><SelectValue placeholder="Select a CRO (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No CRO assigned</SelectItem>
                    {croUsers.map((cro) => (
                      <SelectItem key={cro.id} value={cro.id.toString()}>{cro.name || cro.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground italic mt-2">External storage links can be managed in the case detail page</p>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCase} disabled={updateCaseMutation.isPending}>
              {updateCaseMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Upload Document Dialog */}
      <Dialog open={uploadCaseId !== null} onOpenChange={() => { setUploadCaseId(null); setUploadCategory("supporting_document"); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a document to Case #{uploadCaseId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <input
                ref={fileInputRef}
                type="file"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }}
                disabled={uploadingFile}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setUploadCaseId(null); setUploadCategory("supporting_document"); }}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Comment Dialog */}
      <Dialog open={commentCaseId !== null} onOpenChange={() => { setCommentCaseId(null); setCommentText(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>Add a comment to Case #{commentCaseId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-comment">Comment</Label>
              <Textarea id="quick-comment" placeholder="Enter your comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={4} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setCommentCaseId(null); setCommentText(""); }}>Cancel</Button>
            <Button onClick={handleAddComment} disabled={addCommentMutation.isPending || !commentText.trim()}>
              {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={deleteCase !== null} onOpenChange={() => setDeleteCase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this case? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCaseMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete with Password Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={(open) => { if (!open) { setShowBulkDeleteDialog(false); setBulkDeletePassword(""); setBulkDeleteError(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Lock className="w-5 h-5" />
              Confirm Bulk Delete
            </DialogTitle>
            <DialogDescription>
              You are about to permanently delete <strong>{selectedCases.size} case(s)</strong> and all associated data (tasks, documents, comments, activity logs). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                For security, please enter your account password to confirm this operation.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-delete-password">Password</Label>
              <Input
                id="bulk-delete-password"
                type="password"
                placeholder="Enter your password..."
                value={bulkDeletePassword}
                onChange={(e) => { setBulkDeletePassword(e.target.value); setBulkDeleteError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleBulkDelete(); }}
                autoFocus
              />
              {bulkDeleteError && (
                <p className="text-sm text-destructive font-medium">{bulkDeleteError}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowBulkDeleteDialog(false); setBulkDeletePassword(""); setBulkDeleteError(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending || !bulkDeletePassword.trim()}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedCases.size} Case(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Credentials Popup */}
      <Dialog open={credentialsDialog.open} onOpenChange={(open) => {
        if (!open) setCredentialsDialog({ open: false, username: "", password: "", clientName: "" });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              New Client Account Created
            </DialogTitle>
            <DialogDescription>
              A portal account has been created for <strong>{credentialsDialog.clientName}</strong>. The credentials below have been sent to the client via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Credentials are being sent to the client's email address.</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Username / Email</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={credentialsDialog.username} className="font-mono text-sm bg-muted" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyCredential(credentialsDialog.username, "Username")}
                    className="flex-shrink-0"
                  >
                    {copiedField === "Username" ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={credentialsDialog.password} className="font-mono text-sm bg-muted" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyCredential(credentialsDialog.password, "Password")}
                    className="flex-shrink-0"
                  >
                    {copiedField === "Password" ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              The client will be required to change their password on first login.
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={() => setCredentialsDialog({ open: false, username: "", password: "", clientName: "" })}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
