"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Heart,
  Trash2,
  Download,
  Sparkles,
  Upload as UploadIcon,
  FileImage,
  Film,
  Wand2,
  Link as LinkIcon,
  FileText,
  Type,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface MediaItem {
  id: string;
  brand_id: string;
  type: "image" | "video";
  source: "upload" | "ai_generated" | "hybrid";
  storage_path: string;
  title: string | null;
  tags: string[] | null;
  category: string | null;
  file_size: number | null;
  is_favorite: boolean;
  created_at: string;
  url: string | null;
  ai_prompt?: string | null;
  ai_refined_from?: string | null;
  brands?: { name: string; slug: string; logo_url: string | null } | null;
}

interface Props {
  brandId?: string;
  brandSlug?: string;
  showBrandColumn?: boolean;
}

export default function MediaGrid({ brandId, brandSlug, showBrandColumn }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video">("all");
  const [filterSource, setFilterSource] = useState<"all" | "upload" | "ai_generated" | "hybrid">("all");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState<string | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (brandId) params.set("brandId", brandId);
      if (filterType !== "all") params.set("type", filterType);
      if (filterSource !== "all") params.set("source", filterSource);
      const res = await fetch("/api/media?" + params.toString());
      const data = await res.json();
      setItems(data.media || []);
    } finally {
      setLoading(false);
    }
  }, [brandId, filterType, filterSource]);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = () => {
    setSelected(null);
    setRefineFeedback("");
    setRefineError(null);
    setRefineProgress(null);
  };

  const filteredItems = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.tags?.some((t) => t.toLowerCase().includes(q)) ||
      item.category?.toLowerCase().includes(q) ||
      item.ai_prompt?.toLowerCase().includes(q)
    );
  });

  const toggleFavorite = async (item: MediaItem) => {
    await fetch("/api/media/" + item.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: !item.is_favorite }),
    });
    load();
  };

  const deleteItem = async (item: MediaItem) => {
    if (!confirm(`"${item.title || "Datei"}" wirklich löschen?`)) return;
    await fetch("/api/media/" + item.id, { method: "DELETE" });
    closeModal();
    load();
  };

  const refineItem = async () => {
    if (!selected || !refineFeedback.trim()) return;
    setRefining(true);
    setRefineError(null);
    setRefineProgress(
      selected.type === "image"
        ? "Verfeinere Bild mit Nano Banana 2..."
        : "Generiere neue Video-Version mit Veo 2... (1-3 Min)"
    );

    try {
      const endpoint = selected.type === "image" ? "/api/media/refine-image" : "/api/media/refine-video";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: selected.id, feedback: refineFeedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verfeinerung fehlgeschlagen");

      setRefineFeedback("");
      closeModal();
      await load();
      router.refresh();
    } catch (err: any) {
      setRefineError(err.message);
    } finally {
      setRefining(false);
      setRefineProgress(null);
    }
  };

  const composerSlug = selected?.brands?.slug || brandSlug;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Suchen nach Titel, Tags, Kategorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 text-xs">
            <FilterButton active={filterType === "all"} onClick={() => setFilterType("all")}>
              Alle
            </FilterButton>
            <FilterButton active={filterType === "image"} onClick={() => setFilterType("image")}>
              <FileImage className="w-3 h-3" /> Bilder
            </FilterButton>
            <FilterButton active={filterType === "video"} onClick={() => setFilterType("video")}>
              <Film className="w-3 h-3" /> Videos
            </FilterButton>
          </div>
          <div className="flex gap-1 text-xs">
            <FilterButton active={filterSource === "all"} onClick={() => setFilterSource("all")}>
              Alle Quellen
            </FilterButton>
            <FilterButton active={filterSource === "upload"} onClick={() => setFilterSource("upload")}>
              <UploadIcon className="w-3 h-3" /> Upload
            </FilterButton>
            <FilterButton active={filterSource === "ai_generated"} onClick={() => setFilterSource("ai_generated")}>
              <Sparkles className="w-3 h-3" /> KI
            </FilterButton>
            <FilterButton active={filterSource === "hybrid"} onClick={() => setFilterSource("hybrid")}>
              <Wand2 className="w-3 h-3" /> Hybrid
            </FilterButton>
          </div>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        {loading ? "Lade..." : `${filteredItems.length} ${filteredItems.length === 1 ? "Medium" : "Medien"}`}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">Keine Medien gefunden.</div>
          <div className="text-xs text-muted-foreground mt-1">
            {brandId
              ? "Lade Dateien hoch oder generiere welche mit KI."
              : "Wähle eine Marke und beginne mit dem Upload."}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted hover:border-primary transition-colors text-left"
            >
              {item.url ? (
                item.type === "image" ? (
                  <img src={item.url} alt={item.title || ""} className="w-full h-full object-cover" />
                ) : (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  {item.type === "image" ? <FileImage className="w-8 h-8" /> : <Film className="w-8 h-8" />}
                </div>
              )}
              <div className="absolute top-1 left-1 flex gap-1">
                {item.source === "ai_generated" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium">
                    KI
                  </span>
                )}
                {item.source === "hybrid" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-medium">
                    HYBRID
                  </span>
                )}
                {item.type === "video" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-medium">
                    VIDEO
                  </span>
                )}
              </div>
              {item.is_favorite && (
                <div className="absolute top-1 right-1">
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-xs text-white truncate font-medium">{item.title || "Ohne Titel"}</div>
                {showBrandColumn && item.brands && (
                  <div className="text-[10px] text-white/70">{item.brands.name}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => !refining && closeModal()}
        >
          <div
            className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
              {selected.url ? (
                selected.type === "image" ? (
                  <img src={selected.url} alt="" className="max-w-full max-h-full object-contain" />
                ) : (
                  <video src={selected.url} controls autoPlay className="max-w-full max-h-full" />
                )
              ) : null}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold">{selected.title || "Ohne Titel"}</h2>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 rounded bg-muted">{selected.type}</span>
                  <span className="px-2 py-1 rounded bg-muted">
                    {selected.source === "upload"
                      ? "Hochgeladen"
                      : selected.source === "ai_generated"
                      ? "KI-generiert"
                      : "Hybrid"}
                  </span>
                  {selected.file_size && (
                    <span className="px-2 py-1 rounded bg-muted">{formatBytes(selected.file_size)}</span>
                  )}
                  {selected.category && (
                    <span className="px-2 py-1 rounded bg-accent text-accent-foreground">{selected.category}</span>
                  )}
                  {selected.brands && (
                    <span className="px-2 py-1 rounded bg-accent text-accent-foreground">
                      {selected.brands.name}
                    </span>
                  )}
                  {selected.ai_refined_from && (
                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      Verfeinert
                    </span>
                  )}
                </div>
              </div>

              {/* QUICK ACTIONS */}
              {composerSlug && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button asChild>
                    <Link href={`/brands/${composerSlug}/composer?media=${selected.id}`}>
                      <FileText className="w-4 h-4" />
                      Caption + Hashtags
                    </Link>
                  </Button>
                  {selected.type === "image" && (
                    <Button asChild variant="secondary">
                      <Link href={`/brands/${composerSlug}/editor?media=${selected.id}`}>
                        <Type className="w-4 h-4" />
                        In Text-Editor öffnen
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {selected.tags && selected.tags.length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-1 text-muted-foreground uppercase">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded bg-muted">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.ai_prompt && (
                <div>
                  <div className="text-xs font-semibold mb-1 text-muted-foreground uppercase">KI-Prompt</div>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-32 overflow-y-auto">
                    {selected.ai_prompt}
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-4 bg-accent/30">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <div className="font-semibold text-sm">Verfeinern</div>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  {selected.type === "image"
                    ? "Beschreibe was geändert werden soll. Das Original-Bild wird als Vorlage genutzt."
                    : "Veo kann Videos nicht direkt bearbeiten — eine neue Version wird mit deinem Feedback erstellt."}
                </div>
                <Textarea
                  value={refineFeedback}
                  onChange={(e) => setRefineFeedback(e.target.value)}
                  placeholder={
                    selected.type === "image"
                      ? "z.B. Mehr Sonnenlicht, Brokkoli größer, wärmere Farben..."
                      : "z.B. Langsamere Kamera, mehr Nebel, andere Tageszeit..."
                  }
                  rows={2}
                  disabled={refining}
                />
                {refineProgress && (
                  <div className="text-sm mt-2 bg-accent rounded-md p-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    {refineProgress}
                  </div>
                )}
                {refineError && (
                  <div className="text-sm mt-2 text-destructive bg-destructive/10 rounded-md p-2">
                    {refineError}
                  </div>
                )}
                <Button
                  onClick={refineItem}
                  disabled={!refineFeedback.trim() || refining}
                  className="mt-3 w-full"
                  variant="secondary"
                >
                  <Wand2 className="w-4 h-4" />
                  {refining ? "Generiert..." : selected.type === "image" ? "Bild verfeinern" : "Neue Version erstellen"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => toggleFavorite(selected)} disabled={refining}>
                  <Heart
                    className={`w-4 h-4 ${selected.is_favorite ? "fill-red-500 text-red-500" : ""}`}
                  />
                  {selected.is_favorite ? "Favorit entfernen" : "Favorisieren"}
                </Button>
                {selected.url && (
                  <Button size="sm" variant="outline" asChild disabled={refining}>
                    <a href={selected.url} download={selected.title || undefined}>
                      <Download className="w-4 h-4" />
                      Herunterladen
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteItem(selected)}
                  className="ml-auto"
                  disabled={refining}
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({
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
      className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
      }`}
    >
      {children}
    </button>
  );
}
