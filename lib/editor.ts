// lib/editor.ts — Shared types and helpers for the text overlay editor
// v0.4.1: extended Google Fonts library + font-loading helpers

export type TextAlign = "left" | "center" | "right";
export type FontWeight = "normal" | "bold";
export type FontStyle = "normal" | "italic";

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  widthPercent: number;
  fontSizePercent: number;
  fontFamily: string;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  color: string;
  align: TextAlign;
  lineHeight: number;
  backgroundEnabled: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
  backgroundRadius: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
}

export interface EditorState {
  baseMediaId: string;
  layers: TextLayer[];
  previewWidth: number;
  previewHeight: number;
}

// Font definitions — grouped by category
// Each font: cssName for live preview + serverName for SVG render + googleFontName for loading
export interface FontDef {
  value: string; // what goes into fontFamily
  label: string;
  category: "system" | "modern" | "classic" | "display" | "handwritten" | "mono";
  google?: string; // Google Fonts family name (e.g. "Bebas+Neue:wght@400")
  fallback: string; // CSS fallback chain
}

export const FONT_DEFS: FontDef[] = [
  // System / Safe
  { value: "Inter", label: "Inter — Modern Sans", category: "modern", google: "Inter:wght@400;700", fallback: "system-ui, sans-serif" },
  { value: "Helvetica Neue", label: "Helvetica — Clean", category: "system", fallback: "Helvetica, Arial, sans-serif" },
  { value: "Arial", label: "Arial — Standard", category: "system", fallback: "Helvetica, sans-serif" },
  { value: "Times New Roman", label: "Times — Editorial", category: "classic", fallback: "Times, serif" },
  { value: "Georgia", label: "Georgia — Klassisch", category: "classic", fallback: "serif" },
  { value: "Courier New", label: "Courier — Tech/Mono", category: "mono", fallback: "monospace" },
  
  // Display / Bold (great for hooks)
  { value: "Impact", label: "Impact — Bold Statement", category: "display", fallback: "Charcoal, sans-serif" },
  { value: "Bebas Neue", label: "Bebas Neue — Modern Display", category: "display", google: "Bebas+Neue", fallback: "Impact, sans-serif" },
  { value: "Anton", label: "Anton — Condensed Bold", category: "display", google: "Anton", fallback: "Impact, sans-serif" },
  { value: "Oswald", label: "Oswald — Strong Display", category: "display", google: "Oswald:wght@400;700", fallback: "sans-serif" },
  { value: "Archivo Black", label: "Archivo Black — Heavy", category: "display", google: "Archivo+Black", fallback: "sans-serif" },
  
  // Modern Sans
  { value: "Montserrat", label: "Montserrat — Geometric", category: "modern", google: "Montserrat:wght@400;700", fallback: "sans-serif" },
  { value: "Poppins", label: "Poppins — Friendly Modern", category: "modern", google: "Poppins:wght@400;700", fallback: "sans-serif" },
  { value: "Roboto", label: "Roboto — Universal", category: "modern", google: "Roboto:wght@400;700", fallback: "sans-serif" },
  { value: "Work Sans", label: "Work Sans — Versatile", category: "modern", google: "Work+Sans:wght@400;700", fallback: "sans-serif" },
  { value: "Raleway", label: "Raleway — Elegant Sans", category: "modern", google: "Raleway:wght@400;700", fallback: "sans-serif" },
  { value: "DM Sans", label: "DM Sans — Geometric Clean", category: "modern", google: "DM+Sans:wght@400;700", fallback: "sans-serif" },
  { value: "Space Grotesk", label: "Space Grotesk — Tech Modern", category: "modern", google: "Space+Grotesk:wght@400;700", fallback: "sans-serif" },
  
  // Classic Serif
  { value: "Playfair Display", label: "Playfair — Luxury Serif", category: "classic", google: "Playfair+Display:wght@400;700", fallback: "Georgia, serif" },
  { value: "Merriweather", label: "Merriweather — Readable Serif", category: "classic", google: "Merriweather:wght@400;700", fallback: "Georgia, serif" },
  { value: "Lora", label: "Lora — Editorial Serif", category: "classic", google: "Lora:wght@400;700", fallback: "Georgia, serif" },
  { value: "Cormorant Garamond", label: "Cormorant — Refined Serif", category: "classic", google: "Cormorant+Garamond:wght@400;700", fallback: "Georgia, serif" },
  
  // Handwritten / Script
  { value: "Pacifico", label: "Pacifico — Playful Script", category: "handwritten", google: "Pacifico", fallback: "cursive" },
  { value: "Caveat", label: "Caveat — Handwritten", category: "handwritten", google: "Caveat:wght@400;700", fallback: "cursive" },
  { value: "Dancing Script", label: "Dancing Script — Elegant Script", category: "handwritten", google: "Dancing+Script:wght@400;700", fallback: "cursive" },
  { value: "Kalam", label: "Kalam — Marker Style", category: "handwritten", google: "Kalam:wght@400;700", fallback: "cursive" },
  { value: "Permanent Marker", label: "Permanent Marker", category: "handwritten", google: "Permanent+Marker", fallback: "cursive" },
  
  // Monospace
  { value: "JetBrains Mono", label: "JetBrains Mono — Code", category: "mono", google: "JetBrains+Mono:wght@400;700", fallback: "monospace" },
  { value: "Fira Code", label: "Fira Code — Tech", category: "mono", google: "Fira+Code:wght@400;700", fallback: "monospace" },
];

