import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  MessageSquare,
  Clock,
  Upload,
  File,
  PenTool,
  Check,
  Eye,
  Send,
  ArrowRight,
  Activity,
  UserCheck,
  CheckCircle,
  Image,
  FileSignature,
  Loader2,
  Download,
  FolderOpen,
  Save,
  X,
} from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import CaseStageTimeline from "@/components/CaseStageTimeline";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import { Link2 } from "lucide-react";

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

const pipelineSteps = [
  "new", "pending_review", "in_review", "ready_for_attorney",
  "sent_to_attorney", "accepted_by_attorney", "settled", "settlement_paid_out", "closed",
];

function getStepIndex(status: string) {
  const idx = pipelineSteps.indexOf(status);
  return idx >= 0 ? idx : 0;
}

const actionIcons: Record<string, ReactNode> = {
  status_change: <ArrowRight className="w-4 h-4" />,
  case_status_changed: <ArrowRight className="w-4 h-4" />,
  comment_added: <MessageSquare className="w-4 h-4" />,
  document_uploaded: <FileText className="w-4 h-4" />,
  document_signed: <UserCheck className="w-4 h-4" />,
  document_signed_by_client: <UserCheck className="w-4 h-4" />,
  assignment_changed: <UserCheck className="w-4 h-4" />,
};

const actionColors: Record<string, string> = {
  status_change: "bg-blue-100 text-blue-600",
  case_status_changed: "bg-blue-100 text-blue-600",
  comment_added: "bg-purple-100 text-purple-600",
  document_uploaded: "bg-emerald-100 text-emerald-600",
  document_signed: "bg-green-100 text-green-600",
  document_signed_by_client: "bg-green-100 text-green-600",
  assignment_changed: "bg-amber-100 text-amber-600",
};

