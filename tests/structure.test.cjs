const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),scripts=[...html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"/g)].map(m=>m[1]);
assert.equal(new Set(scripts).size,scripts.length,'Módulo repetido');for(const f of ['core.js','auth.js','safe-actions.js','service-reschedule.js','real-catalog.js','requests.js','quotes.js','professional-dashboard.js','workspace.js'])assert(scripts.includes(f),f);
assert(scripts.indexOf('core.js')<scripts.indexOf('auth.js'));assert(scripts.indexOf('requests.js')<scripts.indexOf('professional-dashboard.js'));assert(scripts.indexOf('workspace.js')===scripts.length-1);assert(scripts.indexOf('visual.js')<scripts.indexOf('workspace.js'));assert.equal((html.match(/href="visual.css/g)||[]).length,1);
assert(scripts.indexOf('auth.js')<scripts.indexOf('safe-actions.js'));assert(scripts.indexOf('safe-actions.js')<scripts.indexOf('service-reschedule.js'));assert(scripts.indexOf('service-reschedule.js')<scripts.indexOf('messaging.js'));
const auth=fs.readFileSync('auth.js','utf8');assert(!auth.includes("script.src = 'real-catalog.js'"));assert(!auth.includes("adminScript.src = 'admin.js'"));
console.log('PASS: módulos únicos, dependências e ordem de inicialização.');
