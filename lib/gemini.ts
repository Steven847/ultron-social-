// lib/gemini.ts — Google Gemini API Integration for ULTRON
// v0.6a-buildfix4: Regex rewritten without s-flag (works with older ES targets)

import type { Brand } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY nicht gesetzt");
  return key;
}

// --- BRAND RULES FOR IMAGES ---

const NO_LOGO_RULES_IMAGE = [
  "",
  "ABSOLUTELY DO NOT INCLUDE:",
  "- NO logos, no brand emblems, no badges, no patches with text",
  "- NO brand names written as text anywhere",
  "- NO product labels with brand text, no packaging with brand names",
  "- The brand logo is added AFTER generation as a separate overlay",
].join("\n");

/**
 * Clean brand image rules by removing logo-related lines.
 * Uses line-by-line approach instead of regex with `s` flag (which needs ES2018+).
 */
function cleanImageStyleRules(rules: string): string {
  const lines = rules.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    // Skip lines that mention logos/badges
    if (
      /^-\s*somewhere visible/i.test(line) ||
      /^-\s*include.*logo/i.test(line) ||
      /logo badge/i.test(line)
    ) {
      continue;
    }
    cleaned.push(line);
  }
  return cleaned.join("\n").trim();
}

export function buildImageBrandRules(brand: Brand | null): string {
  if (!brand) {
    return "\n\nSTYLE: Photorealistic, professional photography, natural lighting. NO children/minors." + NO_LOGO_RULES_IMAGE;
  }
  const parts = ["", "STYLE RULES:"];
  if (brand.image_style_rules) {
    const cleanedRules = cleanImageStyleRules(brand.image_style_rules);
    parts.push(cleanedRules || "Photorealistic, natural lighting, real textures.");
  } else {
    parts.push("Photorealistic, shot on Canon EOS R5, natural lighting, real textures.");
  }
  parts.push("", "HARD RULES:");
  parts.push("- NO children, minors, babies, kids, or teenagers under 18");
  parts.push("- NO cannabis leaves, smoking, drug references, syringes, pills");
  parts.push("- NO overly smooth AI skin, plastic objects, unrealistic stock-photo look");
  parts.push(NO_LOGO_RULES_IMAGE);
  return parts.join("\n");
}

// --- BRAND RULES FOR VIDEOS ---

export function buildVideoBrandRules(
  brand: Brand | null,
  mode: "text-to-video" | "image-to-video" = "text-to-video"
): string {
  if (mode === "image-to-video") {
    return "\n\nQuality: cinematic, professional, photorealistic. Do not add text, logos, or watermarks.";
  }

  const parts: string[] = [""];
  if (brand?.tone) {
    const moodSnippet = brand.tone.split(/[.!]/)[0].slice(0, 80);
    parts.push(`Mood: ${moodSnippet}.`);
  }
  parts.push("Quality: cinematic, professional, photorealistic.");
  parts.push("Do not add text, logos, watermarks, or brand names in the video.");
  return parts.join(" ");
}

// --- POTENTIALLY PROBLEMATIC WORD DETECTION ---

const RISKY_WORDS = [
  "bud", "cannabis", "marijuana", "weed", "pot", "joint", "blunt",
  "thc", "cbd", "hemp", "high", "stoned", "smoke", "smoking",
  "drug", "drugs", "kush",
];

export interface PromptWarning {
  word: string;
  suggestion: string;
}

export function detectRiskyWords(prompt: string): PromptWarning[] {
  const warnings: PromptWarning[] = [];
  const lower = prompt.toLowerCase();
  for (const word of RISKY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lower)) {
      warnings.push({
        word,
        suggestion: getSuggestion(word),
      });
    }
  }
  return warnings;
}

function getSuggestion(word: string): string {
  switch (word.toLowerCase()) {
    case "bud":
    case "cannabis":
    case "marijuana":
    case "weed":
    case "pot":
    case "kush":
    case "hemp":
      return "ersetze durch 'the object', 'the subject', 'it' (besonders bei Image-to-Video, das Bild zeigt schon was)";
    case "joint":
    case "blunt":
    case "smoke":
    case "smoking":
      return "weglassen oder durch 'aromatic vapor', 'mystical mist' ersetzen";
    case "thc":
    case "cbd":
      return "weglassen — keine chemischen Begriffe";
    case "high":
    case "stoned":
      return "ersetze durch 'elevated', 'transcendent', 'uplifted'";
    default:
      return "ersetze durch neutraleres Wort";
  }
}

// --- IMAGE GENERATION ---

export interface ReferenceImage {
  base64: string;
  mimeType: string;
}

