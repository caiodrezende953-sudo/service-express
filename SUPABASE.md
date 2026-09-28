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
