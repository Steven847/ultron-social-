import Link from "next/link";
import { LayoutDashboard, Briefcase, Image, Calendar, MessageSquare, Settings } from "lucide-react";

const navigation = [
  { name: "Übersicht", href: "/", icon: LayoutDashboard, ready: true },
  { name: "Marken", href: "/brands", icon: Briefcase, ready: true },
  { name: "Medien", href: "/media", icon: Image, ready: true },
  { name: "Planung", href: "/schedule", icon: Calendar, ready: false, version: "v0.4" },
  { name: "Engagement", href: "/engagement", icon: MessageSquare, ready: false, version: "v0.5" },
  { name: "Einstellungen", href: "/settings", icon: Settings, ready: false, version: "v0.6" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-64 flex-col bg-card border-r">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">U</span>
            </div>
            <div>
              <div className="font-bold text-lg leading-none">ULTRON</div>
              <div className="text-xs text-muted-foreground mt-1">Social Command</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.name}
              </div>
              {!item.ready && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">{item.version}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t text-xs text-muted-foreground">v0.2.0 — Content Studio</div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
