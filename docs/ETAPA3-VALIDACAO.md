# AJURA — etapa 3: identificação e requisitos

1. No SQL Editor do Supabase, execute todo o conteúdo de `supabase/provider-validation.sql` do pacote. O último resultado é uma contagem de documentos antigos a corrigir, e não um erro. Run aplica a migração; Save apenas conserva o texto da consulta.
2. Execute instalar.ps1 na pasta do pacote dentro de C:\service-express. O instalador verifica os arquivos antes de alterar qualquer um e cria backup. Ele não executa SQL.
3. Teste no perfil profissional: CPF incorreto deve impedir salvar; documento correto, nome, bairros e serviços devem atualizar o checklist ao reabrir o formulário.
4. Na administração, clique em Conferir requisitos, identificação e arquivos. Aprovar só habilita quando o checklist está completo. Ainda confira os dados e arquivos manualmente.
5. Teste conta cliente sem acesso profissional, conta prestador e conta ambos. Cadastro pendente não deve aparecer na busca. Recusa permite correção e reenvio; suspensão não deve ser revertida por editar o cadastro.

## Limites e próximos passos
Validação de dígitos não confirma existência, situação cadastral ou titularidade do documento. CNPJ com letras é aceito segundo o algoritmo da Receita Federal. Documentos específicos por profissão ainda precisam de definição: esta entrega não torna uploads obrigatórios, não automatiza a aprovação e não implementa pagamentos.
Registros antigos não são apagados, corrigidos nem suspensos em lote. A restrição NOT VALID preserva registros antigos, mas exige documento válido em novas inserções e atualizações da identificação. Novas aprovações exigem checklist completo no servidor.

## Verificação realizada
Validação JavaScript: CPF, CNPJ numérico, CNPJ alfanumérico e caracteres inválidos.
Testes existentes: núcleo, estrutura e DOM simulado passaram. Sem teste visual em navegador.
PostgreSQL local via PGlite: sintaxe e execução da migração, repetição, legado inválido preservado, novos documentos inválidos rejeitados, aprovação incompleta bloqueada, aprovação completa e permissões do checklist. Não foi executado no seu Supabase por esta sessão.

## Publicar após SQL e teste local
```powershell
git add core.js auth.js admin.js index.html supabase/provider-validation.sql tests/document.test.cjs docs/ETAPA3-VALIDACAO.md .gitignore ajura-update-manifest.json
git commit -m "feat: validar documentos e requisitos de aprovacao do prestador"
git push origin feat/mvp-real-cadastros
```

## Reverter somente a interface
O backup informado pelo instalador contém rollback.json. Use reverter.ps1 com -Backup apontando para esse diretório. Não reverte o SQL; regras do banco permanecem. Não remova restrições para contornar cadastros incorretos.
