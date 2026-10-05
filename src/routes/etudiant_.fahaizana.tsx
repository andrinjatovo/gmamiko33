import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lightbulb, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { fetchMyContributions, submitContribution } from "@/lib/contrib.functions";

export const Route = createFileRoute("/etudiant_/fahaizana")({
  head: () => ({
    meta: [
      { title: "Zarao ny fahaizanao — GMAMIKO33" },
      { name: "description", content: "Zarao ny hevitrao sy ny fahaizanao momba ny fanafarana Chine → Madagasikara ho an'ny IA." },
      { property: "og:title", content: "Zarao ny fahaizanao — GMAMIKO33" },
      { property: "og:description", content: "Ampio ny base de connaissances an'ny Mpanampy Importation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { name, ready } = useStudentProfile();
  const qc = useQueryClient();
  const [kind, setKind] = useState<"hevitra" | "fahaizana">("hevitra");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["contribs", name],
    enabled: !!name,
    queryFn: () => fetchMyContributions({ data: { studentName: name! } }),
  });

  const send = async () => {
    if (!name) return;
    setBusy(true);
    try {
      await submitContribution({ data: { studentName: name, kind, title, content, tags } });
      toast.success("Voaray! Efa tafiditra ao amin'ny fahalalan'ny IA ny hevitrao.");
      setTitle("");
      setContent("");
      setTags("");
      qc.invalidateQueries({ queryKey: ["contribs", name] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nisy olana.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-12 pt-5">
      <Link to="/etudiant" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Espace mpianatra
      </Link>
      <header className="mb-5 rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="size-5" /> Zarao ny fahaizanao
        </div>
        <p className="mt-1 text-sm opacity-90">
          Ny hevitra sy traikefa alefanao dia lasa ampahany amin'ny fahalalan'ny Mpanampy Importation, ka hanampy ny mpianatra rehetra.
        </p>
      </header>

      {!ready ? null : !name ? (
        <p className="text-sm text-muted-foreground">Midira aloha ao amin'ny Espace mpianatra.</p>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="grid grid-cols-2 gap-2">
              {(["hevitra", "fahaizana"] as const).map((k) => (
                <Button key={k} type="button" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
                  {k === "hevitra" ? "Hevitra / Idée" : "Fahaizana / Compétence"}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t">Lohateny</Label>
              <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ohatra : Fomba hanamarinana mpivarotra 1688" maxLength={150} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c">Hazavao ny hevitrao na ny traikefanao</Label>
              <Textarea id="c" rows={7} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Soraty amin'ny antsipiriany : inona no nataonao, inona no vokany, torohevitra..." maxLength={5000} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g">Teny fanalahidy (sarahana amin'ny faingo)</Label>
              <Input id="g" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="1688, transitaire, akanjo" />
            </div>
            <Button className="w-full" onClick={send} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Alefaso
            </Button>
          </section>

          <h2 className="mb-2 mt-6 font-semibold">Ny zavatra nozarako</h2>
          {list.isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : !list.data?.length ? (
            <p className="text-sm text-muted-foreground">Mbola tsy nizara na inona na inona ianao.</p>
          ) : (
            <ul className="space-y-2">
              {list.data.map((r) => (
                <li key={r.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Lightbulb className="size-4 text-primary" /> {r.title}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.is_active ? "Ao amin'ny IA" : "Nesorin'ny admin"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{r.content}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
