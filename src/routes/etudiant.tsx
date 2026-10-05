import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, Folder, GraduationCap, LayoutDashboard, Loader2, Lock, MessageCircle, PackageSearch, Receipt, Search, ShoppingCart, UserRound } from "lucide-react";
import { fetchFolders } from "@/lib/content.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { CreditBadge } from "@/components/CreditBadge";
import { PaywallDialog } from "@/components/PaywallDialog";
import { StudentAuthGate } from "@/components/StudentAuthGate";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/etudiant")({
  head: () => ({
    meta: [
      { title: "Sehatry mpianatra — Fanafarana avy any Shina ho any Madagasikara" },
      { name: "description", content: "Kojia, mpanampy IA, famakafakana vokatra, fanadinana ary fifandraisana amin'ny fampiofanana fanafarana." },
      { property: "og:title", content: "Sehatry mpianatra — Fanafarana avy any Shina ho any Madagasikara" },
      { property: "og:description", content: "Kojia, mpanampy IA, famakafakana vokatra, fanadinana ary hafatra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const { save, clear } = useStudentProfile();
  const [verified, setVerified] = useState<string | null>(null);

  if (!verified) {
    return (
      <StudentAuthGate
        onReady={(n) => {
          save(n);
          setVerified(n);
        }}
        onSignedOut={clear}
      />
    );
  }

  return (
    <StudentFolders
      studentName={verified}
      onSwitchProfile={async () => {
        await supabase.auth.signOut();
        clear();
        setVerified(null);
      }}
    />
  );
}

function StudentFolders({ studentName, onSwitchProfile }: { studentName: string; onSwitchProfile: () => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState<{ id: string; name: string } | null>(null);
  const [codeValue, setCodeValue] = useState("");
  const [paywall, setPaywall] = useState(false);

  const { data, isLoading, error } = useQuery({ queryKey: ["folders"], queryFn: () => fetchFolders() });
  const folders = (data ?? []).filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const open = (f: { id: string; name: string; protected: boolean }) => {
    if (f.protected) {
      setCodeValue("");
      setLocked({ id: f.id, name: f.name });
    } else {
      navigate({ to: "/etudiant/$folderId", params: { folderId: f.id }, search: { code: "" } });
    }
  };

  const tiles = [
    {
      icon: Bot,
      label: "Mpanampy Fanafarana",
      hint: "Ny fanontanianao Shina → Mada",
      go: () => navigate({ to: "/etudiant/assistant" }),
    },
    {
      icon: PackageSearch,
      label: "Famakafakana vokatra",
      hint: "Tombom-barotra sy fanapahan-kevitra",
      go: () => navigate({ to: "/etudiant/analyse" }),
    },
    {
      icon: GraduationCap,
      label: "Fanadinana",
      hint: "Andramo ny fahalalanao",
      go: () => navigate({ to: "/etudiant/quiz" }),
    },
    {
      icon: MessageCircle,
      label: "Hafatra",
      hint: "Vondron'ny fampiofanana",
      go: () => navigate({ to: "/etudiant/messages" }),
    },
    {
      icon: LayoutDashboard,
      label: "Ny fandrosoako",
      hint: "Crédit, quiz, famakafakana",
      go: () => navigate({ to: "/etudiant/tableau" }),
    },
    {
      icon: UserRound,
      label: "Ny mombamomba ahy",
      hint: "Sary, anarana, traikefa",
      go: () => navigate({ to: "/etudiant/profil" }),
    },
    {
      icon: Receipt,
      label: "Tantaran'ny fividianana",
      hint: "Ny crédit novidiko",
      go: () => navigate({ to: "/etudiant/commandes" }),
    },
    {
      icon: GraduationCap,
      label: "Zarao ny fahaizanao",
      hint: "Hevitra sy traikefa ho an'ny IA",
      go: () => navigate({ to: "/etudiant/fahaizana" }),
    },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-5">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Fandraisana
      </Link>

      <header
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl px-5 py-5 text-primary-foreground"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide opacity-80">Sehatry mpianatra</p>
          <h1 className="truncate text-2xl font-bold">Manao ahoana {studentName}</h1>
        </div>
        <button
          onClick={onSwitchProfile}
          className="shrink-0 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium"
        >
          Ovay
        </button>
      </header>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-sm text-muted-foreground">Crédit IA</p>
          <CreditBadge studentName={studentName} onClick={() => setPaywall(true)} />
        </div>
        <Button size="sm" onClick={() => setPaywall(true)}>
          <ShoppingCart className="mr-1.5 size-4" /> Hividy crédit
        </Button>
      </div>
      <PaywallDialog studentName={studentName} open={paywall} onOpenChange={setPaywall} />

      <div className="mt-4 grid grid-cols-2 gap-3">
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
        Ny fampiofanako
      </h2>

      <div className="relative my-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Hitady dosie"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>


      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Tsy afaka naka ny dosie.</p>
      ) : folders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Tsy misy dosie azo jerena.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {folders.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => open(f)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-transform active:scale-[0.98]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <Folder className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {f.protected ? (
                      <>
                        <Lock className="size-3" /> Mila kaody
                      </>
                    ) : (
                      "Tsy misy fameperana"
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!locked} onOpenChange={(o) => !o && setLocked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ampidiro ny kaody fidirana</DialogTitle>
            <DialogDescription>Dosie voaro : {locked?.name}</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            type="password"
            inputMode="numeric"
            placeholder="Kaodin'ny dosie"
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLocked(null)}>
              Aoka ihany
            </Button>
            <Button
              disabled={!codeValue.trim()}
              onClick={() =>
                locked &&
                navigate({
                  to: "/etudiant/$folderId",
                  params: { folderId: locked.id },
                  search: { code: codeValue.trim() },
                })
              }
            >
              Sokafy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
