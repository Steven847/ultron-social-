// app/api/media/route.ts — List media with filters and signed URLs

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");
    const type = searchParams.get("type"); // image | video
    const source = searchParams.get("source"); // upload | ai_generated | hybrid
    const archived = searchParams.get("archived") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");

    const supabase = getServerClient();

    let query = supabase
      .from("media")
      .select("*, brands(name, slug, logo_url)")
      .eq("archived", archived)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (brandId) query = query.eq("brand_id", brandId);
    if (type) query = query.eq("type", type);
    if (source) query = query.eq("source", source);

    const { data, error } = await query;
    if (error) throw error;

    // Generate signed URLs for each media item (1 hour expiry)
    const itemsWithUrls = await Promise.all(
      (data || []).map(async (item: any) => {
        const bucket = item.source === "upload" ? "media-uploads" : "ai-generated";
        const { data: signedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(item.storage_path, 3600);
        return {
          ...item,
          url: signedData?.signedUrl || null,
        };
      })
    );

    return NextResponse.json({ media: itemsWithUrls });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
