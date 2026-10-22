# Avaliacoes reais

Requer service-codes.sql e request-overview.sql. Executar service-reviews.sql no Supabase e instalar o pacote. Migracao nao importa localStorage, nao cria comentarios nem notas demonstrativas, nao altera pedidos existentes nem pagamentos.

Uma avaliacao por pedido concluido pelo ciclo real: cliente ativo desse pedido, status completed, timestamps de inicio e conclusao, referencia a orcamento aceito desse pedido e prestador. Nota inteira 1 a 5, comentario opcional ate 500 caracteres. Sem edicao pela interface. Reenvio com os mesmos dados e idempotente; tentativa de nota/comentario diferente e recusada. Escrita e evento de historico na mesma transacao com lock do pedido.

Tabela service_reviews tem RLS e nenhum acesso direto para anon/authenticated. Funcoes conferem atores e permissao. Contexto do pedido disponivel somente aos participantes ativos. Vitrine autenticada lista comentarios de prestadores aprovados e ativos, sem nome/UUID do cliente, endereco, documentos ou UUID do pedido. Prestador ativo pode consultar sua reputacao mesmo suspenso. Administrador ativo pode consultar pelo RPC; interface de moderacao ainda nao implementada.

Comentario e nota ficam publicados nas avaliacoes do profissional; formulario informa isso e pede para nao incluir dados pessoais. HTML e exibido como texto. Nao existe detector automatico de dados pessoais, moderacao automatica ou direito de resposta neste bloco. Caso necessite correcao/moderacao, registrar atendimento da Central.

Media = soma das notas / numero de avaliacoes reais. Exibicao com uma casa decimal; filtro e ordenacao usam o valor nao arredondado. Sem avaliacoes: Novo na plataforma, nao nota zero. Falha de consulta: Avaliacoes indisponiveis; filtro e ordenacao por nota desabilitados, ofertas continuam disponiveis. Exemplos demonstrativos existentes permanecem separados e nao entram na media real.

Consulta publica dentro da vitrine e paginada em 20; medias consultadas em lotes de ate 100 prestadores. Evento ajura:reviews-changed atualiza vitrine apos envio; outra sessao precisa atualizar ofertas/recarregar para ver nota nova. Painel profissional mostra media, quantidade e botao Ver avaliacoes.

Validacao real: cliente avalia pedido concluido, reload conserva nota; prestador consulta sem editar; repetir avaliacao nao cria outra; pedido aberto nao oferece formulario; verificar filtro e ordenacao; comentarios com marcacao sao texto. Apenas contas de teste e pedidos de teste ate revisao completa do MVP. Estes testes nao comprovam processamento de pagamentos.

QA local: PostgreSQL PGlite com fixtures (autorizacao, conclusao, notas invalidas, 500 caracteres, repeticao, medias, acesso direto bloqueado, privacidade e suspensao); seis testes DOM de avaliacoes e testes gerais existentes. Exige teste posterior no Supabase real.
