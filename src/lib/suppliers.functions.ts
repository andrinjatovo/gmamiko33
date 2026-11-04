import { createServerFn } from "@tanstack/react-start";

type Scope = "all" | "local" | "foreign";

export const searchSuppliers = createServerFn({ method: "POST" })
  .inputValidator((d: { studentName: string; query: string; scope: Scope }) => d)
  .handler(async ({ data }) => {
    const { searchSuppliers: run } = await import("./suppliers.server");
    return run(data.studentName, data.query, data.scope);
  });
