import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { PixQrCode } from "../components/PixQrCode";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Pix QR Code", () => {
  it("renders locally without a gateway image", async () => {
    render(<PixQrCode copyPaste="000201-pix-test" />);
    const image = await screen.findByAltText("QR Code Pix");
    expect(image.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
  });

  it("encodes the exact copy-and-paste payload", async () => {
    const encode = vi.spyOn(QRCode, "toDataURL").mockImplementation((() => Promise.resolve("data:image/png;base64,test")) as typeof QRCode.toDataURL);
    render(<PixQrCode copyPaste="exact-pix-payload" />);
    await screen.findByAltText("QR Code Pix");
    expect(encode).toHaveBeenCalledWith("exact-pix-payload", expect.objectContaining({ margin: 4, width: 320 }));
  });

  it("keeps copy-and-paste instructions available if image generation fails", async () => {
    vi.spyOn(QRCode, "toDataURL").mockRejectedValue(new Error("Encoding failed"));
    render(<PixQrCode copyPaste="pix-test" />);
    expect(await screen.findByText(/Use o Pix copia e cola abaixo/)).toBeInTheDocument();
    expect(screen.queryByAltText("QR Code Pix")).toBeNull();
  });
});
