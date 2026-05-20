// app/api/posts/route.ts — List posts and create drafts

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");

    const supabase = getServerClient();

    let query = supabase
      .from("posts")
      .select("*, brands(name, slug, logo_url)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (brandId) query = query.eq("brand_id", brandId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    // Resolve media URLs for posts
    const allMediaIds = new Set<string>();
    (data || []).forEach((p: any) => {
      if (Array.isArray(p.media_ids)) p.media_ids.forEach((id: string) => allMediaIds.add(id));
    });

    let mediaMap: Record<string, any> = {};
    if (allMediaIds.size > 0) {
      const { data: mediaData } = await supabase
        .from("media")
        .select("id, type, source, storage_path, title")
        .in("id", Array.from(allMediaIds));

      if (mediaData) {
        for (const m of mediaData) {
          const bucket = m.source === "upload" ? "media-uploads" : "ai-generated";
          const { data: signed } = await supabase.storage
            .from(bucket)
            .createSignedUrl(m.storage_path, 3600);
          mediaMap[m.id] = { ...m, url: signed?.signedUrl || null };
        }
      }
    }

    const postsWithMedia = (data || []).map((p: any) => ({
      ...p,
      media: Array.isArray(p.media_ids) ? p.media_ids.map((id: string) => mediaMap[id]).filter(Boolean) : [],
    }));

    return NextResponse.json({ posts: postsWithMedia });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brandId,
      type = "post",
      title,
      tone,
      caption,
      hashtags,
      firstComment,
      mediaIds,
      platforms = ["instagram"],
      scheduledAt,
      sourceCaptionId,
    } = body;

    if (!brandId) {
      return NextResponse.json({ error: "brandId erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("posts")
      .insert({
        brand_id: brandId,
        type,
        title: title || null,
        tone: tone || null,
        caption: caption || null,
        hashtags: hashtags || null,
        first_comment: firstComment || null,
        media_ids: mediaIds || null,
        platforms,
        scheduled_at: scheduledAt || null,
        status: scheduledAt ? "scheduled" : "draft",
        source_caption_id: sourceCaptionId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, post: data });
  } catch (error: any) {
    console.error("[posts] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
