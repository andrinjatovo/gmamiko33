import { createServerFn } from "@tanstack/react-start";

export const searchWeight = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string }) => ({ query: String(d?.query ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    const m = await import("./weight.server");
    return m.searchWeightVolume(data.query);
  });

export const estimateWeight = createServerFn({ method: "POST" })
  .inputValidator((d: { product: string }) => ({ product: String(d?.product ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    const m = await import("./weight.server");
    return m.estimateWeightVolume(data.product);
  });
