import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeImages } from "@/components/site/HomeImages";
import { HomeImagesEditor } from "@/components/site/HomeImagesEditor";
import { validateHomeImages, type HomeImage } from "@/lib/home-images";
const mocks = vi.hoisted(() => ({
  images: null as HomeImage[] | null,
  update: vi.fn(),
  save: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@/components/site/StoreSettings", () => ({
  useStoreSettings: () => ({ data: { homepage_images: mocks.images } }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (values: unknown) => {
        mocks.update(values);
        return { eq: () => ({ select: () => ({ single: mocks.save }) }) };
      },
    }),
    storage: {
      from: () => ({
        upload: mocks.upload,
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/new.png" } }),
      }),
    },
  },
}));
const first = { url: "https://example.com/first.png", alt: "Primeira arte" };
const second = { url: "https://example.com/second.png", alt: "Segunda arte" };
beforeEach(() => {
  mocks.images = null;
  mocks.save.mockResolvedValue({ data: { id: "main" }, error: null });
  mocks.upload.mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Homepage image management", () => {
  it("preserves original content until explicitly configured and supports removing it", () => {
    const view = render(
      <HomeImages>
        <p>Original</p>
      </HomeImages>,
    );
    expect(screen.getByText("Original")).toBeInTheDocument();
    mocks.images = [];
    view.rerender(
      <HomeImages>
        <p>Original</p>
      </HomeImages>,
    );
    expect(screen.queryByText("Original")).toBeNull();
  });
  it("navigates between actual configured images", () => {
    mocks.images = [first, second];
    render(<HomeImages>Original</HomeImages>);
    expect(screen.getByRole("img")).toHaveAttribute("src", first.url);
    fireEvent.click(screen.getByLabelText("Próxima imagem"));
    expect(screen.getByRole("img")).toHaveAttribute("src", second.url);
    fireEvent.click(screen.getByLabelText("Imagem anterior"));
    expect(screen.getByRole("img")).toHaveAttribute("src", first.url);
  });
  it("removes a selected image and persists only the homepage setting", async () => {
    const saved = vi.fn();
    render(<HomeImagesEditor current={[first, second]} onSaved={saved} />);
    fireEvent.click(screen.getByText("Apagar imagem 1 do site"));
    fireEvent.click(screen.getByText("Salvar imagens da página inicial"));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledWith({
      homepage_images: [second],
      updated_at: expect.any(String),
    });
  });
  it("does not claim success when permissions reject saving", async () => {
    mocks.save.mockResolvedValue({ data: null, error: new Error("Sem permissão") });
    const saved = vi.fn();
    render(<HomeImagesEditor current={[first]} onSaved={saved} />);
    fireEvent.click(screen.getByText("Apagar imagem 1 do site"));
    fireEvent.click(screen.getByText("Salvar imagens da página inicial"));
    expect(await screen.findByText("Sem permissão")).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });
  it("uploads another image and replaces an existing image without changing the order", async () => {
    render(<HomeImagesEditor current={[first]} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Trocar imagem 1"), {
      target: { files: [new File(["image"], "Nova arte.png", { type: "image/png" })] },
    });
    expect(await screen.findByText(/Imagem carregada/)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/new.png");
    fireEvent.click(screen.getByText("Salvar imagens da página inicial"));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          homepage_images: [{ url: "https://example.com/new.png", alt: "Nova arte" }],
        }),
      ),
    );
  });
  it("rejects unsafe URLs and missing descriptions", () => {
    expect(() => validateHomeImages([{ url: "javascript:alert(1)", alt: "Arte" }])).toThrow(
      /HTTPS/,
    );
    expect(() => validateHomeImages([{ ...first, alt: "" }])).toThrow(/Descreva/);
    expect(() => validateHomeImages(Array(9).fill(first))).toThrow(/8/);
  });
});
