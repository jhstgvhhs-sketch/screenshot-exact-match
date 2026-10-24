import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStoreSettings } from "./StoreSettings";

export function HomeImages({ children }: { children: ReactNode }) {
  const { data } = useStoreSettings();
  const images = data?.homepage_images;
  const [selected, setSelected] = useState(0);
  if (images == null) return <>{children}</>;
  if (!images.length) return <h1 className="sr-only">3DFLEX — Sua próxima criação começa aqui</h1>;
  const index = selected % images.length;
  return (
    <section aria-label="Imagens em destaque" className="relative border-b border-border bg-black">
      <h1 className="sr-only">3DFLEX — Sua próxima criação começa aqui</h1>
      <img
        key={images[index].url}
        src={images[index].url}
        alt={images[index].alt}
        fetchPriority="high"
        className="mx-auto max-h-[650px] w-full object-contain"
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={() => setSelected((index + images.length - 1) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/80 p-2 text-white focus-visible:outline focus-visible:outline-primary"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={() => setSelected((index + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/80 p-2 text-white focus-visible:outline focus-visible:outline-primary"
          >
            <ChevronRight />
          </button>
          <div className="flex justify-center gap-3 py-3">
            {images.map((image, i) => (
              <button
                key={`${i}-${image.url}`}
                type="button"
                aria-label={`Ver imagem ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setSelected(i)}
                className={`h-4 w-4 rounded-full border border-white ${i === index ? "bg-primary" : "bg-white/30"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
