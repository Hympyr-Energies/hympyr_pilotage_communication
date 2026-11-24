/* =========================================================
   APP : auth, routing, navigation, notifications, search, ticket
   ========================================================= */
import {
  sb, $, $$, esc, root, EASE, RM, store, S, loadAll, byKind, getItem, contents, saveItem, addJournal, toast, modal, seg, segSet, setupInd, setupGlide, place, replaceInd,
  ic, animOut, stagger, setTheme, syncThemeLabel, logoHTML, BRANDS, BRAND_KEYS, statutLabel, fmtDT, fmtDate, isDirection, canCreate, brandDot, onChange
} from './core.js?v=7';
import { renderEditor } from './editor.js?v=7';
import { renderModeles } from './templates.js?v=7';
import { renderDashboard, renderCalendar, renderBoard, renderValidation, renderDemandes, renderInterne, demandFields, readDemand } from './views-main.js?v=7';
import { renderAnalyser, renderComparer, renderPerformances, renderHashtags, renderPersonas, renderVisuels, renderCampagnes, renderEvenements, renderPrint, renderPresse, renderStats, renderBudget, renderRapports, renderReglages } from './views-more.js?v=7';

const NAV = {
  groupe: [
    { k: 'accueil', l: 'Accueil', i: 'home', t: 'Tableau de bord du groupe', d: 'Activité de la semaine, validations, équilibre entre marques et objectifs.' },
    { k: 'calendrier', l: 'Calendrier', i: 'cal', t: 'Calendrier global', d: 'Tous les contenus planifiés, une couleur par marque. Glissez pour replanifier.' },
    { k: 'production', l: 'Production', i: 'board', main: true, t: 'Production', d: 'Les contenus par étape, les validations, les demandes, la communication interne et les modèles.', subs: [['tableau', 'Tableau'], ['validation', 'Validation'], ['demandes', 'Demandes'], ['interne', 'Interne'], ['modeles', 'Modèles']] },
    { k: 'projets', l: 'Projets', i: 'folder', t: 'Projets', d: 'Campagnes, événements, fabrication print et relations presse.', subs: [['campagnes', 'Campagnes'], ['evenements', 'Événements'], ['print', 'Print'], ['presse', 'Presse']] },
    { k: 'pilotage', l: 'Pilotage', i: 'chart', t: 'Pilotage', d: 'Statistiques, budget, rapports mensuels et réglages de l\'outil.', subs: [['stats', 'Statistiques'], ['budget', 'Budget'], ['rapports', 'Rapports'], ['reglages', 'Réglages']] }
  ],
  marque: [
    { k: 'accueil', l: 'Accueil', i: 'home', t: 'Tableau de bord', d: 'Objectifs de la semaine, contenus à venir, idées et contenus à recycler.' },
    { k: 'calendrier', l: 'Calendrier', i: 'cal', t: 'Calendrier éditorial', d: 'Les contenus de la marque. Glissez pour replanifier.' },
    { k: 'creer', l: 'Créer', i: 'pen', main: true, t: 'Créer un contenu', d: 'Type, cible, objectif, texte, hashtags, visuels : l\'analyse se met à jour à chaque mot.' },
    { k: 'analyse', l: 'Analyse', i: 'radar', t: 'Analyse des contenus', d: 'Score sur douze critères, recommandations selon l\'objectif, comparaison et performances réelles.', subs: [['analyser', 'Analyser'], ['comparer', 'Comparer'], ['performances', 'Performances']] },
    { k: 'ressources', l: 'Ressources', i: 'layers', t: 'Ressources de la marque', d: 'Hashtags, mots-clés, cibles, visuels et modèles.', subs: [['hashtags', 'Hashtags et mots-clés'], ['personas', 'Cibles'], ['visuels', 'Visuels'], ['modeles', 'Modèles']] }
  ]
};
const VIEWS = {
  'accueil': renderDashboard, 'calendrier': renderCalendar, 'creer': renderEditor,
  'production.tableau': renderBoard, 'production.validation': renderValidation, 'production.demandes': renderDemandes, 'production.interne': renderInterne, 'production.modeles': renderModeles,
  'projets.campagnes': renderCampagnes, 'projets.evenements': renderEvenements, 'projets.print': renderPrint, 'projets.presse': renderPresse,
  'pilotage.stats': renderStats, 'pilotage.budget': renderBudget, 'pilotage.rapports': renderRapports, 'pilotage.reglages': renderReglages,
  'analyse.analyser': renderAnalyser, 'analyse.comparer': renderComparer, 'analyse.performances': renderPerformances,
  'ressources.hashtags': renderHashtags, 'ressources.personas': renderPersonas, 'ressources.visuels': renderVisuels, 'ressources.modeles': renderModeles
};
const navOf = u => u === 'groupe' ? NAV.groupe : NAV.marque;
const R = { univ: root.dataset.brand || 'groupe', tab: 'accueil', sub: null, params: {}, tok: 0 };

