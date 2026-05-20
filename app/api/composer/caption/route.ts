// app/api/composer/caption/route.ts — Generate caption variants for a brand,
// optionally based on an image from the library

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  describeImage,
  generateCaptions,
  type CaptionRequest,
} from "@/lib/composer";
import type { Brand } from "@/lib/types";
import crypto from "crypto";

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brandId,
      mediaId,
      topic,
      tone = "witzig",
      length = "mittel",
      platform = "instagram",
      variantCount = 3,
      includeFirstComment = false,
      saveHistory = true,
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

    // Get image description if media provided
    let imageDescription: string | undefined;
    if (mediaId) {
      const { data: media } = await supabase
        .from("media")
        .select("*")
        .eq("id", mediaId)
        .single();

      if (media) {
        // Use cached description if it exists
        if (media.ai_description) {
          imageDescription = media.ai_description;
          console.log("[composer/caption] Using cached description");
        } else if (media.type === "image") {
          // Generate description and cache it
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
          // For videos, just use title + tags as context (no vision yet)
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
      tone,
      length,
      platform,
      variantCount,
      includeFirstComment,
    };

    console.log("[composer/caption] Generating", variantCount, "variants...");
    const variants = await generateCaptions(reqOptions);

    if (variants.length === 0) {
      return NextResponse.json(
        { error: "Keine Varianten generiert — bitte erneut versuchen" },
        { status: 500 }
      );
    }

    // Save to caption_history (grouped by variant_group)
    const variantGroup = crypto.randomUUID();
    if (saveHistory) {
      const rows = variants.map((v) => ({
        brand_id: brandId,
        caption: v.caption,
        hashtags: v.hashtags,
        first_comment: v.firstComment || null,
        topic: topic || null,
        tone,
        length_category: length,
        variant_group: variantGroup,
        media_id: mediaId || null,
      }));
      const { data: saved } = await supabase
        .from("caption_history")
        .insert(rows)
        .select();

      // Return variants with their IDs from history
      const variantsWithIds = variants.map((v, i) => ({
        ...v,
        id: saved?.[i]?.id || null,
      }));

      return NextResponse.json({
        success: true,
        variants: variantsWithIds,
        variantGroup,
        imageDescription,
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
