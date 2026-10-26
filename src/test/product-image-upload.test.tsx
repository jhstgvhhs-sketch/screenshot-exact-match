import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { ProductImageField } from "@/components/admin/ProductImageField";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), bucket: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: (bucket: string) => {
        mocks.bucket(bucket);
        return {
          upload: mocks.upload,
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://store.example/${path}` },
          }),
        };
      },
    },
  },
}));
function Editor() {
  const [url, setUrl] = useState("https://store.example/old.jpg");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <ProductImageField
        label="Foto principal"
        value={url}
        onChange={setUrl}
        disabled={busy}
        onUploadingChange={setBusy}
      />
      <button disabled={busy}>Salvar produto</button>
    </>
  );
}
beforeEach(() => {
  mocks.upload.mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const select = (file: File) =>
  fireEvent.change(screen.getByLabelText("Foto principal"), { target: { files: [file] } });
describe("Product photo upload", () => {
  it("uploads a file without overwriting existing photos and updates preview", async () => {
    render(<Editor />);
    select(new File(["photo"], "foto.png", { type: "image/png" }));
    await waitFor(() =>
      expect(screen.getByRole("img").getAttribute("src")).toMatch(
        /^https:\/\/store.example\/products\/.+\.png$/,
      ),
    );
    expect(mocks.bucket).toHaveBeenCalledWith("store-assets");
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^products\/.+\.png$/),
      expect.any(File),
      { contentType: "image/png", upsert: false },
    );
    expect(screen.getByText(/Salve o produto/)).toBeInTheDocument();
  });
  it("preserves old photo on upload failure and allows retry", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { message: "Sem permissão" } });
    render(<Editor />);
    select(new File(["photo"], "foto.jpg", { type: "image/jpeg" }));
    await screen.findByText(/Sem permissão/);
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://store.example/old.jpg");
    expect(screen.getByText("Salvar produto")).toBeEnabled();
    select(new File(["photo"], "foto.jpg", { type: "image/jpeg" }));
    await screen.findByText(/Salve o produto/);
  });
  it("rejects unsupported and oversized files without upload", () => {
    render(<Editor />);
    select(new File(["svg"], "foto.svg", { type: "image/svg+xml" }));
    select(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "foto.png", { type: "image/png" }));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(screen.getByText(/Selecione JPG/)).toBeInTheDocument();
  });
  it("blocks saving and further selection while the upload is pending", async () => {
    let done!: (value: { error: null }) => void;
    mocks.upload.mockReturnValue(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    render(<Editor />);
    select(new File(["photo"], "foto.webp", { type: "image/webp" }));
    expect(screen.getByText("Salvar produto")).toBeDisabled();
    expect(screen.getByLabelText("Foto principal")).toBeDisabled();
    done({ error: null });
    await waitFor(() => expect(screen.getByText("Salvar produto")).toBeEnabled());
  });
});