/* ---------- context passed to views ---------- */
const ctx = {
  get univ() { return R.univ; }, get sub() { return R.sub; }, get params() { return R.params; }, set params(v) { R.params = v; },
  go: (u, t, s, p = {}, force) => go(u, t, s, p, force),
  open: id => { const c = getItem(id); if (!c) return; go(c.marque, 'creer', null, { id }); },
  refresh: soft => renderSub(soft),
  newContent: preset => newContent(preset)
};
function newContent(preset = {}) {
  if (R.univ !== 'groupe') { go(R.univ, 'creer', null, {}, true); return; }
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Nouveau contenu</span><h2 style="margin-top:6px">Pour quelle marque ?</h2></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="grid g2">${BRAND_KEYS.map(b => `<button class="tile click" data-b="${b}" style="padding:18px;display:flex;gap:12px;align-items:center;text-align:left">${brandDot(b)}<b style="color:var(--head)">${esc(BRANDS[b].nom)}</b></button>`).join('')}</div>`);
  el.onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; close(); go(b.dataset.b, 'creer', null, {}, true); };
}

/* ---------- navigation ---------- */
function hashFor() { const s = R.sub ? '/' + R.sub : ''; const q = R.params && R.params.id ? '?id=' + R.params.id : ''; return `#${R.univ}/${R.tab}${s}${q}`; }
function parseHash() {
  const h = location.hash.replace(/^#/, ''); if (!h || h === 'demande') return null;
  const [path, q] = h.split('?'); const [u, t, s] = path.split('/'); const params = {};
  if (q) q.split('&').forEach(kv => { const [k, v] = kv.split('='); params[k] = decodeURIComponent(v || ''); });
  if (!BRAND_KEYS.includes(u)) return null;
  return { u, t: t || 'accueil', s, params };
}
async function go(u, t, s, params = {}, force) {
  const nav = navOf(u); let tab = nav.find(x => x.k === t) ? t : (t === 'creer' ? 'creer' : 'accueil');
  const def = nav.find(x => x.k === tab); const sub = def && def.subs ? (def.subs.some(x => x[0] === s) ? s : (R.tab === tab && R.univ === u && R.sub) || def.subs[0][0]) : null;
  const same = u === R.univ && tab === R.tab && sub === R.sub && JSON.stringify(params) === JSON.stringify(R.params);
  if (same && !force) return;
  const univChanged = u !== R.univ, tabChanged = tab !== R.tab || univChanged || !$('#pageHead');
  R.univ = u; R.tab = tab; R.sub = sub; R.params = params; store.set('hc-univ', u);
  history.replaceState(null, '', hashFor());
  if (univChanged) await switchBrand(u);
  renderNav(); syncScene();
  if (tabChanged) await renderView();
  else { const sn = $('#subNav'); if (sn && sub) segSet(sn, sub); await renderSub(); }
}
function switchBrand(u) {
  return new Promise(res => {
    const apply = () => { root.dataset.brand = u; $$('[data-logo]').forEach(l => l.innerHTML = logoHTML(u)); segSet($('#univers'), u); $('meta[name=theme-color]').content = { groupe: '#1D2226', energies: '#073D27', transport: '#081B3D', granules: '#3D2408' }[u]; };
    if (!document.startViewTransition || RM) { root.classList.add('soft-swap'); apply(); setTimeout(() => root.classList.remove('soft-swap'), 760); res(); return; }
    root.classList.add('vt-brand'); const vt = document.startViewTransition(apply);
    vt.updateCallbackDone.then(res, res); vt.ready.catch(() => {}); vt.finished.catch(() => {}).finally(() => root.classList.remove('vt-brand'));
  });
}
function renderNav() {
  const nav = navOf(R.univ), tabs = $('#tabs');
  const sig = R.univ === 'groupe' ? 'g' : 'm';
  if (tabs._sig !== sig) {
    tabs.innerHTML = nav.map(n => `<button type="button" data-tab="${n.k}"><svg class="i" viewBox="0 0 24 24">${''}</svg><span>${n.l}</span></button>`).join('');
    $$('button', tabs).forEach((b, i) => b.querySelector('svg').outerHTML = ic(nav[i].i));
    tabs._ind = null; tabs._g = 0; setupInd(tabs); setupGlide(tabs); tabs._sig = sig;
    $('#bottombar').innerHTML = nav.map(n => `<button type="button" class="bb ${n.main ? 'main' : ''}" data-tab="${n.k}" aria-label="${n.l}">${ic(n.i)}<span>${n.l}</span></button>`).join('');
  }
  $$('button[data-tab]', tabs).forEach(b => b.classList.toggle('on', b.dataset.tab === R.tab));
  $$('#bottombar .bb').forEach(b => b.classList.toggle('on', b.dataset.tab === R.tab));
  requestAnimationFrame(() => place(tabs._ind, $('button.on', tabs), !tabs._placed)); tabs._placed = true;
}
function syncScene() { const i = navOf(R.univ).findIndex(n => n.k === R.tab); $$('.scene').forEach(s => s.classList.toggle('on', +s.dataset.scene === Math.max(0, i))); }
async function renderView() {
  const tok = ++R.tok; const view = $('#view');
  await animOut(view, -6, 170); if (tok !== R.tok) return;
  scrollTo({ top: 0, behavior: 'instant' });
  view.getAnimations().forEach(a => a.cancel());
  renderHead(true);
  await renderSub(true, true);
  stagger(view, ':scope > .page-head');
}
function renderHead() {
  const def = navOf(R.univ).find(n => n.k === R.tab) || { t: 'Créer un contenu', d: '' };
  const view = $('#view'); let h = $('#pageHead', view);
  if (!h) { view.innerHTML = `<div class="page-head glass" id="pageHead"></div><div id="sub" style="display:flex;flex-direction:column;gap:20px"></div>`; h = $('#pageHead', view); }
  const title = R.tab === 'creer' && R.univ === 'groupe' ? 'Créer un contenu pour le groupe' : def.t;
  h.innerHTML = `<div class="txt"><span class="label">${esc(BRANDS[R.univ].nom)}</span><h1 style="margin-top:8px">${esc(title)}</h1><p>${esc(def.d)}</p></div>${def.subs ? '<div class="seg glass glide scroll" id="subNav"></div>' : ''}`;
  if (def.subs) seg($('#subNav', h), def.subs, R.sub, v => go(R.univ, R.tab, v));
}
async function renderSub(soft, initial) {
  const host = $('#sub'); if (!host) return;
  const key = R.tab === 'accueil' || R.tab === 'calendrier' || R.tab === 'creer' ? R.tab : `${R.tab}.${R.sub}`;
  const fn = VIEWS[key]; if (!fn) return;
  if (soft === true && !initial) {
    const y = scrollY; const tmp = document.createElement('div'); tmp.style.display = 'flex'; tmp.style.flexDirection = 'column'; tmp.style.gap = '20px';
    host.replaceWith(tmp); tmp.id = 'sub'; fn(tmp, ctx); $$('[data-st]', tmp).forEach(x => x.getAnimations().forEach(a => a.cancel()));
    tmp.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 320, easing: EASE });
    scrollTo({ top: y, behavior: 'instant' }); updateBell(); return;
  }
  if (!initial) { await animOut(host, -4, 150); host.getAnimations().forEach(a => a.cancel()); }
  host.innerHTML = ''; host._wired = false;
  const fresh = document.createElement('div'); fresh.id = 'sub'; fresh.style.cssText = 'display:flex;flex-direction:column;gap:20px';
  host.replaceWith(fresh);
  try { fn(fresh, ctx); } catch (e) { console.error(e); fresh.innerHTML = `<div class="panel glass"><div class="empty"><p>Affichage impossible. Rechargez la page.</p></div></div>`; }
  updateBell();
}

