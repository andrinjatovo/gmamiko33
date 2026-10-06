import { useLang } from "@/hooks/use-lang";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, GraduationCap, Home, UserRound, Wrench } from "lucide-react";

const ITEMS = [
  { to: "/etudiant", label: "Fandraisana", fr: "Accueil", icon: Home, match: (p: string) => p === "/etudiant" },
  { to: "/etudiant/analyse", label: "Fitaovana", fr: "Outils", icon: Wrench, match: (p: string) => p.startsWith("/etudiant/analyse") || p.startsWith("/etudiant/tableau") || p.startsWith("/etudiant/commandes") },
  { to: "/etudiant/quiz", label: "Fampiofanana", fr: "Formation", icon: GraduationCap, match: (p: string) => p.startsWith("/etudiant/quiz") || p.startsWith("/etudiant/messages") || p.startsWith("/etudiant/fahaizana") },
  { to: "/etudiant/assistant", label: "Mpanampy", fr: "Assistant", icon: Bot, match: (p: string) => p.startsWith("/etudiant/assistant") },
  { to: "/etudiant/profil", label: "Profil", fr: "Profil", icon: UserRound, match: (p: string) => p.startsWith("/etudiant/profil") },
] as const;

/** Navigation fixe en bas, uniquement dans l'espace étudiant. */
export function StudentBottomNav() {
  const { lang } = useLang();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!path.startsWith("/etudiant")) return null;
  // La conversation a sa propre zone de saisie en bas.
  if (/^\/etudiant\/assistant\/.+/.test(path)) return null;
  return (
    <>
      <div className="h-20" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {ITEMS.map(({ to, label, fr, icon: Icon, match }) => {
            const active = match(path);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`pressable flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-primary/15" : ""}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="truncate">{lang === "fr" ? fr : label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
