import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Sparkles, FileText, Type } from "lucide-react";
import type { Brand } from "@/lib/types";
import MediaGrid from "@/components/media/media-grid";
import UploadDialog from "@/components/media/upload-dialog";
import GenerateDialog from "@/components/media/generate-dialog";

async function getBrand(slug: string): Promise<Brand | null> {
  const supabase = getServerClient();
  const { data } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  return data as Brand | null;
}

export default async function BrandMediaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
            <h1 className="text-2xl font-bold">{brand.name} — Medien</h1>
            <p className="text-sm text-muted-foreground">Upload + KI-Generierung mit Brand-Kontext</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link href={`/brands/${brand.slug}/editor`}>
              <Type className="w-4 h-4" />
              Text-Editor
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/brands/${brand.slug}/composer`}>
              <FileText className="w-4 h-4" />
              Composer
            </Link>
          </Button>
          <UploadDialog
            brandId={brand.id}
            trigger={
              <Button variant="outline">
                <Upload className="w-4 h-4" />
                Hochladen
              </Button>
            }
          />
          <GenerateDialog
            brandId={brand.id}
            brandLogoUrl={brand.logo_url}
            trigger={
              <Button>
                <Sparkles className="w-4 h-4" />
                KI-Generieren
              </Button>
            }
          />
        </div>
      </div>

      <MediaGrid brandId={brand.id} brandSlug={brand.slug} />
    </div>
  );
}
