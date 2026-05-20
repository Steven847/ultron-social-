// app/api/media/refine-image/route.ts — Refine an existing image with feedback
// v0.2.2: supports optional logo overlay on the refined result

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { generateImage, type ReferenceImage } from "@/lib/gemini";
import { composeWithLogo, type LogoPosition, type LogoSize } from "@/lib/logo-overlay";
import type { Brand } from "@/lib/types";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mediaId,
      feedback,
      aspectRatio,
      includeLogo,
      logoPosition,
      logoSize,
      logoOpacity,
    } = body;

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
      return NextResponse.json({ error: "Quell-Medium nicht gefunden" }, { status: 404 });
    }

    if (sourceMedia.type !== "image") {
      return NextResponse.json({ error: "Nur Bilder können verfeinert werden" }, { status: 400 });
    }

    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", sourceMedia.brand_id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    const bucket = sourceMedia.source === "upload" ? "media-uploads" : "ai-generated";
    const { data: blob, error: dlError } = await supabase.storage
      .from(bucket)
      .download(sourceMedia.storage_path);

    if (dlError || !blob) {
      return NextResponse.json({ error: "Quell-Bild konnte nicht geladen werden" }, { status: 500 });
    }

    const arrayBuffer = await blob.arrayBuffer();
    const refImage: ReferenceImage = {
      base64: Buffer.from(arrayBuffer).toString("base64"),
      mimeType: blob.type || "image/jpeg",
      hint: "Original image to be refined",
    };

    const refinementPrompt = sourceMedia.ai_prompt
      ? `Edit this image with the following changes: ${feedback}\n\nKeep the overall composition and lighting style.\nOriginal concept: ${sourceMedia.ai_prompt.slice(0, 300)}`
      : `Edit this image with the following changes: ${feedback}\n\nKeep the overall composition and lighting style.`;

    console.log(`[refine-image] Refining ${mediaId}, logo=${!!includeLogo}`);

    const result = await generateImage(refinementPrompt, brand as Brand, {
      aspectRatio: aspectRatio || "1:1",
      referenceImages: [refImage],
    });

    let finalBuffer = Buffer.from(result.base64, "base64");
    let finalMimeType = result.mimeType;
    let logoApplied = false;

    if (includeLogo && brand.logo_url) {
      try {
        const logoRes = await fetch(brand.logo_url);
        if (logoRes.ok) {
          const logoBuffer = Buffer.from(await logoRes.arrayBuffer());
          const composed = await composeWithLogo(finalBuffer, logoBuffer, {
            position: (logoPosition || "bottom-right") as LogoPosition,
            size: (logoSize || "medium") as LogoSize,
            opacity: typeof logoOpacity === "number" ? logoOpacity : 100,
            padding: 32,
          });
          finalBuffer = composed.buffer;
          finalMimeType = composed.format;
          logoApplied = true;
        }
      } catch (logoError: any) {
        console.error("[refine-image] Logo composition failed:", logoError.message);
      }
    }

    const ext = finalMimeType.includes("png") ? "png" : "jpg";
    const filePath = `${brand.slug}/generated/${Date.now()}-refined.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("ai-generated")
      .upload(filePath, finalBuffer, {
        contentType: finalMimeType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const refinedTitle = sourceMedia.title
      ? `${sourceMedia.title} (verfeinert)`
      : `Verfeinert: ${feedback.slice(0, 40)}`;

    const tagArr = sourceMedia.tags ? [...sourceMedia.tags] : [];
    if (logoApplied && !tagArr.includes("logo")) tagArr.push("logo");

    const { data: newMedia, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brand.id,
        type: "image",
        source: sourceMedia.source === "upload" ? "hybrid" : "ai_generated",
        storage_path: filePath,
        file_size: finalBuffer.length,
        ai_prompt: result.fullPrompt,
        ai_model: "gemini-3.1-flash-image-preview" + (logoApplied ? " + logo-overlay" : ""),
        ai_refined_from: mediaId,
        title: refinedTitle,
        tags: tagArr.length > 0 ? tagArr : null,
        category: sourceMedia.category,
        mood: sourceMedia.mood,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, media: newMedia, logoApplied });
  } catch (error: any) {
    console.error("[refine-image] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
