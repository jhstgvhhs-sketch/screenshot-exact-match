export {
  trackingUrl,
  brazilPhone,
  trackingReady,
  trackingMessage,
  trackingWhatsApp,
  type TrackingOrder,
} from "../../supabase/functions/_shared/tracking-rules";

export function missingTrackingColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; message?: string };
  return (
    ["42703", "PGRST204"].includes(value.code ?? "") &&
    /tracking_(carrier|url)/.test(value.message ?? "")
  );
}
