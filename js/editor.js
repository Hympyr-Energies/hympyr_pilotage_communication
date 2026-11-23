/* =========================================================
   EDITOR : content creation, previews, workflow
   ========================================================= */
import {
  $, $$, esc, clone, S, byKind, getItem, saveItem, deleteItem, addJournal, journal, toast, modal, confirmBox, seg, segSet, ic, swap, animateRings,
  BRANDS, SUB_BRANDS, BRAND_KEYS, TYPES, typeLabel, typeFamily, RESEAUX, OBJECTIFS, objLabel, CIBLES, STATUTS, statutLabel, PRE_VALID,
  toLocalInput, fromLocalInput, fmtDT, fmtDate, isDirection, canCreate, memberName, settings, ring, stagger, uid, brandDot, Q, setQueue
} from './core.js?v=7';
import { analyse, radarSVG, animateRadar, scoreLabel, CRITERES } from './analysis.js?v=7';
import { applyTemplate, pickTemplateFor, saveAsTemplate, placeholders } from './templates.js?v=7';
import { KINDS, struct, label, newBloc, ensureBlocs, restructure, compile, hookText, allText, fieldsText, fieldCheck, parseText, htmlDoc, openHtmlPreview } from './blocs.js?v=7';

const blank = marque => ({ kind: 'contenu', marque, titre: '', statut: 'idee', date_debut: null, data: { type: 'publication', cible: ['professionnels'], objectif: 'pedagogique', reseaux: ['linkedin'], textes: { linkedin: '', instagram: '', principal: '' }, hashtags: [], lien: '', utm: true, visuels: [], campagne_id: '', interne: { canaux: [], lecture: false, lus: 0, total: 0 }, mentions_ok: false } });
const slug = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
export const isSocial = c => typeFamily((c.data || {}).type) === 'social';
export function textFor(c, net) { const t = (c.data || {}).textes || {}; return isSocial(c) ? (t[net] || '') : (t.principal || ''); }
export function trackedLink(c, net) {
  const d = c.data || {}; if (!d.lien) return '';
  if (!d.utm) return d.lien;
  const camp = d.campagne_id ? (getItem(d.campagne_id) || {}).titre : c.titre;
  try { const u = new URL(d.lien); u.searchParams.set('utm_source', net || 'site'); u.searchParams.set('utm_medium', isSocial(c) ? 'social' : 'referral'); u.searchParams.set('utm_campaign', slug(camp) || 'hympyr'); return u.toString(); } catch (e) { return d.lien; }
}
export function analyseContent(c, net) {
  const n = net || ((c.data.reseaux || [])[0]) || 'linkedin';
  return analyse({ texte: textFor(c, n), hashtags: c.data.hashtags || [], reseau: n, objectif: c.data.objectif, marque: c.marque, lien: c.data.lien, accroche: hookText(c, isSocial(c) ? n : 'principal') });
}

let E = null; /* editor state */
let saveT = null;

export function renderEditor(el, ctx) {
  const marque = ctx.univ;
  const id = ctx.params && ctx.params.id;
  let it = id ? getItem(id) : null;
  if (it && it.marque !== marque) it = null;
  E = { ctx, el, c: it ? clone(it) : blank(marque), net: 'linkedin', saved: it ? JSON.stringify(it) : '', last: null, prevScores: null };
  if (!isSocial(E.c)) E.net = 'principal'; else E.net = (E.c.data.reseaux || ['linkedin'])[0] || 'linkedin';
  E.c.data = { ...blank(marque).data, ...E.c.data, textes: { ...blank(marque).data.textes, ...(E.c.data.textes || {}) }, interne: { ...blank(marque).data.interne, ...(E.c.data.interne || {}) } };
  const tpl = !it && ctx.params && ctx.params.tpl ? getItem(ctx.params.tpl) : null;
  if (tpl) { applyTemplate(E.c, tpl); E.net = isSocial(E.c) ? (E.c.data.reseaux || ['linkedin'])[0] : 'principal'; ctx.params = {}; setTimeout(() => toast(`Modèle « ${tpl.titre} » appliqué. Complétez les passages entre crochets.`, 'layers'), 500); }
  draw();
}
function readonly() { const c = E.c; if (S.role === 'admin') return false; if (isDirection()) return true; return !PRE_VALID.includes(c.statut) && !['a_planifier', 'planifie'].includes(c.statut) ? c.statut === 'publie' ? false : true : false; }
function list() { return byKind('contenu', E.c.marque).filter(x => x.statut !== 'archive').sort((a, b) => new Date(b.maj_le) - new Date(a.maj_le)); }

