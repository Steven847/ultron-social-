// lib/types.ts - TypeScript types matching the Supabase schema

export type Platform = "instagram" | "facebook" | "tiktok" | "linkedin";
export type MediaType = "image" | "video";
export type MediaSource = "upload" | "ai_generated" | "hybrid";
export type PostType = "post" | "story" | "reel" | "carousel";
export type PostStatus = "draft" | "scheduled" | "published" | "failed" | "archived";

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

export interface SocialAccount {
  id: string;
  brand_id: string;
  platform: Platform;
  account_handle: string;
  account_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  followers_count: number | null;
  active: boolean;
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
  created_at: string;
  updated_at: string;
}

export interface WeekPlan {
  id: string;
  brand_id: string;
  week_start_date: string;
  theme: string | null;
  notes: string | null;
  status: "draft" | "active" | "completed" | "archived";
  created_at: string;
}
