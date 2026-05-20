import { getServerClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import DraftCard from "@/components/composer/draft-card";

export default async function GlobalDraftsPage() {
  const supabase = getServerClient();

  const { data: drafts } = await supabase
    .from("posts")
    .select("*, brands(name, slug, logo_url)")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(100);

  const allMediaIds = new Set<string>();
  (drafts || []).forEach((d: any) => {
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

  // Group by brand
  const byBrand: Record<string, { brand: any; drafts: any[] }> = {};
  (drafts || []).forEach((d: any) => {
    const brandId = d.brand_id;
    if (!byBrand[brandId]) byBrand[brandId] = { brand: d.brands, drafts: [] };
    byBrand[brandId].drafts.push(d);
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          Alle Entwürfe
        </h1>
        <p className="text-muted-foreground mt-2">
          Gespeicherte Posts aus dem Content Composer (über alle Marken)
        </p>
      </div>

      {Object.keys(byBrand).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Noch keine Entwürfe</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Wähle eine Marke und erstelle deinen ersten Caption-Entwurf.
            </p>
            <Button asChild>
              <Link href="/brands">Zu den Marken</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(byBrand).map(([brandId, { brand, drafts: brandDrafts }]) => (
            <div key={brandId}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {brand?.logo_url ? (
                    <img src={brand.logo_url} alt="" className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {brand?.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <h2 className="text-lg font-semibold">{brand?.name || "Unbekannt"}</h2>
                  <span className="text-xs text-muted-foreground">({brandDrafts.length})</span>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/brands/${brand?.slug}/composer`}>
                    <Plus className="w-3 h-3" />
                    Neuer Entwurf
                  </Link>
                </Button>
              </div>
              <div className="space-y-3">
                {brandDrafts.map((d: any) => (
                  <DraftCard
                    key={d.id}
                    draft={d}
                    media={
                      Array.isArray(d.media_ids)
                        ? d.media_ids.map((id: string) => mediaMap[id]).filter(Boolean)
                        : []
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