function draw() {
  const c = E.c, d = c.data, ro = isDirection() && S.role !== 'admin';
  ensureBlocs(c, E.net); const st = struct(d.type);
  const camps = byKind('campagne').filter(x => !x.data.marques || !x.data.marques.length || x.data.marques.includes(c.marque) || c.marque === 'groupe');
  const social = isSocial(c), fam = typeFamily(d.type);
  E.el.innerHTML = `
  <div class="panel glass" data-st>
    <div class="ed-top">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;min-width:0;flex:1">
        <select class="input" id="edPick" aria-label="Ouvrir un contenu" style="max-width:420px">
          <option value="">${c.id ? 'Changer de contenu' : 'Nouveau contenu (non enregistré)'}</option>
          ${list().map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.titre || 'Sans titre')} · ${esc(statutLabel(x.statut))}</option>`).join('')}
        </select>
        <span class="chip ${c.statut === 'validation' ? 'warn' : c.statut === 'publie' ? 'ok' : 'gray'}" id="edStatut">${esc(statutLabel(c.statut))}</span>
        <span class="small muted" id="edSaved">${c.id ? 'Enregistré' : ''}</span>
      </div>
      <div class="btn-row">
        ${canCreate() ? `<button class="btn ghost sm mag" id="edNew">${ic('plus')}Nouveau</button><button class="btn ghost sm mag" id="edTpl">${ic('layers')}Partir d'un modèle</button><button class="btn ghost sm mag" id="edSaveTpl" title="Réutiliser ce contenu comme trame">${ic('copy')}Enregistrer comme modèle</button>` : ''}
      </div>
    </div>
    ${queueBar()}
    ${d.consignes ? `<div class="tile" style="margin-top:14px;padding:12px 14px;border-color:color-mix(in srgb,var(--accent) 45%,transparent)"><span class="label">Consignes du modèle</span><p style="margin-top:4px;font-size:13.5px;white-space:pre-wrap">${esc(d.consignes)}</p></div>` : ''}
    <div id="edPh"></div>
    ${d.retour && ['a_produire', 'redaction'].includes(c.statut) ? `<div class="tile" style="margin-top:14px;padding:12px 14px;border-color:color-mix(in srgb,var(--warn) 50%,transparent)"><span class="label" style="color:var(--warn)">Retour de la direction</span><p style="margin-top:4px;font-size:13.5px">${esc(d.retour)}</p></div>` : ''}
  </div>
  <div class="split">
    <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
      <div class="panel glass" data-st>
        <div class="panel-head"><div><span class="label">1 · Cadre</span><h2 style="margin-top:4px">Définir le contenu</h2></div></div>
        <div class="grid-f">
          <label class="field full"><span>Titre interne</span><input class="input" data-f="titre" value="${esc(c.titre)}" placeholder="Ex. Conseils d'hiver pour stocker ses granulés" maxlength="120" ${ro ? 'readonly' : ''}></label>
          <label class="field"><span>Type de contenu</span><select class="input" data-f="type" ${ro ? 'disabled' : ''}>
            ${['social', 'web', 'presse', 'print', 'interne'].map(f => `<optgroup label="${{ social: 'Réseaux sociaux', web: 'Site et e-mail', presse: 'Presse', print: 'Print', interne: 'Communication interne' }[f]}">${TYPES.filter(t => t[2] === f).map(t => `<option value="${t[0]}" ${t[0] === d.type ? 'selected' : ''}>${t[1]}</option>`).join('')}</optgroup>`).join('')}
          </select></label>
          <label class="field"><span>Campagne <em>(facultatif)</em></span><select class="input" data-f="campagne_id" ${ro ? 'disabled' : ''}><option value="">Aucune</option>${camps.map(x => `<option value="${x.id}" ${x.id === d.campagne_id ? 'selected' : ''}>${esc(x.titre)}</option>`).join('')}</select></label>
          <div class="field full"><span>Objectif</span><div class="tagsel" data-multi="objectif">${OBJECTIFS.map(([k, l]) => `<button type="button" data-v="${k}" class="${d.objectif === k ? 'on' : ''}" ${ro ? 'disabled' : ''}>${l}</button>`).join('')}</div></div>
          <div class="field full"><span>Cibles</span><div class="tagsel" data-multi="cible">${CIBLES.map(([k, l, g]) => `<button type="button" data-v="${k}" class="${(d.cible || []).includes(k) ? 'on' : ''}" title="${g === 'interne' ? 'Interne' : 'Externe'}" ${ro ? 'disabled' : ''}>${l}</button>`).join('')}</div></div>
          ${social ? `<div class="field full"><span>Réseaux de diffusion</span><div class="tagsel" data-multi="reseaux">${RESEAUX.map(([k, l]) => `<button type="button" data-v="${k}" class="${(d.reseaux || []).includes(k) ? 'on' : ''}" ${ro ? 'disabled' : ''}>${l}</button>`).join('')}</div></div>` : ''}
          <label class="field"><span>Date de publication</span><input class="input" type="datetime-local" data-f="date_debut" value="${toLocalInput(c.date_debut)}" ${ro ? 'readonly' : ''}></label>
          <label class="field"><span>Marque</span><select class="input" data-f="marque" ${ro || c.statut === 'publie' ? 'disabled' : ''}>${BRAND_KEYS.map(b => `<option value="${b}" ${b === c.marque ? 'selected' : ''}>${esc(BRANDS[b].nom)}</option>`).join('')}</select></label>
        </div>
      </div>
      <div class="panel glass" data-st>
        <div class="panel-head"><div><span class="label">2 · Texte</span><h2 style="margin-top:4px">Rédiger</h2><p>${esc(typeLabel(d.type))} : un champ par élément, évalué au fil de la saisie.</p></div>
          ${social && (d.reseaux || []).length > 1 ? `<div class="seg glass glide" id="netSeg"></div>` : ''}</div>
        <div class="netbox">
          <div class="blocs" id="edBlocs">${blocsHTML()}</div>
          ${!ro && st.add.length ? `<div class="badd"><span class="small muted">Ajouter</span>${st.add.map(k => `<button type="button" class="btn ghost sm" data-badd="${k}">${ic('plus')}${esc(label(d.type, k))}</button>`).join('')}</div>` : ''}
          <div class="counter" id="edCounter"></div>
          <div class="btn-row">
            <button class="btn ghost sm mag" id="edHtml">${ic('eye')}Aperçu HTML</button>
            <button class="btn text sm" id="edCopyAll">${ic('copy')}Copier tous les champs</button>
            ${ro ? '' : `<button class="btn text sm" id="edImport">${ic('file')}Coller un texte complet</button>`}
            ${social && (d.reseaux || []).length > 1 && !ro ? `<button class="btn text sm" id="copyNet">${ic('copy')}Reprendre le texte ${E.net === 'linkedin' ? 'Instagram' : 'LinkedIn'}</button>` : ''}
          </div>
        </div>
      </div>
      <div class="panel glass" data-st>
        <div class="panel-head"><div><span class="label">3 · Hashtags et lien</span><h2 style="margin-top:4px">Diffusion</h2></div></div>
        <div class="field"><span>Hashtags</span><div class="tagin" id="tagin">${(d.hashtags || []).map(h => `<span class="chip">${esc(h)}${ro ? '' : `<button type="button" data-rmtag="${esc(h)}" aria-label="Retirer ${esc(h)}">${ic('x')}</button>`}</span>`).join('')}${ro ? '' : '<input id="tagInput" placeholder="Ajouter un hashtag puis Entrée">'}</div></div>
        ${ro ? '' : `<div style="margin-top:10px"><span class="small muted">Banque de la marque</span><div class="sugg" style="margin-top:6px">${byKind('hashtag').filter(h => (h.marque === c.marque || h.marque === 'groupe') && !(d.hashtags || []).map(x => x.toLowerCase()).includes(h.titre.toLowerCase())).slice(0, 14).map(h => `<button type="button" data-addtag="${esc(h.titre)}">${esc(h.titre)}</button>`).join('')}</div></div>`}
        <div class="grid-f" style="margin-top:16px">
          <label class="field"><span>Lien <em>(facultatif)</em></span><input class="input" data-f="lien" value="${esc(d.lien)}" placeholder="https://www.hympyr.fr/..." ${ro ? 'readonly' : ''}></label>
          <div class="field"><span>Suivi des visites</span><label class="check" style="min-height:46px"><input type="checkbox" data-f="utm" ${d.utm ? 'checked' : ''} ${ro ? 'disabled' : ''}>Ajouter les paramètres de suivi au lien</label></div>
          ${d.lien ? `<p class="small muted full" style="overflow-wrap:anywhere">Lien diffusé : ${esc(trackedLink(c, E.net === 'principal' ? 'site' : E.net))}</p>` : ''}
        </div>
      </div>
      <div class="panel glass" data-st>
        <div class="panel-head"><div><span class="label">4 · Visuels</span><h2 style="margin-top:4px">Références visuelles</h2><p>Les fichiers restent sur votre espace de stockage : indiquez leur lien, leur texte alternatif et leurs crédits.</p></div>
          ${ro ? '' : `<div class="btn-row"><button class="btn ghost sm mag" id="visPick">${ic('image')}Choisir dans la bibliothèque</button><button class="btn ghost sm mag" id="visAdd">${ic('plus')}Ajouter un lien</button></div>`}</div>
        <div class="rows" id="visList">${visRows()}</div>
      </div>
      ${fam === 'interne' || (d.cible || []).some(x => ['salaries', 'chauffeurs', 'direction'].includes(x)) ? `
      <div class="panel glass" data-st>
        <div class="panel-head"><div><span class="label">5 · Diffusion interne</span><h2 style="margin-top:4px">Canaux internes</h2></div></div>
        <div class="tagsel" data-multi="canaux">${[['note', 'Note de service'], ['newsletter', 'Newsletter interne'], ['affichage', 'Affichage dépôts'], ['chauffeurs', 'Message chauffeurs'], ['reunion', 'Réunion d\'équipe']].map(([k, l]) => `<button type="button" data-v="${k}" class="${(d.interne.canaux || []).includes(k) ? 'on' : ''}" ${ro ? 'disabled' : ''}>${l}</button>`).join('')}</div>
        <div class="grid-f" style="margin-top:16px">
          <label class="check"><input type="checkbox" data-f="lecture" ${d.interne.lecture ? 'checked' : ''} ${ro ? 'disabled' : ''}>Accusé de lecture demandé</label><span></span>
          ${d.interne.lecture ? `<label class="field"><span>Destinataires</span><input class="input" type="number" min="0" data-f="total" value="${d.interne.total || 0}"></label><label class="field"><span>Lectures confirmées</span><input class="input" type="number" min="0" data-f="lus" value="${d.interne.lus || 0}"></label>` : ''}
        </div>
      </div>` : ''}
      ${fam === 'print' ? `<div class="panel glass" data-st><div class="panel-head"><div><span class="label">Print</span><h2 style="margin-top:4px">Fabrication</h2><p>Suivez maquette, BAT, impression et livraison dans Projets, onglet Print.</p></div>
        ${c.id && !ro ? `<button class="btn ghost sm mag" id="mkPrint">${ic('print')}${byKind('print').some(p => p.parent_id === c.id) ? 'Ouvrir le suivi d\'impression' : 'Créer le suivi d\'impression'}</button>` : ''}</div></div>` : ''}
    </div>
    <div class="sticky" style="display:flex;flex-direction:column;gap:20px;min-width:0">
      <div class="panel glass" id="anaPanel" data-st></div>
      <div class="panel glass" id="flowPanel" data-st></div>
      <div class="panel glass" id="pvPanel" data-st></div>
      <div class="panel glass" id="conformPanel" data-st></div>
    </div>
  </div>`;
  wire(); refreshSide(true); stagger(E.el);
}
const RO = () => isDirection() && S.role !== 'admin';
function blocsHTML() {
  const c = E.c, d = c.data, bl = d.blocs[E.net] || [], st = struct(d.type), ro = RO(), n = {};
  return bl.map((b, i) => {
    const K = KINDS[b.k]; const num = K.two ? ' ' + (n[b.k] = (n[b.k] || 0) + 1) : ''; const chk = fieldCheck(b, d.type, E.net);
    const mov = st.add.includes(b.k);
    return `<div class="bloc k-${b.k}" data-i="${i}">
      <div class="bh"><span class="bk">${esc(label(d.type, b.k))}${num}</span><span class="bchk ${chk.lv}">${chk.lv === 'ok' ? ic('check') : chk.lv === 'warn' ? ic('alert') : ''}<span>${esc(chk.msg)}</span></span>
        <span class="bact"><button type="button" class="icon-btn" data-bact="copy" title="Copier ce champ" aria-label="Copier ce champ">${ic('copy')}</button>${!ro && mov ? `<button type="button" class="icon-btn" data-bact="up" title="Monter" aria-label="Monter" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button><button type="button" class="icon-btn" data-bact="down" title="Descendre" aria-label="Descendre" ${i === bl.length - 1 ? 'disabled' : ''}>${ic('down2')}</button><button type="button" class="icon-btn" data-bact="del" title="Retirer ce champ" aria-label="Retirer ce champ">${ic('x')}</button>` : ''}</span></div>
      ${K.two ? `<input class="input bt" data-b="t" value="${esc(b.t || '')}" placeholder="${esc(K.tph)}" ${ro ? 'readonly' : ''}>` : ''}
      ${K.line ? `<input class="input" data-b="v" value="${esc(b.v || '')}" placeholder="${esc(K.ph)}" ${ro ? 'readonly' : ''}>` : `<textarea class="input" data-b="v" rows="${K.rows || 3}" placeholder="${esc(K.ph)}" ${ro ? 'readonly' : ''}>${esc(b.v || '')}</textarea>`}
    </div>`;
  }).join('');
}
function grow(t) { if (t && t.tagName === 'TEXTAREA') { t.style.height = 'auto'; t.style.height = Math.min(900, t.scrollHeight + 2) + 'px'; } }
function redrawBlocs(focusIdx) {
  const box = $('#edBlocs', E.el); if (!box) return; box.innerHTML = blocsHTML(); $$('textarea', box).forEach(grow);
  if (focusIdx != null) { const f = $(`.bloc[data-i="${focusIdx}"] [data-b]`, box); if (f) { f.focus(); f.closest('.bloc').animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' }); } }
}
function syncText() { E.c.data.textes[E.net] = compile(E.c, E.net); }
function importText() {
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Coller un texte complet</span><h2 style="margin-top:6px">Répartir un texte dans les champs</h2><p>Collez un texte rédigé ailleurs. Les titres en « # », « ## » et « ### », les lignes « Accroche : », « CTA : », « Diapositive 1 : », les encadrés en « > » et les hashtags sont reconnus. Le premier paragraphe devient l'accroche.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <textarea class="input" id="imTxt" style="min-height:260px" placeholder="# Titre de l'article&#10;&#10;Chapô...&#10;&#10;## Première partie&#10;Texte..."></textarea>
    <div class="modal-foot"><button class="btn ghost" data-close>Annuler</button><button class="btn mag" id="imGo">${ic('check')}Répartir dans les champs</button></div>`, { wide: true });
  const ta = $('#imTxt', el); setTimeout(() => ta.focus(), 80);
  $('#imGo', el).onclick = async () => {
    if (!ta.value.trim()) { ta.classList.add('bad'); ta.focus(); return; }
    const had = (E.c.data.blocs[E.net] || []).some(b => (b.v || b.t || '').trim());
    if (had && !await confirmBox('Remplacer les champs actuels ?', 'Le texte collé remplace le contenu des champs de ce support.', { ok: 'Remplacer' })) return;
    const r = parseText(ta.value, E.c.data.type); E.c.data.blocs[E.net] = r.blocs;
    r.tags.forEach(h => { if (!E.c.data.hashtags.map(x => x.toLowerCase()).includes(h.toLowerCase())) E.c.data.hashtags.push(h); });
    syncText(); close(); changed(); draw();
    toast(`${r.blocs.filter(b => (b.v || b.t || '').trim()).length} champs remplis${r.tags.length ? `, ${r.tags.length} hashtags ajoutés` : ''}`, 'check');
  };
}
function visRows() {
  const v = E.c.data.visuels || [];
  if (!v.length) return `<div class="empty" style="padding:16px"><p>Aucun visuel associé.</p></div>`;
  const ro = isDirection() && S.role !== 'admin';
  return v.map((x, i) => `<div class="tile vis"><span class="th">${/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(x.url || '') ? `<img src="${esc(x.url)}" alt="" loading="lazy" onerror="this.remove()">` : ic('image')}</span>
    <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
      <input class="input" style="min-height:36px;font-size:13px" data-vis="${i}" data-k="url" value="${esc(x.url)}" placeholder="Lien du fichier" ${ro ? 'readonly' : ''}>
      <input class="input ${x.alt ? '' : 'bad'}" style="min-height:36px;font-size:13px" data-vis="${i}" data-k="alt" value="${esc(x.alt)}" placeholder="Texte alternatif (obligatoire)" ${ro ? 'readonly' : ''}>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:6px"><input class="input" style="min-height:36px;font-size:13px" data-vis="${i}" data-k="credit" value="${esc(x.credit)}" placeholder="Crédit photo" ${ro ? 'readonly' : ''}><input class="input" type="date" style="min-height:36px;font-size:13px" data-vis="${i}" data-k="droits_fin" value="${esc(x.droits_fin || '')}" title="Fin des droits d'utilisation" ${ro ? 'readonly' : ''}></div>
    </div>${ro ? '' : `<button class="icon-btn sm" data-rmvis="${i}" aria-label="Retirer le visuel">${ic('x')}</button>`}</div>`).join('');
}

