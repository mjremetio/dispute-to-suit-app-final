import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Download, FileText, Image, File, X, User, Calendar, HardDrive, Tag } from "lucide-react";
import { format } from "date-fns";

interface DocumentData {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  category: string | null;
  uploadedAt: string | Date;
  uploadedBy: number | null;
  uploaderName?: string | null;
  uploaderRole?: string | null;
}

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentData | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="w-5 h-5" />;
  if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-green-500" />;
  if (mimeType === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("document")) return <FileText className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf"
  );
}

export default function DocumentPreviewModal({
  open,
  onOpenChange,
  document: doc,
}: DocumentPreviewModalProps) {
  if (!doc) return null;

  const canPreview = isPreviewable(doc.mimeType);
  const isImage = doc.mimeType?.startsWith("image/");
  // Use proxy URL for authenticated access to stored files; append cache-bust for signed docs
  const proxyUrl = `/api/files/proxy?docId=${doc.id}&t=${Date.now()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl md:max-w-4xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col p-3 sm:p-6">
        <DialogHeader className="shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {getFileIcon(doc.mimeType)}
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm sm:text-lg">{doc.fileName}</DialogTitle>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" asChild className="h-8 text-xs sm:text-sm">
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Open</span>
                  <span className="sm:hidden">Open</span>
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild className="h-8 text-xs sm:text-sm">
                <a href={doc.fileUrl} download={doc.fileName}>
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Download</span>
                  <span className="sm:hidden">Save</span>
                </a>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Document metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 py-2 sm:py-3 border-y border-border shrink-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground shrink-0">Category:</span>
            <Badge variant="outline" className="text-xs capitalize truncate">
              {doc.category ? doc.category.replace(/_/g, " ") : "Uncategorized"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <HardDrive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground shrink-0">Size:</span>
            <span>{formatFileSize(doc.fileSize)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground shrink-0">By:</span>
            <span className="truncate">
              {doc.uploaderName || "Unknown"}
              {doc.uploaderRole && (
                <span className="text-muted-foreground ml-1">({doc.uploaderRole})</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground shrink-0">Uploaded:</span>
            <span className="truncate">{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 min-h-0 overflow-auto">
          {canPreview ? (
            isImage ? (
              <div className="flex items-center justify-center p-2 sm:p-4 bg-muted/30 rounded-lg min-h-[200px] sm:min-h-[300px]">
                <img
                  src={proxyUrl}
                  alt={doc.fileName}
                  className="max-w-full max-h-[40vh] sm:max-h-[60vh] object-contain rounded"
                />
              </div>
            ) : (
              <iframe
                src={proxyUrl}
                className="w-full h-[40vh] sm:h-[60vh] border rounded-lg"
                title={doc.fileName}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-16 text-center">
              <File className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium mb-2">Preview not available</p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 px-2">
                This file type ({doc.mimeType || "unknown"}) cannot be previewed in the browser.
              </p>
              <Button asChild size="sm">
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
