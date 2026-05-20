"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  Wand2,
  X,
  Plus,
  Stamp,
  Video,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import JobProgress from "./job-progress";
import {
  VIDEO_PROMPT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
} from "@/lib/video-prompts";

type AspectRatio = "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type JobType = "image" | "video" | "video-i2v" | "image-hybrid";

interface MediaItem {
  id: string;
  type: "image" | "video";
  title: string | null;
  url: string | null;
}

interface Props {
  brandId: string;
  brandLogoUrl?: string | null;
  defaultType?: "image" | "video";
  trigger?: React.ReactNode;
}

const MAX_REFERENCES = 3;

// Risky words to warn about (especially for cannabis-related brands)
const RISKY_WORDS_PATTERNS = [
  { word: "bud", suggestion: "ersetze durch 'the object' oder 'it'" },
  { word: "cannabis", suggestion: "ersetze durch 'the object' oder 'the subject'" },
  { word: "marijuana", suggestion: "ersetze durch 'the object'" },
  { word: "weed", suggestion: "ersetze durch 'the object'" },
  { word: "pot", suggestion: "ersetze durch 'the object'" },
  { word: "smoke", suggestion: "ersetze durch 'aromatic vapor' oder 'mystical mist'" },
  { word: "smoking", suggestion: "ersetze durch 'releasing aromatic vapor'" },
  { word: "thc", suggestion: "weglassen — keine chemischen Begriffe" },
  { word: "joint", suggestion: "weglassen" },
  { word: "high", suggestion: "ersetze durch 'elevated' oder 'transcendent'" },
  { word: "stoned", suggestion: "ersetze durch 'elevated'" },
];

function detectRiskyWords(text: string): { word: string; suggestion: string }[] {
  const found: { word: string; suggestion: string }[] = [];
  const lower = text.toLowerCase();
  for (const pattern of RISKY_WORDS_PATTERNS) {
    const regex = new RegExp(`\\b${pattern.word}\\b`, "i");
    if (regex.test(lower)) {
      found.push(pattern);
    }
  }
  return found;
}

