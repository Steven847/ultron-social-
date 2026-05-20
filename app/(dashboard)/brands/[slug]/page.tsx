import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Image as ImageIcon,
  Calendar,
  MessageSquare,
  Settings as SettingsIcon,
  FileText,
  Sparkles,
  Type,
} from "lucide-react";
import type { Brand } from "@/lib/types";
import LogoUploader from "./logo-uploader";

async function getBrand(slug: string): Promise<Brand | null> {
  const supabase = getServerClient();
  const { data } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  return data as Brand | null;
}

async function getCounts(brandId: string) {
  const supabase = getServerClient();
  const [{ count: mediaCount }, { count: draftsCount }] = await Promise.all([
    supabase
      .from("media")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("archived", false),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("status", "draft"),
  ]);
  return { mediaCount: mediaCount || 0, draftsCount: draftsCount || 0 };
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const { mediaCount, draftsCount } = await getCounts(brand.id);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/brands">
          <ArrowLeft className="w-4 h-4" />
          Alle Marken
        </Link>
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-4">
            <LogoUploader
              brandId={brand.id}
              brandSlug={brand.slug}
              currentLogo={brand.logo_url}
              brandName={brand.name}
              primaryColor={brand.primary_color || "#1B5E20"}
            />
            <div className="flex-1">
              <CardTitle className="text-2xl">{brand.name}</CardTitle>
              <CardDescription className="mt-1">@{brand.slug}</CardDescription>
              {brand.description && <p className="text-sm mt-3">{brand.description}</p>}
              <div className="flex gap-2 mt-3">
                {brand.primary_color && (
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-4 h-4 rounded" style={{ background: brand.primary_color }} />
                    <span className="font-mono">{brand.primary_color}</span>
                  </div>
                )}
                {brand.secondary_color && (
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-4 h-4 rounded" style={{ background: brand.secondary_color }} />
                    <span className="font-mono">{brand.secondary_color}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href={`/brands/${brand.slug}/media`}>
          <Card className="hover:shadow-md hover:border-primary transition-all cursor-pointer h-full">
            <CardHeader>
              <ImageIcon className="w-8 h-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Medien</CardTitle>
              <CardDescription>Upload + KI-Generierung</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs">
                <span className="font-bold text-primary">{mediaCount}</span>{" "}
                <span className="text-muted-foreground">in Bibliothek</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/brands/${brand.slug}/editor`}>
          <Card className="hover:shadow-md hover:border-primary transition-all cursor-pointer h-full">
            <CardHeader>
              <Type className="w-8 h-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Text-Editor</CardTitle>
              <CardDescription>Text-Overlays auf Bildern</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Live-Vorschau, Drag-and-Drop, mehrere Layer
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/brands/${brand.slug}/composer`}>
          <Card className="hover:shadow-md hover:border-primary transition-all cursor-pointer h-full">
            <CardHeader>
              <Sparkles className="w-8 h-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Content Composer</CardTitle>
              <CardDescription>Captions + Hashtags KI-generieren</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Mit Brand-Voice und Bild-Analyse
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/brands/${brand.slug}/drafts`}>
          <Card className="hover:shadow-md hover:border-primary transition-all cursor-pointer h-full">
            <CardHeader>
              <FileText className="w-8 h-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Entwürfe</CardTitle>
              <CardDescription>Gespeicherte Posts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs">
                <span className="font-bold text-primary">{draftsCount}</span>{" "}
                <span className="text-muted-foreground">Entwürfe</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-60">
          <CardHeader>
            <Calendar className="w-8 h-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Wochenplan</CardTitle>
            <CardDescription>Multi-Plattform Scheduling</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Kommt in v0.7</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SettingsIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Brand-Voice</CardTitle>
            <CardDescription>Tonalität + Hashtags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {brand.primary_hashtags && brand.primary_hashtags.length > 0 && (
                <div>
                  <div className="font-semibold mb-1">Haupt-Hashtags:</div>
                  <div className="flex flex-wrap gap-1">
                    {brand.primary_hashtags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {brand.tone && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Markenstimme</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{brand.tone}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
