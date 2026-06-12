import CROLayout from "@/components/CROLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  FileText, ArrowLeft, Upload, Send, File, Clock, User
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import CaseStageTimeline from "@/components/CaseStageTimeline";

const statusLabels: Record<string, string> = {
  new: "New", pending_review: "Pending Review", in_review: "In Review",
  more_info_needed: "More Info Needed", ready_for_attorney: "Ready for Attorney",
  sent_to_attorney: "Sent to Attorney", accepted_by_attorney: "Accepted",
  rejected: "Rejected", settled: "Settled", settlement_paid_out: "Paid Out", closed: "Closed",
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

export default function CROCaseDetail({ params }: { params: { id: string } }) {
  const caseId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: caseData, isLoading } = trpc.cro.getCaseById.useQuery({ id: caseId });
  const { data: documents } = trpc.cro.getCaseDocuments.useQuery({ caseId });
  const { data: comments } = trpc.cro.getCaseComments.useQuery({ caseId });
  const { data: timeline } = trpc.cro.getCaseTimeline.useQuery({ caseId });

  const [newComment, setNewComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addCommentMutation = trpc.cro.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comment added");
      setNewComment("");
      utils.cro.getCaseComments.invalidate({ caseId });
      utils.cro.getCaseTimeline.invalidate({ caseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const [uploading, setUploading] = useState(false);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ caseId, comment: newComment });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", caseId.toString());
        formData.append("category", "cro_upload");
        const response = await fetch("/api/files/upload-document", { method: "POST", body: formData });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Upload failed");
        }
        toast.success(`Uploaded: ${file.name}`);
        utils.cro.getCaseDocuments.invalidate({ caseId });
        utils.cro.getCaseTimeline.invalidate({ caseId });
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <CROLayout>
        <div className="flex items-center justify-center py-16">
          <p className="text-slate-500">Loading case details...</p>
        </div>
      </CROLayout>
    );
  }

  if (!caseData) {
    return (
      <CROLayout>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <p className="text-slate-500">Case not found or you don't have access</p>
          <Button variant="outline" onClick={() => setLocation("/cro-portal/cases")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cases
          </Button>
        </div>
      </CROLayout>
    );
  }

  return (
    <CROLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/cro-portal/cases")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">{caseData.title}</h1>
              <Badge variant="outline" className={statusColors[caseData.status] || ""}>
                {statusLabels[caseData.status] || caseData.status}
              </Badge>
            </div>
            <p className="text-slate-600">Case #{caseData.id} {caseData.caseType && `- ${caseData.caseType}`}</p>
          </div>
        </div>

        {/* Case Info */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Case Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Priority</p>
                <Badge variant="secondary" className="capitalize">{caseData.priority}</Badge>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Type</p>
                <p className="font-medium">{caseData.caseType || "Not specified"}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Created</p>
                <p className="font-medium">{new Date(caseData.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Due Date</p>
                <p className="font-medium">{caseData.dueDate ? new Date(caseData.dueDate).toLocaleDateString() : "Not set"}</p>
              </div>
            </div>
            {caseData.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-slate-500 text-sm mb-1">Description</p>
                <p className="text-slate-700">{caseData.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Stage Timeline */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Case Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseStageTimeline
              currentStatus={caseData.status}
              createdAt={caseData.createdAt?.toString()}
              updatedAt={caseData.updatedAt?.toString()}
            />
          </CardContent>
        </Card>

        {/* Tabs: Documents, Comments, Timeline */}
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents">Documents ({documents?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="comments">Comments ({comments?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({timeline?.length ?? 0})</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-semibold">Case Documents</h3>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Upload Document
              </Button>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" className="hidden" onChange={handleFileUpload} />
            </div>
            {documents && documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <Card key={doc.id} className="border-slate-200">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.fileName}</p>
                          <p className="text-xs text-slate-500">
                            Uploaded by {doc.uploaderName || "Unknown"} on {new Date(doc.uploadedAt).toLocaleDateString()}
                            {doc.requiresSignature && (
                              <span className="ml-2 text-amber-600 font-medium">
                                {doc.signedAt ? "Signed" : "Signature Required"}
                              </span>
                            )}
                          </p>
                        </div>
                        {doc.fileUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">View</a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-slate-200">
                <CardContent className="py-8 text-center text-slate-500">
                  No documents uploaded yet
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-4">
            <form onSubmit={handleAddComment} className="flex gap-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="flex-1 border-slate-300"
              />
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 self-end" disabled={addCommentMutation.isPending || !newComment.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
            {comments && comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment: any) => (
                  <Card key={comment.id} className={`border-slate-200 ${comment.userRole === "system" ? "bg-slate-50" : ""}`}>
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.userName}</span>
                            <Badge variant="outline" className="text-xs">{comment.userRole}</Badge>
                            <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-700">{comment.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-slate-200">
                <CardContent className="py-8 text-center text-slate-500">
                  No comments yet
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            {timeline && timeline.length > 0 ? (
              <div className="space-y-2">
                {timeline.map((entry: any) => (
                  <Card key={entry.id} className="border-slate-200">
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">{entry.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                            {entry.userName && (
                              <span className="text-xs text-slate-400">by {entry.userName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-slate-200">
                <CardContent className="py-8 text-center text-slate-500">
                  No activity yet
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CROLayout>
  );
}
