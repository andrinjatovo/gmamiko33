import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MULTI = "Kaonty maromaro tamin'ny finday iray — voasakana mandrakizay.";

function cleanHash(h: string) {
  const v = String(h ?? "").trim();
  if (!/^[a-f0-9]{16,128}$/i.test(v)) throw new Error("Finday tsy fantatra.");
  return v.toLowerCase();
}

/** Vérifie le téléphone + renvoie le profil. Bloque si un autre compte existe déjà sur ce téléphone. */
async function checkDevice(userId: string, email: string, deviceHash: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  await db.from("student_profiles").upsert({ user_id: userId, email }, { onConflict: "user_id", ignoreDuplicates: true });

  const { data: others } = await db
    .from("student_devices")
    .select("user_id")
    .eq("device_hash", deviceHash)
    .neq("user_id", userId)
    .limit(1);

  if (others && others.length) {
    await db.from("student_profiles").update({ blocked: true, block_reason: MULTI }).eq("user_id", userId);
  } else {
    await db.from("student_devices").upsert({ device_hash: deviceHash, user_id: userId }, { onConflict: "device_hash,user_id", ignoreDuplicates: true });
  }

  const { data: p } = await db
    .from("student_profiles")
    .select("display_name, blocked, block_reason, email")
    .eq("user_id", userId)
    .single();
  return p!;
}

export const getStudentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { deviceHash: string }) => ({ deviceHash: cleanHash(d.deviceHash) }))
  .handler(async ({ data, context }) => {
    const email = String(context.claims.email ?? "");
    return checkDevice(context.userId, email, data.deviceHash);
  });

export const setStudentName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { deviceHash: string; name: string }) => {
    const name = String(d.name ?? "").trim().slice(0, 60);
    if (name.length < 2) throw new Error("Fohy loatra ny anarana.");
    return { deviceHash: cleanHash(d.deviceHash), name };
  })
  .handler(async ({ data, context }) => {
    const p = await checkDevice(context.userId, String(context.claims.email ?? ""), data.deviceHash);
    if (p.blocked) return p;
    if (p.display_name) return p;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await db.from("student_profiles").select("user_id").ilike("display_name", data.name).limit(1);
    const { data: legacy } = await db.from("student_accounts").select("id").eq("student_name", data.name).limit(1);
    if ((taken && taken.length) || (legacy && legacy.length)) throw new Error("Efa misy mampiasa io anarana io. Safidio hafa.");
    const { error } = await db.from("student_profiles").update({ display_name: data.name }).eq("user_id", context.userId);
    if (error) throw new Error("Efa misy mampiasa io anarana io. Safidio hafa.");
    return { ...p, display_name: data.name };
  });

/* ------------------------------ Admin ------------------------------ */

export const adminListStudentProfiles = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await db
      .from("student_profiles")
      .select("user_id, email, display_name, blocked, block_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminSetBlocked = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; userId: string; blocked: boolean }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await db
      .from("student_profiles")
      .update({ blocked: data.blocked, block_reason: data.blocked ? "Nosakanan'ny mpitantana." : null })
      .eq("user_id", data.userId);
    if (!data.blocked) await db.from("student_devices").delete().eq("user_id", data.userId);
    return { ok: true };
  });
