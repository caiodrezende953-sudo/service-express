/* Descoberta explícita para funcionar também no terminal Windows, sem expansão de glob. */
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'tests/sql');
const files=fs.readdirSync(dir).filter(name=>name.endsWith('.test.cjs')).sort().map(name=>path.join(dir,name));
if(!files.length){console.error('Nenhum teste SQL encontrado.');process.exit(1);}
console.log('AJURA: PostgreSQL isolado, sem acesso ao Supabase real.');
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit'});
if(result.error){console.error(result.error.message);process.exit(1);}process.exit(result.status===null?1:result.status);
