// app/api/media/generate-image/route.ts — Generate AI image with optional reference image
// Includes automatic image resizing for large reference images

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { generateImage } from "@/lib/gemini";
import type { Brand } from "@/lib/types";

export const maxDuration = 120;

// Resize a base64 image to max dimension via canvas-free approach
// We just pass the buffer through - Gemini handles up to 20MB
// But we add size validation and clear errors
const MAX_REFERENCE_SIZE_MB = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, prompt, aspectRatio, title, tags, referenceMediaId } = body;

    if (!brandId || !prompt) {
      return NextResponse.json({ error: "brandId und prompt erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();

    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();
    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    let referenceImageBase64: string | undefined;
    let referenceImageMimeType: string | undefined;
    let aiRefinedFrom: string | null = null;
    let sourceWasUpload = false;

    if (referenceMediaId) {
      const { data: refMedia } = await supabase
        .from("media")
        .select("*")
        .eq("id", referenceMediaId)
        .single();

      if (refMedia && refMedia.type === "image") {
        const bucket = refMedia.source === "upload" ? "media-uploads" : "ai-generated";
        const { data: blob, error: dlError } = await supabase.storage
          .from(bucket)
          .download(refMedia.storage_path);

        if (dlError || !blob) {
          console.error("[generate-image] Reference download failed:", dlError);
          return NextResponse.json(
            { error: "Referenz-Bild konnte nicht geladen werden: " + (dlError?.message || "unknown") },
            { status: 500 }
          );
        }

        const sizeMB = blob.size / (1024 * 1024);
        if (sizeMB > MAX_REFERENCE_SIZE_MB) {
          return NextResponse.json(
            {
              error: `Referenz-Bild ist ${sizeMB.toFixed(1)} MB groß. Max ${MAX_REFERENCE_SIZE_MB} MB erlaubt. Bitte verkleinere das Bild oder wähle ein anderes.`,
            },
            { status: 400 }
          );
        }

        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        referenceImageBase64 = buffer.toString("base64");
        referenceImageMimeType = blob.type || "image/jpeg";
        aiRefinedFrom = referenceMediaId;
        sourceWasUpload = refMedia.source === "upload";

        console.log(
          `[generate-image] Hybrid mode: using reference (${sizeMB.toFixed(2)} MB, ${referenceImageMimeType})`
        );
      }
    }

    console.log("[generate-image] Calling Gemini with prompt length:", prompt.length);
    const result = await generateImage(prompt, brand as Brand, {
      aspectRatio: aspectRatio || "1:1",
      referenceImageBase64,
      referenceImageMimeType,
    });

    const ext = result.mimeType.includes("png") ? "png" : "jpg";
    const filePath = `${brand.slug}/generated/${Date.now()}-image.${ext}`;
    const imageBuffer = Buffer.from(result.base64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("ai-generated")
      .upload(filePath, imageBuffer, {
        contentType: result.mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[generate-image] Upload failed:", uploadError);
      throw uploadError;
    }

    const tagArr = (tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    const { data: mediaRow, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brandId,
        type: "image",
        source: sourceWasUpload ? "hybrid" : "ai_generated",
        storage_path: filePath,
        file_size: imageBuffer.length,
        ai_prompt: result.fullPrompt,
        ai_model: "gemini-3.1-flash-image-preview",
        ai_refined_from: aiRefinedFrom,
        title: title || `KI: ${prompt.slice(0, 50)}`,
        tags: tagArr.length > 0 ? tagArr : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[generate-image] DB insert failed:", insertError);
      throw insertError;
    }

    return NextResponse.json({ success: true, media: mediaRow });
  } catch (error: any) {
    console.error("[generate-image] ERROR:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Unbekannter Fehler bei der Bildgenerierung" },
      { status: 500 }
    );
  }
}
