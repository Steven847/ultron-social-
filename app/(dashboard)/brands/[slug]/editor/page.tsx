import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Type } from "lucide-react";
import type { Brand } from "@/lib/types";
import TextEditor from "@/components/editor/text-editor";
import { buildGoogleFontsUrl } from "@/lib/editor";

async function getBrand(slug: string): Promise<Brand | null> {
  const supabase = getServerClient();
  const { data } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  return data as Brand | null;
}

export default async function BrandEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ media?: string }>;
}) {
  const { slug } = await params;
  const { media: initialMediaId } = await searchParams;

  const brand = await getBrand(slug);
  if (!brand) notFound();

  const fontsUrl = buildGoogleFontsUrl();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Load Google Fonts CSS for the live preview */}
      {fontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={fontsUrl} />
        </>
      )}

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
              <Type className="w-6 h-6 text-primary" />
              {brand.name} — Text-Editor
            </h1>
            <p className="text-sm text-muted-foreground">
              30+ Schriftarten, 36 Farben + Brand-Farben, Live-Vorschau
            </p>
          </div>
        </div>
      </div>

      <TextEditor
        brandId={brand.id}
        brandName={brand.name}
        brandColors={{
          primary: brand.primary_color,
          secondary: brand.secondary_color,
        }}
        initialMediaId={initialMediaId}
      />
    </div>
  );
}
