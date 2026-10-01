import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LayoutDashboard, Loader2 } from "lucide-react";
import { adminDashboard } from "@/lib/dashboard.functions";
import { formatAr } from "@/lib/billing.plans";
import { useAdminCode } from "@/hooks/use-admin-code";

export const Route = createFileRoute("/admin_/tableau")({
  head: () => ({
    meta: [
      { title: "Tabilao fitantanana — Isa sy vola miditra" },
      { name: "description", content: "Isan'ny mpianatra, fandoavam-bola miandry, vola miditra amin'ny Ariary ary fampiasana IA." },
      { property: "og:title", content: "Tabilao fitantanana — Isa sy vola miditra" },
      { property: "og:description", content: "Fijery ankapobeny ny sehatra fampiofanana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminTableau,
});

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-border p-4 ${accent ? "text-primary-foreground" : "bg-card"}`}
      style={{ boxShadow: "var(--shadow-card)", background: accent ? "var(--gradient-hero)" : undefined }}
    >
      <p className={`text-2xl font-bold ${accent ? "" : "text-primary"}`}>{value}</p>
      <p className={`text-xs ${accent ? "opacity-85" : "text-muted-foreground"}`}>{label}</p>
    </div>
  );
}

function AdminTableau() {
  const { code, ready } = useAdminCode();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: ready && !!code,
    queryFn: () => adminDashboard({ data: { adminCode: code! } }),
  });
  if (!ready) return null;
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-12 pt-5">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Fitantanana
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
          <LayoutDashboard className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tabilao ankapobeny</h1>
          <p className="text-sm text-muted-foreground">Mpianatra, vola miditra ary fampiasana</p>
        </div>
      </div>
      {!code ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Mila fidirana mpitantana. <Link to="/admin" className="font-medium text-primary">Ampidiro ny kaody</Link>
        </p>
      ) : isLoading || !data ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Vola miditra</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat accent label="Vola rehetra" value={formatAr(data.revenue)} />
            <Stat label="30 andro farany" value={formatAr(data.revenue30)} />
            <Stat label="Fandoavam-bola voamarina" value={data.approvedCount} />
            <Link to="/admin/paiements"><Stat label="Porofo miandry" value={data.pending} /></Link>
          </div>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Fampiasana</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Mpianatra" value={data.students} />
            <Stat label="Fanontaniana IA" value={data.aiQuestions} />
            <Stat label="Famakafakana vokatra" value={data.analyses} />
            <Stat label="Resaka IA" value={data.conversations} />
            <Stat label="Quiz natao" value={data.attempts} />
            <Stat label="Crédit sisa (rehetra)" value={data.creditsLeft} />
          </div>
        </>
      )}
    </main>
  );
}
