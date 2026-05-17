import { Settings } from "lucide-react";
import ComingSoon from "../coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Einstellungen"
      version="v0.6"
      icon={Settings}
      description="API-Keys, Plattform-Verbindungen und globale Konfiguration"
      features={[
        "API-Keys verwalten (Gemini, Meta, etc.)",
        "Plattform-Verbindungen pro Marke (Instagram, Facebook, TikTok, LinkedIn)",
        "OAuth-Flows für sicheres Token-Management",
        "Standardwerte für Posting-Zeiten",
        "Backup & Export der Daten",
        "Versionshinweise und Update-Status",
      ]}
    />
  );
}
