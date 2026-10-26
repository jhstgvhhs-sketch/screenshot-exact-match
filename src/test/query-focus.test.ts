import { QueryObserver, focusManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStoreQueryClient } from "@/lib/query-client";
const clients: ReturnType<typeof createStoreQueryClient>[] = [];
afterEach(() => {
  clients.forEach((c) => {
    c.unmount();
    c.clear();
  });
  clients.length = 0;
  focusManager.setFocused(undefined);
  window.history.replaceState(null, "", "/");
});
describe("Focus refresh without administrative draft loss", () => {
  it.each(["/admin", "/admin?section=products", "/admin/settings"])(
    "keeps cached data on focus in %s but honors manual refresh",
    async (path) => {
      window.history.replaceState(null, "", path);
      const client = createStoreQueryClient();
      clients.push(client);
      client.mount();
      const read = vi.fn().mockResolvedValue({ value: "server" });
      const observer = new QueryObserver(client, {
        queryKey: ["admin-catalog"],
        queryFn: read,
        retry: false,
      });
      const unsubscribe = observer.subscribe(() => {});
      await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
      await vi.waitFor(() =>
        expect(client.getQueryCache().findAll()[0]?.state.fetchStatus).toBe("idle"),
      );
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await Promise.resolve();
      await Promise.resolve();
      expect(read).toHaveBeenCalledTimes(1);
      await client.invalidateQueries({ queryKey: ["admin-catalog"] });
      expect(read).toHaveBeenCalledTimes(2);
      unsubscribe();
    },
  );
  it("keeps focus refresh on storefront pages", async () => {
    window.history.replaceState(null, "", "/produtos");
    const client = createStoreQueryClient();
    clients.push(client);
    client.mount();
    const read = vi.fn().mockResolvedValue("catalog");
    const observer = new QueryObserver(client, {
      queryKey: ["products"],
      queryFn: read,
      retry: false,
    });
    const unsubscribe = observer.subscribe(() => {});
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    await vi.waitFor(() =>
      expect(client.getQueryCache().findAll()[0]?.state.fetchStatus).toBe("idle"),
    );
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    unsubscribe();
  });
});
