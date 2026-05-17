import { getServerClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import MediaGrid from "@/components/media/media-grid";
import Link from "next/link";

async function getStats() {
  const supabase = getServerClient();
  const [{ count: total }, { count: uploads }, { count: ai }] = await Promise.all([
    supabase.from("media").select("*", { count: "exact", head: true }).eq("archived", false),
    supabase
      .from("media")
      .select("*", { count: "exact", head: true })
      .eq("source", "upload")
      .eq("archived", false),
    supabase
      .from("media")
      .select("*", { count: "exact", head: true })
      .eq("source", "ai_generated")
      .eq("archived", false),
  ]);
  return { total: total || 0, uploads: uploads || 0, ai: ai || 0 };
}

async function getBrands() {
  const supabase = getServerClient();
  const { data } = await supabase.from("brands").select("id, slug, name, logo_url").order("name");
  return data || [];
}

export default async function MediaOverviewPage() {
  const [stats, brands] = await Promise.all([getStats(), getBrands()]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ImageIcon className="w-8 h-8 text-primary" />
          Medien-Bibliothek
        </h1>
        <p className="text-muted-foreground mt-2">
          Alle Bilder und Videos über alle Marken hinweg. Wähle eine Marke unten für Upload und KI-Generierung.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Gesamt</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Hochgeladen</div>
            <div className="text-2xl font-bold">{stats.uploads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">KI-generiert</div>
            <div className="text-2xl font-bold">{stats.ai}</div>
          </CardContent>
        </Card>
      </div>

      {/* Brand quick-jump */}
      {brands.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase">
              Marke wählen für Upload / KI-Generierung
            </div>
            <div className="flex flex-wrap gap-2">
              {brands.map((b: any) => (
                <Link
                  key={b.id}
                  href={`/brands/${b.slug}/media`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent transition-colors text-sm"
                >
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {b.name.charAt(0)}
                    </div>
                  )}
                  {b.name}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid (alle Marken) */}
      <MediaGrid showBrandColumn />
    </div>
  );
}
