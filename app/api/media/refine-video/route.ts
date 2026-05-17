// app/api/media/refine-video/route.ts — Re-generate video with adjusted prompt
// IMPORTANT: Veo cannot edit existing videos. This generates a NEW video using
// the original prompt + user feedback. The result is linked to the source.

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { generateVideo, generateText } from "@/lib/gemini";
import type { Brand } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mediaId, feedback, aspectRatio, duration } = body;

    if (!mediaId || !feedback?.trim()) {
      return NextResponse.json({ error: "mediaId und feedback erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();

    const { data: sourceMedia, error: mediaError } = await supabase
      .from("media")
      .select("*")
      .eq("id", mediaId)
      .single();
    if (mediaError || !sourceMedia) {
      return NextResponse.json({ error: "Quell-Video nicht gefunden" }, { status: 404 });
    }
    if (sourceMedia.type !== "video") {
      return NextResponse.json({ error: "Nur Videos können hier verfeinert werden" }, { status: 400 });
    }

    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", sourceMedia.brand_id)
      .single();
    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    // Build improved prompt
    let refinedPrompt: string;
    if (sourceMedia.ai_prompt) {
      // Use AI to merge original prompt + feedback into a coherent new prompt
      const mergeRequest =
        `Original video prompt: "${sourceMedia.ai_prompt.slice(0, 500)}"\n\n` +
        `User feedback for improvement: "${feedback}"\n\n` +
        `Create an IMPROVED English video prompt that incorporates the feedback while keeping the original style, lighting, and atmosphere. Respond ONLY with the new prompt, nothing else.`;
      try {
        refinedPrompt = (await generateText(mergeRequest)).trim();
      } catch {
        refinedPrompt = `${sourceMedia.ai_prompt}. Adjustments: ${feedback}`;
      }
    } else {
      refinedPrompt = `Cinematic Swiss Alps video. ${feedback}`;
    }

    // Generate new video
    const result = await generateVideo(refinedPrompt, brand as Brand, {
      aspectRatio: aspectRatio || "9:16",
      durationSeconds: (duration || sourceMedia.duration_seconds || 8) as 4 | 6 | 8,
    });

    if (!result.url) {
      return NextResponse.json({ error: "Veo lieferte keine Video-URL" }, { status: 500 });
    }

    // Download from Google
    const apiKey = process.env.GEMINI_API_KEY!;
    const separator = result.url.includes("?") ? "&" : "?";
    const videoRes = await fetch(result.url + separator + "key=" + apiKey);
    if (!videoRes.ok) {
      return NextResponse.json(
        { error: "Video-Download fehlgeschlagen: " + videoRes.status },
        { status: 500 }
      );
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const filePath = `${brand.slug}/generated/${Date.now()}-video-refined.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("ai-generated")
      .upload(filePath, videoBuffer, { contentType: "video/mp4", upsert: false });
    if (uploadError) throw uploadError;

    const refinedTitle = sourceMedia.title
      ? `${sourceMedia.title} (Neuversion)`
      : `Verfeinert: ${feedback.slice(0, 40)}`;

    const { data: newMedia, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brand.id,
        type: "video",
        source: "ai_generated",
        storage_path: filePath,
        file_size: videoBuffer.length,
        duration_seconds: duration || sourceMedia.duration_seconds || 8,
        ai_prompt: result.fullPrompt,
        ai_model: "veo-2.0-generate-001",
        ai_refined_from: mediaId,
        title: refinedTitle,
        tags: sourceMedia.tags,
        category: sourceMedia.category,
        mood: sourceMedia.mood,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, media: newMedia });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
