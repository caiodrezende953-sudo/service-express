/* Arquivos de verificação privados: proprietário e administrador. */
(() => {
  const client = window.AJURA_AUTH?.client;
  if (!client) return;
  const safe = value => esc(String(value ?? ''));
  const bucket = 'provider-verification';
  async function list(providerId, target) {
    const { data, error } = await client.from('provider_files').select('kind, original_name, object_path, created_at').eq('provider_id', providerId).order('created_at', { ascending: false });
    if (error) { target.textContent = 'Não foi possível carregar seus arquivos. Atualize a tela e tente novamente.'; return; }
    target.innerHTML = (data || []).map((file, i) => `<p>${file.kind === 'identity' ? 'Documento' : 'Foto de trabalho'} · ${safe(file.original_name)} <button type="button" class="link-button" data-file-index="${i}">Abrir arquivo</button></p>`).join('') || '<p>Nenhum arquivo enviado.</p>';
    target.querySelectorAll('[data-file-index]').forEach(button => {
      button.onclick = async () => {
        // Abrir a janela durante o clique evita bloqueio do navegador após o await.
        const tab = window.open('about:blank', '_blank');
        if (tab) tab.opener = null;
        const file = data[Number(button.dataset.fileIndex)];
        const { data: link, error } = await client.storage.from(bucket).createSignedUrl(file.object_path, 60);
        if (error) { if (tab) tab.close(); toast('Não foi possível abrir o arquivo.'); return; }
        if (tab) tab.location.replace(link.signedUrl);
        else toast('Permita abrir uma nova aba para visualizar o arquivo.');
      };
    });
  }
  async function open() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    const id = session.user.id;
    modal('<span class="eyebrow">VERIFICAÇÃO DO PRESTADOR</span><h2>Documentos e fotos</h2><p>Os arquivos ficam privados, acessíveis a você e à administração. Fotos enviadas aqui ainda não aparecem no perfil público.</p><form id="providerUpload" class="auth-form"><label>Tipo de arquivo<select name="kind"><option value="identity">Documento de identificação</option><option value="portfolio">Foto de trabalho realizado</option></select></label><label>Arquivo<input name="file" type="file" accept="image/jpeg,image/png,application/pdf" required></label><p class="hint">Até 10 arquivos de verificação por prestador, com 5 MB cada (JPG, PNG ou PDF). Envie somente documentos seus e fotos que você tem autorização para utilizar. Novos envios de perfis aprovados exigem nova análise.</p><button class="primary">Enviar arquivo</button><p id="uploadStatus" role="status"></p></form><h3>Arquivos enviados</h3><div id="providerFilesList"></div><button type="button" class="link-button" id="filesBack">Voltar para minha conta</button>');
    $('#filesBack').onclick = () => $('#accountButton').click();
    await list(id, $('#providerFilesList'));
    $('#providerUpload').onsubmit = async event => {
      event.preventDefault();
      const form = event.target, file = form.elements.file.files[0], status = $('#uploadStatus');
      if (!file || !['image/jpeg','image/png','application/pdf'].includes(file.type) || file.size > 5242880 || !file.size) { status.textContent = 'Escolha JPG, PNG ou PDF de até 5 MB.'; return; }
      const button = event.submitter;
      button.disabled = true;
      status.textContent = 'Enviando…';
      const kind = form.elements.kind.value;
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' }[file.type];
      const path = `${id}/${crypto.randomUUID()}.${extension}`;
      try {
        const upload = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
        const record = await client.from('provider_files').insert({ provider_id: id, kind, object_path: path, original_name: file.name.slice(0, 200) });
        if (record.error) { await client.storage.from(bucket).remove([path]); throw record.error; }
        status.textContent = 'Arquivo enviado. A equipe poderá conferir na análise do cadastro.';
        form.reset();
        await list(id, $('#providerFilesList'));
      } catch (error) { status.textContent = 'Não foi possível enviar. Confira a conexão e o limite de 10 arquivos. Se persistir, procure a Central.'; }
      finally { button.disabled = false; }
    };
  }
  const observer = new MutationObserver(() => {
    const form = $('#realProviderForm');
    if (!form || $('#providerFilesButton')) return;
    // O botão de adicionar serviço indica que o perfil já foi salvo.
    if (!$('#realAddService')) return;
    const button = document.createElement('button');
    button.id = 'providerFilesButton'; button.type = 'button'; button.className = 'secondary';
    button.textContent = 'Documentos e fotos'; button.onclick = open;
    form.after(button);
  });
  observer.observe($('#modalBody'), { childList: true, subtree: true });
  window.AJURA_FILES = { list };
})();
