import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const adminSchema = z.object({ adminCode: z.string().min(1).max(256) });

export const requestPasswordRecovery = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: emailSchema }))
  .handler(async ({ data }) => {
    const secret = process.env['PASSWORD_RECOVERY_KEY'];
    if (!secret) throw new Error("Tsy mbola vonona ny fanarenana tenimiafina.");
    const c = await import("./password-recovery.crypto");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const code = c.generateRecoveryCode();
    const { error } = await db.rpc("request_password_reset", {
      p_id: crypto.randomUUID(), p_email: data.email,
      p_hash: await c.recoveryHash(secret, `code:${data.email}:${code}`),
      p_cipher: await c.encryptRecoveryCode(secret, code, data.email),
    });
    if (error) throw new Error(error.message.includes("Miandrasa") || error.message.includes("Efa eo") ? error.message : "Tsy voaray ny fangatahana. Andramo indray.");
    return { ok: true };
  });

export const verifyPasswordRecovery = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) }))
  .handler(async ({ data }) => {
    const secret = process.env['PASSWORD_RECOVERY_KEY'];
    if (!secret) throw new Error("Tsy mbola vonona ny fanarenana tenimiafina.");
    const c = await import("./password-recovery.crypto");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const grant = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const { data: valid, error } = await db.rpc("verify_password_reset", {
      p_email: data.email, p_hash: await c.recoveryHash(secret, `code:${data.email}:${data.code}`),
      p_grant: await c.recoveryHash(secret, `grant:${data.email}:${grant}`),
    });
    if (error || !valid) throw new Error("Kaody diso, efa nampiasaina, lany daty na voasakana rehefa diso in-5. Mangataha kaody vaovao.");
    return { grant };
  });

export const completePasswordRecovery = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: emailSchema, grant: z.string().min(60).max(100), password: z.string().min(6).max(128), confirm: z.string().max(128) }).refine(d => d.password === d.confirm, "Tsy mitovy ny tenimiafina roa."))
  .handler(async ({ data }) => {
    const secret = process.env['PASSWORD_RECOVERY_KEY'];
    if (!secret) throw new Error("Tsy mbola vonona ny fanarenana tenimiafina.");
    const c = await import("./password-recovery.crypto");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const hash = await c.recoveryHash(secret, `grant:${data.email}:${data.grant}`);
    const { data: userId, error } = await db.rpc("claim_password_reset", { p_email: data.email, p_grant: hash });
    if (error || !userId) throw new Error("Lany daty na efa nampiasaina ny fanamarinana. Mangataha kaody vaovao.");
    const { error: updateError } = await db.auth.admin.updateUserById(userId, { password: data.password });
    if (updateError) {
      await db.from("password_reset_requests").update({ status: "verified" }).eq("grant_hash", hash).eq("status", "processing");
      throw new Error("Tsy voaova ny tenimiafina. Mifidiana tenimiafina matanjaka hafa dia andramo indray.");
    }
    const { error: finishError } = await db.from("password_reset_requests")
      .update({ status: "used", used_at: new Date().toISOString(), grant_hash: null, code_ciphertext: null })
      .eq("grant_hash", hash).eq("status", "processing");
    // A processing row is already non-replayable even if the final audit write fails.
    if (finishError) console.error("Password recovery audit finalization failed");
    return { ok: true };
  });

export const adminPasswordRecoveries = createServerFn({ method: "POST" })
  .inputValidator(adminSchema)
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./content.server");
    assertAdmin(data.adminCode);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await db.from("password_reset_requests")
      .select("id,email,created_at,expires_at,status,attempts,handled_at").not("user_id", "is", null)
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Tsy azo vakina ny fangatahana.");
    return rows ?? [];
  });

export const adminRevealRecoveryCode = createServerFn({ method: "POST" })
  .inputValidator(adminSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./content.server");
    assertAdmin(data.adminCode);
    const secret = process.env['PASSWORD_RECOVERY_KEY'];
    if (!secret) throw new Error("Tsy mbola vonona ny fanarenana tenimiafina.");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: row } = await db.from("password_reset_requests").select("email,code_ciphertext,status,expires_at").eq("id", data.id).single();
    if (!row?.code_ciphertext || !["pending", "handled"].includes(row.status) || Date.parse(row.expires_at) <= Date.now()) throw new Error("Tsy misy kaody manankery intsony. Mangataha fangatahana vaovao.");
    const c = await import("./password-recovery.crypto");
    return { code: await c.decryptRecoveryCode(secret, row.code_ciphertext, row.email) };
  });

export const adminMarkRecoveryHandled = createServerFn({ method: "POST" })
  .inputValidator(adminSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./content.server");
    assertAdmin(data.adminCode);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db.from("password_reset_requests").update({ status: "handled", handled_at: new Date().toISOString() }).eq("id", data.id).eq("status", "pending").gt("expires_at", new Date().toISOString());
    if (error) throw new Error("Tsy voatahiry ny fanovana.");
    return { ok: true };
  });