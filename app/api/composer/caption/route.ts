// app/api/composer/caption/route.ts — Generate captions with voice modes + inspirations

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  describeImage,
  generateCaptions,
  type CaptionRequest,
} from "@/lib/composer";
import type { Brand, VoiceMode, InspirationPost } from "@/lib/types";
import crypto from "crypto";

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brandId,
      mediaId,
      topic,
      voiceModeId,
      length = "mittel",
      platform = "instagram",
      variantCount = 3,
      includeFirstComment = false,
      saveHistory = true,
      inspirationIds,
    } = body;

    if (!brandId) {
      return NextResponse.json({ error: "brandId erforderlich" }, { status: 400 });
    }
    if (!mediaId && !topic) {
      return NextResponse.json(
        { error: "Bitte ein Bild auswählen ODER ein Thema angeben" },
        { status: 400 }
      );
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

    // Load voice mode if specified
    let voiceMode: VoiceMode | null = null;
    if (voiceModeId) {
      const { data } = await supabase
        .from("voice_modes")
        .select("*")
        .eq("id", voiceModeId)
        .single();
      voiceMode = data as VoiceMode | null;
    }

    // Load inspirations if specified
    let inspirations: InspirationPost[] = [];
    if (Array.isArray(inspirationIds) && inspirationIds.length > 0) {
      const { data } = await supabase
        .from("inspiration_posts")
        .select("*")
        .in("id", inspirationIds);
      inspirations = (data as InspirationPost[]) || [];

      // Track usage
      for (const insp of inspirations) {
        const { data: current } = await supabase
          .from("inspiration_posts")
          .select("used_count")
          .eq("id", insp.id)
          .single();
        await supabase
          .from("inspiration_posts")
          .update({
            used_count: (current?.used_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", insp.id);
      }
    }

    // Get image description if media provided
    let imageDescription: string | undefined;
    if (mediaId) {
      const { data: media } = await supabase
        .from("media")
        .select("*")
        .eq("id", mediaId)
        .single();

      if (media) {
        if (media.ai_description) {
          imageDescription = media.ai_description;
          console.log("[composer/caption] Using cached description");
        } else if (media.type === "image") {
          const bucket = media.source === "upload" ? "media-uploads" : "ai-generated";
          const { data: blob } = await supabase.storage
            .from(bucket)
            .download(media.storage_path);

          if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            console.log("[composer/caption] Analyzing image...");
            imageDescription = await describeImage(base64, blob.type || "image/jpeg");

            await supabase
              .from("media")
              .update({
                ai_description: imageDescription,
                ai_description_at: new Date().toISOString(),
              })
              .eq("id", mediaId);
          }
        } else if (media.type === "video") {
          const parts: string[] = [];
          if (media.title) parts.push("Titel: " + media.title);
          if (media.tags && media.tags.length > 0) parts.push("Tags: " + media.tags.join(", "));
          if (media.ai_prompt) parts.push("Video-Konzept: " + media.ai_prompt.slice(0, 300));
          imageDescription = parts.join("\n");
        }
      }
    }

    const reqOptions: CaptionRequest = {
      brand: brand as Brand,
      topic,
      imageDescription,
      voiceMode,
      length,
      platform,
      variantCount,
      includeFirstComment,
      inspirations: inspirations.length > 0 ? inspirations : undefined,
    };

    console.log(
      `[composer/caption] Generating ${variantCount} variants ` +
      `(voice: ${voiceMode?.label || "default"}, inspirations: ${inspirations.length})`
    );
    const variants = await generateCaptions(reqOptions);

    if (variants.length === 0) {
      return NextResponse.json(
        { error: "Keine Varianten generiert — bitte erneut versuchen" },
        { status: 500 }
      );
    }

    const variantGroup = crypto.randomUUID();
    if (saveHistory) {
      const rows = variants.map((v) => ({
        brand_id: brandId,
        caption: v.caption,
        hashtags: v.hashtags,
        first_comment: v.firstComment || null,
        topic: topic || null,
        tone: voiceMode?.slug || null,
        length_category: length,
        variant_group: variantGroup,
        media_id: mediaId || null,
      }));
      const { data: saved } = await supabase
        .from("caption_history")
        .insert(rows)
        .select();

      const variantsWithIds = variants.map((v, i) => ({
        ...v,
        id: saved?.[i]?.id || null,
      }));

      return NextResponse.json({
        success: true,
        variants: variantsWithIds,
        variantGroup,
        imageDescription,
        voiceMode: voiceMode ? { id: voiceMode.id, label: voiceMode.label } : null,
        usedInspirations: inspirations.length,
      });
    }

    return NextResponse.json({
      success: true,
      variants,
      variantGroup,
      imageDescription,
    });
  } catch (error: any) {
    console.error("[composer/caption] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
