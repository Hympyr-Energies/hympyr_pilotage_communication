/* =========================================================
   MODÈLES DE CONTENUS : création, édition, usage
   A template carries everything a content needs to start:
   type, objective, targets, networks, texts per network,
   hashtags, link and writing guidelines. Passages written
   [between brackets] are to be completed before validation.
   ========================================================= */
import {
  $, $$, esc, clone, byKind, getItem, saveItem, deleteItem, toast, modal, confirmBox, ic, stagger, seg,
  BRANDS, BRAND_KEYS, TYPES, typeLabel, typeFamily, OBJECTIFS, objLabel, CIBLES, cibleLabel, RESEAUX, canCreate, brandDot
} from './core.js?v=5';

const head = (lab, title, p = '', right = '') => `<div class="panel-head"><div><span class="label">${lab}</span><h2 style="margin-top:4px">${title}</h2>${p ? `<p>${p}</p>` : ''}</div>${right}</div>`;
export const PLACEHOLDER = /\[[^\]\n]{1,80}\]/g;
export const placeholders = txt => [...new Set((String(txt || '').match(PLACEHOLDER) || []))];

/* normalise old (texte only) and new templates */
export function tplData(t) {
  const d = t.data || {}; const base = d.texte || '';
  return {
    type: d.type || 'publication', objectif: d.objectif || 'pedagogique', cible: d.cible || [], reseaux: d.reseaux && d.reseaux.length ? d.reseaux : ['linkedin'],
    textes: { linkedin: '', instagram: '', principal: '', ...(d.textes || {}), ...(d.textes ? {} : { linkedin: base, instagram: base, principal: base }) },
    hashtags: d.hashtags || [], lien: d.lien || '', consignes: d.consignes || '', usages: d.usages || 0
  };
}
export const templatesFor = marque => byKind('modele').filter(t => marque === 'groupe' || t.marque === 'groupe' || t.marque === marque)
  .sort((a, b) => (tplData(b).usages - tplData(a).usages) || (a.titre || '').localeCompare(b.titre || ''));

/* copy a template into a content (in place) */
export function applyTemplate(c, t) {
  const d = tplData(t);
  Object.assign(c.data, { type: d.type, objectif: d.objectif, cible: d.cible.length ? clone(d.cible) : c.data.cible, reseaux: clone(d.reseaux), textes: { ...c.data.textes, ...clone(d.textes) }, hashtags: clone(d.hashtags), lien: d.lien || c.data.lien, consignes: d.consignes, modele_id: t.id });
  if (!c.titre) c.titre = t.titre;
  const u = getItem(t.id); if (u && canCreate()) saveItem({ ...u, data: { ...u.data, usages: (u.data.usages || 0) + 1 } }, { silent: true }).catch(() => {});
  return c;
}

/* start a new content from a template */
export function useTemplate(t, ctx) {
  const go = m => ctx.go(m, 'creer', null, { tpl: t.id }, true);
  if (t.marque !== 'groupe') return go(t.marque);
  if (ctx.univ !== 'groupe') return go(ctx.univ);
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">${esc(t.titre)}</span><h2 style="margin-top:6px">Pour quelle marque ?</h2><p>Ce modèle sert à toutes les marques.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="grid g2">${BRAND_KEYS.map(b => `<button class="tile click" data-b="${b}" style="padding:18px;display:flex;gap:12px;align-items:center;text-align:left">${brandDot(b)}<b style="color:var(--head)">${esc(BRANDS[b].nom)}</b></button>`).join('')}</div>`);
  el.onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; close(); go(b.dataset.b); };
}

