// app/api/media/refine-image/route.ts — Refine existing image using AI
// v0.6a-buildfix3: Uint8Array buffers for TypeScript-strict compatibility

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { generateImage } from "@/lib/gemini";
import { applyLogoOverlay, type LogoPosition } from "@/lib/logo-overlay";
import type { Brand } from "@/lib/types";

export const maxDuration = 60;

async function loadBrandLogoBuffer(
  brand: Brand,
  supabase: ReturnType<typeof getServerClient>
): Promise<Uint8Array | null> {
  if (!brand.logo_url) return null;

  const match = brand.logo_url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (match) {
    const bucket = match[1];
    const path = match[2];
    try {
      const { data: blob, error } = await supabase.storage.from(bucket).download(path);
      if (!error && blob) {
        const arrayBuffer = await blob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } catch {}
  }

  try {
    const res = await fetch(brand.logo_url);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch {}

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brandId,
      mediaId,
      prompt,
      title,
      tags,
      aspectRatio,
      applyLogo,
      logoPosition,
      logoSizePercent,
      logoPaddingPercent,
      logoOpacity,
    } = body;

    if (!brandId || !mediaId || !prompt) {
      return NextResponse.json(
        { error: "brandId, mediaId und prompt erforderlich" },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    const { data: brand } = await supabase.from("brands").select("*").eq("id", brandId).single();
    if (!brand) return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });

    const { data: original } = await supabase
      .from("media")
      .select("*")
      .eq("id", mediaId)
      .single();
    if (!original || original.type !== "image") {
      return NextResponse.json({ error: "Original-Bild nicht gefunden" }, { status: 404 });
    }

    const bucket = original.source === "upload" ? "media-uploads" : "ai-generated";
    const { data: blob, error: dlError } = await supabase.storage
      .from(bucket)
      .download(original.storage_path);

    if (dlError || !blob) {
      throw new Error("Original-Bild konnte nicht geladen werden");
    }

    const arrayBuffer = await blob.arrayBuffer();
    const refBase64 = Buffer.from(arrayBuffer).toString("base64");
    const refMimeType = blob.type || "image/jpeg";

    const result = await generateImage(prompt, brand as Brand, {
      aspectRatio: aspectRatio || "1:1",
      referenceImages: [{ base64: refBase64, mimeType: refMimeType }],
    });

    // Use Uint8Array throughout for TypeScript-strict compatibility
    let imageBuffer: Uint8Array = new Uint8Array(Buffer.from(result.base64, "base64"));

    if (applyLogo && brand.logo_url) {
      const logoBuffer = await loadBrandLogoBuffer(brand as Brand, supabase);
      if (logoBuffer) {
        try {
          imageBuffer = await applyLogoOverlay({
            baseImageBuffer: imageBuffer,
            logoBuffer,
            position: (logoPosition || "bottom-right") as LogoPosition,
            sizePercent: logoSizePercent ?? 12,
            paddingPercent: logoPaddingPercent ?? 3,
            opacity: logoOpacity ?? 100,
          });
        } catch (e: any) {
          console.warn("[refine-image] Logo overlay failed:", e.message);
        }
      }
    }

    const filePath = `${brand.slug}/generated/${Date.now()}-refined.png`;
    const { error: uploadError } = await supabase.storage
      .from("ai-generated")
      .upload(filePath, imageBuffer, { contentType: "image/png", upsert: false });
    if (uploadError) throw uploadError;

    const tagArr = (tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
    tagArr.push("refined");
    if (applyLogo) tagArr.push("logo-overlay");

    const { data: mediaRow, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brandId,
        type: "image",
        source: "ai_generated",
        storage_path: filePath,
        file_size: imageBuffer.length,
        ai_prompt: result.fullPrompt,
        ai_model: "gemini-3.1-flash-image-preview",
        ai_refined_from: mediaId,
        title: title || `Verfeinert: ${original.title || prompt.slice(0, 50)}`,
        tags: tagArr.length > 0 ? tagArr : null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, media: mediaRow });
  } catch (error: any) {
    console.error("[refine-image] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
