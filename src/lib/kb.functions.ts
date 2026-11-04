import { createServerFn } from "@tanstack/react-start";

type Table = "kb_entries" | "forwarders" | "kb_products" | "kb_suppliers";

export const fetchKb = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; table: Table; search?: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const { kbList } = await import("./kb.server");
    return kbList(data.table, data.search ?? "");
  });

export const saveKb = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; table: Table; id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const { kbSave } = await import("./kb.server");
    await kbSave(data.table, data.id ?? null, data.values);
    return { ok: true };
  });

/** Ajout simplifié : titre + description, l'IA structure et classe l'information. */
export const quickAddKb = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; table: Table; title: string; description: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const { quickAddKb: run } = await import("./kb.server");
    return run(data.table, data.title, data.description);
  });

export const deleteKb = createServerFn({ method: "POST" })
  .inputValidator((d: { adminCode: string; table: Table; id: string }) => d)
  .handler(async ({ data }) => {
    const c = await import("./content.server");
    c.assertAdmin(data.adminCode);
    const { kbDelete } = await import("./kb.server");
    await kbDelete(data.table, data.id);
    return { ok: true };
  });