/* ---------- notifications ---------- */
function notifs() {
  const now = new Date(), out = [];
  const cs = contents();
  if (isDirection()) cs.filter(c => c.statut === 'validation').forEach(c => out.push({ id: 'v' + c.id, ic: 'check', t: 'À valider', s: c.titre, open: c.id }));
  if (canCreate()) cs.filter(c => c.statut === 'a_produire' && c.data.retour).forEach(c => out.push({ id: 'r' + c.id + c.maj_le, ic: 'msg', t: 'Modifications demandées', s: c.titre, open: c.id }));
  cs.filter(c => c.statut === 'a_planifier').forEach(c => out.push({ id: 'p' + c.id, ic: 'cal', t: 'Validé, à planifier', s: c.titre, open: c.id }));
  cs.filter(c => c.statut === 'planifie' && c.date_debut && new Date(c.date_debut) - now < 48 * 36e5 && new Date(c.date_debut) > now - 24 * 36e5).forEach(c => out.push({ id: 'd' + c.id + c.date_debut, ic: 'clock', t: 'À publier bientôt', s: `${c.titre} · ${fmtDT(c.date_debut)}`, open: c.id }));
  cs.filter(c => c.date_debut && new Date(c.date_debut) < now && !['publie', 'archive'].includes(c.statut)).forEach(c => out.push({ id: 'l' + c.id, ic: 'alert', t: 'En retard', s: c.titre, open: c.id }));
  byKind('demande').filter(d => d.statut === 'nouvelle').forEach(d => out.push({ id: 'q' + d.id, ic: 'inbox', t: 'Nouvelle demande', s: d.titre, go: ['groupe', 'production', 'demandes'] }));
  byKind('visuel').filter(v => v.data.droits_fin && new Date(v.data.droits_fin) - now < 30 * 864e5).forEach(v => out.push({ id: 'i' + v.id, ic: 'image', t: 'Droits d\'un visuel bientôt expirés', s: `${v.titre} · ${fmtDate(v.data.droits_fin)}`, go: [v.marque === 'groupe' ? 'energies' : v.marque, 'ressources', 'visuels'] }));
  byKind('evenement').forEach(e => (e.data.taches || []).forEach((t, i) => { if (!t.done && new Date(t.date) - now < 7 * 864e5) out.push({ id: 'e' + e.id + i, ic: 'flag', t: new Date(t.date) < now ? 'Étape d\'événement en retard' : 'Étape d\'événement cette semaine', s: `${e.titre} : ${t.t}`, go: ['groupe', 'projets', 'evenements'] }); }));
  byKind('print').filter(p => p.statut === 'bat').forEach(p => out.push({ id: 'b' + p.id, ic: 'print', t: 'BAT en attente de validation', s: p.titre, go: ['groupe', 'projets', 'print'] }));
  return out;
}
function updateBell() { const seen = store.get('hc-seen', []); const n = notifs().filter(x => !seen.includes(x.id)).length; $('#bellDot').classList.toggle('on', n > 0); }
let pop = null;
function toggleBell() {
  if (pop) { const p = pop; pop = null; p.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 200, fill: 'forwards' }).done.then(() => p.remove()); return; }
  const list = notifs(); const seen = store.get('hc-seen', []);
  pop = document.createElement('div'); pop.className = 'notif-pop glass';
  pop.innerHTML = `<div class="panel-head" style="margin-bottom:8px"><div><span class="label">Notifications</span><h3 style="margin-top:4px">${list.length} élément${list.length > 1 ? 's' : ''}</h3></div></div>` + (list.map(n => `<div class="it" data-n="${n.id}"><span class="chip ${seen.includes(n.id) ? 'gray' : ''}" style="padding:6px">${ic(n.ic)}</span><div style="min-width:0"><b>${esc(n.t)}</b><span>${esc(n.s)}</span></div></div>`).join('') || '<p class="muted small" style="padding:8px">Tout est à jour.</p>');
  $('#layer').appendChild(pop);
  pop.animate([{ opacity: 0, transform: 'translateY(-10px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE });
  store.set('hc-seen', [...new Set([...seen, ...list.map(x => x.id)])].slice(-400)); updateBell();
  pop.onclick = e => { const it = e.target.closest('[data-n]'); if (!it) return; const n = list.find(x => x.id === it.dataset.n); toggleBell(); if (n.open) ctx.open(n.open); else if (n.go) go(...n.go); };
}
document.addEventListener('click', e => { if (pop && !pop.contains(e.target) && !e.target.closest('#bellBtn')) toggleBell(); });

/* ---------- search ---------- */
function openSearch() {
  const { el, close } = modal(`<div class="search-box"><input class="input" id="sq" placeholder="Rechercher un contenu, une campagne, un contact, un visuel" autocomplete="off"></div><div class="search-res" id="sr"><p class="muted small">Saisissez au moins deux caractères.</p></div>`, { top: true });
  const kinds = { contenu: 'Contenu', campagne: 'Campagne', evenement: 'Événement', print: 'Print', journaliste: 'Journaliste', retombee: 'Retombée', visuel: 'Visuel', modele: 'Modèle', persona: 'Cible', demande: 'Demande' };
  $('#sq', el).oninput = e => {
    const q = e.target.value.trim().toLowerCase(); const box = $('#sr', el);
    if (q.length < 2) { box.innerHTML = '<p class="muted small">Saisissez au moins deux caractères.</p>'; return; }
    const res = S.items.filter(i => kinds[i.kind] && ((i.titre || '').toLowerCase().includes(q) || JSON.stringify(i.data.textes || '').toLowerCase().includes(q))).slice(0, 30);
    box.innerHTML = res.map(i => `<div class="tile rowi click" data-r="${i.id}">${brandDot(i.marque || 'groupe')}<div class="t"><b>${esc(i.titre || 'Sans titre')}</b><span>${kinds[i.kind]}${i.kind === 'contenu' ? ' · ' + esc(statutLabel(i.statut)) : ''}${i.date_debut ? ' · ' + fmtDate(i.date_debut) : ''}</span></div><span class="a">${ic('right')}</span></div>`).join('') || '<p class="muted small">Aucun résultat.</p>';
  };
  el.onclick = e => { const r = e.target.closest('[data-r]'); if (!r) return; const it = getItem(r.dataset.r); close();
    const map = { campagne: ['groupe', 'projets', 'campagnes'], evenement: ['groupe', 'projets', 'evenements'], print: ['groupe', 'projets', 'print'], journaliste: ['groupe', 'projets', 'presse'], retombee: ['groupe', 'projets', 'presse'], demande: ['groupe', 'production', 'demandes'], visuel: [it.marque === 'groupe' ? 'energies' : it.marque, 'ressources', 'visuels'], modele: [it.marque === 'groupe' ? 'energies' : it.marque, 'ressources', 'modeles'], persona: [it.marque === 'groupe' ? 'energies' : it.marque, 'ressources', 'personas'] };
    if (it.kind === 'contenu') ctx.open(it.id); else go(...map[it.kind]); };
}
addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !$('#app').hidden) { e.preventDefault(); openSearch(); } });

