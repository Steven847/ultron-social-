import Link from "next/link";
import { getServerClient } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Image as ImageIcon, Calendar, TrendingUp, Plus } from "lucide-react";
import type { Brand } from "@/lib/types";

async function getDashboardStats() {
  const supabase = getServerClient();
  
  const [{ data: brands, count: brandCount }, { count: mediaCount }, { count: postCount }] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact" }).eq("active", true).order("created_at", { ascending: false }),
    supabase.from("media").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
  ]);

  return {
    brands: (brands || []) as Brand[],
    brandCount: brandCount || 0,
    mediaCount: mediaCount || 0,
    scheduledCount: postCount || 0,
  };
}

export default async function DashboardHome() {
  const { brands, brandCount, mediaCount, scheduledCount } = await getDashboardStats();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Übersicht</h1>
        <p className="text-muted-foreground mt-2">
          Willkommen bei ULTRON — dein Multi-Brand Social Media Command Center
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Marken</CardDescription>
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{brandCount}</div>
            <p className="text-xs text-muted-foreground mt-1">aktive Marken</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Medien</CardDescription>
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mediaCount}</div>
            <p className="text-xs text-muted-foreground mt-1">in der Bibliothek</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Geplante Posts</CardDescription>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scheduledCount}</div>
            <p className="text-xs text-muted-foreground mt-1">in Vorbereitung</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Deine Marken</h2>
        <Button asChild>
          <Link href="/brands/new">
            <Plus className="w-4 h-4" />
            Neue Marke
          </Link>
        </Button>
      </div>

      {brands.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Noch keine Marken angelegt</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Lege deine erste Marke an um mit dem Content zu starten
            </p>
            <Button asChild>
              <Link href="/brands/new">Erste Marke anlegen</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
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
                      <CardTitle className="text-base">{brand.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">@{brand.slug}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {brand.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{brand.description}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
