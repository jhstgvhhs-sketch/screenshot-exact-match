import { useEffect, useState } from "react";

const empty = { street: "", district: "", city: "", state: "" };

export function CheckoutAddress({ fieldClass }: { fieldClass: string }) {
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState(empty);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (cep.length !== 8) { setMessage(""); return; }
    const controller = new AbortController();
    const initial = address;
    const timeout = window.setTimeout(async () => {
      setMessage("Buscando endereço…");
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (data.erro || typeof data.localidade !== "string" || typeof data.uf !== "string") throw new Error();
        if (controller.signal.aborted) return;
        const found = { street: data.logradouro ?? "", district: data.bairro ?? "", city: data.localidade, state: data.uf };
        setAddress(current => Object.fromEntries(Object.entries(found).map(([key, value]) =>
          [key, current[key as keyof typeof empty] === initial[key as keyof typeof empty] ? value : current[key as keyof typeof empty]]
        )) as typeof empty);
        setMessage("Endereço encontrado. Confira os dados e informe o número.");
      } catch {
        if (!controller.signal.aborted) setMessage("Não foi possível localizar o CEP. Preencha o endereço manualmente.");
      }
    }, 400);
    return () => { controller.abort(); window.clearTimeout(timeout); };
    // Address edits must not restart the lookup; preserve edits made while it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);

  return <fieldset className="space-y-4 rounded-xl border border-border bg-card p-5">
    <legend className="px-2 font-bold">Endereço de entrega</legend>
    <label className="block space-y-1 text-sm">CEP<input name="cep" required inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{8}" title="Digite os 8 números do CEP" maxLength={9} value={cep} onChange={event => setCep(event.target.value.replace(/\D/g, "").slice(0, 8))} className={fieldClass} aria-describedby="cep-status" /></label>
    <p id="cep-status" role="status" className="text-xs text-muted-foreground">{message || "Digite o CEP para preencher o endereço automaticamente."}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {([["street", "Rua / Avenida", "address-line1", 160], ["district", "Bairro", "address-level3", 100], ["city", "Cidade", "address-level2", 100], ["state", "Estado (UF)", "address-level1", 2]] as const).map(([name, label, autoComplete, maxLength]) => <label key={name} className={`space-y-1 text-sm ${name === "street" ? "sm:col-span-2" : ""}`}>{label}<input name={name} required autoComplete={autoComplete} maxLength={maxLength} pattern={name === "state" ? "[A-Za-z]{2}" : undefined} value={address[name]} onChange={event => setAddress(current => ({ ...current, [name]: name === "state" ? event.target.value.toUpperCase() : event.target.value }))} className={fieldClass}/></label>)}
      <label className="space-y-1 text-sm">Número<input name="number" required maxLength={20} className={fieldClass}/></label>
      <label className="space-y-1 text-sm">Complemento (opcional)<input name="complement" autoComplete="address-line2" maxLength={100} className={fieldClass}/></label>
    </div>
  </fieldset>;
}