/* ---------- ticket ---------- */
function openTicket() {
  let type = 'question';
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Support</span><h2 style="margin-top:6px">Envoyer un ticket</h2><p>Une question, une erreur ou une idée d'amélioration de l'outil.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="form"><div class="field"><span>Type</span><div class="seg glass glide" id="tkT" style="align-self:flex-start"></div></div>
    <label class="field"><span>Sujet</span><input class="input" id="tkS" maxlength="140" placeholder="Résumez la demande en une phrase"></label>
    <label class="field"><span>Message</span><textarea class="input" id="tkM" placeholder="Écran concerné, ce que vous attendiez, ce qui s'est passé."></textarea></label></div>
    <div class="modal-foot"><button class="btn ghost" data-close>Annuler</button><button class="btn mag" id="tkGo">${ic('send')}Envoyer le ticket</button></div>`);
  seg($('#tkT', el), [['question', 'Question'], ['erreur', 'Erreur'], ['suggestion', 'Suggestion']], type, v => type = v);
  $('#tkGo', el).onclick = async () => {
    const s = $('#tkS', el), m = $('#tkM', el); if (s.value.trim().length < 3) { s.classList.add('bad'); s.focus(); return; } if (m.value.trim().length < 5) { m.classList.add('bad'); m.focus(); return; }
    try { await saveItem({ kind: 'ticket', marque: R.univ, titre: s.value.trim(), statut: 'ouvert', data: { type, message: m.value.trim(), page: hashFor() } }); close(); toast('Ticket envoyé. Réponse sous 48 h ouvrées.', 'send'); } catch (e) {}
  };
}

/* ---------- public request form (#demande) ---------- */
function showPublicForm() {
  const sec = $('#publicReq'); sec.hidden = false; $('#login').hidden = true; $('#app').hidden = true;
  sec.innerHTML = `<div class="login-card glass" style="max-width:640px;text-align:left"><span class="logo" data-logo style="justify-content:flex-start">${logoHTML()}</span>
    <span class="label">Service communication</span><h1 style="margin-top:8px;font-size:24px">Demander un contenu</h1><p class="lead" style="margin:6px 0 22px">Décrivez votre besoin : l'équipe communication le reçoit et revient vers vous.</p>
    <div class="form" id="pf">${demandFields()}<button class="btn mag" id="pfGo">${ic('send')}Envoyer la demande</button><p class="msg" id="pfMsg"></p></div></div>`;
  sec.firstElementChild.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: EASE });
  $('#pfGo', sec).onclick = async () => {
    const r = readDemand(sec); const msg = $('#pfMsg', sec);
    if (!r) { msg.className = 'msg err'; msg.textContent = 'Complétez l\'objet et le besoin.'; return; }
    const { error } = await sb.from('comm_items').insert({ kind: r.kind, marque: r.marque, titre: r.titre, statut: 'nouvelle', data: r.data });
    if (error) { msg.className = 'msg err'; msg.textContent = 'Envoi impossible pour le moment. Réessayez dans quelques minutes.'; return; }
    const card = $('#pf', sec); card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).done.then(() => { card.innerHTML = `<div class="empty"><span class="ok-c" style="width:72px;height:72px;border-radius:50%;background:var(--primary);color:var(--on-primary);display:grid;place-items:center">${ic('check')}</span><h2>Demande envoyée</h2><p>Merci. L'équipe communication revient vers vous rapidement.</p></div>`; card.getAnimations().forEach(a => a.cancel()); card.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE }); });
  };
}

