// lib/composer.ts — Helpers for caption + hashtag composition

import type { Brand, CaptionTone, CaptionLength } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY nicht gesetzt");
  return key;
}

// --- IMAGE/VIDEO ANALYSIS (Vision) ---
// Returns a German description of what's visible in the image.
// Used to seed caption generation.
export async function describeImage(imageBase64: string, mimeType: string): Promise<string> {
  const apiKey = getApiKey();
  const model = "gemini-2.5-flash";

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              {
                text:
                  "Beschreibe in 2-3 deutschen Sätzen was auf diesem Bild zu sehen ist. " +
                  "Konzentriere dich auf: Hauptobjekte, Atmosphäre, Setting, Farben, Stimmung. " +
                  "Keine Bewertung, keine Werbung — nur Beschreibung.",
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 300 },
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error("Vision error: " + data.error.message);
  return (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

// --- CAPTION GENERATION ---

export interface CaptionRequest {
  brand: Brand;
  topic?: string;
  imageDescription?: string;
  tone: CaptionTone;
  length: CaptionLength;
  platform?: "instagram" | "facebook" | "tiktok" | "linkedin";
  variantCount?: number;
  includeFirstComment?: boolean;
}

export interface CaptionVariant {
  caption: string;
  hashtags: string[];
  firstComment?: string;
}

const LENGTH_HINTS: Record<CaptionLength, string> = {
  kurz: "Sehr kurz — maximal 2 Sätze, ein Hook plus Punchline. Idealerweise 80-150 Zeichen.",
  mittel: "Mittellang — 3-5 Sätze mit Story-Bogen. Hook, Substanz, Call-to-Action. 200-500 Zeichen.",
  lang: "Ausführlich — 6-10 Sätze mit storytelling, mehreren Absätzen, klare Struktur. 500-1500 Zeichen.",
};

const TONE_HINTS: Record<CaptionTone, string> = {
  witzig: "Spielerisch, mit Wortwitz, Pointen oder unerwarteten Wendungen. Aber nicht albern.",
  informativ: "Sachlich-spannend. Fakten, Hintergründe, lehrreich aber lesbar.",
  frech: "Provokant, direkt, mit Augenzwinkern. Etwas Kante, aber nicht beleidigend.",
  herzlich: "Warm, persönlich, nahbar. Schreibt wie zu einem guten Freund.",
  professionell: "Geschäftsmäßig, präzise, vertrauenserweckend. Wenig Emojis, klare Aussagen.",
  inspirierend: "Motivierend, mit Vision, ermutigend. Großes Bild zeichnen.",
};

function buildPlatformHint(platform?: string): string {
  switch (platform) {
    case "linkedin":
      return "Plattform: LinkedIn — professionell, business-orientiert, längere Texte ok, wenige bis keine Emojis.";
    case "tiktok":
      return "Plattform: TikTok — hooky, kurz, Gen-Z-Sprache, Trends ok, viele Emojis erlaubt.";
    case "facebook":
      return "Plattform: Facebook — narrativer als IG, längere Texte ok, ältere Zielgruppe ansprechen.";
    case "instagram":
    default:
      return "Plattform: Instagram — visuell-ergänzend, gut für storytelling, max 2200 Zeichen, Emojis selektiv.";
  }
}

export async function generateCaptions(req: CaptionRequest): Promise<CaptionVariant[]> {
  const apiKey = getApiKey();
  const model = "gemini-2.5-flash";

  const variantCount = req.variantCount ?? 3;

  // Build system prompt
  const sysParts: string[] = [];
  sysParts.push(`Du erstellst Social-Media-Captions für die Marke "${req.brand.name}".`);
  if (req.brand.description) sysParts.push("Marke: " + req.brand.description);
  if (req.brand.personality && req.brand.personality.length > 0) {
    sysParts.push("Markenpersönlichkeit: " + req.brand.personality.join(" | "));
  }
  if (req.brand.tone) sysParts.push("Markenton: " + req.brand.tone);
  if (req.brand.do_say && req.brand.do_say.length > 0) {
    sysParts.push("BEVORZUGTE BEGRIFFE: " + req.brand.do_say.join(", "));
  }
  if (req.brand.dont_say && req.brand.dont_say.length > 0) {
    sysParts.push("VERMEIDE DIESE BEGRIFFE: " + req.brand.dont_say.join(", "));
  }
  const systemPrompt = sysParts.join("\n");

  // Build user prompt
  const userParts: string[] = [];
  userParts.push(buildPlatformHint(req.platform));
  userParts.push("");
  userParts.push("TONALITÄT: " + req.tone + " — " + TONE_HINTS[req.tone]);
  userParts.push("LÄNGE: " + req.length + " — " + LENGTH_HINTS[req.length]);

  if (req.imageDescription) {
    userParts.push("");
    userParts.push("BILD-KONTEXT (was auf dem visuellen Inhalt zu sehen ist):");
    userParts.push(req.imageDescription);
  }

  if (req.topic) {
    userParts.push("");
    userParts.push("THEMA / ANLASS:");
    userParts.push(req.topic);
  }

  // Hashtags
  const allowedHashtags: string[] = [];
  if (req.brand.primary_hashtags) allowedHashtags.push(...req.brand.primary_hashtags);
  if (req.brand.community_hashtags) allowedHashtags.push(...req.brand.community_hashtags);

  userParts.push("");
  userParts.push("HASHTAGS:");
  userParts.push("- Generiere 5-10 passende Hashtags pro Variante");
  if (allowedHashtags.length > 0) {
    userParts.push("- BEVORZUGT: " + allowedHashtags.join(", "));
  }
  if (req.brand.forbidden_hashtags && req.brand.forbidden_hashtags.length > 0) {
    userParts.push("- VERBOTEN (niemals benutzen): " + req.brand.forbidden_hashtags.join(", "));
  }

  if (req.includeFirstComment) {
    userParts.push("");
    userParts.push(
      'ERSTER KOMMENTAR: Erstelle einen kurzen "First Comment" der zusätzlich gepostet wird (oft mit weiteren Hashtags oder einem Call-to-Action). Optional.'
    );
  }

  userParts.push("");
  userParts.push(
    `Erstelle ${variantCount} unterschiedliche Caption-Varianten. Jede Variante soll einen anderen Ansatz wählen (z.B. anderer Hook, andere Perspektive).`
  );
  userParts.push("");
  userParts.push("Antworte AUSSCHLIESSLICH als JSON-Array, ohne Markdown, ohne Erklärung:");
  userParts.push(
    `[{"caption":"...","hashtags":["#tag1","#tag2"]${
      req.includeFirstComment ? ',"firstComment":"..."' : ""
    }}, ...]`
  );

  const userPrompt = userParts.join("\n");

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 3000, temperature: 0.85 },
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error("Caption error: " + data.error.message);

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseCaptionVariants(rawText);
}

export async function refineCaption(
  original: string,
  feedback: string,
  brand: Brand,
  existingHashtags: string[] = []
): Promise<CaptionVariant> {
  const apiKey = getApiKey();
  const model = "gemini-2.5-flash";

  const systemParts = [
    `Du verfeinerst Social-Media-Captions für "${brand.name}".`,
    brand.tone ? "Ton: " + brand.tone : "",
  ].filter(Boolean);

  const userPrompt = [
    "Originale Caption:",
    original,
    "",
    "Aktuelle Hashtags: " + (existingHashtags.length > 0 ? existingHashtags.join(" ") : "(keine)"),
    "",
    "ÄNDERUNGSWUNSCH des Nutzers:",
    feedback,
    "",
    "Erstelle eine VERBESSERTE Version. Hashtags ggf. anpassen.",
    "",
    "Antworte als JSON-Objekt, keine Erklärung, kein Markdown:",
    '{"caption":"...","hashtags":["#tag1","#tag2"]}',
  ].join("\n");

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemParts.join("\n") }] },
        generationConfig: { maxOutputTokens: 1500, temperature: 0.6 },
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error("Refine error: " + data.error.message);

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const variants = parseCaptionVariants("[" + rawText.replace(/^\[|\]$/g, "") + "]");
  return variants[0] || { caption: original, hashtags: existingHashtags };
}

