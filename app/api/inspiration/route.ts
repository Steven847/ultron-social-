// app/api/inspiration/route.ts — List + create inspiration posts

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");
    const platform = searchParams.get("platform");

    const supabase = getServerClient();
    let query = supabase
      .from("inspiration_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (brandId) query = query.eq("brand_id", brandId);
    if (platform) query = query.eq("platform", platform);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ inspirations: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brandId,
      title,
      caption,
      platform,
      sourceUrl,
      sourceAccount,
      tags,
      notes,
      whyItWorks,
    } = body;

    if (!caption) {
      return NextResponse.json({ error: "caption ist erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();
    const tagArr = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
      ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const { data, error } = await supabase
      .from("inspiration_posts")
      .insert({
        brand_id: brandId || null,
        title: title || null,
        caption,
        platform: platform || null,
        source_url: sourceUrl || null,
        source_account: sourceAccount || null,
        tags: tagArr.length > 0 ? tagArr : null,
        notes: notes || null,
        why_it_works: whyItWorks || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, inspiration: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
