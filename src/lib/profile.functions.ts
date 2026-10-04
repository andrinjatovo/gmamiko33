import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FIELDS = "email, display_name, full_name, age, gender, country, phone, level, import_years, avatar_path";

export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data } = await db.from("student_profiles").select(FIELDS).eq("user_id", context.userId).maybeSingle();
    let avatarUrl: string | null = null;
    if (data?.avatar_path) {
      const { data: s } = await db.storage.from("media").createSignedUrl(data.avatar_path, 3600);
      avatarUrl = s?.signedUrl ?? null;
    }
    return { profile: data, avatarUrl };
  });

type ProfileInput = {
  full_name: string;
  age: number | null;
  gender: string;
  country: string;
  phone: string;
  level: string;
  import_years: number | null;
};

const txt = (v: unknown, n = 120) => {
  const s = String(v ?? "").trim().slice(0, n);
  return s || null;
};
const num = (v: unknown, max: number) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error("Isa tsy mety.");
  return n;
};

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ProfileInput) => {
    const level = d.level === "expert" ? "expert" : d.level === "debutant" ? "debutant" : null;
    const gender = ["lahy", "vavy", "hafa"].includes(d.gender) ? d.gender : null;
    return {
      full_name: txt(d.full_name),
      age: num(d.age, 120),
      gender,
      country: txt(d.country, 60),
      phone: txt(d.phone, 30),
      level,
      import_years: num(d.import_years, 80),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db.from("student_profiles").update(data).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestAvatarUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fileName: string }) => d)
  .handler(async ({ data, context }) => {
    const ext = (data.fileName.split(".").pop() ?? "").toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(ext)) throw new Error("Sary ihany no ekena.");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const path = `avatars/${context.userId}/${Date.now()}.${ext}`;
    const { data: s, error } = await db.storage.from("media").createSignedUploadUrl(path);
    if (error || !s) throw new Error(error?.message ?? "Tsy afaka nampiakatra.");
    return { path, token: s.token };
  });

export const saveAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`avatars/${context.userId}/`)) throw new Error("Lalana tsy mety.");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await db.from("student_profiles").update({ avatar_path: data.path }).eq("user_id", context.userId);
    return { ok: true };
  });

/** Historique des achats de l'étudiant connecté. */
export const getMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: p } = await db.from("student_profiles").select("display_name").eq("user_id", context.userId).maybeSingle();
    if (!p?.display_name) return [];
    const { data, error } = await db
      .from("payment_requests")
      .select("id, plan_id, messages, amount_ar, status, admin_note, created_at, reviewed_at")
      .eq("student_name", p.display_name)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
