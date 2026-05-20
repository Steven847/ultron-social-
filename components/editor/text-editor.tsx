"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Save,
  Image as ImageIcon,
  X,
  Layers,
  Type as TypeIcon,
  Quote,
  Tag as TagIcon,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
} from "lucide-react";
import {
  createDefaultLayer,
  createPresetLayer,
  detectFormat,
  presetFromType,
  FORMAT_LABELS,
  type TextLayer,
  type LayerPreset,
  type ImageFormat,
} from "@/lib/editor";
import EditorCanvas from "./editor-canvas";
import LayerPropertyPanel from "./layer-property-panel";
import TemplatesPanel from "./templates-panel";
import AISuggestPanel from "./ai-suggest-panel";

interface MediaItem {
  id: string;
  type: "image" | "video";
  title: string | null;
  url: string | null;
  width?: number | null;
  height?: number | null;
}

interface Props {
  brandId: string;
  brandName: string;
  brandColors: { primary?: string | null; secondary?: string | null };
  initialMediaId?: string;
}

type SidebarTab = "layers" | "templates" | "ai";

export default function TextEditor({ brandId, brandName, brandColors, initialMediaId }: Props) {
  const router = useRouter();

  const [baseMediaId, setBaseMediaId] = useState<string | null>(initialMediaId || null);
  const [baseMedia, setBaseMedia] = useState<MediaItem | null>(null);
  const [availableImages, setAvailableImages] = useState<MediaItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Format detection
  const [detectedFormat, setDetectedFormat] = useState<ImageFormat | null>(null);

  // Sidebar tabs
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("layers");

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const res = await fetch(`/api/media?brandId=${brandId}&type=image&limit=100`);
      const data = await res.json();
      setAvailableImages(data.media || []);
    } finally {
      setLoadingImages(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  useEffect(() => {
    if (!baseMediaId) {
      setBaseMedia(null);
      return;
    }
    const m = availableImages.find((m) => m.id === baseMediaId);
    if (m) setBaseMedia(m);
  }, [baseMediaId, availableImages]);

  // Detect format from loaded image dimensions
  useEffect(() => {
    if (!baseMedia?.url) {
      setDetectedFormat(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setDetectedFormat(detectFormat(img.naturalWidth, img.naturalHeight));
    };
    img.src = baseMedia.url;
  }, [baseMedia?.url]);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  const addLayer = (text = "Dein Text", preset?: LayerPreset) => {
    const layer = preset
      ? createPresetLayer(preset, text, detectedFormat || undefined)
      : createDefaultLayer(text);
    setLayers((prev) => [...prev, layer]);
    setSelectedLayerId(layer.id);
  };

  // From AI suggestion: pick a preset based on type
  const addLayerFromSuggestion = (text: string, type: string) => {
    const preset = presetFromType(type, detectedFormat || undefined);
    addLayer(text, preset);
    setSidebarTab("layers");
  };

  const updateLayer = (id: string, patch: Partial<TextLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const deleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const moveLayer = (id: string, direction: "up" | "down") => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const applyTemplate = (newLayers: TextLayer[]) => {
    setLayers(newLayers);
    setSelectedLayerId(newLayers[0]?.id || null);
    setSidebarTab("layers");
  };

  const handleSave = async () => {
    if (!baseMediaId) {
      setError("Bitte ein Basis-Bild wählen");
      return;
    }
    if (layers.length === 0) {
      setError("Bitte mindestens einen Text-Layer hinzufügen");
      return;
    }
    setSaving(true);
    setError(null);
    setSaveStatus("Rendere mit voller Auflösung...");

    try {
      const res = await fetch("/api/editor/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          baseMediaId,
          layers,
          title: title || undefined,
          tags: tags || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Render fehlgeschlagen");

      setSaveStatus("✓ Bild gespeichert in der Bibliothek!");
      router.refresh();
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err: any) {
      setError(err.message);
      setSaveStatus(null);
    } finally {
      setSaving(false);
    }
  };

  const presets: { value: LayerPreset; label: string; icon: React.ReactNode }[] = [
    { value: "hook-top", label: "Hook oben", icon: <AlignVerticalJustifyStart className="w-4 h-4" /> },
    { value: "caption-center", label: "Caption mittig", icon: <TypeIcon className="w-4 h-4" /> },
    { value: "footer-bottom", label: "Footer unten", icon: <AlignVerticalJustifyEnd className="w-4 h-4" /> },
    { value: "quote-card", label: "Quote-Stil", icon: <Quote className="w-4 h-4" /> },
    { value: "small-tag", label: "Tag/Badge", icon: <TagIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      {pickerOpen && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Basis-Bild wählen</Label>
            <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {loadingImages ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Lade...</div>
          ) : availableImages.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Keine Bilder vorhanden. Lade welche hoch oder generiere mit KI.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
              {availableImages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setBaseMediaId(m.id);
                    setPickerOpen(false);
                  }}
                  className={`aspect-square rounded overflow-hidden border-2 transition-colors ${
                    baseMediaId === m.id ? "border-primary" : "border-transparent hover:border-primary"
                  }`}
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
        </Card>
      )}

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {baseMedia ? (
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent transition-colors"
            >
              {baseMedia.url && (
                <img src={baseMedia.url} alt="" className="w-7 h-7 object-cover rounded" />
              )}
              <span className="text-sm truncate max-w-[120px]">{baseMedia.title || "Bild"}</span>
              <span className="text-xs text-muted-foreground">ändern</span>
            </button>
          ) : (
            <Button variant="outline" onClick={() => setPickerOpen(true)}>
              <ImageIcon className="w-4 h-4" />
              Basis-Bild wählen
            </Button>
          )}

          {detectedFormat && (
            <span className="text-[11px] px-2 py-1 rounded bg-accent text-accent-foreground">
              📐 {FORMAT_LABELS[detectedFormat]}
            </span>
          )}

          <div className="h-6 w-px bg-border mx-1" />

          <Button onClick={() => addLayer()} size="sm" variant="default">
            <Plus className="w-4 h-4" />
            Text-Layer
          </Button>

          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <Button
                key={p.value}
                onClick={() => addLayer("Dein Text", p.value)}
                size="sm"
                variant="ghost"
                title={p.label}
              >
                {p.icon}
                <span className="hidden md:inline ml-1">{p.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Main split */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        {/* Canvas */}
        <div>
          {baseMedia?.url ? (
            <EditorCanvas
              imageUrl={baseMedia.url}
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onUpdateLayer={updateLayer}
            />
          ) : (
            <Card className="aspect-square flex items-center justify-center bg-muted/30">
              <div className="text-center text-muted-foreground p-8">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <div className="font-semibold mb-1">Kein Bild gewählt</div>
                <div className="text-sm">Wähle oben ein Bild aus der Bibliothek</div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar with tabs */}
        <div className="space-y-3">
          {/* Tab switcher */}
          <Card className="p-1">
            <div className="grid grid-cols-3 gap-1">
              {([
                { key: "layers", label: "Layer", count: layers.length },
                { key: "templates", label: "Templates" },
                { key: "ai", label: "✨ KI" },
              ] as { key: SidebarTab; label: string; count?: number }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSidebarTab(t.key)}
                  className={`px-2 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    sidebarTab === t.key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {t.label}
                  {typeof t.count === "number" && <span className="ml-1 opacity-70">({t.count})</span>}
                </button>
              ))}
            </div>
          </Card>

          {/* Layers tab */}
          {sidebarTab === "layers" && (
            <>
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    Layer ({layers.length})
                  </Label>
                </div>
                {layers.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-3">
                    Noch keine Layer. Nutze Presets oben oder die KI-Vorschläge im KI-Tab.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {layers.map((l, idx) => (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLayerId(l.id)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs ${
                          selectedLayerId === l.id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-accent"
                        }`}
                      >
                        <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 truncate">{l.text || "(leer)"}</span>
                        <div className="flex gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(l.id, "up");
                            }}
                            disabled={idx === 0}
                            className="w-5 h-5 rounded hover:bg-background disabled:opacity-30"
                            title="Nach oben"
                          >
                            ↑
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(l.id, "down");
                            }}
                            disabled={idx === layers.length - 1}
                            className="w-5 h-5 rounded hover:bg-background disabled:opacity-30"
                            title="Nach unten"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {selectedLayer && (
                <Card className="p-3">
                  <LayerPropertyPanel
                    layer={selectedLayer}
                    brandColors={brandColors}
                    onChange={(patch) => updateLayer(selectedLayer.id, patch)}
                    onDelete={() => deleteLayer(selectedLayer.id)}
                  />
                </Card>
              )}
            </>
          )}

          {/* Templates tab */}
          {sidebarTab === "templates" && (
            <Card className="p-3">
              <TemplatesPanel
                brandId={brandId}
                currentLayers={layers}
                currentFormat={detectedFormat || undefined}
                onApplyTemplate={applyTemplate}
              />
            </Card>
          )}

          {/* AI tab */}
          {sidebarTab === "ai" && (
            <Card className="p-3">
              <AISuggestPanel
                brandId={brandId}
                mediaId={baseMediaId}
                onAddText={addLayerFromSuggestion}
              />
            </Card>
          )}

          {/* Save area (always visible) */}
          <Card className="p-3 space-y-2">
            <Label className="text-sm font-semibold">Speichern</Label>
            <Input
              placeholder="Titel (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Tags (kommagetrennt)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">{error}</div>
            )}
            {saveStatus && (
              <div className="text-xs bg-accent/50 rounded-md p-2 flex items-center gap-2">
                {saving && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                {saveStatus}
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !baseMediaId || layers.length === 0}
              className="w-full"
            >
              <Save className="w-4 h-4" />
              {saving ? "Rendere..." : "In Bibliothek speichern"}
            </Button>
            <div className="text-[10px] text-muted-foreground">
              Wird als neues Bild gespeichert. Original bleibt unverändert.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
