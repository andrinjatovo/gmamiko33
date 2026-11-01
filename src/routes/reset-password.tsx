import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Tenimiafina vaovao — GMAMIKO33" },
      { name: "description", content: "Manaova tenimiafina vaovao ho an'ny kaonty mpianatra." },
      { property: "og:title", content: "Tenimiafina vaovao — GMAMIKO33" },
      { property: "og:description", content: "Fanarenana tenimiafina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Lien de récupération : Supabase met type=recovery dans le hash et crée une session.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery") {
      setReady(true);
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "PASSWORD_RECOVERY") setReady(true);
    });
    const t = setTimeout(() => setInvalid((v) => (ready ? v : true)), 4000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (password !== confirm) {
      toast.error("Tsy mitovy ny tenimiafina roa.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else setDone(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
          {done ? <CheckCircle2 className="size-6" /> : <KeyRound className="size-6" />}
        </div>
        <h1 className="text-xl font-semibold">Tenimiafina vaovao</h1>

        {done ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Voavaly ny tenimiafinao. Afaka miditra ianao izao.</p>
            <Button asChild className="mt-5 w-full">
              <Link to="/etudiant">Se connecter</Link>
            </Button>
          </>
        ) : invalid && !ready ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Tsy mety na efa lany daty ity rohy ity. Mangatava rohy vaovao avy amin'ny « Mot de passe oublié ? ».
            </p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link to="/etudiant">Miverina</Link>
            </Button>
          </>
        ) : !ready ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="space-y-1.5">
              <Label>Tenimiafina vaovao</Label>
              <Input
                type="password"
                autoFocus
                required
                minLength={6}
                placeholder="Farafahakeliny 6 litera"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Avereno ny tenimiafina</Label>
              <Input
                type="password"
                required
                minLength={6}
                placeholder="Soraty indray"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-destructive">Tsy mitovy ny tenimiafina roa.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy || password.length < 6 || password !== confirm}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Tehirizo
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
