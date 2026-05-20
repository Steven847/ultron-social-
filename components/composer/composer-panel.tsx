"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Wand2,
  Copy,
  Heart,
  Trash2,
  Save,
  Image as ImageIcon,
  X,
  Plus,
  RefreshCw,
  Hash,
} from "lucide-react";
import type { CaptionTone, CaptionLength, Platform } from "@/lib/types";

interface MediaItem {
  id: string;
  type: "image" | "video";
  title: string | null;
  url: string | null;
}

interface CaptionVariant {
  id?: string | null;
  caption: string;
  hashtags: string[];
  firstComment?: string;
}

interface Props {
  brandId: string;
  brandName: string;
  initialMediaId?: string;
  onPostSaved?: () => void;
}

const TONES: { value: CaptionTone; label: string; emoji: string }[] = [
  { value: "witzig", label: "Witzig", emoji: "😄" },
  { value: "informativ", label: "Informativ", emoji: "📚" },
  { value: "frech", label: "Frech", emoji: "😎" },
  { value: "herzlich", label: "Herzlich", emoji: "💚" },
  { value: "professionell", label: "Professionell", emoji: "💼" },
  { value: "inspirierend", label: "Inspirierend", emoji: "✨" },
];

const LENGTHS: { value: CaptionLength; label: string; hint: string }[] = [
  { value: "kurz", label: "Kurz", hint: "80-150 Z." },
  { value: "mittel", label: "Mittel", hint: "200-500 Z." },
  { value: "lang", label: "Lang", hint: "500-1500 Z." },
];

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
];

