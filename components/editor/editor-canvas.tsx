"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { hexToRgba, type TextLayer } from "@/lib/editor";

interface Props {
  imageUrl: string;
  layers: TextLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, patch: Partial<TextLayer>) => void;
  // Reports the pixel size of the rendered canvas to the parent (for server-render reference)
  onCanvasSize?: (w: number, h: number) => void;
}

export default function EditorCanvas({
  imageUrl,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onCanvasSize,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Load image to get natural dimensions
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
      if (onCanvasSize) onCanvasSize(el.clientWidth, el.clientHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onCanvasSize]);

  // Aspect-fit the container based on image dimensions
  const aspectRatio = imgSize ? imgSize.w / imgSize.h : 1;

  // Pointer move + up listeners while dragging
  useEffect(() => {
    if (!draggingId) return;

    const handleMove = (e: PointerEvent) => {
      if (!dragStateRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dxPercent = ((e.clientX - dragStateRef.current.startX) / rect.width) * 100;
      const dyPercent = ((e.clientY - dragStateRef.current.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, dragStateRef.current.origX + dxPercent));
      const newY = Math.max(0, Math.min(100, dragStateRef.current.origY + dyPercent));
      onUpdateLayer(draggingId, { x: Math.round(newX), y: Math.round(newY) });
    };
    const handleUp = () => {
      setDraggingId(null);
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingId, onUpdateLayer]);

  const startDrag = useCallback(
    (e: React.PointerEvent, layer: TextLayer) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectLayer(layer.id);
      setDraggingId(layer.id);
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: layer.x,
        origY: layer.y,
      };
    },
    [onSelectLayer]
  );

  const canvasH = containerSize?.h || 0;

  return (
    <div
      className="w-full bg-checkerboard rounded-lg overflow-hidden border relative"
      style={{
        aspectRatio: aspectRatio,
        background:
          "repeating-conic-gradient(#e5e5e5 0% 25%, #f5f5f5 0% 50%) 50% / 24px 24px",
      }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 select-none"
        onPointerDown={() => onSelectLayer(null)}
      >
        {/* Background image */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        )}

        {/* Text layers */}
        {layers.map((layer) => {
          const fontSizePx = (layer.fontSizePercent / 100) * canvasH;
          const widthPx = ((layer.widthPercent / 100) * (containerSize?.w || 0)) || 0;
          const isSelected = selectedLayerId === layer.id;

          const shadowFilter = layer.shadowEnabled
            ? `drop-shadow(${(layer.shadowOffsetX / 1000) * canvasH}px ${
                (layer.shadowOffsetY / 1000) * canvasH
              }px ${(layer.shadowBlur / 1000) * canvasH}px ${layer.shadowColor})`
            : undefined;

          const padPx = (layer.backgroundPadding / 100) * fontSizePx;
          const radiusPx = (layer.backgroundRadius / 1000) * canvasH;

          // Stroke implemented via text-shadow for live preview (close enough)
          let textShadowStroke: string | undefined;
          if (layer.strokeEnabled && layer.strokeWidth > 0) {
            const w = (layer.strokeWidth / 1000) * canvasH;
            const c = layer.strokeColor;
            textShadowStroke = `-${w}px -${w}px 0 ${c}, ${w}px -${w}px 0 ${c}, -${w}px ${w}px 0 ${c}, ${w}px ${w}px 0 ${c}`;
          }

          return (
            <div
              key={layer.id}
              onPointerDown={(e) => startDrag(e, layer)}
              className={`absolute cursor-move ${
                isSelected ? "ring-2 ring-primary ring-offset-1" : ""
              }`}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.widthPercent}%`,
                transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                padding: layer.backgroundEnabled ? `${padPx}px` : 0,
                background: layer.backgroundEnabled
                  ? hexToRgba(layer.backgroundColor, layer.backgroundOpacity)
                  : undefined,
                borderRadius: layer.backgroundEnabled ? `${radiusPx}px` : 0,
                touchAction: "none",
              }}
            >
              <div
                style={{
                  fontFamily: layer.fontFamily,
                  fontSize: `${fontSizePx}px`,
                  fontWeight: layer.fontWeight,
                  fontStyle: layer.fontStyle,
                  color: layer.color,
                  textAlign: layer.align,
                  lineHeight: layer.lineHeight,
                  filter: shadowFilter,
                  textShadow: textShadowStroke,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  userSelect: "none",
                }}
              >
                {layer.text || "\u00A0"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
