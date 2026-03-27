import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { FileText, CheckCircle, Clock, AlertCircle, ArrowRight, Briefcase, Scale, Gavel, MessageSquare, PenTool, Save, Trash2, Plus, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

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

const activeStatuses = ["new", "pending_review", "in_review", "more_info_needed", "ready_for_attorney", "sent_to_attorney", "accepted_by_attorney"];
const completedStatuses = ["settled", "settlement_paid_out", "closed"];

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { data: cases, isLoading } = trpc.clientPortal.myCases.useQuery();
  const { data: profile } = trpc.clientPortal.myProfile.useQuery();
  const { data: templates, refetch: refetchTemplates } = trpc.signatureTemplates.list.useQuery();
  const { data: aocStatus, refetch: refetchAOCStatus } = trpc.clientPortal.getAOCStatus.useQuery();

  const [showCreateSignature, setShowCreateSignature] = useState(false);
  const [showAOCSignDialog, setShowAOCSignDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const signAOC = trpc.clientPortal.generateAndSignAOC.useMutation({
    onSuccess: () => {
      toast.success("AOC signed successfully!");
      setShowAOCSignDialog(false);
      refetchAOCStatus();
    },
    onError: (error) => toast.error(error.message || "Failed to sign AOC"),
  });
  const [templateName, setTemplateName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const createTemplate = trpc.signatureTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Signature template saved");
      setShowSaveDialog(false);
      setShowCreateSignature(false);
      setTemplateName("");
      setSignatureDataUrl(null);
      setHasContent(false);
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

  // Canvas drawing helpers
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

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  useEffect(() => {
    if (showCreateSignature) {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 0);
    }
  }, [showCreateSignature]);

  const totalCases = cases?.length || 0;
  const activeCases = cases?.filter(c => activeStatuses.includes(c.status)) || [];
  const completedCases = cases?.filter(c => completedStatuses.includes(c.status)) || [];
  const rejectedCases = cases?.filter(c => c.status === "rejected") || [];

  return (
    <ClientLayout>
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
            Welcome{profile ? `, ${profile.firstName}` : ""}
          </h1>
          <p className="text-slate-600 mt-2 text-lg">Track your case statuses and manage your documents</p>
        </div>

        {isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <p className="text-slate-500">Loading your case information...</p>
            </CardContent>
          </Card>
        ) : cases && cases.length > 0 ? (
          <div className="space-y-6">
            {/* AOC Signing Alert */}
            {aocStatus && !aocStatus.hasSigned && (
              <Card className="border-amber-300 bg-amber-50 shadow-sm">
                <CardContent className="py-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-amber-100 rounded-lg shrink-0">
                      <AlertCircle className="w-6 h-6 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-900 text-lg">Action Required: Sign Assignment of Claim (AOC)</h3>
                      <p className="text-amber-800 mt-1">
                        Before we can proceed with your cases, you must sign the Assignment of Claim document. This is a one-time requirement that applies to all your cases.
                      </p>
                      <Button 
                        onClick={() => setShowAOCSignDialog(true)} 
                        className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <PenTool className="w-4 h-4 mr-2" />
                        Sign AOC Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-lg">
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{totalCases}</p>
                      <p className="text-sm text-slate-500">Total Cases</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{activeCases.length}</p>
                      <p className="text-sm text-slate-500">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{completedCases.length}</p>
                      <p className="text-sm text-slate-500">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 rounded-lg">
                      <Gavel className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{rejectedCases.length}</p>
                      <p className="text-sm text-slate-500">Rejected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Cases List */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-lg font-serif">All Cases ({totalCases})</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/client-portal/cases")}>
                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cases.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/client-portal/cases/${c.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{c.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-slate-500">Case #{c.id}</p>
                          {c.caseType && <p className="text-sm text-slate-500">- {c.caseType}</p>}
                          <span className="text-xs text-slate-400">
                            Created {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <Badge variant="outline" className={`text-xs capitalize ${c.priority === "urgent" ? "bg-red-50 text-red-700 border-red-200" : c.priority === "high" ? "bg-orange-50 text-orange-700 border-orange-200" : ""}`}>
                          {c.priority}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${statusColors[c.status] || ""}`}>
                          {statusLabels[c.status] || c.status}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => setLocation("/client-portal/documents")}>
                <CardContent className="py-6 flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Documents</p>
                    <p className="text-sm text-slate-500">View & upload documents</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>

              <Card className="border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => setLocation("/client-portal/comments")}>
                <CardContent className="py-6 flex items-center gap-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Comments</p>
                    <p className="text-sm text-slate-500">Communicate with the team</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>

              <Card className="border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => setLocation("/client-portal/timeline")}>
                <CardContent className="py-6 flex items-center gap-4">
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <Clock className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Activity Log</p>
                    <p className="text-sm text-slate-500">View case timeline</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>
            </div>

            {/* My Signature Templates */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PenTool className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-lg font-serif">My Signature Templates</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateSignature(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> New Signature
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templates && templates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white hover:border-indigo-200 transition-colors"
                      >
                        <div className="p-4 flex flex-col gap-3">
                          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-center min-h-[80px]">
                            <img
                              src={template.signatureUrl}
                              alt={template.name}
                              className="max-w-full max-h-[70px] object-contain"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900 truncate">{template.name}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                              onClick={() => deleteTemplate.mutate({ id: template.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-slate-400">
                            Saved {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PenTool className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No saved signatures yet</p>
                    <p className="text-sm text-slate-400 mt-1 mb-4">
                      Save a signature template to quickly sign documents like AOC agreements
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateSignature(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Create Your First Signature
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardContent className="py-16 text-center">
                <FileText className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Active Cases</h3>
                <p className="text-slate-600 text-lg">Your case information will appear here once cases have been created by the paralegal team.</p>
              </CardContent>
            </Card>

            {/* My Signature Templates - available even without cases */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PenTool className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-lg font-serif">My Signature Templates</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateSignature(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> New Signature
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templates && templates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white hover:border-indigo-200 transition-colors"
                      >
                        <div className="p-4 flex flex-col gap-3">
                          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-center min-h-[80px]">
                            <img
                              src={template.signatureUrl}
                              alt={template.name}
                              className="max-w-full max-h-[70px] object-contain"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900 truncate">{template.name}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                              onClick={() => deleteTemplate.mutate({ id: template.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-slate-400">
                            Saved {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PenTool className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No saved signatures yet</p>
                    <p className="text-sm text-slate-400 mt-1 mb-4">
                      Save a signature template now so you're ready to quickly sign documents when your case is created
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateSignature(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Create Your First Signature
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {/* Create Signature Dialog */}
        <Dialog open={showCreateSignature} onOpenChange={(open) => {
          setShowCreateSignature(open);
          if (!open) {
            setHasContent(false);
            setSignatureDataUrl(null);
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Draw Your Signature</DialogTitle>
              <DialogDescription>
                Draw your signature below and save it as a template. You can use this template when signing AOC documents and other legal documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <canvas
                ref={canvasRef}
                height={160}
                className="border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair w-full touch-none"
                style={{ background: 'repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={clearCanvas}>Clear</Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={!hasContent}
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      setSignatureDataUrl(canvas.toDataURL("image/png"));
                      setShowSaveDialog(true);
                    }
                  }}
                >
                  <Save className="w-4 h-4 mr-1" /> Save as Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Save Template Name Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Save Signature Template</DialogTitle>
              <DialogDescription>
                Give your signature a name so you can easily find and reuse it when signing documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {signatureDataUrl && (
                <div className="border rounded-lg p-3 bg-slate-50">
                  <img src={signatureDataUrl} alt="Signature preview" className="max-h-[80px] mx-auto object-contain" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="dashboard-template-name">Template Name</Label>
                <Input
                  id="dashboard-template-name"
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
                  if (!signatureDataUrl) {
                    toast.error("No signature to save");
                    return;
                  }
                  createTemplate.mutate({
                    name: templateName,
                    signatureUrl: signatureDataUrl,
                  });
                }}
                disabled={createTemplate.isPending}
              >
                {createTemplate.isPending ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AOC Signing Dialog */}
        <Dialog open={showAOCSignDialog} onOpenChange={setShowAOCSignDialog}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Sign Assignment of Claim (AOC)</DialogTitle>
              <DialogDescription>
                This is a one-time requirement that applies to all your cases. Draw your signature below to proceed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full border border-slate-200 rounded bg-white cursor-crosshair"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={() => setIsDrawing(false)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    setHasContent(false);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAOCSignDialog(false)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={!hasContent}
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const dataUrl = canvas.toDataURL("image/png");
                  signAOC.mutate({ signatureDataUrl: dataUrl });
                }}
              >
                Sign & Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
