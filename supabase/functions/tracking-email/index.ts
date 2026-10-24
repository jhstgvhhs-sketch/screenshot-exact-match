import { adminClient, requireAdmin } from "../_shared/recovery-server.ts";
import { trackingHandler } from "../_shared/tracking-handler.ts";
Deno.serve(
  trackingHandler({
    authorize: async (request) => {
      const id = await requireAdmin(request);
      if (!id) throw new Error("unauthorized");
      return id;
    },
    db: adminClient,
    config: () => ({
      enabled: Deno.env.get("TRACKING_EMAIL_ENABLED") === "true",
      apiKey: Deno.env.get("RESEND_API_KEY") ?? "",
      from: Deno.env.get("TRACKING_EMAIL_FROM") ?? Deno.env.get("RECOVERY_EMAIL_FROM") ?? "",
    }),
  }),
);
