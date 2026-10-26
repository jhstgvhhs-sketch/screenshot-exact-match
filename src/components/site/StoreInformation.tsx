import { useStoreSettings } from "./StoreSettings";
import { brazilPhone } from "@/lib/tracking";
import { brl } from "@/lib/store";
import { FIXED_SHIPPING_BRL } from "@/lib/shipping";
export function StoreInformation({ section }: { section: string }) {
  const settings = useStoreSettings();
  const store = settings.data;
  const whatsapp = brazilPhone(store?.whatsapp ?? "");
  return (
    <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
      {section === "sobre" && (
        <p>
          {store?.about?.trim() ||
            "A 3DFLEX oferece filamentos e acessórios para impressão 3D. Consulte nosso catálogo para conhecer as marcas, materiais e cores disponíveis."}
        </p>
      )}
      {section === "envio" && (
        <>
          <p>
            Enviamos para todo o Brasil. O frete fixo é de {brl(FIXED_SHIPPING_BRL)}, com frete
            grátis exclusivamente no Pix para compras acima de R$ 600,00.
          </p>
          <p>
            Confira o frete no resumo antes de pagar. Para solicitar sua nota fiscal e código de
            rastreamento, acesse Meus Pedidos e fale com a loja pelo WhatsApp, enviando o
            comprovante de pagamento para conferência.
          </p>
          <p>Consulte o atendimento para confirmar o prazo de envio e entrega do seu pedido.</p>
          <a href="/conta?aba=pedidos" className="inline-block text-primary underline">
            Acompanhar pedido
          </a>
        </>
      )}
      {["termos", "trocas"].includes(section) && (
        <p>
          As condições detalhadas desta página ainda precisam ser publicadas pela loja. Fale com
          nosso atendimento para consultar as informações antes de comprar.
        </p>
      )}
      {settings.isPending ? (
        <p>Carregando contato...</p>
      ) : settings.isError ? (
        <p role="alert">
          Não foi possível carregar os canais de atendimento.{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => void settings.refetch()}
          >
            Tentar novamente
          </button>
        </p>
      ) : (
        <>
          <h2 className="text-lg font-bold text-foreground">Atendimento 3DFLEX</h2>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary underline"
            >
              Falar pelo WhatsApp
            </a>
          )}
          {store?.email && <p>E-mail: {store.email}</p>}
          {store?.phone && <p>Telefone: {store.phone}</p>}
          {store?.address && <p>Endereço: {store.address}</p>}
          {store?.legal_name && <p>{store.legal_name}</p>}
          {store?.cnpj && <p>CNPJ: {store.cnpj}</p>}
          {!whatsapp && !store?.email && !store?.phone && (
            <p>Os canais de atendimento ainda não foram informados pela loja.</p>
          )}
        </>
      )}
    </div>
  );
}
