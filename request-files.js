/* Fotos e PDFs privados. Upload após criar o pedido evita repetir solicitações em falhas. */
(() => {
 'use strict';
 if(window.AJURA_REQUEST_FILES)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;
 if(!client || !C)return;
 let revision=0,sessionActor=null;const sections=new Set();
 client.auth?.onAuthStateChange((event,next)=>{const id=next?.user?.id||null;if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&id!==sessionActor)){sessionActor=id;revision++;for(const section of sections){if(section.isConnected)section.textContent='Sessão alterada. Reabra a conversa.';}sections.clear();}});
 const bucket='request-attachments', maxSize=5*1024*1024, types={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'};
 async function validate(file){
  if(window.AJURA_UPLOAD_FLOW?.validate)return window.AJURA_UPLOAD_FLOW.validate(file);
  if(!types[file.type] || file.size<1 || file.size>maxSize)throw new Error('Use JPG, PNG ou PDF, com até 5 MB por arquivo.');
  const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const match=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
   file.type==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):
   [37,80,68,70,45].every((v,i)=>bytes[i]===v);
  if(!match)throw new Error('O conteúdo do arquivo não corresponde ao tipo informado.');
 }
 async function attach(request,actor,body){
  const section=document.createElement('section');section.className='service';section.setAttribute('aria-label','Anexos da solicitação');body.append(section);
  if(sessionActor===null)sessionActor=actor;
  for(const previous of sections)if(!previous.isConnected)sections.delete(previous);sections.add(section);const version=revision;const active=()=>section.isConnected&&section.closest('dialog')?.open!==false&&revision===version;
  const guard=async()=>{if(!active())throw Error('Tela ou sessão alterada.');const {data,error}=await client.auth.getSession();if(error||data?.session?.user?.id!==actor||!active())throw Error('Sessão alterada.');};
  const flow=window.AJURA_UPLOAD_FLOW?.engine({client,bucket,owner:actor,prefix:`${actor}/${request.id}`,table:'request_files',guard,register:(path,file)=>client.rpc('register_request_file',{target_request:request.id,uploaded_path:path,uploaded_name:file.name.slice(0,200)})});
  async function render(message=''){
   if(!active())return;
   section.innerHTML='<h3>Fotos e anexos</h3><p role="status">Carregando…</p>';
   let response;
   try{response=await client.from('request_files').select('id,original_name,object_path,mime_type,file_size,created_at').eq('request_id',request.id).order('created_at').order('id');}
   catch{if(active())section.innerHTML='<h3>Fotos e anexos</h3><p>Falha de conexão. Atualize a conversa para tentar novamente.</p>';return;}
   if(!active())return;
   if(response.error){section.innerHTML='<h3>Fotos e anexos</h3><p>Anexos indisponíveis. Atualize a conversa e tente novamente.</p>';return;}
   const rows=response.data || [], canUpload=request.client_id===actor && request.status==='requested' && rows.length<5;
   section.innerHTML=`<h3>Fotos e anexos (${rows.length}/5)</h3><p class="hint">Visíveis ao cliente e ao profissional deste pedido. Envie fotos do problema; evite documentos pessoais e endereço completo.</p><p role="status" class="file-status">${C.safe(message)}</p>${rows.map((f,i)=>`<div class="request-attachment"><span>${C.safe(f.original_name)} · ${(f.file_size/1024/1024).toFixed(1)} MB</span> <button type="button" class="secondary" data-open-file="${i}">Abrir arquivo</button></div>`).join('') || '<p>Nenhum anexo enviado.</p>'}${canUpload?'<form class="auth-form"><label>Adicionar fotos ou PDF<input type="file" name="attachments" accept="image/jpeg,image/png,application/pdf" multiple required></label><p class="hint">Até cinco arquivos por pedido, com 5 MB cada.</p><button class="primary" type="submit">Enviar anexos</button></form>':''}`;
   const status=section.querySelector('.file-status');
   section.querySelectorAll('[data-open-file]').forEach(button=>button.onclick=async()=>{
    if(button.disabled)return;button.disabled=true;
    // Abrir a janela antes da consulta evita bloqueio de pop-up.
    const win=window.open('about:blank','_blank');if(win)win.opener=null;
    try{
     const {data,error}=await client.storage.from(bucket).createSignedUrl(rows[Number(button.dataset.openFile)].object_path,300,{download:true});
     if(error || !data?.signedUrl)throw new Error('Não foi possível abrir. Atualize a conversa e tente novamente.');
     if(!active())throw new Error('Tela ou sessão alterada.');
     const url=new URL(data.signedUrl);
     if(url.protocol!=='https:' || url.origin!==new URL(window.AJURA_SUPABASE.url).origin)throw new Error('Link de arquivo inválido.');
     if(win)win.location.href=url.href;
     else{const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Clique para abrir o arquivo';status.replaceChildren(link);}
    }catch(error){if(win)win.close();if(status.isConnected)status.textContent=error.message || 'Falha ao abrir o arquivo.';}
    finally{if(button.isConnected)button.disabled=false;}
   });
   const form=section.querySelector('form');if(!form)return;
   C.handleForm(form,async()=>{
    const input=form.elements.attachments,statusNode=status;
    input.disabled=true;
    try{
     const selected=[...input.files];
     if(!selected.length)throw new Error('Escolha pelo menos um arquivo.');
     if(rows.length+selected.length>5)throw new Error(`Você pode adicionar mais ${5-rows.length} arquivo(s).`);
     if(!flow)throw new Error('Atualize a página para carregar o módulo de envio.');
     for(const file of selected)await validate(file);
     let sent=0;
     for(const file of selected){
      if(active())statusNode.textContent=`Conferindo e enviando ${sent+1} de ${selected.length}…`;
      try{await flow.send(file);sent++;}
      catch(error){if(active())statusNode.textContent=`${sent} arquivo(s) confirmado(s). ${error.message} A seleção foi preservada; repetir continua os envios pendentes.`;return;}
     }
     if(active())await render(`${sent} arquivo(s) confirmado(s).`);
    }catch(error){if(active())statusNode.textContent=error.message||'Falha no envio. A seleção foi preservada.';}
    finally{input.disabled=false;}
   },message=>{if(status.isConnected)status.textContent=message;});
  }
  await render();
 }
 window.AJURA_REQUEST_FILES=Object.freeze({attach,validate});
})();
