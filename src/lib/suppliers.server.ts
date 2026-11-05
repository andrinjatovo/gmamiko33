// Recherche intelligente de fournisseurs (base interne + Internet public).
// Module serveur uniquement. Ne jamais inventer de résultat :
// les fiches externes viennent uniquement de liens réellement trouvés.
import { globalSearch, norm } from "./search.server";

export type SupplierScope = "all" | "local" | "foreign";

export type Reliability = "tres_fiable" | "a_verifier" | "risque" | "non_verifie";

export type SupplierCard = {
  ref: number;
  kind: "supplier" | "forwarder" | "product" | "knowledge" | "web";
  name: string;
  subtitle: string | null;
  location: string | null;
  platform: string | null;
  url: string | null;
  notes: string | null;
  source: string;
  reliability: Reliability | null;
  why: string | null;
  advice: string | null;
};

export type SupplierSearchResult = {
  internal: SupplierCard[];
  external: SupplierCard[];
  globalAdvice: string | null;
  externalBlocked: string | null;
};

const CN_PLATFORMS = ["pinduoduo", "1688", "taobao", "shein", "alibaba", "aliexpress", "tmall", "jd", "made in china"];

function isForeignPlatform(platform: string | null) {
  const n = norm(platform ?? "");
  return CN_PLATFORMS.some((c) => n.includes(c));
}

function stripTags(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Recherche web publique via DuckDuckGo (liens réels uniquement). */
async function externalSearch(query: string, scope: SupplierScope): Promise<SupplierCard[]> {
  const hint = scope === "local" ? "Madagascar" : scope === "foreign" ? "China" : "";
  const q = `${query} ${hint}`.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; GmamikoBot/1.0)",
        accept: "text/html",
        "accept-language": "fr,mg,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const out: SupplierCard[] = [];
    const blocks = html.split('class="result__a"').slice(1, 9);
    for (const b of blocks) {
      const hrefM = b.match(/href="([^"]+)"/);
      const titleM = b.match(/>([\s\S]*?)<\/a>/);
      const href = hrefM?.[1];
      const rawTitle = titleM?.[1];
      if (!href || !rawTitle) continue;
      let url = href.replace(/&amp;/g, "&");
      const uddg = url.match(/[?&]uddg=([^&]+)/)?.[1];
      if (uddg) url = decodeURIComponent(uddg);
      const name = stripTags(rawTitle).slice(0, 140);
      if (!name) continue;
      const rawSnip = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)?.[1];
      const snippet = rawSnip ? stripTags(rawSnip).slice(0, 300) : null;
      let host = "";
      try {
        host = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }
      out.push({
        ref: 0,
        kind: "web",
        name,
        subtitle: snippet,
        location: null,
        platform: host,
        url,
        notes: null,
        source: `Internet — ${host}`,
        reliability: null,
        why: null,
        advice: null,
      });
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

type AiEval = {
  evaluations?: { ref: number; reliability?: string; why?: string; advice?: string }[];
  globalAdvice?: string;
};

const RELIABILITIES: Reliability[] = ["tres_fiable", "a_verifier", "risque", "non_verifie"];

/** Évaluation IA de la fiabilité, basée uniquement sur les fiches réelles fournies. */
async function evaluate(cards: SupplierCard[]): Promise<AiEval | null> {
  if (!cards.length) return null;
  const { runModel } = await import("./ai.server");
  const list = cards
    .map(
      (c) =>
        `#${c.ref} [${c.source}] ${c.name} | plateforme: ${c.platform ?? "-"} | lieu: ${c.location ?? "-"} | ${c.subtitle ?? ""} | ${(c.notes ?? "").slice(0, 300)}`,
    )
    .join("\n");
  const system = `Tu es l'évaluateur de fournisseurs de GMAMIKO33 (importation Chine → Madagascar).
On te donne des fiches RÉELLES issues de la base interne et d'Internet. Évalue chaque fiche.
Réponds UNIQUEMENT en JSON valide (sans markdown) :
{"evaluations":[{"ref":0,"reliability":"a_verifier","why":"...","advice":"..."}],"globalAdvice":"..."}
reliability ∈ tres_fiable | a_verifier | risque | non_verifie.
RÈGLES :
- "tres_fiable" UNIQUEMENT si preuves solides et vérifiables (informations internes confirmées, historique clair). Sinon "a_verifier" ou "non_verifie".
- "risque" si indices sérieux d'arnaque ou d'incohérence.
- Explique TOUJOURS pourquoi (why) et donne un conseil personnalisé à l'étudiant (advice), en malagasy simple.
- Ne jamais inventer d'information. Ne jamais garantir un fournisseur à 100 %.`;
  try {
    const raw = await runModel(system, list);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as AiEval;
  } catch {
    return null;
  }
}

