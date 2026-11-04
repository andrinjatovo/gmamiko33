// Base de connaissances de l'assistant IA (import Chine -> Madagascar).
// Module serveur uniquement : jamais importé depuis le client.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Catégories proposées à l'administrateur pour classer les connaissances. */
export const KB_CATEGORIES = [
  "Pinduoduo",
  "1688",
  "Taobao",
  "SHEIN",
  "Fournisseurs",
  "Transitaires",
  "Paiement",
  "Produits",
  "Transport",
  "Conseils",
  "Erreurs fréquentes",
  "Expériences",
  "Tutoriels",
  "Marché malgache",
  "Autres",
] as const;

export type KbEntry = {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  is_active: boolean;
  updated_at: string;
};

export type Forwarder = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  wechat: string | null;
  facebook: string | null;
  website: string | null;
  city: string | null;
  departure_country: string;
  air_rate_ar_kg: number | null;
  sea_rate_usd_m3: number | null;
  delivery_standard: string | null;
  delivery_express: string | null;
  avg_delay: string | null;
  notes: string | null;
  is_active: boolean;
  rates_updated_at: string;
};

export type KbProduct = {
  id: string;
  name: string;
  category: string | null;
  material: string | null;
  dimensions: string | null;
  weight_kg: number | null;
  is_fragile: boolean;
  has_battery: boolean;
  is_liquid: boolean;
  transport_advice: string | null;
};

export type KbSupplier = {
  id: string;
  name: string;
  platform: string | null;
  shop_url: string | null;
  status: string;
  notes: string | null;
};

type Table = "kb_entries" | "forwarders" | "kb_products" | "kb_suppliers";

