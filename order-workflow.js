/* Apresentação dos estados confirmados pelo servidor; não altera pedidos. */
(() => {
 const phases=['Solicitação','Orçamento aceito','Em execução','Concluído'];
 function state(request,actor,accepted=false){
  const role=actor===request.client_id?'client':actor===request.provider_id?'provider':'central';
  const status=request.status;
  if(role==='central')return {title:'Consulta pela Central',next:'Consulte o histórico e as solicitações de atendimento. Decisões administrativas ficam na seção da Central.',owner:'Central',step:null,closed:['completed','cancelled','declined'].includes(status)};
  if(status==='cancelled'||status==='declined')return {title:status==='cancelled'?'Solicitação cancelada':'Solicitação recusada',next:'Este pedido está encerrado. Consulte o histórico; para outro atendimento, crie uma nova solicitação.',owner:'Nenhuma ação pendente',step:null,closed:true};
  if(status==='completed')return {title:'Serviço concluído',next:role==='client'?'Confira a avaliação abaixo. Se já avaliou, sua nota permanece registrada.':'Consulte a conclusão e a avaliação do cliente, quando enviada.',owner:role==='client'?'Cliente: avaliação opcional':'Nenhuma ação pendente',step:3,closed:true};
  if(status==='in_progress')return {title:'Serviço em execução',next:role==='client'?'Acompanhe o trabalho. Gere o código de conclusão somente após conferir o serviço; se houver problema, procure a Central.':'Conclua o escopo combinado. Ao final, peça ao cliente o código e confirme a conclusão em Detalhes, na seção de andamento.',owner:'Prestador executa; cliente confere',step:2,closed:false};
  if(status==='requested'&&accepted)return {title:'Proposta aceita — aguardando início',next:role==='client'?'Confira o local do atendimento. Gere o código de início apenas quando autorizar o profissional a começar.':'Confira o combinado e o local liberado. Peça o código ao cliente e confirme o início em Detalhes, na seção de andamento.',owner:role==='client'?'Cliente: autorizar início':'Prestador: confirmar código de início',step:1,closed:false};
  if(status==='requested')return {title:'Orçamento em negociação',next:role==='client'?'Abra Orçamento para consultar propostas. Você pode aceitar ou recusar uma proposta pendente.':'Abra Orçamento para enviar ou consultar sua proposta e a resposta do cliente.',owner:'Confira a proposta na conversa',step:0,closed:false};
  return {title:'Situação indisponível',next:'Atualize o pedido para consultar o estado confirmado pelo servidor.',owner:'Atualizar informações',step:null,closed:false};
 }
 function markup(request,actor,accepted,safe){const s=state(request,actor,accepted);return `<section class="ajura-next-step" aria-label="Próximo passo do pedido"><h3>${safe(s.title)}</h3><p><strong>${safe(s.owner)}</strong></p><p>${safe(s.next)}</p>${s.step===null?'':`<ol class="ajura-order-phases" aria-label="Etapas do atendimento">${phases.map((p,i)=>`<li ${i===s.step?'aria-current="step"':''} class="${i<s.step?'done':i===s.step?'current':'future'}">${safe(p)}</li>`).join('')}</ol>`}<p class="hint">Pagamentos ainda não estão ativos. Estes estados não representam cobrança ou repasse.</p></section>`;}
 window.AJURA_ORDER_WORKFLOW=Object.freeze({state,markup});
})();
