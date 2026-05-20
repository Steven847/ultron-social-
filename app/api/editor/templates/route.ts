// app/api/editor/templates/route.ts — Overlay templates management

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "brandId erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("overlay_templates")
      .select("*")
      .eq("brand_id", brandId)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ templates: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, name, description, layers, format } = body;

    if (!brandId || !name || !layers) {
      return NextResponse.json(
        { error: "brandId, name und layers erforderlich" },
        { status: 400 }
      );
    }
    if (!Array.isArray(layers) || layers.length === 0) {
      return NextResponse.json(
        { error: "Mindestens ein Layer erforderlich" },
        { status: 400 }
      );
    }

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("overlay_templates")
      .insert({
        brand_id: brandId,
        name,
        description: description || null,
        layers,
        format: format || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, template: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
