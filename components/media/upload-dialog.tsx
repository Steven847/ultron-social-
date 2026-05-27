"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui-dialog";
import { Upload, X, Camera, ImageIcon, Loader2 } from "lucide-react";

interface Props {
  brandId: string;
  trigger?: React.ReactNode;
}

const MAX_FILE_SIZE_MB = 100;

export default function UploadDialog({ brandId, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setTags("");
    setError(null);
    setProgress(0);
    setUploading(false);
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    setError(null);

    // Size check (frontend)
    const sizeMB = selectedFile.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setError(`Datei ist ${sizeMB.toFixed(1)} MB groß. Maximum ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setFile(selectedFile);

    // Generate preview if it's an image
    if (selectedFile.type.startsWith("image/") && selectedFile.type !== "image/heic") {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.onerror = () => setPreview(null);
      try {
        reader.readAsDataURL(selectedFile);
      } catch {
        setPreview(null);
      }
    } else {
      // No preview for HEIC or unknown formats - show file info
      setPreview(null);
    }

    // Auto-fill title from filename
    if (!title) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Bitte Datei auswählen");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("brandId", brandId);
      if (title) formData.append("title", title);
      if (tags) formData.append("tags", tags);

      // Detect type for hint to backend
      if (file.type.startsWith("video/")) {
        formData.append("type", "video");
      } else if (file.type.startsWith("image/")) {
        formData.append("type", "image");
      }

      setProgress(30);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload fehlgeschlagen");
      }

      setProgress(100);

      // Brief success feedback before closing
      setTimeout(() => {
        reset();
        setOpen(false);
        router.refresh();
      }, 800);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Unbekannter Fehler beim Upload");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o && !uploading) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foto / Video hochladen</DialogTitle>
          <DialogDescription>
            JPG, PNG, WebP, HEIC, MP4, MOV — bis {MAX_FILE_SIZE_MB} MB
          </DialogDescription>
        </DialogHeader>

        {/* Upload progress overlay */}
        {uploading && (
          <div className="space-y-3 bg-accent/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium">
                {progress < 30 && "Vorbereiten..."}
                {progress >= 30 && progress < 80 && "Lade hoch..."}
                {progress >= 80 && progress < 100 && "Fast fertig..."}
                {progress === 100 && "✓ Fertig!"}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {!uploading && (
          <div className="space-y-4">
            {/* File picker — two options on mobile */}
            {!file && (
              <div className="space-y-2">
                {/* Mobile: Camera + Library buttons. Desktop: just file picker */}
                <div className="grid grid-cols-2 gap-2 lg:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-24 flex-col gap-2"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs">Foto machen</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 flex-col gap-2"
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs">Aus Galerie</span>
                  </Button>
                </div>

                {/* Desktop: drop zone */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="hidden lg:flex w-full h-40 border-2 border-dashed rounded-lg flex-col items-center justify-center gap-2 hover:border-primary hover:bg-accent/30 transition-colors text-muted-foreground"
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">Datei auswählen</span>
                  <span className="text-xs">JPG, PNG, MP4, MOV, HEIC...</span>
                </button>

                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.heic,.heif"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            )}

            {/* Selected file preview */}
            {file && (
              <div className="space-y-2">
                <div className="border rounded-lg p-3 bg-accent/20">
                  <div className="flex items-start gap-3">
                    {preview ? (
                      <img
                        src={preview}
                        alt=""
                        className="w-20 h-20 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded flex items-center justify-center shrink-0">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                        {file.type && ` · ${file.type}`}
                      </div>
                      {!preview && file.type.startsWith("image/") && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          (Keine Vorschau für dieses Format, Upload klappt trotzdem)
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                      className="h-10 w-10 p-0 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Titel</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Optional"
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tags (kommagetrennt)</Label>
                    <Input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="z.B. logo, produkt, hero"
                      className="h-11 text-base"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <div className="font-medium">Fehler:</div>
                <div>{error}</div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={uploading}
              >
                Abbrechen
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                <Upload className="w-4 h-4" />
                Hochladen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
