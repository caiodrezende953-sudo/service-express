const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),ui=fs.readFileSync(path.join(root,'ui.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('id="paymentsButton"'));assert(ui.includes("readLocal('sx-payments-v1'"));assert(ui.includes("saveLocal('sx-payments-v1'"));assert(ui.includes("mode==='cliente'?'Pagamentos':'Recebimentos'"));assert(ui.includes('Valor do profissional'));assert(ui.includes('Taxa ilustrativa'));assert(ui.includes('Total do cliente'));assert(ui.includes("o.status==='Concluído'"));
for(const forbidden of ['card_number','cardNumber','cvv','securityCode','pixKey'])assert(!ui.includes(forbidden),`campo financeiro indevido: ${forbidden}`);
console.log('PASS: abas de pagamentos/recebimentos, discriminação de valores, persistência separada e ausência de campos financeiros sensíveis.');
