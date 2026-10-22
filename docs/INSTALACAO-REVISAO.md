# Instalar revisão 2026.10.05.1

1. Extraia o pacote para que a pasta ajura-organizacao-v1 esteja dentro de C:\service-express.
2. No PowerShell do Cursor, na raiz do projeto:

```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-organizacao-v1\instalar.ps1
```

O instalador verifica os arquivos da versão publicada revisada antes de gravar. Se um arquivo foi alterado, ele para e mostra qual. Não contorne essa checagem nem use git reset: é necessário preservar e revisar a alteração local.

Após instalar:

```powershell
git diff --stat
git add index.html auth.js requests.js quotes.js real-catalog.js mp-connect.js professional-dashboard.js core.js workspace.js workspace.css .gitignore package.json ajura-update-manifest.json
git add docs/REVISAO-AJURA.md docs/ARQUITETURA-AJURA.md docs/DADOS-E-MIGRACOES.md docs/VALIDACAO.md docs/INSTALACAO-REVISAO.md
git add tests/core.test.cjs tests/structure.test.cjs tests/dom.test.cjs tests/browser.test.cjs
git commit -m "refactor: organizar fluxos reais e revisar interface da AJURA"
git push origin feat/mvp-real-cadastros
```

Não é necessário SQL. A instalação não faz commit, push ou login automaticamente.

## Reversão antes de novas alterações

O instalador imprime a pasta do backup. Use:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-organizacao-v1\reverter.ps1 -BackupPath "C:\service-express\ajura-update-backups\PASTA-INFORMADA"
```

A reversão exige que os arquivos permaneçam iguais à versão instalada, para não perder trabalho posterior. Ela restaura os arquivos anteriores e remove somente os arquivos criados por esta atualização. Não altera o Supabase, pagamentos ou localStorage. Se já houve publicação, será necessário revisar e publicar a reversão com um novo commit.

## Testes locais opcionais

```powershell
npm install
npm test
npm run check
```

Os testes usam dados simulados e não chamam o Supabase nem o Mercado Pago. Após npm install, versione package-lock.json se quiser guardar o lockfile gerado; não envie node_modules. O teste Chrome é opcional e tem dependência separada, conforme VALIDACAO.md.
