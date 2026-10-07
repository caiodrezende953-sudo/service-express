const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {}, Intl, Date, console, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../core.js'),'utf8'), context);
const {valid, normalize} = context.window.AJURA_DOCUMENT;
test('CPF: conferência dos dois dígitos', () => {
 assert.equal(valid('529.982.247-25'),true);
 assert.equal(valid('52998224724'),false);
 assert.equal(valid('12345678900'),false);
 assert.equal(valid('11111111111'),false);
});
test('CNPJ numérico e alfanumérico: exemplos da Receita', () => {
 assert.equal(valid('11.222.333/0001-81'),true);
 assert.equal(valid('12.ABC.345/01DE-35'),true);
 assert.equal(valid('00.000.000/E08G-12'),true);
 assert.equal(valid('12.ABC.345/01DE-34'),false);
 assert.equal(valid('00000000000000'),false);
});
test('Pontuação permitida, letras preservadas e caracteres inválidos rejeitados', () => {
 assert.equal(normalize(' 12.abc.345/01de-35 '),'12ABC34501DE35');
 for (const value of [null,'','<52998224725>','52998224725!','é2ABC34501DE35']) assert.equal(valid(value),false);
});
