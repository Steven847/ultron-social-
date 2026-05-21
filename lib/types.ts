// lib/types.ts - TypeScript types matching the Supabase schema
// v0.5: Added VoiceMode and InspirationPost

export type Platform = "instagram" | "facebook" | "tiktok" | "linkedin";
export type MediaType = "image" | "video";
export type MediaSource = "upload" | "ai_generated" | "hybrid";
export type PostType = "post" | "story" | "reel" | "carousel";
export type PostStatus = "draft" | "scheduled" | "published" | "failed" | "archived";
export type CaptionTone = "witzig" | "informativ" | "frech" | "herzlich" | "professionell" | "inspirierend";
export type CaptionLength = "kurz" | "mittel" | "lang";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  tone: string | null;
  personality: string[] | null;
  do_say: string[] | null;
  dont_say: string[] | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  image_style_rules: string | null;
  video_style_rules: string | null;
  primary_hashtags: string[] | null;
  community_hashtags: string[] | null;
  forbidden_hashtags: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: string;
  brand_id: string;
  type: MediaType;
  source: MediaSource;
  storage_path: string;
  thumbnail_path: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  category: string | null;
  tags: string[] | null;
  mood: string | null;
  ai_prompt: string | null;
  ai_model: string | null;
  ai_refined_from: string | null;
  ai_description: string | null;
  ai_description_at: string | null;
  title: string | null;
  description: string | null;
  used_count: number;
  last_used_at: string | null;
  is_favorite: boolean;
  archived: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  brand_id: string;
  type: PostType;
  title: string | null;
  tone: string | null;
  caption: string | null;
  hashtags: string[] | null;
  first_comment: string | null;
  media_ids: string[] | null;
  platforms: Platform[];
  scheduled_at: string | null;
  published_at: string | null;
  status: PostStatus;
  error_message: string | null;
  week_plan_id: string | null;
  day_of_week: number | null;
  source_caption_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaptionHistoryEntry {
  id: string;
  brand_id: string;
  caption: string;
  hashtags: string[] | null;
  first_comment: string | null;
  topic: string | null;
  tone: string | null;
  length_category: string | null;
  variant_group: string | null;
  media_id: string | null;
  performance_score: number | null;
  used_in_post: string | null;
  is_favorite: boolean;
  created_at: string;
}

// NEW in v0.5: Voice modes — curated stylistic profiles
export interface VoiceMode {
  id: string;
  slug: string;
  label: string;
  emoji: string | null;
  description: string;
  platforms: Platform[];
  best_for: string | null;
  style_instructions: string;
  example_hook: string | null;
  example_structure: string | null;
  avoid: string | null;
  category: string;
  sort_order: number;
  active: boolean;
}

// NEW in v0.5: Inspiration library — reference posts from real world
export interface InspirationPost {
  id: string;
  brand_id: string | null;
  title: string | null;
  caption: string;
  platform: Platform | null;
  source_url: string | null;
  source_account: string | null;
  tags: string[] | null;
  notes: string | null;
  why_it_works: string | null;
  used_count: number;
  last_used_at: string | null;
  created_at: string;
}
