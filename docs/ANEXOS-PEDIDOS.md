# AJURA — fotos e PDFs nos pedidos

## Instalação
1. Extraia a pasta ajura-anexos-pedidos dentro de C:\service-express.
2. Abra arquivos/supabase/request-files.sql e execute TODO o conteúdo no SQL Editor do Supabase. Run aplica; Save guarda o texto. A migração é repetível, adiciona somente seu bucket privado, tabela, funções e políticas. Não altera estados nem cria cobranças.
3. No Cursor:
```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-anexos-pedidos\instalar.ps1
Start-Process chrome.exe "C:\service-express\index.html"
```
O instalador verifica a base publicada, cria backup e não sobrescreve arquivos divergentes. A instalação não executa SQL.

## Funcionamento
Cliente cria a solicitação e depois envia arquivos na conversa. Prestador abre os anexos no mesmo pedido. JPG, PNG e PDF: até cinco anexos registrados por pedido e 5 MB por arquivo. Pedidos encerrados não aceitam novos envios. Conta inativa e prestador não aprovado não obtêm novos links dos anexos. Terceiros não têm acesso. Não há acesso administrativo por esta entrega.
Links de download duram cinco minutos. Quem receber um link válido pode utilizá-lo até expirar; evite compartilhá-lo. Não são links públicos permanentes. Os arquivos não aparecem na vitrine.
A tela confere tipo, tamanho e assinatura inicial do arquivo. O bucket e o registro conferem MIME/tamanho; não foi implementada inspeção de conteúdo no servidor nem antivírus. Arquivos registrados não podem ser apagados ou substituídos pela tela, preservando o histórico. Upload sem registro pode ser removido pelo remetente; uploads órfãos após perda de conexão ainda precisarão de rotina operacional de limpeza.
Envio parcial mostra a quantidade já enviada. Reabra a lista antes de repetir a seleção. Não é criado outro pedido por falha no upload.

## Teste real pendente
Use contas distintas, uma de cliente e outra de prestador aprovado.
- Crie uma solicitação e envie uma foto JPG/PNG e um PDF, sem dados pessoais desnecessários.
- Reabra e confirme a persistência; abra pelo prestador.
- Conta terceira não deve conseguir consultar tabela ou arquivo daquele pedido.
- Arquivo de tipo incorreto, vazio ou acima de 5 MB deve ser recusado; mais de cinco anexos registrados deve ser impedido.
- Prestador não recebe formulário de upload. Pedido cancelado não aceita novos anexos.
- Valide mensagem/conversa e orçamento existentes após a instalação.
A busca e os documentos de verificação do prestador usam módulos/buckets diferentes.

## Validação realizada
Sintaxe JavaScript, testes de núcleo/estrutura/DOM simulado existentes e quatro testes de anexos passaram. PostgreSQL local com PGlite: migração repetida, políticas RLS de participantes, terceiros bloqueados, prestador sem registro de upload, limite de cinco, cancelamento e registro idempotente. Storage foi simulado no banco local; serviço de upload real, links assinados e navegador visual ainda precisam do teste no seu Supabase.
Fonte técnica: https://supabase.com/docs/guides/storage/buckets/fundamentals e https://supabase.com/docs/guides/storage/security/access-control .

## Publicação após teste
```powershell
git add index.html requests.js request-files.js supabase/request-files.sql
git add tests/request-files.test.cjs docs/ANEXOS-PEDIDOS.md .gitignore ajura-update-manifest.json
git commit -m "feat: adicionar anexos privados nas solicitacoes"
git push origin feat/mvp-real-cadastros
```
Teste automatizado adicional, com dependências do projeto instaladas:
```powershell
node --test tests/request-files.test.cjs
```
O rollback da interface usa reverter.ps1 -Backup com o diretório informado pelo instalador; não remove SQL, bucket nem arquivos armazenados.
Continuam pendentes os testes anteriores de suspensão e ciclo completo pedido/conversa/orçamento/aceite. Esta entrega não implementa pagamento ou códigos de início/conclusão.
