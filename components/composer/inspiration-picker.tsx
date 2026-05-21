"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import type { InspirationPost, Platform } from "@/lib/types";

interface Props {
  brandId: string;
  brandSlug: string;
  platform: Platform;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxSelectable?: number;
}

export default function InspirationPicker({
  brandId,
  brandSlug,
  platform,
  selectedIds,
  onChange,
  maxSelectable = 3,
}: Props) {
  const [inspirations, setInspirations] = useState<InspirationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [filterByPlatform, setFilterByPlatform] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("brandId", brandId);
    if (filterByPlatform) params.set("platform", platform);
    fetch(`/api/inspiration?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setInspirations(data.inspirations || []))
      .finally(() => setLoading(false));
  }, [brandId, platform, filterByPlatform]);

  const selected = inspirations.filter((i) => selectedIds.includes(i.id));

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < maxSelectable) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          Stil-Inspirationen (optional, max {maxSelectable})
        </Label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowPicker(!showPicker)}
          className="h-6 text-[10px]"
        >
          {showPicker ? "Schließen" : selected.length > 0 ? "Ändern" : "Hinzufügen"}
        </Button>
      </div>

      {/* Selected preview */}
      {selected.length > 0 && !showPicker && (
        <div className="space-y-1.5">
          {selected.map((i) => (
            <div key={i.id} className="border rounded-md p-2 bg-accent/20 text-xs flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {i.source_account && (
                  <div className="text-[10px] text-muted-foreground">
                    {i.source_account} · {i.platform || "—"}
                  </div>
                )}
                <div className="line-clamp-2 mt-0.5">{i.caption}</div>
              </div>
              <button
                onClick={() => toggle(i.id)}
                className="p-1 hover:bg-background rounded shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Picker */}
      {showPicker && (
        <div className="border rounded-lg p-3 bg-background space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={filterByPlatform}
                onChange={(e) => setFilterByPlatform(e.target.checked)}
                className="w-3 h-3 accent-primary"
              />
              <span>Nur {platform}-Inspirationen zeigen</span>
            </label>
            <Link
              href={`/brands/${brandSlug}/inspiration`}
              className="text-[10px] text-primary hover:underline"
            >
              <Plus className="w-3 h-3 inline" /> Verwalten
            </Link>
          </div>

          {loading ? (
            <div className="text-xs text-muted-foreground text-center py-3">Lade...</div>
          ) : inspirations.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4 bg-muted/50 rounded">
              Noch keine Inspirationen.
              <br />
              <Link
                href={`/brands/${brandSlug}/inspiration`}
                className="text-primary hover:underline mt-1 inline-block"
              >
                Inspirationen hinzufügen →
              </Link>
            </div>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {inspirations.map((i) => {
                const isSelected = selectedIds.includes(i.id);
                const atLimit = !isSelected && selectedIds.length >= maxSelectable;
                return (
                  <button
                    key={i.id}
                    onClick={() => toggle(i.id)}
                    disabled={atLimit}
                    className={`w-full text-left p-2 border rounded-md transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : atLimit
                        ? "opacity-40 cursor-not-allowed border-border"
                        : "border-border hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 text-xs">
                        {i.source_account && (
                          <div className="text-[10px] text-muted-foreground">
                            {i.source_account} · {i.platform || "—"}
                            {i.used_count > 0 && (
                              <span className="ml-1">· {i.used_count}× genutzt</span>
                            )}
                          </div>
                        )}
                        <div className="line-clamp-2 mt-0.5">{i.caption}</div>
                        {i.tags && i.tags.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {i.tags.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="text-[10px] text-muted-foreground text-center pt-1">
              {selectedIds.length}/{maxSelectable} ausgewählt
            </div>
          )}
        </div>
      )}
    </div>
  );
}
