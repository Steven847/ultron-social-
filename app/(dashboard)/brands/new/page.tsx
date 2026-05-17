"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { slugify } from "@/lib/utils";

export default function NewBrandPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    tone: "",
    primary_color: "#1B5E20",
    secondary_color: "#FFD54F",
  });

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: f.slug || slugify(name) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Anlegen");
      router.push(`/brands/${data.brand.slug}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/brands">
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Neue Marke anlegen</CardTitle>
          <CardDescription>Gib die Basis-Infos ein — Details kannst du später anpassen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Markenname *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="z.B. Alpenwiese"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL-Kürzel *</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="alpenwiese"
                required
              />
              <p className="text-xs text-muted-foreground">Wird in URLs verwendet, z.B. /brands/{form.slug || "..."}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Kurze Beschreibung der Marke..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Markenstimme / Tonalität</Label>
              <Textarea
                id="tone"
                value={form.tone}
                onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                placeholder="Wie spricht die Marke? z.B. witzig, seriös, locker..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Hauptfarbe</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="primary_color"
                    value={form.primary_color}
                    onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Akzentfarbe</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="secondary_color"
                    value={form.secondary_color}
                    onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={form.secondary_color}
                    onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Lege an..." : "Marke anlegen"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/brands">Abbrechen</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
