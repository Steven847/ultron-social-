import { Calendar } from "lucide-react";
import ComingSoon from "../coming-soon";

export default function SchedulePage() {
  return (
    <ComingSoon
      title="Planung"
      version="v0.4"
      icon={Calendar}
      description="Multi-Plattform Content-Kalender mit Wochenplanung"
      features={[
        "Visueller Wochenkalender für alle Marken",
        "Multi-Plattform: Instagram, Facebook, TikTok, LinkedIn",
        "Wochenpläne mit Themen-Vorgaben",
        "Auto-Generierung von Captions basierend auf Tagesmotto",
        "Drag-and-Drop Umplanen",
        "Posting-Zeit Optimierung pro Plattform",
      ]}
    />
  );
}
