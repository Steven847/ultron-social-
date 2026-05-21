import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, BookOpen } from "lucide-react";
import type { Brand } from "@/lib/types";
import InspirationManager from "@/components/inspiration/inspiration-manager";

async function getBrand(slug: string): Promise<Brand | null> {
  const supabase = getServerClient();
  const { data } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  return data as Brand | null;
}

export default async function BrandInspirationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href={`/brands/${brand.slug}`}>
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Marke
        </Link>
      </Button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              {brand.name} — Inspirationen
            </h1>
            <p className="text-sm text-muted-foreground">
              Sammle Captions die du gut findest — ULTRON nutzt sie als Stil-Anker
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/brands/${brand.slug}/composer`}>
            <Sparkles className="w-4 h-4" />
            Composer öffnen
          </Link>
        </Button>
      </div>

      <div className="bg-accent/30 rounded-lg p-4 mb-6 text-sm">
        <p className="font-semibold mb-2">💡 Wie das funktioniert:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Findest du einen Post (egal von welcher Marke), dessen <b>Stil</b> du toll findest? Kopiere die Caption rein.</li>
          <li>Optional: Notiere <b>warum</b> dir der Stil gefällt — das hilft der KI.</li>
          <li>Im Composer: Wähle 1-3 Inspirationen als <b>Stil-Anker</b>.</li>
          <li>ULTRON schreibt in <b>ähnlichem Stil</b> aber mit deinem Brand-Inhalt — kopiert nicht.</li>
        </ol>
      </div>

      <InspirationManager brandId={brand.id} />
    </div>
  );
}
