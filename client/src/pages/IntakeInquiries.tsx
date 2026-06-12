import { CASE_TYPES } from "@shared/caseChecklist";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ClipboardList, Clock, CheckCircle, XCircle, Mail, FileText, Plus,
  Search, Eye, UserCheck, MailCheck, ArrowUpDown, ArrowUp, ArrowDown,
  Download, Image, FileImage, X, Copy
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ResponsivePagination } from "@/components/ResponsivePagination";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;
type SortField = "croName" | "clientName" | "clientEmail" | "createdAt" | "status";
type SortOrder = "asc" | "desc";

export default function IntakeInquiries() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [createCaseDialogOpen, setCreateCaseDialogOpen] = useState(false);
  const [caseForm, setCaseForm] = useState({
    title: "",
    description: "",
    caseType: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    estimatedValue: "",
    dueDate: "",
    googleDriveLink: "",
    // Client details
    clientFirstName: "",
    clientLastName: "",
    clientEmail: "",
    clientPhone: "",
    clientDateOfBirth: "",
    clientAddress: "",
    clientCity: "",
    clientState: "",
    clientZipCode: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Credentials are now handled via manual "Create Portal Account" button in CaseDetail

  const { data: inquiries, isLoading } = trpc.intakeInquiries.list.useQuery();

  const acceptMutation = trpc.intakeInquiries.accept.useMutation({
    onSuccess: () => {
      toast.success("Inquiry accepted");
      utils.intakeInquiries.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.intakeInquiries.reject.useMutation({
    onSuccess: () => {
      toast.success("Inquiry rejected");
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectionReason("");
      utils.intakeInquiries.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const notifyClientMutation = trpc.intakeInquiries.notifyClient.useMutation({
    onSuccess: () => {
      toast.success("Client notification sent");
      utils.intakeInquiries.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createCaseMutation = trpc.intakeInquiries.createCaseFromInquiry.useMutation({
    onSuccess: (data) => {
      toast.success("Case created successfully");
      setCreateCaseDialogOpen(false);
      utils.intakeInquiries.list.invalidate();

      // Navigate to the case detail page where admin can manually create portal account
      setLocation(`/admin/cases/${data.caseId}`);
    },
    onError: (err) => toast.error(err.message),
  });



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

  const handleReject = (id: number) => {
    setRejectingId(id);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!rejectingId || !rejectionReason.trim()) return;
    rejectMutation.mutate({ id: rejectingId, rejectionReason });
  };

  const openDetail = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setDetailDialogOpen(true);
  };

  const openCreateCase = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setCaseForm({
      title: `${inquiry.clientFirstName} ${inquiry.clientLastName} - Credit Repair`,
      description: `Intake inquiry from ${inquiry.croName} for ${inquiry.clientFirstName} ${inquiry.clientLastName}. Address: ${inquiry.clientFullAddress}`,
      caseType: "fcra_violation",
      priority: "medium",
      estimatedValue: "",
      dueDate: "",
      googleDriveLink: "",
      clientFirstName: inquiry.clientFirstName || "",
      clientLastName: inquiry.clientLastName || "",
      clientEmail: inquiry.clientEmail || "",
      clientPhone: "",
      clientDateOfBirth: inquiry.clientDateOfBirth ? new Date(inquiry.clientDateOfBirth).toISOString().split("T")[0] : "",
      clientAddress: inquiry.clientAddress || "",
      clientCity: inquiry.clientCity || "",
      clientState: inquiry.clientState || "",
      clientZipCode: inquiry.clientZipCode || "",
    });
    setCreateCaseDialogOpen(true);
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;

    // Validate required client fields
    if (!caseForm.clientFirstName.trim() || !caseForm.clientLastName.trim() || !caseForm.clientEmail.trim()) {
      toast.error("Client first name, last name, and email are required");
      return;
    }
    if (!caseForm.clientAddress.trim() || !caseForm.clientCity.trim() || !caseForm.clientState.trim() || !caseForm.clientZipCode.trim()) {
      toast.error("Client address, city, state, and zip code are required");
      return;
    }

    createCaseMutation.mutate({
      id: selectedInquiry.id,
      title: caseForm.title,
      description: caseForm.description || undefined,
      caseType: caseForm.caseType || undefined,
      priority: caseForm.priority,
      estimatedValue: caseForm.estimatedValue ? parseFloat(caseForm.estimatedValue) : undefined,
      dueDate: caseForm.dueDate ? new Date(caseForm.dueDate) : undefined,
      googleDriveLink: caseForm.googleDriveLink || undefined,
      clientFirstName: caseForm.clientFirstName,
      clientLastName: caseForm.clientLastName,
      clientEmail: caseForm.clientEmail,
      clientPhone: caseForm.clientPhone || undefined,
      clientDateOfBirth: caseForm.clientDateOfBirth ? new Date(caseForm.clientDateOfBirth) : undefined,
      clientAddress: caseForm.clientAddress || undefined,
      clientCity: caseForm.clientCity || undefined,
      clientState: caseForm.clientState || undefined,
      clientZipCode: caseForm.clientZipCode || undefined,
    });
  };

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

  const filteredInquiries = (inquiries || []).filter((inq) => {
    const matchesStatus = statusFilter === "all" || inq.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      inq.clientFirstName.toLowerCase().includes(q) ||
      inq.clientLastName.toLowerCase().includes(q) ||
      inq.croName.toLowerCase().includes(q) ||
      inq.clientEmail.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const sortedInquiries = [...filteredInquiries].sort((a, b) => {
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

  const totalPages = Math.ceil(sortedInquiries.length / ITEMS_PER_PAGE);
  const paginatedInquiries = sortedInquiries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">Intake Inquiries</h1>
              <p className="text-slate-600 mt-2 text-lg">Review and manage CRO intake submissions</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input placeholder="Search by client name, CRO name, or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 border-slate-300" />
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-slate-300">
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
            </div>
          </CardContent>
        </Card>

        {/* Inquiries List */}
        {isLoading ? (
          <Card className="border-slate-200"><CardContent className="py-16 text-center"><p className="text-slate-500">Loading inquiries...</p></CardContent></Card>
        ) : sortedInquiries.length > 0 ? (
          <div className="space-y-4">
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-2 cursor-pointer select-none flex items-center" onClick={() => handleSort("croName")}>CRO Name <SortIcon field="croName" /></div>
              <div className="col-span-2 cursor-pointer select-none flex items-center" onClick={() => handleSort("clientName")}>Client Name <SortIcon field="clientName" /></div>
              <div className="col-span-2 cursor-pointer select-none flex items-center" onClick={() => handleSort("clientEmail")}>Client Email <SortIcon field="clientEmail" /></div>
              <div className="col-span-2 cursor-pointer select-none flex items-center" onClick={() => handleSort("createdAt")}>Date <SortIcon field="createdAt" /></div>
              <div className="col-span-1 cursor-pointer select-none flex items-center" onClick={() => handleSort("status")}>Status <SortIcon field="status" /></div>
              <div className="col-span-3">Actions</div>
            </div>
            {paginatedInquiries.map((inquiry) => (
              <Card key={inquiry.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                <CardContent className="py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-start sm:items-center">
                    <div className="sm:col-span-2">
                      <p className="font-medium text-sm text-slate-900">{inquiry.croName}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="font-medium text-sm text-slate-900">{inquiry.clientFirstName} {inquiry.clientLastName}</p>
                    </div>
                    <div className="sm:col-span-2 text-sm text-slate-600 truncate">{inquiry.clientEmail}</div>
                    <div className="sm:col-span-2 text-sm text-slate-600">
                      {new Date(inquiry.createdAt).toLocaleDateString()}
                    </div>
                    <div className="sm:col-span-1">{getStatusBadge(inquiry.status)}</div>
                    <div className="sm:col-span-3 flex items-center gap-2 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(inquiry)}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>

                      {inquiry.status === "pending" && (
                        <>
                          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => acceptMutation.mutate({ id: inquiry.id })} disabled={acceptMutation.isPending}>
                            <UserCheck className="w-4 h-4 mr-1" /> Accept
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleReject(inquiry.id)}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}

                      {inquiry.status === "accepted" && (
                        <>
                          {!inquiry.clientNotificationSent && (
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200" onClick={() => notifyClientMutation.mutate({ id: inquiry.id })} disabled={notifyClientMutation.isPending}>
                              <MailCheck className="w-4 h-4 mr-1" /> Notify Client
                            </Button>
                          )}
                          {inquiry.clientNotificationSent && !inquiry.caseId && (
                            <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200" onClick={() => openCreateCase(inquiry)}>
                              <Plus className="w-4 h-4 mr-1" /> Create Case
                            </Button>
                          )}
                          {!inquiry.caseId && !inquiry.clientNotificationSent && (
                            <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200" onClick={() => openCreateCase(inquiry)}>
                              <Plus className="w-4 h-4 mr-1" /> Create Case
                            </Button>
                          )}
                          {inquiry.caseId && (
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => setLocation(`/admin/cases/${inquiry.caseId}`)}>
                              <FileText className="w-4 h-4 mr-1" /> Case #{inquiry.caseId}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {inquiry.status === "rejected" && inquiry.rejectionReason && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700"><span className="font-semibold">Rejection Reason:</span> {inquiry.rejectionReason}</p>
                    </div>
                  )}
                  {inquiry.status === "accepted" && inquiry.clientNotificationSent && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700">
                        <MailCheck className="w-3 h-3 inline mr-1" />
                        Client notified on {inquiry.clientNotificationSentAt ? new Date(inquiry.clientNotificationSentAt).toLocaleString() : "unknown date"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <ClipboardList className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Intake Inquiries</h3>
              <p className="text-slate-600 text-lg">No CRO intake inquiries match your filters</p>
            </CardContent>
          </Card>
        )}

        <ResponsivePagination currentPage={currentPage} totalPages={totalPages} totalItems={sortedInquiries.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} itemLabel="inquiries" />

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Intake Inquiry</DialogTitle>
              <DialogDescription>Please provide a reason for rejecting this inquiry. The CRO will see this reason.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="border-slate-300"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button variant="destructive" onClick={confirmReject} className="flex-1" disabled={rejectMutation.isPending || !rejectionReason.trim()}>
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Intake Inquiry Details</DialogTitle>
            </DialogHeader>
            {selectedInquiry && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">CRO Name</p>
                    <p className="font-medium">{selectedInquiry.croName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    {getStatusBadge(selectedInquiry.status)}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Client Name</p>
                    <p className="font-medium">{selectedInquiry.clientFirstName} {selectedInquiry.clientLastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Client Email</p>
                    <p className="font-medium break-all">{selectedInquiry.clientEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Date of Birth</p>
                    <p className="font-medium">{selectedInquiry.clientDateOfBirth ? new Date(selectedInquiry.clientDateOfBirth).toLocaleDateString() : "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Submitted</p>
                    <p className="font-medium">{new Date(selectedInquiry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Full Address</p>
                  <p className="font-medium">{selectedInquiry.clientFullAddress}</p>
                </div>
                {(() => {
                  const resolveUrl = (url: string) => {
                    if (url.startsWith("http://") || url.startsWith("https://")) return url;
                    return `/api/files/proxy?key=${encodeURIComponent(url)}`;
                  };
                  const isPreviewable = (url: string) => {
                    const lower = url.toLowerCase();
                    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(lower);
                  };
                  const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url.toLowerCase());
                  const getFileName = (url: string) => {
                    try {
                      const pathname = new URL(url).pathname;
                      return decodeURIComponent(pathname.split("/").pop() || "Document");
                    } catch { return decodeURIComponent(url.split("/").pop() || "Document"); }
                  };

                  const renderDocPreview = (url: string, idx: number) => {
                    const resolvedUrl = resolveUrl(url);
                    return (
                      <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                        {isPreviewable(url) ? (
                          <div>
                            <div className="cursor-pointer" onClick={() => setPreviewUrl(resolvedUrl)}>
                              <img
                                src={resolvedUrl}
                                alt={getFileName(url)}
                                className="max-h-48 w-full object-contain bg-slate-50 p-2"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileImage className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="text-sm text-slate-700 truncate">{getFileName(url)}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-indigo-600" onClick={() => setPreviewUrl(resolvedUrl)}>
                                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                                </Button>
                                <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-600">
                                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                                  </Button>
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : isPdf(url) ? (
                          <div>
                            <div className="h-48 bg-slate-50">
                              <iframe
                                src={resolvedUrl}
                                className="w-full h-full border-0"
                                title={getFileName(url)}
                              />
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                <span className="text-sm text-slate-700 truncate">{getFileName(url)}</span>
                              </div>
                              <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-600">
                                  <Download className="w-3.5 h-3.5 mr-1" /> Open
                                </Button>
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-3 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="text-sm text-slate-700 truncate">{getFileName(url)}</span>
                            </div>
                            <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600">
                                <Download className="w-3.5 h-3.5 mr-1" /> Download
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <>
                      {selectedInquiry.annualCreditReportScreenshot && (() => {
                        // Support both legacy single URL and new JSON array format
                        let proofUrls: string[] = [];
                        try {
                          const parsed = JSON.parse(selectedInquiry.annualCreditReportScreenshot);
                          proofUrls = Array.isArray(parsed) ? parsed : [selectedInquiry.annualCreditReportScreenshot];
                        } catch {
                          proofUrls = [selectedInquiry.annualCreditReportScreenshot];
                        }
                        return (
                          <div>
                            <p className="text-sm text-slate-500 mb-2">AnnualCreditReport.com Proof of Upload ({proofUrls.length} screenshot{proofUrls.length !== 1 ? 's' : ''})</p>
                            <div className="space-y-3">
                              {proofUrls.map((url: string, idx: number) => renderDocPreview(url, idx))}
                            </div>
                          </div>
                        );
                      })()}
                      {selectedInquiry.supportingDocuments && (() => {
                        const docs: string[] = JSON.parse(selectedInquiry.supportingDocuments);
                        return docs.length > 0 ? (
                          <div>
                            <p className="text-sm text-slate-500 mb-2">Supporting Documents ({docs.length})</p>
                            <div className="space-y-3">
                              {docs.map((url: string, idx: number) => renderDocPreview(url, idx))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Preview Overlay */}
        {previewUrl && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={previewUrl}
              alt="Document Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Create Case Dialog */}
        <Dialog open={createCaseDialogOpen} onOpenChange={setCreateCaseDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Create Case from Inquiry</DialogTitle>
              <DialogDescription>
                Create a case for {selectedInquiry?.clientFirstName} {selectedInquiry?.clientLastName} (CRO: {selectedInquiry?.croName}). Please verify all fields are complete.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCase} className="space-y-6 py-4">
              {/* Case Management Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">Case Management</h3>
                <div className="space-y-2">
                  <Label htmlFor="caseTitle">Case Title *</Label>
                  <Input
                    id="caseTitle"
                    value={caseForm.title}
                    onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
                    className="border-slate-300"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caseDescription">Description</Label>
                  <Textarea
                    id="caseDescription"
                    value={caseForm.description}
                    onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                    rows={3}
                    className="border-slate-300"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="caseType">Case Type</Label>
                    <Select value={caseForm.caseType} onValueChange={(v) => setCaseForm({ ...caseForm, caseType: v })}>
                      <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select case type" /></SelectTrigger>
                      <SelectContent>
                        {CASE_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="casePriority">Priority *</Label>
                    <Select value={caseForm.priority} onValueChange={(v: any) => setCaseForm({ ...caseForm, priority: v })}>
                      <SelectTrigger className="border-slate-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                    <Input
                      id="estimatedValue"
                      type="number"
                      placeholder="25000"
                      value={caseForm.estimatedValue}
                      onChange={(e) => setCaseForm({ ...caseForm, estimatedValue: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={caseForm.dueDate}
                      onChange={(e) => setCaseForm({ ...caseForm, dueDate: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleDriveLink">Google Drive Link</Label>
                  <Input
                    id="googleDriveLink"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={caseForm.googleDriveLink}
                    onChange={(e) => setCaseForm({ ...caseForm, googleDriveLink: e.target.value })}
                    className="border-slate-300"
                  />
                </div>
              </div>

              {/* Client Details Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">Client Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientFirstName">First Name *</Label>
                    <Input
                      id="clientFirstName"
                      value={caseForm.clientFirstName}
                      onChange={(e) => setCaseForm({ ...caseForm, clientFirstName: e.target.value })}
                      className="border-slate-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientLastName">Last Name *</Label>
                    <Input
                      id="clientLastName"
                      value={caseForm.clientLastName}
                      onChange={(e) => setCaseForm({ ...caseForm, clientLastName: e.target.value })}
                      className="border-slate-300"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={caseForm.clientEmail}
                      onChange={(e) => setCaseForm({ ...caseForm, clientEmail: e.target.value })}
                      className="border-slate-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Phone</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={caseForm.clientPhone}
                      onChange={(e) => setCaseForm({ ...caseForm, clientPhone: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientDateOfBirth">Date of Birth</Label>
                  <Input
                    id="clientDateOfBirth"
                    type="date"
                    value={caseForm.clientDateOfBirth}
                    onChange={(e) => setCaseForm({ ...caseForm, clientDateOfBirth: e.target.value })}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientAddress">Street Address *</Label>
                  <Input
                    id="clientAddress"
                    value={caseForm.clientAddress}
                    onChange={(e) => setCaseForm({ ...caseForm, clientAddress: e.target.value })}
                    className="border-slate-300"
                    placeholder="123 Main St, Apt 4B"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                  <div className="sm:col-span-3 space-y-2">
                    <Label htmlFor="clientCity">City *</Label>
                    <Input
                      id="clientCity"
                      value={caseForm.clientCity}
                      onChange={(e) => setCaseForm({ ...caseForm, clientCity: e.target.value })}
                      className="border-slate-300"
                      placeholder="Los Angeles"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="clientState">State *</Label>
                    <Input
                      id="clientState"
                      value={caseForm.clientState}
                      onChange={(e) => setCaseForm({ ...caseForm, clientState: e.target.value })}
                      className="border-slate-300"
                      placeholder="CA"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-2">
                    <Label htmlFor="clientZipCode">ZIP *</Label>
                    <Input
                      id="clientZipCode"
                      value={caseForm.clientZipCode}
                      onChange={(e) => setCaseForm({ ...caseForm, clientZipCode: e.target.value })}
                      className="border-slate-300"
                      placeholder="90001"
                      required
                    />
                  </div>
                </div>
              </div>

              {selectedInquiry && (
                <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
                  <p className="font-semibold text-slate-700">Assigned CRO: {selectedInquiry.croName}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setCreateCaseDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={createCaseMutation.isPending}>
                  {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>


    </DashboardLayout>
  );
}
