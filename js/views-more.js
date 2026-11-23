/* =========================================================
   MORE VIEWS : analysis, resources, projects, steering
   ========================================================= */
import {
  $, $$, esc, clone, S, byKind, getItem, contents, saveItem, deleteItem, addJournal, toast, modal, confirmBox, seg, ic, swap, ring, animateRings, animateBars, stagger,
  BRANDS, SUB_BRANDS, BRAND_KEYS, OBJECTIFS, objLabel, RESEAUX, typeLabel, typeFamily, statutLabel, CIBLES,
  isoDay, fmtDate, fmtDT, addDays, settings, saveSettings, DEFAULT_SETTINGS, isDirection, canCreate, memberName, brandDot, euro, num, pct, download, toLocalInput, fromLocalInput
} from './core.js?v=7';
import { analyse, radarSVG, animateRadar, highlight, scoreLabel, CRITERES, DEFAULT_POIDS, poids } from './analysis.js?v=7';

const bc = m => (BRANDS[m] || BRANDS.groupe).color;
const head = (lab, title, p = '', right = '') => `<div class="panel-head"><div><span class="label">${lab}</span><h2 style="margin-top:4px">${title}</h2>${p ? `<p>${p}</p>` : ''}</div>${right}</div>`;

/* generic item form (modal) : fields = [[key,label,type,opts]] */
function itemForm({ title, label, item, fields, onSave, onDelete }) {
  const v = k => k.startsWith('data.') ? (item.data || {})[k.slice(5)] : item[k];
  const input = ([k, l, t, o]) => {
    const val = v(k) ?? '';
    if (t === 'textarea') return `<label class="field full"><span>${l}</span><textarea class="input" data-k="${k}">${esc(val)}</textarea></label>`;
    if (t === 'select') return `<label class="field"><span>${l}</span><select class="input" data-k="${k}">${o.map(([a, b]) => `<option value="${a}" ${String(val) === String(a) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
    if (t === 'datetime') return `<label class="field"><span>${l}</span><input class="input" type="datetime-local" data-k="${k}" value="${toLocalInput(val)}"></label>`;
    if (t === 'check') return `<label class="check" style="min-height:46px"><input type="checkbox" data-k="${k}" ${val ? 'checked' : ''}>${l}</label>`;
    return `<label class="field ${o === 'full' ? 'full' : ''}"><span>${l}</span><input class="input" type="${t || 'text'}" data-k="${k}" value="${esc(val)}"></label>`;
  };
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">${esc(label)}</span><h2 style="margin-top:6px">${esc(title)}</h2></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="grid-f">${fields.map(input).join('')}</div>
    <div class="modal-foot">${item.id && onDelete ? `<button class="btn text sm" id="fDel" style="margin-right:auto;color:var(--err)">${ic('trash')}Supprimer</button>` : ''}<button class="btn ghost" data-close>Annuler</button><button class="btn mag" id="fSave">Enregistrer</button></div>`, { wide: true });
  $('#fSave', el).onclick = async () => {
    const out = clone(item); out.data = out.data || {};
    $$('[data-k]', el).forEach(i => { const k = i.dataset.k; let val = i.type === 'checkbox' ? i.checked : i.type === 'number' ? (+i.value || 0) : i.type === 'datetime-local' ? fromLocalInput(i.value) : i.value; if (k.startsWith('data.')) out.data[k.slice(5)] = val; else out[k] = val; });
    if (!(out.titre || '').trim()) { const t = $('[data-k="titre"]', el); if (t) { t.classList.add('bad'); t.focus(); } return; }
    try { await onSave(out); close(); } catch (e) {}
  };
  const del = $('#fDel', el); if (del) del.onclick = async () => { if (await confirmBox('Supprimer définitivement ?', 'Cette action ne peut pas être annulée.', { ok: 'Supprimer', danger: true })) { await onDelete(item); close(); } };
  return el;
}
const brandOpts = () => BRAND_KEYS.map(b => [b, BRANDS[b].nom]);

/* =========================================================
   ANALYSIS : analyser / comparer / performances
   ========================================================= */
const A = { texte: '', hashtags: '', reseau: 'linkedin', objectif: 'pedagogique', lien: '', b: '' };
export function renderAnalyser(el, ctx) {
  const pre = sessionStorage.getItem('hc-ana'); if (pre) { const p = JSON.parse(pre); Object.assign(A, { texte: p.texte, hashtags: (p.hashtags || []).join(' '), reseau: p.reseau, objectif: p.objectif, lien: p.lien || '' }); sessionStorage.removeItem('hc-ana'); }
  el.innerHTML = `<div class="split">
    <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
      <div class="panel glass" data-st>${head('Texte à analyser', 'Coller ou rédiger', 'Les règles sont fixes ; leurs niveaux et pondérations se règlent dans Pilotage, onglet Réglages.')}
        <div class="grid-f"><label class="field"><span>Objectif</span><select class="input" id="aObj">${OBJECTIFS.map(([k, l]) => `<option value="${k}" ${A.objectif === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Réseau</span><select class="input" id="aNet">${RESEAUX.map(([k, l]) => `<option value="${k}" ${A.reseau === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field full"><span>Texte</span><textarea class="input" id="aTxt" style="min-height:240px" placeholder="Collez ici le texte à évaluer.">${esc(A.texte)}</textarea></label>
        <label class="field full"><span>Hashtags <em>(séparés par des espaces)</em></span><input class="input" id="aTags" value="${esc(A.hashtags)}" placeholder="#HympyrEnergies #AdBlue"></label></div></div>
      <div class="panel glass" data-st>${head('Lecture annotée', 'Ce que repère l\'analyse', 'Orange : phrase longue. Rouge : formule convenue. Souligné : allégation environnementale. Vert : mot-clé de la marque.')}<div class="hl" id="aHl"></div></div>
    </div>
    <div class="sticky" style="display:flex;flex-direction:column;gap:20px;min-width:0">
      <div class="panel glass" data-st id="aScore"></div>
      <div class="panel glass" data-st id="aReco"></div>
    </div></div>`;
  let prev = null;
  const run = () => {
    A.texte = $('#aTxt', el).value; A.hashtags = $('#aTags', el).value; A.objectif = $('#aObj', el).value; A.reseau = $('#aNet', el).value;
    const tags = A.hashtags.split(/[\s,]+/).filter(Boolean);
    const r = analyse({ texte: A.texte, hashtags: tags, reseau: A.reseau, objectif: A.objectif, marque: ctx.univ, lien: A.lien });
    const sb = $('#aScore', el);
    if (!$('svg.radar', sb)) sb.innerHTML = `${head('Score', 'Diagramme radar', '', '<div id="aRing"></div>')}<div id="aRadar">${radarSVG([{ values: r.scores }])}</div><div class="crit-bars" id="aBars" style="margin-top:12px"></div><div class="grid g2" style="margin-top:14px" id="aStats"></div>`;
    else animateRadar($('svg.radar', sb), prev || r.scores, r.scores);
    prev = r.scores;
    $('#aRing', sb).innerHTML = ring(r.global, 100, scoreLabel(r.global)); animateRings(sb);
    $('#aBars', sb).innerHTML = CRITERES.map(([k, l]) => `<div class="c"><div><span>${l} <span style="opacity:.6">×${r.weights[k]}</span></span><b>${r.scores[k]}</b></div><div class="bar"><i data-w="${r.scores[k]}%" style="background:${r.scores[k] >= 70 ? 'var(--ok)' : r.scores[k] >= 50 ? 'var(--warn)' : 'var(--err)'}"></i></div></div>`).join(''); animateBars(sb);
    $('#aStats', sb).innerHTML = [['Mots', r.stats.mots], ['Caractères', r.stats.car], ['Phrases', r.stats.phrases], ['Lisibilité', r.stats.lisibilite + '/100']].map(([l, v]) => `<div class="tile kpi" style="padding:12px 14px"><span>${l}</span><b style="font-size:20px">${v}</b></div>`).join('');
    $('#aReco', el).innerHTML = `${head('À améliorer', `${r.issues.length} point${r.issues.length > 1 ? 's' : ''}`, `Classés par importance pour un objectif ${objLabel(A.objectif).toLowerCase()}.`)}<div class="reco">${r.issues.map(i => `<div class="tile it"><span class="lv ${i.lv}">${i.lv}</span><span><b style="font-size:12px;color:var(--muted)">${esc((CRITERES.find(c => c[0] === i.crit) || [])[1] || '')}</b><br>${esc(i.msg)}</span></div>`).join('') || '<div class="tile it"><span class="lv basse">ok</span><span>Rien à signaler.</span></div>'}</div>`;
    $('#aHl', el).innerHTML = A.texte ? highlight(A.texte, r.marks) : '<span class="muted">Le texte annoté apparaîtra ici.</span>';
  };
  let t; el.oninput = () => { clearTimeout(t); t = setTimeout(run, 180); }; el.onchange = run;
  run(); stagger(el);
}
export function renderComparer(el, ctx) {
  el.innerHTML = `<div class="grid g2">${['A', 'B'].map(v => `<div class="panel glass" data-st>${head('Version ' + v, v === 'A' ? 'Texte actuel' : 'Proposition')}<textarea class="input" id="cmp${v}" style="min-height:220px" placeholder="Texte de la version ${v}">${v === 'A' ? esc(A.texte) : esc(A.b)}</textarea></div>`).join('')}</div>
    <div class="panel glass" data-st>${head('Comparaison', 'Radar superposé', 'Trait plein : version A. Pointillés : version B.', `<div class="btn-row"><select class="input" id="cmpObj" style="min-height:38px;width:auto">${OBJECTIFS.map(([k, l]) => `<option value="${k}" ${A.objectif === k ? 'selected' : ''}>${l}</option>`).join('')}</select><select class="input" id="cmpNet" style="min-height:38px;width:auto">${RESEAUX.map(([k, l]) => `<option value="${k}" ${A.reseau === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`)}
      <div class="split" style="align-items:center"><div id="cmpRadar"></div><div id="cmpTbl"></div></div></div>`;
  const run = () => {
    A.b = $('#cmpB', el).value; const o = $('#cmpObj', el).value, n = $('#cmpNet', el).value;
    const ra = analyse({ texte: $('#cmpA', el).value, reseau: n, objectif: o, marque: ctx.univ }), rb = analyse({ texte: A.b, reseau: n, objectif: o, marque: ctx.univ });
    $('#cmpRadar', el).innerHTML = radarSVG([{ values: ra.scores }, { values: rb.scores, cls: 'area2' }]);
    $('#cmpTbl', el).innerHTML = `<div style="display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap">${ring(ra.global, 100, 'Version A')}${ring(rb.global, 100, 'Version B')}</div>
      <div class="tbl-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>Critère</th><th class="num">A</th><th class="num">B</th><th class="num">Écart</th></tr></thead><tbody>${CRITERES.map(([k, l]) => { const d = rb.scores[k] - ra.scores[k]; return `<tr><td>${l}</td><td class="num">${ra.scores[k]}</td><td class="num">${rb.scores[k]}</td><td class="num" style="color:${d > 0 ? 'var(--ok)' : d < 0 ? 'var(--err)' : 'var(--muted)'}">${d > 0 ? '+' : ''}${d}</td></tr>`; }).join('')}</tbody></table></div>`;
    animateRings(el);
  };
  let t; el.oninput = () => { clearTimeout(t); t = setTimeout(run, 200); }; el.onchange = run; run(); stagger(el);
}
export function renderPerformances(el, ctx) {
  const pub = byKind('contenu', ctx.univ === 'groupe' ? null : ctx.univ).filter(c => c.statut === 'publie' && (c.data.stats || {}).vues);
  const pts = pub.map(c => ({ c, s: c.data.score || 0, e: (c.data.stats.interactions || 0) / Math.max(1, c.data.stats.vues) * 100 }));
  const maxE = Math.max(5, ...pts.map(p => p.e));
  const byObj = OBJECTIFS.map(([k, l]) => { const x = pts.filter(p => p.c.data.objectif === k); return [l, x.length, x.length ? x.reduce((a, p) => a + p.e, 0) / x.length : 0]; }).filter(x => x[1]);
  const tagMap = {}; pts.forEach(p => (p.c.data.hashtags || []).forEach(h => { tagMap[h] = tagMap[h] || { n: 0, e: 0 }; tagMap[h].n++; tagMap[h].e += p.e; }));
  const tags = Object.entries(tagMap).map(([h, v]) => [h, v.n, v.e / v.n]).sort((a, b) => b[2] - a[2]).slice(0, 10);
  const W = 560, H = 300;
  el.innerHTML = `<div class="panel glass" data-st>${head('Score prévu et performance réelle', 'Le score annonce-t-il l\'engagement ?', `${pts.length} contenu${pts.length > 1 ? 's' : ''} publié${pts.length > 1 ? 's' : ''} avec statistiques. Saisissez les chiffres dans chaque contenu publié.`)}
    ${pts.length ? `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:760px;display:block;margin:0 auto">
      <line x1="40" y1="${H - 30}" x2="${W - 10}" y2="${H - 30}" stroke="var(--hair-2)"/><line x1="40" y1="10" x2="40" y2="${H - 30}" stroke="var(--hair-2)"/>
      <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--muted)">Score prévu</text><text x="12" y="${H / 2}" font-size="11" fill="var(--muted)" transform="rotate(-90 12 ${H / 2})" text-anchor="middle">Engagement %</text>
      ${[0, 25, 50, 75, 100].map(v => `<text x="${40 + v / 100 * (W - 50)}" y="${H - 16}" font-size="10" fill="var(--muted)" text-anchor="middle">${v}</text>`).join('')}
      ${pts.map(p => `<circle cx="${40 + p.s / 100 * (W - 50)}" cy="${H - 30 - p.e / maxE * (H - 50)}" r="7" fill="${bc(p.c.marque)}" opacity=".85" data-open="${p.c.id}" style="cursor:pointer"><title>${esc(p.c.titre)} · score ${p.s} · engagement ${p.e.toFixed(1)} %</title></circle>`).join('')}
    </svg>` : '<div class="empty"><p>Aucune statistique saisie pour le moment.</p></div>'}</div>
    <div class="grid g2"><div class="panel glass" data-st>${head('Par objectif', 'Engagement moyen')}<div class="hbars">${byObj.map(([l, n, e]) => `<div class="r"><span>${esc(l)}</span><div class="bar"><i data-w="${Math.min(100, e / maxE * 100)}%"></i></div><span>${e.toFixed(1)} %</span></div>`).join('') || '<p class="muted small">Pas encore de données.</p>'}</div></div>
    <div class="panel glass" data-st>${head('Hashtags', 'Les plus performants')}<div class="hbars">${tags.map(([h, n, e]) => `<div class="r"><span>${esc(h)}</span><div class="bar"><i data-w="${Math.min(100, e / maxE * 100)}%"></i></div><span>${e.toFixed(1)} %</span></div>`).join('') || '<p class="muted small">Pas encore de données.</p>'}</div></div></div>`;
  animateBars(el); stagger(el);
  el.onclick = e => { const o = e.target.closest('[data-open]'); if (o) ctx.open(o.dataset.open); };
}

/* =========================================================
   RESOURCES
   ========================================================= */
export function renderHashtags(el, ctx) {
  const m = ctx.univ; const hs = byKind('hashtag', m), kws = byKind('motcle', m);
  const used = {}; contents(m === 'groupe' ? null : m).forEach(c => (c.data.hashtags || []).forEach(h => used[h.toLowerCase()] = (used[h.toLowerCase()] || 0) + 1));
  const cats = [['marque', 'Marque'], ['niche', 'Niche'], ['large', 'Large']];
  el.innerHTML = `<div class="grid g2"><div class="panel glass" data-st>${head('Banque', 'Hashtags', 'Mélangez une marque, quelques niches et un ou deux larges.', canCreate() ? `<button class="btn sm mag" id="hAdd">${ic('plus')}Ajouter</button>` : '')}
      ${cats.map(([k, l]) => `<span class="label" style="color:var(--muted);display:block;margin:14px 0 8px">${l}</span><div class="tagsel">${hs.filter(h => (h.data.categorie || 'large') === k).map(h => `<button type="button" data-edit="${h.id}">${esc(h.titre)}${used[h.titre.toLowerCase()] ? ` · ${used[h.titre.toLowerCase()]}` : ''}</button>`).join('') || '<span class="small muted">Aucun</span>'}</div>`).join('')}</div>
    <div class="panel glass" data-st>${head('Référencement', 'Mots-clés de la marque', 'L\'analyse vérifie leur présence, surtout en début de texte.', canCreate() ? `<button class="btn sm mag" id="kAdd">${ic('plus')}Ajouter</button>` : '')}
      <div class="tagsel">${kws.map(k => `<button type="button" data-edit="${k.id}">${esc(k.titre)}</button>`).join('') || '<span class="small muted">Aucun mot-clé</span>'}</div></div></div>`;
  stagger(el);
  const form = (it, kind) => itemForm({ label: kind === 'hashtag' ? 'Hashtag' : 'Mot-clé', title: it.id ? 'Modifier' : 'Ajouter', item: it, fields: kind === 'hashtag' ? [['titre', 'Hashtag', 'text'], ['data.categorie', 'Catégorie', 'select', cats]] : [['titre', 'Mot-clé', 'text']], onSave: async o => { if (kind === 'hashtag' && !o.titre.startsWith('#')) o.titre = '#' + o.titre.replace(/\s+/g, ''); await saveItem(o); toast('Enregistré'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); toast('Supprimé'); ctx.refresh(true); } });
  const ha = $('#hAdd', el); if (ha) ha.onclick = () => form({ kind: 'hashtag', marque: m, titre: '', data: { categorie: 'niche' } }, 'hashtag');
  const ka = $('#kAdd', el); if (ka) ka.onclick = () => form({ kind: 'motcle', marque: m, titre: '', data: {} }, 'motcle');
  el.onclick = e => { const b = e.target.closest('[data-edit]'); if (b && canCreate()) { const it = getItem(b.dataset.edit); form(it, it.kind); } };
}
export function renderPersonas(el, ctx) {
  const m = ctx.univ; const ps = byKind('persona', m);
  el.innerHTML = `<div class="panel glass" data-st>${head('Cibles', 'Fiches personas', 'Qui lit nos contenus, ce qui le préoccupe, ce qui le décide.', canCreate() ? `<button class="btn sm mag" id="pAdd">${ic('plus')}Nouvelle fiche</button>` : '')}
    <div class="grid g3">${ps.map(p => `<div class="tile click" data-edit="${p.id}" style="padding:18px;display:flex;flex-direction:column;gap:8px"><span class="chip">${esc(cibleLabel(p.data.cible))}</span><b style="color:var(--head);font-size:15px">${esc(p.titre)}</b><p class="small muted">${esc(p.data.profil || '')}</p>
      ${p.data.attentes ? `<p class="small"><b>Attentes :</b> ${esc(p.data.attentes)}</p>` : ''}${p.data.freins ? `<p class="small"><b>Freins :</b> ${esc(p.data.freins)}</p>` : ''}${p.data.canaux ? `<p class="small"><b>Canaux :</b> ${esc(p.data.canaux)}</p>` : ''}</div>`).join('') || '<div class="empty" style="grid-column:1/-1"><p>Aucune fiche. Décrivez vos cibles pour écrire plus juste.</p></div>'}</div></div>`;
  stagger(el);
  const form = it => itemForm({ label: 'Persona', title: it.id ? it.titre : 'Nouvelle fiche', item: it, fields: [['titre', 'Nom de la fiche', 'text'], ['data.cible', 'Type de cible', 'select', CIBLES.map(c => [c[0], c[1]])], ['data.profil', 'Profil', 'textarea'], ['data.attentes', 'Attentes', 'textarea'], ['data.freins', 'Freins', 'textarea'], ['data.canaux', 'Canaux et moments de lecture', 'text', 'full']], onSave: async o => { await saveItem(o); toast('Fiche enregistrée'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); ctx.refresh(true); } });
  const pa = $('#pAdd', el); if (pa) pa.onclick = () => form({ kind: 'persona', marque: m, titre: '', data: { cible: 'professionnels' } });
  el.onclick = e => { const b = e.target.closest('[data-edit]'); if (b && canCreate()) form(getItem(b.dataset.edit)); };
}
const cibleLabel = k => (CIBLES.find(c => c[0] === k) || [k, k])[1];
export function renderVisuels(el, ctx) {
  const m = ctx.univ; const vs = byKind('visuel').filter(v => v.marque === m || m === 'groupe');
  const soon = d => d && (new Date(d) - new Date()) < 30 * 864e5;
  el.innerHTML = `<div class="panel glass" data-st>${head('Bibliothèque', 'Références visuelles', 'Les fichiers restent sur votre stockage (Drive, SharePoint, serveur). Seuls le lien, les crédits et les droits sont suivis ici.', canCreate() ? `<button class="btn sm mag" id="vAdd">${ic('plus')}Référencer un visuel</button>` : '')}
    ${vs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Visuel</th><th>Marque</th><th>Crédit</th><th>Droits jusqu'au</th><th>Droit à l'image</th><th>Tags</th></tr></thead><tbody>${vs.map(v => `<tr class="click" data-edit="${v.id}"><td><b>${esc(v.titre)}</b></td><td>${brandDot(v.marque)} ${esc(BRANDS[v.marque].court)}</td><td>${esc(v.data.credit || '-')}</td><td>${v.data.droits_fin ? `<span class="chip ${new Date(v.data.droits_fin) < new Date() ? 'err' : soon(v.data.droits_fin) ? 'warn' : 'gray'}">${fmtDate(v.data.droits_fin)}</span>` : '<span class="chip gray">Illimité</span>'}</td><td>${v.data.personnes ? (v.data.autorisation ? '<span class="chip ok">Autorisation signée</span>' : '<span class="chip err">À obtenir</span>') : '<span class="small muted">Sans personne</span>'}</td><td class="small muted">${esc(v.data.tags || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>Aucun visuel référencé.</p></div>'}</div>`;
  stagger(el);
  const form = it => itemForm({ label: 'Visuel', title: it.id ? it.titre : 'Référencer un visuel', item: it, fields: [['titre', 'Nom', 'text'], ['marque', 'Marque', 'select', brandOpts()], ['data.url', 'Lien du fichier', 'url', 'full'], ['data.alt', 'Texte alternatif', 'text', 'full'], ['data.credit', 'Crédit', 'text'], ['data.droits_fin', 'Fin des droits', 'date'], ['data.personnes', 'Des personnes sont identifiables', 'check'], ['data.autorisation', 'Autorisation de droit à l\'image signée', 'check'], ['data.tags', 'Tags', 'text', 'full']], onSave: async o => { await saveItem(o); toast('Visuel référencé', 'image'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); ctx.refresh(true); } });
  const va = $('#vAdd', el); if (va) va.onclick = () => form({ kind: 'visuel', marque: m, titre: '', data: {} });
  el.onclick = e => { const b = e.target.closest('[data-edit]'); if (b && canCreate()) form(getItem(b.dataset.edit)); };
}
/* =========================================================
   PROJECTS : campaigns, events, print, press
   ========================================================= */
export function renderCampagnes(el, ctx) {
  const cs = byKind('campagne').sort((a, b) => new Date(b.date_debut || 0) - new Date(a.date_debut || 0));
  el.innerHTML = `<div class="panel glass" data-st>${head('Campagnes', 'Objectifs, périodes et contenus liés', '', canCreate() ? `<button class="btn sm mag" id="caAdd">${ic('plus')}Nouvelle campagne</button>` : '')}
    <div class="rows">${cs.map(c => { const linked = byKind('contenu').filter(x => x.data.campagne_id === c.id && x.statut !== 'archive'); const pub = linked.filter(x => x.statut === 'publie').length; const spent = byKind('budget').filter(b => b.data.campagne_id === c.id).reduce((a, b) => a + (+b.data.engage || 0), 0);
      return `<div class="tile click" data-edit="${c.id}" style="padding:16px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center"><div style="min-width:0"><b style="color:var(--head)">${esc(c.titre)}</b><div class="small muted">${c.date_debut ? fmtDate(c.date_debut) : ''}${c.date_fin ? ' au ' + fmtDate(c.date_fin) : ''} · ${(c.data.marques || []).map(m => BRANDS[m].court).join(', ') || 'Toutes marques'}</div><p class="small" style="margin-top:6px">${esc(c.data.objectif || '')}</p>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin-top:8px"><div class="bar"><i data-w="${linked.length ? pub / linked.length * 100 : 0}%"></i></div><span class="small muted">${pub}/${linked.length} publiés</span></div></div>
        <div style="text-align:right"><b style="color:var(--head)">${euro(spent)}</b><div class="small muted">sur ${euro(c.data.budget || 0)}</div></div></div>`; }).join('') || '<div class="empty"><p>Aucune campagne.</p></div>'}</div></div>`;
  animateBars(el); stagger(el);
  const form = it => itemForm({ label: 'Campagne', title: it.id ? it.titre : 'Nouvelle campagne', item: it, fields: [['titre', 'Nom', 'text'], ['data.marquesTxt', 'Marques (energies, transport, granules, groupe)', 'text'], ['date_debut', 'Début', 'datetime'], ['date_fin', 'Fin', 'datetime'], ['data.objectif', 'Objectif', 'textarea'], ['data.budget', 'Budget prévu (€)', 'number'], ['data.kpi', 'Indicateur de réussite', 'text'], ['data.bilan', 'Bilan', 'textarea']], onSave: async o => { o.data.marques = (o.data.marquesTxt || '').toLowerCase().split(/[\s,;]+/).map(x => x.replace('é', 'e')).filter(x => BRAND_KEYS.includes(x)); await saveItem(o); toast('Campagne enregistrée', 'flag'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); ctx.refresh(true); } });
  const a = $('#caAdd', el); if (a) a.onclick = () => form({ kind: 'campagne', marque: 'groupe', titre: '', data: { marquesTxt: '' } });
  el.onclick = e => { const b = e.target.closest('[data-edit]'); if (b && canCreate()) { const it = clone(getItem(b.dataset.edit)); it.data.marquesTxt = (it.data.marques || []).join(', '); form(it); } };
}
const RETRO = [[-60, 'Réserver l\'espace et valider le budget'], [-45, 'Commander les supports print'], [-30, 'Annoncer l\'événement sur LinkedIn'], [-14, 'Relance et invitations'], [-7, 'Rappel sur les réseaux'], [-1, 'Préparer le stand et les supports'], [2, 'Publier le bilan et remercier']];
export function renderEvenements(el, ctx) {
  const ev = byKind('evenement').sort((a, b) => new Date(a.date_debut || 0) - new Date(b.date_debut || 0));
  el.innerHTML = `<div class="panel glass" data-st>${head('Événements', 'Salons, portes ouvertes, rencontres', 'Chaque événement génère un rétroplanning que vous cochez au fil de l\'eau.', canCreate() ? `<button class="btn sm mag" id="evAdd">${ic('plus')}Nouvel événement</button>` : '')}
    <div class="rows">${ev.map(e => { const t = e.data.taches || []; const done = t.filter(x => x.done).length; return `<div class="tile" style="padding:16px;display:flex;flex-direction:column;gap:10px;border-left:3px solid ${bc(e.marque)}">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b style="color:var(--head)">${esc(e.titre)}</b><div class="small muted">${fmtDate(e.date_debut)}${e.date_fin && !sameD(e.date_debut, e.date_fin) ? ' au ' + fmtDate(e.date_fin) : ''} · ${esc(e.data.lieu || '')} · budget ${euro(e.data.budget || 0)}</div></div><div class="btn-row"><span class="chip">${done}/${t.length} étapes</span>${canCreate() ? `<button class="btn ghost sm" data-edit="${e.id}">Modifier</button>` : ''}</div></div>
      <div class="rows">${t.map((x, i) => `<label class="check" style="font-size:13px"><input type="checkbox" data-task="${e.id}:${i}" ${x.done ? 'checked' : ''} ${canCreate() ? '' : 'disabled'}><span>${esc(x.t)} <span class="muted">· ${fmtDate(x.date)}</span>${!x.done && new Date(x.date) < new Date() ? ' <span class="chip err">en retard</span>' : ''}</span></label>`).join('')}</div></div>`; }).join('') || '<div class="empty"><p>Aucun événement prévu.</p></div>'}</div></div>`;
  stagger(el);
  const form = it => itemForm({ label: 'Événement', title: it.id ? it.titre : 'Nouvel événement', item: it, fields: [['titre', 'Nom', 'text'], ['marque', 'Marque', 'select', brandOpts()], ['date_debut', 'Début', 'datetime'], ['date_fin', 'Fin', 'datetime'], ['data.lieu', 'Lieu', 'text'], ['data.budget', 'Budget (€)', 'number'], ['data.notes', 'Notes', 'textarea']], onSave: async o => { if (!o.date_debut) { toast('Indiquez la date de début', 'alert'); throw 0; } if (!o.data.taches || !o.data.taches.length) o.data.taches = RETRO.map(([d, t]) => ({ t, date: isoDay(addDays(new Date(o.date_debut), d)), done: false })); await saveItem(o); toast('Événement enregistré', 'flag'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); ctx.refresh(true); } });
  const a = $('#evAdd', el); if (a) a.onclick = () => form({ kind: 'evenement', marque: 'groupe', titre: '', data: {} });
  el.onclick = e => { const b = e.target.closest('[data-edit]'); if (b) form(clone(getItem(b.dataset.edit))); };
  el.onchange = async e => { const t = e.target.closest('[data-task]'); if (!t) return; const [id, i] = t.dataset.task.split(':'); const ev2 = clone(getItem(id)); ev2.data.taches[+i].done = t.checked; await saveItem(ev2); if (ev2.data.taches.every(x => x.done)) toast('Rétroplanning terminé', 'trophy'); };
}
const sameD = (a, b) => isoDay(new Date(a)) === isoDay(new Date(b));
const PRINT_STEPS = [['maquette', 'Maquette'], ['bat', 'BAT envoyé'], ['bat_ok', 'BAT validé'], ['impression', 'En impression'], ['livre', 'Livré']];
export function renderPrint(el, ctx) {
  const ps = byKind('print').sort((a, b) => new Date(a.date_debut || 8e15) - new Date(b.date_debut || 8e15));
  const focus = ctx.params && ctx.params.id;
  el.innerHTML = `<div class="panel glass" data-st>${head('Print', 'Suivi de fabrication', 'De la maquette à la livraison, avec contrôle des fichiers avant envoi à l\'imprimeur.', canCreate() ? `<button class="btn sm mag" id="prAdd">${ic('plus')}Nouveau projet print</button>` : '')}
    <div class="rows">${ps.map(p => { const si = PRINT_STEPS.findIndex(s => s[0] === p.statut); const ck = p.data.checks || {}; return `<div class="tile" style="padding:16px;display:flex;flex-direction:column;gap:12px;border-left:3px solid ${bc(p.marque)};${p.id === focus ? 'box-shadow:0 0 0 2px var(--link)' : ''}">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b style="color:var(--head)">${esc(p.titre)}</b><div class="small muted">${esc(p.data.format || '')} · ${num(p.data.quantite)} ex. · ${esc(p.data.imprimeur || 'imprimeur à choisir')} · livraison ${p.date_debut ? fmtDate(p.date_debut) : 'à fixer'}</div></div>
      <div class="btn-row"><span class="small muted">Devis ${euro(p.data.devis)} · coût ${euro(p.data.cout)}</span>${canCreate() ? `<button class="btn ghost sm" data-edit="${p.id}">Modifier</button>` : ''}</div></div>
      <div class="tagsel">${PRINT_STEPS.map(([k, l], i) => `<button type="button" data-step="${p.id}:${k}" class="${i <= si ? 'on' : ''}" ${canCreate() ? '' : 'disabled'}>${i + 1}. ${l}</button>`).join('')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px">${[['fonds', 'Fonds perdus 3 mm'], ['cmjn', 'Couleurs en CMJN'], ['resolution', 'Images à 300 dpi'], ['polices', 'Polices vectorisées'], ['relu', 'Relu et validé']].map(([k, l]) => `<label class="check" style="font-size:12.5px"><input type="checkbox" data-chk="${p.id}:${k}" ${ck[k] ? 'checked' : ''} ${canCreate() ? '' : 'disabled'}>${l}</label>`).join('')}</div></div>`; }).join('') || '<div class="empty"><p>Aucun projet print.</p></div>'}</div></div>`;
  stagger(el);
  const form = it => itemForm({ label: 'Print', title: it.id ? it.titre : 'Nouveau projet print', item: it, fields: [['titre', 'Nom', 'text'], ['marque', 'Marque', 'select', brandOpts()], ['data.format', 'Format', 'text'], ['data.quantite', 'Quantité', 'number'], ['data.imprimeur', 'Imprimeur', 'text'], ['date_debut', 'Livraison prévue', 'datetime'], ['data.devis', 'Devis (€)', 'number'], ['data.cout', 'Coût final (€)', 'number']], onSave: async o => { await saveItem(o); toast('Projet print enregistré', 'print'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); ctx.refresh(true); } });
  const a = $('#prAdd', el); if (a) a.onclick = () => form({ kind: 'print', marque: 'groupe', titre: '', statut: 'maquette', data: { checks: {} } });
  el.onclick = async e => {
    const b = e.target.closest('[data-edit]'); if (b) { form(clone(getItem(b.dataset.edit))); return; }
    const s = e.target.closest('[data-step]'); if (s && !s.disabled) { const [id, k] = s.dataset.step.split(':'); const p = clone(getItem(id)); const ck = p.data.checks || {}; if (['bat', 'bat_ok', 'impression', 'livre'].includes(k) && !(ck.fonds && ck.cmjn && ck.resolution && ck.polices)) { toast('Terminez le contrôle des fichiers avant l\'envoi du BAT', 'alert'); return; } p.statut = k; await saveItem(p); toast(`Étape : ${PRINT_STEPS.find(x => x[0] === k)[1]}`, 'print'); ctx.refresh(true); }
  };
  el.onchange = async e => { const c = e.target.closest('[data-chk]'); if (!c) return; const [id, k] = c.dataset.chk.split(':'); const p = clone(getItem(id)); p.data.checks = { ...(p.data.checks || {}), [k]: c.checked }; await saveItem(p); };
}
export function renderPresse(el, ctx) {
  const js = byKind('journaliste'), rs = byKind('retombee').sort((a, b) => new Date(b.date_debut || 0) - new Date(a.date_debut || 0));
  const cps = byKind('contenu').filter(c => c.data.type === 'communique' && c.statut !== 'archive');
  el.innerHTML = `<div class="grid g3" data-st><div class="tile kpi"><span>Journalistes</span><b>${js.length}</b><span>dans le fichier</span></div><div class="tile kpi"><span>Communiqués</span><b>${cps.length}</b><span>${cps.filter(c => c.statut === 'publie').length} diffusés</span></div><div class="tile kpi"><span>Retombées</span><b>${rs.length}</b><span>${rs.filter(r => r.data.tonalite === 'positive').length} positives</span></div></div>
    <div class="panel glass" data-st>${head('Fichier presse', 'Journalistes', 'Contacts professionnels traités selon le RGPD : finalité presse, suppression sur demande.', canCreate() ? `<div class="btn-row"><button class="btn ghost sm mag" id="jCsv">${ic('down')}Exporter</button><button class="btn sm mag" id="jAdd">${ic('plus')}Ajouter</button></div>` : '')}
      ${js.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nom</th><th>Média</th><th>Thématiques</th><th>E-mail</th><th>Téléphone</th><th>Dernier envoi</th></tr></thead><tbody>${js.map(j => `<tr class="click" data-edit="${j.id}"><td><b>${esc(j.titre)}</b></td><td>${esc(j.data.media || '')}</td><td class="small">${esc(j.data.thematiques || '')}</td><td class="small">${esc(j.data.email || '')}</td><td class="small">${esc(j.data.tel || '')}</td><td class="small">${j.data.dernier_envoi ? fmtDate(j.data.dernier_envoi) : '-'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>Aucun journaliste enregistré.</p></div>'}</div>
    <div class="grid g2"><div class="panel glass" data-st>${head('Communiqués', 'Diffusion', 'Créez un communiqué depuis Créer (type « Communiqué de presse »), puis notez son envoi.')}
      <div class="rows">${cps.map(c => `<div class="tile rowi">${brandDot(c.marque)}<div class="t"><b>${esc(c.titre)}</b><span>${esc(statutLabel(c.statut))} · ${(c.data.envois || []).length} envoi${(c.data.envois || []).length > 1 ? 's' : ''}</span></div><span class="a"><button class="btn ghost sm" data-send="${c.id}">Noter un envoi</button><button class="icon-btn sm" data-open="${c.id}" aria-label="Ouvrir">${ic('right')}</button></span></div>`).join('') || '<div class="empty"><p>Aucun communiqué.</p></div>'}</div></div>
    <div class="panel glass" data-st>${head('Retombées', 'Articles et mentions', '', canCreate() ? `<button class="btn sm mag" id="rAdd">${ic('plus')}Ajouter</button>` : '')}
      <div class="rows">${rs.map(r => `<div class="tile rowi click" data-edit="${r.id}"><span class="chip ${r.data.tonalite === 'positive' ? 'ok' : r.data.tonalite === 'negative' ? 'err' : 'gray'}">${esc(r.data.tonalite || 'neutre')}</span><div class="t"><b>${esc(r.titre)}</b><span>${esc(r.data.media || '')} · ${r.date_debut ? fmtDate(r.date_debut) : ''}</span></div><span class="a">${r.data.lien ? `<a class="icon-btn sm" href="${esc(r.data.lien)}" target="_blank" rel="noopener" aria-label="Ouvrir l'article" onclick="event.stopPropagation()">${ic('link')}</a>` : ''}</span></div>`).join('') || '<div class="empty"><p>Aucune retombée enregistrée.</p></div>'}</div></div></div>`;
  stagger(el);
  const jForm = it => itemForm({ label: 'Journaliste', title: it.id ? it.titre : 'Nouveau contact', item: it, fields: [['titre', 'Nom', 'text'], ['data.media', 'Média', 'text'], ['data.email', 'E-mail', 'email'], ['data.tel', 'Téléphone', 'tel'], ['data.thematiques', 'Thématiques', 'text', 'full'], ['data.notes', 'Notes', 'textarea']], onSave: async o => { await saveItem(o); toast('Contact enregistré'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); ctx.refresh(true); } });
  const rForm = it => itemForm({ label: 'Retombée', title: it.id ? it.titre : 'Nouvelle retombée', item: it, fields: [['titre', 'Titre de l\'article', 'text'], ['marque', 'Marque', 'select', brandOpts()], ['data.media', 'Média', 'text'], ['date_debut', 'Date', 'datetime'], ['data.lien', 'Lien', 'url', 'full'], ['data.tonalite', 'Tonalité', 'select', [['positive', 'Positive'], ['neutre', 'Neutre'], ['negative', 'Négative']]]], onSave: async o => { await saveItem(o); toast('Retombée enregistrée', 'mega'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); ctx.refresh(true); } });
  const ja = $('#jAdd', el); if (ja) ja.onclick = () => jForm({ kind: 'journaliste', marque: 'groupe', titre: '', data: {} });
  const ra = $('#rAdd', el); if (ra) ra.onclick = () => rForm({ kind: 'retombee', marque: 'groupe', titre: '', data: { tonalite: 'positive' } });
  const jc = $('#jCsv', el); if (jc) jc.onclick = () => download('fichier_presse.csv', ['Nom;Média;E-mail;Téléphone;Thématiques', ...js.map(j => [j.titre, j.data.media, j.data.email, j.data.tel, j.data.thematiques].map(x => `"${String(x || '').replace(/"/g, '""')}"`).join(';'))].join('\n'));
  el.onclick = async e => {
    const o = e.target.closest('[data-open]'); if (o) { ctx.open(o.dataset.open); return; }
    const s = e.target.closest('[data-send]'); if (s) { sendLog(getItem(s.dataset.send), js, ctx); return; }
    const b = e.target.closest('[data-edit]'); if (b && canCreate()) { const it = clone(getItem(b.dataset.edit)); (it.kind === 'journaliste' ? jForm : rForm)(it); }
  };
}
function sendLog(c, js, ctx) {
  let sel = [];
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Communiqué</span><h2 style="margin-top:6px">Noter un envoi</h2><p>${esc(c.titre)}</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="tagsel" id="sj">${js.map(j => `<button type="button" data-v="${j.id}">${esc(j.titre)} · ${esc(j.data.media || '')}</button>`).join('') || '<p class="muted">Ajoutez d\'abord des journalistes.</p>'}</div>
    <div class="modal-foot"><button class="btn ghost" data-close>Annuler</button><button class="btn mag" id="sGo">Enregistrer l'envoi</button></div>`);
  $('#sj', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; sel = sel.includes(b.dataset.v) ? sel.filter(x => x !== b.dataset.v) : [...sel, b.dataset.v]; b.classList.toggle('on'); };
  $('#sGo', el).onclick = async () => { if (!sel.length) { toast('Sélectionnez au moins un destinataire', 'alert'); return; } const now = new Date().toISOString(); const cc = clone(c); cc.data.envois = [...(cc.data.envois || []), ...sel.map(id => ({ journaliste: id, date: now }))]; await saveItem(cc); for (const id of sel) { const j = clone(getItem(id)); j.data.dernier_envoi = now; await saveItem(j); } await addJournal(c.id, 'action', `Envoyé à ${sel.length} journaliste${sel.length > 1 ? 's' : ''}`); close(); toast('Envoi enregistré', 'send'); ctx.refresh(true); };
}

/* =========================================================
   STEERING : stats, budget, reports, settings
   ========================================================= */
export function renderStats(el, ctx) {
  const pub = byKind('contenu').filter(c => c.statut === 'publie');
  const withS = pub.filter(c => (c.data.stats || {}).vues);
  const sum = (arr, k) => arr.reduce((a, c) => a + ((c.data.stats || {})[k] || 0), 0);
  const per = BRAND_KEYS.map(b => { const x = withS.filter(c => c.marque === b); return [b, x.length, sum(x, 'vues'), sum(x, 'interactions'), sum(x, 'clics'), sum(x, 'abonnes')]; });
  const perN = RESEAUX.map(([n, l]) => { const x = withS.filter(c => (c.data.reseaux || [])[0] === n); return [l, x.length, sum(x, 'vues'), sum(x, 'interactions')]; });
  const top = withS.slice().sort((a, b) => (b.data.stats.interactions / b.data.stats.vues) - (a.data.stats.interactions / a.data.stats.vues)).slice(0, 8);
  el.innerHTML = `<div class="grid g4" data-st>${[['Publiés', pub.length], ['Impressions', num(sum(withS, 'vues'))], ['Interactions', num(sum(withS, 'interactions'))], ['Engagement moyen', pct(sum(withS, 'interactions') / Math.max(1, sum(withS, 'vues')) * 100)]].map(([l, v]) => `<div class="tile kpi"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
    <div class="panel glass" data-st>${head('Par marque', 'Résultats cumulés', 'Chiffres saisis dans chaque contenu publié, onglet Circuit.', `<button class="btn ghost sm mag" id="stCsv">${ic('down')}Exporter</button>`)}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Marque</th><th class="num">Contenus mesurés</th><th class="num">Impressions</th><th class="num">Interactions</th><th class="num">Clics</th><th class="num">Abonnés gagnés</th><th class="num">Engagement</th></tr></thead><tbody>${per.map(([b, n, v, i, c, a]) => `<tr><td>${brandDot(b)} ${esc(BRANDS[b].nom)}</td><td class="num">${n}</td><td class="num">${num(v)}</td><td class="num">${num(i)}</td><td class="num">${num(c)}</td><td class="num">${num(a)}</td><td class="num">${pct(i / Math.max(1, v) * 100)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="grid g2"><div class="panel glass" data-st>${head('Par réseau', 'Comparatif')}<div class="hbars">${perN.map(([l, n, v, i]) => `<div class="r"><span>${l}</span><div class="bar"><i data-w="${Math.min(100, i / Math.max(1, v) * 100 * 10)}%"></i></div><span>${pct(i / Math.max(1, v) * 100)}</span></div>`).join('')}</div></div>
    <div class="panel glass" data-st>${head('Classement', 'Meilleurs contenus')}<div class="rows">${top.map(c => `<div class="tile rowi click" data-open="${c.id}">${brandDot(c.marque)}<div class="t"><b>${esc(c.titre)}</b><span>${num(c.data.stats.vues)} impressions · score ${c.data.score ?? '-'}</span></div><span class="a"><span class="chip ok">${pct(c.data.stats.interactions / c.data.stats.vues * 100)}</span></span></div>`).join('') || '<div class="empty"><p>Aucune statistique saisie.</p></div>'}</div></div></div>`;
  animateBars(el); stagger(el);
  $('#stCsv', el).onclick = () => download('statistiques_contenus.csv', ['Titre;Marque;Réseau;Date;Score;Impressions;Interactions;Clics;Abonnés', ...withS.map(c => [c.titre, BRANDS[c.marque].nom, (c.data.reseaux || []).join('+'), fmtDate(c.date_debut), c.data.score, c.data.stats.vues, c.data.stats.interactions, c.data.stats.clics, c.data.stats.abonnes].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n'));
  el.onclick = e => { const o = e.target.closest('[data-open]'); if (o) ctx.open(o.dataset.open); };
}
const POSTES = [['print', 'Print'], ['publicite', 'Publicité en ligne'], ['evenement', 'Événement'], ['photo', 'Photo et vidéo'], ['goodies', 'Objets promotionnels'], ['prestataire', 'Prestataire, agence'], ['autre', 'Autre']];
export function renderBudget(el, ctx) {
  const ls = byKind('budget'); const year = new Date().getFullYear();
  const tot = (arr, k) => arr.reduce((a, b) => a + (+b.data[k] || 0), 0);
  const prev = tot(ls, 'prevu'), eng = tot(ls, 'engage');
  el.innerHTML = `<div class="grid g3" data-st><div class="tile kpi"><span>Budget prévu ${year}</span><b>${euro(prev)}</b></div><div class="tile kpi"><span>Engagé</span><b>${euro(eng)}</b><span>${prev ? Math.round(eng / prev * 100) : 0} % du prévu</span></div><div class="tile kpi"><span>Restant</span><b style="color:${prev - eng < 0 ? 'var(--err)' : 'var(--head)'}">${euro(prev - eng)}</b></div></div>
    <div class="grid g2"><div class="panel glass" data-st>${head('Par marque', 'Consommation')}<div class="hbars">${BRAND_KEYS.map(b => { const x = ls.filter(l => l.marque === b); const p = tot(x, 'prevu'), e = tot(x, 'engage'); return `<div class="r"><span>${esc(BRANDS[b].court)}</span><div class="bar"><i data-w="${p ? Math.min(100, e / p * 100) : 0}%" style="background:${bc(b)}"></i></div><span>${p ? Math.round(e / p * 100) : 0} %</span></div>`; }).join('')}</div></div>
    <div class="panel glass" data-st>${head('Par poste', 'Répartition des dépenses')}<div class="hbars">${POSTES.map(([k, l]) => { const x = ls.filter(z => z.data.poste === k); const e = tot(x, 'engage'); return `<div class="r"><span>${l}</span><div class="bar"><i data-w="${eng ? e / eng * 100 : 0}%"></i></div><span>${euro(e)}</span></div>`; }).join('')}</div></div></div>
    <div class="panel glass" data-st>${head('Lignes budgétaires', 'Détail', '', canCreate() ? `<button class="btn sm mag" id="bAdd">${ic('plus')}Nouvelle ligne</button>` : '')}
      ${ls.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ligne</th><th>Marque</th><th>Poste</th><th>Campagne</th><th class="num">Prévu</th><th class="num">Engagé</th></tr></thead><tbody>${ls.map(l => `<tr class="click" data-edit="${l.id}"><td><b>${esc(l.titre)}</b></td><td>${brandDot(l.marque)} ${esc(BRANDS[l.marque].court)}</td><td>${esc((POSTES.find(p => p[0] === l.data.poste) || ['', '-'])[1])}</td><td class="small">${esc((getItem(l.data.campagne_id) || {}).titre || '-')}</td><td class="num">${euro(l.data.prevu)}</td><td class="num">${euro(l.data.engage)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>Aucune ligne budgétaire.</p></div>'}</div>`;
  animateBars(el); stagger(el);
  const form = it => itemForm({ label: 'Budget', title: it.id ? it.titre : 'Nouvelle ligne', item: it, fields: [['titre', 'Libellé', 'text'], ['marque', 'Marque', 'select', brandOpts()], ['data.poste', 'Poste', 'select', POSTES], ['data.campagne_id', 'Campagne', 'select', [['', 'Aucune'], ...byKind('campagne').map(c => [c.id, c.titre])]], ['data.prevu', 'Prévu (€)', 'number'], ['data.engage', 'Engagé (€)', 'number'], ['data.fournisseur', 'Fournisseur', 'text', 'full']], onSave: async o => { await saveItem(o); toast('Ligne enregistrée', 'euro'); ctx.refresh(true); }, onDelete: async o => { await deleteItem(o.id); ctx.refresh(true); } });
  const a = $('#bAdd', el); if (a) a.onclick = () => form({ kind: 'budget', marque: 'groupe', titre: '', data: { poste: 'print', prevu: 0, engage: 0 } });
  el.onclick = e => { const b = e.target.closest('[data-edit]'); if (b && canCreate()) form(clone(getItem(b.dataset.edit))); };
}
const R = { m: new Date().getMonth(), y: new Date().getFullYear(), u: 'groupe' };
export function renderRapports(el, ctx) {
  const from = new Date(R.y, R.m, 1), to = new Date(R.y, R.m + 1, 1);
  const inM = c => c.date_debut && new Date(c.date_debut) >= from && new Date(c.date_debut) < to;
  const brands = R.u === 'groupe' ? BRAND_KEYS : [R.u];
  const cs = byKind('contenu').filter(c => brands.includes(c.marque) && inM(c) && c.statut !== 'archive');
  const pub = cs.filter(c => c.statut === 'publie'); const withS = pub.filter(c => (c.data.stats || {}).vues);
  const sum = k => withS.reduce((a, c) => a + (c.data.stats[k] || 0), 0);
  const avg = cs.length ? Math.round(cs.reduce((a, c) => a + (c.data.score || 0), 0) / cs.length) : 0;
  const ev = byKind('evenement').filter(e => brands.includes(e.marque) && inM(e)); const rt = byKind('retombee').filter(r => inM(r));
  const label = from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  el.innerHTML = `<div class="panel glass no-print" data-st>${head('Rapport mensuel', 'Générer et exporter', 'Le rapport s\'exporte en PDF via la boîte d\'impression du navigateur (choisir « Enregistrer au format PDF »).', `<div class="btn-row"><select class="input" id="rpU" style="min-height:38px;width:auto">${[['groupe', 'Groupe, toutes marques'], ...SUB_BRANDS.map(b => [b, BRANDS[b].nom])].map(([k, l]) => `<option value="${k}" ${R.u === k ? 'selected' : ''}>${l}</option>`).join('')}</select><input class="input" type="month" id="rpM" value="${R.y}-${String(R.m + 1).padStart(2, '0')}" style="min-height:38px;width:auto"><button class="btn sm mag" id="rpPdf">${ic('down')}Exporter en PDF</button></div>`)}</div>
    <div class="page-head glass" data-st><div class="txt"><span class="label">Rapport de communication</span><h1 style="margin-top:8px">${esc(R.u === 'groupe' ? 'Hympyr, toutes marques' : BRANDS[R.u].nom)}</h1><p style="text-transform:capitalize">${esc(label)}</p></div></div>
    <div class="grid g4" data-st>${[['Contenus du mois', cs.length], ['Publiés', pub.length], ['Score moyen', avg + '/100'], ['Engagement', pct(sum('interactions') / Math.max(1, sum('vues')) * 100)]].map(([l, v]) => `<div class="tile kpi"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
    <div class="grid g2"><div class="panel glass" data-st>${head('Audience', 'Résultats')}<div class="hbars">${[['Impressions', sum('vues')], ['Interactions', sum('interactions')], ['Clics', sum('clics')], ['Abonnés gagnés', sum('abonnes')]].map(([l, v]) => `<div class="r"><span>${l}</span><div class="bar"><i data-w="${Math.min(100, v / Math.max(1, sum('vues')) * 100 * (l === 'Impressions' ? 1 : 10))}%"></i></div><span>${num(v)}</span></div>`).join('')}</div></div>
    <div class="panel glass" data-st>${head('Activité', 'Faits marquants')}<ul class="checks"><li><span class="tk">${ic('check')}</span><span>${pub.length} contenu${pub.length > 1 ? 's' : ''} publié${pub.length > 1 ? 's' : ''} sur ${cs.length} prévu${cs.length > 1 ? 's' : ''}.</span></li><li><span class="tk">${ic('check')}</span><span>${ev.length} événement${ev.length > 1 ? 's' : ''} et ${rt.length} retombée${rt.length > 1 ? 's' : ''} presse.</span></li>${brands.length > 1 ? BRAND_KEYS.map(b => `<li><span class="tk">${ic('check')}</span><span>${esc(BRANDS[b].nom)} : ${cs.filter(c => c.marque === b).length} contenu${cs.filter(c => c.marque === b).length > 1 ? 's' : ''}.</span></li>`).join('') : ''}</ul></div></div>
    <div class="panel glass" data-st>${head('Détail', 'Contenus publiés')}${pub.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Contenu</th><th>Marque</th><th class="num">Score</th><th class="num">Impressions</th><th class="num">Engagement</th></tr></thead><tbody>${pub.map(c => `<tr><td>${fmtDate(c.date_debut)}</td><td>${esc(c.titre)}</td><td>${esc(BRANDS[c.marque].court)}</td><td class="num">${c.data.score ?? '-'}</td><td class="num">${num((c.data.stats || {}).vues)}</td><td class="num">${(c.data.stats || {}).vues ? pct(c.data.stats.interactions / c.data.stats.vues * 100) : '-'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>Aucun contenu publié sur la période.</p></div>'}</div>`;
  animateBars(el); stagger(el);
  $('#rpU', el).onchange = e => { R.u = e.target.value; ctx.refresh(true); };
  $('#rpM', el).onchange = e => { const [y, m] = e.target.value.split('-'); R.y = +y; R.m = +m - 1; ctx.refresh(true); };
  $('#rpPdf', el).onclick = () => window.print();
}
export function renderReglages(el, ctx) {
  const s = settings(); const P = poids(); const admin = S.role === 'admin'; const can = canCreate() || admin;
  el.innerHTML = `<div class="panel glass" data-st>${head('Rythme', 'Objectifs hebdomadaires de publication', 'Utilisés par les jauges du tableau de bord et la gamification.')}
      <div class="tbl-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>Marque</th><th class="num">LinkedIn par semaine</th><th class="num">Instagram par semaine</th></tr></thead><tbody>${BRAND_KEYS.map(b => `<tr><td>${brandDot(b)} ${esc(BRANDS[b].nom)}</td>${RESEAUX.map(([n]) => `<td class="num"><input class="input" type="number" min="0" max="14" data-ry="${b}:${n}" value="${(s.rythme[b] || {})[n] || 0}" style="min-height:36px;width:90px;text-align:right" ${can ? '' : 'disabled'}></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
    <div class="panel glass" data-st>${head('Analyse', 'Niveaux et seuils des règles', 'Les règles restent fixes ; seuls leurs niveaux d\'exigence s\'ajustent.')}
      <div class="grid-f">
        <label class="field full"><span>Sévérité globale : <b id="sevV">${s.severite}</b></span><input type="range" min="0.5" max="1.5" step="0.1" data-s="severite" value="${s.severite}" style="accent-color:var(--primary)" ${can ? '' : 'disabled'}></label>
        ${[['phraseMax', 'Longueur maximale d\'une phrase (mots)'], ['accrocheMax', 'Longueur maximale de l\'accroche (mots)'], ['paraMax', 'Phrases maximum par paragraphe'], ['lisibiliteCible', 'Lisibilité cible (sur 100)'], ['exclamMax', 'Points d\'exclamation maximum']].map(([k, l]) => `<label class="field"><span>${l}</span><input class="input" type="number" data-s="seuils.${k}" value="${s.seuils[k]}" ${can ? '' : 'disabled'}></label>`).join('')}
        ${RESEAUX.map(([n, l]) => [['min', 'longueur minimale'], ['max', 'longueur maximale'], ['coupe', 'coupure « voir plus »'], ['hashMin', 'hashtags minimum'], ['hashMax', 'hashtags maximum']].map(([k, ll]) => `<label class="field"><span>${l} : ${ll}</span><input class="input" type="number" data-s="seuils.${n}.${k}" value="${s.seuils[n][k]}" ${can ? '' : 'disabled'}></label>`).join('')).join('')}
        <label class="field"><span>Équilibre : part minimale d'une marque (%)</span><input class="input" type="number" data-s="equilibre.min" value="${s.equilibre.min}" ${can ? '' : 'disabled'}></label>
        <label class="field"><span>Équilibre : part maximale d'une marque (%)</span><input class="input" type="number" data-s="equilibre.max" value="${s.equilibre.max}" ${can ? '' : 'disabled'}></label>
      </div></div>
    <div class="panel glass" data-st>${head('Pondérations', 'Importance de chaque critère selon l\'objectif', 'De 0 (ignoré) à 3 (déterminant).')}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Objectif</th>${CRITERES.map(([, l]) => `<th class="num" style="font-size:10px">${l}</th>`).join('')}</tr></thead><tbody>${OBJECTIFS.map(([o, ol]) => `<tr><td><b>${ol}</b></td>${CRITERES.map(([k]) => `<td class="num"><select class="input" data-w="${o}:${k}" style="min-height:32px;width:58px;padding:0 22px 0 10px;background-position:right 8px center" ${can ? '' : 'disabled'}>${[0, 1, 2, 3].map(v => `<option ${P[o][k] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${can ? `<div class="btn-row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost sm" id="rgReset">Revenir aux valeurs d'origine</button><button class="btn mag" id="rgSave">Enregistrer les réglages</button></div>` : ''}</div>
    <div class="panel glass" data-st>${head('Équipe', 'Membres et rôles', admin ? 'Le rôle « responsable » crée et planifie, « direction » valide, « admin » fait tout.' : 'Seul un administrateur peut modifier les rôles.')}
      <div class="rows">${S.members.map(m => `<div class="tile rowi"><span class="chip ${m.role === 'direction' ? 'warn' : m.role === 'admin' ? 'ok' : 'gray'}">${esc(m.role)}</span><div class="t"><b>${esc(m.nom || m.email)}</b><span>${esc(m.email)}${m.actif ? '' : ' · inactif'}</span></div></div>`).join('')}</div></div>`;
  stagger(el);
  const sv = $('[data-s="severite"]', el); if (sv) sv.oninput = () => $('#sevV', el).textContent = sv.value;
  const reset = $('#rgReset', el); if (reset) reset.onclick = async () => { if (await confirmBox('Revenir aux valeurs d\'origine ?', 'Rythmes, seuils et pondérations seront réinitialisés.', { ok: 'Réinitialiser' })) { await saveSettings(clone(DEFAULT_SETTINGS)); toast('Réglages réinitialisés'); ctx.refresh(true); } };
  const save = $('#rgSave', el); if (save) save.onclick = async () => {
    const o = clone(settings());
    $$('[data-ry]', el).forEach(i => { const [b, n] = i.dataset.ry.split(':'); o.rythme[b] = o.rythme[b] || {}; o.rythme[b][n] = Math.max(0, +i.value || 0); });
    $$('[data-s]', el).forEach(i => { const path = i.dataset.s.split('.'); let t = o; for (let k = 0; k < path.length - 1; k++) t = t[path[k]]; t[path[path.length - 1]] = +i.value; });
    o.poids = {}; $$('[data-w]', el).forEach(i => { const [ob, k] = i.dataset.w.split(':'); o.poids[ob] = o.poids[ob] || {}; o.poids[ob][k] = +i.value; });
    await saveSettings(o); toast('Réglages enregistrés', 'gear');
  };
}