/* ---------- wiring ---------- */
function wire() {
  const el = E.el, c = E.c, d = c.data;
  $('#edPick', el).onchange = e => { if (e.target.value) E.ctx.go(E.ctx.univ, 'creer', null, { id: e.target.value }); };
  const nw = $('#edNew', el); if (nw) nw.onclick = () => E.ctx.go(E.ctx.univ, 'creer', null, {}, true);
  const tp = $('#edTpl', el); if (tp) tp.onclick = pickTemplate;
  const st = $('#edSaveTpl', el); if (st) st.onclick = () => saveAsTemplate(E.c);
  phBanner(); bindQueue();
  const ns = $('#netSeg', el);
  if (ns) seg(ns, (d.reseaux || []).map(n => [n, n === 'linkedin' ? 'LinkedIn' : 'Instagram', n]), E.net, v => { E.net = v; ensureBlocs(c, v); redrawBlocs(); const cp = $('#copyNet', el); if (cp) cp.lastChild.textContent = `Reprendre le texte ${v === 'linkedin' ? 'Instagram' : 'LinkedIn'}`; refreshSide(); });
  const cp = $('#copyNet', el); if (cp) cp.onclick = () => { const other = E.net === 'linkedin' ? 'instagram' : 'linkedin'; d.blocs[E.net] = clone(ensureBlocs(c, other)); syncText(); redrawBlocs(); changed(); };
  $$('#edBlocs textarea', el).forEach(grow);
  const hp = $('#edHtml', el); if (hp) hp.onclick = () => openHtmlPreview(E.c, E.net);
  const ca = $('#edCopyAll', el); if (ca) ca.onclick = () => navigator.clipboard.writeText(fieldsText(E.c, E.net)).then(() => toast('Tous les champs copiés', 'copy'));
  const im = $('#edImport', el); if (im) im.onclick = importText;
  if (!el._wired) { el._wired = true; el.addEventListener('input', onInput); el.addEventListener('change', onInput); el.addEventListener('click', onClick); }
  const ti = $('#tagInput', el);
  if (ti) ti.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); addTag(ti.value); ti.value = ''; } else if (e.key === 'Backspace' && !ti.value && d.hashtags.length) { d.hashtags.pop(); redrawTags(); changed(); } });
  const vp = $('#visPick', el); if (vp) vp.onclick = pickVisual;
  const va = $('#visAdd', el); if (va) va.onclick = () => { d.visuels.push({ url: '', alt: '', credit: '', droits_fin: '' }); swap($('#visList', el), visRows()); changed(); };
  const mp = $('#mkPrint', el); if (mp) mp.onclick = async () => {
    let p = byKind('print').find(x => x.parent_id === c.id);
    if (!p) p = await saveItem({ kind: 'print', marque: c.marque, titre: c.titre, statut: 'maquette', parent_id: c.id, date_debut: c.date_debut, data: { format: typeLabel(d.type), quantite: 0, imprimeur: '', devis: 0, cout: 0, checks: {} } });
    E.ctx.go('groupe', 'projets', 'print', { id: p.id });
  };
}
function swapText(ta, v) { ta.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }).done.then(() => { ta.value = v; ta.getAnimations().forEach(a => a.cancel()); ta.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' }); }); }
function onInput(e) {
  const t = e.target, c = E.c, d = c.data;
  if (t.dataset.b) { const box = t.closest('.bloc'); const b = (d.blocs[E.net] || [])[+box.dataset.i]; if (!b || e.type === 'change') return; b[t.dataset.b] = t.value; grow(t); syncText();
    const ck = fieldCheck(b, d.type, E.net), cel = $('.bchk', box); cel.className = 'bchk ' + ck.lv; cel.innerHTML = (ck.lv === 'ok' ? ic('check') : ck.lv === 'warn' ? ic('alert') : '') + `<span>${esc(ck.msg)}</span>`; changed(); return; }
  if (t.dataset.vis != null) { d.visuels[+t.dataset.vis][t.dataset.k] = t.value; if (t.dataset.k === 'alt') t.classList.toggle('bad', !t.value.trim()); changed(); return; }
  const f = t.dataset.f; if (!f || e.type === 'input' && (t.tagName === 'SELECT' || t.type === 'checkbox')) return;
  if (f === 'marque') { if (e.type === 'change') changeBrand(t.value, t); return; }
  if (f === 'titre') c.titre = t.value;
  else if (f === 'date_debut') c.date_debut = fromLocalInput(t.value);
  else if (f === 'type') { const was = isSocial(c), from = E.net; ensureBlocs(c, from); d.type = t.value; if (was !== isSocial(c)) E.net = isSocial(c) ? (d.reseaux || ['linkedin'])[0] : 'principal'; restructure(c, from, E.net); if (was !== isSocial(c)) { changed(); draw(); return; } if (typeFamily(d.type) === 'interne' && !(d.cible || []).some(x => ['salaries', 'chauffeurs', 'direction'].includes(x))) d.cible = ['salaries']; changed(); draw(); return; }
  else if (f === 'campagne_id') d.campagne_id = t.value;
  else if (f === 'lien') d.lien = t.value.trim();
  else if (f === 'utm') d.utm = t.checked;
  else if (f === 'lecture') { d.interne.lecture = t.checked; changed(); draw(); return; }
  else if (f === 'total' || f === 'lus') d.interne[f] = Math.max(0, +t.value || 0);
  else if (f === 'mentions_ok') d.mentions_ok = t.checked;
  changed();
}
async function changeBrand(to, sel) {
  const c = E.c, from = c.marque; if (to === from) return;
  if (!c.titre.trim()) { sel.value = from; toast('Ajoutez un titre avant de changer de marque', 'alert'); $('[data-f="titre"]', E.el).focus(); return; }
  const ok = await confirmBox(`Déplacer vers ${BRANDS[to].nom} ?`, `Le contenu quitte ${BRANDS[from].nom} et rejoint le calendrier de ${BRANDS[to].nom}. Texte, étape et date sont conservés.`, { ok: 'Changer de marque' });
  if (!ok) { sel.value = from; return; }
  clearTimeout(saveT);
  c.marque = to;
  const camp = c.data.campagne_id ? getItem(c.data.campagne_id) : null;
  if (camp && (camp.data.marques || []).length && !camp.data.marques.includes(to)) c.data.campagne_id = '';
  const s = await persist({ force: true });
  if (!s) { c.marque = from; sel.value = from; return; }
  await addJournal(s.id, 'action', `Marque changée : ${BRANDS[from].nom} vers ${BRANDS[to].nom}`);
  toast(`Contenu déplacé vers ${BRANDS[to].nom}`, 'check');
  E.ctx.go(to, 'creer', null, { id: s.id });
}
function onClick(e) {
  const c = E.c, d = c.data;
  const ba = e.target.closest('[data-bact]');
  if (ba && !ba.disabled) {
    const bl = d.blocs[E.net], i = +ba.closest('.bloc').dataset.i, b = bl[i], a = ba.dataset.bact;
    if (a === 'copy') { const txt = KINDS[b.k].two ? [b.t, b.v].filter(x => (x || '').trim()).join('\n') : (b.v || ''); if (!txt.trim()) { toast('Ce champ est vide', 'alert'); return; } navigator.clipboard.writeText(txt).then(() => toast(`${label(d.type, b.k)} copié`, 'copy')); return; }
    if (a === 'up' && i > 0) { [bl[i - 1], bl[i]] = [bl[i], bl[i - 1]]; syncText(); redrawBlocs(i - 1); changed(); return; }
    if (a === 'down' && i < bl.length - 1) { [bl[i + 1], bl[i]] = [bl[i], bl[i + 1]]; syncText(); redrawBlocs(i + 1); changed(); return; }
    if (a === 'del') { const box = ba.closest('.bloc'); box.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.97)' }], { duration: 200, fill: 'forwards' }).done.then(() => { bl.splice(i, 1); syncText(); redrawBlocs(); changed(); }); return; }
  }
  const bd = e.target.closest('[data-badd]');
  if (bd) {
    const bl = d.blocs[E.net]; const tail = ['legende', 'cta'];
    let at = bl.length; while (at > 0 && tail.includes(bl[at - 1].k)) at--;
    bl.splice(at, 0, newBloc(bd.dataset.badd)); syncText(); redrawBlocs(at); changed(); return;
  }
  const tag = e.target.closest('.tagsel[data-multi] button');
  if (tag && !tag.disabled) {
    const box = tag.parentElement, key = box.dataset.multi, v = tag.dataset.v;
    if (key === 'objectif') { d.objectif = v; $$('button', box).forEach(b => b.classList.toggle('on', b === tag)); }
    else {
      const arr = key === 'canaux' ? (d.interne.canaux = d.interne.canaux || []) : (d[key] = d[key] || []);
      const i = arr.indexOf(v); if (i > -1) { if (key === 'reseaux' && arr.length === 1) { toast('Gardez au moins un réseau', 'alert'); return; } arr.splice(i, 1); } else arr.push(v);
      tag.classList.toggle('on', arr.includes(v));
      if (key === 'reseaux') { if (!arr.includes(E.net)) E.net = arr[0]; changed(); draw(); return; }
      if (key === 'cible') { const had = !!$('[data-multi="canaux"]', E.el); const need = typeFamily(d.type) === 'interne' || arr.some(x => ['salaries', 'chauffeurs', 'direction'].includes(x)); if (had !== need) { changed(); draw(); return; } }
    }
    changed(); return;
  }
  const at = e.target.closest('[data-addtag]'); if (at) { addTag(at.dataset.addtag); at.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.8)' }], { duration: 220, fill: 'forwards' }).done.then(() => at.remove()); return; }
  const rt = e.target.closest('[data-rmtag]'); if (rt) { d.hashtags = d.hashtags.filter(h => h !== rt.dataset.rmtag); redrawTags(); changed(); return; }
  const rv = e.target.closest('[data-rmvis]'); if (rv) { d.visuels.splice(+rv.dataset.rmvis, 1); swap($('#visList', E.el), visRows()); changed(); return; }
}
function addTag(v) {
  const d = E.c.data; let h = (v || '').trim().replace(/[,\s]+/g, ''); if (!h) return; if (!h.startsWith('#')) h = '#' + h;
  if (d.hashtags.map(x => x.toLowerCase()).includes(h.toLowerCase())) return;
  d.hashtags.push(h); redrawTags(); changed();
}
function redrawTags() {
  const box = $('#tagin', E.el), inp = $('#tagInput', box);
  $$('.chip', box).forEach(x => x.remove());
  E.c.data.hashtags.forEach(h => { const s = document.createElement('span'); s.className = 'chip'; s.innerHTML = `${esc(h)}<button type="button" data-rmtag="${esc(h)}" aria-label="Retirer ${esc(h)}">${ic('x')}</button>`; box.insertBefore(s, inp); });
  if (inp) inp.focus();
}

/* ---------- change + autosave ---------- */
function changed() {
  phBanner();
  refreshSide();
  if (isDirection() && S.role !== 'admin') return;
  $('#edSaved', E.el).textContent = 'Modifications en cours';
  clearTimeout(saveT); saveT = setTimeout(() => persist(), 1200);
}
async function persist(extra = {}) {
  const c = E.c; if (!c.titre.trim() && !extra.force) { $('#edSaved', E.el).textContent = 'Ajoutez un titre pour enregistrer'; return null; }
  if (!c.titre.trim()) c.titre = 'Sans titre';
  const a = analyseContent(c, E.net === 'principal' ? 'linkedin' : E.net);
  c.data.score = a.global;
  Object.assign(c, extra.fields || {});
  try {
    const wasNew = !c.id;
    const saved = await saveItem(c);
    if (wasNew) { await addJournal(saved.id, 'action', 'Contenu créé'); history.replaceState(null, '', `#${E.ctx.univ}/creer?id=${saved.id}`); E.ctx.params = { id: saved.id }; }
    const changedStatut = saved.statut !== c.statut;
    E.c = { ...clone(saved), data: { ...c.data, ...saved.data } };
    const t = new Date(); const lbl = $('#edSaved', E.el); if (lbl) lbl.textContent = `Enregistré à ${t.getHours()} h ${String(t.getMinutes()).padStart(2, '0')}`;
    if (changedStatut || extra.redraw) { draw(); if (saved.statut === 'validation' && !extra.fields) toast('Contenu modifié après validation : il repart en validation', 'alert'); }
    else { const st = $('#edStatut', E.el); if (st) st.textContent = statutLabel(saved.statut); const pick = $('#edPick', E.el); if (pick && wasNew) { draw(); } }
    return saved;
  } catch (e) { const lbl = $('#edSaved', E.el); if (lbl) lbl.textContent = 'Non enregistré'; return null; }
}

/* ---------- side panels ---------- */
function refreshSide(first) {
  const c = E.c, d = c.data, net = E.net === 'principal' ? 'linkedin' : E.net;
  const a = analyseContent(c, net); E.last = a;
  const cnt = $('#edCounter', E.el);
  if (cnt) { const s = settings().seuils[net]; const car = a.stats.car; cnt.innerHTML = `<span><b>${a.stats.mots}</b> mots · <b>${car}</b> caractères · lisibilité <b>${a.stats.lisibilite}</b>/100</span><span class="${car >= s.min && car <= s.max ? 'okc' : 'warnc'}">Repère ${E.net === 'principal' ? 'éditorial' : E.net === 'instagram' ? 'Instagram' : 'LinkedIn'} : ${s.min} à ${s.max} caractères</span>`; }
  const ap = $('#anaPanel', E.el);
  if (first || !$('svg.radar', ap)) {
    ap.innerHTML = `<div class="panel-head" style="margin-bottom:10px"><div><span class="label">Analyse en direct</span><h2 style="margin-top:4px">Score du contenu</h2><p>Objectif : ${esc(objLabel(d.objectif))}${isSocial(c) ? ` · ${net === 'instagram' ? 'Instagram' : 'LinkedIn'}` : ''}</p></div><div id="scoreRing"></div></div>
      <div id="radarBox">${radarSVG([{ values: a.scores }])}</div>
      <div class="reco" id="recoBox" style="margin-top:12px"></div>
      <div class="btn-row" style="margin-top:12px"><button class="btn text sm" id="toAna">${ic('radar')}Analyse détaillée</button></div>`;
    $('#toAna', ap).onclick = () => { sessionStorage.setItem('hc-ana', JSON.stringify({ texte: textFor(c, net), hashtags: d.hashtags, reseau: net, objectif: d.objectif, lien: d.lien, titre: c.titre })); E.ctx.go(E.ctx.univ, 'analyse', 'analyser'); };
  } else animateRadar($('svg.radar', ap), E.prevScores || a.scores, a.scores);
  E.prevScores = a.scores;
  $('#scoreRing', ap).innerHTML = ring(a.global, 100, scoreLabel(a.global)); animateRings(ap);
  $('p', $('.panel-head', ap)).textContent = `Objectif : ${objLabel(d.objectif)}${isSocial(c) ? ` · ${net === 'instagram' ? 'Instagram' : 'LinkedIn'}` : ''}`;
  $('#recoBox', ap).innerHTML = a.issues.slice(0, 4).map(i => `<div class="tile it"><span class="lv ${i.lv}">${i.lv}</span><span>${esc(i.msg)}</span></div>`).join('') || `<div class="tile it"><span class="lv basse">ok</span><span>Aucun point bloquant. Relisez et envoyez en validation.</span></div>`;
  drawPreview(net); drawConform(a); drawFlow();
}
function drawPreview(net) {
  const c = E.c, d = c.data, box = $('#pvPanel', E.el); if (!box) return;
  const nets = isSocial(c) ? (d.reseaux || []) : [];
  if (!nets.length) {
    let fr = $('iframe.pv-mini', box);
    if (!fr) { box.innerHTML = `<div class="panel-head" style="margin-bottom:12px"><div><span class="label">Aperçu</span><h2 style="margin-top:4px">Rendu final</h2></div><button class="btn ghost sm mag" id="pvHtml">${ic('eye')}Aperçu HTML</button></div><iframe class="pv-mini" sandbox="allow-same-origin" title="Aperçu du rendu"></iframe>`; fr = $('iframe', box); fr.srcdoc = htmlDoc(c, 'principal', { mini: true }); $('#pvHtml', box).onclick = () => openHtmlPreview(E.c, 'principal'); return; }
    clearTimeout(box._t); box._t = setTimeout(() => { fr.srcdoc = htmlDoc(E.c, 'principal', { mini: true }); }, 500); return;
  }
  const v = nets.includes(box._pv) ? box._pv : net;
  const s = settings().seuils[v]; const txt = (d.textes[v] || '');
  const tags = d.hashtags.filter(h => !txt.includes(h)).join(' ');
  const full = (txt + (tags ? '\n\n' + tags : '')).trim();
  const short = full.length > s.coupe ? full.slice(0, s.coupe).replace(/\s+\S*$/, '') : full;
  const fmt = t => esc(t).replace(/(#[\p{L}\p{N}_]+)/gu, '<span class="ht">$1</span>');
  const img = (d.visuels || []).find(x => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(x.url || ''));
  box.innerHTML = `<div class="panel-head" style="margin-bottom:12px"><div><span class="label">Aperçu</span><h2 style="margin-top:4px">Rendu dans le fil</h2></div>${nets.length > 1 ? '<div class="seg glass glide" id="pvSeg"></div>' : ''}</div>
    <div class="pv ${v === 'instagram' ? 'ig' : ''}">
      ${v === 'linkedin' ? `<div class="ph"><span class="av"></span><div><b>${esc(BRANDS[c.marque].nom)}</b><span>Entreprise · ${c.date_debut ? fmtDate(c.date_debut) : 'à planifier'}</span></div></div>
        <div class="tx" id="pvTx">${fmt(short)}${full.length > short.length ? '<span class="mo"> … voir plus</span>' : ''}</div>
        ${img || d.visuels.length ? `<div class="img">${img ? `<img src="${esc(img.url)}" alt="${esc(img.alt)}" onerror="this.remove()">` : 'Visuel'}</div>` : ''}
        <div class="acts"><span>J'aime</span><span>Commenter</span><span>Republier</span><span>Envoyer</span></div>`
      : `<div class="ph"><span class="av"></span><div><b>${esc(c.marque === 'groupe' ? 'hympyr' : 'hympyr' + c.marque)}</b><span>Publication</span></div></div>
        <div class="img">${img ? `<img src="${esc(img.url)}" alt="${esc(img.alt)}" onerror="this.remove()">` : 'Visuel 4:5'}</div>
        <div class="acts"><span>J'aime</span><span>Commenter</span><span>Partager</span></div>
        <div class="tx" style="padding-top:10px" id="pvTx"><b>${esc(c.marque === 'groupe' ? 'hympyr' : 'hympyr' + c.marque)}</b> ${fmt(short)}${full.length > short.length ? '<span class="mo"> … plus</span>' : ''}</div>`}
    </div>
    <p class="small muted" style="margin-top:10px">Coupure à ${s.coupe} caractères : ce qui précède doit donner envie de cliquer.</p>`;
  const ps = $('#pvSeg', box); if (ps) seg(ps, nets.map(n => [n, n === 'linkedin' ? 'LinkedIn' : 'Instagram']), v, nv => { box._pv = nv; drawPreview(net); });
  const mo = $('.mo', box); if (mo) { mo.style.cursor = 'pointer'; mo.onclick = () => { $('#pvTx', box).innerHTML = (v === 'instagram' ? `<b>${esc(c.marque === 'groupe' ? 'hympyr' : 'hympyr' + c.marque)}</b> ` : '') + fmt(full); }; }
}
export function conformity(c, a) {
  const d = c.data, out = [];
  out.push([a.stats.emojis === 0, 'Aucun emoji', a.stats.emojis ? 'no' : 'ok', true]);
  if ((d.visuels || []).length) {
    out.push([d.visuels.every(v => (v.alt || '').trim()), 'Texte alternatif pour chaque visuel', '', false]);
    out.push([d.visuels.every(v => (v.credit || '').trim()), 'Crédits photo renseignés', '', false]);
    const pub = c.date_debut ? new Date(c.date_debut) : new Date();
    out.push([d.visuels.every(v => !v.droits_fin || new Date(v.droits_fin) >= pub), 'Droits d\'utilisation valides à la date de publication', '', false]);
  }
  const green = a.issues.some(i => /Allégation/.test(i.msg));
  out.push([!green, green ? 'Allégation environnementale à justifier' : 'Pas d\'allégation environnementale non justifiée', '', false]);
  out.push([a.scores.cta >= 60, 'Appel à l\'action présent', '', false]);
  if (d.lien) out.push([!!d.utm, 'Lien avec suivi des visites', '', false]);
  if (d.objectif === 'commercial' || /€|prix|tarif|offre|promotion|remise/i.test(textFor(c, E && E.net !== 'principal' ? E.net : 'linkedin'))) out.push([!!d.mentions_ok, 'Mentions légales de l\'offre vérifiées', 'manual', false]);
  out.push([!!c.date_debut, 'Date de publication définie', '', false]);
  return out;
}
function drawConform(a) {
  const box = $('#conformPanel', E.el); if (!box) return; const c = E.c;
  const items = conformity(c, a);
  const okN = items.filter(x => x[0]).length;
  box.innerHTML = `<div class="panel-head" style="margin-bottom:12px"><div><span class="label">Contrôle charte et conformité</span><h2 style="margin-top:4px">${okN} / ${items.length} points validés</h2></div></div>
    <ul class="checks">${items.map(([ok, l, mode]) => `<li><span class="tk ${ok ? '' : mode === 'no' ? 'no' : 'mid'}">${ic(ok ? 'check' : mode === 'no' ? 'x' : 'alert')}</span><span>${mode === 'manual' ? `<label class="check" style="display:inline-flex"><input type="checkbox" data-f="mentions_ok" ${c.data.mentions_ok ? 'checked' : ''}>${esc(l)}</label>` : esc(l)}</span></li>`).join('')}</ul>`;
}
function drawFlow() {
  const box = $('#flowPanel', E.el); if (!box) return; const c = E.c, d = c.data;
  const dir = isDirection(), cr = canCreate();
  let actions = '';
  if (!c.id) actions = `<p class="muted small">Donnez un titre au contenu : il s'enregistre automatiquement.</p>`;
  else if (PRE_VALID.includes(c.statut) && c.statut !== 'validation' && cr) actions = `
      <p class="small muted">${c.statut === 'idee' ? 'Idée. Renseignez la date et l\'heure de diffusion : le contenu passera automatiquement à produire.' : `À produire${c.date_debut ? ', diffusion prévue le ' + fmtDT(c.date_debut) : ''}. Rédigez, puis envoyez en validation.`}</p>
      <button class="btn mag" id="toValid" style="width:100%;margin-top:12px">${ic('send')}Envoyer en validation</button>`;
  else if (c.statut === 'validation') actions = dir ? `<p class="small muted">Ce contenu attend votre décision.</p>
      <label class="field" style="margin-top:10px"><span>Commentaire <em>(obligatoire pour une demande de modification)</em></span><textarea class="input" id="valCom" style="min-height:80px"></textarea></label>
      <div class="btn-row" style="margin-top:12px"><button class="btn ok mag" id="valOk">${ic('check')}Valider</button><button class="btn ghost mag" id="valKo">Demander des modifications</button></div>`
    : `<p class="small muted">En attente de validation par la direction.</p>${cr ? '<button class="btn text sm" id="toBack" style="margin-top:8px">Retirer de la validation</button>' : ''}`;
  else if (c.statut === 'a_planifier') actions = `<p class="small muted">Validé. Fixez la date puis planifiez.</p>${cr || dir ? `<button class="btn mag" id="toPlan" style="width:100%;margin-top:12px" ${c.date_debut ? '' : 'disabled'}>${ic('cal')}Planifier le ${c.date_debut ? fmtDT(c.date_debut) : '…'}</button>` : ''}`;
  else if (c.statut === 'planifie') actions = `<p class="small muted">Planifié le ${fmtDT(c.date_debut)}. Publiez manuellement sur le réseau, puis confirmez.</p>${cr || dir ? `<div class="btn-row" style="margin-top:12px"><button class="btn mag" id="toPub">${ic('check')}Marquer comme publié</button><button class="btn ghost sm mag" id="copyTxt">${ic('copy')}Copier le texte</button></div>` : ''}`;
  else if (c.statut === 'publie') actions = `<p class="small muted">Publié${c.date_debut ? ' le ' + fmtDT(c.date_debut) : ''}. Saisissez les statistiques pour comparer score et performance.</p>
      <div class="grid-f" style="margin-top:12px">${[['vues', 'Impressions'], ['interactions', 'Interactions'], ['clics', 'Clics'], ['abonnes', 'Abonnés gagnés']].map(([k, l]) => `<label class="field"><span>${l}</span><input class="input" type="number" min="0" data-stat="${k}" value="${(d.stats || {})[k] || ''}"></label>`).join('')}</div>
      <button class="btn ghost sm mag" id="saveStats" style="margin-top:12px">Enregistrer les statistiques</button>`;
  box.innerHTML = `<div class="panel-head" style="margin-bottom:12px"><div><span class="label">Circuit</span><h2 style="margin-top:4px">${esc(statutLabel(c.statut))}</h2></div>
    ${c.id ? `<div class="btn-row"><button class="icon-btn sm" id="hist" title="Historique et versions" aria-label="Historique et versions">${ic('history')}</button><button class="icon-btn sm" id="coms" title="Commentaires" aria-label="Commentaires">${ic('msg')}</button>${cr ? `<button class="icon-btn sm" id="dup" title="Dupliquer ou décliner" aria-label="Dupliquer ou décliner">${ic('copy')}</button><button class="icon-btn sm" id="arch" title="Archiver" aria-label="Archiver">${ic('trash')}</button>` : ''}</div>` : ''}</div>${actions}`;
  const on = (id, fn) => { const b = $('#' + id, box); if (b) b.onclick = fn; };
  const ss = $('#stSel', box); if (ss) ss.onchange = () => persist({ fields: { statut: ss.value }, redraw: true });
  on('toValid', async () => {
    const a = E.last; if (a.stats.emojis) { toast('Retirez les emojis avant l\'envoi : la charte les interdit', 'alert'); return; }
    if (!textFor(c, isSocial(c) ? (d.reseaux[0]) : 'principal').trim()) { toast('Rédigez le texte avant l\'envoi', 'alert'); return; }
    const ph = placeholders([...(isSocial(c) ? d.reseaux : ['principal']).map(n => textFor(c, n)), ...(isSocial(c) ? d.reseaux : ['principal']).map(n => ((d.blocs || {})[n] || []).map(b => (b.t || '') + '\n' + (b.v || '')).join('\n'))].join('\n')); if (ph.length) { toast(`Complétez d'abord ${ph.length > 1 ? 'les passages' : 'le passage'} ${ph.slice(0, 3).join(', ')}`, 'alert'); return; }
    d.retour = ''; const s = await persist({ fields: { statut: 'validation' }, redraw: true, force: true });
    if (s) { await addJournal(s.id, 'version', 'Version envoyée en validation', { textes: s.data.textes, hashtags: s.data.hashtags, score: s.data.score }); await addJournal(s.id, 'action', 'Envoyé en validation'); toast('Envoyé à la direction pour validation', 'send'); }
  });
  on('toBack', async () => { const s = await persist({ fields: { statut: 'a_produire' }, redraw: true }); if (s) addJournal(s.id, 'action', 'Retiré de la validation'); });
  on('valOk', async () => {
    const com = $('#valCom', box).value.trim();
    const s = await saveItem({ ...c, statut: 'a_planifier', data: { ...d, retour: '' } }).catch(() => null);
    if (!s) return; E.c = clone(s);
    await addJournal(s.id, 'version', 'Version validée', { textes: s.data.textes, hashtags: s.data.hashtags, score: s.data.score });
    await addJournal(s.id, 'action', 'Validé par la direction'); if (com) await addJournal(s.id, 'commentaire', com);
    toast('Contenu validé'); draw();
  });
  on('valKo', async () => {
    const t = $('#valCom', box); const com = t.value.trim(); if (!com) { t.classList.add('bad'); t.focus(); toast('Précisez les modifications attendues', 'alert'); return; }
    const s = await saveItem({ ...c, statut: 'a_produire', data: { ...d, retour: com, retour_le: new Date().toISOString() } }).catch(() => null); if (!s) return; E.c = clone(s);
    await addJournal(s.id, 'action', 'Modifications demandées'); await addJournal(s.id, 'commentaire', com);
    toast('Demande de modification envoyée : le contenu repasse à produire', 'msg'); draw();
  });
  on('toPlan', async () => { const s = await persist({ fields: { statut: 'planifie' }, redraw: true }); if (s) { addJournal(s.id, 'action', 'Planifié'); toast('Contenu planifié', 'cal'); } });
  on('toPub', async () => { const s = await persist({ fields: { statut: 'publie', date_debut: c.date_debut || new Date().toISOString() }, redraw: true }); if (s) { addJournal(s.id, 'action', 'Publié'); toast('Bravo, contenu publié', 'trophy'); } });
  on('copyTxt', () => { const n = isSocial(c) ? (d.reseaux[0]) : 'principal'; const tx = textFor(c, n) + (d.hashtags.length ? '\n\n' + d.hashtags.join(' ') : '') + (d.lien ? '\n\n' + trackedLink(c, n) : ''); navigator.clipboard.writeText(tx).then(() => toast('Texte copié, prêt à coller')); });
  on('saveStats', async () => { d.stats = d.stats || {}; $$('[data-stat]', box).forEach(i => d.stats[i.dataset.stat] = +i.value || 0); d.stats.maj = new Date().toISOString(); const s = await persist({}); if (s) toast('Statistiques enregistrées', 'chart'); });
  on('hist', () => openHistory(c));
  on('coms', () => openComments(c));
  on('dup', () => openDecline(c, E.ctx));
  on('arch', async () => { if (await confirmBox('Archiver ce contenu ?', 'Il disparaîtra du calendrier et du tableau. Vous pourrez le retrouver dans la recherche.', { ok: 'Archiver' })) { await saveItem({ ...c, statut: 'archive' }); addJournal(c.id, 'action', 'Archivé'); toast('Contenu archivé'); E.ctx.go(E.ctx.univ, 'creer', null, {}, true); } });
}

/* ---------- edit queue (selection from the board) ---------- */
function queueBar() {
  const c = E.c, ids = Q.ids.filter(id => getItem(id)); const i = c.id ? ids.indexOf(c.id) : -1; if (i < 0 || ids.length < 2) return '';
  return `<div class="qbar tile" id="edQueue"><button class="btn ghost sm mag" data-q="-1" ${i === 0 ? 'disabled' : ''}>${ic('left')}Précédent</button>
    <div class="qmid"><span class="label">Liste d'édition</span><b>${i + 1} sur ${ids.length}</b><div class="qdots">${ids.map((id, k) => `<button type="button" class="${k === i ? 'on' : k < i ? 'done' : ''}" data-qi="${k}" title="${esc((getItem(id) || {}).titre || '')}" aria-label="Contenu ${k + 1}"></button>`).join('')}</div></div>
    <div class="btn-row"><button class="btn sm mag" data-q="1" ${i === ids.length - 1 ? 'disabled' : ''}>Suivant${ic('right')}</button><button class="icon-btn sm" data-qx title="Quitter la liste" aria-label="Quitter la liste">${ic('x')}</button></div></div>`;
}
async function queueGo(k) {
  const ids = Q.ids.filter(id => getItem(id)); const id = ids[k]; if (!id || id === E.c.id) return;
  if (saveT) { clearTimeout(saveT); saveT = null; if (!(isDirection() && S.role !== 'admin')) await persist(); }
  const it = getItem(id); E.ctx.go(it.marque, 'creer', null, { id }, true);
}
function bindQueue() {
  const q = $('#edQueue', E.el); if (!q) return;
  q.onclick = e => { const ids = Q.ids.filter(id => getItem(id)), i = ids.indexOf(E.c.id);
    const b = e.target.closest('[data-q]'); if (b && !b.disabled) return queueGo(i + Number(b.dataset.q));
    const d = e.target.closest('[data-qi]'); if (d) return queueGo(Number(d.dataset.qi));
    if (e.target.closest('[data-qx]')) { setQueue([]); q.remove(); toast('Liste d\'édition fermée', 'list'); } };
}
addEventListener('keydown', e => { if (!E || !E.el.isConnected || !$('#edQueue', E.el) || !e.altKey || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; e.preventDefault(); const ids = Q.ids.filter(id => getItem(id)); queueGo(ids.indexOf(E.c.id) + (e.key === 'ArrowRight' ? 1 : -1)); });

/* ---------- modals ---------- */
function pickTemplate() {
  pickTemplateFor(E.c, t => { applyTemplate(E.c, t); E.net = isSocial(E.c) ? (E.c.data.reseaux || ['linkedin'])[0] : 'principal'; changed(); draw(); toast('Modèle appliqué. Complétez les passages entre crochets.', 'layers'); });
}
function phBanner() {
  const box = $('#edPh', E.el); if (!box) return; const p = placeholders(allText(E.c));
  box.innerHTML = p.length ? `<div class="tile" style="margin-top:14px;padding:10px 14px;display:flex;gap:10px;align-items:center;border-color:color-mix(in srgb,var(--warn) 50%,transparent)"><span class="chip warn">${ic('alert')}${p.length} à compléter</span><span class="small" style="min-width:0;overflow-wrap:anywhere">${esc(p.slice(0, 6).join('  '))}${p.length > 6 ? '…' : ''}</span></div>` : '';
}
async function pickVisual() {
  const vis = byKind('visuel').filter(v => v.marque === E.c.marque || v.marque === 'groupe');
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Bibliothèque</span><h2 style="margin-top:6px">Choisir un visuel</h2><p>Références enregistrées dans Ressources, onglet Visuels.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="rows">${vis.map(v => `<div class="tile vis click" data-v="${v.id}"><span class="th">${/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(v.data.url || '') ? `<img src="${esc(v.data.url)}" alt="" onerror="this.remove()">` : ic('image')}</span><div class="t" style="min-width:0"><b style="display:block;font-size:13.5px">${esc(v.titre)}</b><span class="small muted">${esc(v.data.credit || 'Crédit non renseigné')}${v.data.droits_fin ? ' · droits jusqu\'au ' + fmtDate(v.data.droits_fin) : ''}</span></div>${ic('plus')}</div>`).join('') || '<p class="muted">Aucun visuel référencé pour cette marque.</p>'}</div>`, { wide: true });
  el.addEventListener('click', e => { const r = e.target.closest('[data-v]'); if (!r) return; const v = getItem(r.dataset.v); E.c.data.visuels.push({ url: v.data.url || '', alt: v.data.alt || '', credit: v.data.credit || '', droits_fin: v.data.droits_fin || '', ref: v.id }); close(); swap($('#visList', E.el), visRows()); changed(); });
}
export async function openHistory(c) {
  const { el } = modal(`<div class="modal-head"><div><span class="label">Historique</span><h2 style="margin-top:6px">${esc(c.titre)}</h2><p>Actions, validations et versions enregistrées.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div><div class="jr" id="hj"><p class="muted">Chargement</p></div>`, { wide: true });
  const j = await journal(c.id);
  $('#hj', el).innerHTML = j.map(e => `<div class="tile e"><small>${esc(memberName(e.auteur))} · ${fmtDT(e.cree_le)}</small>${e.type === 'version' ? `<b>${esc(e.texte)}</b>${e.details.score != null ? ` · score ${e.details.score}` : ''}${canCreate() ? `<div class="btn-row" style="margin-top:8px"><button class="btn ghost sm" data-restore="${e.id}">Restaurer cette version</button></div>` : ''}` : esc(e.texte)}</div>`).join('') || '<p class="muted">Aucun historique.</p>';
  el.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-restore]'); if (!b) return; const v = j.find(x => String(x.id) === b.dataset.restore);
    if (!await confirmBox('Restaurer cette version ?', 'Le texte et les hashtags actuels seront remplacés. Si le contenu était validé, il repartira en validation.', { ok: 'Restaurer' })) return;
    const cur = getItem(c.id); const s = await saveItem({ ...cur, data: { ...cur.data, textes: v.details.textes, hashtags: v.details.hashtags || cur.data.hashtags } });
    await addJournal(s.id, 'action', 'Version restaurée'); toast('Version restaurée'); if (E && E.c.id === s.id) { E.c = clone(s); draw(); }
  });
}
export async function openComments(c) {
  const { el } = modal(`<div class="modal-head"><div><span class="label">Commentaires</span><h2 style="margin-top:6px">${esc(c.titre)}</h2></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="jr" id="cj"></div><div class="field" style="margin-top:16px"><textarea class="input" id="cTxt" placeholder="Votre commentaire" style="min-height:80px"></textarea></div><div class="modal-foot"><button class="btn mag" id="cSend">${ic('send')}Publier le commentaire</button></div>`);
  const load = async () => { const j = (await journal(c.id)).filter(x => x.type === 'commentaire'); $('#cj', el).innerHTML = j.map(e => `<div class="tile e"><small>${esc(memberName(e.auteur))} · ${fmtDT(e.cree_le)}</small>${esc(e.texte)}</div>`).join('') || '<p class="muted small">Aucun commentaire pour le moment.</p>'; };
  await load();
  $('#cSend', el).onclick = async () => { const t = $('#cTxt', el); if (!t.value.trim()) { t.classList.add('bad'); return; } await addJournal(c.id, 'commentaire', t.value.trim()); t.value = ''; await load(); toast('Commentaire publié', 'msg'); };
}
export function openDecline(c, ctx) {
  let sel = [c.marque];
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Dupliquer</span><h2 style="margin-top:6px">Décliner ce contenu</h2><p>Une copie, au stade idée, est créée pour chaque marque choisie. Le texte reste à adapter à chaque univers.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="tagsel" id="dm">${BRAND_KEYS.map(b => `<button type="button" data-v="${b}" class="${sel.includes(b) ? 'on' : ''}">${esc(BRANDS[b].nom)}</button>`).join('')}</div>
    <div class="modal-foot"><button class="btn ghost" data-close>Annuler</button><button class="btn mag" id="dGo">${ic('copy')}Créer les copies</button></div>`);
  $('#dm', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v; sel = sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v]; b.classList.toggle('on', sel.includes(v)); };
  $('#dGo', el).onclick = async () => {
    if (!sel.length) { toast('Choisissez au moins une marque', 'alert'); return; }
    let last = null;
    for (const m of sel) { last = await saveItem({ kind: 'contenu', marque: m, titre: c.titre + (m === c.marque ? ' (copie)' : ''), statut: 'idee', date_debut: null, parent_id: c.id, data: { ...clone(c.data), retour: '', stats: {}, score: c.data.score } }); await addJournal(last.id, 'action', `Décliné depuis « ${c.titre} »`); }
    close(); toast(`${sel.length} copie${sel.length > 1 ? 's' : ''} créée${sel.length > 1 ? 's' : ''}`, 'copy');
    if (last) ctx.go(last.marque, 'creer', null, { id: last.id });
  };
}
export { blank };
