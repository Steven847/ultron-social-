// app/api/editor/suggest-text/route.ts — KI schlägt Overlay-Texte vor

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { describeImage } from "@/lib/composer";

export const maxDuration = 60;

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY nicht gesetzt");
  return key;
}

interface SuggestRequest {
  brandId: string;
  mediaId: string;
  caption?: string;
  // 'hook' = max 5 words, attention-grabber
  // 'caption' = 1-2 short sentences
  // 'tag' = 1-3 words, label-style
  // 'cta' = action-call, 2-5 words
  variant?: "hook" | "caption" | "tag" | "cta" | "mixed";
  count?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SuggestRequest;
    const { brandId, mediaId, caption, variant = "mixed", count = 6 } = body;

    if (!brandId || !mediaId) {
      return NextResponse.json({ error: "brandId und mediaId erforderlich" }, { status: 400 });
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

    const { data: media } = await supabase
      .from("media")
      .select("*")
      .eq("id", mediaId)
      .single();
    if (!media || media.type !== "image") {
      return NextResponse.json({ error: "Nur Bilder unterstützt" }, { status: 400 });
    }

    // Get / generate image description
    let description = media.ai_description as string | null;
    if (!description) {
      const bucketName = media.source === "upload" ? "media-uploads" : "ai-generated";
      const { data: blob } = await supabase.storage.from(bucketName).download(media.storage_path);
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        description = await describeImage(base64, blob.type || "image/jpeg");
        await supabase
          .from("media")
          .update({
            ai_description: description,
            ai_description_at: new Date().toISOString(),
          })
          .eq("id", mediaId);
      }
    }

    // Build the suggestion prompt
    const sysParts: string[] = [];
    sysParts.push(
      `Du bist Social-Media-Texter für die Marke "${brand.name}". Du erstellst kurze Overlay-Texte für Bilder.`
    );
    if (brand.description) sysParts.push("Marke: " + brand.description);
    if (brand.tone) sysParts.push("Tonalität: " + brand.tone);
    if (brand.do_say && brand.do_say.length > 0) {
      sysParts.push("Bevorzugte Begriffe: " + brand.do_say.join(", "));
    }
    if (brand.dont_say && brand.dont_say.length > 0) {
      sysParts.push("Verbotene Begriffe: " + brand.dont_say.join(", "));
    }

    const variantHint =
      variant === "hook"
        ? "TYP: 'Hook' — sehr kurz, max 5 Wörter, aufmerksamkeitsstark, gross gesetzt."
        : variant === "caption"
        ? "TYP: 'Caption' — 1-2 kurze Sätze, max 12 Wörter total, gut lesbar."
        : variant === "tag"
        ? "TYP: 'Tag' — 1-3 Wörter, Label-Style (z.B. 'NEU', 'Limited Edition', 'Frisch geerntet')"
        : variant === "cta"
        ? "TYP: 'CTA' — Aufforderung, 2-5 Wörter (z.B. 'Jetzt entdecken', 'Mehr erfahren')"
        : "TYP: MIX — generiere unterschiedliche Stile: Hooks (kurz/laut), Caption-Sätze, Tags (1-3 Wörter), CTAs.";

    const userParts: string[] = [];
    userParts.push("Bild-Kontext (was auf dem Bild zu sehen ist):");
    userParts.push(description || "(Keine Beschreibung verfügbar)");
    if (caption) {
      userParts.push("");
      userParts.push("Caption die das Bild begleiten wird:");
      userParts.push(caption);
    }
    userParts.push("");
    userParts.push(variantHint);
    userParts.push("");
    userParts.push(
      `Erstelle ${count} verschiedene Overlay-Text-Vorschläge die direkt auf das Bild gelegt werden können.`
    );
    userParts.push("");
    userParts.push("Regeln:");
    userParts.push("- Jeder Vorschlag soll IN SICH funktionieren — eigenständig lesbar.");
    userParts.push("- Keine Erklärungen, keine Anführungszeichen, keine Nummerierungen.");
    userParts.push("- Verwende nur Text, der direkt auf das Bild kann.");
    userParts.push("- Sprache: Deutsch (es sei denn die Marke ist explizit englischsprachig).");
    userParts.push("");
    userParts.push("Antworte als JSON-Array, ohne Markdown, ohne Erklärung:");
    userParts.push(
      `[{"text":"...","type":"hook|caption|tag|cta"}, ...]`
    );

    const apiKey = getApiKey();
    const res = await fetch(
      GEMINI_API_BASE + "/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userParts.join("\n") }] }],
          systemInstruction: { parts: [{ text: sysParts.join("\n") }] },
          generationConfig: { maxOutputTokens: 1500, temperature: 0.9 },
        }),
      }
    );

    const data = await res.json();
    if (data.error) throw new Error("Gemini error: " + data.error.message);

    const rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const suggestions = parseSuggestions(rawText);

    return NextResponse.json({
      success: true,
      suggestions,
      imageDescription: description,
    });
  } catch (error: any) {
    console.error("[editor/suggest-text] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseSuggestions(rawText: string): { text: string; type: string }[] {
  const cleaned = rawText.replace(/```json\s*|```/g, "").trim();
  let json = cleaned;
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start >= 0 && end > start) {
    json = cleaned.slice(start, end + 1);
  }

  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s: any) => typeof s?.text === "string" && s.text.trim().length > 0)
      .map((s: any) => ({
        text: s.text.trim().replace(/^["']|["']$/g, ""),
        type: typeof s?.type === "string" ? s.type : "caption",
      }));
  } catch {
    // Fallback: split rawText into lines if JSON parse fails
    return cleaned
      .split("\n")
      .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((l) => l.length > 0 && l.length < 100)
      .slice(0, 6)
      .map((text) => ({ text, type: "caption" }));
  }
}
