import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useStoreSettings } from "./StoreSettings";

export function HomeImages({ children }: { children: ReactNode }) {
  const { data } = useStoreSettings();
  const images = data?.homepage_images;
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const interacting = hovered || focused;
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = images?.length ?? 0;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReducedMotion(media.matches);
    const visibility = () => setHidden(document.visibilityState === "hidden");
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (count < 2 || paused || interacting || hidden || reducedMotion) return;
    const timer = setTimeout(() => setSelected((value) => (value + 1) % count), 7000);
    return () => clearTimeout(timer);
  }, [count, selected, paused, interacting, hidden, reducedMotion]);
  if (images == null) return <>{children}</>;
  if (!images.length) return <h1 className="sr-only">3DFLEX — Sua próxima criação começa aqui</h1>;
  const index = selected % images.length;
  return (
    <section
      aria-label="Imagens em destaque"
      aria-roledescription="carrossel"
      className="relative overflow-hidden border-b border-border bg-black"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <img
        key={images[index].url}
        src={images[index].url}
        alt={images[index].alt}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/20"
      />
      <div className="container-x pointer-events-none relative px-12 py-20 md:py-36">
        <HomeHeroText />
      </div>
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
          <div className="relative flex items-center justify-center gap-3 pb-4">
            <button
              type="button"
              aria-label={paused || reducedMotion ? "Reproduzir carrossel" : "Pausar carrossel"}
              onClick={() => {
                if (paused || reducedMotion) {
                  setPaused(false);
                  setReducedMotion(false);
                } else setPaused(true);
              }}
              className="rounded-full bg-black/80 p-2 text-white"
            >
              {paused || reducedMotion ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </button>
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

export function HomeHeroText() {
  return (
    <div className="max-w-xl">
      <p className="mb-4 text-xs font-bold tracking-[0.3em] text-primary">IMPRESSÃO 3D</p>
      <h1 className="text-4xl font-extrabold leading-[1.05] text-white md:text-6xl">
        SUA PRÓXIMA CRIAÇÃO COMEÇA AQUI.
      </h1>
      <p className="mt-5 text-lg text-white/85">
        Filamentos PLA, PETG e acessórios para transformar suas ideias em realidade.
      </p>
    </div>
  );
}
