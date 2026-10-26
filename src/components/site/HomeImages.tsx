import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
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
  if (!images.length)
    return (
      <section className="container-x py-8">
        <h1 className="sr-only">3DFLEX — Sua próxima criação começa aqui</h1>
        <ExploreProductsButton />
      </section>
    );
  const index = selected % images.length;
  return (
    <section
      aria-label="Imagens em destaque"
      aria-roledescription="carrossel"
      className="relative grid overflow-hidden border-b border-border bg-black md:h-[650px]"
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
        className="col-start-1 row-start-1 block h-auto w-full self-center object-contain md:absolute md:inset-0 md:h-full md:object-cover"
      />
      <div className="container-x pointer-events-none relative col-start-1 row-start-1 flex items-center px-6 pt-2 pb-14 sm:px-12 sm:pt-4 sm:pb-16 md:py-36">
        <HomeHeroText image={images[index]} showExplore={index === 0} />
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

export function HomeHeroText({ image, showExplore = true }: { image?: HomeImage; showExplore?: boolean }) {
  const eyebrow = image?.eyebrow ?? DEFAULT_HOME_COPY.eyebrow;
  const title = image?.title ?? DEFAULT_HOME_COPY.title;
  const description = image?.description ?? DEFAULT_HOME_COPY.description;
  return (
    <div className="w-full max-w-xl break-words md:min-h-64">
      {eyebrow && (
        <p className="mb-1 text-[10px] font-bold tracking-[0.22em] sm:mb-3 sm:text-xs md:mb-4 md:tracking-[0.3em] text-primary">
          {eyebrow}
        </p>
      )}
      <h1
        className={
          title
            ? "text-[clamp(1.25rem,5.5vw,1.75rem)] font-extrabold leading-[1.1] text-white sm:text-4xl md:text-6xl md:leading-[1.05]"
            : "sr-only"
        }
      >
        {title || "3DFLEX"}
      </h1>
      {description && (
        <p className="mt-2 max-w-md text-xs leading-relaxed text-white/85 sm:mt-3 sm:text-base md:mt-5 md:text-lg">
          {description}
        </p>
      )}
      {showExplore && <ExploreProductsButton />}
    </div>
  );
}

function ExploreProductsButton() {
  return (
    <Link
      to="/produtos"
      className="pointer-events-auto relative z-10 mt-2 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-[#FF6A00] px-5 py-3 text-sm font-bold text-black shadow-sm transition-colors hover:bg-[#ff8129] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:mt-5 sm:px-7 sm:text-base md:mt-8"
    >
      Explorar produtos <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
    </Link>
  );
}
