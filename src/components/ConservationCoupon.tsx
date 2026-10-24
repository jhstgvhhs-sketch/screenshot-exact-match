import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/cart";
import {
  EMPTY_KIT,
  KIT_COUPON,
  normalizeKitCoupon,
  readGifts,
  type KitState,
} from "@/lib/conservation-kit";
export function ConservationCoupon({
  items,
  disabled,
  onChange,
}: {
  items: CartItem[];
  disabled: boolean;
  onChange: (state: KitState) => void;
}) {
  const [text, setText] = useState("");
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState("");
  const key = JSON.stringify(
    items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
  );
  useEffect(() => {
    if (!applied) return;
    let current = true;
    onChange({ ...EMPTY_KIT, code: KIT_COUPON, ready: false });
    setMessage("Conferindo os brindes…");
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("kit_conservation_preview", {
          _items: JSON.parse(key),
        });
        if (error) throw error;
        const result = data as unknown as { kilograms: number; kits: number; gifts: unknown };
        if (!result || !Number.isFinite(result.kilograms) || !Number.isInteger(result.kits))
          throw new Error("Resposta inválida ao conferir os brindes.");
        if (!current) return;
        const gifts = readGifts(result.gifts);
        const ready = result.kits > 0 && gifts.length === 2;
        onChange({
          code: KIT_COUPON,
          ready,
          gifts: ready ? gifts : [],
          kilograms: result.kilograms,
          kits: result.kits,
        });
        setMessage(
          ready
            ? `Cupom aplicado: ${result.kits} kit(s) de conservação grátis.`
            : "Adicione pelo menos 5 kg de filamentos MasterPrint para usar este cupom.",
        );
      } catch {
        if (current)
          setMessage(
            "Não foi possível conferir o cupom. Remova e aplique novamente para tentar de novo.",
          );
      }
    })();
    return () => {
      current = false;
    };
  }, [applied, key, onChange]);
  return (
    <div className="space-y-2 border-t border-border pt-3 text-sm">
      <label className="block font-semibold" htmlFor="kit-coupon">
        Cupom de brinde
      </label>
      <div className="flex gap-2">
        <input
          id="kit-coupon"
          maxLength={40}
          disabled={disabled || applied}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="kitconservação"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background p-2"
        />
        {applied ? (
          <button
            type="button"
            disabled={disabled}
            className="text-primary underline disabled:opacity-50"
            onClick={() => {
              setApplied(false);
              onChange(EMPTY_KIT);
              setMessage("");
            }}
          >
            Remover cupom
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50"
            onClick={() => {
              if (normalizeKitCoupon(text) !== KIT_COUPON) {
                setMessage("Cupom de brinde inválido.");
                return;
              }
              onChange({ ...EMPTY_KIT, code: KIT_COUPON, ready: false });
              setApplied(true);
            }}
          >
            Aplicar cupom
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        A cada 5 kg de filamentos MasterPrint: 1 kg de sílica em gel + 5 embalagens a vácuo. PLA e
        PETG podem ser combinados.
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
