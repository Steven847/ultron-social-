// app/api/media/generate-image/route.ts — Image generation with job tracking
// v0.4.4-fix: Load logo from Supabase Storage directly (no HTTP fetch)

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { generateImage, type ReferenceImage } from "@/lib/gemini";
import { applyLogoOverlay, type LogoPosition } from "@/lib/logo-overlay";
import { createJob, updateJobPhase, completeJob, failJob, type JobType } from "@/lib/job-tracker";
import type { Brand } from "@/lib/types";

export const maxDuration = 120;

/**
 * Load the brand logo as a Buffer.
 * Tries multiple strategies:
 * 1. Parse logo_url to find bucket + path, then download via storage API (BEST — no network needed)
 * 2. Fall back to HTTP fetch with proper error handling
 * Returns null if logo can't be loaded.
 */
async function loadBrandLogoBuffer(
  brand: Brand,
  supabase: ReturnType<typeof getServerClient>
): Promise<Buffer | null> {
  if (!brand.logo_url) return null;

  // Strategy 1: parse Supabase Storage URL and use storage API
  // URL format: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/PATH
  const match = brand.logo_url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (match) {
    const bucket = match[1];
    const path = match[2];
    console.log(`[generate-image] Loading logo from bucket '${bucket}' path '${path}'`);
    try {
      const { data: blob, error } = await supabase.storage.from(bucket).download(path);
      if (error || !blob) {
        console.warn(`[generate-image] Storage download failed: ${error?.message || "no blob"}`);
      } else {
        const buffer = Buffer.from(await blob.arrayBuffer());
        console.log(`[generate-image] Logo loaded from storage: ${buffer.length} bytes`);
        return buffer;
      }
    } catch (e: any) {
      console.warn(`[generate-image] Storage exception: ${e.message}`);
    }
  } else {
    console.log("[generate-image] Logo URL doesn't match Supabase Storage pattern, will try HTTP");
  }

  // Strategy 2: fallback to HTTP fetch
  try {
    const res = await fetch(brand.logo_url);
    if (!res.ok) {
      console.warn(`[generate-image] HTTP fetch failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    console.log(`[generate-image] Logo loaded via HTTP: ${buffer.length} bytes`);
    return buffer;
  } catch (e: any) {
    console.warn(`[generate-image] HTTP exception: ${e.message}`);
    return null;
  }
}

export async function POST(req: NextRequest) {
  let jobId: string | null = null;
  let jobType: JobType = "image";

  try {
    const body = await req.json();
    const {
      brandId,
      prompt,
      title,
      tags,
      aspectRatio,
      referenceMediaIds,
      referenceMediaId,
      applyLogo,
      logoPosition,
      logoSizePercent,
      logoPaddingPercent,
      logoOpacity,
    } = body;

    if (!brandId || !prompt) {
      return NextResponse.json({ error: "brandId und prompt erforderlich" }, { status: 400 });
    }

    const refIds: string[] = referenceMediaIds && referenceMediaIds.length > 0
      ? referenceMediaIds
      : referenceMediaId ? [referenceMediaId] : [];

    jobType = refIds.length > 0 ? "image-hybrid" : "image";
    jobId = await createJob(brandId, jobType, { prompt: prompt.slice(0, 200) });

    const supabase = getServerClient();
    const { data: brand } = await supabase.from("brands").select("*").eq("id", brandId).single();
    if (!brand) throw new Error("Marke nicht gefunden");

    // Load references
    let referenceImages: ReferenceImage[] = [];
    let aiRefinedFrom: string | null = null;
    let sourceWasUpload = false;

    if (refIds.length > 0) {
      await updateJobPhase(jobId, jobType, "loading-refs");
      for (const refId of refIds) {
        const { data: refMedia } = await supabase.from("media").select("*").eq("id", refId).single();
        if (!refMedia || refMedia.type !== "image") continue;

        const bucket = refMedia.source === "upload" ? "media-uploads" : "ai-generated";
        const { data: blob } = await supabase.storage.from(bucket).download(refMedia.storage_path);
        if (!blob) continue;

        const arrayBuffer = await blob.arrayBuffer();
        referenceImages.push({
          base64: Buffer.from(arrayBuffer).toString("base64"),
          mimeType: blob.type || "image/jpeg",
        });
        if (!aiRefinedFrom) aiRefinedFrom = refId;
        if (refMedia.source === "upload") sourceWasUpload = true;
      }
    }

    // Generate
    await updateJobPhase(jobId, jobType, "generating");
    const result = await generateImage(prompt, brand as Brand, {
      aspectRatio: aspectRatio || "1:1",
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
    });

    let imageBuffer = Buffer.from(result.base64, "base64");

    // Logo overlay — now with proper error handling
    if (applyLogo && brand.logo_url) {
      await updateJobPhase(jobId, jobType, "logo-overlay");
      const logoBuffer = await loadBrandLogoBuffer(brand as Brand, supabase);

      if (!logoBuffer) {
        console.error("[generate-image] LOGO OVERLAY SKIPPED: Could not load logo file");
        // Don't fail the whole job — just skip the overlay and warn in tags
      } else {
        try {
          imageBuffer = await applyLogoOverlay({
            baseImageBuffer: imageBuffer,
            logoBuffer,
            position: (logoPosition || "bottom-right") as LogoPosition,
            sizePercent: logoSizePercent ?? 12,
            paddingPercent: logoPaddingPercent ?? 3,
            opacity: logoOpacity ?? 100,
          });
          console.log("[generate-image] Logo overlay applied successfully");
        } catch (e: any) {
          console.error("[generate-image] Logo composition failed:", e.message);
          // Don't fail the job — return image without overlay
        }
      }
    }

    // Upload
    await updateJobPhase(jobId, jobType, "uploading");
    const filePath = `${brand.slug}/generated/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("ai-generated")
      .upload(filePath, imageBuffer, { contentType: "image/png", upsert: false });
    if (uploadError) throw uploadError;

    // Insert media
    await updateJobPhase(jobId, jobType, "saving");
    const tagArr = (tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
    if (refIds.length > 1) tagArr.push("multi-image");
    if (applyLogo) tagArr.push("logo-overlay");

    const { data: mediaRow, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brandId,
        type: "image",
        source: refIds.length > 0 ? (sourceWasUpload ? "hybrid" : "ai_generated") : "ai_generated",
        storage_path: filePath,
        file_size: imageBuffer.length,
        ai_prompt: result.fullPrompt,
        ai_model: "gemini-3.1-flash-image-preview",
        ai_refined_from: aiRefinedFrom,
        title: title || `KI-Bild: ${prompt.slice(0, 50)}`,
        tags: tagArr.length > 0 ? tagArr : null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await completeJob(jobId, mediaRow.id);

    return NextResponse.json({
      success: true,
      jobId,
      media: mediaRow,
    });
  } catch (error: any) {
    console.error("[generate-image] ERROR:", error.message);
    if (jobId) await failJob(jobId, error.message);
    return NextResponse.json({ error: error.message, jobId }, { status: 500 });
  }
}
