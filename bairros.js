/* Bairros oficiais da área urbana de Manaus.
   Consulta em 28 de setembro de 2026.
   Fonte principal: Lei Municipal nº 1.401, de 14 de janeiro de 2010, Anexo I
   (63 denominações e perímetros, em substituição ao Anexo Único da Lei nº 287/1995).
   A Prefeitura de Manaus, pelo Implurb, seguia esses 63 bairros no recorte do Censo IBGE 2022.
   Inclusão posterior: Colônia Japonesa, criada pela Lei Municipal nº 3.592, de 22 de dezembro de 2025,
   publicada no Diário Oficial do Município e oriunda do Projeto de Lei nº 692/2025
   (Câmara Municipal de Manaus e Prefeitura de Manaus).
   Conjuntos, comunidades e loteamentos não entram nesta lista.
   "Parque 10" permanece apenas como forma já usada nos cadastros antigos do mesmo bairro
   Parque 10 de Novembro; não amplia a cobertura. */
const BAIRROS_MANAUS=Object.freeze([
'Adrianópolis','Aleixo','Alvorada','Armando Mendes','Betânia','Cachoeirinha','Centro','Chapada','Cidade de Deus','Cidade Nova','Colônia Antônio Aleixo','Colônia Japonesa','Colônia Oliveira Machado','Colônia Santo Antônio','Colônia Terra Nova','Compensa','Coroado','Crespo','Da Paz','Distrito Industrial I','Distrito Industrial II','Dom Pedro I','Educandos','Flores','Gilberto Mestrinho','Glória','Japiim','Jorge Teixeira','Lago Azul','Lírio do Vale','Mauazinho','Monte das Oliveiras','Morro da Liberdade','Nossa Senhora Aparecida','Nossa Senhora das Graças','Nova Cidade','Nova Esperança','Novo Aleixo','Novo Israel','Parque 10 de Novembro','Petrópolis','Planalto','Ponta Negra','Praça 14 de Janeiro','Presidente Vargas','Puraquequara','Raiz','Redenção','Santa Etelvina','Santa Luzia','Santo Agostinho','Santo Antônio','São Francisco','São Geraldo','São Jorge','São José Operário','São Lázaro','São Raimundo','Tancredo Neves','Tarumã','Tarumã-Açu','Vila Buriti','Vila da Prata','Zumbi dos Palmares']);
const BAIRRO_EQUIVALENTE={'Parque 10':'Parque 10 de Novembro'};
function bairroOficial(nome){return BAIRRO_EQUIVALENTE[nome]||nome;}
function atendeBairro(areas,bairro){if(!bairro)return true;if(!Array.isArray(areas))return false;const alvo=bairroOficial(bairro);return areas.some(a=>a===bairro||bairroOficial(a)===alvo);}
function cobreManaus(areas){return Array.isArray(areas)&&BAIRROS_MANAUS.every(b=>atendeBairro(areas,b));}
(function preencherFiltroDeBairros(){const sel=document.getElementById('district');if(!sel)return;const atual=sel.value;for(let i=sel.options.length-1;i>=1;i--)sel.remove(i);for(const nome of BAIRROS_MANAUS){const op=document.createElement('option');op.value=nome;op.textContent=nome;sel.appendChild(op);}if([...sel.options].some(o=>o.value===atual))sel.value=atual;})();
