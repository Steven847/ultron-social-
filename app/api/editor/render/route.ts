// app/api/editor/render/route.ts — Render text overlays with Google Fonts support
// v0.4.1: fetches Google Fonts CSS and embeds it into the SVG so sharp can use the fonts

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { buildOverlaySvg, getGoogleFontsForLayers, type TextLayer } from "@/lib/editor";
import sharp from "sharp";

export const maxDuration = 60;

interface RenderRequest {
  brandId: string;
  baseMediaId: string;
  layers: TextLayer[];
  title?: string;
  tags?: string;
}

// Fetch the actual font files referenced in a Google Fonts CSS and inline them as base64
// so the SVG is fully self-contained when handed to sharp.
async function fetchAndInlineGoogleFontsCss(googleFontUrls: string[]): Promise<string> {
  if (googleFontUrls.length === 0) return "";

  const combinedCss: string[] = [];

  for (const url of googleFontUrls) {
    try {
      // Get the CSS — using a desktop user-agent so Google returns TTF/WOFF2 with broad font ranges
      const cssRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!cssRes.ok) {
        console.warn("[render] Google Fonts CSS fetch failed:", cssRes.status, url);
        continue;
      }
      let css = await cssRes.text();

      // Find all url(...) references to actual font files and inline them as base64 data URIs
      const fontUrlMatches = Array.from(css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g));

      for (const match of fontUrlMatches) {
        const fontUrl = match[1];
        try {
          const fontRes = await fetch(fontUrl);
          if (!fontRes.ok) continue;
          const buffer = Buffer.from(await fontRes.arrayBuffer());
          const base64 = buffer.toString("base64");
          // Determine format from URL extension
          const isWoff2 = fontUrl.endsWith(".woff2");
          const format = isWoff2 ? "woff2" : "ttf";
          const dataUri = `data:font/${format};base64,${base64}`;
          css = css.replace(fontUrl, dataUri);
        } catch (e) {
          console.warn("[render] Failed to inline font file:", fontUrl);
        }
      }
      combinedCss.push(css);
    } catch (err) {
      console.warn("[render] Google Fonts processing error:", err);
    }
  }

  return combinedCss.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RenderRequest;
    const { brandId, baseMediaId, layers, title, tags } = body;

    if (!brandId || !baseMediaId || !Array.isArray(layers)) {
      return NextResponse.json({ error: "brandId, baseMediaId und layers erforderlich" }, { status: 400 });
    }
    if (layers.length === 0) {
      return NextResponse.json({ error: "Mindestens ein Text-Layer erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();

    const { data: brand } = await supabase
      .from("brands")
      .select("slug")
      .eq("id", brandId)
      .single();
    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    const { data: baseMedia } = await supabase
      .from("media")
      .select("*")
      .eq("id", baseMediaId)
      .single();
    if (!baseMedia || baseMedia.type !== "image") {
      return NextResponse.json({ error: "Nur Bilder können bearbeitet werden" }, { status: 400 });
    }

    const bucket = baseMedia.source === "upload" ? "media-uploads" : "ai-generated";
    const { data: blob, error: dlError } = await supabase.storage
      .from(bucket)
      .download(baseMedia.storage_path);
    if (dlError || !blob) {
      return NextResponse.json({ error: "Quell-Bild konnte nicht geladen werden" }, { status: 500 });
    }

    const baseBuffer = Buffer.from(await blob.arrayBuffer());

    const baseImage = sharp(baseBuffer);
    const meta = await baseImage.metadata();
    if (!meta.width || !meta.height) {
      return NextResponse.json({ error: "Bild hat keine gültigen Dimensionen" }, { status: 500 });
    }

    console.log(`[editor/render] Rendering ${layers.length} layer(s) at ${meta.width}x${meta.height}`);

    // Find Google Fonts used in the layers and inline them
    const usedGoogleFonts = getGoogleFontsForLayers(layers);
    let embeddedCss = "";
    if (usedGoogleFonts.length > 0) {
      console.log(`[editor/render] Inlining ${usedGoogleFonts.length} Google Font(s)...`);
      const urls = usedGoogleFonts.map(
        (f) => `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
      );
      embeddedCss = await fetchAndInlineGoogleFontsCss(urls);
    }

    // Build SVG with embedded fonts
    const svg = buildOverlaySvg(layers, meta.width, meta.height, embeddedCss);
    const svgBuffer = Buffer.from(svg, "utf-8");

    const result = await sharp(baseBuffer)
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer();

    const filePath = `${brand.slug}/generated/${Date.now()}-edited.png`;
    const { error: uploadError } = await supabase.storage
      .from("ai-generated")
      .upload(filePath, result, { contentType: "image/png", upsert: false });
    if (uploadError) {
      console.error("[editor/render] Upload failed:", uploadError);
      throw uploadError;
    }

    const tagArr = (tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
    if (!tagArr.includes("editor")) tagArr.push("editor");
    if (!tagArr.includes("text-overlay")) tagArr.push("text-overlay");

    const { data: newMedia, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brandId,
        type: "image",
        source: baseMedia.source === "upload" ? "hybrid" : "ai_generated",
        storage_path: filePath,
        file_size: result.length,
        ai_model: "editor",
        ai_refined_from: baseMediaId,
        ai_prompt: baseMedia.ai_prompt
          ? `[Editor] Original: ${baseMedia.ai_prompt.slice(0, 200)} | Text-Layers: ${layers.length}`
          : `[Editor] Text-Overlay mit ${layers.length} Layer(n)`,
        title: title || (baseMedia.title ? `${baseMedia.title} (bearbeitet)` : "Bearbeitetes Bild"),
        tags: tagArr.length > 0 ? tagArr : null,
        category: baseMedia.category,
        mood: baseMedia.mood,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[editor/render] DB insert failed:", insertError);
      throw insertError;
    }

    return NextResponse.json({ success: true, media: newMedia });
  } catch (error: any) {
    console.error("[editor/render] ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Render fehlgeschlagen" }, { status: 500 });
  }
}
