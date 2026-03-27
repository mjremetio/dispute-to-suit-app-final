import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/_core/hooks/useAuth";
import { FileText, Upload, File, PenTool, Check, Eye, X, Briefcase, FolderOpen, Save } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

// Inline signature pad for client portal - supports draw and saved templates
function SimpleSignaturePad({ onSign }: { onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [mode, setMode] = useState<"draw" | "templates">("draw");
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
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
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

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const submit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    onSign(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Button
          variant={mode === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("draw")}
          className={mode === "draw" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
        >
          <PenTool className="w-4 h-4 mr-1" /> Draw
        </Button>
        <Button
          variant={mode === "templates" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("templates")}
          className={mode === "templates" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
        >
          <FolderOpen className="w-4 h-4 mr-1" /> Saved ({templates?.length || 0})
        </Button>
      </div>

      {mode === "draw" ? (
        <>
          <p className="text-sm text-slate-600">Draw your signature below:</p>
          <canvas
            ref={canvasRef}
            height={160}
            className="border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair w-full"
            style={{ background: 'repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clear}>Clear</Button>
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
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={submit} disabled={!hasContent}>
              <PenTool className="w-4 h-4 mr-1" /> Apply Signature
            </Button>
          </div>
        </>
      ) : (
        <>
          {templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((template) => (
                <div key={template.id} className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white hover:border-indigo-300 transition-colors">
                  <div className="p-3 flex flex-col gap-2">
                    <img src={template.signatureUrl} alt={template.name} className="w-full h-16 object-contain bg-slate-50 rounded" />
                    <p className="text-xs font-medium truncate">{template.name}</p>
                    <div className="flex gap-1">
                      <Button
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
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No saved signatures yet</p>
              <p className="text-xs text-slate-400 mt-1">Draw a signature and save it as a template for quick reuse</p>
            </div>
          )}
        </>
      )}

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Signature Template</DialogTitle>
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
              <Label htmlFor="doc-template-name">Template Name</Label>
              <Input
                id="doc-template-name"
                placeholder="e.g., My Signature, Initials"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
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

export default function ClientDocuments() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  const { data: cases } = trpc.clientPortal.myCases.useQuery();

  // Auto-select first case when data loads, or preserve selection
  useEffect(() => {
    if (cases && cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(String(cases[0].id));
    }
  }, [cases, selectedCaseId]);

  const caseId = selectedCaseId ? Number(selectedCaseId) : undefined;

  const { data: documents, isLoading } = trpc.clientPortal.getCaseDocuments.useQuery(
    { caseId: caseId! },
    { enabled: !!caseId }
  );

  const [signDocId, setSignDocId] = useState<number | null>(null);
  const [signDocName, setSignDocName] = useState("");

  const getUploadUrlMutation = trpc.clientPortal.getUploadUrl.useMutation();
  const uploadMutation = trpc.clientPortal.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded");
      if (caseId) utils.clientPortal.getCaseDocuments.invalidate({ caseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const signMutation = trpc.clientPortal.submitSignature.useMutation({
    onSuccess: () => {
      toast.success("Document signed successfully");
      setSignDocId(null);
      if (caseId) utils.clientPortal.getCaseDocuments.invalidate({ caseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !caseId) return;
    for (const file of Array.from(files)) {
      try {
        const { fileKey } = await getUploadUrlMutation.mutateAsync({
          caseId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });
        // In production, upload to S3 here
        const fileUrl = fileKey;
        uploadMutation.mutate({
          caseId,
          fileName: file.name,
          fileKey,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
        });
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSign = (signatureDataUrl: string) => {
    if (!signDocId) return;
    signMutation.mutate({
      documentId: signDocId,
      signatureDataUrl,
      signedByName: user?.name || "Client",
    });
  };

  const pendingSignDocs = documents?.filter((d: any) => d.requiresSignature && !d.signedAt) || [];
  const signedDocs = documents?.filter((d: any) => d.signedAt) || [];
  const otherDocs = documents?.filter((d: any) => !d.requiresSignature && !d.signedAt) || [];

  return (
    <ClientLayout>
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">Documents</h1>
              <p className="text-slate-600 mt-2 text-lg">View, upload, and sign your case documents</p>
            </div>
            {caseId && (
              <>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Document
                </Button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" className="hidden" onChange={handleFileUpload} />
              </>
            )}
          </div>
        </div>

        {/* Case Selector */}
        {cases && cases.length > 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Briefcase className="w-5 h-5 text-indigo-600 shrink-0" />
                <label className="text-sm font-medium text-slate-700 shrink-0">Viewing documents for:</label>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a case" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        Case #{c.id} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {!caseId ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <FileText className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Active Case</h3>
              <p className="text-slate-600">Documents will appear once your case is created.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="border-slate-200"><CardContent className="py-16 text-center text-slate-500">Loading documents...</CardContent></Card>
        ) : (
          <div className="space-y-6">
            {/* Pending Signature Section */}
            {pendingSignDocs.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-serif font-semibold text-orange-700 flex items-center gap-2">
                  <PenTool className="w-5 h-5" /> Requires Your Signature ({pendingSignDocs.length})
                </h2>
                {pendingSignDocs.map((doc: any) => (
                  <Card key={doc.id} className="border-orange-200 bg-orange-50/50">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-orange-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-slate-500">
                            Uploaded by {doc.uploaderName || "Team"} on {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                          <PenTool className="w-3 h-3 mr-1" /> Signature Required
                        </Badge>
                        {doc.fileUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-1" /> View</a>
                          </Button>
                        )}
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => { setSignDocId(doc.id); setSignDocName(doc.fileName); }}>
                          <PenTool className="w-4 h-4 mr-1" /> Sign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Signed Documents */}
            {signedDocs.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-serif font-semibold text-green-700 flex items-center gap-2">
                  <Check className="w-5 h-5" /> Signed Documents ({signedDocs.length})
                </h2>
                {signedDocs.map((doc: any) => (
                  <Card key={doc.id} className="border-green-200 bg-green-50/30">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-green-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-slate-500">
                            Signed by {doc.signedBy} on {new Date(doc.signedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          <Check className="w-3 h-3 mr-1" /> Signed
                        </Badge>
                        {doc.fileUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-1" /> View</a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Other Documents */}
            {otherDocs.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-serif font-semibold text-slate-700">Other Documents ({otherDocs.length})</h2>
                {otherDocs.map((doc: any) => (
                  <Card key={doc.id} className="border-slate-200">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-slate-500">
                            Uploaded by {doc.uploaderName || "Unknown"} on {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {doc.fileUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-1" /> View</a>
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
                  <p className="text-slate-400 text-sm mt-1">Documents uploaded by the team or by you will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Signature Dialog */}
        <Dialog open={!!signDocId} onOpenChange={(open) => { if (!open) setSignDocId(null); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">E-Sign Document</DialogTitle>
              <DialogDescription>
                Sign "{signDocName}" — draw your signature below to apply it to the document.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <SimpleSignaturePad onSign={handleSign} />
              {signMutation.isPending && (
                <p className="text-sm text-indigo-600 mt-3">Applying signature...</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
