export type HomeImage = {
  url: string;
  alt: string;
  eyebrow?: string;
  title?: string;
  description?: string;
};
export const DEFAULT_HOME_COPY = {
  eyebrow: "IMPRESSÃO 3D",
  title: "SUA PRÓXIMA CRIAÇÃO COMEÇA AQUI.",
  description: "Filamentos PLA, PETG e acessórios para transformar suas ideias em realidade.",
};
export const HOME_COPY_FIELDS = [
  { key: "eyebrow", label: "Chamada", limit: 60 },
  { key: "title", label: "Título", limit: 120 },
  { key: "description", label: "Texto", limit: 300 },
] as const;
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
    const copy: Partial<Pick<HomeImage, "eyebrow" | "title" | "description">> = {};
    for (const field of HOME_COPY_FIELDS) {
      const text = image[field.key];
      if (text === undefined) continue;
      if (typeof text !== "string" || text.length > field.limit)
        throw new Error(`${field.label}: use até ${field.limit} caracteres.`);
      copy[field.key] = text.trim();
    }
    return { url: url.href, alt: image.alt.trim(), ...copy };
  });
}