async function searchSuppliersInner(query: string, scope: SupplierScope): Promise<SupplierSearchResult> {
  const q = query.trim().slice(0, 200);
  if (q.length < 2) throw new Error("Soraty ny anarana tadiavina.");

  const r = await globalSearch(q);
  const internal: SupplierCard[] = [];

  type SRow = { name: string; platform: string | null; shop_url: string | null; status: string; notes: string | null };
  for (const m of r.suppliers.slice(0, 10)) {
    const s = m.row as unknown as SRow;
    const foreign = isForeignPlatform(s.platform);
    if (scope === "local" && foreign) continue;
    if (scope === "foreign" && !foreign) continue;
    internal.push({
      ref: 0,
      kind: "supplier",
      name: s.name,
      subtitle: s.status || null,
      location: null,
      platform: s.platform,
      url: s.shop_url,
      notes: s.notes,
      source: "Base interne — Mpamatsy",
      reliability: null,
      why: null,
      advice: null,
    });
  }

  type FRow = { name: string; city: string | null; departure_country: string; website: string | null; facebook: string | null; phone: string | null; whatsapp: string | null; air_rate_ar_kg: number | null; sea_rate_usd_m3: number | null; notes: string | null };
  if (scope !== "foreign") {
    for (const m of r.forwarders.slice(0, 8)) {
      const f = m.row as unknown as FRow;
      const rates = [
        f.air_rate_ar_kg != null ? `${f.air_rate_ar_kg} Ar/kg (fiaramanidina)` : null,
        f.sea_rate_usd_m3 != null ? `${f.sea_rate_usd_m3} $/m³ (sambo)` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      internal.push({
        ref: 0,
        kind: "forwarder",
        name: f.name,
        subtitle: rates || "Transitaire",
        location: f.city,
        platform: `Transitaire (fiaingana: ${f.departure_country})`,
        url: f.website ?? f.facebook,
        notes: [f.phone ? `Tel: ${f.phone}` : null, f.whatsapp ? `WhatsApp: ${f.whatsapp}` : null, f.notes].filter(Boolean).join(" · ") || null,
        source: "Base interne — Transitaires",
        reliability: null,
        why: null,
        advice: null,
      });
    }
  }

  type PRow = { name: string; category: string | null; material: string | null; transport_advice: string | null; weight_kg: number | null };
  for (const m of r.products.slice(0, 8)) {
    const p = m.row as unknown as PRow;
    internal.push({
      ref: 0,
      kind: "product",
      name: p.name,
      subtitle: p.category,
      location: null,
      platform: null,
      url: null,
      notes: [p.material ? `Fanaka: ${p.material}` : null, p.weight_kg != null ? `Lanja: ${p.weight_kg} kg` : null, p.transport_advice].filter(Boolean).join(" · ") || null,
      source: "Base interne — Vokatra",
      reliability: null,
      why: null,
      advice: null,
    });
  }

  type ERow = { title: string; category: string; content: string };
  for (const m of r.entries.slice(0, 8)) {
    const e = m.row as unknown as ERow;
    internal.push({
      ref: 0,
      kind: "knowledge",
      name: e.title,
      subtitle: e.category,
      location: null,
      platform: null,
      url: null,
      notes: e.content.slice(0, 500),
      source: "Base interne — Fahalalana",
      reliability: null,
      why: null,
      advice: null,
    });
  }

  let external: SupplierCard[] = [];
  let externalBlocked: string | null = null;
  try {
    external = await externalSearch(q, scope);
  } catch (e) {
    externalBlocked = `Tsy tafiditra tamin'ny fikarohana Internet (${e instanceof Error ? e.message : "tsy fantatra"}). Ny vokatra avy amin'ny base interne ihany no aseho.`;
  }
  if (!external.length && !externalBlocked) {
    externalBlocked = "Tsy nisy vokatra hita tamin'ny Internet (na voasakana ny fidirana). Tsy noforonina ny vokatra.";
  }

  const all = [...internal, ...external];
  all.forEach((c, i) => (c.ref = i));

  let globalAdvice: string | null = null;
  const evaluation = await evaluate(all);
  if (evaluation) {
    for (const ev of evaluation.evaluations ?? []) {
      const card = all[ev.ref];
      if (!card) continue;
      if (ev.reliability && (RELIABILITIES as string[]).includes(ev.reliability)) {
        card.reliability = ev.reliability as Reliability;
      }
      card.why = typeof ev.why === "string" ? ev.why.slice(0, 600) : null;
      card.advice = typeof ev.advice === "string" ? ev.advice.slice(0, 600) : null;
    }
    globalAdvice = typeof evaluation.globalAdvice === "string" ? evaluation.globalAdvice.slice(0, 800) : null;
  }

  return { internal, external, globalAdvice, externalBlocked };
}

/** Recherche fournisseurs payante : 1 crédit (ou l'essai gratuit), remboursé si échec. */
export async function searchSuppliers(studentName: string, query: string, scope: SupplierScope) {
  const { withCredit } = await import("./billing.server");
  return withCredit(studentName, () => searchSuppliersInner(query, scope), "supplier_search");
}