export async function generateImage(
  prompt: string,
  brand: Brand | null,
  options?: {
    aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
    referenceImages?: ReferenceImage[];
    referenceImageBase64?: string;
    referenceImageMimeType?: string;
  }
): Promise<{ base64: string; mimeType: string; fullPrompt: string }> {
  const apiKey = getApiKey();
  const model = "gemini-3.1-flash-image-preview";

  const refs: ReferenceImage[] = [];
  if (options?.referenceImages && options.referenceImages.length > 0) {
    refs.push(...options.referenceImages);
  } else if (options?.referenceImageBase64 && options?.referenceImageMimeType) {
    refs.push({
      base64: options.referenceImageBase64,
      mimeType: options.referenceImageMimeType,
    });
  }

  let promptWithContext = prompt;
  if (refs.length > 1) {
    promptWithContext = `Combine the elements from the ${refs.length} reference images according to this instruction: ${prompt}`;
  }

  const fullPrompt = "Generate a photorealistic image: " + promptWithContext + buildImageBrandRules(brand);

  const contentParts: any[] = refs.map((ref) => ({
    inlineData: { mimeType: ref.mimeType, data: ref.base64 },
  }));
  contentParts.push({ text: fullPrompt });

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: contentParts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: options?.aspectRatio || "1:1",
            imageSize: "1K",
          },
        },
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error("Gemini error: " + data.error.message);

  const respParts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = respParts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

  if (!imagePart) {
    const textPart = respParts.find((p: any) => p.text);
    throw new Error("No image generated" + (textPart ? ". Model: " + textPart.text.slice(0, 200) : ""));
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
    fullPrompt,
  };
}

// --- VIDEO GENERATION ---

export async function generateVideo(
  prompt: string,
  brand: Brand | null,
  options?: {
    model?: string;
    aspectRatio?: "16:9" | "9:16";
    durationSeconds?: 4 | 6 | 8;
    startImageBase64?: string;
    startImageMimeType?: string;
  }
): Promise<{ url: string; mimeType: string; fullPrompt: string }> {
  const apiKey = getApiKey();
  const model = options?.model || "veo-2.0-generate-001";

  const isImageToVideo = !!(options?.startImageBase64 && options?.startImageMimeType);
  const mode = isImageToVideo ? "image-to-video" : "text-to-video";

  let fullPrompt: string;
  if (isImageToVideo) {
    fullPrompt = prompt.trim() + buildVideoBrandRules(brand, mode);
  } else {
    fullPrompt = prompt.trim() + buildVideoBrandRules(brand, mode);
  }

  fullPrompt = fullPrompt.replace(/\n{3,}/g, "\n\n").trim();

  console.log("[gemini.generateVideo] Mode:", mode);
  console.log("[gemini.generateVideo] Final prompt length:", fullPrompt.length);
  console.log("[gemini.generateVideo] Prompt:", fullPrompt.slice(0, 500));

  const instance: any = { prompt: fullPrompt };
  if (isImageToVideo) {
    instance.image = {
      bytesBase64Encoded: options!.startImageBase64,
      mimeType: options!.startImageMimeType,
    };
  }

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":predictLongRunning",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        instances: [instance],
        parameters: {
          aspectRatio: options?.aspectRatio || "9:16",
          sampleCount: 1,
          durationSeconds: options?.durationSeconds || 8,
        },
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error("Veo error: " + data.error.message);
  if (!data.name) throw new Error("Unexpected Veo response: " + JSON.stringify(data).slice(0, 300));

  const result = await pollVideoOperation(data.name, apiKey);
  return { ...result, fullPrompt };
}

async function pollVideoOperation(
  operationName: string,
  apiKey: string,
  maxWaitSec = 240
): Promise<{ url: string; mimeType: string }> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitSec * 1000) {
    const res = await fetch(GEMINI_API_BASE + "/" + operationName, {
      headers: { "x-goog-api-key": apiKey },
    });
    const data = await res.json();

    if (data.done) {
      const gvr = data.response?.generateVideoResponse;
      if (gvr?.generatedSamples?.length > 0) {
        return { url: gvr.generatedSamples[0].video?.uri || "", mimeType: "video/mp4" };
      }
      const videos = data.response?.generatedSamples || data.response?.predictions || [];
      if (videos.length > 0) {
        return {
          url: videos[0].uri || videos[0].video?.uri || "",
          mimeType: videos[0].mimeType || "video/mp4",
        };
      }
      throw new Error("Video done but no result");
    }
    if (data.error) throw new Error("Video failed: " + data.error.message);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Video generation timeout after " + maxWaitSec + "s");
}

// --- TEXT GENERATION ---

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = getApiKey();
  const model = "gemini-2.5-flash";

  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2048 },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error("Gemini text error: " + data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export function buildBrandSystemPrompt(brand: Brand | null): string {
  if (!brand) return "You are a helpful social media content creator.";
  const parts = [`You are the social media manager for "${brand.name}".`, ""];
  if (brand.description) parts.push("BRAND: " + brand.description);
  if (brand.personality && brand.personality.length > 0) {
    parts.push("", "BRAND PERSONALITY:");
    brand.personality.forEach((p) => parts.push("- " + p));
  }
  if (brand.tone) parts.push("", "TONE: " + brand.tone);
  if (brand.do_say && brand.do_say.length > 0) parts.push("", "DO SAY: " + brand.do_say.join(", "));
  if (brand.dont_say && brand.dont_say.length > 0) parts.push("", "DO NOT SAY: " + brand.dont_say.join(", "));
  parts.push("", "Respond only with the finished content, no meta-commentary.");
  return parts.join("\n");
}
