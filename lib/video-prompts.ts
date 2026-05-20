// lib/video-prompts.ts — Curated prompt templates for image-to-video
// These are SHORT and FOCUSED on motion/atmosphere only

export interface VideoPromptTemplate {
  id: string;
  label: string;
  category: "cinematic" | "action" | "subtle" | "dramatic";
  description: string;
  prompt: string;
  emoji: string;
}

// IMPORTANT PRINCIPLE for image-to-video prompts:
// 1. Don't describe the SUBJECT (the image already shows it)
// 2. Describe ONLY: camera motion, lighting changes, atmosphere effects
// 3. Keep it under 30 words — Veo gets confused by long prompts
// 4. Use "it" or "the subject" instead of naming the object
export const VIDEO_PROMPT_TEMPLATES: VideoPromptTemplate[] = [
  {
    id: "hero-landing",
    label: "Superheld-Landung",
    category: "dramatic",
    emoji: "🦸",
    description: "Heroische Landung mit Cape und Lichtstrahlen",
    prompt:
      "Slow motion descent from above. A red silk cape billows behind it in the wind. Volumetric god rays pierce through clouds. Camera tilts up from low angle. Cinematic Marvel-style color grade.",
  },
  {
    id: "hero-orbit",
    label: "Heroic Orbit",
    category: "cinematic",
    emoji: "⭐",
    description: "Kamera kreist um das Objekt, Cape weht",
    prompt:
      "Camera slowly orbits around it. A red silk cape flows dramatically in slow motion. Golden hour lighting with anamorphic lens flares. Cinematic atmosphere.",
  },
  {
    id: "swing-action",
    label: "Spider-Swing",
    category: "action",
    emoji: "🕷️",
    description: "Action-Swing durch eine Stadt",
    prompt:
      "Swings dynamically on a silken thread through urban canyon. Motion blur trails. Neon lights below. Dynamic tracking shot, IMAX cinematography.",
  },
  {
    id: "epic-reveal",
    label: "Epic Reveal",
    category: "dramatic",
    emoji: "💥",
    description: "Dramatische Enthüllung mit Sturm-Wolken",
    prompt:
      "Floats in mid-air with red silk cape billowing in slow motion. Storm clouds part to reveal god rays. Snow-capped mountains behind. Christopher Nolan color grade.",
  },
  {
    id: "zoom-in",
    label: "Slow Zoom In",
    category: "subtle",
    emoji: "🎬",
    description: "Langsamer Zoom mit minimaler Bewegung",
    prompt:
      "Camera slowly pushes in. Subtle ambient motion. Soft golden hour lighting. Shallow depth of field. Cinematic stillness.",
  },
  {
    id: "rotate-product",
    label: "Produkt-Rotation",
    category: "cinematic",
    emoji: "🔄",
    description: "Saubere Produkt-Drehung wie in Werbung",
    prompt:
      "Smooth 360-degree rotation. Studio lighting with soft shadows. Clean commercial aesthetic. Subtle camera dolly.",
  },
  {
    id: "float-mystical",
    label: "Mystical Float",
    category: "subtle",
    emoji: "✨",
    description: "Schwebt mystisch, mit Partikeln",
    prompt:
      "Floats gently in mid-air. Sparkling particles drift around. Dreamy soft light. Camera slowly orbits. Magical atmosphere.",
  },
  {
    id: "alpine-wind",
    label: "Alpen-Wind",
    category: "cinematic",
    emoji: "🏔️",
    description: "Wind weht durch Alpen-Setting",
    prompt:
      "Gentle wind moves around it. Soft golden hour light shifts across the scene. Snow-capped peaks in distant haze. Cinematic slow pan.",
  },
];

// Group templates by category for the UI
export const TEMPLATE_CATEGORIES = [
  { key: "cinematic" as const, label: "🎬 Cinematic" },
  { key: "action" as const, label: "💥 Action" },
  { key: "dramatic" as const, label: "🦸 Dramatic" },
  { key: "subtle" as const, label: "✨ Subtle" },
];

export function getTemplatesByCategory(category: string): VideoPromptTemplate[] {
  return VIDEO_PROMPT_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): VideoPromptTemplate | undefined {
  return VIDEO_PROMPT_TEMPLATES.find((t) => t.id === id);
}