/* ---------- template editor ---------- */
export function editTemplate(item, { onSaved } = {}) {
  const t = clone(item); const d = tplData(t); let net = d.reseaux[0] || 'linkedin';
  const social = () => typeFamily(d.type) === 'social';
  const nets = () => social() ? d.reseaux : ['principal'];
  const netLabel = n => n === 'principal' ? 'Texte' : (RESEAUX.find(r => r[0] === n) || [n, n])[1];
  const typeOpts = TYPES.map(([k, l]) => `<option value="${k}" ${k === d.type ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Modèle de contenu</span><h2 style="margin-top:6px">${t.id ? esc(t.titre) : 'Nouveau modèle'}</h2><p>Écrivez les passages à adapter entre crochets, par exemple [chiffre clé] ou [nom du client] : ils seront signalés tant qu'ils ne sont pas complétés.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="form">
      <div class="grid-f">
        <label class="field"><span>Nom du modèle</span><input class="input" id="tN" value="${esc(t.titre || '')}" placeholder="Témoignage client, Offre du mois"></label>
        <label class="field"><span>Marque</span><select class="input" id="tM">${BRAND_KEYS.map(b => `<option value="${b}" ${b === t.marque ? 'selected' : ''}>${b === 'groupe' ? 'Toutes les marques' : esc(BRANDS[b].nom)}</option>`).join('')}</select></label>
        <label class="field"><span>Type de contenu</span><select class="input" id="tT">${typeOpts}</select></label>
        <label class="field"><span>Objectif</span><select class="input" id="tO">${OBJECTIFS.map(([k, l]) => `<option value="${k}" ${k === d.objectif ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      </div>
      <div class="field"><span>Cibles</span><div class="tagsel" id="tC">${CIBLES.map(([k, l]) => `<button type="button" data-c="${k}" class="${d.cible.includes(k) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div></div>
      <div class="field" id="tRw"><span>Réseaux</span><div class="tagsel" id="tR">${RESEAUX.map(([k, l]) => `<button type="button" data-r="${k}" class="${d.reseaux.includes(k) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div></div>
      <div class="field"><span>Trame du texte</span><div class="seg glass glide" id="tNet" style="align-self:flex-start"></div>
        <textarea class="input" id="tX" style="min-height:220px" placeholder="Accroche : [chiffre ou question]&#10;&#10;Contexte : [situation du client]&#10;&#10;Ce que nous avons fait : [solution]&#10;&#10;Résultat : [bénéfice mesurable]&#10;&#10;[appel à l'action]"></textarea>
        <div class="btn-row" style="justify-content:space-between"><span class="small muted" id="tPh"></span><div class="sugg" id="tIns">${['[accroche]', '[chiffre clé]', '[nom du client]', '[lieu]', '[date]', '[appel à l\'action]'].map(p => `<button type="button" data-ins="${esc(p)}">${esc(p)}</button>`).join('')}</div></div></div>
      <div class="grid-f">
        <label class="field"><span>Hashtags <em>(séparés par des espaces)</em></span><input class="input" id="tH" value="${esc(d.hashtags.join(' '))}" placeholder="#HympyrEnergies #AdBlue"></label>
        <label class="field"><span>Lien <em>(facultatif)</em></span><input class="input" id="tL" type="url" value="${esc(d.lien)}" placeholder="https://"></label>
        <label class="field full"><span>Consignes de rédaction <em>(affichées dans l'éditeur)</em></span><textarea class="input" id="tK" style="min-height:90px" placeholder="Angle, ton, visuel attendu, points à vérifier avant publication.">${esc(d.consignes)}</textarea></label>
      </div>
    </div>
    <div class="modal-foot">${t.id ? `<button class="btn text sm" id="tDel" style="margin-right:auto;color:var(--err)">${ic('trash')}Supprimer</button>` : ''}<button class="btn ghost" data-close>Annuler</button><button class="btn mag" id="tGo">${ic('check')}Enregistrer le modèle</button></div>`, { wide: true });
  const X = $('#tX', el);
  const syncNets = () => {
    if (!nets().includes(net)) net = nets()[0];
    $('#tRw', el).hidden = !social();
    const box = $('#tNet', el); box.hidden = nets().length < 2;
    seg(box, nets().map(n => [n, esc(netLabel(n))]), net, v => { net = v; X.value = d.textes[net] || ''; });
    X.value = d.textes[net] || ''; phInfo();
  };
  const phInfo = () => { const p = placeholders(Object.values(d.textes).join('\n')); $('#tPh', el).textContent = p.length ? `${p.length} passage${p.length > 1 ? 's' : ''} à compléter : ${p.slice(0, 4).join(', ')}${p.length > 4 ? '…' : ''}` : 'Aucun passage entre crochets.'; };
  X.oninput = () => { d.textes[net] = X.value; if (social()) d.reseaux.forEach(n => { if (n !== net && !d.textes[n]) d.textes[n] = ''; }); phInfo(); };
  $('#tT', el).onchange = e => { d.type = e.target.value; if (!social()) { d.textes.principal = d.textes.principal || d.textes[net] || ''; net = 'principal'; } else if (net === 'principal') { net = d.reseaux[0]; d.textes[net] = d.textes[net] || d.textes.principal; } syncNets(); };
  $('#tC', el).onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; b.classList.toggle('on'); d.cible = $$('[data-c].on', el).map(x => x.dataset.c); };
  $('#tR', el).onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; if (b.classList.contains('on') && d.reseaux.length === 1) { toast('Gardez au moins un réseau', 'alert'); return; } b.classList.toggle('on'); d.reseaux = $$('[data-r].on', el).map(x => x.dataset.r); if (!d.textes[d.reseaux[0]] && d.textes[net]) d.reseaux.forEach(n => { if (!d.textes[n]) d.textes[n] = d.textes[net]; }); syncNets(); };
  $('#tIns', el).onclick = e => { const b = e.target.closest('[data-ins]'); if (!b) return; const s = X.selectionStart ?? X.value.length, en = X.selectionEnd ?? s; X.setRangeText(b.dataset.ins, s, en, 'end'); X.focus(); X.dispatchEvent(new Event('input')); };
  $('#tGo', el).onclick = async () => {
    const n = $('#tN', el); if (!n.value.trim()) { n.classList.add('bad'); n.focus(); return; }
    if (!nets().some(k => (d.textes[k] || '').trim())) { X.classList.add('bad'); X.focus(); toast('Écrivez au moins la trame du texte', 'alert'); return; }
    const filled = nets().map(k => d.textes[k]).find(v => (v || '').trim()) || ''; nets().forEach(k => { if (!(d.textes[k] || '').trim()) d.textes[k] = filled; });
    const hashtags = $('#tH', el).value.split(/[\s,]+/).filter(Boolean).map(h => h.startsWith('#') ? h : '#' + h);
    const out = { ...t, kind: 'modele', titre: n.value.trim(), marque: $('#tM', el).value, data: { ...(t.data || {}), type: d.type, objectif: $('#tO', el).value, cible: d.cible, reseaux: social() ? d.reseaux : [], textes: Object.fromEntries(nets().map(k => [k, d.textes[k] || ''])), hashtags, lien: $('#tL', el).value.trim(), consignes: $('#tK', el).value.trim(), usages: d.usages } };
    delete out.data.texte;
    try { const s = await saveItem(out); close(); toast(t.id ? 'Modèle mis à jour' : 'Modèle créé', 'layers'); onSaved && onSaved(s); } catch (e) {}
  };
  const del = $('#tDel', el); if (del) del.onclick = async () => { if (!await confirmBox('Supprimer ce modèle ?', 'Les contenus déjà créés à partir de ce modèle ne changent pas.', { ok: 'Supprimer', danger: true })) return; await deleteItem(t.id); close(); toast('Modèle supprimé', 'trash'); onSaved && onSaved(null); };
  requestAnimationFrame(syncNets);
  return el;
}

/* save the content being edited as a template */
export function saveAsTemplate(c) {
  const d = c.data || {};
  editTemplate({ kind: 'modele', marque: c.marque, titre: c.titre ? `Modèle : ${c.titre}` : '', data: { type: d.type, objectif: d.objectif, cible: d.cible || [], reseaux: d.reseaux || ['linkedin'], textes: clone(d.textes || {}), hashtags: clone(d.hashtags || []), lien: d.lien || '', consignes: d.consignes || '' } });
}

/* ---------- picker used in the editor ---------- */
export function pickTemplateFor(c, onPick) {
  const tpls = templatesFor(c.marque); let q = '';
  const hasText = Object.values(c.data.textes || {}).some(v => (v || '').trim());
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Modèles</span><h2 style="margin-top:6px">Partir d'un modèle</h2><p>Type, objectif, cibles, réseaux, trame, hashtags et consignes sont repris.${hasText ? ' Le texte en cours sera remplacé.' : ''}</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    ${tpls.length > 5 ? '<input class="input" id="pq" placeholder="Rechercher un modèle" style="margin-bottom:12px">' : ''}
    <div class="rows" id="pl"></div>
    <div class="modal-foot"><button class="btn ghost" id="pNew">${ic('plus')}Créer un modèle</button></div>`, { wide: true });
  const draw = () => { $('#pl', el).innerHTML = tpls.filter(t => !q || (t.titre || '').toLowerCase().includes(q)).map(t => tplRow(t)).join('') || '<p class="muted">Aucun modèle pour cette marque. Créez le premier.</p>'; };
  draw(); const pq = $('#pq', el); if (pq) pq.oninput = () => { q = pq.value.trim().toLowerCase(); draw(); };
  el.addEventListener('click', async e => {
    const r = e.target.closest('[data-tpl]'); if (r) { if (hasText && !await confirmBox('Remplacer le texte en cours ?', 'La trame du modèle remplace le texte déjà rédigé dans ce contenu.', { ok: 'Remplacer' })) return; close(); onPick(getItem(r.dataset.tpl)); return; }
    if (e.target.closest('#pNew')) { close(); editTemplate({ kind: 'modele', marque: c.marque, titre: '', data: { type: c.data.type, objectif: c.data.objectif, reseaux: c.data.reseaux } }); }
  });
}
const tplRow = t => { const d = tplData(t); const first = (d.textes[d.reseaux[0]] || d.textes.principal || '').split('\n').find(l => l.trim()) || ''; return `<div class="tile rowi click" data-tpl="${t.id}"><span class="chip">${esc(typeLabel(d.type))}</span><div class="t"><b>${esc(t.titre)}</b><span>${esc(objLabel(d.objectif))}${t.marque === 'groupe' ? ' · toutes marques' : ''}${first ? ' · ' + esc(first.slice(0, 90)) : ''}</span></div><span class="a">${ic('right')}</span></div>`; };

/* ---------- library view ---------- */
export function renderModeles(el, ctx) {
  const m = ctx.univ; let q = '', fam = 'tous';
  const all = () => templatesFor(m);
  el.innerHTML = `<div class="panel glass" data-st>${head('Modèles', 'Modèles de contenus', `Une trame complète, prête à décliner : type, objectif, cibles, réseaux, texte, hashtags et consignes.${m === 'groupe' ? ' Vue groupe : tous les modèles de toutes les marques.' : ''}`, canCreate() ? `<button class="btn mag" id="tAdd">${ic('plus')}Nouveau modèle</button>` : '')}
    <div class="btn-row" style="margin-bottom:16px"><input class="input" id="tq" placeholder="Rechercher un modèle" style="max-width:280px;min-height:40px"><div class="tagsel" id="tf">${[['tous', 'Tous'], ['social', 'Réseaux sociaux'], ['web', 'Web'], ['presse', 'Presse'], ['print', 'Print'], ['interne', 'Interne']].map(([k, l]) => `<button type="button" data-f="${k}" class="${k === fam ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="grid g3" id="tg"></div></div>`;
  const draw = () => {
    const ts = all().filter(t => { const d = tplData(t); return (fam === 'tous' || typeFamily(d.type) === fam) && (!q || [t.titre, d.consignes, ...Object.values(d.textes)].join(' ').toLowerCase().includes(q)); });
    $('#tg', el).innerHTML = ts.map(t => { const d = tplData(t); const txt = d.textes[d.reseaux[0]] || d.textes.principal || ''; const ph = placeholders(Object.values(d.textes).join('\n')).length;
      return `<div class="tile" data-st style="padding:18px;display:flex;flex-direction:column;gap:10px;min-width:0">
        <div class="btn-row" style="gap:6px"><span class="chip">${esc(typeLabel(d.type))}</span><span class="chip gray">${esc(objLabel(d.objectif))}</span>${t.marque === 'groupe' ? '<span class="chip gray">Toutes marques</span>' : brandDot(t.marque)}</div>
        <b style="color:var(--head);font-size:15px">${esc(t.titre)}</b>
        <p class="small muted" style="white-space:pre-wrap;max-height:96px;overflow:hidden;overflow-wrap:anywhere">${esc(txt)}</p>
        <div class="small muted">${[typeFamily(d.type) === 'social' ? d.reseaux.map(r => (RESEAUX.find(x => x[0] === r) || [r, r])[1]).join(', ') : '', d.cible.length ? d.cible.map(cibleLabel).join(', ') : '', ph ? `${ph} passage${ph > 1 ? 's' : ''} à compléter` : '', d.usages ? `utilisé ${d.usages} fois` : ''].filter(Boolean).join(' · ')}</div>
        <div class="btn-row" style="margin-top:auto">${canCreate() ? `<button class="btn sm mag" data-use="${t.id}">${ic('pen')}Utiliser</button><button class="btn ghost sm" data-edit="${t.id}">Modifier</button><button class="icon-btn sm" data-dup="${t.id}" title="Dupliquer" aria-label="Dupliquer">${ic('copy')}</button>` : `<button class="btn ghost sm" data-see="${t.id}">${ic('eye')}Voir</button>`}</div></div>`; }).join('')
      || `<div class="empty" style="grid-column:1/-1"><p>${all().length ? 'Aucun modèle ne correspond.' : 'Aucun modèle pour le moment. Créez-en un ici, ou enregistrez un contenu existant comme modèle depuis l\'éditeur.'}</p></div>`;
    stagger($('#tg', el));
  };
  draw();
  $('#tq', el).oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  $('#tf', el).onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; fam = b.dataset.f; $$('[data-f]', el).forEach(x => x.classList.toggle('on', x === b)); draw(); };
  const refresh = () => ctx.refresh(true);
  const ta = $('#tAdd', el); if (ta) ta.onclick = () => editTemplate({ kind: 'modele', marque: m, titre: '', data: {} }, { onSaved: refresh });
  $('#tg', el).onclick = async e => {
    const u = e.target.closest('[data-use]'), ed = e.target.closest('[data-edit]'), du = e.target.closest('[data-dup]'), se = e.target.closest('[data-see]');
    if (u) useTemplate(getItem(u.dataset.use), ctx);
    else if (ed) editTemplate(getItem(ed.dataset.edit), { onSaved: refresh });
    else if (du) { const t = getItem(du.dataset.dup); await saveItem({ kind: 'modele', marque: t.marque, titre: `${t.titre} (copie)`, data: { ...clone(t.data), usages: 0 } }); toast('Modèle dupliqué', 'copy'); refresh(); }
    else if (se) { const t = getItem(se.dataset.see), d = tplData(t); modal(`<div class="modal-head"><div><span class="label">${esc(typeLabel(d.type))}</span><h2 style="margin-top:6px">${esc(t.titre)}</h2>${d.consignes ? `<p>${esc(d.consignes)}</p>` : ''}</div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div><div class="hl">${esc(d.textes[d.reseaux[0]] || d.textes.principal || '')}</div>`, { wide: true }); }
  };
}
