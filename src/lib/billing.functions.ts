import { createServerFn } from "@tanstack/react-start";
import type { PlanId } from "./billing.plans";

/* ------------------------------- Étudiant ------------------------------- */

export const fetchMyAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { studentName: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./billing.server");
    return m.getAccount(data.studentName);
  });

export const fetchPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("./billing.server");
  return m.listPaymentMethods(true);
});

export const requestProofUpload = createServerFn({ method: "POST" })
  .inputValidator((d: { studentName: string; fileName: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./billing.server");
    return m.createProofUpload(data.studentName, data.fileName);
  });

export const sendPaymentRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { studentName: string; planId: PlanId; proofPath: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("./billing.server");
    await m.submitPaymentRequest(data.studentName, data.planId, data.proofPath);
    return { ok: true };
  });

/* --------------------------------- Admin -------------------------------- */

export const adminFetchPaymentMethods = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const m = await import("./billing.server");
    return m.listPaymentMethods(false);
  });

export const adminSavePaymentMethod = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      adminCode: string;
      id?: string;
      label: string;
      number: string;
      holder: string | null;
      instructions: string | null;
      is_active: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const m = await import("./billing.server");
    const { adminCode: _a, id, ...values } = data;
    await m.savePaymentMethod(id ?? null, values);
    return { ok: true };
  });

export const adminDeletePaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; id: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const m = await import("./billing.server");
    await m.deletePaymentMethod(data.id);
    return { ok: true };
  });

export const adminFetchPaymentRequests = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; status: "pending" | "all" }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const m = await import("./billing.server");
    return m.listPaymentRequests(data.status);
  });

export const adminReviewPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; id: string; decision: "approved" | "rejected"; note: string | null }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const m = await import("./billing.server");
    await m.reviewPaymentRequest(data.id, data.decision, data.note);
    return { ok: true };
  });

export const adminFetchAccounts = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const m = await import("./billing.server");
    return m.listAccounts();
  });

export const adminAddCredits = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; studentName: string; amount: number }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const m = await import("./billing.server");
    await m.addCredits(data.studentName, data.amount, "approved", "admin_add");
    return { ok: true };
  });

export const adminFetchCreditTransactions = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const m = await import("./billing.server");
    return m.listCreditTransactions();
  });
