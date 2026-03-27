import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MessageSquare, Send, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function ClientComments() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [newComment, setNewComment] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  const { data: cases } = trpc.clientPortal.myCases.useQuery();

  // Auto-select first case when data loads
  useEffect(() => {
    if (cases && cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(String(cases[0].id));
    }
  }, [cases, selectedCaseId]);

  const caseId = selectedCaseId ? Number(selectedCaseId) : undefined;

  const { data: comments, isLoading } = trpc.clientPortal.getCaseComments.useQuery(
    { caseId: caseId! },
    { enabled: !!caseId }
  );

  const addCommentMutation = trpc.clientPortal.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comment posted");
      setNewComment("");
      if (caseId) utils.clientPortal.getCaseComments.invalidate({ caseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !caseId) return;
    addCommentMutation.mutate({ caseId, comment: newComment.trim() });
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <ClientLayout>
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">Comments</h1>
          <p className="text-slate-600 mt-2 text-lg">Communicate with the team about your case</p>
        </div>

        {/* Case Selector */}
        {cases && cases.length > 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Briefcase className="w-5 h-5 text-indigo-600 shrink-0" />
                <label className="text-sm font-medium text-slate-700 shrink-0">Viewing comments for:</label>
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
              <MessageSquare className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Active Case</h3>
              <p className="text-slate-600">Comments will be available once your case is created.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* New Comment Form */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Post a Comment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Textarea
                    placeholder="Type your message here..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700"
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Comments List */}
            {isLoading ? (
              <Card className="border-slate-200">
                <CardContent className="py-12 text-center text-slate-500">Loading comments...</CardContent>
              </Card>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment: any) => {
                  const isOwn = comment.userId === user?.id;
                  return (
                    <Card
                      key={comment.id}
                      className={`border-slate-200 ${isOwn ? "bg-indigo-50/30 border-indigo-200" : ""}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex gap-3">
                          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                            <AvatarFallback
                              className={`text-xs ${isOwn ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}
                            >
                              {getInitials(comment.userName || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-slate-900">
                                {comment.userName || "Unknown"}
                              </span>
                              {isOwn && (
                                <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">You</span>
                              )}
                              <span className="text-xs text-slate-400">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
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
        )}
      </div>
    </ClientLayout>
  );
}
