import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, BookOpen } from "lucide-react";
import type { Brand } from "@/lib/types";
import ComposerPanel from "@/components/composer/composer-panel";

async function getBrand(slug: string): Promise<Brand | null> {
  const supabase = getServerClient();
  const { data } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  return data as Brand | null;
}

export default async function BrandComposerPage({
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
            <h1 className="text-2xl font-bold">{brand.name} — Content Composer</h1>
            <p className="text-sm text-muted-foreground">
              Mit Stil-Modi und Inspirations-Bibliothek
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/brands/${brand.slug}/inspiration`}>
              <BookOpen className="w-4 h-4" />
              Inspirationen
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/brands/${brand.slug}/drafts`}>
              <FileText className="w-4 h-4" />
              Entwürfe
            </Link>
          </Button>
        </div>
      </div>

      <ComposerPanel
        brandId={brand.id}
        brandSlug={brand.slug}
        brandName={brand.name}
        initialMediaId={initialMediaId}
      />
    </div>
  );
}