// Backwards-compat export with old simple structure
export const FONT_FAMILIES = FONT_DEFS.map((f) => ({
  value: getFontCssValue(f),
  label: f.label,
}));

// Build the CSS font-family string with fallback
export function getFontCssValue(font: FontDef): string {
  const needsQuotes = font.value.includes(" ");
  const primary = needsQuotes ? `"${font.value}"` : font.value;
  return `${primary}, ${font.fallback}`;
}

// Find a font definition by its CSS value
export function findFontDef(cssValue: string): FontDef | null {
  return FONT_DEFS.find((f) => getFontCssValue(f) === cssValue || f.value === cssValue) || null;
}

// Build Google Fonts CSS URL for ALL Google fonts in this app
// (loaded once at page level — small payload)
export function buildGoogleFontsUrl(): string {
  const googleFamilies = FONT_DEFS.filter((f) => f.google).map((f) => f.google!);
  if (googleFamilies.length === 0) return "";
  return `https://fonts.googleapis.com/css2?${googleFamilies.map((g) => `family=${g}`).join("&")}&display=swap`;
}

// Build Google Fonts URL for a SINGLE font (for server-side SVG embedding)
export function buildSingleGoogleFontUrl(fontValue: string): string | null {
  const def = FONT_DEFS.find((f) => f.value === fontValue);
  if (!def || !def.google) return null;
  return `https://fonts.googleapis.com/css2?family=${def.google}&display=swap`;
}

// Get all unique Google Font value names used by a set of layers
export function getGoogleFontsForLayers(layers: TextLayer[]): FontDef[] {
  const used = new Set<string>();
  for (const l of layers) {
    used.add(l.fontFamily);
  }
  return FONT_DEFS.filter((f) => f.google && used.has(getFontCssValue(f)));
}

export function createDefaultLayer(text: string = "Dein Text"): TextLayer {
  return {
    id: crypto.randomUUID(),
    text,
    x: 50,
    y: 50,
    widthPercent: 80,
    fontSizePercent: 8,
    fontFamily: getFontCssValue(FONT_DEFS[0]),
    fontWeight: "bold",
    fontStyle: "normal",
    color: "#FFFFFF",
    align: "center",
    lineHeight: 1.2,
    backgroundEnabled: false,
    backgroundColor: "#000000",
    backgroundOpacity: 60,
    backgroundPadding: 30,
    backgroundRadius: 8,
    shadowEnabled: true,
    shadowColor: "#000000",
    shadowBlur: 8,
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    strokeEnabled: false,
    strokeColor: "#000000",
    strokeWidth: 2,
    rotation: 0,
  };
}

