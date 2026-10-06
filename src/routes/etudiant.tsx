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

  const tools = [
    { icon: PackageSearch, label: "Famakafakana vokatra", hint: "Vidiny, fitaterana, tombony", tone: "var(--gradient-accent)", go: () => navigate({ to: "/etudiant/analyse" }) },
    { icon: LayoutDashboard, label: "Ny fandrosoako", hint: "Crédit, quiz, famakafakana", tone: "var(--gradient-mada)", go: () => navigate({ to: "/etudiant/tableau" }) },
    { icon: Receipt, label: "Tantaran'ny fividianana", hint: "Ny crédit novidiko", tone: "var(--gradient-china)", go: () => navigate({ to: "/etudiant/commandes" }) },
    { icon: UserRound, label: "Ny mombamomba ahy", hint: "Sary, anarana, traikefa", tone: "var(--gradient-mada)", go: () => navigate({ to: "/etudiant/profil" }) },
  ];
  const learn = [
    { icon: GraduationCap, label: "Fanadinana", hint: "Andramo ny fahalalanao", go: () => navigate({ to: "/etudiant/quiz" }) },
    { icon: MessageCircle, label: "Hafatra", hint: "Vondron'ny fampiofanana", go: () => navigate({ to: "/etudiant/messages" }) },
    { icon: Lightbulb, label: "Zarao ny fahaizanao", hint: "Hevitra ho an'ny IA", go: () => navigate({ to: "/etudiant/fahaizana" }) },
  ];

  const dash = useQuery({
    queryKey: ["student-dashboard", studentName],
    queryFn: () => studentDashboard({ data: { studentName } }),
  });
  const d = dash.data;
  const stats = [
    { icon: Coins, label: "Crédit IA", value: d ? (d.credits > 0 ? d.credits : d.freeUsed ? 0 : "1 free") : "…", onClick: () => setPaywall(true) },
    { icon: PackageSearch, label: "Famakafakana", value: d?.analysesCount ?? "…" },
    { icon: TrendingUp, label: "Quiz", value: d ? `${d.quizPct}%` : "…" },
    { icon: Bot, label: "Resaka", value: d?.lastConversations.length ?? "…" },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-6 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="text-china">Shina</span> <span className="text-primary">→</span> <span className="text-mada">Madagasikara</span>
          </p>
          <h1 className="truncate text-xl font-bold">Manao ahoana {studentName}</h1>
          <p className="text-xs text-muted-foreground">Mpanampy Business Fanafarana</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CreditBadge studentName={studentName} onClick={() => setPaywall(true)} />
          <button onClick={onSwitchProfile} className="pressable rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
            Ovay
          </button>
        </div>
      </header>
      <PaywallDialog studentName={studentName} open={paywall} onOpenChange={setPaywall} />

      {/* Assistant IA mis en avant */}
      <section
        className="animate-rise relative mt-4 overflow-hidden rounded-3xl border border-border p-5"
        style={{ background: "var(--gradient-ai)", boxShadow: "var(--shadow-glow)" }}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
            <Bot className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold">Mpanampy Fanafarana IA</p>
            <p className="text-sm text-muted-foreground">Anontanio izay tianao momba ny business fanafarana Shina → Mada.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="pressable" onClick={() => navigate({ to: "/etudiant/assistant" })}>
            <Sparkles className="mr-1.5 size-4" /> Hanontany ny mpanampy
          </Button>
          <Button variant="secondary" className="pressable" onClick={() => setPaywall(true)}>
            <ShoppingCart className="mr-1.5 size-4" /> Hividy crédit
          </Button>
        </div>
      </section>

      <SectionTitle>Ny asako</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {stats.map(({ icon: Icon, label, value, onClick }, i) => (
          <button
            key={label}
            onClick={onClick}
            disabled={!onClick}
            className="animate-rise pressable rounded-2xl border border-border bg-card p-2.5 text-left"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Icon className="size-4 text-primary" />
            <p className="mt-1.5 truncate text-base font-bold">{value}</p>
            <p className="truncate text-[10px] text-muted-foreground">{label}</p>
          </button>
        ))}
      </div>

      <SectionTitle>Fitaovana fanafarana</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {tools.map(({ icon: Icon, label, hint, tone, go }, i) => (
          <button
            key={label}
            onClick={go}
            className="animate-rise pressable flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
            style={{ boxShadow: "var(--shadow-card)", animationDelay: `${i * 40}ms` }}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground" style={{ background: tone }}>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      <SectionTitle>Mianatra</SectionTitle>
      <div className="grid grid-cols-3 gap-2.5">
        {learn.map(({ icon: Icon, label, hint, go }) => (
          <button key={label} onClick={go} className="pressable flex flex-col items-start gap-1.5 rounded-2xl border border-border bg-card p-3 text-left">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </span>
            <span className="text-xs font-semibold leading-tight">{label}</span>
            <span className="text-[10px] leading-tight text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Ny fampiofanako</SectionTitle>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="bg-card pl-9"
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
