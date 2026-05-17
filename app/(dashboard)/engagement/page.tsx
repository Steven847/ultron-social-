import { MessageSquare } from "lucide-react";
import ComingSoon from "../coming-soon";

export default function EngagementPage() {
  return (
    <ComingSoon
      title="Engagement"
      version="v0.5"
      icon={MessageSquare}
      description="Hashtag-Monitoring, Kommentar-Vorschläge und Community-Wachstum"
      features={[
        "Hashtag-Suche mit relevanten Posts pro Marke",
        "KI-generierte Kommentar-Vorschläge (3 Stile pro Post)",
        "Profil-Empfehlungen: Wem sollte deine Marke folgen",
        "Hashtag-Empfehlungen kuratiert pro Marke",
        "Comment-to-DM Automation (via ManyChat-Integration)",
        "Engagement-Statistiken pro Marke",
      ]}
    />
  );
}
