import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CaseCommentsProps {
  caseId: number;
  defaultExpanded?: boolean;
}

export default function CaseComments({ caseId, defaultExpanded = false }: CaseCommentsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [commentText, setCommentText] = useState("");

  const { data: comments, refetch: refetchComments } = trpc.cases.getComments.useQuery(
    { caseId },
    { enabled: expanded }
  );

  const addComment = trpc.cases.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comment added");
      setCommentText("");
      refetchComments();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (commentText.trim()) {
      addComment.mutate({ caseId, comment: commentText.trim() });
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600 transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        {expanded ? "Hide" : "Show"} Comments
        {comments && comments.length > 0 && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
            {comments.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Comment List */}
          {comments && comments.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg ${
                    comment.userRole === "system"
                      ? "bg-blue-50 border border-blue-100"
                      : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900">
                      {comment.userName}
                      <span
                        className={`ml-2 text-xs ${
                          comment.userRole === "system"
                            ? "text-blue-500 font-semibold"
                            : comment.userRole === "cro"
                            ? "text-amber-600"
                            : comment.userRole === "paralegal"
                            ? "text-indigo-600"
                            : "text-slate-500"
                        }`}
                      >
                        ({comment.userRole})
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{comment.comment}</p>
                </div>
              ))}
            </div>
          )}

          {comments && comments.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">No comments yet</p>
          )}

          {/* Add Comment Form */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={!commentText.trim() || addComment.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400">Press Ctrl+Enter to send</p>
        </div>
      )}
    </div>
  );
}