// --- HASHTAG SUGGESTIONS (standalone) ---

export async function suggestHashtags(
  brand: Brand,
  context: string,
  count = 15
): Promise<{ primary: string[]; community: string[]; trending: string[] }> {
  const apiKey = getApiKey();
  const model = "gemini-2.5-flash";

  const allowedHashtags: string[] = [];
  if (brand.primary_hashtags) allowedHashtags.push(...brand.primary_hashtags);
  if (brand.community_hashtags) allowedHashtags.push(...brand.community_hashtags);

  const userPrompt = [
    `Schlage Instagram-Hashtags für die Marke "${brand.name}" vor.`,
    "",
    "KONTEXT des Posts:",
    context,
    "",
    "REGELN:",
    "- 5 PRIMARY: Hauptmarken-Hashtags die direkt zur Marke gehören",
    "- 5 COMMUNITY: Größere Community-Hashtags (Cannabis, Schweiz, Lifestyle etc.)",
    "- 5 TRENDING: aktuelle, relevante, mittel-große Hashtags",
    "",
    allowedHashtags.length > 0 ? "BEVORZUGT NUTZEN: " + allowedHashtags.join(", ") : "",
    brand.forbidden_hashtags && brand.forbidden_hashtags.length > 0
      ? "NIE VERWENDEN: " + brand.forbidden_hashtags.join(", ")
      : "",
    "",
    "Antworte als JSON-Objekt, kein Markdown:",
    '{"primary":["#..."],"community":["#..."],"trending":["#..."]}',
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(
    GEMINI_API_BASE + "/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.6 },
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error("Hashtag error: " + data.error.message);
  const rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  const cleaned = rawText.replace(/```json\s*|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { primary: allowedHashtags.slice(0, 5), community: [], trending: [] };
  }
}

// --- PARSING ---

function parseCaptionVariants(rawText: string): CaptionVariant[] {
  const cleaned = rawText.replace(/```json\s*|```/g, "").trim();

  // Find JSON array boundaries
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
      .filter((v: any) => typeof v?.caption === "string")
      .map((v: any) => ({
        caption: v.caption.trim(),
        hashtags: Array.isArray(v.hashtags)
          ? v.hashtags
              .map((h: any) => (typeof h === "string" ? (h.startsWith("#") ? h : "#" + h) : ""))
              .filter(Boolean)
          : [],
        firstComment: typeof v.firstComment === "string" ? v.firstComment.trim() : undefined,
      }));
  } catch {
    return [];
  }
}