const actionLabels: Record<string, string> = {
  status_change: "Status Changed",
  case_status_changed: "Status Changed",
  comment_added: "Comment Added",
  document_uploaded: "Document Uploaded",
  document_signed: "Document Signed",
  document_signed_by_client: "Document Signed",
  assignment_changed: "Assignment Changed",
};

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// Enhanced Signature Pad - supports drawing, uploading, and saved templates
function SignaturePad({ onSign }: { onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [mode, setMode] = useState<"draw" | "upload" | "templates">("draw");
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [currentSignatureDataUrl, setCurrentSignatureDataUrl] = useState<string | null>(null);

  const { data: templates, refetch: refetchTemplates } = trpc.signatureTemplates.list.useQuery();
  const createTemplate = trpc.signatureTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Signature template saved");
      setShowSaveDialog(false);
      setTemplateName("");
      refetchTemplates();
    },
    onError: (error) => toast.error(error.message || "Failed to save template"),
  });
  const deleteTemplate = trpc.signatureTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      refetchTemplates();
    },
    onError: (error) => toast.error(error.message || "Failed to delete template"),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearDraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Signature image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadedPreview(dataUrl);
      setHasContent(true);
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadedPreview(null);
    setHasContent(false);
    if (uploadRef.current) uploadRef.current.value = "";
  };

  const handleApply = () => {
    if (mode === "draw") {
      if (canvasRef.current && hasContent) {
        onSign(canvasRef.current.toDataURL("image/png"));
      }
    } else if ((mode === "upload" || mode === "templates") && uploadedPreview) {
      onSign(uploadedPreview);
    }
  };

  const switchMode = (newMode: "draw" | "upload" | "templates") => {
    setMode(newMode);
    setHasContent(false);
    setUploadedPreview(null);
    if (uploadRef.current) uploadRef.current.value = "";
    if (newMode === "draw") {
      setTimeout(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <Button
          variant={mode === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("draw")}
          className={mode === "draw" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
        >
          <PenTool className="w-4 h-4 mr-1" /> Draw
        </Button>
        <Button
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("upload")}
          className={mode === "upload" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
        >
          <Upload className="w-4 h-4 mr-1" /> Upload
        </Button>
        <Button
          variant={mode === "templates" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("templates")}
          className={mode === "templates" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
        >
          <FolderOpen className="w-4 h-4 mr-1" /> Saved ({templates?.length || 0})
        </Button>
      </div>

      {mode === "draw" ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Draw your signature below:</p>
          <canvas ref={canvasRef} height={160}
            className="border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair w-full touch-none"
            style={{ background: 'repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px' }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearDraw}>Clear</Button>
            {hasContent && (
              <Button variant="outline" size="sm" onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  setCurrentSignatureDataUrl(canvas.toDataURL("image/png"));
                  setShowSaveDialog(true);
                }
              }}>
                <Save className="w-4 h-4 mr-1" /> Save as Template
              </Button>
            )}
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleApply} disabled={!hasContent}>
              <PenTool className="w-4 h-4 mr-1" /> Apply Signature
            </Button>
          </div>
        </div>
      ) : mode === "upload" ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Upload your e-signature image (PNG, JPG):</p>
          {!uploadedPreview ? (
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
              onClick={() => uploadRef.current?.click()}
            >
              <Image className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Click to upload signature image</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
            </div>
          ) : (
            <div className="border-2 border-slate-300 rounded-lg p-4 bg-white">
              <p className="text-xs text-slate-500 mb-2">Signature preview:</p>
              <div className="flex items-center justify-center bg-slate-50 rounded p-3 min-h-[100px]">
                <img src={uploadedPreview} alt="Uploaded signature" className="max-h-[120px] max-w-full object-contain" />
              </div>
            </div>
          )}
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          <div className="flex gap-2">
            {uploadedPreview && (
              <>
                <Button variant="outline" size="sm" onClick={clearUpload}>Clear</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setCurrentSignatureDataUrl(uploadedPreview);
                  setShowSaveDialog(true);
                }}>
                  <Save className="w-4 h-4 mr-1" /> Save as Template
                </Button>
              </>
            )}
            {!uploadedPreview && (
              <Button variant="outline" size="sm" onClick={() => uploadRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> Choose File
              </Button>
            )}
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleApply} disabled={!hasContent || !uploadedPreview}>
              <PenTool className="w-4 h-4 mr-1" /> Apply Signature
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {templates && templates.length > 0 ? (
            <>
              <p className="text-sm text-slate-600">Select a saved signature to use:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`border-2 rounded-lg overflow-hidden bg-white transition-colors ${
                      uploadedPreview === template.signatureUrl ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <div className="p-3 flex flex-col gap-2">
                      <img
                        src={template.signatureUrl}
                        alt={template.name}
                        className="w-full h-16 object-contain bg-slate-50 rounded cursor-pointer"
                        onClick={() => {
                          setUploadedPreview(template.signatureUrl);
                          setHasContent(true);
                        }}
                      />
                      <p className="text-xs font-medium truncate">{template.name}</p>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => {
                            onSign(template.signatureUrl);
                            toast.success("Signature applied from template");
                          }}
                        >
                          <PenTool className="w-3 h-3 mr-1" /> Apply
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteTemplate.mutate({ id: template.id })}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No saved signatures yet</p>
              <p className="text-xs text-slate-400 mt-1">Draw or upload a signature, then save it as a template for quick reuse</p>
            </div>
          )}
        </div>
      )}

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Save Signature Template</DialogTitle>
            <DialogDescription>
              Give your signature a name so you can quickly reuse it when signing future documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentSignatureDataUrl && (
              <div className="border rounded-lg p-3 bg-slate-50">
                <img src={currentSignatureDataUrl} alt="Signature preview" className="max-h-[80px] mx-auto object-contain" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Template Name</label>
              <input
                type="text"
                placeholder="e.g., My Signature, Initials"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                if (!templateName.trim()) {
                  toast.error("Please enter a template name");
                  return;
                }
                if (!currentSignatureDataUrl) {
                  toast.error("No signature to save");
                  return;
                }
                createTemplate.mutate({
                  name: templateName,
                  signatureUrl: currentSignatureDataUrl,
                });
              }}
              disabled={createTemplate.isPending}
            >
              {createTemplate.isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Overview Tab
function OverviewTab({ caseData }: { caseData: any }) {
  const currentStepIdx = getStepIndex(caseData.status);
  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          {caseData.description && <p className="text-slate-700 mb-4">{caseData.description}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
            <div><p className="text-slate-500">Priority</p><p className="font-medium capitalize">{caseData.priority}</p></div>
            <div><p className="text-slate-500">Created</p><p className="font-medium">{new Date(caseData.createdAt).toLocaleDateString()}</p></div>
            <div><p className="text-slate-500">Due Date</p><p className="font-medium">{caseData.dueDate ? new Date(caseData.dueDate).toLocaleDateString() : "Not set"}</p></div>
            <div><p className="text-slate-500">Type</p><p className="font-medium">{caseData.caseType || "Not specified"}</p></div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-serif">Case Progress</CardTitle></CardHeader>
        <CardContent>
          <CaseStageTimeline
            currentStatus={caseData.status}
            createdAt={caseData.createdAt}
            updatedAt={caseData.updatedAt}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Documents Tab with auto-generated AOC, signature (draw/upload), and preview
function DocumentsTab({ caseId }: { caseId: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: documents, isLoading } = trpc.clientPortal.getCaseDocuments.useQuery({ caseId }, { enabled: !!caseId });
  const [signDocId, setSignDocId] = useState<number | null>(null);
  const [signDocName, setSignDocName] = useState("");
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [aocAutoTriggered, setAocAutoTriggered] = useState(false);

  const [uploading, setUploading] = useState(false);
  const signMutation = trpc.clientPortal.submitSignature.useMutation({
    onSuccess: () => {
      toast.success("Document signed successfully!");
      setSignDocId(null);
      // Refetch documents so signed version appears in list and preview
      utils.clientPortal.getCaseDocuments.invalidate({ caseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const generateAOCMutation = trpc.clientPortal.generateAOC.useMutation({
    onSuccess: (data) => {
      toast.success("Assignment of Claim document generated and ready for signature");
      utils.clientPortal.getCaseDocuments.invalidate({ caseId });
    },
    onError: (err) => {
      // Don't show error for auto-generation if AOC already exists
      if (!aocAutoTriggered) toast.error(err.message);
    },
  });

  // Auto-generate AOC when documents load and none exists yet
  const hasAOCDocument = documents?.some((d: any) => d.fileName.startsWith("AOC-") && d.category === "legal_doc");
  useEffect(() => {
    if (!isLoading && documents && !hasAOCDocument && !aocAutoTriggered && !generateAOCMutation.isPending) {
      setAocAutoTriggered(true);
      generateAOCMutation.mutate({ caseId });
    }
  }, [isLoading, documents, hasAOCDocument]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", caseId.toString());
        formData.append("category", "client_upload");
        const response = await fetch("/api/files/upload-document", { method: "POST", body: formData });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Upload failed");
        }
        toast.success(`Uploaded: ${file.name}`);
        utils.clientPortal.getCaseDocuments.invalidate({ caseId });
      } catch (err: any) { toast.error(err.message || "Upload failed"); }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSign = (signatureDataUrl: string) => {
    if (!signDocId) return;
    signMutation.mutate({ documentId: signDocId, signatureDataUrl, signedByName: user?.name || "Client" });
  };

  // Helper to open preview with fresh data (refetches doc after signing)
  const openPreview = (doc: any) => {
    // Add cache-bust to fileUrl for signed docs so preview always shows latest
    const previewUrl = doc.signedAt ? `${doc.fileUrl}${doc.fileUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : doc.fileUrl;
    setPreviewDoc({ ...doc, fileUrl: previewUrl });
    setIsPreviewOpen(true);
  };

  const pendingSignDocs = documents?.filter((d: any) => d.requiresSignature && !d.signedAt) || [];
  const signedDocs = documents?.filter((d: any) => d.signedAt) || [];
  const otherDocs = documents?.filter((d: any) => !d.requiresSignature && !d.signedAt) || [];

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4 mr-2" /> Upload Document</>}
        </Button>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Auto-generating AOC indicator */}
      {generateAOCMutation.isPending && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
              <div>
                <h3 className="font-semibold text-sm text-indigo-900">Generating Assignment of Claim for Damages...</h3>
                <p className="text-xs text-indigo-700 mt-1">Your AOC document is being generated with your details automatically filled in.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="border-slate-200"><CardContent className="py-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading documents...</CardContent></Card>
      ) : (
        <>
          {pendingSignDocs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-serif font-semibold text-orange-700 flex items-center gap-2"><PenTool className="w-5 h-5" /> Requires Your Signature ({pendingSignDocs.length})</h2>
              {pendingSignDocs.map((doc: any) => (
                <Card key={doc.id} className="border-orange-200 bg-orange-50/50">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <File className="w-5 h-5 text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{doc.fileName}</p>
                        <p className="text-xs text-slate-500">Uploaded by {doc.uploaderName || "Team"} on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 shrink-0"><PenTool className="w-3 h-3 mr-1" /> Signature Required</Badge>
                      <div className="flex gap-1 shrink-0">
                        {doc.fileUrl && (
                          <Button variant="ghost" size="sm" onClick={() => { openPreview(doc); }}>
                            <Eye className="w-4 h-4 mr-1" /> Preview
                          </Button>
                        )}
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => { setSignDocId(doc.id); setSignDocName(doc.fileName); }}>
                          <PenTool className="w-4 h-4 mr-1" /> Sign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {signedDocs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-serif font-semibold text-green-700 flex items-center gap-2"><Check className="w-5 h-5" /> Signed Documents ({signedDocs.length})</h2>
              {signedDocs.map((doc: any) => (
                <Card key={doc.id} className="border-green-200 bg-green-50/30">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <File className="w-5 h-5 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{doc.fileName}</p>
                        <p className="text-xs text-slate-500">Signed by {doc.signedBy} on {new Date(doc.signedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 shrink-0"><Check className="w-3 h-3 mr-1" /> Signed</Badge>
                      <div className="flex gap-1 shrink-0">
                        {doc.fileUrl && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { openPreview(doc); }}>
                              <Eye className="w-4 h-4 mr-1" /> Preview
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.fileUrl} download={doc.fileName}>
                                <Download className="w-4 h-4 mr-1" /> Download
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {otherDocs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-serif font-semibold text-slate-700">Other Documents ({otherDocs.length})</h2>
              {otherDocs.map((doc: any) => (
                <Card key={doc.id} className="border-slate-200">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <File className="w-5 h-5 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{doc.fileName}</p>
                        <p className="text-xs text-slate-500">Uploaded by {doc.uploaderName || "Unknown"} on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      {doc.fileUrl && (
                        <Button variant="ghost" size="sm" onClick={() => { openPreview(doc); }}>
                          <Eye className="w-4 h-4 mr-1" /> Preview
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {documents?.length === 0 && (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-lg">No documents yet</p>
                <p className="text-slate-400 text-sm mt-1">Generate your AOC document or upload files to get started</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* E-Signature Dialog (supports draw and upload) */}
      <Dialog open={!!signDocId} onOpenChange={(open) => { if (!open) setSignDocId(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">E-Sign Document</DialogTitle>
            <DialogDescription>Sign "{signDocName}" — draw your signature or upload an e-signature image.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SignaturePad onSign={handleSign} />
            {signMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 mt-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Applying signature to document...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        document={previewDoc}
      />
    </div>
  );
}

// Activity Log Tab
function ActivityLogTab({ caseId }: { caseId: number }) {
  const { data: timeline, isLoading } = trpc.clientPortal.getCaseTimeline.useQuery({ caseId }, { enabled: !!caseId });

  if (isLoading) return <Card className="border-slate-200"><CardContent className="py-12 text-center text-slate-500">Loading activity...</CardContent></Card>;

  if (!timeline || timeline.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <Clock className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg">No activity yet</p>
          <p className="text-slate-400 text-sm mt-1">Case activity and updates will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-6">
        {timeline.map((entry: any, idx: number) => {
          const actionType = entry.action || "status_change";
          const iconColorClass = actionColors[actionType] || "bg-slate-100 text-slate-600";
          const icon = actionIcons[actionType] || <Activity className="w-4 h-4" />;
          const label = actionLabels[actionType] || actionType;
          return (
            <div key={entry.id || idx} className="relative flex gap-4 pl-1">
              <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${iconColorClass}`}>{icon}</div>
              <Card className="flex-1 border-slate-200 shadow-sm">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{label}</Badge>
                        <span className="text-xs text-slate-400">{formatRelative(entry.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{entry.description}</p>
                      {entry.userName && <p className="text-xs text-slate-400 mt-1">by {entry.userName}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Comments Tab
function CommentsTab({ caseId }: { caseId: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [newComment, setNewComment] = useState("");
  const { data: comments, isLoading } = trpc.clientPortal.getCaseComments.useQuery({ caseId }, { enabled: !!caseId });

  const addCommentMutation = trpc.clientPortal.addComment.useMutation({
    onSuccess: () => { toast.success("Comment posted"); setNewComment(""); utils.clientPortal.getCaseComments.invalidate({ caseId }); },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ caseId, comment: newComment.trim() });
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-serif">Post a Comment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea placeholder="Type your message here..." value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} className="resize-none" />
            <div className="flex justify-end">
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={!newComment.trim() || addCommentMutation.isPending}>
                <Send className="w-4 h-4 mr-2" />{addCommentMutation.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-slate-200"><CardContent className="py-12 text-center text-slate-500">Loading comments...</CardContent></Card>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment: any) => {
            const isOwn = comment.userId === user?.id;
            return (
              <Card key={comment.id} className={`border-slate-200 ${isOwn ? "bg-indigo-50/30 border-indigo-200" : ""}`}>
                <CardContent className="py-4">
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className={`text-xs ${isOwn ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                        {getInitials(comment.userName || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-slate-900">{comment.userName || "Unknown"}</span>
                        {isOwn && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">You</span>}
                        <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-lg">No comments yet</p>
            <p className="text-slate-400 text-sm mt-1">Post a comment to start a conversation</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// External Links Tab (read-only for clients)
function ExternalLinksTab({ caseId }: { caseId: number }) {
  const { data: links, isLoading } = trpc.externalLinks.list.useQuery({ caseId });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading resources...
      </div>
    );
  }

  if (!links || links.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <Link2 className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg">No external resources yet</p>
          <p className="text-slate-400 text-sm mt-1">Your legal team will add relevant links here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 pt-4">
      <p className="text-sm text-slate-500">External resources and reference links added by your legal team:</p>
      {links.map((link: any) => (
        <Card key={link.id} className="border-slate-200 hover:border-indigo-300 transition-colors">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800">{link.label}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline truncate block"
                >
                  {link.url}
                </a>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main Page
export default function ClientCaseDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const caseId = Number(params.id);

  const { data: caseData, isLoading, error } = trpc.clientPortal.getCaseById.useQuery(
    { id: caseId },
    { enabled: !isNaN(caseId) }
  );

  if (isLoading) {
    return (
      <ClientLayout>
        <Card className="border-slate-200"><CardContent className="py-16 text-center"><p className="text-slate-500">Loading case details...</p></CardContent></Card>
      </ClientLayout>
    );
  }

  if (error || !caseData) {
    return (
      <ClientLayout>
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Briefcase className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">Case Not Found</h3>
            <p className="text-slate-600 mb-4">This case does not exist or you do not have access to it.</p>
            <Button variant="outline" onClick={() => setLocation("/client-portal/cases")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to My Cases</Button>
          </CardContent>
        </Card>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/client-portal/cases")} className="text-slate-500 hover:text-slate-700 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Cases
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-slate-900 tracking-tight">{caseData.title}</h1>
                <p className="text-slate-500 mt-1">Case #{caseData.id} {caseData.caseType && `- ${caseData.caseType}`}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-sm px-3 py-1 ${statusColors[caseData.status] || ""}`}>
              {statusLabels[caseData.status] || caseData.status}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview" className="gap-1.5"><Briefcase className="w-4 h-4" /> Overview</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="w-4 h-4" /> Documents</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Clock className="w-4 h-4" /> Activity Log</TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5"><MessageSquare className="w-4 h-4" /> Comments</TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5"><Link2 className="w-4 h-4" /> Resources</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab caseData={caseData} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab caseId={caseId} /></TabsContent>
          <TabsContent value="activity"><ActivityLogTab caseId={caseId} /></TabsContent>
          <TabsContent value="comments"><CommentsTab caseId={caseId} /></TabsContent>
          <TabsContent value="links"><ExternalLinksTab caseId={caseId} /></TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
