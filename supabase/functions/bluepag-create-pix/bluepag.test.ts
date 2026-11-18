import { BluePagApiError, shouldReconcileCreateFailure } from "./bluepag.ts";

Deno.test("OAuth errors are definitive", () => {
  const error = new BluePagApiError("oauth", 401, "invalid_client", false);
  if (shouldReconcileCreateFailure(error)) throw new Error("OAuth must not be ambiguous");
});

Deno.test("explicit Pix 4xx rejection is definitive", () => {
  const error = new BluePagApiError("create-pix", 422, "validation_error", false);
  if (shouldReconcileCreateFailure(error)) throw new Error("Explicit 4xx must not be ambiguous");
});

Deno.test("Pix timeout requires reconciliation", () => {
  const error = new BluePagApiError("create-pix", 0, null, true);
  if (!shouldReconcileCreateFailure(error)) throw new Error("Timeout must be ambiguous");
});

Deno.test("Pix server error requires reconciliation", () => {
  const error = new BluePagApiError("create-pix", 503, "provider_unavailable", true);
  if (!shouldReconcileCreateFailure(error)) throw new Error("5xx must be ambiguous");
});

Deno.test("OAuth server error is definitive because no charge request was sent", () => {
  const error = new BluePagApiError("oauth", 503, "auth_unavailable", false);
  if (shouldReconcileCreateFailure(error)) throw new Error("OAuth must not be ambiguous");
});

Deno.test("unknown errors are not mislabeled as provider reconciliation", () => {
  if (shouldReconcileCreateFailure(new Error("unexpected"))) throw new Error("Unknown error misclassified");
});
