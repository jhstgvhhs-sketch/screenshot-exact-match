# 3DFLEX — correções pontuais de usabilidade

## Implementado

- O CTA **Explorar produtos** passou para o conteúdo compartilhado dos banners. Existe uma única instância por banner ativo, inclusive no carrossel personalizado e quando as imagens são removidas. Destino `/produtos`, fundo `#FF6A00`, texto preto, área mínima de 44 px e foco de teclado. O link recebe `pointer-events-auto` dentro da camada que já usava `pointer-events-none`.
- A imagem, o modo de ajuste, a altura desktop de 650 px e as regras de avanço/pausa do carrossel foram preservados. Apenas os espaçamentos do conteúdo móvel foram compactados para acomodar a ação sem introduzir faixas extras ou disputar espaço com os controles.
- Removida exclusivamente a informação obsoleta de pagamentos não ativados no carrinho. Nenhuma afirmação nova sobre aprovação ou segurança de pagamentos foi adicionada nesse local.
- No checkout, a lista dos itens começa recolhida abaixo de 1024 px e pode ser expandida. Subtotal, frete, total, cupom e brindes continuam acessíveis. Em desktop, a lista continua aberta e o formulário mantém as duas colunas com o resumo lateral. Os campos de entrega usam 16 px em telas pequenas.
- As variantes mantêm os círculos, agora com nomes compactos, marcador de seleção, destaque de foco e indicação acessível do nome selecionado. A seleção continua atualizando a variante e sua foto. A grade compacta evita transformar as cores em uma longa lista vertical.
- Trocas/devoluções e termos agora têm seções organizadas com os direitos legais e as condições já presentes no projeto. Não foram inventados endereço de devolução, prazo operacional de reembolso, garantia comercial, prazo de entrega ou dados da empresa. Os contatos continuam vindo das configurações existentes. Links do rodapé e o `noindex` anterior dessas páginas foram preservados.

## Trabalho remoto preservado

A branch `main` recebeu alterações de outros trabalhos durante a execução. Foram incorporadas a configuração do WhatsApp do checkout pelo ADM e a publicação/apresentação de produtos simples sem escolha de cor. O ajuste de variantes preserva a seleção automática da variante `Padrão` para acessórios/impressoras simples; há um teste específico dessa compatibilidade.

## Validação

- Suíte completa: **257 testes** em 52 arquivos, executada com dois workers após uma execução concorrente ter um worker encerrado inesperadamente. O resultado final deve ser consultado junto ao commit; não houve alteração de configuração de testes para ocultar falhas.
- Verificação de tipos e build de produção executados. Lint dos componentes e testes alterados que já seguem a formatação do projeto executado.
- Chromium local: **360, 390, 768 e 1440 px**. Foram verificadas 32 combinações de largura/página: banner padrão, banner personalizado, produto, carrinho, checkout, QR em fixture isolada, trocas e termos.
- Conferidos: um único CTA visível, largura dentro da tela, altura mínima de toque, clique até o catálogo, avanço manual do carrossel, seleção de cor, adicionar ao carrinho, navegação até checkout, expansão/recolhimento da lista, cupom visível e ausência de rolagem horizontal. Menu móvel e estrutura de duas colunas desktop também foram conferidos.
- O checkout foi testado visualmente com **13 itens locais**, para confirmar que a lista não alonga o resumo móvel. O QR foi renderizado pelo componente existente com um texto explicitamente não pagável, sem criar transação.
- Os testes visuais finais usaram dados e imagens locais de conferência e interceptaram chamadas externas. Toda gravação e chamada financeira ficou bloqueada. Não houve cobrança, cadastro de cliente, mudança de estoque, criação de pedido ou envio de mensagem real.
- A inspeção local incluiu capturas das telas. Ela não substitui a conferência da publicação no domínio da loja nem um teste real do provedor; essas ações não foram executadas nesta entrega.

## Preservação

Não foram modificados os corpos de `beginPix` e `beginCard`, geração de Pix, consulta financeira, webhook, funções Supabase, autenticação, regras de frete, validação do cupom, cálculo dos brindes, estoque, ADM, dashboard, carrinhos abandonados, avaliações ou histórico de pedidos. Não houve alteração de banco, credenciais ou variáveis de ambiente.

## Informações necessárias antes da versão definitiva das políticas

1. Confirmar identificação empresarial, documento, endereço e canais de atendimento já cadastrados.
2. Informar endereço e destinatário corretos para devoluções, caso sejam diferentes do endereço comercial.
3. Confirmar o procedimento de solicitação e logística reversa para arrependimento, defeito, avaria e divergência, respeitando os direitos legais.
4. Definir as etapas operacionais de reembolso e de troca e a comunicação de acompanhamento, sem reduzir prazos ou direitos legais.
5. Confirmar horários de atendimento, prazos de preparação/postagem e como informar a estimativa de entrega antes da compra.
6. Informar se existem condições voluntárias de troca ou garantia comercial adicionais às garantias legais. Nada disso foi presumido.

Bases consultadas: [CDC, especialmente art. 49](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) e [Decreto nº 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm). O conteúdo implementado é uma base informativa; os procedimentos próprios da loja dependem das confirmações acima.

## Arquivos

- `src/components/site/HomeImages.tsx`
- `src/components/site/StoreInformation.tsx`
- `src/routes/index.tsx`
- `src/routes/carrinho.tsx`
- `src/routes/checkout.tsx`
- `src/routes/produto.$slug.tsx`
- `src/test/home-images.test.tsx`
- `src/test/checkout-flow.test.tsx`
- `src/test/product-experience.test.tsx`
- `src/test/store-information.test.tsx`
- `src/test/admin-catalog.test.tsx`
- `docs/priority-usability-fixes.md`

## Publicação

Alterações destinadas à branch `main` do repositório conectado. A publicação da interface continua sob responsabilidade do proprietário. Não houve edição de código no Lovable ou consumo de créditos do agente Lovable.
