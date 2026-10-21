/* Identidade para a interface e tentativas opacas. A autorização continua no servidor. */
(() => {
 'use strict';
 if (window.AJURA_SAFE_ACTIONS) return;
 const client = window.AJURA_AUTH?.client;
 if (!client) return;
 let actorId, revision = 0, inflight = null;
 const listeners = new Set(), attempts = new Map(), ownedSlots = new Set();
 const storage = () => window.sessionStorage;
 function forgetAttempts() {
  attempts.clear();
  for (const key of ownedSlots) { try { storage()?.removeItem(key); } catch {} }
  ownedSlots.clear();
 }
 function accept(next, event) {
  const id = next?.user?.id || null;
  if (actorId === id && event !== 'SIGNED_OUT') return;
  const previous = actorId;
  actorId = id; revision++; inflight = null;
  if (previous !== undefined || event === 'SIGNED_OUT') {
   forgetAttempts();
   for (const fn of listeners) fn({ previous, id, revision });
  }
 }
 async function snapshot() {
  if (!inflight) {
   const run = revision;
   const pending = client.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    if (run === revision) accept(data?.session || null, 'READ');
    return { id: actorId || null, revision };
   });
   inflight = pending;
   pending.finally(() => { if (inflight === pending) inflight = null; }).catch(() => {});
  }
  return inflight;
 }
 const current = token => token?.revision === revision && token?.id === actorId;
 async function guard(token, node) {
  const latest = await snapshot();
  if (!token?.id || token.id !== latest.id || token.revision !== latest.revision ||
      (node && (!node.isConnected || node.closest('dialog')?.open === false))) {
   throw Object.assign(Error('Sua sessão ou a tela mudou. Abra novamente para continuar.'),{userMessage:'Sua sessão ou a tela mudou. Abra novamente para continuar.'});
  }
 }
 function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
 }
 async function requestKey(scope, actor, payload, options = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify([scope, actor, stable(payload)]));
  const fingerprint = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  const slot = `ajura-safe-attempt-v1:${actor}:${scope}:${fingerprint}`;
  let saved = attempts.get(slot);
  if (options.persist !== false) { try { const raw = storage()?.getItem(slot); if (raw) saved = JSON.parse(raw); } catch {} }
  if (!saved || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(saved.key || '')) saved = { key: crypto.randomUUID() };
  attempts.set(slot, saved); ownedSlots.add(slot);
  if (options.persist !== false) { try { storage()?.setItem(slot, JSON.stringify(saved)); } catch {} }
  return { key: saved.key, clear() {
   if (attempts.get(slot)?.key !== saved.key) return;
   attempts.delete(slot); ownedSlots.delete(slot);
   if (options.persist !== false) { try { storage()?.removeItem(slot); } catch {} }
  } };
 }
 client.auth.onAuthStateChange((event, next) => accept(next, event));
 window.AJURA_SAFE_ACTIONS = Object.freeze({ snapshot, current, guard, requestKey,
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
 });
})();
