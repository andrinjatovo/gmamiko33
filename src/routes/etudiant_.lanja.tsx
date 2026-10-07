import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Plane, Search, Ship, Sparkles } from "lucide-react";
import { searchWeight, estimateWeight } from "@/lib/weight.functions";
import { useLang } from "@/hooks/use-lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/etudiant_/lanja")({
  head: () => ({
    meta: [
      { title: "Lanja & Volume — Sehatry mpianatra GMAMIKO33" },
      { name: "description", content: "Tadiavo ny lanja (fiaramanidina) sy ny volume (sambo) an'ny vokatra avy any Chine." },
      { property: "og:title", content: "Recherche Poids & Volume — GMAMIKO33" },
      { property: "og:description", content: "Poids avion et volume maritime des produits importés de Chine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WeightSearch,
});

type Result = Awaited<ReturnType<typeof searchWeight>>[number];
type Est = Awaited<ReturnType<typeof estimateWeight>>;

const fmt = (n: number, d = 2) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });

function Status({ kind }: { kind: "real" | "est" | "none" }) {
  const { t } = useLang();
  const map = {
    real: ["✅", t("MARINA / VOAMARINA", "RÉEL / VÉRIFIÉ"), "text-mada"],
    est: ["⚠️", t("VINAVINA IA", "ESTIMATION IA"), "text-primary"],
    none: ["❌", t("TSY MISY", "NON DISPONIBLE"), "text-muted-foreground"],
  } as const;
  const [i, l, c] = map[kind];
  return <span className={`text-xs font-bold ${c}`}>{i} {l}</span>;
}

function Block({ air, real, est, onEstimate, loading }: { air: boolean; real: Result | null; est: Est | null; onEstimate: () => void; loading: boolean }) {
  const { t } = useLang();
  const realVal = air ? real?.weightKg : real?.volumeCm3;
  const estVal = air ? est?.weightKg : est?.volumeCm3;
  const Icon = air ? Plane : Ship;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        <Icon className="size-5 text-primary" />
        {air ? t("FIARAMANIDINA — LANJA (KG)", "AVION — POIDS (KG)") : t("SAMBO — VOLUME (CM³ / M³)", "MARITIME — VOLUME (CM³ / M³)")}
      </h3>
      {realVal != null ? (
        <div className="space-y-1">
          <Status kind="real" />
          <p className="text-2xl font-bold">
            {air ? `${fmt(realVal)} kg` : `${fmt(realVal, 0)} cm³ · ${fmt(realVal / 1e6, 4)} m³`}
          </p>
          {!air && real?.dims && <p className="text-sm text-muted-foreground">{real.dims.l} × {real.dims.w} × {real.dims.h} cm</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <Status kind={estVal != null ? "est" : "none"} />
          <p className="text-sm text-muted-foreground">
            {t("Tsy misy angona marina ao amin'ny base de connaissances.", "Donnée réelle non disponible dans la base de connaissances.")}
          </p>
          {!air && real?.dimensionsText && <p className="text-sm">{t("Habe voasoratra", "Dimensions notées")} : {real.dimensionsText}</p>}
          {estVal != null ? (
            <p className="rounded-lg bg-primary/10 p-2 text-sm font-semibold text-primary">
              {t("VINAVINA IA", "ESTIMATION IA")} : {air ? `${t("eo ho eo", "environ")} ${fmt(estVal)} kg` : `${t("eo ho eo", "environ")} ${fmt(estVal, 0)} cm³ / ${fmt(estVal / 1e6, 4)} m³`}
              {!air && est?.dims && <span className="block font-normal">{est.dims.l} × {est.dims.w} × {est.dims.h} cm</span>}
            </p>
          ) : (
            <Button size="sm" variant="secondary" onClick={onEstimate} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {t("Angataho vinavina IA", "Demander une estimation IA")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function WeightSearch() {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [sel, setSel] = useState<Result | null>(null);
  const [est, setEst] = useState<Est | null>(null);
  const [busy, setBusy] = useState(false);
  const [estBusy, setEstBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setErr(""); setEst(null);
    try {
      const r = await searchWeight({ data: { query: q } });
      setResults(r); setSel(r[0] ?? null);
    } catch (x) { setErr(x instanceof Error ? x.message : "Erreur"); }
    finally { setBusy(false); }
  };

  const estimate = async () => {
    setEstBusy(true); setErr("");
    try { setEst(await estimateWeight({ data: { product: sel?.name ?? q } })); }
    catch (x) { setErr(x instanceof Error ? x.message : "Erreur"); }
    finally { setEstBusy(false); }
  };

  const searched = results !== null;
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-28 pt-5">
      <Link to="/etudiant" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> {t("Sehatry mpianatra", "Espace étudiant")}
      </Link>
      <h1 className="text-2xl font-bold">{t("Lanja & Volume", "Poids & Volume")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("Soraty amin'ny malagasy, frantsay, anglisy, sinoa na anarana Pinduoduo/1688/Taobao/SHEIN.", "Écrivez en malgache, français, anglais, chinois ou le nom Pinduoduo/1688/Taobao/SHEIN.")}
      </p>
      <form onSubmit={run} className="mb-5 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="kiraro, shoes, chaussures, 女鞋…" />
        <Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}</Button>
      </form>
      {err && <p className="mb-3 text-sm text-destructive">{err}</p>}

      {searched && results.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {results.map((r) => (
            <button key={r.id} onClick={() => { setSel(r); setEst(null); }}
              className={`pressable rounded-full border px-3 py-1 text-sm ${sel?.id === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              {r.name}
            </button>
          ))}
        </div>
      )}

      {searched && (
        <>
          <div className="mb-3">
            {sel ? (
              <>
                <h2 className="text-lg font-semibold">{sel.name}</h2>
                {sel.names.length > 0 && <p className="text-xs text-muted-foreground">{sel.names.join(" · ")}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(`Tsy hita ao amin'ny base ny « ${q} ». Azonao angatahina vinavina IA.`, `« ${q} » introuvable dans la base. Vous pouvez demander une estimation IA.`)}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Block air real={sel} est={est} onEstimate={estimate} loading={estBusy} />
            <Block air={false} real={sel} est={est} onEstimate={estimate} loading={estBusy} />
          </div>
          {est?.note && <p className="mt-3 text-xs text-muted-foreground">⚠️ {est.note}</p>}
          {sel?.advice && <p className="mt-3 rounded-xl bg-card p-3 text-sm">{sel.advice}</p>}
        </>
      )}
    </main>
  );
}
