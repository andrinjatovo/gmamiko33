import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Folder,
  Loader2,
  Lock,
  BrainCircuit,
  GraduationCap,
  Users,
  MessageCircle,
  Wallet,
  LayoutDashboard,


  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { checkAdminCode, deleteRow, fetchFolderSecurity, fetchFolders, saveFolder } from "@/lib/content.functions";
import { useAdminCode } from "@/hooks/use-admin-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Fitantanana — Import Sina → Madagasikara" },
      { name: "description", content: "Tantano ny dosie, ny fototra fahalalana IA, ny quiz, ny fanaraha-maso ny mpianatra ary ny hafatra." },
      { property: "og:title", content: "Fitantanana — Import Sina → Madagasikara" },
      { property: "og:description", content: "Dosie, fototra IA, quiz, fanaraha-maso mpianatra ary hafatra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { code, ready, save, clear } = useAdminCode();
  if (!ready) return <FullLoader />;
  if (!code) return <CodeGate onValid={save} />;
  return <Dashboard adminCode={code} onLogout={clear} />;
}

function FullLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-7 animate-spin text-primary" />
    </div>
  );
}

function CodeGate({ onValid }: { onValid: (code: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (c: string) => checkAdminCode({ data: { code: c } }),
    onSuccess: (_d, c) => onValid(c),
    onError: () => setError("Kaody mpitantana diso."),
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <Link to="/" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Miverina
      </Link>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Fidirana mpitantana</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ampidiro ny kaody fidiranao.</p>
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            mutation.mutate(value.trim());
          }}
        >
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="Kaody mpitantana"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={mutation.isPending || !value.trim()}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Miditra"}
          </Button>
        </form>
      </div>
    </main>
  );
}

function Dashboard({ adminCode, onLogout }: { adminCode: string; onLogout: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id?: string; name: string; accessCode: string; maxUsers: string } | null>(
    null,
  );
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["folders"], queryFn: () => fetchFolders() });

  const saveMutation = useMutation({
    mutationFn: (v: { id?: string; name: string; accessCode: string; maxUsers: number | null }) =>
      saveFolder({ data: { adminCode, ...v } }),

    onSuccess: () => {
      toast.success("Voarakitra ny dosie");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRow({ data: { adminCode, table: "folders", id } }),
    onSuccess: () => {
      toast.success("Voafafa ny dosie");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const folders = (data ?? []).filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const tiles = [
    { icon: BrainCircuit, label: "Fototra IA", hint: "Fahalalana", go: () => navigate({ to: "/admin/connaissances" }) },
    { icon: GraduationCap, label: "Quiz", hint: "Fitsapana", go: () => navigate({ to: "/admin/quiz" }) },
    { icon: Users, label: "Fanaraha-maso", hint: "Mpianatra", go: () => navigate({ to: "/admin/suivi" }) },
    { icon: MessageCircle, label: "Hafatra", hint: "Vondrona", go: () => navigate({ to: "/admin/messages" }) },
    { icon: Wallet, label: "Fandoavam-bola", hint: "Crédit", go: () => navigate({ to: "/admin/paiements" }) },
    { icon: LayoutDashboard, label: "Tabilao", hint: "Isa sy vola", go: () => navigate({ to: "/admin/tableau" }) },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-28 pt-5">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Fandraisana
      </Link>

      <header
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl px-5 py-5 text-primary-foreground"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide opacity-80">Fitantanana</p>
          <h1 className="truncate text-2xl font-bold">Tabilao fitantanana</h1>
        </div>
        <button
          onClick={onLogout}
          className="shrink-0 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium"
        >
          Miala
        </button>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(({ icon: Icon, label, hint, go }) => (
          <button
            key={label}
            onClick={go}
            className="flex flex-col items-start gap-2 rounded-3xl border border-border bg-card p-4 text-left transition-transform active:scale-[0.98]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span
              className="flex size-10 items-center justify-center rounded-2xl text-primary-foreground"
              style={{ background: "var(--gradient-accent)" }}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-semibold leading-tight">{label}</span>
            <span className="text-xs leading-tight text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>

      <h2 className="mt-7 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Dosie fampiofanana
      </h2>

      <div className="relative my-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Tadiavo ny dosie"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>


      {isLoading ? (
        <FullLoader />
      ) : folders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Tsy misy dosie ankehitriny.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {folders.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => navigate({ to: "/admin/$folderId", params: { folderId: f.id } })}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <Folder className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {f.protected ? (
                      <>
                        <Lock className="size-3" /> Voaaro
                      </>
                    ) : (
                      "Ampahibemaso"
                    )}
                  </span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Hanova"
                onClick={async () => {
                  try {
                    const sec = await fetchFolderSecurity({ data: { adminCode, folderId: f.id } });
                    setEditing({
                      id: f.id,
                      name: f.name,
                      accessCode: sec.accessCode,
                      maxUsers: sec.maxUsers === null ? "" : String(sec.maxUsers),
                    });
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <Pencil className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Hamafa"
                onClick={() => setToDelete({ id: f.id, name: f.name })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        className="fixed bottom-6 left-1/2 h-14 -translate-x-1/2 rounded-full px-6 text-base"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={() => setEditing({ name: "", accessCode: "", maxUsers: "" })}
      >
        <Plus className="mr-1 size-5" /> Dosie vaovao
      </Button>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Hanova ny dosie" : "Mamorona dosie"}</DialogTitle>
            <DialogDescription>
              Avelao banga ny kaody raha te hanao ny dosie ho ampahibemaso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Anaran'ny dosie</Label>
              <Input
                autoFocus
                value={editing?.name ?? ""}
                placeholder="Ohatra: Pinduoduo"
                onChange={(e) => setEditing((s) => (s ? { ...s, name: e.target.value } : s))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kaody fidirana (tsy voatery)</Label>
              <Input
                inputMode="numeric"
                value={editing?.accessCode ?? ""}
                placeholder="Ohatra: 123456"
                onChange={(e) => setEditing((s) => (s ? { ...s, accessCode: e.target.value } : s))}
              />
            </div>
            {editing?.accessCode.trim() ? (
              <div className="space-y-1.5">
                <Label>Isa mpianatra farany ambony (tsy voatery)</Label>
                <Input
                  inputMode="numeric"
                  value={editing?.maxUsers ?? ""}
                  placeholder="Ohatra: 12"
                  onChange={(e) =>
                    setEditing((s) => (s ? { ...s, maxUsers: e.target.value.replace(/[^0-9]/g, "") } : s))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Avelao banga raha tsy voafetra ny isan'ny mpianatra.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Aoka
            </Button>
            <Button
              disabled={!editing?.name.trim() || saveMutation.isPending}
              onClick={() =>
                editing &&
                saveMutation.mutate({
                  ...(editing.id ? { id: editing.id } : {}),
                  name: editing.name.trim(),
                  accessCode: editing.accessCode.trim(),
                  maxUsers: editing.maxUsers.trim() ? Number(editing.maxUsers.trim()) : null,
                })
              }
            >

              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Tehirizo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hofafana « {toDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ho fafana tanteraka ny bloc sy ny votoaty rehetra ao amin'ity dosie ity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Aoka</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}>
              Fafao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