export default function GenerateDialog({ brandId, brandLogoUrl, defaultType = "image", trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "hybrid">("create");
  const [type, setType] = useState<"image" | "video">(defaultType);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [videoDuration, setVideoDuration] = useState<4 | 6 | 8>(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobType, setJobType] = useState<JobType>("image");

  const [referenceIds, setReferenceIds] = useState<(string | null)[]>([null, null, null]);
  const [pickerOpenForSlot, setPickerOpenForSlot] = useState<number | null>(null);

  const [startImageId, setStartImageId] = useState<string | null>(null);
  const [pickerOpenForVideo, setPickerOpenForVideo] = useState(false);

  const [availableImages, setAvailableImages] = useState<MediaItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [applyLogo, setApplyLogo] = useState(false);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("bottom-right");
  const [logoSize, setLogoSize] = useState(12);
  const [logoPadding, setLogoPadding] = useState(3);
  const [logoOpacity, setLogoOpacity] = useState(100);

  // Show templates panel for image-to-video
  const [showTemplates, setShowTemplates] = useState(false);

  // Detect risky words in prompt
  const riskyWords = useMemo(() => detectRiskyWords(prompt), [prompt]);

  const reset = () => {
    setPrompt("");
    setTitle("");
    setTags("");
    setError(null);
    setReferenceIds([null, null, null]);
    setStartImageId(null);
    setPickerOpenForSlot(null);
    setPickerOpenForVideo(false);
    setApplyLogo(false);
    setJobId(null);
    setShowTemplates(false);
  };

  useEffect(() => {
    if ((pickerOpenForSlot !== null || pickerOpenForVideo) && availableImages.length === 0) {
      setLoadingImages(true);
      fetch(`/api/media?brandId=${brandId}&type=image&limit=100`)
        .then((r) => r.json())
        .then((data) => setAvailableImages(data.media || []))
        .finally(() => setLoadingImages(false));
    }
  }, [pickerOpenForSlot, pickerOpenForVideo, brandId, availableImages.length]);

  const handleSelectReference = (mediaId: string) => {
    if (pickerOpenForSlot === null) return;
    const next = [...referenceIds];
    next[pickerOpenForSlot] = mediaId;
    setReferenceIds(next);
    setPickerOpenForSlot(null);
  };

  const removeReference = (slotIdx: number) => {
    const next = [...referenceIds];
    next[slotIdx] = null;
    setReferenceIds(next);
  };

  const handleSelectStartImage = (mediaId: string) => {
    setStartImageId(mediaId);
    setPickerOpenForVideo(false);
  };

  const handleApplyTemplate = (templatePrompt: string) => {
    setPrompt(templatePrompt);
    setShowTemplates(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const activeRefs = referenceIds.filter((id): id is string => !!id);
    if (mode === "hybrid" && type === "image" && activeRefs.length === 0) {
      setError("Bitte wähle mindestens ein Referenz-Bild aus");
      return;
    }

    setLoading(true);
    setError(null);

    let jt: JobType = "image";
    if (type === "video") jt = startImageId ? "video-i2v" : "video";
    else if (mode === "hybrid" && activeRefs.length > 0) jt = "image-hybrid";
    setJobType(jt);

    try {
      if (type === "image") {
        const res = await fetch("/api/media/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId,
            prompt,
            title: title || undefined,
            tags,
            aspectRatio,
            referenceMediaIds: mode === "hybrid" ? activeRefs : undefined,
            applyLogo,
            logoPosition: applyLogo ? logoPosition : undefined,
            logoSizePercent: applyLogo ? logoSize : undefined,
            logoPaddingPercent: applyLogo ? logoPadding : undefined,
            logoOpacity: applyLogo ? logoOpacity : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Generierung fehlgeschlagen");
          setLoading(false);
          return;
        }
        if (data.jobId && !jobId) setJobId(data.jobId);
      } else {
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
            startImageMediaId: startImageId || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Video-Generierung fehlgeschlagen");
          setLoading(false);
          return;
        }
        if (data.jobId && !jobId) setJobId(data.jobId);
      }

      setTimeout(() => {
        reset();
        setOpen(false);
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading || jobId) return;
    const pollForJob = async () => {
      try {
        const res = await fetch(`/api/jobs/recent?brandId=${brandId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.jobId) setJobId(data.jobId);
        }
      } catch {}
    };
    const interval = setInterval(pollForJob, 500);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [loading, jobId, brandId]);

  const referenceItems = referenceIds.map((id) =>
    id ? availableImages.find((m) => m.id === id) || null : null
  );
  const startImageItem = startImageId
    ? availableImages.find((m) => m.id === startImageId) || null
    : null;

  const anyPickerOpen = pickerOpenForSlot !== null || pickerOpenForVideo;
  const showImageToVideoHints = type === "video" && !!startImageItem;

  const closePicker = () => {
    setPickerOpenForSlot(null);
    setPickerOpenForVideo(false);
  };

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KI-Content generieren</DialogTitle>
          <DialogDescription>
            Brand-Kontext und Stil-Regeln werden automatisch verwendet.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <JobProgress
            jobId={jobId}
            jobType={jobType}
            onError={(err) => {
              setError(err);
              setLoading(false);
            }}
          />
        )}

        {/* Template panel for image-to-video */}
        {showTemplates && !loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">📋 Geprüfte Bewegungs-Templates</Label>
              <Button size="sm" variant="ghost" onClick={() => setShowTemplates(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Klicke ein Template — wird sofort als Prompt eingesetzt.
            </div>
            {TEMPLATE_CATEGORIES.map((cat) => {
              const templates = getTemplatesByCategory(cat.key);
              if (templates.length === 0) return null;
              return (
                <div key={cat.key}>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                    {cat.label}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleApplyTemplate(t.prompt)}
                        className="border rounded-lg p-3 text-left hover:border-primary hover:bg-accent/30 transition-colors"
                      >
                        <div className="text-sm font-medium flex items-center gap-1">
                          <span>{t.emoji}</span>
                          <span>{t.label}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {t.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {anyPickerOpen && !loading && !showTemplates && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {pickerOpenForVideo
                  ? "Start-Bild für Video wählen"
                  : `Bild für Slot ${(pickerOpenForSlot ?? 0) + 1} wählen`}
              </Label>
              <Button size="sm" variant="ghost" onClick={closePicker}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {loadingImages ? (
              <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
                Lade Bilder...
              </div>
            ) : availableImages.length === 0 ? (
              <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
                Keine Bilder in der Bibliothek.
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                {availableImages.map((m) => {
                  const isInOtherSlot =
                    pickerOpenForSlot !== null && referenceIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        if (pickerOpenForVideo) handleSelectStartImage(m.id);
                        else handleSelectReference(m.id);
                      }}
                      disabled={isInOtherSlot}
                      className={`aspect-square rounded overflow-hidden border-2 transition-colors ${
                        isInOtherSlot
                          ? "border-primary opacity-40 cursor-not-allowed"
                          : "border-transparent hover:border-primary"
                      }`}
                      title={isInOtherSlot ? "Bereits in anderem Slot" : m.title || ""}
                    >
                      {m.url ? (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!anyPickerOpen && !loading && !showTemplates && (
          <div className="space-y-4">
            {type === "image" && (
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
                  onClick={() => setMode("hybrid")}
                  className={`p-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                    mode === "hybrid" ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                  }`}
                >
                  <Wand2 className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Hybrid (echt + KI)</div>
                    <div className="text-xs text-muted-foreground">Bis zu 3 Fotos kombinieren</div>
                  </div>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setType("image");
                  setStartImageId(null);
                }}
                className={`p-2 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                  type === "image" ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <div className="text-sm">Bild (Nano Banana 2)</div>
              </button>
              <button
                onClick={() => {
                  setType("video");
                  setMode("create");
                  setReferenceIds([null, null, null]);
                }}
                className={`p-2 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                  type === "video" ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                }`}
              >
                <Film className="w-4 h-4" />
                <div className="text-sm">Video (Veo 2)</div>
              </button>
            </div>

            {type === "image" && mode === "hybrid" && (
              <div className="space-y-2">
                <Label className="text-xs">Referenz-Bilder (bis zu {MAX_REFERENCES})</Label>
                <div className="grid grid-cols-3 gap-2">
                  {referenceItems.map((item, idx) => (
                    <div key={idx} className="relative aspect-square">
                      {item ? (
                        <>
                          {item.url ? (
                            <img
                              src={item.url}
                              alt=""
                              className="w-full h-full object-cover rounded-lg border-2 border-primary"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted rounded-lg" />
                          )}
                          <button
                            onClick={() => removeReference(idx)}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:bg-destructive/90"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white">
                            Slot {idx + 1}
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => setPickerOpenForSlot(idx)}
                          className="w-full h-full rounded-lg border-2 border-dashed hover:border-primary hover:bg-accent/30 transition-colors flex flex-col items-center justify-center text-muted-foreground"
                        >
                          <Plus className="w-5 h-5 mb-1" />
                          <span className="text-xs">Slot {idx + 1}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {type === "video" && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  Start-Bild (optional) — animiert dein Bild zum Video
                </Label>
                {startImageItem ? (
                  <div className="border rounded-lg p-2 flex items-center gap-2 bg-accent/30">
                    {startImageItem.url && (
                      <img src={startImageItem.url} alt="" className="w-14 h-14 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {startImageItem.title || "Bild"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Veo animiert dieses Bild
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setStartImageId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPickerOpenForVideo(true)}
                    className="w-full border-2 border-dashed rounded-lg p-3 hover:border-primary hover:bg-accent/30 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
                  >
                    <Plus className="w-4 h-4" />
                    Start-Bild wählen (Image-to-Video)
                  </button>
                )}

                {/* CRITICAL: Image-to-video guidance */}
                {startImageItem && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-semibold text-blue-900 dark:text-blue-100">
                          Wichtig bei Image-to-Video:
                        </div>
                        <ul className="space-y-0.5 text-blue-900 dark:text-blue-200 list-disc list-inside">
                          <li><b>NICHT</b> das Objekt im Bild beschreiben — das siehst Veo schon</li>
                          <li>Nur <b>Bewegung + Atmosphäre</b> beschreiben</li>
                          <li>Kurze Prompts (unter 30 Wörter) wirken am besten</li>
                          <li>Sage "it" / "the object" statt das Subjekt zu benennen</li>
                        </ul>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTemplates(true)}
                      className="w-full"
                    >
                      📋 Geprüfte Bewegungs-Templates verwenden
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="gen-prompt">
                  {showImageToVideoHints
                    ? "Bewegungs-Prompt (nur Aktion + Atmosphäre)"
                    : type === "image" && mode === "hybrid"
                    ? "Was soll erstellt werden?"
                    : "Prompt (Englisch wirkt am besten)"}
                </Label>
                {showImageToVideoHints && (
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    📋 Templates
                  </button>
                )}
              </div>
              <Textarea
                id="gen-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  showImageToVideoHints
                    ? "z.B. Camera slowly orbits. Red silk cape flows in slow motion. Golden hour lighting."
                    : type === "video"
                    ? "z.B. Slow cinematic drone shot over Swiss Alpine meadow at golden hour"
                    : mode === "hybrid"
                    ? "z.B. Place the broccoli from image 1 onto the wooden table from image 2"
                    : "z.B. Fresh broccoli on a rustic wooden table in a Swiss mountain cabin"
                }
                rows={showImageToVideoHints ? 3 : 4}
              />

              {/* Risky words warning */}
              {riskyWords.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-2 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs space-y-1">
                      <div className="font-semibold text-amber-900 dark:text-amber-100">
                        Risikante Wörter erkannt:
                      </div>
                      {riskyWords.map((w, i) => (
                        <div key={i} className="text-amber-800 dark:text-amber-200">
                          <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded font-mono">
                            {w.word}
                          </code>
                          {" → "}
                          {w.suggestion}
                        </div>
                      ))}
                      <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
                        Diese Wörter können Sicherheitsfilter triggern und zu schlechten Ergebnissen führen.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Length warning for image-to-video */}
              {showImageToVideoHints && prompt.split(/\s+/).length > 35 && (
                <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-2 mt-2">
                  ⚠️ Prompt ist sehr lang ({prompt.split(/\s+/).length} Wörter). Bei Image-to-Video unter 30 Wörter halten für beste Ergebnisse.
                </div>
              )}
            </div>

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

            {type === "video" && (
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

            {type === "image" && brandLogoUrl && (
              <div className="space-y-2 border rounded-lg p-3 bg-accent/20">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyLogo}
                    onChange={(e) => setApplyLogo(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <Stamp className="w-4 h-4" />
                  <span className="text-sm font-medium">Marken-Logo nach Generierung drauflegen</span>
                </label>

                {applyLogo && (
                  <div className="pl-7 space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <img src={brandLogoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white rounded border" />
                      <div className="text-xs text-muted-foreground">
                        Echtes Logo wird pixelgenau eingefügt.
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs mb-1 block">Position</Label>
                      <div className="grid grid-cols-2 gap-1">
                        {(
                          [
                            { v: "top-left", l: "Oben links" },
                            { v: "top-right", l: "Oben rechts" },
                            { v: "bottom-left", l: "Unten links" },
                            { v: "bottom-right", l: "Unten rechts" },
                          ] as { v: LogoPosition; l: string }[]
                        ).map((p) => (
                          <button
                            key={p.v}
                            onClick={() => setLogoPosition(p.v)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              logoPosition === p.v
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:bg-accent"
                            }`}
                          >
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Größe: {logoSize}%</Label>
                        <input type="range" min={5} max={30} value={logoSize}
                          onChange={(e) => setLogoSize(parseInt(e.target.value))}
                          className="w-full accent-primary" />
                      </div>
                      <div>
                        <Label className="text-xs">Abstand: {logoPadding}%</Label>
                        <input type="range" min={1} max={10} value={logoPadding}
                          onChange={(e) => setLogoPadding(parseInt(e.target.value))}
                          className="w-full accent-primary" />
                      </div>
                      <div>
                        <Label className="text-xs">Deckkraft: {logoOpacity}%</Label>
                        <input type="range" min={20} max={100} value={logoOpacity}
                          onChange={(e) => setLogoOpacity(parseInt(e.target.value))}
                          className="w-full accent-primary" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="gen-title" className="text-xs">Titel (optional)</Label>
                <Input
                  id="gen-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Wird sonst automatisch gesetzt"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gen-tags" className="text-xs">Tags</Label>
                <Input
                  id="gen-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="kommagetrennt"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Abbrechen
              </Button>
              <Button onClick={handleGenerate} disabled={!prompt.trim() || loading}>
                <Sparkles className="w-4 h-4" />
                {loading ? "Generiert..." : "Generieren"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
