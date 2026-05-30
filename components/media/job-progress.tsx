"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface JobProgressProps {
  jobId: string | null;
  jobType: "image" | "video" | "video-i2v" | "image-hybrid" | "refine-image" | "refine-video";
  onComplete?: (resultMediaId: string) => void;
  onError?: (error: string) => void;
}

interface JobStatus {
  status: "pending" | "running" | "completed" | "failed";
  phase: string | null;
  phase_message: string | null;
  progress_percent: number;
  error_message: string | null;
  result_media_id: string | null;
  started_at?: string;
}

// Expected duration in seconds for ETA hint (typical, not exact)
const EXPECTED_DURATION_SEC: Record<JobProgressProps["jobType"], { min: number; typical: number; max: number; label: string }> = {
  image: { min: 5, typical: 12, max: 25, label: "5-25 Sek" },
  "image-hybrid": { min: 8, typical: 18, max: 35, label: "8-35 Sek" },
  video: { min: 60, typical: 120, max: 240, label: "1-3 Min" },
  "video-i2v": { min: 60, typical: 120, max: 240, label: "1-3 Min" },
  "refine-image": { min: 5, typical: 12, max: 25, label: "5-25 Sek" },
  "refine-video": { min: 60, typical: 120, max: 240, label: "1-3 Min" },
};

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${mins}m ${secs}s`;
}

export default function JobProgress({ jobId, jobType, onComplete, onError }: JobProgressProps) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<number>(Date.now());
  const onCompleteCalledRef = useRef(false);
  const onErrorCalledRef = useRef(false);

  // Stopwatch — updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Polling — every 1.5 seconds while running
  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data: JobStatus = await res.json();
        if (cancelled) return;
        setJob(data);

        if (data.status === "completed" && data.result_media_id && !onCompleteCalledRef.current) {
          onCompleteCalledRef.current = true;
          onComplete?.(data.result_media_id);
        } else if (data.status === "failed" && data.error_message && !onErrorCalledRef.current) {
          onErrorCalledRef.current = true;
          onError?.(data.error_message);
        }
      } catch (err) {
        // Polling errors are okay — keep trying
      }
    };

    poll(); // immediate first call
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, onComplete, onError]);

  if (!jobId) return null;

  const expected = EXPECTED_DURATION_SEC[jobType];
  const overTime = elapsedSec > expected.max;
  const nearMax = elapsedSec > expected.typical;

  // Use the server-reported progress, but also "creep" it slowly between phases
  // so the bar feels alive even when no phase transition is happening
  const serverProgress = job?.progress_percent || 0;
  const isFinished = job?.status === "completed" || job?.status === "failed";
  const displayProgress = Math.min(serverProgress, 99);

  return (
    <div className="space-y-3 bg-accent/30 rounded-lg p-4 border">
      {/* Status header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {job?.status === "completed" ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          ) : job?.status === "failed" ? (
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          ) : (
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
          )}
          <div className="text-sm font-medium break-words min-w-0">
            {job?.phase_message || "Starte..."}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span className="font-mono">{formatElapsed(elapsedSec)}</span>
          <span className="text-[10px] opacity-60">/ ~{expected.label}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              job?.status === "failed"
                ? "bg-destructive"
                : job?.status === "completed"
                ? "bg-green-600"
                : "bg-primary"
            }`}
            style={{ width: `${isFinished ? 100 : displayProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{job?.phase || "init"}</span>
          <span className="font-mono">{isFinished ? 100 : displayProgress}%</span>
        </div>
      </div>

      {/* ETA hint */}
      {!isFinished && (
        <div className="text-[11px] text-muted-foreground">
          {nearMax && !overTime && (
            <span>⏳ Dauert manchmal länger als typisch, das ist normal</span>
          )}
          {overTime && (
            <span className="text-amber-600 dark:text-amber-500">
              ⚠️ Dauert länger als üblich — gleich da, oder API hat Last
            </span>
          )}
          {!nearMax && (
            <span>
              ℹ️ {jobType.startsWith("video") || jobType === "refine-video"
                ? "Veo 3.1 liefert keinen Echtzeit-Fortschritt — der Balken ist eine Schätzung"
                : "Generierung läuft im Hintergrund"}
            </span>
          )}
        </div>
      )}

      {/* Error display */}
      {job?.status === "failed" && job.error_message && (
        <div className="text-xs text-destructive bg-destructive/10 rounded p-2 mt-2">
          {job.error_message}
        </div>
      )}
    </div>
  );
}
