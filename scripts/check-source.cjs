const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');const files=fs.readdirSync(root).filter(name=>name.endsWith('.js')).sort();
for(const file of files){const result=spawnSync(process.execPath,['--check',path.join(root,file)],{cwd:root,stdio:'inherit'});if(result.error||result.status!==0){console.error('Falha na sintaxe:',file);process.exit(1);}}
console.log(`PASS: sintaxe de ${files.length} scripts do aplicativo.`);