/* ---------- auth ---------- */
/* Connexion unique : la page de connexion est celle du portail Hympyr, qui ramène ici une fois connecté (?retour=…).
   Même origine et même client supabase-js : la session ouverte au portail vaut pour cet outil. */
const PORTAIL_URL = 'https://hympyr-energies.github.io/portail/', OUTIL = 'pilotage_communication';
const versPortail = (params = {}) => { const u = new URL(PORTAIL_URL); Object.entries(params).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); }); return u.href; };
/* Pas de session : direction le portail. Renvoie false (connexion locale affichée en secours) si l'on en revient sans session
   depuis moins de 20 s, pour ne jamais tourner en boucle entre les deux pages. */
function allerAuPortail() {
  const k = 'hym.redirection.' + OUTIL; let d = 0;
  try { d = +sessionStorage.getItem(k) || 0; sessionStorage.setItem(k, String(Date.now())); } catch (e) {}
  if (Date.now() - d < 20000) return false;
  location.replace(versPortail({ retour: location.href, outil: OUTIL })); return true;
}
/* Ancien lien « mot de passe oublié » arrivé ici : le nouveau mot de passe se choisit au portail. */
function recuperationVersPortail() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('type') !== 'recovery' || !h.get('access_token')) return false;
  location.replace(PORTAIL_URL + location.hash); return true;
}
const setMsg = (el, t, k = 'err') => { el.className = 'msg ' + k; el.textContent = t; };
function showLogin() {
  $('#app').hidden = true; $('#publicReq').hidden = true; const l = $('#login'); l.hidden = false;
  $$('[data-logo]').forEach(x => x.innerHTML = logoHTML());
  $('#loginCard').animate([{ opacity: 0, transform: 'translateY(16px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 620, easing: EASE });
}
async function memberRole() {
  const { data, error } = await sb.rpc('comm_role'); if (error) return null; return data;
}
async function enterApp(session) {
  S.user = session.user; S.role = await memberRole();
  // Pas membre : on garde la session (elle vaut pour les autres outils) et le portail explique le refus
  if (!S.role) { S.user = null; location.replace(versPortail({ outil: OUTIL, refus: '1' })); return; }
  try { await loadAll(); } catch (e) { showLogin(); setMsg($('#loginMsg'), 'Chargement des données impossible. Rechargez la page.'); return; }
  const me = S.members.find(m => m.email.toLowerCase() === S.user.email.toLowerCase()); S.nom = me && me.nom || S.user.email;
  const l = $('#login'); if (!l.hidden) { await $('#loginCard').animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(.98)' }], { duration: 240, fill: 'forwards' }).done; l.hidden = true; $('#loginCard').getAnimations().forEach(a => a.cancel()); }
  $('#app').hidden = false;
  $$('[data-logo]').forEach(x => x.innerHTML = logoHTML(R.univ));
  seg($('#univers'), BRAND_KEYS.map(b => [b, BRANDS[b].court, BRANDS[b].color]), R.univ, v => go(v, R.tab === 'creer' ? 'accueil' : R.tab, R.sub), { dots: true });
  const p = parseHash(); if (p) { R.univ = p.u; root.dataset.brand = p.u; segSet($('#univers'), p.u); $$('[data-logo]').forEach(x => x.innerHTML = logoHTML(p.u)); }
  R.tab = null; await go(R.univ, p ? p.t : 'accueil', p ? p.s : null, p ? p.params : {}, true);
  $('.topbar').animate([{ opacity: 0, transform: 'translate(-50%,-14px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 620, easing: EASE });
  $('#bottombar').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 620, easing: EASE });
  $('#ticketBtn').animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 300, easing: EASE, fill: 'backwards' });
  setTimeout(() => replaceInd(), 650);
  updateBell();
  if (isDirection()) { const n = contents().filter(c => c.statut === 'validation').length; if (n) setTimeout(() => toast(`${n} contenu${n > 1 ? 's' : ''} en attente de votre validation`, 'check'), 900); }
  if (canCreate()) { const n = contents().filter(c => c.statut === 'a_produire' && c.data.retour).length; if (n) setTimeout(() => toast(`La direction demande des modifications sur ${n} contenu${n > 1 ? 's' : ''}`, 'msg'), 1400); }
}
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const em = $('#email'), pw = $('#password'), msg = $('#loginMsg'), btn = $('#loginBtn');
  em.classList.remove('bad'); pw.classList.remove('bad');
  if (!sb) { setMsg(msg, 'Service de connexion indisponible. Vérifiez votre connexion internet.'); return; }
  if (!/^\S+@\S+\.\S+$/.test(em.value.trim())) { em.classList.add('bad'); setMsg(msg, 'Saisissez une adresse e-mail valide.'); em.focus(); return; }
  if (!pw.value) { pw.classList.add('bad'); setMsg(msg, 'Saisissez votre mot de passe.'); pw.focus(); return; }
  btn.disabled = true; btn.textContent = 'Connexion en cours';
  const { data, error } = await sb.auth.signInWithPassword({ email: em.value.trim().toLowerCase(), password: pw.value });
  btn.disabled = false; btn.textContent = 'Se connecter';
  if (error) { pw.classList.add('bad'); setMsg(msg, /confirm/i.test(error.message) ? 'Adresse e-mail non confirmée. Consultez votre boîte de réception.' : 'Identifiant ou mot de passe incorrect.'); return; }
  pw.value = ''; setMsg(msg, ''); enterApp(data.session);
});
$('#forgotBtn').onclick = async () => {
  const em = $('#email'), msg = $('#loginMsg');
  if (!/^\S+@\S+\.\S+$/.test(em.value.trim())) { em.classList.add('bad'); setMsg(msg, 'Saisissez d\'abord votre adresse e-mail, puis cliquez à nouveau.'); em.focus(); return; }
  const { error } = await sb.auth.resetPasswordForEmail(em.value.trim().toLowerCase(), { redirectTo: location.origin + location.pathname });
  setMsg(msg, error ? 'Envoi impossible pour le moment. Réessayez dans quelques minutes.' : `Un lien de réinitialisation a été envoyé à ${em.value.trim()}.`, error ? 'err' : 'ok');
};
$('#resetForm').addEventListener('submit', async e => {
  e.preventDefault(); const p = $('#newPassword'), msg = $('#resetMsg');
  if (p.value.length < 8) { p.classList.add('bad'); setMsg(msg, 'Choisissez un mot de passe de 8 caractères minimum.'); return; }
  const { error } = await sb.auth.updateUser({ password: p.value });
  if (error) { setMsg(msg, 'Mise à jour impossible. Demandez un nouveau lien.'); return; }
  $('#resetForm').hidden = true; $('#loginForm').hidden = false; const { data } = await sb.auth.getSession(); if (data.session) enterApp(data.session);
});
// Retour à l'accueil du portail, session conservée : la déconnexion se fait au portail, pour tous les outils à la fois.
$('#logoutBtn').onclick = () => { location.assign(versPortail()); };
$('#themeBtn').onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
$('#bellBtn').onclick = toggleBell;
$('#searchBtn').onclick = openSearch;
$('#ticketBtn').onclick = openTicket;
$('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) go(R.univ, b.dataset.tab); };
$('#bottombar').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) go(R.univ, b.dataset.tab); };
document.addEventListener('click', e => { const h = e.target.closest('[data-home]'); if (h) { e.preventDefault(); go(R.univ, 'accueil'); } });
onChange(() => updateBell());

/* ---------- boot ---------- */
(async function boot() {
  syncThemeLabel();
  if (location.hash === '#demande') { showPublicForm(); return; }
  if (recuperationVersPortail()) return;
  if (!sb) { showLogin(); setMsg($('#loginMsg'), 'Service de connexion indisponible. Vérifiez votre connexion internet.'); return; }
  sb.auth.onAuthStateChange(ev => {
    // Déconnexion depuis le portail, un autre outil ou un autre onglet : on masque l'outil
    if (ev === 'SIGNED_OUT' && S.user) { S.user = null; S.items = []; if (!allerAuPortail()) showLogin(); return; }
    if (ev === 'PASSWORD_RECOVERY') { $('#app').hidden = true; $('#login').hidden = false; $('#loginForm').hidden = true; $('#resetForm').hidden = false; $('#loginTitle').textContent = 'Nouveau mot de passe'; $('#loginLead').textContent = 'Choisissez votre nouveau mot de passe.'; } });
  const { data } = await sb.auth.getSession();
  if (data.session) enterApp(data.session); else if (!allerAuPortail()) showLogin();
})();
export { ctx, go };
