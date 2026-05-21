"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Info } from "lucide-react";
import type { VoiceMode, Platform } from "@/lib/types";

interface Props {
  platform: Platform;
  selectedId: string | null;
  onSelect: (mode: VoiceMode | null) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  narrative: "📖 Storytelling",
  opinion: "💭 Meinung",
  educational: "🎓 Edukativ",
  sales: "💰 Sales",
  engagement: "🎣 Engagement",
  emotional: "💚 Emotional",
  analytical: "📊 Analytisch",
  humor: "😄 Humor",
  professional: "💼 Business",
  authentic: "🎬 Behind Scenes",
};

export default function VoiceModePicker({ platform, selectedId, onSelect }: Props) {
  const [modes, setModes] = useState<VoiceMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/voice-modes?platform=${platform}`)
      .then((r) => r.json())
      .then((data) => setModes(data.voiceModes || []))
      .finally(() => setLoading(false));
  }, [platform]);

  const selected = modes.find((m) => m.id === selectedId) || null;

  // Group by category
  const byCategory: Record<string, VoiceMode[]> = {};
  for (const m of modes) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }

  if (loading) {
    return <div className="text-xs text-muted-foreground py-2">Lade Stil-Modi...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Stil-Modus (optional)</Label>
        {selected && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSelect(null)}
            className="h-6 text-[10px]"
          >
            <X className="w-3 h-3" />
            Zurücksetzen
          </Button>
        )}
      </div>

      {selected ? (
        <div className="border-2 border-primary rounded-lg p-3 bg-primary/5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold flex items-center gap-1">
                <span>{selected.emoji}</span>
                <span>{selected.label}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{selected.description}</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails(showDetails === selected.id ? null : selected.id)}
              className="h-7 px-2 shrink-0"
            >
              <Info className="w-3.5 h-3.5" />
            </Button>
          </div>

          {showDetails === selected.id && (
            <div className="text-xs space-y-2 pt-2 border-t border-primary/20">
              {selected.best_for && (
                <div>
                  <span className="font-semibold">Gut für: </span>
                  <span className="text-muted-foreground">{selected.best_for}</span>
                </div>
              )}
              {selected.example_hook && (
                <div>
                  <span className="font-semibold">Beispiel-Hook: </span>
                  <span className="text-muted-foreground italic">"{selected.example_hook}"</span>
                </div>
              )}
              {selected.example_structure && (
                <div>
                  <span className="font-semibold">Struktur: </span>
                  <span className="text-muted-foreground">{selected.example_structure}</span>
                </div>
              )}
              {selected.avoid && (
                <div>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Vermeide: </span>
                  <span className="text-muted-foreground">{selected.avoid}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {Object.entries(byCategory).map(([cat, catModes]) => (
            <div key={cat}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                {CATEGORY_LABELS[cat] || cat}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {catModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelect(m)}
                    className="text-left p-2 border rounded-md hover:border-primary hover:bg-accent/30 transition-colors"
                    title={m.description}
                  >
                    <div className="text-xs font-medium flex items-center gap-1">
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {m.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
