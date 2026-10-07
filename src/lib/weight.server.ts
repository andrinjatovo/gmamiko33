// Recherche multilingue Poids & Volume (serveur uniquement).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { norm } from "./search.server";

const NAME_FIELDS = ["name", "name_fr", "name_en", "name_mg", "name_zh", "platform_name", "aliases", "category"] as const;

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]!;
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j]!;
      d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length]!;
}

function score(text: string, q: string, words: string[]) {
  const t = norm(text);
  if (!t) return 0;
  let s = t.includes(q) ? 10 : 0;
  const parts = t.split(" ");
  for (const w of words) {
    if (t.includes(w)) s += 3;
    else if (w.length >= 4 && parts.some((p) => p.length >= 3 && (lev(p, w) <= (w.length >= 7 ? 2 : 1) || p.startsWith(w.slice(0, 4)))))
      s += 2;
  }
  return s;
}

export async function searchWeightVolume(query: string) {
  const q = norm(query).slice(0, 120);
  if (!q) return [];
  const words = q.split(" ").filter((w) => w.length >= 2);
  const { data, error } = await supabaseAdmin.from("kb_products").select("*").limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((p) => {
      const rec = p as unknown as Record<string, unknown>;
      return { p, s: NAME_FIELDS.reduce((a, f) => a + score(String(rec[f] ?? ""), q, words), 0) };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8)
    .map(({ p }) => {
      const dims = p.length_cm && p.width_cm && p.height_cm ? { l: Number(p.length_cm), w: Number(p.width_cm), h: Number(p.height_cm) } : null;
      const vol = p.volume_cm3 != null ? Number(p.volume_cm3) : dims ? dims.l * dims.w * dims.h : null;
      return {
        id: p.id,
        name: p.name,
        names: [p.name_fr, p.name_en, p.name_mg, p.name_zh, p.platform_name].filter(Boolean) as string[],
        category: p.category,
        weightKg: p.weight_kg != null ? Number(p.weight_kg) : null,
        dims,
        dimensionsText: p.dimensions,
        volumeCm3: vol,
        advice: p.transport_advice,
      };
    });
}

/** Estimation IA, toujours marquée comme telle. */
export async function estimateWeightVolume(product: string) {
  const name = product.trim().slice(0, 200);
  if (!name) throw new Error("Tsy misy anarana vokatra.");
  const { runModel } = await import("./ai.server");
  const raw = await runModel(
    "Tu estimes le poids et le volume d'UN article emballé importé de Chine. Réponds UNIQUEMENT par une ligne JSON : {\"weight_kg\": nombre, \"length_cm\": nombre, \"width_cm\": nombre, \"height_cm\": nombre, \"note\": \"phrase courte en malgache\"}.",
    `Produit : ${name}`,
  );
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Tsy nahavita nanombana ny IA.");
  const j = JSON.parse(m[0]) as { weight_kg?: unknown; length_cm?: unknown; width_cm?: unknown; height_cm?: unknown; note?: unknown };
  const n = (v: unknown) => (typeof v === "number" && isFinite(v) && v > 0 ? v : null);
  const l = n(j.length_cm), w = n(j.width_cm), h = n(j.height_cm);
  return {
    weightKg: n(j.weight_kg),
    dims: l && w && h ? { l, w, h } : null,
    volumeCm3: l && w && h ? l * w * h : null,
    note: typeof j.note === "string" ? j.note.slice(0, 300) : "",
  };
}
