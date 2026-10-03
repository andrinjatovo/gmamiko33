// Paywall : essai gratuit, crédits de messages, paiement manuel par capture d'écran.
// Module serveur uniquement.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signUrl } from "./content.server";
import { PLANS, PAYWALL_CODE, type PlanId } from "./billing.plans";

export type PaymentStatus = "none" | "pending" | "approved" | "rejected";

function normName(name: string) {
  const n = name.trim().slice(0, 60);
  if (!n) throw new Error("Mila anarana mpianatra.");
  return n;
}

export function planById(id: string) {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error("Tsy fantatra ilay safidy.");
  return plan;
}

/* ----------------------------- Compte étudiant ----------------------------- */

export async function getAccount(studentName: string) {
  const name = normName(studentName);
  await supabaseAdmin.from("student_accounts").upsert({ student_name: name }, { onConflict: "student_name", ignoreDuplicates: true });
  const [{ data: acc }, { data: pending }] = await Promise.all([
    supabaseAdmin
      .from("student_accounts")
      .select("credits_messages, free_used, statut_paiement")
      .eq("student_name", name)
      .maybeSingle(),
    supabaseAdmin
      .from("payment_requests")
      .select("id, plan_id, messages, amount_ar, status, admin_note, created_at")
      .eq("student_name", name)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const credits = acc?.credits_messages ?? 0;
  const freeUsed = acc?.free_used ?? false;
  const requests = pending ?? [];
  return {
    credits,
    freeUsed,
    status: (acc?.statut_paiement ?? "none") as PaymentStatus,
    canUse: !freeUsed || credits > 0,
    hasPending: requests.some((r) => r.status === "pending"),
    requests,
  };
}

export class PaywallError extends Error {
  constructor() {
    super(PAYWALL_CODE);
    this.name = "PaywallError";
  }
}

/** Déduit 1 crédit (ou l'essai gratuit). Lève PaywallError si le solde est nul. */
export async function consumeCredit(studentName: string): Promise<"free" | "credit"> {
  const name = normName(studentName);
  const { data: prof } = await supabaseAdmin
    .from("student_profiles")
    .select("blocked")
    .eq("display_name", name)
    .maybeSingle();
  if (prof?.blocked) throw new Error("Voasakana ity kaonty ity (kaonty maromaro amin'ny finday iray).");
  const { data, error } = await supabaseAdmin.rpc("consume_message_credit", { p_student: name });
  if (error) throw new Error(error.message);
  if (data === "free" || data === "credit") return data;
  throw new PaywallError();
}

/** Rend le crédit si l'appel IA a échoué après déduction. */
export async function refundCredit(studentName: string, mode: "free" | "credit") {
  const name = normName(studentName);
  const { data: acc } = await supabaseAdmin
    .from("student_accounts")
    .select("id, credits_messages")
    .eq("student_name", name)
    .maybeSingle();
  if (!acc) return;
  if (mode === "free") await supabaseAdmin.from("student_accounts").update({ free_used: false }).eq("id", acc.id);
  else
    await supabaseAdmin
      .from("student_accounts")
      .update({ credits_messages: acc.credits_messages + 1 })
      .eq("id", acc.id);
}

/** Exécute une action payante : déduit avant, rembourse si l'action échoue. */
export async function withCredit<T>(studentName: string, action: () => Promise<T>) {
  const mode = await consumeCredit(studentName);
  try {
    return await action();
  } catch (e) {
    await refundCredit(studentName, mode).catch(() => undefined);
    throw e;
  }
}

/* ---------------------------- Moyens de paiement --------------------------- */

export async function listPaymentMethods(onlyActive: boolean) {
  let q = supabaseAdmin
    .from("payment_methods")
    .select("id, label, number, holder, instructions, is_active, position")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function savePaymentMethod(
  id: string | null,
  values: { label: string; number: string; holder: string | null; instructions: string | null; is_active: boolean },
) {
  const label = values.label.trim().slice(0, 40);
  const number = values.number.trim().slice(0, 40);
  if (!label || !number) throw new Error("Mila anarana sy laharana.");
  const row = {
    label,
    number,
    holder: values.holder?.trim().slice(0, 80) || null,
    instructions: values.instructions?.trim().slice(0, 300) || null,
    is_active: values.is_active,
  };
  const { error } = id
    ? await supabaseAdmin.from("payment_methods").update(row).eq("id", id)
    : await supabaseAdmin.from("payment_methods").insert(row);
  if (error) throw new Error(error.message);
}

export async function deletePaymentMethod(id: string) {
  const { error } = await supabaseAdmin.from("payment_methods").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* --------------------------- Demandes de paiement -------------------------- */

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "heic", "pdf"];

export async function createProofUpload(studentName: string, fileName: string) {
  normName(studentName);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) throw new Error("Sary (JPG, PNG, WEBP) na PDF ihany no azo alefa.");
  const path = `proofs/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage.from("media").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Tsy afaka nandefa ny rakitra.");
  return { path, token: data.token };
}

export async function submitPaymentRequest(studentName: string, planId: PlanId, proofPath: string) {
  const name = normName(studentName);
  const plan = planById(planId);
  if (!proofPath.startsWith("proofs/")) throw new Error("Porofo tsy mety.");

  const { data: existing } = await supabaseAdmin
    .from("payment_requests")
    .select("id")
    .eq("student_name", name)
    .eq("status", "pending")
    .limit(1);
  if (existing && existing.length) throw new Error("Efa misy fangatahana miandry fanamarinana. Andraso ny mpitantana.");

  const { error } = await supabaseAdmin.from("payment_requests").insert({
    student_name: name,
    plan_id: plan.id,
    messages: plan.messages,
    amount_ar: plan.amountAr,
    proof_path: proofPath,
  });
  if (error) throw new Error(error.message);

  await supabaseAdmin
    .from("student_accounts")
    .upsert({ student_name: name, statut_paiement: "pending" }, { onConflict: "student_name" });
}

export async function listPaymentRequests(status: "pending" | "all") {
  let q = supabaseAdmin
    .from("payment_requests")
    .select("id, student_name, plan_id, messages, amount_ar, proof_path, status, admin_note, reviewed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status === "pending") q = q.eq("status", "pending");
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return Promise.all(
    (data ?? []).map(async (r) => ({ ...r, proofUrl: await signUrl(r.proof_path) })),
  );
}

export async function reviewPaymentRequest(id: string, decision: "approved" | "rejected", note: string | null) {
  const { data: req, error } = await supabaseAdmin
    .from("payment_requests")
    .select("id, student_name, messages, status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!req) throw new Error("Tsy hita ilay fangatahana.");
  if (req.status !== "pending") throw new Error("Efa voadinika io fangatahana io.");

  const { error: upErr } = await supabaseAdmin
    .from("payment_requests")
    .update({ status: decision, admin_note: note?.trim().slice(0, 300) || null, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (upErr) throw new Error(upErr.message);

  if (decision === "approved") await addCredits(req.student_name, req.messages, "approved");
  else
    await supabaseAdmin
      .from("student_accounts")
      .upsert({ student_name: req.student_name, statut_paiement: "rejected" }, { onConflict: "student_name" });
}

export async function addCredits(studentName: string, amount: number, status: PaymentStatus | null = null) {
  const name = normName(studentName);
  const n = Math.max(0, Math.floor(amount));
  await supabaseAdmin.from("student_accounts").upsert({ student_name: name }, { onConflict: "student_name", ignoreDuplicates: true });
  const { data: acc } = await supabaseAdmin
    .from("student_accounts")
    .select("id, credits_messages")
    .eq("student_name", name)
    .single();
  const patch: { credits_messages: number; statut_paiement?: string } = {
    credits_messages: (acc?.credits_messages ?? 0) + n,
  };
  if (status) patch.statut_paiement = status;
  const { error } = await supabaseAdmin.from("student_accounts").update(patch).eq("id", acc!.id);
  if (error) throw new Error(error.message);
}

export async function listAccounts() {
  const { data, error } = await supabaseAdmin
    .from("student_accounts")
    .select("id, student_name, credits_messages, free_used, statut_paiement, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}
