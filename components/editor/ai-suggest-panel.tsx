"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus, RefreshCw } from "lucide-react";

interface Suggestion {
  text: string;
  type: string;
}

interface Props {
  brandId: string;
  mediaId: string | null;
  onAddText: (text: string, type: string) => void;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  hook: { label: "Hook", emoji: "🎯" },
  caption: { label: "Caption", emoji: "💬" },
  tag: { label: "Tag", emoji: "🏷️" },
  cta: { label: "CTA", emoji: "👉" },
};

export default function AISuggestPanel({ brandId, mediaId, onAddText }: Props) {
  const [caption, setCaption] = useState("");
  const [variant, setVariant] = useState<"mixed" | "hook" | "caption" | "tag" | "cta">("mixed");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!mediaId) {
      setError("Bitte erst ein Basis-Bild wählen");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/editor/suggest-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          mediaId,
          caption: caption || undefined,
          variant,
          count: 8,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generierung fehlgeschlagen");
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const variants: { value: "mixed" | "hook" | "caption" | "tag" | "cta"; label: string }[] = [
    { value: "mixed", label: "Mix" },
    { value: "hook", label: "Hook" },
    { value: "caption", label: "Caption" },
    { value: "tag", label: "Tag" },
    { value: "cta", label: "CTA" },
  ];

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-1">
        <Sparkles className="w-4 h-4 text-primary" />
        KI-Text-Vorschläge
      </Label>

      <div className="space-y-2">
        <Label className="text-[11px]">Typ</Label>
        <div className="flex flex-wrap gap-1">
          {variants.map((v) => (
            <button
              key={v.value}
              onClick={() => setVariant(v.value)}
              className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                variant === v.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px]">Caption-Kontext (optional)</Label>
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Falls schon eine Caption existiert, hier rein — KI passt Overlay-Text dazu an"
          rows={2}
          className="text-xs"
        />
      </div>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 rounded p-1.5">{error}</div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={loading || !mediaId}
        size="sm"
        variant="secondary"
        className="w-full"
      >
        {loading ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Generiert...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            {suggestions.length > 0 ? "Neue Vorschläge" : "Vorschläge generieren"}
          </>
        )}
      </Button>

      {suggestions.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {suggestions.map((s, i) => {
            const typeInfo = TYPE_LABELS[s.type] || TYPE_LABELS.caption;
            return (
              <div
                key={i}
                className="group flex items-start gap-2 p-2 rounded-md border hover:border-primary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[9px] px-1 py-0.5 rounded bg-accent text-accent-foreground">
                      {typeInfo.emoji} {typeInfo.label}
                    </span>
                  </div>
                  <div className="text-xs">{s.text}</div>
                </div>
                <button
                  onClick={() => onAddText(s.text, s.type)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
                  title="Als Layer hinzufügen"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
