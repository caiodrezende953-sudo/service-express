const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'catalogo.js'),'utf8');
const ctx=vm.createContext({Object,Set});vm.runInContext(source+';globalThis.out={catalog:SERVICE_CATALOG,groups:SERVICE_GROUPS,labels:SERVICE_NATURE_LABELS,taxonomy};',ctx);const {catalog,groups,taxonomy}=ctx.out;
assert(catalog.length>=60);assert(groups.includes('Mídia e criatividade'));
const categories=catalog.map(x=>x.category);assert.equal(new Set(categories).size,categories.length,'categoria duplicada');
let subs=0;for(const item of catalog){assert(['essential','regular','regulated'].includes(item.nature));assert(item.group&&item.category&&item.subs.length);assert.equal(new Set(item.subs).size,item.subs.length,`duplicado em ${item.category}`);subs+=item.subs.length;}
assert(subs>=250);for(const [cat,items] of Object.entries({'Elétrica':['Tomadas e interruptores','Iluminação'],'Climatização':['Limpeza de split'],'Limpeza':['Residencial'],'Casa e utensílios':['Alças e cabos de panela'],'Celulares e eletrônicos':['Celulares e tablets'],'Automotivo':['Lavagem de carro'],'Fotografia':['Fotografia de produto'],'Design e mídia digital':['Artes para redes sociais']})){assert(taxonomy[cat],cat);for(const item of items)assert(taxonomy[cat].includes(item),`${cat}: ${item}`);}
const ui=fs.readFileSync(path.join(root,'ui.js'),'utf8');assert(ui.includes('catalogEmptyCards'));assert(ui.includes('data-interest'));assert(ui.includes("$('#nature').onchange"));
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(index.indexOf('catalogo.js')<index.indexOf('v2.js'));
console.log(`PASS: ${catalog.length} categorias, ${subs} subserviços, ${groups.length} grupos; sem categorias ou subserviços duplicados dentro da categoria.`);
