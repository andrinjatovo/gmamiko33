import { createServerFn } from "@tanstack/react-start";

export const CONTRIB_CATEGORY = "Traikefan'ny mpianatra";

export const submitContribution = createServerFn({ method: "POST" })
  .inputValidator((d: { studentName: string; kind: string; title: string; content: string; tags: string }) => {
    const title = String(d.title ?? "").trim().slice(0, 150);
    const content = String(d.content ?? "").trim().slice(0, 5000);
    const studentName = String(d.studentName ?? "").trim().slice(0, 80);
    if (!studentName) throw new Error("Tsy fantatra ny mpianatra.");
    if (title.length < 3) throw new Error("Fohy loatra ny lohateny.");
    if (content.length < 20) throw new Error("Soraty kokoa ny hevitrao (20 litera farafahakeliny).");
    const kind = d.kind === "fahaizana" ? "fahaizana" : "hevitra";
    const tags = String(d.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
    return { studentName, kind, title, content, tags };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("kb_entries").insert({
      category: CONTRIB_CATEGORY,
      title: data.title,
      content: `${data.content}\n\n(Nozarain'ny mpianatra ${data.studentName} — ${data.kind})`,
      tags: [...data.tags, data.kind, `mpianatra:${data.studentName}`],
      is_active: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const fetchMyContributions = createServerFn({ method: "POST" })
  .inputValidator((d: { studentName: string }) => ({ studentName: String(d.studentName ?? "").trim() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("kb_entries")
      .select("id, title, content, is_active, created_at")
      .eq("category", CONTRIB_CATEGORY)
      .contains("tags", [`mpianatra:${data.studentName}`])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
