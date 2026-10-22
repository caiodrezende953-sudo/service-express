# Login e sessão — compatível com af16623

Sem SQL ou mudança de senhas. O instalador confere os arquivos antes de escrever e cria backup; preserva catálogo, atividades, uploads, orçamentos e interface mobile. O auth.js foi comparado ao commit af16623.

Login envia a senha existente sem impor o mínimo de cadastro na tela; o Supabase decide a autenticação. Cadastro e redefinição mantêm os requisitos anteriores: 12 caracteres, maiúscula, minúscula, número e símbolo, até 72 bytes. Não foram alteradas as configurações de Auth no servidor.

Login, cadastro, recuperação e redefinição têm bloqueio de envio simultâneo, tratamento de exceções e liberação de botão. Erros preservam campos na tela. Formulários removidos ou em diálogo fechado não recebem retorno visual tardio. Mensagens técnicas de autenticação são substituídas por orientações. Telefone inválido e confirmação de senha divergente não recriam o formulário.

A restauração inicial não sobrescreve um evento de sessão mais recente. Consultas de conta e leituras do cadastro profissional descartam respostas após alteração da sessão. Mudança entre usuários e saída limpam o conteúdo do modal. Saída tem proteção contra cliques simultâneos, captura de falha de rede e nova tentativa; em erro não afirma que a sessão foi encerrada. Recuperação adiada não abre a tela depois de um evento de sessão mais recente.

Isso não cancela requisições já recebidas pelo servidor, não substitui RLS e não garante revogação instantânea de um JWT já emitido. Formulários profissionais de gravação não foram reestruturados nesta entrega.

Testes automáticos verificam falhas, concorrência, retorno tardio, restauração antiga, consulta privada pendente, falha de logout e política de senha. Também executados testes gerais e regressões de atividades, mobile e orçamentos. Login real, e-mail de recuperação, confirmação de cadastro e troca entre contas continuam no roteiro da revisão integrada.
