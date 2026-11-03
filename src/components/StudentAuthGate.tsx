import { useEffect, useState, type ReactNode } from "react";
import { Ban, Hourglass, KeyRound, Loader2, Mail, MessageCircle, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession, setStudentName } from "@/lib/student-auth.functions";
import { getDeviceHash } from "@/lib/device-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  display_name: string | null;
  blocked: boolean;
  block_reason: string | null;
  email: string;
  validation_status: string;
};
type State = "loading" | "auth" | "forgot" | "name" | "blocked" | "pending" | "rejected";

const EMAIL_RE = /\S+@\S+\.\S+/;

const WHATSAPP_URL =
  "https://wa.me/8613025110873?text=Salama%20tompoko%2C%20MBA%20Mila%20fanampiana%20Manokana%20aho%2C%20Nanao%20inscription%20tao%20amin%27ny%20application%20fa%20tsy%20Mbola%20voamarina%20hatramin%27izao";

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

function WhatsappHelp() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <MessageCircle className="size-4 text-[oklch(0.66_0.15_155)]" />
      Mila fanampiana? Mifandraisa aminay amin'ny WhatsApp
    </a>
  );
}

/** Connexion / inscription email + mot de passe, validation manuelle par l'Admin, contrôle « 1 téléphone = 1 compte », puis choix du pseudo. */
export function StudentAuthGate({ onReady, onSignedOut }: { onReady: (name: string) => void; onSignedOut: () => void }) {
  const [state, setState] = useState<State>("loading");
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const applyProfile = (p: Profile) => {
    setProfile(p);
    if (p.blocked) setState("blocked");
    else if (p.validation_status === "rejected") setState("rejected");
    else if (p.validation_status !== "approved") setState("pending");
    else if (!p.display_name) setState("name");
    else onReady(p.display_name);
  };

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      onSignedOut();
      setState("auth");
      return;
    }
    try {
      const p = await getStudentSession({ data: { deviceHash: getDeviceHash() } });
      applyProfile(p);
    } catch (e) {
      toast.error((e as Error).message);
      setState("auth");
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

  const login = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) toast.error("Mailaka na tenimiafina diso. Andramo indray.");
  };

  const signup = async () => {
    if (password !== confirm) {
      toast.error("Tsy mitovy ny tenimiafina roa.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/etudiant` },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("already") ? "Efa misy kaonty amin'io mailaka io. Se connecter kely." : error.message);
      return;
    }
    if (data.session) load();
    else setState("pending");
  };

  const forgot = async () => {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Nalefa tany amin'ny mailaka ny rohy fanarenana.");
      setState("auth");
    }
  };

  const saveName = async () => {
    setBusy(true);
    try {
      const p = await setStudentName({ data: { deviceHash: getDeviceHash(), name } });
      applyProfile(p);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => supabase.auth.signOut().then(() => setState("auth"));

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
        <Button variant="outline" className="mt-5 w-full" onClick={signOut}>
          Hivoaka
        </Button>
        <WhatsappHelp />
      </Card>
    );

  if (state === "pending")
    return (
      <Card icon={<Hourglass className="size-6" />} title="Miandry fanamarinana">
        <p className="mt-2 text-sm text-muted-foreground">
          Vita ny fisoratana anaranao. Miandry ny fanamarinana avy amin'ny Admin ianao.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Rehefa eken'ny Admin ny kaontinao dia afaka miditra sy mampiasa ny fampiharana ianao.
        </p>
        <Button className="mt-5 w-full" disabled={busy} onClick={() => { setBusy(true); load().finally(() => setBusy(false)); }}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Hamarino indray
        </Button>
        <Button variant="outline" className="mt-2 w-full" onClick={signOut}>
          Hivoaka
        </Button>
        <WhatsappHelp />
      </Card>
    );

  if (state === "rejected")
    return (
      <Card icon={<XCircle className="size-6 text-destructive" />} title="Tsy nekena ny fisoratana">
        <p className="mt-2 text-sm text-muted-foreground">
          Miala tsiny fa tsy neken'ny Admin ny fisoratana anaranao, ka tsy afaka mampiasa ity fampiharana ity ianao.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Raha hevitrao fa diso izany dia mifandraisa aminay amin'ny WhatsApp.
        </p>
        <Button variant="outline" className="mt-5 w-full" onClick={signOut}>
          Hivoaka
        </Button>
        <WhatsappHelp />
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

  if (state === "forgot")
    return (
      <Card icon={<KeyRound className="size-6" />} title="Tenimiafina adino?">
        <p className="mt-1 text-sm text-muted-foreground">
          Ampidiro ny mailakao. Handefasanay rohy hamoronana tenimiafina vaovao ianao.
        </p>
        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); forgot(); }}>
          <Label>Mailaka (email)</Label>
          <Input type="email" autoFocus required placeholder="anarana@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy || !EMAIL_RE.test(email)}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Alefaso ny rohy
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setState("auth")}>
            ← Miverina amin'ny Se connecter
          </Button>
        </form>
      </Card>
    );

  const validLogin = EMAIL_RE.test(email) && password.length >= 6;
  const validSignup = validLogin && confirm.length > 0 && password === confirm;

  return (
    <Card icon={<Mail className="size-6" />} title="Sehatry mpianatra">
      {/* Deux choix : Se connecter / Inscription */}
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["login", "signup"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`pressable rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {k === "login" ? "Se connecter" : "Inscription"}
          </button>
        ))}
      </div>

      <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); tab === "login" ? login() : signup(); }}>
        <div className="space-y-1.5">
          <Label>Mailaka (email)</Label>
          <Input type="email" autoFocus required placeholder="anarana@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Tenimiafina (mot de passe)</Label>
          <Input
            type="password"
            required
            minLength={6}
            placeholder="Farafahakeliny 6 litera"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {tab === "signup" && (
          <div className="space-y-1.5">
            <Label>Avereno ny tenimiafina</Label>
            <Input
              type="password"
              required
              minLength={6}
              placeholder="Soraty indray ny tenimiafina"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-destructive">Tsy mitovy ny tenimiafina roa.</p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={busy || (tab === "login" ? !validLogin : !validSignup)}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {tab === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>

        {tab === "login" ? (
          <>
            <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setState("forgot")}>
              Mot de passe oublié ?
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Mbola tsy manana kaonty?{" "}
              <button type="button" className="font-semibold text-primary" onClick={() => setTab("signup")}>
                Inscription
              </button>
            </p>
          </>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Efa manana kaonty?{" "}
            <button type="button" className="font-semibold text-primary" onClick={() => setTab("login")}>
              Se connecter
            </button>
          </p>
        )}
      </form>
      <WhatsappHelp />
    </Card>
  );
}
