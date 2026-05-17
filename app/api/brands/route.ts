// app/api/brands/route.ts - Brand management API

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

// GET /api/brands - list brands
export async function GET() {
  try {
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ brands: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/brands - create new brand
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, description, tone, primary_color, secondary_color } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name und Slug sind erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("brands")
      .insert({
        name,
        slug,
        description: description || null,
        tone: tone || null,
        primary_color: primary_color || null,
        secondary_color: secondary_color || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Eine Marke mit diesem Slug existiert bereits" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ brand: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