export async function kbList(table: Table, search = "") {
  let query = supabaseAdmin.from(table).select("*").order("updated_at", { ascending: false }).limit(500);
  if (search.trim()) {
    const s = `%${search.trim()}%`;
    query =
      table === "kb_entries"
        ? (query.or(`title.ilike.${s},content.ilike.${s},category.ilike.${s}`) as typeof query)
        : (query.or(`name.ilike.${s}`) as typeof query);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function kbSave(table: Table, id: string | null, values: Record<string, unknown>) {
  // Les colonnes varient selon la table : on contourne l'union de types générée.
  const client = supabaseAdmin.from(table) as unknown as {
    update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
  const { error } = id ? await client.update(values).eq("id", id) : await client.insert(values);
  if (error) throw new Error(error.message);
}

export async function kbDelete(table: Table, id: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Construit le contexte transmis à l'IA.
 * Priorité absolue aux connaissances enregistrées par l'administrateur :
 * on cherche d'abord des correspondances (même partielles) dans toutes les
 * tables, puis on complète avec un fond général.
 */
export async function buildKnowledgeContext(question: string) {
  const { globalSearch } = await import("./search.server");
  const r = await globalSearch(question);

  const sections: string[] = [];

  const matchedEntries = r.entries.slice(0, 30);
  const matchedForwarders = r.forwarders.slice(0, 15);
  const matchedProducts = r.products.slice(0, 25);
  const matchedSuppliers = r.suppliers.slice(0, 20);

  const fmtEntry = (e: { category: string; title: string; content: string; tags: string[] | null }) =>
    `[${e.category}] ${e.title}${e.tags?.length ? ` (mots-clés: ${e.tags.join(", ")})` : ""}\n${e.content}`;

  const fmtProduct = (p: KbProduct) =>
    `${p.name} | catégorie: ${p.category ?? "-"} | matière: ${p.material ?? "-"} | dimensions: ${
      p.dimensions ?? "-"
    } | POIDS RÉEL ENREGISTRÉ: ${p.weight_kg ?? "non enregistré"} kg | fragile: ${
      p.is_fragile ? "oui" : "non"
    } | batterie: ${p.has_battery ? "oui" : "non"} | liquide: ${p.is_liquid ? "oui" : "non"} | conseil: ${
      p.transport_advice ?? "-"
    }`;

  const fmtForwarder = (f: Forwarder) =>
    `${f.name} (${f.city ?? "-"}, départ ${f.departure_country}) | aérien: ${f.air_rate_ar_kg ?? "-"} Ar/kg | maritime: ${
      f.sea_rate_usd_m3 ?? "-"
    } $/m³ | standard: ${f.delivery_standard ?? "-"} | express: ${f.delivery_express ?? "-"} | délai: ${
      f.avg_delay ?? "-"
    } | tél: ${f.phone ?? "-"} | WhatsApp: ${f.whatsapp ?? "-"} | WeChat: ${f.wechat ?? "-"} | Facebook: ${
      f.facebook ?? "-"
    } | site: ${f.website ?? "-"} | tarifs enregistrés le ${new Date(f.rates_updated_at).toLocaleDateString("fr-FR")}${
      f.notes ? ` | notes: ${f.notes}` : ""
    }`;

  const fmtSupplier = (s: KbSupplier) =>
    `${s.name} | plateforme: ${s.platform ?? "-"} | statut: ${s.status} | ${s.shop_url ?? ""} ${s.notes ?? ""}`.trim();

  // 1. Correspondances directes — l'IA DOIT les utiliser.
  if (r.matchCount > 0) {
    const parts: string[] = [];
    if (matchedEntries.length)
      parts.push(`#### Connaissances correspondantes\n${matchedEntries.map((m) => fmtEntry(m.row as never)).join("\n\n")}`);
    if (matchedForwarders.length)
      parts.push(`#### Transitaires correspondants\n${matchedForwarders.map((m) => fmtForwarder(m.row as never)).join("\n")}`);
    if (matchedProducts.length)
      parts.push(`#### Produits correspondants\n${matchedProducts.map((m) => fmtProduct(m.row as never)).join("\n")}`);
    if (matchedSuppliers.length)
      parts.push(`#### Fournisseurs correspondants\n${matchedSuppliers.map((m) => fmtSupplier(m.row as never)).join("\n")}`);
    if (r.folders.length)
      parts.push(`#### Dossiers de formation correspondants\n${r.folders.slice(0, 10).map((m) => (m.row as { name: string }).name).join(", ")}`);
    if (r.items.length)
      parts.push(
        `#### Contenus de cours correspondants\n${r.items
          .slice(0, 15)
          .map((m) => {
            const i = m.row as { title: string | null; content: string | null };
            return `${i.title ?? "(sans titre)"} — ${(i.content ?? "").slice(0, 600)}`;
          })
          .join("\n")}`,
      );
    sections.push(`## RÉSULTATS DE RECHERCHE (PRIORITÉ ABSOLUE — utilise ces informations)\n${parts.join("\n\n")}`);
  }

  // 2. Fond général, pour garder du contexte métier.
  const usedEntryTitles = new Set(matchedEntries.map((m) => (m.row as { title: string }).title));
  const rest = r.all.entries.filter((e) => !usedEntryTitles.has(e.title)).slice(0, 20);
  if (rest.length) sections.push(`## Autres connaissances du formateur\n${rest.map((e) => fmtEntry(e as never)).join("\n\n")}`);
  if (r.all.forwarders.length)
    sections.push(`## Tous les transitaires enregistrés\n${r.all.forwarders.map((f) => fmtForwarder(f as never)).join("\n")}`);
  if (r.all.products.length)
    sections.push(
      `## Produits de référence (poids réels enregistrés)\n${r.all.products.slice(0, 60).map((p) => fmtProduct(p as never)).join("\n")}`,
    );
  if (r.all.suppliers.length)
    sections.push(`## Fournisseurs enregistrés\n${r.all.suppliers.map((s) => fmtSupplier(s as never)).join("\n")}`);

  return {
    text: sections.join("\n\n"),
    matchCount: r.matchCount,
    strongCount: r.strongCount,
    words: r.words,
    counts: {
      entries: r.all.entries.length,
      forwarders: r.all.forwarders.length,
      products: r.all.products.length,
      suppliers: r.all.suppliers.length,
    },
  };
}

/* ---------------------- Ajout simplifié (titre + description) ---------------------- */

const str = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown) => v === true;

function parseAiJson(raw: string) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Tsy nahavita nandamina ny angona ny IA. Andramo indray.");
  return JSON.parse(m[0]) as Record<string, unknown>;
}

const QUICK_FIELDS: Record<Table, string> = {
  kb_entries: "category*, title*, content*, tags (liste de mots-clés)",
  forwarders:
    "name*, city, address, phone, whatsapp, wechat, facebook, website, departure_country, air_rate_ar_kg (number), sea_rate_usd_m3 (number), delivery_standard, delivery_express, avg_delay, notes*",
  kb_products:
    "name*, name_fr, name_en, name_mg, name_zh, platform_name, aliases, category, material, dimensions, weight_kg (number), length_cm (number), width_cm (number), height_cm (number), volume_cm3 (number), is_fragile (boolean), has_battery (boolean), is_liquid (boolean), transport_advice",
  kb_suppliers: "name*, platform, shop_url, status, notes*",
};

function buildQuickValues(table: Table, title: string, description: string, j: Record<string, unknown>): Record<string, unknown> {
  switch (table) {
    case "kb_entries": {
      const cat = str(j["category"], 60);
      return {
        category: cat && (KB_CATEGORIES as readonly string[]).includes(cat) ? cat : "Autres",
        title: str(j["title"], 200) ?? title,
        content: str(j["content"], 8000) ?? description,
        tags: Array.isArray(j["tags"]) ? j["tags"].map(String).slice(0, 10) : [],
        is_active: true,
      };
    }
    case "forwarders":
      return {
        name: str(j["name"], 120) ?? title,
        address: str(j["address"], 200),
        phone: str(j["phone"], 60),
        whatsapp: str(j["whatsapp"], 60),
        wechat: str(j["wechat"], 60),
        facebook: str(j["facebook"], 300),
        website: str(j["website"], 300),
        city: str(j["city"], 80),
        departure_country: str(j["departure_country"], 80) ?? "Chine",
        air_rate_ar_kg: num(j["air_rate_ar_kg"]),
        sea_rate_usd_m3: num(j["sea_rate_usd_m3"]),
        delivery_standard: str(j["delivery_standard"], 120),
        delivery_express: str(j["delivery_express"], 120),
        avg_delay: str(j["avg_delay"], 120),
        notes: str(j["notes"], 2000) ?? description,
        is_active: true,
        rates_updated_at: new Date().toISOString(),
      };
    case "kb_products":
      return {
        name: str(j["name"], 160) ?? title,
        name_fr: str(j["name_fr"], 160),
        name_en: str(j["name_en"], 160),
        name_mg: str(j["name_mg"], 160),
        name_zh: str(j["name_zh"], 160),
        platform_name: str(j["platform_name"], 160),
        aliases: str(j["aliases"], 400),
        category: str(j["category"], 80),
        material: str(j["material"], 120),
        dimensions: str(j["dimensions"], 160),
        weight_kg: num(j["weight_kg"]),
        length_cm: num(j["length_cm"]),
        width_cm: num(j["width_cm"]),
        height_cm: num(j["height_cm"]),
        volume_cm3: num(j["volume_cm3"]),
        is_fragile: bool(j["is_fragile"]),
        has_battery: bool(j["has_battery"]),
        is_liquid: bool(j["is_liquid"]),
        transport_advice: str(j["transport_advice"], 1000),
      };
    case "kb_suppliers":
      return {
        name: str(j["name"], 160) ?? title,
        platform: str(j["platform"], 80),
        shop_url: str(j["shop_url"], 400),
        status: str(j["status"], 120) ?? "tsy voamarina",
        notes: str(j["notes"], 2000) ?? description,
      };
  }
}

/**
 * Ajout simplifié : l'admin donne un titre et une description libres,
 * l'IA analyse, classe et structure l'information dans la bonne table.
 * Rien n'est inventé : les champs absents de la description restent vides.
 */
export async function quickAddKb(table: Table, title: string, description: string) {
  const t = title.trim().slice(0, 200);
  const d = description.trim().slice(0, 6000);
  if (!t || !d) throw new Error("Mila lohateny sy fanazavana.");
  const { runModel } = await import("./ai.server");
  const system = `Tu es l'assistant de structuration de la base de connaissances GMAMIKO33 (importation Chine → Madagascar).
L'administrateur donne un TITRE et une DESCRIPTION libres. Transforme-les en fiche structurée pour la table « ${table} ».
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni commentaire.
Champs attendus (* = obligatoire) : ${QUICK_FIELDS[table]}
Règles :
- Extrais uniquement ce qui est dit ou clairement sous-entendu dans la description. N'invente RIEN (pas de prix, téléphone, lien ou statut non mentionné).
- Les nombres en number (ex : tarif Ar/kg), jamais en string.
- Pour kb_entries : choisis la catégorie parmi ${KB_CATEGORIES.join(", ")} ; content = la description enrichie et organisée ; tags = 3 à 8 mots-clés en minuscules sans accents.
- Pour kb_suppliers : status = "tsy voamarina" sauf si la description prouve clairement la fiabilité (alors "azo itokiana").
- Pour kb_products : ne remplis les noms multilingues, poids et dimensions que s'ils sont mentionnés ou évidents.
- Langue des champs texte : malagasy simple (sauf noms propres).`;
  const raw = await runModel(system, `TITRE : ${t}\n\nDESCRIPTION :\n${d}`);
  const values = buildQuickValues(table, t, d, parseAiJson(raw));
  await kbSave(table, null, values);
  return { ok: true };
}

