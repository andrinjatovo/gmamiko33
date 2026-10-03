import { useEffect, useState, type ReactNode } from "react";
import { Ban, Loader2, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession, setStudentName } from "@/lib/student-auth.functions";
import { getDeviceHash } from "@/lib/device-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = { display_name: string | null; blocked: boolean; block_reason: string | null; email: string };

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">{icon}</div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}

/** Inscription email + code, contrôle « 1 téléphone = 1 compte », puis choix du pseudo. */
export function StudentAuthGate({ onReady, onSignedOut }: { onReady: (name: string) => void; onSignedOut: () => void }) {
  const [state, setState] = useState<"loading" | "email" | "code" | "name" | "blocked">("loading");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      onSignedOut();
      setState("email");
      return;
    }
    try {
      const p = await getStudentSession({ data: { deviceHash: getDeviceHash() } });
      setProfile(p);
      if (p.blocked) setState("blocked");
      else if (!p.display_name) setState("name");
      else onReady(p.display_name);
    } catch (e) {
      toast.error((e as Error).message);
      setState("email");
    }
  };

  useEffect(() => {
    load();
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_IN") load();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/etudiant` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Nalefa tany amin'ny mailaka ny kaody");
      setState("code");
    }
  };

  const verify = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) toast.error("Kaody diso na lany daty.");
  };

  const saveName = async () => {
    setBusy(true);
    try {
      const p = await setStudentName({ data: { deviceHash: getDeviceHash(), name } });
      setProfile(p);
      if (p.blocked) setState("blocked");
      else if (p.display_name) onReady(p.display_name);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );

  if (state === "blocked")
    return (
      <Card icon={<Ban className="size-6 text-destructive" />} title="Kaonty voasakana">
        <p className="mt-2 text-sm text-muted-foreground">{profile?.block_reason ?? "Voasakana ity kaonty ity."}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Kaonty iray ihany no azo atao isaky ny finday. Mifandraisa amin'ny mpitantana raha diso izany.
        </p>
        <Button variant="outline" className="mt-5 w-full" onClick={() => supabase.auth.signOut().then(() => setState("email"))}>
          Hivoaka
        </Button>
      </Card>
    );

  if (state === "name")
    return (
      <Card icon={<UserRound className="size-6" />} title="Safidio ny anaranao">
        <p className="mt-1 text-sm text-muted-foreground">Io no hiseho amin'ny fampiofanana. Tsy azo ovaina intsony.</p>
        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
          <Label>Anarana na anaram-pihaonana</Label>
          <Input autoFocus placeholder="Ohatra : Miora" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy || name.trim().length < 2}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Manohy
          </Button>
        </form>
      </Card>
    );

  return (
    <Card icon={<Mail className="size-6" />} title={state === "email" ? "Fisoratana anarana" : "Ampidiro ny kaody"}>
      {state === "email" ? (
        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); sendCode(); }}>
          <p className="text-sm text-muted-foreground">Ampidiro ny mailakao. Handefasanay kaody fanamarinana ianao.</p>
          <Label>Mailaka (email)</Label>
          <Input type="email" autoFocus required placeholder="anarana@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy || !/\S+@\S+\.\S+/.test(email)}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Andefaso kaody
          </Button>
        </form>
      ) : (
        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <p className="text-sm text-muted-foreground">
            Jereo ny boaty mailaka <b>{email}</b> (sy ny Spam). Ampidiro ny kaody, na tsindrio ny rohy ao anaty mailaka.
          </p>
          <Input inputMode="numeric" autoFocus placeholder="123456" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Hamarino
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setState("email")}>
            Hanova mailaka / handefa indray
          </Button>
        </form>
      )}
    </Card>
  );
}
