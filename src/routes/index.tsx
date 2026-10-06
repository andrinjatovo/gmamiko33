import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, GraduationCap, PackageSearch, ShieldCheck, Ship, Sparkles } from "lucide-react";
import heroAsset from "@/assets/gma-miko-hero.png.asset.json";

const DESCRIPTION =
  "Sehatra fampiofanana amin'ny fanafarana Shina → Madagasikara : kojia, mpanampy IA manam-pahaizana manokana, fanadinana, famakafakana vokatra ary vondrona.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GMAMIKO33 — Fampiofanana Fanafarana Shina → Madagasikara" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "GMAMIKO33 — Fampiofanana Fanafarana Shina → Madagasikara" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Accueil,
});

function Accueil() {
  return (
    <main className="min-h-screen overflow-hidden pb-12">
      <section
        aria-label="Présentation de GMAMIKO33"
        className="relative isolate aspect-[720/295] w-full overflow-hidden bg-card"
      >
        <img
          src={heroAsset.url}
          alt="GMAMIKO33 — fampiofanana sy fanampiana amin'ny fanafarana avy any Shina ho any Madagasikara"
          className="absolute inset-0 size-full object-cover"
        />
      </section>

      <div className="relative mx-auto w-full max-w-sm px-5 pt-8">
        <div
          className="flex size-20 items-center justify-center rounded-[1.75rem] text-primary-foreground"
          style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
        >
          <Ship className="size-10" />
        </div>

        <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Mpanampy IA manam-pahaizana manokana
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-foreground">
          Fanafarana Shina
          <span className="block text-primary">→ Madagasikara</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Fampiofanana feno, mpanampy IA, famakafakana vokatra, fanadinana ary vondrona — ao amin'ny
          rindrankaja iray monja.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { icon: Bot, label: "Mpanampy IA" },
            { icon: PackageSearch, label: "Famakafakana vokatra" },
            { icon: GraduationCap, label: "Fanadinana" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-3 text-center"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <Icon className="size-5 text-primary" />
              <span className="text-[11px] font-medium leading-tight text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3">
          <Link
            to="/etudiant"
            className="flex items-center gap-4 rounded-3xl px-5 py-5 text-primary-foreground transition-transform active:scale-[0.98]"
            style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
          >
            <GraduationCap className="size-7 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold text-foreground">Sehatry mpianatra</span>
              <span className="block text-sm font-medium text-foreground/95">Kojia, IA, fanadinana ary vondrona</span>
            </span>
            <ArrowRight className="size-5 shrink-0 opacity-80" />
          </Link>
          <Link
            to="/admin"
            className="flex items-center gap-4 rounded-3xl border border-border bg-card px-5 py-5 text-foreground transition-transform active:scale-[0.98]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <ShieldCheck className="size-7 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold">Mpitantana</span>
              <span className="block text-sm text-muted-foreground">Mamorona sy mitantana ny votoaty</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </main>
  );
}
