# Imagens da página inicial

Em ADM → Configurações da loja, a seção **Imagens da página inicial** controla a arte grande no topo da vitrine. A imagem anterior estava fixa em `src/routes/index.tsx`; os campos de logo/banner existentes controlam apenas o rodapé.

O administrador pode enviar JPG/PNG/WebP de até 5 MB, trocar imagens, editar descrições, ordenar até oito artes e removê-las da vitrine. É necessário clicar em **Salvar imagens da página inicial**. O texto original permanece sobre as imagens, com fundo escurecido para legibilidade. As imagens preenchem a área com recorte responsivo. Com mais de uma imagem, o carrossel avança a cada 7 segundos e oferece setas e seletores manuais. A rotação pausa durante interação, com a aba oculta ou por preferência de movimento reduzido, e há controle para pausar. Remover todas oculta essa área. Restaurar imagem original recupera o hero anterior.

Os botões de apagar da página inicial e do rodapé removem referências após salvar; não apagam arquivos do bucket. Isso evita remover um arquivo ainda usado em outro lugar. O editor de dados gerais não sobrescreve a lista de imagens da página inicial.

A coluna `store_settings.homepage_images` utiliza as políticas RLS administrativas já existentes. NULL preserva a página inicial anterior; uma lista vazia remove suas imagens. A migração limita a oito entradas com descrição e URL HTTPS e não altera imagens atualmente publicadas. O script `scripts/repair-store-assets.sql` registra as políticas de upload administrativo aplicadas no bucket já criado pelo proprietário.

Validação: testes de navegação, upload/troca, remoção, falha de salvamento, URLs, remoção de logo/banner e preservação das configurações independentes; TypeScript, build e migração em banco isolado. Backend validado por consulta de coluna, RLS e função de validação. Upload autenticado e aparência em produção precisam de verificação após publicação pelo proprietário; nenhuma imagem de produção foi alterada para testar.