export type LayerPreset = "hook-top" | "caption-center" | "footer-bottom" | "quote-card" | "small-tag";

export type ImageFormat = "story" | "feed-square" | "feed-portrait" | "feed-landscape" | "reel-cover" | "wide";

export function detectFormat(width: number, height: number): ImageFormat {
  const ratio = width / height;
  if (ratio < 0.6) return "story";
  if (ratio < 0.95) return "feed-portrait";
  if (ratio < 1.1) return "feed-square";
  if (ratio < 1.5) return "feed-landscape";
  return "wide";
}

export const FORMAT_LABELS: Record<ImageFormat, string> = {
  story: "Story / Reel (9:16)",
  "feed-portrait": "Feed Portrait (4:5)",
  "feed-square": "Feed Quadrat (1:1)",
  "feed-landscape": "Feed Querformat",
  "reel-cover": "Reel Cover",
  wide: "Breitformat",
};

function adjustForFormat(layer: TextLayer, format: ImageFormat): TextLayer {
  if (format === "story") {
    return { ...layer, fontSizePercent: Math.min(layer.fontSizePercent * 0.85, 12) };
  }
  if (format === "feed-landscape" || format === "wide") {
    return { ...layer, fontSizePercent: Math.max(layer.fontSizePercent * 1.1, 6) };
  }
  return layer;
}

export function createPresetLayer(
  preset: LayerPreset,
  text: string = "Dein Text",
  format?: ImageFormat
): TextLayer {
  const base = createDefaultLayer(text);
  let layer: TextLayer;

  switch (preset) {
    case "hook-top":
      layer = {
        ...base, text,
        x: 50, y: 12, widthPercent: 88, fontSizePercent: 9,
        fontWeight: "bold", align: "center", color: "#FFFFFF",
        shadowEnabled: true, shadowBlur: 12,
      };
      break;
    case "caption-center":
      layer = {
        ...base, x: 50, y: 50, widthPercent: 80, fontSizePercent: 8,
        backgroundEnabled: true, backgroundColor: "#000000", backgroundOpacity: 65,
      };
      break;
    case "footer-bottom":
      layer = {
        ...base, x: 50, y: 92, widthPercent: 92, fontSizePercent: 4,
        fontWeight: "normal", color: "#FFFFFF", align: "center",
        shadowEnabled: true, shadowBlur: 6,
      };
      break;
    case "quote-card":
      layer = {
        ...base, x: 50, y: 50, widthPercent: 75, fontSizePercent: 7,
        fontStyle: "italic",
        fontFamily: getFontCssValue(FONT_DEFS.find((f) => f.value === "Playfair Display") || FONT_DEFS[0]),
        backgroundEnabled: true, backgroundColor: "#FFFFFF", backgroundOpacity: 90,
        color: "#000000", align: "center", shadowEnabled: false,
      };
      break;
    case "small-tag":
      layer = {
        ...base, x: 6, y: 6, widthPercent: 35, fontSizePercent: 3.5,
        fontWeight: "bold",
        backgroundEnabled: true, backgroundColor: "#000000", backgroundOpacity: 75,
        backgroundPadding: 50, align: "left", shadowEnabled: false,
      };
      break;
  }
  return format ? adjustForFormat(layer, format) : layer;
}

