import { useStoreSettings } from "@/components/site/StoreSettings";
import { brazilPhone } from "@/lib/tracking";

export function OrderDocumentsContact({ orderId }: { orderId: string }) {
  const settings = useStoreSettings();
  const phone = brazilPhone(settings.data?.whatsapp ?? "");
  const number = orderId.slice(0, 8).toUpperCase();
  const message = `Olá, 3DFLEX! Quero solicitar a nota fiscal e o código de rastreamento do pedido #${number}. Vou enviar o comprovante de pagamento nesta conversa para conferência.`;
  return (
    <section className="mt-4 space-y-3 rounded-lg border border-border bg-background p-4">
      <h3 className="font-semibold">Nota fiscal e rastreamento</h3>
      <p className="text-sm text-muted-foreground">
        Solicite sua nota fiscal e o código de rastreamento pelo nosso WhatsApp. Informe o número do
        pedido e envie o comprovante de pagamento para conferência. Nossa equipe confirmará os dados
        e informará a disponibilidade dos documentos e do rastreio.
      </p>
      {settings.isPending ? (
        <p role="status" className="text-sm">
          Carregando atendimento...
        </p>
      ) : settings.isError ? (
        <div role="alert" className="text-sm">
          <p>Não foi possível carregar o contato de atendimento.</p>
          <button
            type="button"
            onClick={() => void settings.refetch()}
            className="mt-2 text-primary underline"
          >
            Tentar carregar contato novamente
          </button>
        </div>
      ) : phone ? (
        <a
          href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
        >
          Solicitar nota e rastreio pelo WhatsApp
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">
          O WhatsApp de atendimento ainda não está disponível. Consulte os canais de contato no
          rodapé.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Anexe o comprovante na conversa. Abrir o WhatsApp não envia a mensagem nem confirma o
        pagamento.
      </p>
    </section>
  );
}
