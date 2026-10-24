import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { DEFAULT_HOME_COPY, type HomeImage } from "@/lib/home-images";
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
      className="relative grid min-h-[320px] overflow-hidden border-b border-border bg-black md:h-[650px]"
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
        className="absolute inset-0 block h-full w-full object-cover object-center"
      />
      <div className="container-x pointer-events-none relative col-start-1 row-start-1 flex min-h-[320px] items-center px-6 pt-10 pb-24 sm:min-h-[380px] sm:px-12 md:py-36">
        <HomeHeroText image={images[index]} />
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={() => setSelected((index + images.length - 1) % images.length)}
            className="absolute bottom-3 left-4 rounded-full bg-black/80 p-2 md:bottom-auto md:left-2 md:top-1/2 md:-translate-y-1/2 text-white focus-visible:outline focus-visible:outline-primary"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={() => setSelected((index + 1) % images.length)}
            className="absolute bottom-3 right-4 rounded-full bg-black/80 p-2 md:bottom-auto md:right-2 md:top-1/2 md:-translate-y-1/2 text-white focus-visible:outline focus-visible:outline-primary"
          >
            <ChevronRight />
          </button>
          <div className="absolute inset-x-16 bottom-3 flex min-h-10 flex-wrap items-center justify-center gap-2 md:inset-x-20 md:bottom-4 md:gap-3">
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

export function HomeHeroText({ image }: { image?: HomeImage }) {
  const eyebrow = image?.eyebrow ?? DEFAULT_HOME_COPY.eyebrow;
  const title = image?.title ?? DEFAULT_HOME_COPY.title;
  const description = image?.description ?? DEFAULT_HOME_COPY.description;
  return (
    <div className="w-full max-w-xl break-words md:min-h-64">
      {eyebrow && (
        <p className="mb-3 text-[10px] font-bold tracking-[0.22em] sm:text-xs md:mb-4 md:tracking-[0.3em] text-primary">
          {eyebrow}
        </p>
      )}
      <h1
        className={
          title
            ? "text-[clamp(1.5rem,6.5vw,2rem)] font-extrabold leading-[1.1] text-white sm:text-4xl md:text-6xl md:leading-[1.05]"
            : "sr-only"
        }
      >
        {title || "3DFLEX"}
      </h1>
      {description && (
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:text-base md:mt-5 md:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
