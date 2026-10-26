import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ProductGallery({
  images,
  selectedImage,
  name,
  onSelect,
}: {
  images: string[];
  selectedImage: string;
  name: string;
  onSelect: (image: string) => void;
}) {
  const [zoom, setZoom] = useState(false);
  const photos = [...new Set([...(images ?? []).filter(Boolean), selectedImage])];
  const current = Math.max(0, photos.indexOf(selectedImage));
  const move = (step: number) => onSelect(photos[(current + step + photos.length) % photos.length]);
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row">
      <div
        aria-label="Fotos do produto"
        className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:max-h-[620px] lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:pr-1"
      >
        {photos.map((image, i) => (
          <button
            type="button"
            key={image}
            onClick={() => onSelect(image)}
            aria-label={`Ver foto ${i + 1}`}
            aria-pressed={selectedImage === image}
            className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-card p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:h-20 lg:w-full ${selectedImage === image ? "border-primary" : "border-border hover:border-primary/50"}`}
          >
            <img
              src={image}
              alt={`${name} — foto ${i + 1}`}
              width={80}
              height={80}
              loading="lazy"
              className="size-full object-contain"
            />
          </button>
        ))}
      </div>
      <div className="relative order-1 min-w-0 flex-1 self-start overflow-hidden rounded-xl border border-border bg-card lg:order-2">
        <button
          type="button"
          className="block w-full"
          aria-label="Ampliar foto do produto"
          onClick={() => setZoom(true)}
        >
          <img
            src={selectedImage}
            alt={name}
            width={800}
            height={800}
            className="aspect-square w-full object-contain"
          />
        </button>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => move(-1)}
              className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 hover:border-primary"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              onClick={() => move(1)}
              className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 hover:border-primary"
            >
              <ChevronRight />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Ampliar imagem"
          onClick={() => setZoom(true)}
          className="absolute bottom-2 right-2 grid size-11 place-items-center rounded-lg border border-border bg-background/90"
        >
          <Maximize2 className="size-5" />
        </button>
      </div>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Imagem ampliada do produto selecionado.</DialogDescription>
          <img src={selectedImage} alt={name} className="max-h-[70vh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
