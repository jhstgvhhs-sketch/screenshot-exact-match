import { QueryClient } from "@tanstack/react-query";

export function createStoreQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep administrative drafts stable when returning from another tab/app.
        // Public pages retain their normal focus refresh; explicit invalidations still work.
        refetchOnWindowFocus: () =>
          typeof window === "undefined" || !/^\/admin(?:\/|$)/.test(window.location.pathname),
      },
    },
  });
}
