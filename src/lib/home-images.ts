export type HomeImage = { url: string; alt: string };
export const MAX_HOME_IMAGES = 8;
export function validateHomeImages(value: HomeImage[]): HomeImage[] {
  if (!Array.isArray(value) || value.length > MAX_HOME_IMAGES)
    throw new Error(`Use até ${MAX_HOME_IMAGES} imagens.`);
  return value.map((image) => {
    let url: URL;
    try {
      url = new URL(image.url);
    } catch {
      throw new Error("A imagem precisa usar uma URL HTTPS válida.");
    }
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("A imagem precisa usar uma URL HTTPS válida.");
    if (!image.alt.trim() || image.alt.length > 180)
      throw new Error("Descreva a imagem em até 180 caracteres.");
    return { url: url.href, alt: image.alt.trim() };
  });
}
