"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, X, ExternalLink, BookOpen, Star } from "lucide-react";
import type { InspirationPost, Platform } from "@/lib/types";

interface Props {
  brandId: string;
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
];

export default function InspirationManager({ brandId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<InspirationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | Platform>("all");

  // Form state
  const [caption, setCaption] = useState("");
  const [sourceAccount, setSourceAccount] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [tags, setTags] = useState("");
  const [whyItWorks, setWhyItWorks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("brandId", brandId);
    if (filter !== "all") params.set("platform", filter);
    const res = await fetch(`/api/inspiration?${params.toString()}`);
    const data = await res.json();
    setItems(data.inspirations || []);
    setLoading(false);
  }, [brandId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!caption.trim()) {
      setError("Caption ist erforderlich");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/inspiration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          caption,
          sourceAccount: sourceAccount || undefined,
          sourceUrl: sourceUrl || undefined,
          platform,
          tags,
          whyItWorks: whyItWorks || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen");
      setCaption("");
      setSourceAccount("");
      setSourceUrl("");
      setTags("");
      setWhyItWorks("");
      setAddOpen(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Diese Inspiration löschen?")) return;
    await fetch(`/api/inspiration/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs rounded-md border transition-colors ${
              filter === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            Alle ({items.length})
          </button>
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilter(p.value)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                filter === p.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setAddOpen(!addOpen)} size="sm">
          {addOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {addOpen ? "Schließen" : "Inspiration hinzufügen"}
        </Button>
      </div>

      {addOpen && (
        <Card className="p-4 space-y-3">
          <div>
            <Label className="text-sm font-semibold">Neue Inspiration</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Füge Captions von Posts hinzu, die dich inspirieren. ULTRON nutzt sie als Stil-Anker bei Generierungen.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Caption / Text des Posts *</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Kopiere den Text des Posts den du als Inspiration nutzen willst..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Account / Quelle</Label>
              <Input
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                placeholder="z.B. @lidl_swiss"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Plattform</Label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full h-9 px-2 text-sm border rounded-md bg-background"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">URL (optional)</Label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Warum funktioniert dieser Post?</Label>
            <Textarea
              value={whyItWorks}
              onChange={(e) => setWhyItWorks(e.target.value)}
              placeholder="z.B. 'Starker Hook in der ersten Zeile, klare Aussage, kein Werbe-Sprech'"
              rows={2}
            />
            <p className="text-[10px] text-muted-foreground">
              Hilft der KI zu verstehen WAS du am Stil magst
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tags (kommagetrennt)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="z.B. hook, storytelling, premium"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleAdd} disabled={saving || !caption.trim()}>
              {saving ? "Speichert..." : "Hinzufügen"}
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-8">Lade...</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Noch keine Inspirationen</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Sammle Captions von Posts, die dir gefallen — egal von welcher Marke. 
            ULTRON nutzt sie als Stil-Anker und generiert Captions in ähnlichem Stil.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((i) => (
            <Card key={i.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {i.source_account && (
                      <span className="font-mono">{i.source_account}</span>
                    )}
                    {i.platform && (
                      <span className="px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
                        {i.platform}
                      </span>
                    )}
                    {i.used_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" />
                        {i.used_count}×
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {i.source_url && (
                    <a
                      href={i.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-accent rounded"
                      title="Original ansehen"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(i.id)}
                    className="p-1 hover:bg-accent rounded"
                    title="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap line-clamp-5">{i.caption}</div>
              {i.why_it_works && (
                <div className="text-xs italic text-muted-foreground border-t pt-2">
                  💡 {i.why_it_works}
                </div>
              )}
              {i.tags && i.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {i.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
