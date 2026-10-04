import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Loader2, ShoppingCart, XCircle } from "lucide-react";
import { getMyOrders } from "@/lib/profile.functions";
import { formatAr } from "@/lib/billing.plans";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { PaywallDialog } from "@/components/PaywallDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/etudiant_/commandes")({
  head: () => ({
    meta: [
      { title: "Tantaran'ny fividianana — Sehatry mpianatra" },
      { name: "description", content: "Ny lisitry ny crédit novidinao sy ny satan'ny fandoavam-bola." },
      { property: "og:title", content: "Tantaran'ny fividianana — GMAMIKO33" },
      { property: "og:description", content: "Lisitry ny fividianana crédit hafatra IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Orders,
});

const STATUS = {
  pending: { label: "Miandry fanamarinana", icon: Clock, cls: "text-muted-foreground" },
  approved: { label: "Voamarina", icon: CheckCircle2, cls: "text-primary" },
  rejected: { label: "Nolavina", icon: XCircle, cls: "text-destructive" },
} as const;

function Orders() {
  const { name } = useStudentProfile();
  const [buy, setBuy] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["my-orders"], queryFn: () => getMyOrders() });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-10 pt-5">
      <Link to="/etudiant" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Sehatry mpianatra
      </Link>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tantaran'ny fividianana</h1>
        {name ? (
          <Button onClick={() => setBuy(true)}>
            <ShoppingCart className="mr-2 size-4" /> Hividy
          </Button>
        ) : null}
      </div>
      {name ? <PaywallDialog studentName={name} open={buy} onOpenChange={setBuy} /> : null}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-7 animate-spin text-primary" /></div>
      ) : error ? (
        <p className="text-sm text-destructive">Tsy afaka naka ny tantara. Midira aloha ao amin'ny sehatry mpianatra.</p>
      ) : !data?.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Mbola tsy nividy crédit ianao.
        </p>
      ) : (
        <ul className="grid gap-3">
          {data.map((o) => {
            const s = STATUS[o.status as keyof typeof STATUS] ?? STATUS.pending;
            const Icon = s.icon;
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{o.messages} hafatra</span>
                  <span className="font-bold text-primary">{formatAr(o.amount_ar)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</span>
                  <span className={`flex items-center gap-1 font-medium ${s.cls}`}><Icon className="size-3.5" /> {s.label}</span>
                </div>
                {o.admin_note ? <p className="mt-2 text-xs text-muted-foreground">Fanamarihana : {o.admin_note}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
