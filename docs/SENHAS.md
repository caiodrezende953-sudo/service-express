# Senhas AJURA
Cadastro e redefinição: mínimo 12 caracteres, minúscula a-z, maiúscula A-Z, número e símbolo compatível com Supabase. Limite 72 bytes, respeitando bcrypt. Validação local preserva formulário quando senha insuficiente. Não grava ou registra senhas. Login não exige a nova regra para permitir contas existentes.

Configuração necessária no Supabase: Authentication > Sign In / Providers > Email. Minimum password length: 12. Required characters: lowercase, uppercase, digits and symbols. Save. Não foi aplicada via conector: ferramenta de configuração Auth não disponível. Regras apenas no navegador não protegem contra cadastro direto pela API.

Proteção contra senhas vazadas depende de plano Pro ou superior. Não foi ativada nem houve troca de plano.
Fonte: https://supabase.com/docs/guides/auth/password-security
