import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreSettingsEditor } from "@/components/site/StoreSettings";
const mocks = vi.hoisted(() => ({ upsert: vi.fn(), read: vi.fn() }));
vi.mock("@/components/site/HomeImagesEditor", () => ({
  HomeImagesEditor: () => <div>Gestor da página inicial</div>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
      upsert: (values: unknown) => {
        mocks.upsert(values);
        return { select: () => ({ single: async () => ({ data: { id: "main" } }) }) };
      },
    }),
  },
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("Footer image removal", () => {
  it.each(["logo", "banner"])("removes %s without overwriting homepage images", async (kind) => {
    mocks.upsert.mockClear();
    mocks.read.mockResolvedValue({
      data: {
        id: "main",
        logo_url: "https://example.com/logo.png",
        banner_url: "https://example.com/banner.png",
        homepage_images: [{ url: "https://example.com/hero.png", alt: "Topo" }],
      },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={client}>
        <StoreSettingsEditor />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText(`Apagar ${kind} do rodapé`));
    expect(mocks.upsert).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByText("Confirmar e salvar dados da loja").closest("form")!);
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalled());
    const values = mocks.upsert.mock.calls[0][0];
    expect(values[`${kind}_url`]).toBe("");
    expect(values).not.toHaveProperty("homepage_images");
    cleanup();
    client.clear();
  });
});
