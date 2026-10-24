import { readGifts } from "@/lib/conservation-kit";
export function OrderGifts({ value }: { value: unknown }) {
  const gifts = readGifts(value);
  if (!gifts.length) return null;
  return (
    <div className="my-3 rounded-lg border border-primary/30 p-3 text-sm">
      <p className="font-semibold">Brindes — Kit conservação</p>
      <ul>
        {gifts.map((gift) => (
          <li key={gift.name}>
            {gift.quantity} {gift.unit} de {gift.name} — Grátis
          </li>
        ))}
      </ul>
    </div>
  );
}
