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
      {section === "trocas" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Arrependimento em compras pela internet
            </h2>
            <p>
              Nas compras feitas fora do estabelecimento, o consumidor pode exercer o direito de
              arrependimento em até 7 dias contados da assinatura ou do recebimento do produto,
              conforme o artigo 49 do Código de Defesa do Consumidor. Os valores pagos são
              devolvidos nos termos da legislação, sem ônus pelo exercício desse direito.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Como solicitar atendimento</h2>
            <p>
              Utilize os canais de contato abaixo e informe o número do pedido e o motivo da
              solicitação. A equipe deverá fornecer as orientações de devolução e confirmar o
              recebimento do pedido de atendimento.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Produto com defeito ou divergência
            </h2>
            <p>
              Se houver problema de qualidade, item diferente do pedido ou avaria, descreva a
              ocorrência ao atendimento. Aplicam-se as garantias e os prazos legais do Código de
              Defesa do Consumidor, conforme a natureza do produto e do problema. Estas orientações
              não limitam os direitos previstos em lei.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Devolução e reembolso</h2>
            <p>
              Solicite ao atendimento as instruções de envio e o endereço correto para devolução. A
              solução e o reembolso devem observar os direitos legais e a modalidade de pagamento
              utilizada. O atendimento informará as etapas do procedimento conforme o caso,
              respeitando a legislação aplicável.
            </p>
          </div>
          <p className="text-xs">
            Referências:{" "}
            <a
              className="text-primary underline"
              href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Código de Defesa do Consumidor
            </a>{" "}
            e{" "}
            <a
              className="text-primary underline"
              href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Decreto nº 7.962/2013
            </a>
            .
          </p>
        </div>
      )}
      {section === "termos" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Produtos e pedidos</h2>
            <p>
              Confira nome, material, cor, quantidade e demais características cadastradas no
              produto antes de adicionar ao carrinho. Revise os itens, os dados de entrega e o valor
              total no checkout antes de prosseguir para o pagamento.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Pagamento</h2>
            <p>
              As opções disponíveis são apresentadas no checkout. O Pix é gerado por meio da
              integração de pagamento da loja e sua confirmação depende da validação do pagamento no
              servidor. Para cartão de crédito, a finalização ocorre pelo atendimento no WhatsApp.
              Abrir o atendimento ou gerar um código Pix não significa que o pedido esteja pago.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Frete e acompanhamento</h2>
            <p>
              O frete fixo é de {brl(FIXED_SHIPPING_BRL)}. Compras acima de R$ 600,00 têm frete
              grátis exclusivamente no Pix. Confira o valor aplicado no resumo do pedido. Consulte o
              prazo de envio e entrega com o atendimento antes de concluir a compra.
            </p>
            <p className="mt-2">
              A nota fiscal e o código de rastreamento podem ser solicitados pelo WhatsApp em Meus
              Pedidos, com envio do comprovante para conferência.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Atendimento e direitos do consumidor
            </h2>
            <p>
              Para dúvidas, correções, cancelamento ou problemas com o pedido, utilize os contatos
              abaixo. Os direitos previstos na legislação aplicável e as condições da oferta devem
              ser respeitados.
            </p>
            <a href="/info/trocas" className="mt-2 inline-block text-primary underline">
              Consultar trocas e devoluções
            </a>
            <a href="/info/privacidade" className="ml-4 inline-block text-primary underline">
              Consultar privacidade
            </a>
          </div>
        </div>
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
