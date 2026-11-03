import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Ban, Check, Hourglass, Loader2, ShieldCheck, UserCheck, X } from "lucide-react";
import { adminListStudentProfiles, adminSetBlocked, adminSetValidation } from "@/lib/student-auth.functions";
import { useAdminCode } from "@/hooks/use-admin-code";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin_/comptes")({
  head: () => ({
    meta: [
      { title: "Kaonty mpianatra — Fitantanana" },
      { name: "description", content: "Lisitry ny mpianatra voasoratra amin'ny mailaka sy ireo kaonty voasakana noho ny kaonty maromaro." },
      { property: "og:title", content: "Kaonty mpianatra — Fitantanana" },
      { property: "og:description", content: "Fitantanana kaonty sy fiarovana finday." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminComptes,
});

function AdminComptes() {
  const { code, ready } = useAdminCode();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-student-profiles"],
    enabled: ready && !!code,
    queryFn: () => adminListStudentProfiles({ data: { adminCode: code! } }),
  });
  const toggle = useMutation({
    mutationFn: (v: { userId: string; blocked: boolean }) => adminSetBlocked({ data: { adminCode: code!, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-student-profiles"] });
      toast.success("Voatahiry");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const validate = useMutation({
    mutationFn: (v: { userId: string; status: "approved" | "rejected" }) =>
      adminSetValidation({ data: { adminCode: code!, ...v } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-student-profiles"] });
      toast.success(v.status === "approved" ? "Voamarina ny kaonty" : "Nolavina ny fisoratana");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!ready) return null;
  const rows = data ?? [];
  const blocked = rows.filter((r) => r.blocked).length;
  const pending = rows.filter((r) => r.validation_status === "pending");
  const others = rows.filter((r) => r.validation_status !== "pending");

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-5">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Fitantanana
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Kaonty mpianatra</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} voasoratra · {pending.length} miandry · {blocked} voasakana
          </p>
        </div>
      </div>
      {!code ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Mila fidirana mpitantana. <Link to="/admin" className="font-medium text-primary">Ampidiro ny kaody</Link>
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-2">
            <Hourglass className="size-4 text-primary" />
            <h2 className="font-semibold">Miandry fanamarinana ({pending.length})</h2>
          </div>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Tsy misy fisoratana miandry fanamarinana.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {pending.map((r) => (
                <div
                  key={r.user_id}
                  className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-card p-3"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.display_name ?? "(tsy mbola nisafidy anarana)"}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => validate.mutate({ userId: r.user_id, status: "approved" })} disabled={validate.isPending}>
                    <Check className="mr-1 size-4" /> Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => validate.mutate({ userId: r.user_id, status: "rejected" })}
                    disabled={validate.isPending}
                  >
                    <X className="mr-1 size-4" /> Refuser
                  </Button>
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-8 font-semibold">Kaonty rehetra</h2>
          <div className="mt-2 space-y-2">
            {others.map((r) => (
              <div key={r.user_id} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.display_name ?? "(tsy mbola nisafidy anarana)"}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  {r.validation_status === "rejected" ? (
                    <p className="text-xs text-destructive">Fisoratana nolavina</p>
                  ) : null}
                  {r.blocked ? <p className="text-xs text-destructive">{r.block_reason}</p> : null}
                </div>
                {r.validation_status === "rejected" ? (
                  <Button size="sm" variant="outline" onClick={() => validate.mutate({ userId: r.user_id, status: "approved" })} disabled={validate.isPending}>
                    <Check className="mr-1 size-4" /> Valider
                  </Button>
                ) : r.blocked ? (
                  <Button size="sm" variant="outline" onClick={() => toggle.mutate({ userId: r.user_id, blocked: false })}>
                    <UserCheck className="mr-1 size-4" /> Avela
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ userId: r.user_id, blocked: true })}>
                    <Ban className="mr-1 size-4" /> Sakano
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
