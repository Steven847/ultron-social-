"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

interface Props {
  brandId: string;
  brandSlug: string;
  currentLogo: string | null;
  brandName: string;
  primaryColor: string;
}

export default function LogoUploader({ brandId, brandSlug, currentLogo, brandName, primaryColor }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logo, setLogo] = useState(currentLogo);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("brandId", brandId);
      formData.append("type", "logo");

      const res = await fetch("/api/upload/logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");

      setLogo(data.url);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      {logo ? (
        <img src={logo} alt={brandName} className="w-20 h-20 rounded-lg object-cover border" />
      ) : (
        <div
          className="w-20 h-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
          style={{ background: primaryColor }}
        >
          {brandName.charAt(0)}
        </div>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white disabled:opacity-50"
        title="Logo hochladen"
      >
        {uploading ? (
          <div className="text-xs">...</div>
        ) : (
          <Upload className="w-6 h-6" />
        )}
      </button>
      {error && <div className="absolute top-full mt-2 left-0 text-xs text-destructive whitespace-nowrap">{error}</div>}
    </div>
  );
}