export default function ComposerPanel({ brandId, brandName, initialMediaId, onPostSaved }: Props) {
  const router = useRouter();

  // Inputs
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(initialMediaId || null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<CaptionTone>("witzig");
  const [length, setLength] = useState<CaptionLength>("mittel");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [variantCount, setVariantCount] = useState(3);
  const [includeFirstComment, setIncludeFirstComment] = useState(false);

  // Outputs
  const [variants, setVariants] = useState<CaptionVariant[]>([]);
  const [variantGroup, setVariantGroup] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Refinement per variant
  const [refiningIdx, setRefiningIdx] = useState<number | null>(null);
  const [refineFeedback, setRefineFeedback] = useState("");

  // Media library for picker
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Save state
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const loadMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/media?brandId=${brandId}&limit=100`);
      const data = await res.json();
      setAvailableMedia(data.media || []);
    } finally {
      setLoadingMedia(false);
    }
  }, [brandId]);

  useEffect(() => {
    if (pickerOpen && availableMedia.length === 0) loadMedia();
  }, [pickerOpen, availableMedia.length, loadMedia]);

  useEffect(() => {
    // Pre-load when initial media id given
    if (initialMediaId && availableMedia.length === 0) loadMedia();
  }, [initialMediaId, availableMedia.length, loadMedia]);

  const selectedMedia = availableMedia.find((m) => m.id === selectedMediaId);

  const handleGenerate = async () => {
    if (!selectedMediaId && !topic.trim()) {
      setError("Bitte ein Bild auswählen oder ein Thema eingeben");
      return;
    }

    setLoading(true);
    setError(null);
    setVariants([]);
    setProgress("Analysiere Bild..." );

    try {
      if (!selectedMediaId) setProgress("Generiere Caption-Varianten...");

      const res = await fetch("/api/composer/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          mediaId: selectedMediaId || undefined,
          topic: topic || undefined,
          tone,
          length,
          platform,
          variantCount,
          includeFirstComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generierung fehlgeschlagen");

      setVariants(data.variants || []);
      setVariantGroup(data.variantGroup || null);
      setImageDescription(data.imageDescription || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleRefine = async (idx: number) => {
    if (!refineFeedback.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const original = variants[idx];
      const res = await fetch("/api/composer/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          original: original.caption,
          feedback: refineFeedback,
          existingHashtags: original.hashtags,
          variantGroup,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verfeinerung fehlgeschlagen");

      // Replace the variant with the refined version
      const next = [...variants];
      next[idx] = data.variant;
      setVariants(next);
      setRefineFeedback("");
      setRefiningIdx(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = async (variant: CaptionVariant) => {
    setSaveStatus("Speichere Entwurf...");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          type: "post",
          title: topic || "Neuer Entwurf",
          tone,
          caption: variant.caption,
          hashtags: variant.hashtags,
          firstComment: variant.firstComment,
          mediaIds: selectedMediaId ? [selectedMediaId] : null,
          platforms: [platform],
          sourceCaptionId: variant.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen");
      setSaveStatus("✓ Entwurf gespeichert!");
      setTimeout(() => setSaveStatus(null), 2500);
      if (onPostSaved) onPostSaved();
      router.refresh();
    } catch (err: any) {
      setSaveStatus("✗ " + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setSaveStatus("✓ Kopiert!");
    setTimeout(() => setSaveStatus(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Picker overlay */}
      {pickerOpen && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Bild oder Video wählen</Label>
            <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {loadingMedia ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Lade...</div>
          ) : availableMedia.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Keine Medien in der Bibliothek.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
              {availableMedia.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMediaId(m.id);
                    setPickerOpen(false);
                  }}
                  className="aspect-square rounded overflow-hidden border-2 border-transparent hover:border-primary transition-colors relative"
                >
                  {m.url ? (
                    m.type === "image" ? (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={m.url} className="w-full h-full object-cover" muted />
                    )
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  {m.type === "video" && (
                    <span className="absolute top-1 left-1 text-[9px] px-1 py-0.5 rounded bg-black/70 text-white">
                      VIDEO
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Input Card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Caption-Generator</h2>
          <span className="text-xs text-muted-foreground ml-auto">für {brandName}</span>
        </div>

        {/* Media + Topic */}
        <div className="grid md:grid-cols-2 gap-3">
          {/* Media slot */}
          <div className="space-y-1">
            <Label className="text-xs">Bild/Video (optional)</Label>
            {selectedMedia ? (
              <div className="border rounded-lg p-2 flex items-center gap-2 bg-accent/30">
                {selectedMedia.url && selectedMedia.type === "image" ? (
                  <img src={selectedMedia.url} alt="" className="w-12 h-12 object-cover rounded" />
                ) : selectedMedia.url && selectedMedia.type === "video" ? (
                  <video src={selectedMedia.url} className="w-12 h-12 object-cover rounded" muted />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{selectedMedia.title || "Ohne Titel"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    KI analysiert das Bild für die Caption
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedMediaId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full border-2 border-dashed rounded-lg p-4 hover:border-primary hover:bg-accent/30 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <Plus className="w-4 h-4" />
                Bild/Video auswählen
              </button>
            )}
          </div>

          {/* Topic */}
          <div className="space-y-1">
            <Label htmlFor="topic" className="text-xs">
              Thema / Anlass (optional)
            </Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. Neue Charge eingetroffen, Tag des Brokkoli, Lidl-Vergleich..."
              rows={3}
            />
          </div>
        </div>

        {/* Tone, Length, Platform */}
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tonalität</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    tone === t.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span className="mr-1">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Länge</Label>
              <div className="flex flex-wrap gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLength(l.value)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      length === l.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium">{l.label}</div>
                    <div className="text-[9px] opacity-70">{l.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Plattform</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      platform === p.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Anzahl Varianten: {variantCount}</Label>
              <input
                type="range"
                min={1}
                max={5}
                value={variantCount}
                onChange={(e) => setVariantCount(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeFirstComment}
                onChange={(e) => setIncludeFirstComment(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Ersten Kommentar mitgenerieren
            </label>
          </div>
        </div>

        {error && (
          <div className="text-sm bg-destructive/10 text-destructive rounded-md p-2">{error}</div>
        )}
        {progress && (
          <div className="text-sm bg-accent/50 rounded-md p-2 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            {progress}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={handleGenerate} disabled={loading}>
            <Sparkles className="w-4 h-4" />
            {loading ? "Generiert..." : `${variantCount} Varianten generieren`}
          </Button>
        </div>
      </Card>

      {/* Image description hint */}
      {imageDescription && (
        <Card className="p-3 bg-accent/30 text-xs">
          <div className="font-semibold mb-1 text-muted-foreground uppercase">KI sieht im Bild:</div>
          <div className="text-muted-foreground">{imageDescription}</div>
        </Card>
      )}

      {/* Variants */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold flex items-center justify-between">
            <span>{variants.length} Varianten</span>
            {saveStatus && <span className="text-xs text-primary">{saveStatus}</span>}
          </div>

          {variants.map((v, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  Variante {idx + 1}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(v.caption + "\n\n" + v.hashtags.join(" "))} title="Caption + Hashtags kopieren">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRefiningIdx(refiningIdx === idx ? null : idx)} title="Verfeinern">
                    <Wand2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="default" onClick={() => handleSaveAsDraft(v)} title="Als Entwurf speichern">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="text-sm whitespace-pre-wrap mb-2">{v.caption}</div>

              {v.hashtags && v.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
                  {v.hashtags.map((h, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full bg-accent/50 text-accent-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {v.firstComment && (
                <div className="mt-2 pt-2 border-t text-xs">
                  <div className="font-semibold text-muted-foreground mb-1">Erster Kommentar:</div>
                  <div className="text-muted-foreground italic">{v.firstComment}</div>
                </div>
              )}

              {refiningIdx === idx && (
                <div className="mt-3 pt-3 border-t bg-accent/20 -mx-4 px-4 pb-3 rounded-b-lg">
                  <Label className="text-xs">Verfeinerungsfeedback</Label>
                  <Textarea
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    placeholder="z.B. Etwas kürzer, mehr Witz am Anfang, Lidl-Bezug hinzufügen..."
                    rows={2}
                    className="mt-1"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRefiningIdx(null);
                        setRefineFeedback("");
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRefine(idx)}
                      disabled={!refineFeedback.trim() || loading}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Verfeinern
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
