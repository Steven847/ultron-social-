// app/api/media/generate-video/route.ts — Generate AI video and save to library

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { generateVideo } from "@/lib/gemini";
import type { Brand } from "@/lib/types";

// Veo can take 1-3 minutes, allow longer timeout
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, prompt, aspectRatio, duration, title, tags } = body;

    if (!brandId || !prompt) {
      return NextResponse.json({ error: "brandId und prompt erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();

    // Load brand
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();
    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    // Generate via Veo (returns Google-hosted URL)
    const result = await generateVideo(prompt, brand as Brand, {
      aspectRatio: aspectRatio || "9:16",
      durationSeconds: (duration || 8) as 4 | 6 | 8,
    });

    if (!result.url) {
      return NextResponse.json({ error: "Veo lieferte keine Video-URL" }, { status: 500 });
    }

    // Download video from Google and re-upload to our storage
    const apiKey = process.env.GEMINI_API_KEY!;
    const separator = result.url.includes("?") ? "&" : "?";
    const downloadUrl = result.url + separator + "key=" + apiKey;

    const videoRes = await fetch(downloadUrl);
    if (!videoRes.ok) {
      return NextResponse.json(
        { error: "Video-Download fehlgeschlagen: " + videoRes.status },
        { status: 500 }
      );
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    // Save to storage
    const filePath = `${brand.slug}/generated/${Date.now()}-video.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("ai-generated")
      .upload(filePath, videoBuffer, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Parse tags
    const tagArr = (tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    // Insert metadata
    const { data: mediaRow, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brandId,
        type: "video",
        source: "ai_generated",
        storage_path: filePath,
        file_size: videoBuffer.length,
        duration_seconds: duration || 8,
        ai_prompt: result.fullPrompt,
        ai_model: "veo-2.0-generate-001",
        title: title || `KI-Video: ${prompt.slice(0, 50)}`,
        tags: tagArr.length > 0 ? tagArr : null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, media: mediaRow });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
