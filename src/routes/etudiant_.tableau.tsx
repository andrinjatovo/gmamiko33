import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, LayoutDashboard, Loader2, PackageSearch } from "lucide-react";
import { studentDashboard } from "@/lib/dashboard.functions";
import { useStudentProfile } from "@/hooks/use-student-profile";

export const Route = createFileRoute("/etudiant_/tableau")({
  head: () => ({
    meta: [
      { title: "Ny fandrosoako — Fanafarana Shina → Madagasikara" },
      { name: "description", content: "Araho ny crédit-nao, ny valin'ny quiz, ny famakafakana vokatra ary ny resaka farany tamin'ny mpanampy." },
      { property: "og:title", content: "Ny fandrosoako — Fanafarana Shina → Madagasikara" },
      { property: "og:description", content: "Tabilao fandrosoan'ny mpianatra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentTableau,
});

function StudentTableau() {
  const { name, ready } = useStudentProfile();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !name) navigate({ to: "/etudiant" });
  }, [ready, name, navigate]);
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard", name],
    enabled: ready && !!name,
    queryFn: () => studentDashboard({ data: { studentName: name! } }),
  });

  const stats = data
    ? [
        { label: "Crédit hafatra", value: data.credits > 0 ? data.credits : data.freeUsed ? 0 : "1 maimaim-poana" },
        { label: "Isa salan'ny quiz", value: `${data.quizPct}%` },
        { label: "Quiz natao", value: data.quizCount },
        { label: "Famakafakana", value: data.analysesCount },
      ]
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-5">
      <Link to="/etudiant" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Sehatry mpianatra
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
          <LayoutDashboard className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ny fandrosoako</h1>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
      </div>
      {isLoading || !data ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${data.quizPct}%` }} />
          </div>

          <h2 className="mb-2 mt-6 text-lg font-semibold">Resaka farany</h2>
          {data.lastConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Mbola tsy nisy.</p>
          ) : (
            data.lastConversations.map((c) => (
              <Link key={c.id} to="/etudiant/assistant/$conversationId" params={{ conversationId: c.id }}
                className="mb-2 flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
                <Bot className="size-4 text-primary" /> <span className="truncate">{c.title}</span>
              </Link>
            ))
          )}

          <h2 className="mb-2 mt-6 text-lg font-semibold">Famakafakana farany</h2>
          {data.lastAnalyses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Mbola tsy nisy.</p>
          ) : (
            data.lastAnalyses.map((a) => (
              <Link key={a.id} to="/etudiant/analyse"
                className="mb-2 flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
                <PackageSearch className="size-4 text-primary" /> <span className="truncate">{a.product_name}</span>
              </Link>
            ))
          )}
        </>
      )}
    </main>
  );
}
