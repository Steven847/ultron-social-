import Link from "next/link";
import { getServerClient } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import type { Brand } from "@/lib/types";

async function getBrands() {
  const supabase = getServerClient();
  const { data } = await supabase.from("brands").select("*").order("created_at", { ascending: false });
  return (data || []) as Brand[];
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/">
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marken</h1>
          <p className="text-muted-foreground mt-2">Verwalte alle deine Marken an einem Ort</p>
        </div>
        <Button asChild>
          <Link href="/brands/new">
            <Plus className="w-4 h-4" />
            Neue Marke
          </Link>
        </Button>
      </div>

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
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{brand.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">@{brand.slug}</CardDescription>
                  </div>
                  {!brand.active && (
                    <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">inaktiv</span>
                  )}
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
    </div>
  );
}
