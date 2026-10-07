import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BrainCircuit, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteKb, fetchKb, saveKb } from "@/lib/kb.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminCode } from "@/hooks/use-admin-code";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin_/connaissances")({
  head: () => ({
    meta: [
      { title: "Fototra fahalalana IA — Fitantanana" },
      {
        name: "description",
        content: "Raketo ao ny transitaire, vokatra, mpamatsy ary torohevitra ampiasain'ny mpanampy IA.",
      },
      { property: "og:title", content: "Fototra fahalalana IA — Fitantanana" },
      { property: "og:description", content: "Amelo ny mpanampy import Sina → Madagasikara." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgeAdmin,
});

type Table = "kb_entries" | "forwarders" | "kb_products" | "kb_suppliers";
type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean";
  placeholder?: string;
};

const CATEGORIES = [
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
];

const SCHEMAS: Record<Table, { label: string; titleKey: string; subtitle: (r: Row) => string; fields: Field[] }> = {
  kb_entries: {
    label: "Fahalalana",
    titleKey: "title",
    subtitle: (r) => String(r["category"] ?? ""),
    fields: [
      { key: "category", label: `Sokajy (${CATEGORIES.join(", ")})`, placeholder: "Torohevitra" },
      { key: "title", label: "Lohateny" },
      { key: "content", label: "Votoaty", type: "textarea" },
      { key: "is_active", label: "Ampiasain'ny IA", type: "boolean" },
    ],
  },
  forwarders: {
    label: "Transitaires",
    titleKey: "name",
    subtitle: (r) => `${r["city"] ?? ""} · ${r["air_rate_ar_kg"] ?? "-"} Ar/kg · ${r["sea_rate_usd_m3"] ?? "-"} $/m³`,
    fields: [
      { key: "name", label: "Anaran'ny transitaire" },
      { key: "address", label: "Adiresy" },
      { key: "phone", label: "Telefaonina" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "wechat", label: "WeChat" },
      { key: "facebook", label: "Facebook" },
      { key: "website", label: "Tranokala" },
      { key: "city", label: "Tanàna" },
      { key: "departure_country", label: "Firenena fiaingana", placeholder: "Sina" },
      { key: "air_rate_ar_kg", label: "Fitaterana an-habakabaka (Ar/kg)", type: "number" },
      { key: "sea_rate_usd_m3", label: "Fitaterana an-dranomasina ($/m³)", type: "number" },
      { key: "delivery_standard", label: "Fandefasana mahazatra" },
      { key: "delivery_express", label: "Fandefasana haingana" },
      { key: "avg_delay", label: "Fotoana antonony fandefasana" },
      { key: "notes", label: "Naoty", type: "textarea" },
      { key: "is_active", label: "Mavitrika", type: "boolean" },
    ],
  },
  kb_products: {
    label: "Vokatra",
    titleKey: "name",
    subtitle: (r) => `${r["category"] ?? "-"} · ${r["weight_kg"] ?? "-"} kg`,
    fields: [
      { key: "name", label: "Anaran'ny vokatra" },
      { key: "name_fr", label: "Anarana frantsay", placeholder: "Chaussures femme" },
      { key: "name_en", label: "Anarana anglisy", placeholder: "Women shoes" },
      { key: "name_mg", label: "Anarana malagasy", placeholder: "Kiraro vehivavy" },
      { key: "name_zh", label: "Anarana sinoa", placeholder: "女鞋" },
      { key: "platform_name", label: "Anarana tany amin'ny sehatra (Pinduoduo/1688/Taobao/SHEIN)" },
      { key: "aliases", label: "Teny mitovy hevitra / teny fanalahidy (sarahana amin'ny faingo)" },
      { key: "category", label: "Sokajy" },
      { key: "material", label: "Fanontana" },
      { key: "dimensions", label: "Habe (soratra)" },
      { key: "weight_kg", label: "Lanja marina (kg)", type: "number" },
      { key: "length_cm", label: "Halava marina (cm)", type: "number" },
      { key: "width_cm", label: "Sakany marina (cm)", type: "number" },
      { key: "height_cm", label: "Haavony marina (cm)", type: "number" },
      { key: "volume_cm3", label: "Volume marina (cm³) — raha tsy misy habe", type: "number" },
      { key: "is_fragile", label: "Vokatra malemy", type: "boolean" },
      { key: "has_battery", label: "Misy solika mihazona herinaratra", type: "boolean" },
      { key: "is_liquid", label: "Rano", type: "boolean" },
      { key: "transport_advice", label: "Torohevitra fitaterana", type: "textarea" },
    ],
  },
  kb_suppliers: {
    label: "Mpamatsy",
    titleKey: "name",
    subtitle: (r) => `${r["platform"] ?? "-"} · ${r["status"] ?? ""}`,
    fields: [
      { key: "name", label: "Anaran'ny mpamatsy / fivarotana" },
      { key: "platform", label: "Sehatra (Pinduoduo, 1688, Taobao, SHEIN)" },
      { key: "shop_url", label: "Rohin'ny fivarotana" },
      { key: "status", label: "Sata (azo itokiana, hialana, ambara)", placeholder: "azo itokiana" },
      { key: "notes", label: "Traikefa sy fanamarihana", type: "textarea" },
    ],
  },
};

type Row = Record<string, unknown> & { id: string };

function KnowledgeAdmin() {
  const { code: adminCode, ready } = useAdminCode();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [table, setTable] = useState<Table>("kb_entries");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  if (ready && !adminCode) navigate({ to: "/admin" });

  const schema = SCHEMAS[table];

  const { data, isLoading } = useQuery({
    queryKey: ["kb", table, search, adminCode],
    enabled: ready && !!adminCode,
    queryFn: () => fetchKb({ data: { adminCode: adminCode!, table, search } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["kb", table] });

  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const { id, ...rest } = values;
      return saveKb({
        data: { adminCode: adminCode!, table, ...(id ? { id: String(id) } : {}), values: rest },
      });
    },
    onSuccess: () => {
      setEditing(null);
      toast.success("Enregistré");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteKb({ data: { adminCode: adminCode!, table, id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []) as Row[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-5">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Fitantanana
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
          <BrainCircuit className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Fototra fahalalana IA</h1>
          <p className="text-sm text-muted-foreground">Ireo angona ireo dia mamelona avy hatrany ny mpanampy.</p>
        </div>
      </div>

      <Tabs value={table} onValueChange={(v) => setTable(v as Table)} className="mt-5">
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(SCHEMAS) as Table[]).map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs">
              {SCHEMAS[t].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tadiavo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="icon" aria-label="Ampio" onClick={() => setEditing({})}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Tsy misy angona voarakitra.
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{String(r[schema.titleKey] ?? "Tsy misy lohateny")}</p>
                <p className="truncate text-xs text-muted-foreground">{schema.subtitle(r)}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Hanova" onClick={() => setEditing(r)}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Fafao" onClick={() => del.mutate(r.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.["id"] ? "Hanova" : "Ampio"} — {schema.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {schema.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                {f.type === "boolean" ? (
                  <div>
                    <Switch
                      checked={Boolean(editing?.[f.key] ?? (f.key === "is_active" ? true : false))}
                      onCheckedChange={(v) => setEditing((s) => ({ ...s, [f.key]: v }))}
                    />
                  </div>
                ) : f.type === "textarea" ? (
                  <Textarea
                    rows={5}
                    value={String(editing?.[f.key] ?? "")}
                    onChange={(e) => setEditing((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    placeholder={f.placeholder ?? ""}
                    value={String(editing?.[f.key] ?? "")}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        [f.key]: f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={save.isPending}
              onClick={() => {
                const values: Record<string, unknown> = { ...(editing ?? {}) };
                delete values["created_at"];
                delete values["updated_at"];
                delete values["rates_updated_at"];
                delete values["tags"];
                for (const f of schema.fields) {
                  if (f.type === "boolean") values[f.key] = Boolean(values[f.key]);
                  else if (values[f.key] === "") values[f.key] = null;
                }
                if (table === "forwarders") values["rates_updated_at"] = new Date().toISOString();
                save.mutate(values);
              }}
            >
              {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Tehirizo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
