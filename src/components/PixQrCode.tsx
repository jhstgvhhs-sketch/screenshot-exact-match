import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PixQrCode({ copyPaste }: { copyPaste: string }) {
  const [image, setImage] = useState<{ code: string; src: string } | null>(null);
  const [failedCode, setFailedCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Encode the exact payment payload locally; never send it to an image service.
    QRCode.toDataURL(copyPaste, {
      width: 320, margin: 4, errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(src => {
      if (active) setImage({ code: copyPaste, src });
    }).catch(() => {
      if (active) setFailedCode(copyPaste);
    });
    return () => { active = false; };
  }, [copyPaste]);

  if (image?.code === copyPaste) return <img className="mx-auto h-64 w-64 rounded-lg bg-white object-contain" alt="QR Code Pix" src={image.src} />;
  return <p role="status" className="text-sm text-muted-foreground">{failedCode === copyPaste
    ? "Não foi possível exibir o QR Code. Use o Pix copia e cola abaixo para pagar o mesmo pedido."
    : "Preparando QR Code…"}</p>;
}
