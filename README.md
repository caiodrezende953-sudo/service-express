# AJURA — piloto fechado

Marketplace de serviços em Manaus, com site estático e Supabase. Versão 0.10.0 — atualização incremental e avisos na conversa aberta, sobre o commit 9aeead2. Leia docs/RESPOSTAS-ATUALIZADAS.md. A consulta foi aplicada no Supabase; não execute SQL manualmente. Pagamentos continuam após os blocos atuais.

## Abrir e validar

Abra `index.html` no navegador para verificações locais. Use a página HTTPS publicada para autenticação por e-mail, recuperação de senha e autorização de teste do Mercado Pago. Não basta enviar arquivos para uma branch: a publicação depende da configuração do GitHub Pages.

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run check
npm.cmd run test:sql
```

`test` usa um DOM simulado. `test:sql` monta uma instância PostgreSQL isolada em memória com usuários sintéticos; não acessa o Supabase nem cria contas reais. Isso não substitui verificar o ciclo com duas contas no navegador.

## O que já existe

- Contas cliente, prestador ou ambos; administração autorizada pelo banco.
- Cadastro profissional, CPF/CNPJ, bairros e ofertas; publicação condicionada à aprovação.
- Catálogo com 85 categorias e 858 subserviços em 14 grupos. Catálogo não é uma lista de profissionais cadastrados.
- Solicitações reais com local privado, propostas, conversa, anexos, Central e histórico.
- Início e conclusão por códigos do cliente; avaliação de serviço concluído e moderação.
- Reagendamento proposto pelo prestador e confirmado pelo cliente, sem alterar o valor e o escopo.
- Aprovação regulamentada por serviço exato. A plataforma registra a análise administrativa; selecionar uma profissão não comprova habilitação.

## O que está em preparação

Pagamentos, comissão, split, captura, retenção e repasse continuam por último. A conexão Mercado Pago existente é de teste. “Proposta aceita”, “pagamento preparado” e código de conclusão não comprovam recebimento financeiro.

O assistente de descrição do problema, a abertura pública, textos finais de termos/privacidade e os demais itens de interface e desempenho continuam no roteiro. Não há promessa de que todo profissional do mercado esteja catalogado ou autorizado a exercer atividades relacionadas.

## Documentação atual

- [Correções, instalação, publicação e reversão](docs/BUGS-E-PROTECAO.md)
- [Roteiro das 45 melhorias](docs/ROADMAP-UPGRADE.md)
- [Supabase e migrações](SUPABASE.md)
- [Arquitetura existente](docs/ARQUITETURA-AJURA.md)

As instruções antigas foram mantidas em `docs/historico/`. Os dados da demonstração no localStorage são separados dos registros reais e não devem ser usados como controle de acesso. Não limpe o armazenamento para instalar uma atualização.
