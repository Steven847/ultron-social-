import { Image as ImageIcon } from "lucide-react";
import ComingSoon from "../coming-soon";

export default function MediaPage() {
  return (
    <ComingSoon
      title="Medien"
      version="v0.2"
      icon={ImageIcon}
      description="Deine zentrale Bibliothek für Bilder, Videos und KI-generierten Content"
      features={[
        "Drag-and-Drop Upload für echte Fotos und Videos",
        "KI-Bild-Generierung mit Gemini (Nano Banana 2)",
        "KI-Video-Generierung mit Veo 2",
        "Hybrid-Mixer: echte Fotos mit KI-Hintergründen kombinieren",
        "Tagging, Kategorisierung und Smart-Suche",
        "Wiederverwendung in mehreren Posts",
      ]}
    />
  );
}
