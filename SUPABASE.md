# Configurar cadastro real da AJURA

Esta etapa habilita autenticação e perfis para um teste fechado. Ela ainda não habilita cadastro profissional completo, pedidos reais nem pagamentos.

## 1. Criar o projeto

1. Crie um projeto em https://supabase.com/dashboard.
2. Escolha uma senha forte para o banco e guarde-a fora do repositório.
3. Use a região mais próxima disponível para o público brasileiro.

## 2. Criar as tabelas e regras

1. Abra **SQL Editor** no painel do projeto.
2. Copie todo o conteúdo de `supabase/schema.sql`.
3. Execute uma vez e confirme que a tabela `public.profiles` foi criada com RLS habilitado.

## 3. Configurar o site

Em **Project Settings > API**, copie apenas:

- Project URL;
- chave pública `anon` ou `publishable`.

Preencha `supabase-config.js`:

```js
window.AJURA_SUPABASE = {
  url: 'https://SEU-PROJETO.supabase.co',
  anonKey: 'SUA-CHAVE-PUBLICA'
};
```

Nunca coloque a chave `service_role`, senha do banco ou outro segredo em HTML ou JavaScript público.

## 4. URLs de autenticação

Em **Authentication > URL Configuration**:

- Site URL: `https://caiodrezende953-sudo.github.io/service-express/`
- Redirect URL permitida: `https://caiodrezende953-sudo.github.io/service-express/`

Mantenha a confirmação de e-mail habilitada. Não abra o cadastro ao público antes de publicar Termos de Uso e Política de Privacidade.

## 5. Teste mínimo

1. Crie uma conta de cliente com um e-mail de teste.
2. Confirme o e-mail recebido.
3. Entre e confira **Minha conta**.
4. No Table Editor, confirme que existe exatamente um perfil para o usuário.
5. Saia, recupere a senha e confirme que o link retorna ao endereço publicado.
6. Entre com outra conta e confirme que ela não consegue consultar nem alterar o primeiro perfil.

## 6. Trave a escolha do tipo de conta depois do cadastro

Em projetos criados com a versão anterior de `schema.sql`, execute uma vez
`supabase/lock-profile-role.sql` no SQL Editor. O cadastro continua aceitando
cliente, prestador ou ambos, mas a pessoa não pode mudar `account_type` depois
diretamente pelo navegador. O SQL interrompe a transação se esse bloqueio falhar.

Confira depois:

```sql
select
  has_column_privilege('authenticated', 'public.profiles', 'account_type', 'UPDATE') as pode_mudar_tipo,
  has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE') as pode_atualizar_telefone;
```

O esperado é `false` e `true`, respectivamente.

## 7. Ativar o cadastro completo do cliente

Execute uma vez `supabase/client-profile.sql`. Ele adiciona rua, número,
complemento e referência ao perfil, mantém RLS e cria o histórico de aceite
de Termos e Política por versão. O formulário do site libera a edição desses
dados; o endereço completo não entra na vitrine pública.

Os documentos ainda precisam ser publicados antes de registrar um aceite real.
Quando houver texto aprovado, use versões como `termos-1.0` e `privacidade-1.0`
no formulário de aceite da próxima entrega.

Para concluir o teste de recuperação, em **Authentication > URL Configuration**
inclua `https://caiodrezende953-sudo.github.io/service-express/index.html`
nas URLs de redirecionamento permitidas. O link de recuperação enviado pelo
site usa esse endereço exato. Depois teste **Esqueci minha senha**, abra o link
no e-mail, altere a senha e entre novamente com ela. Não envie o link, código
ou senha a ninguém.


## Etapa 3 — identificação privada do prestador
Executar `supabase/provider-onboarding.sql` sobre a base existente. A aprovação usada pela aplicação é `provider_profiles.approval_status`; os campos extras em `profiles` criados anteriormente não são usados como aprovação. Não executar novamente schema.sql.
CPF/CNPJ e razão social são salvos em provider_private_details, acessível apenas ao próprio usuário pela API. Conferência administrativa de documentos e upload de fotos/documentos ainda pendentes. O formato numérico é validado; isso não comprova autenticidade do documento.
Testar com conta provider/both: identificação, bairros, múltiplos serviços, recarga e ausência de pendentes na vitrine real.
