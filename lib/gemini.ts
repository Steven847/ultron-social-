// lib/gemini.ts — Google Gemini API Integration for ULTRON
// Images: Nano Banana 2 (gemini-3.1-flash-image-preview)
// Videos: Veo 2 (predictLongRunning endpoint)
// Text: Gemini 2.5 Flash
// Brand-aware: takes Brand object to inject brand rules into prompts

import type { Brand } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY nicht gesetzt");
  return key;
}

// Build brand-aware image prompt extension
export function buildImageBrandRules(brand: Brand | null): string {
  if (!brand) {
    return "\n\nSTYLE: Photorealistic, professional photography, natural lighting. NO children/minors.";
  }

  const parts = ["", "STYLE RULES:"];

  if (brand.image_style_rules) {
    parts.push(brand.image_style_rules);
  } else {
    parts.push("Photorealistic, shot on Canon EOS R5, natural lighting, real textures.");
  }

  parts.push("", "BRAND ELEMENTS:");
  parts.push(`- This is for the brand "${brand.name}".`);
  if (brand.tone) parts.push(`- Tone/feeling: ${brand.tone}`);
  if (brand.primary_color) parts.push(`- Brand primary color: ${brand.primary_color}`);

  parts.push("", "HARD RULES (never violate):");
  parts.push("- NO children, minors, babies, kids, or teenagers under 18");
  parts.push("- NO cannabis leaves, smoking, drug references, syringes, pills");
  parts.push("- NO overly smooth AI skin, plastic objects, unrealistic stock-photo look");

  return parts.join("\n");
}

export function buildVideoBrandRules(brand: Brand | null): string {
  if (!brand) {
    return "\n\nSTYLE: Cinematic, professional, natural lighting. NO children/minors.";
  }

  const parts = ["", "VIDEO STYLE RULES:"];

  if (brand.video_style_rules) {
    parts.push(brand.video_style_rules);
  } else {
    parts.push("Cinematic quality, professional cinema camera, natural lighting.");
  }

  parts.push("", "BRAND CONTEXT:");
  parts.push(`- This is for the brand "${brand.name}".`);
  if (brand.tone) parts.push(`- Tone/feeling: ${brand.tone}`);

  parts.push("", "HARD RULES:");
  parts.push("- NO children, minors, babies, kids, or teenagers under 18");
  parts.push("- NO cannabis leaves, smoking, drug imagery");

  return parts.join("\n");
}

// --- IMAGE GENERATION ---

export async function generateImage(
  prompt: string,
  brand: Brand | null,
  options?: {
    aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
    referenceImageBase64?: string;
    referenceImageMimeType?: string;
  }
): Promise<{ base64: string; mimeType: string; fullPrompt: string }> {
  const apiKey = getApiKey();
  const model = "gemini-3.1-flash-image-preview";

  const fullPrompt = "Generate a photorealistic image: " + prompt + buildImageBrandRules(brand);

  const parts: any[] = [];
  if (options?.referenceImageBase64 && options?.referenceImageMimeType) {
    parts.push({
      inlineData: {
        mimeType: options.referenceImageMimeType,
        data: options.referenceImageBase64,
      },
    });
  }
  parts.push({ text: fullPrompt });

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
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

// --- VIDEO GENERATION (Veo 2) ---

export async function generateVideo(
  prompt: string,
  brand: Brand | null,
  options?: {
    model?: string;
    aspectRatio?: "16:9" | "9:16";
    durationSeconds?: 4 | 6 | 8;
  }
): Promise<{ url: string; mimeType: string; fullPrompt: string }> {
  const apiKey = getApiKey();
  const model = options?.model || "veo-2.0-generate-001";

  const fullPrompt = prompt + buildVideoBrandRules(brand);

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":predictLongRunning",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt: fullPrompt }],
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
  if (!data.name) throw new Error("Unexpected Veo response: " + JSON.stringify(data).slice(0, 200));

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
        return {
          url: gvr.generatedSamples[0].video?.uri || "",
          mimeType: "video/mp4",
        };
      }
      const videos = data.response?.generatedSamples || data.response?.predictions || [];
      if (videos.length > 0) {
        return {
          url: videos[0].uri || videos[0].video?.uri || "",
          mimeType: videos[0].mimeType || "video/mp4",
        };
      }
      throw new Error("Video done but no result: " + JSON.stringify(data.response).slice(0, 300));
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

// Build system prompt for brand-aware text generation
export function buildBrandSystemPrompt(brand: Brand | null): string {
  if (!brand) return "You are a helpful social media content creator.";

  const parts = [
    `You are the social media manager for "${brand.name}".`,
    "",
  ];

  if (brand.description) {
    parts.push("BRAND: " + brand.description);
  }

  if (brand.personality && brand.personality.length > 0) {
    parts.push("", "BRAND PERSONALITY:");
    brand.personality.forEach((p) => parts.push("- " + p));
  }

  if (brand.tone) {
    parts.push("", "TONE: " + brand.tone);
  }

  if (brand.do_say && brand.do_say.length > 0) {
    parts.push("", "DO SAY: " + brand.do_say.join(", "));
  }

  if (brand.dont_say && brand.dont_say.length > 0) {
    parts.push("", "DO NOT SAY: " + brand.dont_say.join(", "));
  }

  parts.push("", "Respond only with the finished content, no meta-commentary.");

  return parts.join("\n");
}
