import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Coins, CreditCard, History, Loader2, Plus, Trash2, Wallet, X } from "lucide-react";
import {
  adminAddCredits,
  adminDeletePaymentMethod,
  adminFetchAccounts,
  adminFetchCreditTransactions,
  adminFetchPaymentMethods,
  adminFetchPaymentRequests,
  adminReviewPayment,
  adminSavePaymentMethod,
} from "@/lib/billing.functions";
import { formatAr } from "@/lib/billing.plans";
import { useAdminCode } from "@/hooks/use-admin-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin_/paiements")({
  head: () => ({
    meta: [
      { title: "Fandoavam-bola sy crédit — Fitantanana" },
      {
        name: "description",
        content: "Fehezo ny kaonty Mobile Money, hamarino ny porofon'ny fandoavam-bola ary omeo crédit hafatra ny mpianatra.",
      },
      { property: "og:title", content: "Fandoavam-bola sy crédit — Fitantanana" },
      { property: "og:description", content: "Fanamarinana fandoavam-bola sy fitantanana crédit hafatra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPaiements,
});

type MethodForm = {
  id?: string;
  label: string;
  number: string;
  holder: string;
  instructions: string;
  is_active: boolean;
};

const EMPTY: MethodForm = { label: "Mvola", number: "", holder: "", instructions: "", is_active: true };

function AdminPaiements() {
  const { code, ready } = useAdminCode();
  const qc = useQueryClient();
  const [form, setForm] = useState<MethodForm | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const methods = useQuery({
    queryKey: ["admin-payment-methods"],
    enabled: ready && !!code,
    queryFn: () => adminFetchPaymentMethods({ data: { adminCode: code! } }),
  });
  const requests = useQuery({
    queryKey: ["admin-payment-requests"],
    enabled: ready && !!code,
    queryFn: () => adminFetchPaymentRequests({ data: { adminCode: code!, status: "all" } }),
  });
  const accounts = useQuery({
    queryKey: ["admin-accounts"],
    enabled: ready && !!code,
    queryFn: () => adminFetchAccounts({ data: { adminCode: code! } }),
  });
  const txns = useQuery({
    queryKey: ["admin-credit-txns"],
    enabled: ready && !!code,
    queryFn: () => adminFetchCreditTransactions({ data: { adminCode: code! } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-payment-requests"] });
    qc.invalidateQueries({ queryKey: ["admin-accounts"] });
    qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
    qc.invalidateQueries({ queryKey: ["payment-methods"] });
  };

  const saveMethod = useMutation({
    mutationFn: (v: MethodForm) =>
      adminSavePaymentMethod({
        data: {
          adminCode: code!,
          ...(v.id ? { id: v.id } : {}),
          label: v.label,
          number: v.number,
          holder: v.holder || null,
          instructions: v.instructions || null,
          is_active: v.is_active,
        },
      }),
    onSuccess: () => {
      setForm(null);
      invalidate();
      toast.success("Voatahiry");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMethod = useMutation({
    mutationFn: (id: string) => adminDeletePaymentMethod({ data: { adminCode: code!, id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected" }) =>
      adminReviewPayment({ data: { adminCode: code!, id: v.id, decision: v.decision, note: null } }),
    onMutate: (v) => setReviewing(v.id),
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.decision === "approved" ? "Voamarina, voampidina ny crédit" : "Nolavina");
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setReviewing(null),
  });

  const grant = useMutation({
    mutationFn: (v: { studentName: string; amount: number }) =>
      adminAddCredits({ data: { adminCode: code!, ...v } }),
    onSuccess: () => {
      invalidate();
      toast.success("Voampidina ny crédit");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!ready) return null;

  if (!code)
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pt-5">
        <p className="text-sm text-muted-foreground">
          Mila fidirana mpitantana.{" "}
          <Link to="/admin" className="font-medium text-primary">
            Ampidiro ny kaody
          </Link>
        </p>
      </main>
    );

  const pendingCount = (requests.data ?? []).filter((r) => r.status === "pending").length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-12 pt-5">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Tabilao fitantanana
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
          <Wallet className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Fandoavam-bola sy crédit</h1>
          <p className="text-sm text-muted-foreground">Kaonty Mobile Money, porofo ary crédit hafatra</p>
        </div>
      </div>

      <Tabs defaultValue="requests" className="mt-5">
        <TabsList className="w-full">
          <TabsTrigger value="requests" className="flex-1">
            Porofo {pendingCount > 0 ? `(${pendingCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="methods" className="flex-1">
            Kaonty
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex-1">
            Mpianatra
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            Tantara
          </TabsTrigger>
        </TabsList>

        {/* --------------------------- Demandes --------------------------- */}
        <TabsContent value="requests" className="mt-4 space-y-3">
          {requests.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (requests.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Mbola tsy misy fangatahana.</p>
          ) : (
            (requests.data ?? []).map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-card p-4"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 font-semibold">{r.student_name}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      r.status === "pending"
                        ? "bg-accent text-primary"
                        : r.status === "approved"
                          ? "bg-primary text-primary-foreground"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {r.status === "pending" ? "Miandry" : r.status === "approved" ? "Voamarina" : "Nolavina"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.messages} hafatra · {formatAr(r.amount_ar)} · {new Date(r.created_at).toLocaleString("fr-FR")}
                </p>

                {r.proofUrl ? (
                  <a href={r.proofUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                    <img
                      src={r.proofUrl}
                      alt={`Porofon'ny fandoavam-bola ${r.student_name}`}
                      className="max-h-64 w-full rounded-xl border border-border object-contain"
                      loading="lazy"
                    />
                  </a>
                ) : null}

                {r.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={reviewing === r.id}
                      onClick={() => review.mutate({ id: r.id, decision: "approved" })}
                    >
                      {reviewing === r.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                      Ekena ({r.messages})
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={reviewing === r.id}
                      onClick={() => review.mutate({ id: r.id, decision: "rejected" })}
                    >
                      <X className="mr-2 size-4" /> Lavina
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </TabsContent>

        {/* ---------------------------- Comptes --------------------------- */}
        <TabsContent value="methods" className="mt-4 space-y-3">
          <Button className="w-full" onClick={() => setForm({ ...EMPTY })}>
            <Plus className="mr-2 size-4" /> Hanampy kaonty
          </Button>
          {(methods.data ?? []).map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" />
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() =>
                  setForm({
                    id: m.id,
                    label: m.label,
                    number: m.number,
                    holder: m.holder ?? "",
                    instructions: m.instructions ?? "",
                    is_active: m.is_active,
                  })
                }
              >
                <p className="font-semibold">
                  {m.label} : {m.number}
                </p>
                {m.holder ? <p className="text-sm text-muted-foreground">{m.holder}</p> : null}
                {!m.is_active ? <p className="text-xs text-muted-foreground">Miafina</p> : null}
              </button>
              <Button variant="ghost" size="icon" aria-label="Fafao" onClick={() => delMethod.mutate(m.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </TabsContent>

        {/* --------------------------- Étudiants -------------------------- */}
        <TabsContent value="accounts" className="mt-4 space-y-2">
          {(accounts.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Mbola tsy misy mpianatra.</p>
          ) : (
            (accounts.data ?? []).map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.credits_messages} hafatra · {a.free_used ? "lany ny maimaim-poana" : "mbola misy maimaim-poana"}
                  </p>
                </div>
                {[5, 10, 20].map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    size="sm"
                    onClick={() => grant.mutate({ studentName: a.student_name, amount: n })}
                  >
                    <Coins className="mr-1 size-3.5" />+{n}
                  </Button>
                ))}
              </div>
            ))
          )}
        </TabsContent>

        {/* -------------------- Historique des crédits -------------------- */}
        <TabsContent value="history" className="mt-4 space-y-2">
          {txns.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (txns.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Mbola tsy misy fifanakalozana crédit.</p>
          ) : (
            (txns.data ?? []).map((x) => (
              <div
                key={x.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <History className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{x.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {OP_LABELS[x.operation] ?? x.operation} · {new Date(x.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    x.credits > 0 ? "bg-mada/15 text-mada" : x.credits < 0 ? "bg-china/15 text-china" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {x.credits > 0 ? `+${x.credits}` : x.credits}
                </span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Hanova kaonty" : "Kaonty vaovao"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Anaran'ny fandoavam-bola</Label>
                <Input
                  placeholder="Mvola, Orange Money, Airtel Money…"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Laharana</Label>
                <Input
                  placeholder="038 79 097 13"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tompon'ny kaonty</Label>
                <Input
                  placeholder="Jean Noël"
                  value={form.holder}
                  onChange={(e) => setForm({ ...form, holder: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Torolàlana ho an'ny mpianatra</Label>
                <Textarea
                  rows={3}
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                <Label>Aseho amin'ny mpianatra</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              className="w-full"
              disabled={saveMethod.isPending || !form?.label.trim() || !form?.number.trim()}
              onClick={() => form && saveMethod.mutate(form)}
            >
              {saveMethod.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Tahirizo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
