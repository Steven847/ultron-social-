// lib/job-tracker.ts — Helper for tracking long-running generation jobs
// v0.4.4-fix: Added logo-overlay phase to plain "image" type (not just hybrid)

import { getServerClient } from "@/lib/supabase";

export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobType = "image" | "video" | "video-i2v" | "image-hybrid" | "refine-image" | "refine-video";

export interface JobPhase {
  phase: string;
  message: string;
  percent: number;
}

export const PHASES: Record<JobType, JobPhase[]> = {
  image: [
    { phase: "init", message: "Vorbereitung...", percent: 5 },
    { phase: "generating", message: "Nano Banana 2 erstellt das Bild...", percent: 30 },
    { phase: "logo-overlay", message: "Logo-Overlay wird eingefügt...", percent: 75 }, // ← NEW
    { phase: "uploading", message: "Speichere in der Bibliothek...", percent: 90 },
    { phase: "saving", message: "Letzte Schritte...", percent: 97 },
  ],
  "image-hybrid": [
    { phase: "init", message: "Lade Referenz-Bilder...", percent: 5 },
    { phase: "loading-refs", message: "Verarbeite Referenz-Bilder...", percent: 15 },
    { phase: "generating", message: "Nano Banana 2 kombiniert die Bilder...", percent: 35 },
    { phase: "logo-overlay", message: "Logo-Overlay wird eingefügt...", percent: 80 },
    { phase: "uploading", message: "Speichere in der Bibliothek...", percent: 90 },
    { phase: "saving", message: "Letzte Schritte...", percent: 97 },
  ],
  video: [
    { phase: "init", message: "Vorbereitung...", percent: 3 },
    { phase: "submitting", message: "Sende Job an Veo 2...", percent: 8 },
    { phase: "rendering", message: "Veo 2 rendert das Video... (typisch 60-180 Sek)", percent: 50 },
    { phase: "downloading", message: "Lade fertiges Video herunter...", percent: 85 },
    { phase: "uploading", message: "Speichere in der Bibliothek...", percent: 95 },
    { phase: "saving", message: "Letzte Schritte...", percent: 98 },
  ],
  "video-i2v": [
    { phase: "init", message: "Vorbereitung...", percent: 3 },
    { phase: "loading-image", message: "Lade Start-Bild...", percent: 10 },
    { phase: "submitting", message: "Sende Image-to-Video Job an Veo 2...", percent: 15 },
    { phase: "rendering", message: "Veo 2 animiert dein Bild... (typisch 60-180 Sek)", percent: 55 },
    { phase: "downloading", message: "Lade fertiges Video herunter...", percent: 85 },
    { phase: "uploading", message: "Speichere in der Bibliothek...", percent: 95 },
    { phase: "saving", message: "Letzte Schritte...", percent: 98 },
  ],
  "refine-image": [
    { phase: "init", message: "Lade Original-Bild...", percent: 5 },
    { phase: "generating", message: "Nano Banana 2 verfeinert das Bild...", percent: 35 },
    { phase: "uploading", message: "Speichere in der Bibliothek...", percent: 90 },
    { phase: "saving", message: "Letzte Schritte...", percent: 97 },
  ],
  "refine-video": [
    { phase: "init", message: "Vorbereitung...", percent: 3 },
    { phase: "submitting", message: "Sende neuen Job an Veo 2...", percent: 10 },
    { phase: "rendering", message: "Veo 2 erstellt neue Version... (typisch 60-180 Sek)", percent: 55 },
    { phase: "downloading", message: "Lade Video herunter...", percent: 85 },
    { phase: "uploading", message: "Speichere in der Bibliothek...", percent: 95 },
  ],
};

export async function createJob(
  brandId: string,
  jobType: JobType,
  metadata?: any
): Promise<string> {
  const supabase = getServerClient();
  const firstPhase = PHASES[jobType][0];
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({
      brand_id: brandId,
      job_type: jobType,
      status: "running",
      phase: firstPhase.phase,
      phase_message: firstPhase.message,
      progress_percent: firstPhase.percent,
      metadata: metadata || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[job-tracker] Failed to create job:", error.message);
    throw error;
  }
  return data.id;
}

export async function updateJobPhase(
  jobId: string,
  jobType: JobType,
  phaseName: string
): Promise<void> {
  const phase = PHASES[jobType].find((p) => p.phase === phaseName);
  if (!phase) {
    console.warn(`[job-tracker] Unknown phase '${phaseName}' for type '${jobType}'`);
    return;
  }
  const supabase = getServerClient();
  await supabase
    .from("generation_jobs")
    .update({
      phase: phase.phase,
      phase_message: phase.message,
      progress_percent: phase.percent,
    })
    .eq("id", jobId);
}

export async function completeJob(jobId: string, resultMediaId: string): Promise<void> {
  const supabase = getServerClient();
  await supabase
    .from("generation_jobs")
    .update({
      status: "completed",
      phase: "done",
      phase_message: "Fertig!",
      progress_percent: 100,
      result_media_id: resultMediaId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = getServerClient();
  await supabase
    .from("generation_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
