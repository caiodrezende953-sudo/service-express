/* Suite local sem navegador e sem serviços externos. Falhas retornam código não zero. */
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'tests');
const legacy=new Set(['catalogo.cjs','menu-servicos.cjs','pagamentos.cjs']);
const files=fs.readdirSync(directory).filter(name=>name!=='browser.test.cjs'&&(name.endsWith('.test.cjs')||legacy.has(name))).sort().map(name=>path.join(directory,name));
if(!files.length){console.error('Nenhum teste local encontrado.');process.exit(1);}
console.log(`AJURA: ${files.length} arquivos de testes locais. Navegador real e banco real são validações separadas.`);
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit',env:process.env});
if(result.error){console.error('Não foi possível iniciar os testes:',result.error.message);process.exit(1);}
process.exit(result.status===null?1:result.status);
