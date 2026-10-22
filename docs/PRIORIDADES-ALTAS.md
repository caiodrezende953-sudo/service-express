# Prioridades altas — 07/10/2026

## Migrações já aplicadas
As cinco cópias security-*.sql deste pacote refletem correções aplicadas diretamente no Supabase. Não executar manualmente. Versionar junto com o site. Ordem: active-access, private-files, provider-writes, private-rpc, upload-quota. O histórico remoto inclui as migrações restrict_internal_trigger_execution, require_active_admin_and_request_reader, protect_private_files_and_fix_attachment_paths, require_active_provider_for_catalog_writes, require_active_profile_for_private_status_rpc e limit_pilot_private_uploads. A primeira cópia reúne duas migrações.

## Limites gratuitos do piloto
10 objetos de verificação por prestador; 5 objetos por pedido para anexos do cliente; 5 MB por arquivo nos buckets privados. Uploads ainda sem registro entram na contagem. Função interna com autorização e bloqueio de transação por escopo; nenhuma exclusão automática de arquivos. Os limites por usuário não garantem que o total do projeto ficará dentro do plano gratuito. É necessário monitorar o consumo global e manter o piloto pequeno.

## Teste de arquivos — ainda pendente na interface
Use apenas uma foto de teste sem documentos pessoais. Contas distintas: cliente no Chrome, prestador aprovado em janela anônima. Uma terceira conta testa isolamento. Não compartilhar senha nem enviar tokens ao chat.
1. Cliente cria pedido para o prestador. Na conversa, envia JPEG ou PDF de teste menor que 5 MB.
2. Cliente e prestador abrem o anexo e conferem o mesmo conteúdo.
3. Terceiro não encontra o pedido nem consegue solicitar um novo link privado dele. Se souber o ID do pedido, a consulta deve continuar negada.
4. Prestador envia documento de teste em Documentos e fotos. Cliente e terceiro não devem conseguir abrir essa área privada dele. Administrador ativo verifica o documento no painel.
5. Arquivo maior que 5 MB e tipo não permitido devem ser rejeitados. Até cinco anexos no pedido; sexto deve ser rejeitado. Não é necessário consumir 10 documentos reais: esse limite foi testado em banco local isolado.
6. Fechar a tela ou interromper rede durante envio não deve inserir arquivo duplicado. Não repetir uploads caso já apareçam na lista.
7. Verificação de conta bloqueada exige uma conta dedicada ao teste, não bloquear a conta principal ou administrador. Continua pendente se não houver tal conta.
8. Links assinados já emitidos podem continuar válidos até expirar (documentos 60 segundos, anexos 300 segundos). Não testar isolamento compartilhando um link assinado: ele permite acesso a quem o possui durante esse prazo.
Registre PASSOU/FALHOU e mensagem exibida em cada passo. Ainda não consideramos esses testes concluídos.

## Validação executada
Testes locais SQL de limite 10/5, conta bloqueada, dono do caminho e separação por pedido passaram. Não houve teste de concorrência com múltiplas conexões nem teste visual com sessões reais. Políticas conferidas no servidor após aplicar; nenhum documento ou pedido existente apagado.
