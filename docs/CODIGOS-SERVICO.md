# Inicio e conclusao sem pagamento integrado

Este pacote adiciona estados in_progress e completed aos pedidos, timestamps started_at/completed_at e execution_quote_id. Nao inicia pedidos antigos, nao cobra, nao retira saldo nem faz repasse. Pagamentos continuam pendentes; estes codigos nao devem ser apresentados como garantia financeira.

Depois do aceite, cliente gera o codigo de inicio e compartilha apenas presencialmente ao autorizar o trabalho. Prestador confirma: pedido passa para em execucao e fica ligado ao orcamento aceito. Cliente gera codigo de conclusao apenas depois de conferir o servico; prestador confirma para concluir. Servidor valida usuario, papel, conta ativa, prestador aprovado, estado e codigo. Data da proposta deve ser atual ou futura no inicio. Conclusao nao exige que a data original ainda esteja no futuro.

Segredos: seis numeros gerados no servidor. Banco guarda hash SHA-256 com salt UUID em tabela privada, sem acesso direto para authenticated/anon. Codigo em claro retorna somente ao cliente que o gerou, nao vai ao historico nem ao localStorage. Ao fechar a conversa ele desaparece; cliente pode gerar outro apos 60 segundos. Novo codigo difere do anterior e invalida o antigo. Codigo de conclusao difere do de inicio.

Validade: 15 minutos; 5 erros validos de seis digitos bloqueiam por 15 minutos. Regenerar antes do bloqueio nao zera erros. Depois do bloqueio cliente deve gerar novo codigo. Tentativas incorretas retornam resultado em vez de excecao para manter contador gravado. Concorrencia protegida por lock do pedido; erro de rede requer atualizar conversa para conferir se a confirmacao ocorreu.

Historico usa o trigger existente request_events para registrar mudancas de estado, sem codigos. Conversa permanece ativa durante execucao; depois da conclusao fica em leitura e Central permanece disponivel. Upload de novos anexos continua permitido apenas antes do inicio pelo fluxo anterior. Cancelar/recusar diretamente continua permitido apenas antes do inicio. Problemas durante execucao e prestador suspenso devem ir para Central; este bloco nao implementa cancelamento administrativo de servico em execucao, nem conclusao forcada, nem avaliacao real.

Executar supabase/service-codes.sql no Supabase, instalar o pacote e rodar testes. Validar com duas contas AJURA distintas: aceite, gerar inicio, codigo incorreto, correto, recarregar, gerar conclusao, correto, recarregar. Prestador nao ve codigo privado nem botao de gerar. Cliente nao pode confirmar. Terceiro nao tem acesso. Nao usar codigo real de um pedido na documentacao publica.

Testes locais: DOM simulado (5 novos + suites existentes) e PostgreSQL local PGlite com fixtures para permissoes, validade, contador, bloqueio e transicoes. Ainda exige teste de integracao no Supabase real e navegador.