export function presetFromType(type: string, format?: ImageFormat): LayerPreset {
  switch (type) {
    case "hook": return "hook-top";
    case "tag": return "small-tag";
    case "cta": return "footer-bottom";
    case "caption":
    default: return "caption-center";
  }
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function hexToRgba(hex: string, alphaPercent: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alphaPercent / 100})`;
}

export function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (maxCharsPerLine <= 0) return [text];
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let current = "";
    for (const w of words) {
      if (!current) {
        current = w;
      } else if (current.length + 1 + w.length <= maxCharsPerLine) {
        current += " " + w;
      } else {
        lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    if (para === "") lines.push("");
  }
  return lines.length > 0 ? lines : [""];
}

/**
 * Build SVG with text layers. Filters in <defs>, elements in body.
 * Optionally embeds Google Fonts CSS for fonts used in layers.
 */
export function buildOverlaySvg(
  layers: TextLayer[],
  canvasWidth: number,
  canvasHeight: number,
  embeddedFontsCss?: string
): string {
  const defs: string[] = [];
  const bodyElements: string[] = [];

  layers.forEach((layer, idx) => {
    const fontSize = (layer.fontSizePercent / 100) * canvasHeight;
    const boxWidth = (layer.widthPercent / 100) * canvasWidth;
    const centerX = (layer.x / 100) * canvasWidth;
    const centerY = (layer.y / 100) * canvasHeight;

    const avgCharWidth = fontSize * 0.55;
    const maxCharsPerLine = Math.max(8, Math.floor(boxWidth / avgCharWidth));
    const lines = wrapText(layer.text, maxCharsPerLine);

    const lineHeightPx = fontSize * layer.lineHeight;
    const totalHeight = lines.length * lineHeightPx;
    const startY = centerY - totalHeight / 2 + fontSize * 0.85;

    let filterAttr = "";
    if (layer.shadowEnabled) {
      const blur = (layer.shadowBlur / 1000) * canvasHeight;
      const offX = (layer.shadowOffsetX / 1000) * canvasHeight;
      const offY = (layer.shadowOffsetY / 1000) * canvasHeight;
      const filterId = `shadow-${idx}`;
      defs.push(
        `<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">` +
          `<feDropShadow dx="${offX}" dy="${offY}" stdDeviation="${blur}" flood-color="${layer.shadowColor}"/>` +
          `</filter>`
      );
      filterAttr = ` filter="url(#${filterId})"`;
    }

    if (layer.backgroundEnabled) {
      const paddingPx = (layer.backgroundPadding / 100) * fontSize;
      const bgWidth = boxWidth + 2 * paddingPx;
      const bgHeight = totalHeight + 2 * paddingPx;
      const bgX = centerX - bgWidth / 2;
      const bgY = centerY - bgHeight / 2;
      const bgFill = hexToRgba(layer.backgroundColor, layer.backgroundOpacity);
      const radiusPx = (layer.backgroundRadius / 1000) * canvasHeight;

      const transformAttr =
        layer.rotation !== 0 ? ` transform="rotate(${layer.rotation} ${centerX} ${centerY})"` : "";

      bodyElements.push(
        `<rect x="${bgX}" y="${bgY}" width="${bgWidth}" height="${bgHeight}" rx="${radiusPx}" ry="${radiusPx}" fill="${bgFill}"${transformAttr}/>`
      );
    }

    let textX = centerX;
    let textAnchor = "middle";
    if (layer.align === "left") {
      textX = centerX - boxWidth / 2;
      textAnchor = "start";
    } else if (layer.align === "right") {
      textX = centerX + boxWidth / 2;
      textAnchor = "end";
    }

    const tspans = lines
      .map(
        (line, i) =>
          `<tspan x="${textX}" dy="${i === 0 ? 0 : lineHeightPx}">${escapeXml(line) || " "}</tspan>`
      )
      .join("");

    let strokeAttrs = "";
    if (layer.strokeEnabled && layer.strokeWidth > 0) {
      const strokeWidthPx = (layer.strokeWidth / 1000) * canvasHeight;
      strokeAttrs = ` stroke="${layer.strokeColor}" stroke-width="${strokeWidthPx}" paint-order="stroke fill"`;
    }

    const transformAttr =
      layer.rotation !== 0 ? ` transform="rotate(${layer.rotation} ${centerX} ${centerY})"` : "";

    const fontFamilyEscaped = layer.fontFamily.replace(/"/g, "&quot;");

    bodyElements.push(
      `<text x="${textX}" y="${startY}" ` +
        `font-family="${fontFamilyEscaped}" ` +
        `font-size="${fontSize}" ` +
        `font-weight="${layer.fontWeight}" ` +
        `font-style="${layer.fontStyle}" ` +
        `fill="${layer.color}" ` +
        `text-anchor="${textAnchor}"` +
        strokeAttrs +
        filterAttr +
        transformAttr +
        `>${tspans}</text>`
    );
  });

  // Build defs block with fonts (if any) + filters
  const styleBlock = embeddedFontsCss
    ? `<style type="text/css"><![CDATA[${embeddedFontsCss}]]></style>`
    : "";
  const defsContent = styleBlock + defs.join("");
  const defsBlock = defsContent ? `<defs>${defsContent}</defs>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">${defsBlock}${bodyElements.join("")}</svg>`;
}

