import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";
import type { Brand } from "@/lib/types";
import DraftCard from "@/components/composer/draft-card";

async function getBrand(slug: string): Promise<Brand | null> {
  const supabase = getServerClient();
  const { data } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  return data as Brand | null;
}

export default async function BrandDraftsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href={`/brands/${brand.slug}`}>
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Marke
        </Link>
      </Button>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ background: brand.primary_color || "#1B5E20" }}
            >
              {brand.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{brand.name} — Entwürfe</h1>
            <p className="text-sm text-muted-foreground">Gespeicherte Posts, die noch nicht geplant sind</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/brands/${brand.slug}/composer`}>
            <Plus className="w-4 h-4" />
            Neuer Entwurf
          </Link>
        </Button>
      </div>

      <DraftsList brandId={brand.id} />
    </div>
  );
}

async function DraftsList({ brandId }: { brandId: string }) {
  const supabase = getServerClient();
  const { data: drafts } = await supabase
    .from("posts")
    .select("*")
    .eq("brand_id", brandId)
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  if (!drafts || drafts.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Noch keine Entwürfe</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Erstelle Captions im Composer und speichere sie als Entwürfe.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Resolve media URLs
  const allMediaIds = new Set<string>();
  drafts.forEach((d: any) => {
    if (Array.isArray(d.media_ids)) d.media_ids.forEach((id: string) => allMediaIds.add(id));
  });

  let mediaMap: Record<string, any> = {};
  if (allMediaIds.size > 0) {
    const { data: mediaData } = await supabase
      .from("media")
      .select("id, type, source, storage_path, title")
      .in("id", Array.from(allMediaIds));

    if (mediaData) {
      for (const m of mediaData) {
        const bucket = m.source === "upload" ? "media-uploads" : "ai-generated";
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(m.storage_path, 3600);
        mediaMap[m.id] = { ...m, url: signed?.signedUrl || null };
      }
    }
  }

  return (
    <div className="space-y-3">
      {drafts.map((d: any) => (
        <DraftCard
          key={d.id}
          draft={d}
          media={
            Array.isArray(d.media_ids) ? d.media_ids.map((id: string) => mediaMap[id]).filter(Boolean) : []
          }
        />
      ))}
    </div>
  );
}
