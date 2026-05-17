"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui-dialog";
import { Upload, FileImage, Film } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface Props {
  brandId: string;
  trigger?: React.ReactNode;
}

export default function UploadDialog({ brandId, trigger }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [mood, setMood] = useState("");

  const reset = () => {
    setFiles([]);
    setTitle("");
    setTags("");
    setCategory("");
    setMood("");
    setError(null);
    setProgress(null);
  };

  const handleFilesPicked = (picked: FileList | null) => {
    if (!picked) return;
    setFiles(Array.from(picked));
    setError(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress({ current: i + 1, total: files.length, name: f.name });

        const formData = new FormData();
        formData.append("file", f);
        formData.append("brandId", brandId);
        if (files.length === 1 && title) formData.append("title", title);
        if (tags) formData.append("tags", tags);
        if (category) formData.append("category", category);
        if (mood) formData.append("mood", mood);

        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="w-4 h-4" />
            Hochladen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Medien hochladen</DialogTitle>
          <DialogDescription>
            Bilder oder Videos auswählen. Mehrfachauswahl möglich. Max 100 MB pro Datei.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker / drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("border-primary", "bg-accent/30");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("border-primary", "bg-accent/30");
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-primary", "bg-accent/30");
              handleFilesPicked(e.dataTransfer.files);
            }}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFilesPicked(e.target.files)}
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">Dateien hier ablegen oder klicken</div>
            <div className="text-xs text-muted-foreground mt-1">Bilder + Videos, max 100 MB</div>
          </div>

          {/* Picked files preview */}
          {files.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {f.type.startsWith("image/") ? (
                    <FileImage className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Film className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            {files.length === 1 && (
              <div className="col-span-2 space-y-1">
                <Label htmlFor="up-title" className="text-xs">
                  Titel (optional)
                </Label>
                <Input
                  id="up-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={files[0]?.name}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="up-cat" className="text-xs">
                Kategorie
              </Label>
              <Input
                id="up-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="z.B. Produkt, Team, Natur"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="up-mood" className="text-xs">
                Stimmung
              </Label>
              <Input
                id="up-mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="z.B. fröhlich, seriös"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="up-tags" className="text-xs">
                Tags (kommagetrennt)
              </Label>
              <Input
                id="up-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="z.B. brokkoli, alpen, sonnenuntergang"
              />
            </div>
          </div>

          {progress && (
            <div className="text-xs text-muted-foreground bg-accent/30 rounded-md p-2">
              Lade {progress.current}/{progress.total}: {progress.name}
            </div>
          )}
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
              Abbrechen
            </Button>
            <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
              {uploading ? `Lade ${progress?.current}/${progress?.total}...` : `${files.length || "Keine"} Datei(en) hochladen`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
