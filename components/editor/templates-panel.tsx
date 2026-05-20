"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookmarkPlus, Trash2, Star, Layers as LayersIcon } from "lucide-react";
import type { TextLayer } from "@/lib/editor";

interface OverlayTemplate {
  id: string;
  name: string;
  description: string | null;
  layers: TextLayer[];
  format: string | null;
  used_count: number;
  last_used_at: string | null;
}

interface Props {
  brandId: string;
  currentLayers: TextLayer[];
  currentFormat?: string;
  onApplyTemplate: (layers: TextLayer[]) => void;
}

export default function TemplatesPanel({
  brandId,
  currentLayers,
  currentFormat,
  onApplyTemplate,
}: Props) {
  const [templates, setTemplates] = useState<OverlayTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [savingNow, setSavingNow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/editor/templates?brandId=${brandId}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveAsTemplate = async () => {
    if (!savingName.trim()) {
      setSavingError("Bitte einen Namen eingeben");
      return;
    }
    if (currentLayers.length === 0) {
      setSavingError("Mindestens ein Layer im Editor nötig");
      return;
    }
    setSavingNow(true);
    setSavingError(null);
    try {
      const res = await fetch("/api/editor/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          name: savingName,
          layers: currentLayers,
          format: currentFormat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen");

      setSavingName("");
      setShowSaveForm(false);
      load();
    } catch (err: any) {
      setSavingError(err.message);
    } finally {
      setSavingNow(false);
    }
  };

  const handleApply = async (t: OverlayTemplate) => {
    // Apply layers (regenerate IDs to avoid duplicates)
    const fresh = t.layers.map((l) => ({ ...l, id: crypto.randomUUID() }));
    onApplyTemplate(fresh);

    // Increment use count
    await fetch(`/api/editor/templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "use" }),
    });
    load();
  };

  const handleDelete = async (t: OverlayTemplate) => {
    if (!confirm(`Template "${t.name}" löschen?`)) return;
    await fetch(`/api/editor/templates/${t.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-1">
          <BookmarkPlus className="w-4 h-4" />
          Templates ({templates.length})
        </Label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowSaveForm(!showSaveForm)}
          disabled={currentLayers.length === 0}
        >
          {showSaveForm ? "Schließen" : "Speichern"}
        </Button>
      </div>

      {showSaveForm && (
        <div className="space-y-2 bg-accent/20 p-2 rounded-md">
          <Input
            placeholder="Template-Name (z.B. 'Hook-Style Brokkoli')"
            value={savingName}
            onChange={(e) => setSavingName(e.target.value)}
            disabled={savingNow}
          />
          <div className="text-[10px] text-muted-foreground">
            Speichert die aktuellen {currentLayers.length} Layer als wiederverwendbares Template.
          </div>
          {savingError && (
            <div className="text-xs text-destructive bg-destructive/10 rounded p-1.5">
              {savingError}
            </div>
          )}
          <Button
            size="sm"
            onClick={handleSaveAsTemplate}
            disabled={!savingName.trim() || savingNow}
            className="w-full"
          >
            {savingNow ? "Speichert..." : "Template speichern"}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-muted-foreground text-center py-3">Lade...</div>
      ) : templates.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-4 bg-muted/50 rounded-md">
          Noch keine Templates.<br />Layout erstellen → speichern.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2 p-2 rounded-md border hover:border-primary transition-colors group"
            >
              <button
                onClick={() => handleApply(t)}
                className="flex-1 text-left"
                title="Auf aktuelles Bild anwenden"
              >
                <div className="text-xs font-medium truncate">{t.name}</div>
                <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <LayersIcon className="w-2.5 h-2.5" />
                    {t.layers.length} Layer
                  </span>
                  {t.used_count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5" />
                      {t.used_count}×
                    </span>
                  )}
                  {t.format && <span>{t.format}</span>}
                </div>
              </button>
              <button
                onClick={() => handleDelete(t)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                title="Löschen"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
