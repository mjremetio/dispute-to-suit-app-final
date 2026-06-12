import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Clock, User, FileText, CheckCircle2, Plus, Upload, Eye,
  Loader2, Trash2, Calendar, AlertTriangle, Filter, Pencil, Download,
  Image, File, HardDrive, Tag, ArrowUpDown, Search, PenTool, ShieldCheck,
  UserPlus, UserCheck, Copy,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import CaseComments from "@/components/CaseComments";
import TaskEditDialog from "@/components/TaskEditDialog";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import EnhancedTimeline from "@/components/EnhancedTimeline";
import SignaturePad from "@/components/SignaturePad";
import SignaturePositioner from "@/components/SignaturePositioner";
import CaseStageTimeline from "@/components/CaseStageTimeline";
import { ExternalLinksManager } from "@/components/ExternalLinksManager";

type TaskFilter = "all" | "pending" | "in_progress" | "completed" | "cancelled";
type DocSort = "newest" | "oldest" | "name" | "size" | "category";

export default function CaseDetail() {
  const [, params] = useRoute("/admin/cases/:id");
  const caseId = params?.id ? parseInt(params.id) : 0;

  // Dialog states
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [taskSort, setTaskSort] = useState<"priority" | "dueDate" | "status" | "created">("created");

  // Edit task state
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);

  // Document states
  const [docSort, setDocSort] = useState<DocSort>("newest");
  const [docSearch, setDocSearch] = useState("");
  const [docCategoryFilter, setDocCategoryFilter] = useState("all");
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // E-Signature states
  const [signDocId, setSignDocId] = useState<number | null>(null);
  const [signDocName, setSignDocName] = useState("");
  const [signDocUrl, setSignDocUrl] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signStep, setSignStep] = useState<"draw" | "position">("draw");
  const [signDocPageCount, setSignDocPageCount] = useState(1);
  const [viewSignatureDoc, setViewSignatureDoc] = useState<any>(null);

  // Create account dialog state
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ username: "", password: "" });
  const [credentialsDialog, setCredentialsDialog] = useState<{
    open: boolean;
    username: string;
    password: string;
    clientName: string;
  }>({ open: false, username: "", password: "", clientName: "" });

  // Google Drive link edit state
  const [isEditingDriveLink, setIsEditingDriveLink] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState("");

  // New task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",

    dueDate: "" as string,
  });

  // Upload category state
  const [uploadCategory, setUploadCategory] = useState("supporting_document");

  const { data: caseData, isLoading, refetch: refetchCase } = trpc.cases.getById.useQuery({ id: caseId });
  const { data: clientInfo, refetch: refetchClient } = trpc.clients.getById.useQuery(
    { id: caseData?.clientId! },
    { enabled: !!caseData?.clientId }
  );
  const { data: tasks, refetch: refetchTasks } = trpc.tasks.listByCase.useQuery({ caseId });
  const { data: timeline, refetch: refetchTimeline } = trpc.cases.timeline.useQuery({ caseId });
  const { data: documents, refetch: refetchDocs } = trpc.documents.listByCase.useQuery({ caseId });
  
  // Fetch page count when a document is selected for signing
  const { data: pageCountData } = trpc.documents.getPageCount.useQuery(
    { id: signDocId! },
    { enabled: signDocId !== null }
  );
  
  // Update page count when data is fetched
  useEffect(() => {
    if (pageCountData) {
      setSignDocPageCount(pageCountData.pageCount);
    }
  }, [pageCountData]);
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
      setIsAddTaskOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "" });
      refetchTasks();
      refetchTimeline();
    },
    onError: (error) => toast.error(error.message || "Failed to create task"),
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated");
      setIsEditTaskOpen(false);
      setEditingTask(null);
      refetchTasks();
      refetchTimeline();
    },
    onError: (error) => toast.error(error.message || "Failed to update task"),
  });

  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      refetchTasks();
      refetchTimeline();
    },
    onError: (error) => toast.error(error.message || "Failed to delete task"),
  });

  const deleteDocMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      refetchDocs();
      refetchTimeline();
    },
    onError: (error) => toast.error(error.message || "Failed to delete document"),
  });

  const requestSignatureMutation = trpc.documents.requestSignature.useMutation({
    onSuccess: () => {
      toast.success("Signature requested for document");
      refetchDocs();
      refetchTimeline();
    },
    onError: (error) => toast.error(error.message || "Failed to request signature"),
  });

  const submitSignatureMutation = trpc.documents.submitSignature.useMutation({
    onSuccess: () => {
      toast.success("Document signed successfully");
      setSignDocId(null);
      setSignatureDataUrl(null);
      setSignerName("");
      refetchDocs();
      refetchTimeline();
    },
    onError: (error) => toast.error(error.message || "Failed to submit signature"),
  });

  const removeSignatureReqMutation = trpc.documents.removeSignatureRequirement.useMutation({
    onSuccess: () => {
      toast.success("Signature requirement removed");
      refetchDocs();
      refetchTimeline();
    },
    onError: (error) => toast.error(error.message || "Failed to remove signature requirement"),
  });

  const updateCaseMutation = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success("Case updated");
      refetchCase();
      refetchTimeline();
    },
    onError: (error) => toast.error(error.message || "Failed to update case"),
  });

  const createPortalAccountMutation = trpc.clients.createPortalAccount.useMutation({
    onSuccess: (data) => {
      toast.success("Client portal account created successfully");
      setIsCreateAccountOpen(false);
      setAccountForm({ username: "", password: "" });
      refetchClient();
      // Show credentials dialog
      if (data.credentials) {
        setCredentialsDialog({
          open: true,
          username: data.credentials.username,
          password: data.credentials.password,
          clientName: data.credentials.clientName,
        });
      }
    },
    onError: (error) => toast.error(error.message || "Failed to create portal account"),
  });

  const handleOpenCreateAccount = () => {
    setAccountForm({
      username: clientInfo?.email || "",
      password: "",
    });
    setIsCreateAccountOpen(true);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData?.clientId) return;
    createPortalAccountMutation.mutate({
      clientId: caseData.clientId,
      username: accountForm.username,
      password: accountForm.password,
    });
  };

  const handleProceedToPosition = () => {
    if (!signatureDataUrl) {
      toast.error("Please draw or upload your signature first");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Please enter the signer's full name");
      return;
    }
    setSignStep("position");
  };

  const handleConfirmSignature = (pos: { x: number; y: number; scale: number; pageNumber?: number }) => {
    if (!signDocId || !signatureDataUrl) return;
    submitSignatureMutation.mutate({
      id: signDocId,
      signatureDataUrl,
      signedByName: signerName.trim(),
      positionX: pos.x,
      positionY: pos.y,
      scale: pos.scale,
      pageNumber: pos.pageNumber,
    });
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caseId", caseId.toString());
    formData.append("category", uploadCategory);

    try {
      const response = await fetch("/api/files/upload-document", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      toast.success("Document uploaded successfully");
      setIsUploadDocOpen(false);
      setUploadCategory("supporting_document");
      refetchDocs();
      refetchTimeline();
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    const input: any = {
      caseId,
      title: newTask.title,
      description: newTask.description || undefined,
      priority: newTask.priority,
    };
    if (newTask.dueDate) {
      input.dueDate = new Date(newTask.dueDate);
    }
    createTask.mutate(input);
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTask.mutate({ id: taskId, status: newStatus as any });
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsEditTaskOpen(true);
  };

  const handleSaveEditTask = (taskId: number, updates: any) => {
    updateTask.mutate({ id: taskId, ...updates });
  };

  const handleDeleteTask = (taskId: number, taskTitle: string) => {
    if (confirm(`Delete task "${taskTitle}"? This cannot be undone.`)) {
      deleteTaskMutation.mutate({ id: taskId });
    }
  };

  const handleDeleteDoc = (docId: number, fileName: string) => {
    if (confirm(`Delete document "${fileName}"? This cannot be undone.`)) {
      deleteDocMutation.mutate({ id: docId });
    }
  };

  const handlePreviewDoc = (doc: any) => {
    setPreviewDoc(doc);
    setIsPreviewOpen(true);
  };

  // Priority sorting order
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let filtered = [...tasks];
    if (taskFilter !== "all") {
      filtered = filtered.filter(t => t.status === taskFilter);
    }
    filtered.sort((a, b) => {
      switch (taskSort) {
        case "priority":
          return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        case "dueDate": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        case "status":
          return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return filtered;
  }, [tasks, taskFilter, taskSort]);

  // Task stats
  const taskStats = useMemo(() => {
    if (!tasks) return { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 };
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === "pending").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      completed: tasks.filter(t => t.status === "completed").length,
      overdue: tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== "completed" && t.status !== "cancelled").length,
    };
  }, [tasks]);

  // Filtered and sorted documents
  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    let filtered = [...documents];

    // Category filter
    if (docCategoryFilter !== "all") {
      filtered = filtered.filter(d => d.category === docCategoryFilter);
    }

    // Search filter
    if (docSearch.trim()) {
      const search = docSearch.toLowerCase();
      filtered = filtered.filter(d =>
        d.fileName.toLowerCase().includes(search) ||
        (d.category && d.category.toLowerCase().includes(search)) ||
        ((d as any).uploaderName && (d as any).uploaderName.toLowerCase().includes(search))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (docSort) {
        case "oldest":
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case "name":
          return a.fileName.localeCompare(b.fileName);
        case "size":
          return (b.fileSize || 0) - (a.fileSize || 0);
        case "category":
          return (a.category || "").localeCompare(b.category || "");
        default: // newest
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    return filtered;
  }, [documents, docSort, docSearch, docCategoryFilter]);

  // Unique document categories for filter
  const docCategories = useMemo(() => {
    if (!documents) return [];
    const cats = Array.from(new Set(documents.filter(d => d.category).map(d => d.category!)));
    return cats.sort();
  }, [documents]);

  // Due date styling
  const getDueDateStyle = (dueDate: string | Date | null, status: string) => {
    if (!dueDate || status === "completed" || status === "cancelled") return "";
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return "text-red-500 font-semibold";
    if (isToday(date)) return "text-amber-500 font-semibold";
    if (isTomorrow(date)) return "text-amber-400";
    return "";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "low": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default: return "";
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="w-5 h-5 text-muted-foreground" />;
    if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-green-500" />;
    if (mimeType === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType.includes("word")) return <FileText className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Case not found</p>
          <Button asChild>
            <Link href="/admin/cases">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cases
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/admin/cases">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cases
            </Link>
          </Button>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{caseData.title}</h1>
              <p className="text-muted-foreground mt-2">
                Case #{caseData.id} • Created {format(new Date(caseData.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={
                caseData.status === "settled" || caseData.status === "settlement_paid_out" || caseData.status === "closed" ? "default" :
                caseData.status === "in_review" || caseData.status === "more_info_needed" ? "secondary" :
                "outline"
              }>
                {caseData.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant={
                caseData.priority === "urgent" ? "destructive" :
                caseData.priority === "high" ? "default" :
                "outline"
              }>
                {caseData.priority}
              </Badge>
            </div>
          </div>
        </div>

        {/* Case Info */}
        <Card>
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {caseData.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{caseData.description}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {caseData.caseType && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Case Type</h4>
                  <p className="text-sm text-muted-foreground">{caseData.caseType.replace(/_/g, " ")}</p>
                </div>
              )}
              {caseData.clientId && clientInfo && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Client</h4>
                  <p className="text-sm text-muted-foreground">
                    {clientInfo.firstName} {clientInfo.lastName}
                  </p>
                  {clientInfo.email && (
                    <p className="text-xs text-muted-foreground">{clientInfo.email}</p>
                  )}
                </div>
              )}
              {caseData.clientId && clientInfo && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Portal Account</h4>
                  {clientInfo.portalAccess ? (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">{clientInfo.portalUserEmail || "Active"}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">No account</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleOpenCreateAccount}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Create Account
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {caseData.settlementPaidOutDate && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Settlement Paid Out Date</h4>
                  <p className="text-sm text-muted-foreground">{format(new Date(caseData.settlementPaidOutDate), "MMM d, yyyy")}</p>
                </div>
              )}
            {caseData.dateSubmittedToAttorney && (
              <div>
                <h4 className="text-sm font-medium mb-1">Date Submitted to Attorney</h4>
                <p className="text-sm text-muted-foreground">{format(new Date(caseData.dateSubmittedToAttorney), "MMM d, yyyy")}</p>
              </div>
            )}
            </div>

          </CardContent>
        </Card>

        {/* Case Stage Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Case Progress</CardTitle>
            <CardDescription>Track this case through each stage from intake to resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <CaseStageTimeline
              currentStatus={caseData.status}
              createdAt={caseData.createdAt?.toString()}
              updatedAt={caseData.updatedAt?.toString()}
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="tasks">Tasks ({tasks?.length || 0})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents?.length || 0})</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({timeline?.length || 0})</TabsTrigger>
            <TabsTrigger value="links">External Links</TabsTrigger>
          </TabsList>

          {/* ===== TASKS TAB ===== */}
          <TabsContent value="tasks" className="space-y-4">
            {tasks && tasks.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
                <div className="bg-card border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{taskStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-500">{taskStats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-500">{taskStats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-500">{taskStats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                {taskStats.overdue > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{taskStats.overdue}</p>
                    <p className="text-xs text-red-400">Overdue</p>
                  </div>
                )}
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>Manage tasks for this case</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={taskFilter} onValueChange={(v) => setTaskFilter(v as TaskFilter)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <Filter className="w-3 h-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tasks</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={taskSort} onValueChange={(v) => setTaskSort(v as any)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created">Newest First</SelectItem>
                        <SelectItem value="priority">By Priority</SelectItem>
                        <SelectItem value="dueDate">By Due Date</SelectItem>
                        <SelectItem value="status">By Status</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setIsAddTaskOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTasks.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex flex-col sm:flex-row sm:items-start gap-3 p-3 md:p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                          task.status === "completed" ? "opacity-60" : ""
                        } ${
                          task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== "completed" && task.status !== "cancelled"
                            ? "border-red-500/30 bg-red-500/5"
                            : ""
                        }`}
                      >
                        <button
                          onClick={() => handleStatusChange(task.id, task.status === "completed" ? "pending" : "completed")}
                          className="mt-0.5 focus:outline-none"
                          title={task.status === "completed" ? "Mark as pending" : "Mark as completed"}
                        >
                          <CheckCircle2 className={`w-5 h-5 ${
                            task.status === "completed" ? "text-green-600" : "text-muted-foreground hover:text-green-500"
                          } transition-colors`} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 w-full">
                            <h4 className={`font-medium ${
                              task.status === "completed" ? "line-through text-muted-foreground" : ""
                            }`}>
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-1 shrink-0">
                              <Select
                                value={task.status}
                                onValueChange={(v) => handleStatusChange(task.id, v)}
                              >
                                <SelectTrigger className="h-6 w-[110px] text-xs border-none bg-transparent px-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleEditTask(task)}
                                      className="p-1 text-muted-foreground hover:text-blue-500 transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit task</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleDeleteTask(task.id, task.title)}
                                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete task</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span className={`flex items-center gap-1 ${getDueDateStyle(task.dueDate, task.status)}`}>
                              <Calendar className="w-3 h-3" />
                              {task.dueDate ? (
                                <>
                                  {format(new Date(task.dueDate), "MMM d, yyyy")}
                                  {isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== "completed" && task.status !== "cancelled" && (
                                    <AlertTriangle className="w-3 h-3 text-red-500 ml-1" />
                                  )}
                                </>
                              ) : "No due date"}
                            </span>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {taskFilter !== "all" ? (
                      <>No {taskFilter.replace(/_/g, " ")} tasks. <button className="text-primary underline" onClick={() => setTaskFilter("all")}>Show all tasks</button></>
                    ) : (
                      "No tasks yet. Add a task to get started."
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== DOCUMENTS TAB ===== */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>Files attached to this case</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setIsUploadDocOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
                {/* Document filters */}
                {documents && documents.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap mt-3">
                      <div className="relative w-full sm:flex-1 sm:max-w-xs">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search documents..."
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                    <Select value={docCategoryFilter} onValueChange={setDocCategoryFilter}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {docCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={docSort} onValueChange={(v) => setDocSort(v as DocSort)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <ArrowUpDown className="w-3 h-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="name">By Name</SelectItem>
                        <SelectItem value="size">By Size</SelectItem>
                        <SelectItem value="category">By Category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {filteredDocs.length > 0 ? (
                  <div className="space-y-3">
                    {filteredDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        {getFileIcon(doc.mimeType)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{doc.fileName}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                            {doc.category && (
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {doc.category.replace(/_/g, " ")}
                              </Badge>
                            )}
                            {doc.fileSize && (
                              <span className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3" />
                                {formatFileSize(doc.fileSize)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {(doc as any).uploaderName || "Unknown"}
                              {(doc as any).uploaderRole && (
                                <span className="opacity-60">({(doc as any).uploaderRole})</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                            </span>
                            {/* Signature status badge */}
                            {doc.requiresSignature && doc.signedAt ? (
                              <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-700 cursor-pointer" onClick={() => setViewSignatureDoc(doc)}>
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Signed by {doc.signedBy} • {format(new Date(doc.signedAt), "MMM d, yyyy")}
                              </Badge>
                            ) : doc.requiresSignature ? (
                              <Badge variant="destructive" className="text-[10px]">
                                <PenTool className="w-3 h-3 mr-1" />
                                Signature Required
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {/* Signature actions */}
                          {!doc.requiresSignature && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-500" onClick={() => requestSignatureMutation.mutate({ id: doc.id })}>
                                    <PenTool className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Request Signature</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {doc.requiresSignature && !doc.signedAt && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600" onClick={() => { 
                                    setSignDocId(doc.id); 
                                    setSignDocName(doc.fileName); 
                                    setSignDocUrl(doc.fileUrl); 
                                    setSignerName(""); 
                                    setSignatureDataUrl(null); 
                                    setSignStep("draw");
                                    setSignDocPageCount(1); // Will be updated by useEffect
                                  }}>
                                    <PenTool className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Sign Document</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {doc.signedAt && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500" onClick={() => setViewSignatureDoc(doc)}>
                                    <ShieldCheck className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Signature</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePreviewDoc(doc)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                                  onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {docSearch || docCategoryFilter !== "all" ? (
                      <>No documents match your filters. <button className="text-primary underline" onClick={() => { setDocSearch(""); setDocCategoryFilter("all"); }}>Clear filters</button></>
                    ) : (
                      "No documents yet. Upload a document to get started."
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== COMMENTS TAB ===== */}
          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Case Comments</CardTitle>
                <CardDescription>View and add comments for this case</CardDescription>
              </CardHeader>
              <CardContent>
                <CaseComments caseId={caseId} defaultExpanded={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TIMELINE TAB ===== */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Complete history of case activities with user attribution</CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedTimeline timeline={timeline || []} accentColor="blue" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== EXTERNAL LINKS TAB ===== */}
          <TabsContent value="links" className="space-y-4">
            <ExternalLinksManager caseId={caseId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>Create a task for case #{caseId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title *</Label>
              <Input
                id="taskTitle"
                placeholder="e.g., Review credit report discrepancies"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                placeholder="Describe what needs to be done..."
                rows={3}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="block"
                />
              </div>
            </div>
            <Button onClick={handleCreateTask} disabled={!newTask.title.trim() || createTask.isPending} className="w-full">
              {createTask.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" />Create Task</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <TaskEditDialog
        open={isEditTaskOpen}
        onOpenChange={setIsEditTaskOpen}
        task={editingTask}
        onSave={handleSaveEditTask}
        isPending={updateTask.isPending}
        caseId={caseId}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        document={previewDoc}
      />

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDocOpen} onOpenChange={setIsUploadDocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Attach a document to case #{caseId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Document Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_report">Credit Report</SelectItem>
                  <SelectItem value="dispute_letter">Dispute Letter</SelectItem>
                  <SelectItem value="bureau_response">Bureau Response</SelectItem>
                  <SelectItem value="government_id">Government-Issued ID</SelectItem>
                  <SelectItem value="collection_letters">Collection Letters/Notices</SelectItem>
                  <SelectItem value="call_records">Call Records/Logs</SelectItem>
                  <SelectItem value="debt_validation">Debt Validation Request</SelectItem>
                  <SelectItem value="contract_agreement">Contract/Agreement</SelectItem>
                  <SelectItem value="supporting_document">Supporting Evidence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-6 md:p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Select a file to upload (PDF, DOC, DOCX, JPG, PNG)
              </p>
              <label>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={uploadingFile}
                />
                <Button disabled={uploadingFile} asChild>
                  <span>
                    {uploadingFile ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" />Choose File</>
                    )}
                  </span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-muted-foreground text-center">Maximum file size: 50MB</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sign Document Dialog - Two Step: Draw/Upload then Position */}
      <Dialog open={signDocId !== null} onOpenChange={(open) => { if (!open) { setSignDocId(null); setSignDocName(""); setSignDocUrl(""); setSignatureDataUrl(null); setSignerName(""); setSignStep("draw"); } }}>
        <DialogContent className={signStep === "position" ? "max-w-[calc(100%-2rem)] sm:max-w-2xl" : "max-w-[calc(100%-2rem)] sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-amber-500" />
              {signStep === "draw" ? "Sign Document" : "Position Signature"}
            </DialogTitle>
            <DialogDescription>
              {signStep === "draw"
                ? "Draw or upload your signature below. You'll position it on the document next."
                : "Drag your signature to the desired position on the document, then confirm."}
            </DialogDescription>
          </DialogHeader>

          {signStep === "draw" ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="signerName">Full Legal Name *</Label>
                <Input
                  id="signerName"
                  placeholder="Enter your full legal name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Signature *</Label>
                <SignaturePad onSignatureChange={setSignatureDataUrl} />
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p>By signing this document, you acknowledge that this electronic signature is legally equivalent to a handwritten signature. The signature will be timestamped and recorded.</p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 border-t">
                <Button variant="outline" onClick={() => { setSignDocId(null); setSignDocUrl(""); setSignatureDataUrl(null); setSignerName(""); setSignStep("draw"); }}>Cancel</Button>
                <Button
                  onClick={handleProceedToPosition}
                  disabled={!signatureDataUrl || !signerName.trim()}
                >
                  Next: Position Signature
                </Button>
              </div>
            </div>
          ) : (
            signatureDataUrl && (
              <div className="py-2">
                <SignaturePositioner
                  signatureDataUrl={signatureDataUrl}
                  documentName={signDocName}
                  documentUrl={signDocUrl}
                  pageCount={signDocPageCount}
                  onPositionConfirm={handleConfirmSignature}
                  onCancel={() => setSignStep("draw")}
                />
                {submitSignatureMutation.isPending && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing document...
                  </div>
                )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* View Signature Dialog */}
      <Dialog open={viewSignatureDoc !== null} onOpenChange={(open) => { if (!open) setViewSignatureDoc(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              Document Signature
            </DialogTitle>
            <DialogDescription>
              Signature details for {viewSignatureDoc?.fileName}
            </DialogDescription>
          </DialogHeader>
          {viewSignatureDoc && (
            <div className="space-y-4 py-2">
              <div className="relative border rounded-lg p-4 bg-white" style={{ minHeight: "200px" }}>
                {viewSignatureDoc.signatureUrl ? (
                  viewSignatureDoc.signaturePositionX ? (
                    <div className="relative w-full" style={{ minHeight: "180px" }}>
                      {/* Simulated document background */}
                      <div className="absolute inset-0 p-3 opacity-30">
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-full" />
                          <div className="h-2 bg-gray-200 rounded w-5/6" />
                          <div className="h-2 bg-gray-200 rounded w-2/3" />
                          <div className="mt-3 h-2 bg-gray-200 rounded w-full" />
                          <div className="h-2 bg-gray-200 rounded w-4/5" />
                        </div>
                      </div>
                      <img
                        src={viewSignatureDoc.signatureUrl}
                        alt="Signature"
                        className="absolute max-w-[150px] max-h-[60px]"
                        style={{
                          left: `${viewSignatureDoc.signaturePositionX}%`,
                          top: `${viewSignatureDoc.signaturePositionY}%`,
                          transform: `translate(-50%, -50%) scale(${viewSignatureDoc.signatureScale || 1})`,
                        }}
                      />
                    </div>
                  ) : (
                    <img src={viewSignatureDoc.signatureUrl} alt="Signature" className="max-w-full h-auto mx-auto" />
                  )
                ) : (
                  <p className="text-center text-muted-foreground">Signature image not available</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Signed By</p>
                  <p className="font-medium">{viewSignatureDoc.signedBy}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Signed On</p>
                  <p className="font-medium">{viewSignatureDoc.signedAt ? format(new Date(viewSignatureDoc.signedAt), "MMM d, yyyy 'at' h:mm a") : "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Document</p>
                  <p className="font-medium truncate">{viewSignatureDoc.fileName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant="default" className="bg-green-600">Verified</Badge>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => removeSignatureReqMutation.mutate({ id: viewSignatureDoc.id })}>
                  Remove Signature
                </Button>
                <Button variant="outline" onClick={() => setViewSignatureDoc(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Client Portal Account Dialog */}
      <Dialog open={isCreateAccountOpen} onOpenChange={setIsCreateAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              Create Client Portal Account
            </DialogTitle>
            <DialogDescription>
              Create a portal login for {clientInfo?.firstName} {clientInfo?.lastName} so they can access their case.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="accountUsername">Username (Email) *</Label>
              <Input
                id="accountUsername"
                type="email"
                placeholder="client@example.com"
                value={accountForm.username}
                onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountPassword">Password *</Label>
              <Input
                id="accountPassword"
                type="password"
                placeholder="Minimum 6 characters"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateAccountOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createPortalAccountMutation.isPending || !accountForm.username || !accountForm.password}
              >
                {createPortalAccountMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                ) : (
                  <><UserPlus className="mr-2 h-4 w-4" />Create Account</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Dialog */}
      <Dialog open={credentialsDialog.open} onOpenChange={(open) => {
        if (!open) setCredentialsDialog({ open: false, username: "", password: "", clientName: "" });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              Portal Account Created
            </DialogTitle>
            <DialogDescription>
              Account created for <strong>{credentialsDialog.clientName}</strong>. Credentials have been sent to the client's email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Credentials email sent to <strong>{credentialsDialog.username}</strong></span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Important:</strong> Save these credentials now. You won't be able to see the password again.
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Username / Email</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={credentialsDialog.username} className="font-mono text-sm bg-muted" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsDialog.username);
                      toast.success("Username copied to clipboard");
                    }}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Password</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={credentialsDialog.password} className="font-mono text-sm bg-muted" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsDialog.password);
                      toast.success("Password copied to clipboard");
                    }}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
