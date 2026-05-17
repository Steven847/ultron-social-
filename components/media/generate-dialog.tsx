"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui-dialog";
import { Sparkles, Image as ImageIcon, Film, Wand2, X } from "lucide-react";

interface MediaItem {
  id: string;
  type: "image" | "video";
  title: string | null;
  url: string | null;
}

interface Props {
  brandId: string;
  defaultType?: "image" | "video";
  trigger?: React.ReactNode;
}

export default function GenerateDialog({ brandId, defaultType = "image", trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "hybrid">("create");
  const [type, setType] = useState<"image" | "video">(defaultType);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "9:16" | "16:9" | "4:3" | "3:4">("1:1");
  const [videoDuration, setVideoDuration] = useState<4 | 6 | 8>(8);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hybrid mode state
  const [availableImages, setAvailableImages] = useState<MediaItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [referenceMediaId, setReferenceMediaId] = useState<string | null>(null);

  const reset = () => {
    setPrompt("");
    setTitle("");
    setTags("");
    setError(null);
    setProgress(null);
    setReferenceMediaId(null);
  };

  // Load images for hybrid mode
  useEffect(() => {
    if (open && mode === "hybrid" && availableImages.length === 0) {
      setLoadingImages(true);
      fetch(`/api/media?brandId=${brandId}&type=image&limit=50`)
        .then((r) => r.json())
        .then((data) => setAvailableImages(data.media || []))
        .finally(() => setLoadingImages(false));
    }
  }, [open, mode, brandId, availableImages.length]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (mode === "hybrid" && !referenceMediaId) {
      setError("Bitte wähle ein Referenz-Bild aus");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (type === "image") {
        setProgress(
          mode === "hybrid"
            ? "Hybrid-Bild: Original wird mit KI bearbeitet..."
            : "Generiere Bild mit Nano Banana 2..."
        );
        const res = await fetch("/api/media/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId,
            prompt,
            title: title || undefined,
            tags,
            aspectRatio,
            referenceMediaId: mode === "hybrid" ? referenceMediaId : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generierung fehlgeschlagen");
      } else {
        setProgress("Generiere Video mit Veo 2... (1-3 Minuten)");
        const videoAspect: "9:16" | "16:9" = aspectRatio === "16:9" ? "16:9" : "9:16";
        const res = await fetch("/api/media/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId,
            prompt,
            title: title || undefined,
            tags,
            aspectRatio: videoAspect,
            duration: videoDuration,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Video-Generierung fehlgeschlagen");
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const selectedReference = availableImages.find((m) => m.id === referenceMediaId);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o && !loading) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondary">
            <Sparkles className="w-4 h-4" />
            KI-Generieren
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>KI-Content generieren</DialogTitle>
          <DialogDescription>
            Brand-Kontext und Stil-Regeln werden automatisch verwendet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("create")}
              className={`p-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                mode === "create" ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-medium">Neu erstellen</div>
                <div className="text-xs text-muted-foreground">Komplett von KI</div>
              </div>
            </button>
            <button
              onClick={() => {
                setMode("hybrid");
                setType("image"); // hybrid only for images
              }}
              className={`p-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                mode === "hybrid" ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
              }`}
            >
              <Wand2 className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-medium">Hybrid (echt + KI)</div>
                <div className="text-xs text-muted-foreground">Foto als Basis</div>
              </div>
            </button>
          </div>

          {/* Type selector (only in create mode) */}
          {mode === "create" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType("image")}
                className={`p-2 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                  type === "image" ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <div className="text-sm">Bild (Nano Banana 2)</div>
              </button>
              <button
                onClick={() => setType("video")}
                className={`p-2 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                  type === "video" ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                }`}
              >
                <Film className="w-4 h-4" />
                <div className="text-sm">Video (Veo 2)</div>
              </button>
            </div>
          )}

          {/* Reference picker (hybrid mode) */}
          {mode === "hybrid" && (
            <div className="space-y-2">
              <Label className="text-xs">Referenz-Bild auswählen</Label>
              {selectedReference ? (
                <div className="border rounded-lg p-3 flex items-center gap-3 bg-accent/30">
                  {selectedReference.url && (
                    <img
                      src={selectedReference.url}
                      alt=""
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {selectedReference.title || "Ohne Titel"}
                    </div>
                    <div className="text-xs text-muted-foreground">Wird als Vorlage genutzt</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setReferenceMediaId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : loadingImages ? (
                <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
                  Lade Bilder...
                </div>
              ) : availableImages.length === 0 ? (
                <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
                  Keine Bilder in der Bibliothek. Lade zuerst Fotos hoch.
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {availableImages.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setReferenceMediaId(m.id)}
                      className="aspect-square rounded overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                    >
                      {m.url ? (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-1">
            <Label htmlFor="gen-prompt">
              {mode === "hybrid" ? "Was soll an dem Bild geändert/hinzugefügt werden?" : "Prompt (Englisch wirkt am besten)"}
            </Label>
            <Textarea
              id="gen-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "hybrid"
                  ? "z.B. Place this broccoli into a Swiss Alpine meadow scene with mountains in the background"
                  : type === "image"
                  ? "z.B. Fresh broccoli on a rustic wooden table in a Swiss mountain cabin, morning light, photorealistic"
                  : "z.B. Slow cinematic drone shot over Swiss Alpine meadow at golden hour"
              }
              rows={3}
            />
          </div>

          {/* Aspect ratio */}
          <div className="space-y-1">
            <Label className="text-xs">Format</Label>
            <div className="flex flex-wrap gap-2">
              {(type === "image"
                ? (["1:1", "9:16", "16:9", "4:3", "3:4"] as const)
                : (["9:16", "16:9"] as const)
              ).map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    aspectRatio === r
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {type === "video" && mode === "create" && (
            <div className="space-y-1">
              <Label className="text-xs">Dauer (Sekunden)</Label>
              <div className="flex gap-2">
                {([4, 6, 8] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setVideoDuration(d)}
                    className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                      videoDuration === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="gen-title" className="text-xs">
                Titel (optional)
              </Label>
              <Input
                id="gen-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Wird sonst automatisch gesetzt"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gen-tags" className="text-xs">
                Tags
              </Label>
              <Input
                id="gen-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="kommagetrennt"
              />
            </div>
          </div>

          {progress && (
            <div className="text-sm bg-accent/50 rounded-md p-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              {progress}
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading || (mode === "hybrid" && !referenceMediaId)}
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Generiert..." : "Generieren"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