// ============================================
// COLOR PALETTE — curated swatches
// ============================================

export interface ColorSwatch {
  hex: string;
  label: string;
}

export interface ColorGroup {
  name: string;
  colors: ColorSwatch[];
}

export const COLOR_PALETTES: ColorGroup[] = [
  {
    name: "Basics",
    colors: [
      { hex: "#FFFFFF", label: "Weiß" },
      { hex: "#000000", label: "Schwarz" },
      { hex: "#F5F5F5", label: "Off-White" },
      { hex: "#1A1A1A", label: "Soft Black" },
      { hex: "#9CA3AF", label: "Grau" },
      { hex: "#4B5563", label: "Dark Grey" },
    ],
  },
  {
    name: "Nature",
    colors: [
      { hex: "#1B5E20", label: "Forest Green" },
      { hex: "#2E7D32", label: "Garden Green" },
      { hex: "#4CAF50", label: "Fresh Green" },
      { hex: "#8BC34A", label: "Lime" },
      { hex: "#795548", label: "Brown" },
      { hex: "#8D6E63", label: "Cocoa" },
    ],
  },
  {
    name: "Warm",
    colors: [
      { hex: "#FFD54F", label: "Gold" },
      { hex: "#FFA726", label: "Orange" },
      { hex: "#FF7043", label: "Coral" },
      { hex: "#E64A19", label: "Sunset" },
      { hex: "#FFC107", label: "Amber" },
      { hex: "#FF5252", label: "Warm Red" },
    ],
  },
  {
    name: "Cool",
    colors: [
      { hex: "#1976D2", label: "Royal Blue" },
      { hex: "#0288D1", label: "Sky Blue" },
      { hex: "#4FC3F7", label: "Light Blue" },
      { hex: "#00ACC1", label: "Cyan" },
      { hex: "#26A69A", label: "Teal" },
      { hex: "#5E35B1", label: "Purple" },
    ],
  },
  {
    name: "Editorial",
    colors: [
      { hex: "#FAFAF7", label: "Cream" },
      { hex: "#E8DCC4", label: "Sand" },
      { hex: "#A0826D", label: "Taupe" },
      { hex: "#36454F", label: "Charcoal" },
      { hex: "#3E5641", label: "Olive Dark" },
      { hex: "#9B2335", label: "Wine" },
    ],
  },
  {
    name: "Vibrant",
    colors: [
      { hex: "#E91E63", label: "Hot Pink" },
      { hex: "#9C27B0", label: "Magenta" },
      { hex: "#F50057", label: "Neon Red" },
      { hex: "#00E676", label: "Neon Green" },
      { hex: "#00B0FF", label: "Electric Blue" },
      { hex: "#FFEA00", label: "Neon Yellow" },
    ],
  },
];
