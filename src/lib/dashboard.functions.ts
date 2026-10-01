import { createServerFn } from "@tanstack/react-start";

export const adminDashboard = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const count = async (t: "student_accounts" | "product_analyses" | "ai_conversations" | "quiz_attempts" | "ai_messages") =>
      (await db.from(t).select("id", { count: "exact", head: true })).count ?? 0;
    const [students, analyses, conversations, attempts, messages, pays, accounts] = await Promise.all([
      count("student_accounts"),
      count("product_analyses"),
      count("ai_conversations"),
      count("quiz_attempts"),
      count("ai_messages"),
      db.from("payment_requests").select("status, amount_ar, created_at").limit(2000),
      db.from("student_accounts").select("credits_messages").limit(5000),
    ]);
    const p = pays.data ?? [];
    const approved = p.filter((r) => r.status === "approved");
    const since = Date.now() - 30 * 864e5;
    return {
      students,
      analyses,
      conversations,
      attempts,
      aiQuestions: Math.floor(messages / 2),
      pending: p.filter((r) => r.status === "pending").length,
      approvedCount: approved.length,
      revenue: approved.reduce((a, r) => a + r.amount_ar, 0),
      revenue30: approved.filter((r) => new Date(r.created_at).getTime() > since).reduce((a, r) => a + r.amount_ar, 0),
      creditsLeft: (accounts.data ?? []).reduce((a, r) => a + r.credits_messages, 0),
    };
  });

export const studentDashboard = createServerFn({ method: "POST" })
  .inputValidator((d: { studentName: string }) => d)
  .handler(async ({ data }) => {
    const name = data.studentName.trim().slice(0, 60);
    if (!name) throw new Error("Mila anarana.");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [acc, quiz, analyses, convs] = await Promise.all([
      db.from("student_accounts").select("credits_messages, free_used").eq("student_name", name).maybeSingle(),
      db.from("quiz_attempts").select("score, total").eq("student_name", name).limit(500),
      db.from("product_analyses").select("id, product_name, created_at").eq("student_name", name).order("created_at", { ascending: false }).limit(3),
      db.from("ai_conversations").select("id, title, updated_at").eq("student_name", name).order("updated_at", { ascending: false }).limit(3),
    ]);
    const q = quiz.data ?? [];
    const tot = q.reduce((a, r) => a + r.total, 0);
    const sc = q.reduce((a, r) => a + r.score, 0);
    const { count: analysesCount } = await db.from("product_analyses").select("id", { count: "exact", head: true }).eq("student_name", name);
    return {
      credits: acc.data?.credits_messages ?? 0,
      freeUsed: acc.data?.free_used ?? false,
      quizCount: q.length,
      quizPct: tot ? Math.round((sc / tot) * 100) : 0,
      analysesCount: analysesCount ?? 0,
      lastAnalyses: analyses.data ?? [],
      lastConversations: convs.data ?? [],
    };
  });
