import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  version: string;
  icon: LucideIcon;
  description: string;
  features: string[];
}

export default function ComingSoon({ title, version, icon: Icon, description, features }: Props) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent mb-6">
            <Icon className="w-10 h-10 text-primary" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold mb-4">
            Geplant für {version}
          </div>

          <h2 className="text-2xl font-bold mb-3">Diese Funktion kommt bald</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            ULTRON wird in mehreren Versionen ausgebaut. Diese Funktion ist Teil von {version}.
          </p>

          <div className="text-left max-w-md mx-auto bg-muted/50 rounded-lg p-4">
            <div className="text-sm font-semibold mb-2">Was kommt:</div>
            <ul className="space-y-1.5">
              {features.map((f, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
