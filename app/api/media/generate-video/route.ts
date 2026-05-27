// app/api/media/generate-video/route.ts — Video generation with Veo 3.1
// v0.7: Veo 3.1 support with model selection and audio

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { generateVideo, type VeoModel } from "@/lib/gemini";
import { createJob, updateJobPhase, completeJob, failJob, type JobType } from "@/lib/job-tracker";
import type { Brand } from "@/lib/types";

export const maxDuration = 300;

const MAX_START_IMAGE_MB = 10;

export async function POST(req: NextRequest) {
  let jobId: string | null = null;
  let jobType: JobType = "video";

  try {
    const body = await req.json();
    const {
      brandId,
      prompt,
      aspectRatio,
      duration,
      title,
      tags,
      startImageMediaId,
      model = "cinematic",
      generateAudio = true,
      resolution,
    } = body;

    if (!brandId || !prompt) {
      return NextResponse.json({ error: "brandId und prompt erforderlich" }, { status: 400 });
    }

    jobType = startImageMediaId ? "video-i2v" : "video";
    jobId = await createJob(brandId, jobType, { 
      prompt: prompt.slice(0, 200),
      model,
      generateAudio,
      resolution,
    });

    const result = await processVideoGeneration({
      jobId,
      jobType,
      brandId,
      prompt,
      aspectRatio,
      duration,
      title,
      tags,
      startImageMediaId,
      model: model as VeoModel,
      generateAudio,
      resolution,
    });

    return NextResponse.json({
      success: true,
      jobId,
      media: result.media,
      imageToVideo: !!startImageMediaId,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("[generate-video] ERROR:", error.message);
    if (jobId) await failJob(jobId, error.message);
    return NextResponse.json(
      { error: error.message, jobId },
      { status: 500 }
    );
  }
}

async function processVideoGeneration(params: {
  jobId: string;
  jobType: JobType;
  brandId: string;
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  title?: string;
  tags?: string;
  startImageMediaId?: string;
  model: VeoModel;
  generateAudio: boolean;
  resolution?: "720p" | "1080p" | "4k";
}) {
  const {
    jobId, jobType, brandId, prompt, aspectRatio, duration, title, tags,
    startImageMediaId, model, generateAudio, resolution,
  } = params;
  const supabase = getServerClient();

  const { data: brand } = await supabase.from("brands").select("*").eq("id", brandId).single();
  if (!brand) throw new Error("Marke nicht gefunden");

  let startImageBase64: string | undefined;
  let startImageMimeType: string | undefined;
  let aiRefinedFrom: string | null = null;
  let sourceWasUpload = false;

  if (startImageMediaId) {
    await updateJobPhase(jobId, jobType, "loading-image");

    const { data: startMedia } = await supabase
      .from("media")
      .select("*")
      .eq("id", startImageMediaId)
      .single();

    if (!startMedia || startMedia.type !== "image") {
      throw new Error("Start-Bild nicht gefunden oder kein Bild");
    }

    const bucket = startMedia.source === "upload" ? "media-uploads" : "ai-generated";
    const { data: blob, error: dlError } = await supabase.storage
      .from(bucket)
      .download(startMedia.storage_path);

    if (dlError || !blob) {
      throw new Error("Start-Bild konnte nicht geladen werden");
    }

    const sizeMB = blob.size / (1024 * 1024);
    if (sizeMB > MAX_START_IMAGE_MB) {
      throw new Error(`Start-Bild ist ${sizeMB.toFixed(1)} MB groß. Max ${MAX_START_IMAGE_MB} MB.`);
    }

    const arrayBuffer = await blob.arrayBuffer();
    startImageBase64 = Buffer.from(arrayBuffer).toString("base64");
    startImageMimeType = blob.type || "image/jpeg";
    aiRefinedFrom = startImageMediaId;
    sourceWasUpload = startMedia.source === "upload";

    console.log(`[generate-video] Image-to-video with ${sizeMB.toFixed(2)} MB`);
  }

  await updateJobPhase(jobId, jobType, "submitting");
  console.log(`[generate-video] Submitting to Veo 3.1 (${model})...`);

  await updateJobPhase(jobId, jobType, "rendering");

  const videoAspect = (aspectRatio || "9:16") as "9:16" | "16:9";
  const result = await generateVideo(prompt, brand as Brand, {
    model,
    aspectRatio: videoAspect,
    durationSeconds: (duration || 8) as 4 | 6 | 8,
    startImageBase64,
    startImageMimeType,
    generateAudio,
    resolution,
  });

  if (!result.url) throw new Error("Veo lieferte keine Video-URL");

  await updateJobPhase(jobId, jobType, "downloading");
  const apiKey = process.env.GEMINI_API_KEY!;
  const separator = result.url.includes("?") ? "&" : "?";
  const downloadUrl = result.url + separator + "key=" + apiKey;

  const videoRes = await fetch(downloadUrl);
  if (!videoRes.ok) throw new Error("Video-Download fehlgeschlagen: " + videoRes.status);
  const videoBuffer = new Uint8Array(await videoRes.arrayBuffer());

  await updateJobPhase(jobId, jobType, "uploading");
  const filePath = `${brand.slug}/generated/${Date.now()}-video.mp4`;
  const { error: uploadError } = await supabase.storage
    .from("ai-generated")
    .upload(filePath, videoBuffer, {
      contentType: "video/mp4",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  await updateJobPhase(jobId, jobType, "saving");
  const tagArr = (tags || "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  if (startImageMediaId) tagArr.push("image-to-video");
  tagArr.push(`veo-3.1-${model}`);
  if (generateAudio) tagArr.push("with-audio");

  const { data: mediaRow, error: insertError } = await supabase
    .from("media")
    .insert({
      brand_id: brandId,
      type: "video",
      source: sourceWasUpload ? "hybrid" : "ai_generated",
      storage_path: filePath,
      file_size: videoBuffer.length,
      duration_seconds: duration || 8,
      ai_prompt: result.fullPrompt,
      ai_model: result.model,
      ai_refined_from: aiRefinedFrom,
      title: title || `KI-Video: ${prompt.slice(0, 50)}`,
      tags: tagArr.length > 0 ? tagArr : null,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  await completeJob(jobId, mediaRow.id);
  return { media: mediaRow, modelUsed: result.model };
}
