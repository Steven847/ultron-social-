"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Image as ImageIcon, Calendar } from "lucide-react";

interface Props {
  draft: any;
  media: any[];
}

export default function DraftCard({ draft, media }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Diesen Entwurf wirklich löschen?")) return;
    setDeleting(true);
    await fetch(`/api/posts/${draft.id}`, { method: "DELETE" });
    router.refresh();
  };

  const copyAll = () => {
    const parts: string[] = [];
    if (draft.caption) parts.push(draft.caption);
    if (Array.isArray(draft.hashtags) && draft.hashtags.length > 0) parts.push("", draft.hashtags.join(" "));
    navigator.clipboard?.writeText(parts.join("\n"));
  };

  const firstMedia = media[0];

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {/* Media preview */}
        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
          {firstMedia?.url ? (
            firstMedia.type === "image" ? (
              <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <video src={firstMedia.url} className="w-full h-full object-cover" muted />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{draft.title || "Ohne Titel"}</div>
              <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-muted-foreground">
                {draft.tone && <span className="px-1.5 py-0.5 rounded bg-muted">{draft.tone}</span>}
                {Array.isArray(draft.platforms) &&
                  draft.platforms.map((p: string) => (
                    <span key={p} className="px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
                      {p}
                    </span>
                  ))}
                <span>
                  {new Date(draft.created_at).toLocaleDateString("de", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={copyAll} title="Caption + Hashtags kopieren">
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting} title="Löschen">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>

          {draft.caption && (
            <div className="text-xs text-muted-foreground line-clamp-3 mt-1">{draft.caption}</div>
          )}

          {Array.isArray(draft.hashtags) && draft.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {draft.hashtags.slice(0, 6).map((h: string, i: number) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/50 text-accent-foreground"
                >
                  {h}
                </span>
              ))}
              {draft.hashtags.length > 6 && (
                <span className="text-[10px] text-muted-foreground">+{draft.hashtags.length - 6}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
