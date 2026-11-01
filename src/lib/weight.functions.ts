import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Résout le pseudo de l'étudiant connecté (jamais depuis le client). */
async function resolveStudent(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("student_profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.display_name)
    throw new Error("Midira ao amin'ny sehatry mpianatra aloha, ary fenoy ny anaranao.");
  return data.display_name as string;
}

export const searchWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) => ({ query: String(d?.query ?? "").slice(0, 200) }))
  .handler(async ({ data, context }) => {
    const name = await resolveStudent(context.userId);
    const [{ withCredit }, m] = await Promise.all([import("./billing.server"), import("./weight.server")]);
    return withCredit(name, () => m.searchWeightVolume(data.query), "weight_search", context.userId);
  });

export const estimateWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { product: string }) => ({ product: String(d?.product ?? "").slice(0, 200) }))
  .handler(async ({ data, context }) => {
    const name = await resolveStudent(context.userId);
    const [{ withCredit }, m] = await Promise.all([import("./billing.server"), import("./weight.server")]);
    return withCredit(name, () => m.estimateWeightVolume(data.product), "weight_estimate", context.userId);
  });
