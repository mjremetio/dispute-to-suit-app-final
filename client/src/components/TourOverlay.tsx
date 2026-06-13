/**
 * TourOverlay — a lightweight, zero-dependency guided tour component.
 *
 * Usage:
 *   <TourOverlay steps={steps} onFinish={handleFinish} />
 *
 * Each step can optionally target a DOM element by CSS selector.
 * When a target is provided the element is spotlighted; otherwise a
 * centred modal card is shown.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export interface TourStep {
  /** CSS selector of the element to highlight. Omit for a centred card. */
  target?: string;
  title: string;
  description: string;
  /** Which side of the target to place the tooltip. Defaults to "bottom". */
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Emoji or icon character shown in the step header */
  emoji?: string;
}

interface TourOverlayProps {
  steps: TourStep[];
  onFinish: () => void;
  /** Called when the user explicitly closes the tour early */
  onSkip?: () => void;
}

const TOOLTIP_W = 320;
const TOOLTIP_H = 200; // approximate; actual height varies
const PADDING = 12; // gap between spotlight rect and tooltip

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

function computeTooltipPos(
  rect: DOMRect,
  placement: TourStep["placement"],
  vpW: number,
  vpH: number
): { top: number; left: number } {
  const p = placement ?? "bottom";
  let top = 0;
  let left = 0;

  switch (p) {
    case "bottom":
      top = rect.bottom + PADDING;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
    case "top":
      top = rect.top - TOOLTIP_H - PADDING;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
    case "right":
      top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
      left = rect.right + PADDING;
      break;
    case "left":
      top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
      left = rect.left - TOOLTIP_W - PADDING;
      break;
    default:
      top = vpH / 2 - TOOLTIP_H / 2;
      left = vpW / 2 - TOOLTIP_W / 2;
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, vpW - TOOLTIP_W - 12));
  top = Math.max(12, Math.min(top, vpH - TOOLTIP_H - 12));
  return { top, left };
}

export function TourOverlay({ steps, onFinish, onSkip }: TourOverlayProps) {
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  // Recalculate spotlight position whenever step changes or window resizes
  useLayoutEffect(() => {
    function update() {
      if (!current.target) {
        setSpotRect(null);
        setTooltipPos({
          top: window.innerHeight / 2 - TOOLTIP_H / 2,
          left: window.innerWidth / 2 - TOOLTIP_W / 2,
        });
        return;
      }
      const rect = getRect(current.target);
      if (rect) {
        setSpotRect(rect);
        setTooltipPos(
          computeTooltipPos(rect, current.placement, window.innerWidth, window.innerHeight)
        );
        // Scroll element into view
        document.querySelector(current.target)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        setSpotRect(null);
        setTooltipPos({
          top: window.innerHeight / 2 - TOOLTIP_H / 2,
          left: window.innerWidth / 2 - TOOLTIP_W / 2,
        });
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [step, current]);

  // Fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => setStep((s) => Math.max(0, s - 1));

  const handleFinish = () => {
    setVisible(false);
    setTimeout(onFinish, 200);
  };

  const handleSkip = () => {
    setVisible(false);
    setTimeout(() => (onSkip ?? onFinish)(), 200);
  };

  // Spotlight dimensions with a bit of padding
  const SPOT_PAD = 8;
  const spotStyle = spotRect
    ? {
        top: spotRect.top - SPOT_PAD,
        left: spotRect.left - SPOT_PAD,
        width: spotRect.width + SPOT_PAD * 2,
        height: spotRect.height + SPOT_PAD * 2,
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-[9999] transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Dark overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ display: "block" }}
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotStyle && (
              <rect
                x={spotStyle.left}
                y={spotStyle.top}
                width={spotStyle.width}
                height={spotStyle.height}
                rx={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Spotlight border ring */}
      {spotStyle && (
        <div
          className="absolute rounded-lg pointer-events-none"
          style={{
            top: spotStyle.top,
            left: spotStyle.left,
            width: spotStyle.width,
            height: spotStyle.height,
            boxShadow: "0 0 0 3px #6366f1, 0 0 0 6px rgba(99,102,241,0.3)",
            borderRadius: 8,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-2xl shadow-2xl border border-indigo-100 pointer-events-auto"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_W,
          maxWidth: "calc(100vw - 24px)",
          zIndex: 10000,
        }}
      >
        {/* Gradient header */}
        <div className="rounded-t-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{current.emoji ?? "✨"}</span>
            <span className="text-white font-bold text-sm truncate">{current.title}</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-white/70 hover:text-white transition-colors ml-2 shrink-0"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <p className="text-sm text-slate-600 leading-relaxed">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between gap-2">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === step
                    ? "w-5 h-2 bg-indigo-500"
                    : "w-2 h-2 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs px-3"
                onClick={handlePrev}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 text-xs px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
              onClick={handleNext}
            >
              {isLast ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
