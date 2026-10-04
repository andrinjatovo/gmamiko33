import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, requestAvatarUpload, saveAvatar, updateMyProfile } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/etudiant_/profil")({
  head: () => ({
    meta: [
      { title: "Ny mombamomba ahy — Sehatry mpianatra" },
      { name: "description", content: "Sary, anarana feno, taona, firenena, finday ary traikefa amin'ny fanafarana." },
      { property: "og:title", content: "Ny mombamomba ahy — GMAMIKO33" },
      { property: "og:description", content: "Fenoy ny mombamomba anao amin'ny fampiofanana fanafarana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

const empty = { full_name: "", age: "", gender: "", country: "Madagasikara", phone: "", level: "", import_years: "" };
const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function Profile() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });

  useEffect(() => {
    const p = data?.profile;
    if (!p) return;
    setF({
      full_name: p.full_name ?? "",
      age: p.age?.toString() ?? "",
      gender: p.gender ?? "",
      country: p.country ?? "Madagasikara",
      phone: p.phone ?? "",
      level: p.level ?? "",
      import_years: p.import_years?.toString() ?? "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateMyProfile({
        data: {
          ...f,
          age: f.age === "" ? null : Number(f.age),
          import_years: f.import_years === "" ? null : Number(f.import_years),
        },
      }),
    onSuccess: () => {
      toast.success("Voatahiry ny mombamomba anao");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { path, token } = await requestAvatarUpload({ data: { fileName: file.name } });
      const { error: e } = await supabase.storage.from("media").uploadToSignedUrl(path, token, file);
      if (e) throw new Error(e.message);
      await saveAvatar({ data: { path } });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Voaova ny sary");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-10 pt-5">
      <Link to="/etudiant" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Sehatry mpianatra
      </Link>
      <h1 className="mb-4 text-2xl font-bold">Ny mombamomba ahy</h1>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-7 animate-spin text-primary" /></div>
      ) : error || !data?.profile ? (
        <p className="text-sm text-destructive">Midira aloha ao amin'ny sehatry mpianatra.</p>
      ) : (
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-primary"
              aria-label="Ovay ny sary"
            >
              {data.avatarUrl ? <img src={data.avatarUrl} alt="Sary" className="size-full object-cover" /> : <UserRound className="size-9" />}
              <span className="absolute bottom-0 right-0 rounded-full bg-primary p-1 text-primary-foreground">
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate font-semibold">{data.profile.display_name}</p>
              <p className="truncate text-xs text-muted-foreground">{data.profile.email}</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x); e.target.value = ""; }} />
          </div>

          <div className="grid gap-1.5"><Label>Anarana feno</Label><Input value={f.full_name} onChange={set("full_name")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Taona</Label><Input type="number" inputMode="numeric" value={f.age} onChange={set("age")} /></div>
            <div className="grid gap-1.5">
              <Label>Lahy / Vavy</Label>
              <select className={sel} value={f.gender} onChange={set("gender")}>
                <option value="">—</option><option value="lahy">Lahy</option><option value="vavy">Vavy</option><option value="hafa">Hafa</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Firenena</Label><Input value={f.country} onChange={set("country")} /></div>
            <div className="grid gap-1.5"><Label>Finday</Label><Input type="tel" value={f.phone} onChange={set("phone")} placeholder="034 00 000 00" /></div>
          </div>
          <div className="grid gap-1.5">
            <Label>Ambaratonga</Label>
            <div className="grid grid-cols-2 gap-2">
              {([["debutant", "Vao manomboka"], ["expert", "Efa manam-pahaizana"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => setF({ ...f, level: v })}
                  className={`rounded-xl border p-3 text-sm font-medium ${f.level === v ? "border-primary bg-accent text-primary" : "border-border"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Firy taona no nanombohanao fanafarana?</Label>
            <Input type="number" inputMode="numeric" value={f.import_years} onChange={set("import_years")} placeholder="0" />
          </div>
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Tehirizo
          </Button>
        </div>
      )}
    </main>
  );
}
