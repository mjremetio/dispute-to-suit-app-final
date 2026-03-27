import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";

interface SignaturePositionerProps {
  signatureDataUrl: string;
  documentName: string;
  documentUrl: string;
  pageCount?: number; // Total pages in document (for PDFs)
  onPositionConfirm: (position: { x: number; y: number; scale: number; pageNumber?: number }) => void;
  onCancel: () => void;
}

export default function SignaturePositioner({
  signatureDataUrl,
  documentName,
  documentUrl,
  pageCount = 1,
  onPositionConfirm,
  onCancel,
}: SignaturePositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 75 }); // percentage-based
  const [scale, setScale] = useState(1);
  const [selectedPage, setSelectedPage] = useState(pageCount); // Default to last page
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Determine document type from URL or name
  const isPDF = documentUrl.toLowerCase().includes('.pdf') || documentName.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(documentUrl) || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(documentName);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
      setPosition({
        x: Math.max(5, Math.min(95, dragStartRef.current.posX + deltaX)),
        y: Math.max(5, Math.min(95, dragStartRef.current.posY + deltaY)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((touch.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((touch.clientY - dragStartRef.current.y) / rect.height) * 100;
      setPosition({
        x: Math.max(5, Math.min(95, dragStartRef.current.posX + deltaX)),
        y: Math.max(5, Math.min(95, dragStartRef.current.posY + deltaY)),
      });
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  const resetPosition = () => {
    setPosition({ x: 50, y: 75 });
    setScale(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium text-foreground">
          Drag your signature to the desired position on the document, then confirm.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={resetPosition} className="shrink-0">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>
      </div>

      {/* Document preview area with draggable signature */}
      <div
        ref={containerRef}
        className="relative border-2 border-border rounded-lg bg-white overflow-hidden select-none"
        style={{ minHeight: "min(300px, 50vh)", maxHeight: "min(600px, 60vh)" }}
      >
        {/* Actual document preview */}
        <div className="absolute inset-0">
          {isPDF ? (
            <iframe
              src={documentUrl}
              className="w-full h-full border-0"
              title={documentName}
            />
          ) : isImage ? (
            <img
              src={documentUrl}
              alt={documentName}
              className="w-full h-full object-contain"
            />
          ) : (
            // Fallback for DOCX or other formats - show placeholder with document name
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-center space-y-3 p-6">
                <div className="text-4xl">📄</div>
                <p className="text-sm font-medium text-gray-700">{documentName}</p>
                <p className="text-xs text-gray-500">Document preview not available</p>
                <p className="text-xs text-gray-400">Position your signature and confirm</p>
              </div>
            </div>
          )}
        </div>

        {/* Draggable signature overlay */}
        <div
          className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${
            isDragging ? "shadow-xl ring-2 ring-primary z-20" : "shadow-md hover:shadow-lg z-10"
          }`}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="relative">
            {/* Drag handle indicator */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap opacity-80">
              <Move className="w-3 h-3" /> Drag to position
            </div>
            {/* Signature image */}
            <img
              src={signatureDataUrl}
              alt="Your signature"
              className="max-w-[140px] sm:max-w-[200px] max-h-[60px] sm:max-h-[80px] pointer-events-none bg-white/90 p-1 rounded"
              draggable={false}
            />
            {/* Corner resize handles */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-primary rounded-full border border-white" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border border-white" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-primary rounded-full border border-white" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border border-white" />
          </div>
        </div>
      </div>

      {/* Page selector for multi-page PDFs */}
      {isPDF && pageCount > 1 && (
        <div className="flex items-center gap-3 px-1 py-2 border-b border-border">
          <label htmlFor="page-select" className="text-sm font-medium text-foreground">
            Sign on page:
          </label>
          <select
            id="page-select"
            value={selectedPage}
            onChange={(e) => setSelectedPage(Number(e.target.value))}
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
              <option key={page} value={page}>
                Page {page} {page === pageCount ? '(Last)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scale control */}
      <div className="flex items-center gap-3 px-1">
        <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
        <Slider
          value={[scale * 100]}
          onValueChange={([val]) => setScale(val / 100)}
          min={30}
          max={200}
          step={5}
          className="flex-1"
        />
        <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground w-12 text-right">{Math.round(scale * 100)}%</span>
      </div>

      {/* Position coordinates display */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Position: X {Math.round(position.x)}%, Y {Math.round(position.y)}%</span>
        <span>Scale: {scale.toFixed(2)}x</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Back
        </Button>
        <Button
          type="button"
          onClick={() =>
            onPositionConfirm({
              x: Math.round(position.x * 100) / 100,
              y: Math.round(position.y * 100) / 100,
              scale: Math.round(scale * 100) / 100,
              pageNumber: isPDF && pageCount > 1 ? selectedPage : undefined,
            })
          }
        >
          Confirm & Sign
        </Button>
      </div>
    </div>
  );
}
