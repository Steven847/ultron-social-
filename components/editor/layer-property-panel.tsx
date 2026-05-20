"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette } from "lucide-react";
import {
  FONT_DEFS,
  COLOR_PALETTES,
  getFontCssValue,
  findFontDef,
  type TextLayer,
  type FontDef,
} from "@/lib/editor";

interface Props {
  layer: TextLayer;
  brandColors: { primary?: string | null; secondary?: string | null };
  onChange: (patch: Partial<TextLayer>) => void;
  onDelete: () => void;
}

const FONT_CATEGORIES = [
  { value: "modern", label: "Modern Sans" },
  { value: "classic", label: "Klassisch / Serif" },
  { value: "display", label: "Display / Bold" },
  { value: "handwritten", label: "Handgeschrieben" },
  { value: "mono", label: "Mono / Tech" },
  { value: "system", label: "System" },
] as const;

export default function LayerPropertyPanel({ layer, brandColors, onChange, onDelete }: Props) {
  // Color picker mode: which property is being colored
  const [colorTarget, setColorTarget] = useState<null | "text" | "bg" | "shadow" | "stroke">(null);

  const currentFontDef = findFontDef(layer.fontFamily);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Text-Eigenschaften</Label>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Layer löschen">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      {/* Text content */}
      <div className="space-y-1">
        <Label className="text-xs">Text</Label>
        <Textarea
          value={layer.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={3}
          className="font-mono text-sm"
        />
      </div>

      {/* Font family — grouped by category */}
      <div className="space-y-1">
        <Label className="text-xs">Schriftart</Label>
        <select
          value={layer.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full h-9 px-2 text-sm border rounded-md bg-background"
          style={{ fontFamily: layer.fontFamily }}
        >
          {FONT_CATEGORIES.map((cat) => {
            const fontsInCat = FONT_DEFS.filter((f) => f.category === cat.value);
            if (fontsInCat.length === 0) return null;
            return (
              <optgroup key={cat.value} label={cat.label}>
                {fontsInCat.map((f) => {
                  const cssValue = getFontCssValue(f);
                  return (
                    <option key={f.value} value={cssValue} style={{ fontFamily: cssValue }}>
                      {f.label}
                    </option>
                  );
                })}
              </optgroup>
            );
          })}
        </select>
        {currentFontDef?.google && (
          <div className="text-[10px] text-muted-foreground">
            🌐 Google Font — wird automatisch geladen
          </div>
        )}
      </div>

      {/* Bold/Italic/Align */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Stil</Label>
          <div className="flex gap-1">
            <ToggleBtn
              active={layer.fontWeight === "bold"}
              onClick={() => onChange({ fontWeight: layer.fontWeight === "bold" ? "normal" : "bold" })}
            >
              <Bold className="w-3.5 h-3.5" />
            </ToggleBtn>
            <ToggleBtn
              active={layer.fontStyle === "italic"}
              onClick={() => onChange({ fontStyle: layer.fontStyle === "italic" ? "normal" : "italic" })}
            >
              <Italic className="w-3.5 h-3.5" />
            </ToggleBtn>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ausrichtung</Label>
          <div className="flex gap-1">
            <ToggleBtn active={layer.align === "left"} onClick={() => onChange({ align: "left" })}>
              <AlignLeft className="w-3.5 h-3.5" />
            </ToggleBtn>
            <ToggleBtn active={layer.align === "center"} onClick={() => onChange({ align: "center" })}>
              <AlignCenter className="w-3.5 h-3.5" />
            </ToggleBtn>
            <ToggleBtn active={layer.align === "right"} onClick={() => onChange({ align: "right" })}>
              <AlignRight className="w-3.5 h-3.5" />
            </ToggleBtn>
          </div>
        </div>
      </div>

      {/* Color picker for text */}
      <ColorField
        label="Textfarbe"
        value={layer.color}
        brandColors={brandColors}
        isOpen={colorTarget === "text"}
        onToggleOpen={() => setColorTarget(colorTarget === "text" ? null : "text")}
        onChange={(c) => onChange({ color: c })}
      />

      {/* Size */}
      <div className="space-y-1">
        <Label className="text-xs">
          Schriftgröße: <span className="font-mono">{layer.fontSizePercent.toFixed(1)}%</span>
        </Label>
        <input
          type="range"
          min={2}
          max={25}
          step={0.5}
          value={layer.fontSizePercent}
          onChange={(e) => onChange({ fontSizePercent: parseFloat(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Width */}
      <div className="space-y-1">
        <Label className="text-xs">
          Textbreite: <span className="font-mono">{layer.widthPercent}%</span>
        </Label>
        <input
          type="range"
          min={20}
          max={100}
          step={5}
          value={layer.widthPercent}
          onChange={(e) => onChange({ widthPercent: parseInt(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Position X / Y */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Position X: {layer.x}%</Label>
          <input
            type="range"
            min={0}
            max={100}
            value={layer.x}
            onChange={(e) => onChange({ x: parseInt(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Position Y: {layer.y}%</Label>
          <input
            type="range"
            min={0}
            max={100}
            value={layer.y}
            onChange={(e) => onChange({ y: parseInt(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {/* Background */}
      <div className="border-t pt-3 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={layer.backgroundEnabled}
            onChange={(e) => onChange({ backgroundEnabled: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-xs font-medium">Hintergrundbox</span>
        </label>
        {layer.backgroundEnabled && (
          <div className="pl-6 space-y-2">
            <ColorField
              label="Hintergrundfarbe"
              value={layer.backgroundColor}
              brandColors={brandColors}
              isOpen={colorTarget === "bg"}
              onToggleOpen={() => setColorTarget(colorTarget === "bg" ? null : "bg")}
              onChange={(c) => onChange({ backgroundColor: c })}
              compact
            />
            <div className="space-y-1">
              <Label className="text-[11px]">Deckkraft: {layer.backgroundOpacity}%</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={layer.backgroundOpacity}
                onChange={(e) => onChange({ backgroundOpacity: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Padding: {layer.backgroundPadding}%</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={layer.backgroundPadding}
                  onChange={(e) => onChange({ backgroundPadding: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Ecken: {layer.backgroundRadius}</Label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={layer.backgroundRadius}
                  onChange={(e) => onChange({ backgroundRadius: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shadow */}
      <div className="border-t pt-3 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={layer.shadowEnabled}
            onChange={(e) => onChange({ shadowEnabled: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-xs font-medium">Schatten</span>
        </label>
        {layer.shadowEnabled && (
          <div className="pl-6 space-y-2">
            <ColorField
              label="Schattenfarbe"
              value={layer.shadowColor}
              brandColors={brandColors}
              isOpen={colorTarget === "shadow"}
              onToggleOpen={() => setColorTarget(colorTarget === "shadow" ? null : "shadow")}
              onChange={(c) => onChange({ shadowColor: c })}
              compact
            />
            <div className="space-y-1">
              <Label className="text-[11px]">Weichheit: {layer.shadowBlur}</Label>
              <input
                type="range"
                min={0}
                max={30}
                value={layer.shadowBlur}
                onChange={(e) => onChange({ shadowBlur: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stroke */}
      <div className="border-t pt-3 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={layer.strokeEnabled}
            onChange={(e) => onChange({ strokeEnabled: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-xs font-medium">Outline</span>
        </label>
        {layer.strokeEnabled && (
          <div className="pl-6 space-y-2">
            <ColorField
              label="Outline-Farbe"
              value={layer.strokeColor}
              brandColors={brandColors}
              isOpen={colorTarget === "stroke"}
              onToggleOpen={() => setColorTarget(colorTarget === "stroke" ? null : "stroke")}
              onChange={(c) => onChange({ strokeColor: c })}
              compact
            />
            <div className="space-y-1">
              <Label className="text-[11px]">Stärke: {layer.strokeWidth}</Label>
              <input
                type="range"
                min={1}
                max={10}
                value={layer.strokeWidth}
                onChange={(e) => onChange({ strokeWidth: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-md border flex items-center justify-center transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  brandColors: { primary?: string | null; secondary?: string | null };
  isOpen: boolean;
  onToggleOpen: () => void;
  onChange: (color: string) => void;
  compact?: boolean;
}

function ColorField({
  label,
  value,
  brandColors,
  isOpen,
  onToggleOpen,
  onChange,
  compact,
}: ColorFieldProps) {
  return (
    <div className="space-y-1">
      <Label className={compact ? "text-[11px]" : "text-xs"}>{label}</Label>
      <button
        onClick={onToggleOpen}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md border w-full text-left hover:bg-accent transition-colors"
      >
        <div
          className="w-6 h-6 rounded border shrink-0"
          style={{ background: value }}
        />
        <span className="text-xs font-mono">{value.toUpperCase()}</span>
        <Palette className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
      </button>
      {isOpen && (
        <div className="border rounded-md p-2 bg-background space-y-2 max-h-72 overflow-y-auto">
          {/* Brand colors first */}
          {(brandColors.primary || brandColors.secondary) && (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                Brand-Farben
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brandColors.primary && (
                  <ColorButton
                    color={brandColors.primary}
                    label="Brand Primary"
                    active={value.toLowerCase() === brandColors.primary.toLowerCase()}
                    onClick={() => onChange(brandColors.primary!)}
                  />
                )}
                {brandColors.secondary && (
                  <ColorButton
                    color={brandColors.secondary}
                    label="Brand Secondary"
                    active={value.toLowerCase() === brandColors.secondary.toLowerCase()}
                    onClick={() => onChange(brandColors.secondary!)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Palette groups */}
          {COLOR_PALETTES.map((group) => (
            <div key={group.name}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                {group.name}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.colors.map((c) => (
                  <ColorButton
                    key={c.hex}
                    color={c.hex}
                    label={c.label}
                    active={value.toLowerCase() === c.hex.toLowerCase()}
                    onClick={() => onChange(c.hex)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Custom color */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
              Eigene Farbe
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-8 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
                }}
                placeholder="#RRGGBB"
                className="flex-1 h-8 px-2 text-xs font-mono border rounded-md bg-background"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorButton({
  color,
  label,
  active,
  onClick,
}: {
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded border-2 transition-transform hover:scale-110 ${
        active ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}
      style={{ background: color }}
      title={`${label} — ${color}`}
    />
  );
}
