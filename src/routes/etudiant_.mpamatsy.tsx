import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Globe, Loader2, MapPin, Search, ShieldCheck, ShieldAlert, ShieldQuestion, Store, Truck, Package, BookOpen } from "lucide-react";
import { searchSuppliers } from "@/lib/suppliers.functions";
import { getStudentSession } from "@/lib/student-auth.functions";
import { getDeviceHash } from "@/lib/device-id";
import { useLang } from "@/hooks/use-lang";
import { CreditBadge } from "@/components/CreditBadge";
import { PaywallDialog, isPaywallError } from "@/components/PaywallDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/etudiant_/mpamatsy")({
  head: () => ({
    meta: [
      { title: "Hitady mpamatsy — Sehatry mpianatra GMAMIKO33" },
      { name: "description", content: "Tadiavo ny mpamatsy, fivarotana na pejy — ao amin'ny base sy amin'ny Internet — ary azo ny fanombanana fahatokisana." },
      { property: "og:title", content: "Recherche fournisseurs — GMAMIKO33" },
      { property: "og:description", content: "Recherche intelligente de fournisseurs et boutiques, avec évaluation de fiabilité par l'IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplierSearch,
});

type Result = Awaited<ReturnType<typeof searchSuppliers>>;
type Card = Result["internal"][number];
type Scope = "all" | "local" | "foreign";

const KIND_ICON = { supplier: Store, forwarder: Truck, product: Package, knowledge: BookOpen, web: Globe } as const;

function ReliabilityBadge({ value }: { value: Card["reliability"] }) {
  const { t } = useLang();
  if (!value) return null;
  const map = {
    tres_fiable: { icon: ShieldCheck, label: t("AZO ITOKIANA TSARA", "TRÈS FIABLE"), cls: "text-mada" },
    a_verifier: { icon: ShieldQuestion, label: t("HAMARININA", "À VÉRIFIER"), cls: "text-primary" },
    risque: { icon: ShieldAlert, label: t("MISY LOZA", "RISQUE ÉLEVÉ"), cls: "text-china" },
    non_verifie: { icon: ShieldQuestion, label: t("TSY VOAMARINA", "NON VÉRIFIÉ"), cls: "text-muted-foreground" },
  } as const;
  const { icon: Icon, label, cls } = map[value];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${cls}`}>
      <Icon className="size-3.5" /> {label}
    </span>
  );
}

function SupplierSearch() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [paywall, setPaywall] = useState(false);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [result, setResult] = useState<Result | null>(null);
  const [sel, setSel] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getStudentSession({ data: { deviceHash: getDeviceHash() } })
      .then((p) => setMe(p.display_name))
      .catch(() => setMe(null))
      .finally(() => setMeLoading(false));
  }, []);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!me || q.trim().length < 2 || busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await searchSuppliers({ data: { studentName: me, query: q, scope } });
      setResult(r);
      qc.invalidateQueries({ queryKey: ["my-account", me] });
    } catch (x) {
      if (isPaywallError(x)) setPaywall(true);
      else setErr(x instanceof Error ? x.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const scopes: { id: Scope; label: string }[] = [
    { id: "all", label: t("Rehetra", "Tous") },
    { id: "local", label: t("Eto Madagasikara", "Locaux") },
    { id: "foreign", label: t("Any ivelany", "Étrangers") },
  ];

  const renderCard = (c: Card) => {
    const Icon = KIND_ICON[c.kind];
    return (
      <button
        key={c.ref}
        onClick={() => setSel(c)}
        className="pressable w-full rounded-2xl border border-border bg-card p-3.5 text-left"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{c.name}</p>
            {c.subtitle && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.subtitle}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <ReliabilityBadge value={c.reliability} />
              {c.location && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="size-3" /> {c.location}
                </span>
              )}
              {c.platform && <span className="text-[11px] text-muted-foreground">{c.platform}</span>}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-5">
      <div className="flex items-center justify-between">
        <Link to="/etudiant" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> {t("Miverina", "Retour")}
        </Link>
        {me && <CreditBadge studentName={me} onClick={() => setPaywall(true)} />}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
          <Store className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("Hitady mpamatsy", "Recherche fournisseurs")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Fivarotana, pejy Facebook/Instagram na vokatra — soraty fotsiny ny anarany.", "Boutique, page Facebook/Instagram ou produit — écrivez simplement son nom.")}
          </p>
        </div>
      </div>

      <form onSubmit={run} className="mt-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="bg-card pl-9"
            placeholder={t("Ohatra : kiraro, boutique Anosy, 1688 shoes…", "Ex : chaussures, boutique Anosy, 1688 shoes…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {scopes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className={`pressable flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${
                scope === s.id ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button className="w-full" disabled={busy || meLoading || !me || q.trim().length < 2}>
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
          {t("Tadiavo (1 crédit)", "Rechercher (1 crédit)")}
        </Button>
      </form>

      {err && <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}

      {result && (
        <div className="mt-6 space-y-6">
          {result.globalAdvice && (
            <section className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("Toro-hevitry ny IA", "Conseil de l'IA")}</p>
              <p className="mt-1.5 text-sm leading-relaxed">{result.globalAdvice}</p>
            </section>
          )}

          <section>
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("Ao amin'ny base anatiny", "Dans la base interne")} ({result.internal.length})
            </h2>
            {result.internal.length ? (
              <div className="space-y-2">{result.internal.map(renderCard)}</div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                {t("Tsy misy hita ao amin'ny base.", "Aucun résultat dans la base.")}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("Amin'ny Internet", "Sur Internet")} ({result.external.length})
            </h2>
            {result.externalBlocked && (
              <p className="mb-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">{result.externalBlocked}</p>
            )}
            {result.external.length > 0 && <div className="space-y-2">{result.external.map(renderCard)}</div>}
          </section>
        </div>
      )}

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6">{sel?.name}</DialogTitle>
          </DialogHeader>
          {sel && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <ReliabilityBadge value={sel.reliability} />
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">{sel.source}</span>
              </div>
              {sel.subtitle && <p className="text-muted-foreground">{sel.subtitle}</p>}
              {sel.location && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4" /> {sel.location}
                </p>
              )}
              {sel.platform && <p><span className="font-semibold">{t("Sehatra", "Plateforme")} :</span> {sel.platform}</p>}
              {sel.notes && <p className="whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-muted-foreground">{sel.notes}</p>}
              {sel.why && (
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("Nahoana ?", "Pourquoi ?")}</p>
                  <p className="mt-1">{sel.why}</p>
                </div>
              )}
              {sel.advice && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("Toro-hevitra", "Conseil")}</p>
                  <p className="mt-1">{sel.advice}</p>
                </div>
              )}
              {sel.url && (
                <a href={sel.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-primary underline">
                  {t("Sokafy ny rohy", "Ouvrir le lien")} <ExternalLink className="size-4" />
                </a>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Tsy misy antoka 100% : hamarino foana ny fepetra fandoavana sy fandefasana alohan'ny handoavana vola.",
                  "Aucune garantie à 100 % : vérifiez toujours les conditions de paiement et de livraison avant de payer.",
                )}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {me && <PaywallDialog studentName={me} open={paywall} onOpenChange={setPaywall} />}
    </main>
  );
}
