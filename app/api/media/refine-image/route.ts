// app/api/media/refine-image/route.ts — Refine an existing image with feedback

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { generateImage } from "@/lib/gemini";
import type { Brand } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mediaId, feedback, aspectRatio } = body;

    if (!mediaId || !feedback?.trim()) {
      return NextResponse.json({ error: "mediaId und feedback erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();

    // Load the source media
    const { data: sourceMedia, error: mediaError } = await supabase
      .from("media")
      .select("*")
      .eq("id", mediaId)
      .single();

    if (mediaError || !sourceMedia) {
      return NextResponse.json({ error: "Quell-Medium nicht gefunden" }, { status: 404 });
    }

    if (sourceMedia.type !== "image") {
      return NextResponse.json({ error: "Nur Bilder können verfeinert werden" }, { status: 400 });
    }

    // Load the brand
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", sourceMedia.brand_id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    // Download the source image
    const bucket = sourceMedia.source === "upload" ? "media-uploads" : "ai-generated";
    const { data: blob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(sourceMedia.storage_path);

    if (downloadError || !blob) {
      return NextResponse.json({ error: "Quell-Bild konnte nicht geladen werden" }, { status: 500 });
    }

    const arrayBuffer = await blob.arrayBuffer();
    const referenceImageBase64 = Buffer.from(arrayBuffer).toString("base64");
    const referenceImageMimeType = blob.type || "image/jpeg";

    // Build refinement prompt
    const refinementPrompt = sourceMedia.ai_prompt
      ? `Edit this image with the following changes: ${feedback}\n\nKeep the overall composition and lighting style.\nOriginal concept: ${sourceMedia.ai_prompt.slice(0, 300)}`
      : `Edit this image with the following changes: ${feedback}\n\nKeep the overall composition and lighting style.`;

    // Generate refined image
    const result = await generateImage(refinementPrompt, brand as Brand, {
      aspectRatio: aspectRatio || "1:1",
      referenceImageBase64,
      referenceImageMimeType,
    });

    // Save refined image
    const ext = result.mimeType.includes("png") ? "png" : "jpg";
    const filePath = `${brand.slug}/generated/${Date.now()}-refined.${ext}`;
    const imageBuffer = Buffer.from(result.base64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("ai-generated")
      .upload(filePath, imageBuffer, {
        contentType: result.mimeType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Insert as new media entry (linked to source)
    const refinedTitle = sourceMedia.title
      ? `${sourceMedia.title} (verfeinert)`
      : `Verfeinert: ${feedback.slice(0, 40)}`;

    const { data: newMedia, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brand.id,
        type: "image",
        source: sourceMedia.source === "upload" ? "hybrid" : "ai_generated",
        storage_path: filePath,
        file_size: imageBuffer.length,
        ai_prompt: result.fullPrompt,
        ai_model: "gemini-3.1-flash-image-preview",
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
