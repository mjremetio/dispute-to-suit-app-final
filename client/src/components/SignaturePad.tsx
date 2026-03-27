import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Undo2, Upload, PenTool, Save, FolderOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

type TabMode = "draw" | "upload" | "templates";

export default function SignaturePad({ onSignatureChange, width = 500, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [mode, setMode] = useState<TabMode>("draw");
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [currentSignatureDataUrl, setCurrentSignatureDataUrl] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(width);
  
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
  const historyRef = useRef<ImageData[]>([]);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  // Measure container width for responsive canvas
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const w = container.clientWidth;
      if (w > 0) setCanvasWidth(Math.min(w, width));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Use transparent background - no visual guides that would be embedded
    ctx.clearRect(0, 0, canvasWidth, height);

    // Set drawing style for signature
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
  }, [canvasWidth, height]);

  useEffect(() => {
    if (mode === "draw") {
      initCanvas();
    }
  }, [mode, initCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const saveHistory = () => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getContext();
    if (!ctx) return;
    saveHistory();
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
    emitSignature();
  };

  const emitSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSignatureChange(canvas.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    // Clear with transparency - no visual guides
    ctx.clearRect(0, 0, canvasWidth, height);

    // Reset drawing style
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;

    setHasContent(false);
    historyRef.current = [];
    onSignatureChange(null);
  };

  const undo = () => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas || historyRef.current.length === 0) return;
    const lastState = historyRef.current.pop();
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      emitSignature();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PNG, JPG, or WebP image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Signature image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedPreview(dataUrl);
      setUploadedFileName(file.name);
      onSignatureChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadedPreview(null);
    setUploadedFileName("");
    onSignatureChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const switchMode = (newMode: TabMode) => {
    if (newMode === mode) return;
    // Clear current state when switching
    if (mode === "draw") {
      clearCanvas();
    } else {
      clearUpload();
    }
    setMode(newMode);
  };

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Mode Tabs */}
      <div className="flex flex-wrap border-b border-border">
        <button
          type="button"
          onClick={() => switchMode("draw")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mode === "draw"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => switchMode("upload")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mode === "upload"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Image
        </button>
        <button
          type="button"
          onClick={() => switchMode("templates")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mode === "templates"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Templates ({templates?.length || 0})
        </button>
      </div>

      {/* Draw Mode */}
      {mode === "draw" && (
        <>
          <div className="border-2 border-dashed border-border rounded-lg overflow-hidden" style={{ background: 'repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px' }}>
            <canvas
              ref={canvasRef}
              className="cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Draw your signature above</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={undo} disabled={historyRef.current.length === 0}>
                <Undo2 className="w-4 h-4 mr-1" /> Undo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearCanvas} disabled={!hasContent}>
                <Eraser className="w-4 h-4 mr-1" /> Clear
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Upload Mode */}
      {mode === "upload" && (
        <>
          {uploadedPreview ? (
            <div className="space-y-3">
              <div className="border-2 border-border rounded-lg overflow-hidden bg-white p-4 flex items-center justify-center" style={{ minHeight: `${height}px` }}>
                <img
                  src={uploadedPreview}
                  alt="Uploaded signature"
                  className="max-w-full max-h-[180px] object-contain"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate max-w-[250px]">{uploadedFileName}</p>
                <Button type="button" variant="outline" size="sm" onClick={clearUpload}>
                  <Eraser className="w-4 h-4 mr-1" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <label
              className="border-2 border-dashed border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 p-6"
              style={{ minHeight: `${height}px` }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Click to upload signature image</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WebP — Max 5MB</p>
              </div>
            </label>
          )}
        </>
      )}

      {/* Templates Mode */}
      {mode === "templates" && (
        <div className="space-y-3">
          {templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((template) => (
                <div key={template.id} className="border-2 border-border rounded-lg overflow-hidden bg-white hover:border-primary transition-colors">
                  <div className="p-3 flex flex-col gap-2">
                    <img
                      src={template.signatureUrl}
                      alt={template.name}
                      className="w-full h-20 object-contain bg-muted/30 rounded"
                    />
                    <p className="text-xs font-medium truncate">{template.name}</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          onSignatureChange(template.signatureUrl);
                          setUploadedPreview(template.signatureUrl);
                          setUploadedFileName(template.name);
                          setMode("upload");
                          toast.success("Template loaded");
                        }}
                      >
                        Use
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTemplate.mutate({ id: template.id })}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg bg-muted/30 p-8 text-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No saved templates yet</p>
              <p className="text-xs text-muted-foreground mt-1">Draw or upload a signature and save it as a template</p>
            </div>
          )}
        </div>
      )}

      {/* Save Template Button (shown when signature exists) */}
      {(hasContent || uploadedPreview) && mode !== "templates" && (
        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const canvas = canvasRef.current;
              if (mode === "draw" && canvas) {
                const dataUrl = canvas.toDataURL("image/png");
                setCurrentSignatureDataUrl(dataUrl);
              } else if (mode === "upload" && uploadedPreview) {
                setCurrentSignatureDataUrl(uploadedPreview);
              }
              setShowSaveDialog(true);
            }}
          >
            <Save className="w-4 h-4 mr-1" />
            Save as Template
          </Button>
        </div>
      )}

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Signature Template</DialogTitle>
            <DialogDescription>
              Give your signature a name so you can reuse it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., My Signature, Initials"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
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
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
