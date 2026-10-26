import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useStoreSettings } from "./StoreSettings";
import { brazilPhone } from "@/lib/tracking";
import { brl } from "@/lib/store";
import { FIXED_SHIPPING_BRL } from "@/lib/shipping";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">{title}</h2>{children}</section>;
}

export function StoreInformation({ section }: { section: string }) {
  const settings = useStoreSettings();
  const store = settings.data;
  const whatsapp = brazilPhone(store?.whatsapp ?? "");
  const name = store?.business_name?.trim() || "3DFLEX";
  const contact = <Link to="/info/$slug" params={{ slug: "contato" }} className="text-primary underline">nossos canais de atendimento</Link>;
  return (
    <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground">
      {section === "sobre" && <>
        <Section title="Quem somos">
          <p>A {name} é uma loja voltada a quem trabalha, estuda ou cria projetos com impressão 3D. Nosso catálogo reúne filamentos, impressoras, peças e acessórios, conforme a disponibilidade apresentada na loja.</p>
          <p>Atendemos desde quem está começando na impressão 3D até quem precisa de materiais para produção. Nosso objetivo é facilitar a escolha do produto, com informações sobre marcas, características e opções disponíveis antes da compra.</p>
          {store?.about?.trim() && <p>{store.about.trim()}</p>}
        </Section>
        <Section title="Como funciona a compra">
          <p>Você escolhe os itens no catálogo, confere as características e revisa os valores no carrinho. No checkout, o Pix é gerado para pagamento; para cartão, o atendimento é direcionado ao WhatsApp informado pela loja. Um pedido só deve ser tratado como pago depois da confirmação do pagamento.</p>
          <p>As condições de frete aparecem antes da finalização. Em caso de dúvida sobre compatibilidade, disponibilidade ou entrega, entre em contato antes de comprar.</p>
        </Section>
        <Section title="Transparência e atendimento">
          <p>Disponibilizamos informações sobre pagamento, envio, privacidade e direitos do consumidor. Os dados comerciais informados pela loja aparecem abaixo e no rodapé, quando cadastrados no painel administrativo.</p>
          <p>Conheça nossa <Link className="text-primary underline" to="/info/$slug" params={{ slug: "envio" }}>política de envio</Link>, as <Link className="text-primary underline" to="/info/$slug" params={{ slug: "trocas" }}>regras de trocas e devoluções</Link> e {contact}.</p>
        </Section>
      </>}
      {section === "contato" && <Section title="Como falar com a 3DFLEX"><p>Para dúvidas sobre produtos, pagamentos, pedidos, rastreamento ou solicitações após a compra, utilize os canais informados abaixo. Tenha o número do pedido em mãos, se disponível.</p></Section>}
      {section === "envio" && <>
        <Section title="Onde entregamos">
          <p>A {name} informa atendimento a pedidos com envio para todo o Brasil. Confira se o endereço e o CEP estão corretos antes de finalizar a compra.</p>
        </Section>
        <Section title="Valor do frete">
          <p>O frete padrão exibido no checkout é de <strong className="text-foreground">{brl(FIXED_SHIPPING_BRL)}</strong>. Em pedidos com subtotal superior a <strong className="text-foreground">R$ 600,00</strong>, o frete é grátis <strong className="text-foreground">exclusivamente no Pix</strong>. O benefício não se aplica ao cartão e não vale para subtotal exatamente igual a R$ 600,00.</p>
          <p>O resumo do pedido mostra os valores aplicados antes de concluir o pagamento.</p>
        </Section>
        <Section title="Prazo e processamento">
          <p>O prazo de preparação e o prazo estimado de transporte dependem dos itens e do destino. Como não há um prazo único publicado para todos os pedidos, confirme a previsão com o atendimento antes de pagar, especialmente em produtos sob encomenda.</p>
          <p>A contagem e a disponibilidade de expedição devem ser confirmadas pela loja após a identificação do pagamento. Caso haja atraso ou indisponibilidade, solicite atualização pelo atendimento.</p>
        </Section>
        <Section title="Rastreamento e problemas na entrega">
          <p>Após a expedição, consulte o atendimento para obter o código ou link de rastreamento disponível. Você também pode acompanhar as informações registradas em <Link className="text-primary underline" to="/conta">Meus Pedidos</Link>.</p>
          <p>Se o pacote chegar avariado, incompleto ou diferente do pedido, registre a ocorrência e entre em contato pelos canais da loja. Não descarte a embalagem antes de receber orientações.</p>
        </Section>
      </>}
      {section === "trocas" && <>
        <Section title="Direito de arrependimento">
          <p>Em compras realizadas pela internet, o consumidor pode desistir da contratação no prazo de <strong className="text-foreground">7 dias</strong>, contado da assinatura ou do recebimento do produto, conforme o art. 49 do Código de Defesa do Consumidor. O exercício desse direito não deve gerar custo para o consumidor, observadas as regras legais.</p>
        </Section>
        <Section title="Como solicitar uma troca ou devolução">
          <p>Entre em contato pelos canais informados nesta página, indicando o número do pedido, o item e o motivo da solicitação. Para problemas com o produto, descreva a ocorrência e, se possível, envie fotografias que ajudem na análise.</p>
          <p>A equipe deve orientar o procedimento e o endereço correto para a devolução. Não envie itens para um endereço não confirmado pelo atendimento.</p>
        </Section>
        <Section title="Defeitos, avarias e produto diferente">
          <p>Se receber um produto com defeito, avaria ou divergente do comprado, comunique a loja. A análise e a solução respeitarão os prazos, garantias e alternativas previstos no Código de Defesa do Consumidor, conforme o caso. Esta política não reduz direitos legais.</p>
        </Section>
        <Section title="Reembolso">
          <p>O reembolso será tratado conforme o motivo da devolução, a legislação aplicável e a forma de pagamento utilizada. A loja informará o andamento e as instruções pelo canal de atendimento.</p>
        </Section>
        <p className="text-xs">Referência: <a href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm" target="_blank" rel="noopener noreferrer" className="text-primary underline">Código de Defesa do Consumidor</a>.</p>
      </>}
      {section === "termos" && <>
        <Section title="Informações da loja">
          <p>Este site apresenta o catálogo da {name}, com características, preços e disponibilidade dos produtos cadastrados. Antes de comprar, confira nome, modelo, cor quando aplicável, quantidade e especificações. Fotos são ilustrativas do item anunciado e devem ser conferidas com sua descrição.</p>
        </Section>
        <Section title="Cadastro e informações do pedido">
          <p>O cliente deve informar dados corretos para contato e entrega. A conta permite consultar pedidos, quando essa funcionalidade estiver disponível. O uso do site deve respeitar a legislação e não envolver informações falsas ou tentativas de acesso indevido.</p>
        </Section>
        <Section title="Preços e pagamento">
          <p>O preço e o frete aplicáveis são apresentados no resumo do pedido. No Pix, a geração de um código de pagamento não comprova quitação: o pedido depende da confirmação do pagamento. No cartão, o atendimento é direcionado ao WhatsApp, onde as condições serão informadas antes da cobrança.</p>
          <p>Não compartilhe senhas nem dados sensíveis de pagamento por mensagens não verificadas. Em caso de dúvida sobre uma cobrança, contate a loja pelo canal exibido neste site.</p>
        </Section>
        <Section title="Disponibilidade, envio e cancelamento">
          <p>O atendimento pode confirmar a disponibilidade e o prazo de expedição antes da conclusão do pedido. As regras de frete estão descritas na <Link className="text-primary underline" to="/info/$slug" params={{ slug: "envio" }}>política de envio</Link>. Para cancelamentos, defeitos ou arrependimento, consulte <Link className="text-primary underline" to="/info/$slug" params={{ slug: "trocas" }}>trocas e devoluções</Link>.</p>
        </Section>
        <Section title="Privacidade e atendimento">
          <p>O tratamento de dados pessoais está descrito na <Link className="text-primary underline" to="/info/$slug" params={{ slug: "privacidade" }}>política de privacidade</Link>. Para dúvidas ou solicitações sobre pedidos, utilize {contact}.</p>
        </Section>
        <p>As informações desta página não afastam direitos assegurados pelo Código de Defesa do Consumidor ou pela legislação brasileira.</p>
      </>}
      {section === "privacidade" && <>
        <Section title="Quais dados são utilizados">
          <p>Para permitir cadastro, compra, pagamento e entrega, a loja pode tratar nome, e-mail, telefone, CPF quando necessário, endereço, itens adquiridos, histórico de pedidos e informações de confirmação do pagamento. Dados técnicos de navegação e identificadores do carrinho também podem ser utilizados para funcionamento e segurança do site.</p>
          <p>O carrinho pode ser mantido no armazenamento local do navegador. A recuperação de carrinhos pode registrar identificador aleatório, produtos, quantidades, valores estimados e última atividade. Os dados de pagamento sensíveis, como número completo do cartão e senha, não devem ser enviados ao sistema de recuperação.</p>
        </Section>
        <Section title="Para que usamos as informações">
          <p>Os dados são usados para operar a conta e o pedido, calcular valores, processar pagamentos, organizar a entrega, prestar atendimento, prevenir abusos e cumprir obrigações legais. Cada tratamento deve ter uma base legal adequada nos termos da Lei Geral de Proteção de Dados (LGPD).</p>
        </Section>
        <Section title="Mensagens e recuperação de carrinho">
          <p>Os lembretes promocionais de carrinho por e-mail ou WhatsApp dependem das autorizações opcionais e separadas apresentadas no checkout. É possível comprar sem autorizar. O descadastro pode ser solicitado pelo link da mensagem ou pelo atendimento; no WhatsApp, quando houver lembretes habilitados, você também pode responder SAIR.</p>
          <p>Os links de recuperação permitem retomar os itens do carrinho; evite compartilhá-los. O prazo de validade do link é de até 7 dias, e os registros de recuperação seguem a retenção configurada, de até 30 dias após a última atividade. Um identificador de bloqueio de novos contatos pode permanecer por até 180 dias para respeitar o descadastro.</p>
        </Section>
        <Section title="Compartilhamento e segurança">
          <p>Informações estritamente necessárias podem ser tratadas por prestadores de infraestrutura, processamento de pagamentos, entrega e comunicação para executar os serviços da loja. Não é necessário fornecer dados completos do cartão ao atendimento por mensagem.</p>
          <p>São adotados controles de acesso e recursos de proteção disponíveis na plataforma. Nenhum sistema é totalmente isento de riscos; caso identifique atividade suspeita, informe o atendimento.</p>
        </Section>
        <Section title="Armazenamento e direitos do titular">
          <p>Os registros de pedidos e transações podem ser conservados pelos períodos necessários ao cumprimento de obrigações legais, fiscais e à defesa de direitos. A exclusão do carrinho não cancela um pedido concluído.</p>
          <p>Você pode solicitar informações sobre o tratamento de seus dados, acesso, correção, eliminação quando aplicável, oposição ou revogação de consentimento, conforme a LGPD. Envie a solicitação por {contact}; poderá ser necessário confirmar sua identidade para proteger seus dados.</p>
        </Section>
        <p className="text-xs">Referência: <a href="https://www.planalto.gov.br/ccivil_03/_ato2018-2022/2018/lei/l13709.htm" target="_blank" rel="noopener noreferrer" className="text-primary underline">Lei Geral de Proteção de Dados (LGPD)</a>.</p>
      </>}
      <section className="space-y-2 border-t border-border pt-5">
        <h2 className="text-lg font-bold text-foreground">Identificação e canais da loja</h2>
        {settings.isPending ? <p>Carregando informações de contato...</p> : settings.isError ? (
          <p role="alert">Não foi possível carregar os canais de atendimento. <button type="button" className="text-primary underline" onClick={() => void settings.refetch()}>Tentar novamente</button></p>
        ) : <>
          {store?.legal_name && <p>Razão social: {store.legal_name}</p>}
          {store?.cnpj && <p>CNPJ: {store.cnpj}</p>}
          {store?.address && <p>Endereço comercial: {store.address}</p>}
          {whatsapp && <a className="block text-primary underline" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">Falar pelo WhatsApp</a>}
          {store?.email && <p>E-mail: <a className="text-primary underline" href={`mailto:${store.email}`}>{store.email}</a></p>}
          {store?.phone && <p>Telefone: {store.phone}</p>}
          {!whatsapp && !store?.email && !store?.phone && <p>Os canais de atendimento ainda não foram cadastrados. Consulte o rodapé ou retorne mais tarde.</p>}
        </>}
      </section>
    </div>
  );
}
