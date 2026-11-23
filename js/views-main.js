/* =========================================================
   MAIN VIEWS : dashboards, calendar, board, validation, requests, internal
   ========================================================= */
import {
  $, $$, esc, S, byKind, getItem, contents, saveItem, deleteItem, addJournal, toast, modal, confirmBox, seg, ic, swap, ring, animateRings, animateBars, stagger,
  BRANDS, SUB_BRANDS, BRAND_KEYS, STATUTS, statutLabel, PRE_VALID, typeLabel, typeFamily, objLabel, cibleLabel, RESEAUX, TYPES,
  isoDay, fmtDate, fmtDT, fmtShort, startOfWeek, addDays, sameDay, holidays, settings, isDirection, canCreate, memberName, brandDot, pct, num, toLocalInput, fromLocalInput
} from './core.js?v=5';
import { scoreLabel } from './analysis.js?v=5';

const bc = m => (BRANDS[m] || BRANDS.groupe).color;
const scope = univ => univ === 'groupe' ? contents() : contents(univ);
const card = (c) => `<div class="tile kcard" draggable="true" data-id="${c.id}" style="--bc:${bc(c.marque)}"><b>${esc(c.titre || 'Sans titre')}</b>
  <div class="m">${brandDot(c.marque)}<span class="chip gray">${esc(typeLabel(c.data.type))}</span>${(c.data.reseaux || []).map(n => `<span class="chip gray">${n === 'linkedin' ? 'LinkedIn' : 'Instagram'}</span>`).join('')}${c.data.score != null ? `<span class="chip ${c.data.score >= 70 ? 'ok' : c.data.score >= 50 ? 'warn' : 'err'}">${c.data.score}</span>` : ''}</div>
  <span class="d">${c.date_debut ? fmtDT(c.date_debut) : 'Date à définir'}${c.data.retour && c.statut === 'redaction' ? ' · retour direction' : ''}</span></div>`;

/* =========================================================
   DASHBOARD (groupe & brand)
   ========================================================= */
export function weekStats(marque) {
  const set = settings(); const r = set.rythme[marque] || { linkedin: 0, instagram: 0 };
  const w0 = startOfWeek(new Date()), w1 = addDays(w0, 7);
  const inWeek = (c, a, b) => c.date_debut && new Date(c.date_debut) >= a && new Date(c.date_debut) < b && ['planifie', 'publie'].includes(c.statut);
  const cs = contents(marque);
  const res = {}; RESEAUX.forEach(([n]) => res[n] = { done: cs.filter(c => inWeek(c, w0, w1) && (c.data.reseaux || []).includes(n)).length, target: r[n] || 0 });
  /* streak : consecutive past weeks where every target was met */
  let streak = 0;
  for (let k = 1; k <= 52; k++) {
    const a = addDays(w0, -7 * k), b = addDays(a, 7);
    const ok = RESEAUX.every(([n]) => !r[n] || cs.filter(c => inWeek(c, a, b) && c.statut === 'publie' && (c.data.reseaux || []).includes(n)).length >= r[n]);
    const any = RESEAUX.some(([n]) => r[n]);
    if (ok && any) streak++; else break;
  }
  const pub = byKind('contenu', marque).filter(c => c.statut === 'publie').length;
  const lv = pub >= 100 ? ['Ambassadeur', 100] : pub >= 50 ? ['Expert', 100] : pub >= 25 ? ['Confirmé', 50] : pub >= 10 ? ['Initié', 25] : ['Découverte', 10];
  return { res, streak, pub, level: lv[0], next: lv[1] };
}
export function renderDashboard(el, ctx) {
  const univ = ctx.univ, isG = univ === 'groupe';
  const cs = scope(univ), now = new Date(), w0 = startOfWeek(now), w1 = addDays(w0, 7);
  const thisWeek = cs.filter(c => c.date_debut && new Date(c.date_debut) >= w0 && new Date(c.date_debut) < w1).sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));
  const late = cs.filter(c => c.date_debut && new Date(c.date_debut) < now && !['publie', 'archive'].includes(c.statut));
  const toVal = cs.filter(c => c.statut === 'validation');
  const pubMonth = cs.filter(c => c.statut === 'publie' && c.date_debut && new Date(c.date_debut).getMonth() === now.getMonth() && new Date(c.date_debut).getFullYear() === now.getFullYear());
  const avgScore = cs.length ? Math.round(cs.reduce((a, c) => a + (c.data.score || 0), 0) / cs.length) : 0;
  const brands = isG ? SUB_BRANDS.concat('groupe') : [univ];
  const ws = brands.map(b => [b, weekStats(b)]);
  /* balance over current month */
  const month = cs.filter(c => c.date_debut && new Date(c.date_debut).getMonth() === now.getMonth() && c.statut !== 'archive');
  const eq = settings().equilibre; const alerts = [];
  const dist = (keyFn, labels) => { const t = month.length || 1; const m = {}; month.forEach(c => [].concat(keyFn(c)).forEach(k => m[k] = (m[k] || 0) + 1)); return labels.map(([k, l]) => [k, l, m[k] || 0, Math.round((m[k] || 0) / t * 100)]); };
  const dB = dist(c => c.marque, BRAND_KEYS.map(b => [b, BRANDS[b].court]));
  const dN = dist(c => (c.data.reseaux || []).length ? c.data.reseaux : ['hors'], [['linkedin', 'LinkedIn'], ['instagram', 'Instagram'], ['hors', 'Autres supports']]);
  const dT = dist(c => typeFamily(c.data.type), [['social', 'Réseaux'], ['web', 'Site, e-mail'], ['presse', 'Presse'], ['print', 'Print'], ['interne', 'Interne']]);
  if (isG && month.length >= 4) dB.filter(x => x[0] !== 'groupe').forEach(([k, l, n, p]) => { if (p < eq.min) alerts.push(`${l} est sous-représentée ce mois-ci (${p} %).`); if (p > eq.max) alerts.push(`${l} concentre ${p} % des contenus du mois.`); });
  if (month.length >= 4) dN.slice(0, 2).forEach(([k, l, n, p]) => { if (p < eq.min) alerts.push(`${l} est peu alimenté ce mois-ci (${p} %).`); });
  const recycle = byKind('contenu', isG ? null : univ).filter(c => c.statut === 'publie' && c.date_debut && (now - new Date(c.date_debut)) > 90 * 864e5 && (c.data.stats || {}).vues)
    .sort((a, b) => ((b.data.stats.interactions || 0) / (b.data.stats.vues || 1)) - ((a.data.stats.interactions || 0) / (a.data.stats.vues || 1))).slice(0, 4);
  const ideas = cs.filter(c => c.statut === 'idee').slice(0, 5);
  const bars = rows => `<div class="hbars">${rows.map(([k, l, n, p]) => `<div class="r"><span>${esc(l)}</span><div class="bar"><i data-w="${p}%" style="background:${BRANDS[k] ? BRANDS[k].color : 'var(--primary)'}"></i></div><span>${n}</span></div>`).join('')}</div>`;
  el.innerHTML = `
  <div class="grid g4" data-st>
    <div class="tile kpi"><span>Cette semaine</span><b>${thisWeek.length}</b><span>contenu${thisWeek.length > 1 ? 's' : ''} au calendrier</span></div>
    <div class="tile kpi"><span>À valider</span><b>${toVal.length}</b><span>${isDirection() ? 'en attente de votre décision' : 'chez la direction'}</span></div>
    <div class="tile kpi"><span>En retard</span><b style="color:${late.length ? 'var(--err)' : 'var(--head)'}">${late.length}</b><span>date passée, non publié</span></div>
    <div class="tile kpi"><span>Publiés ce mois-ci</span><b>${pubMonth.length}</b><span>score moyen ${avgScore}/100</span></div>
  </div>
  <div class="grid g2">
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">Objectifs de la semaine</span><h2 style="margin-top:4px">Rythme de publication</h2><p>Contenus planifiés ou publiés par rapport aux objectifs définis dans Réglages.</p></div></div>
      <div class="rows">${ws.map(([b, w]) => `<div class="tile" style="padding:14px 16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between">
        <div style="display:flex;gap:10px;align-items:center;min-width:0">${brandDot(b)}<div><b style="color:var(--head)">${esc(BRANDS[b].nom)}</b><div class="small muted">Niveau ${w.level} · ${w.pub} publié${w.pub > 1 ? 's' : ''}${w.streak ? ` · ${w.streak} semaine${w.streak > 1 ? 's' : ''} d'affilée` : ''}</div></div></div>
        <div style="display:flex;gap:14px">${RESEAUX.filter(([n]) => w.res[n].target).map(([n, l]) => `<div style="text-align:center"><div class="ring" style="width:64px;height:64px"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="42"/><circle class="val" cx="50" cy="50" r="42" stroke-dasharray="263.9" stroke-dashoffset="263.9" data-off="${(263.9 - 263.9 * Math.min(1, w.res[n].done / w.res[n].target)).toFixed(1)}" style="stroke:${bc(b)}"/></svg><div class="c"><b style="font-size:15px">${w.res[n].done}/${w.res[n].target}</b></div></div><span class="small muted">${l}</span></div>`).join('') || '<span class="small muted">Aucun objectif</span>'}</div></div>`).join('')}</div></div>
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">Cette semaine</span><h2 style="margin-top:4px">Au programme</h2></div><button class="btn ghost sm mag" data-go="calendrier">Ouvrir le calendrier</button></div>
      <div class="rows">${thisWeek.slice(0, 7).map(c => `<div class="tile rowi click" data-open="${c.id}">${brandDot(c.marque)}<div class="t"><b>${esc(c.titre)}</b><span>${fmtDT(c.date_debut)} · ${esc(typeLabel(c.data.type))}</span></div><span class="a"><span class="chip ${c.statut === 'publie' ? 'ok' : c.statut === 'validation' ? 'warn' : 'gray'}">${esc(statutLabel(c.statut))}</span></span></div>`).join('') || '<div class="empty"><p>Rien de prévu cette semaine.</p></div>'}</div></div>
  </div>
  <div class="grid g3">
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">Équilibre éditorial</span><h2 style="margin-top:4px">${isG ? 'Par marque' : 'Par support'}</h2><p>Mois en cours, ${month.length} contenu${month.length > 1 ? 's' : ''}.</p></div></div>${bars(isG ? dB : dT)}</div>
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">Équilibre éditorial</span><h2 style="margin-top:4px">Par réseau</h2></div></div>${bars(dN)}
      ${alerts.length ? `<div class="rows" style="margin-top:14px">${alerts.map(a => `<div class="tile" style="padding:10px 12px;font-size:12.5px;display:flex;gap:8px;align-items:center;color:var(--warn)">${ic('alert')}<span>${esc(a)}</span></div>`).join('')}</div>` : ''}</div>
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">À surveiller</span><h2 style="margin-top:4px">Points d'attention</h2></div></div>
      <div class="rows">${[...late.slice(0, 3).map(c => [c, 'En retard', 'err']), ...toVal.slice(0, 3).map(c => [c, 'À valider', 'warn'])].map(([c, l, k]) => `<div class="tile rowi click" data-open="${c.id}">${brandDot(c.marque)}<div class="t"><b>${esc(c.titre)}</b><span>${c.date_debut ? fmtDT(c.date_debut) : 'Sans date'}</span></div><span class="a"><span class="chip ${k}">${l}</span></span></div>`).join('') || '<div class="empty"><p>Aucun point bloquant. Belle maîtrise.</p></div>'}</div></div>
  </div>
  <div class="grid g2">
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">Réservoir</span><h2 style="margin-top:4px">Idées en attente</h2></div>${canCreate() ? `<button class="btn ghost sm mag" id="newIdea">${ic('idea')}Noter une idée</button>` : ''}</div>
      <div class="rows">${ideas.map(c => `<div class="tile rowi click" data-open="${c.id}">${brandDot(c.marque)}<div class="t"><b>${esc(c.titre)}</b><span>${esc(objLabel(c.data.objectif))}</span></div><span class="a">${ic('right')}</span></div>`).join('') || '<div class="empty"><p>Aucune idée notée pour le moment.</p></div>'}</div></div>
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">Recyclage</span><h2 style="margin-top:4px">À republier ou décliner</h2><p>Publiés il y a plus de 3 mois, meilleur taux d'engagement.</p></div></div>
      <div class="rows">${recycle.map(c => `<div class="tile rowi click" data-open="${c.id}">${brandDot(c.marque)}<div class="t"><b>${esc(c.titre)}</b><span>${fmtDate(c.date_debut)} · engagement ${pct((c.data.stats.interactions || 0) / (c.data.stats.vues || 1) * 100)}</span></div><span class="a">${ic('refresh')}</span></div>`).join('') || '<div class="empty"><p>Les contenus publiés avec statistiques apparaîtront ici après 3 mois.</p></div>'}</div></div>
  </div>`;
  animateRings(el); animateBars(el); stagger(el);
  el.onclick = e => { const o = e.target.closest('[data-open]'); if (o) ctx.open(o.dataset.open); const g = e.target.closest('[data-go]'); if (g) ctx.go(univ, g.dataset.go); };
  const ni = $('#newIdea', el); if (ni) ni.onclick = () => quickIdea(ctx);
}
export function quickIdea(ctx, preset = {}) {
  let count = 0, busy = false;
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Réservoir</span><h2 style="margin-top:6px">Noter une idée</h2><p id="qiCount">Enchaînez les idées sans quitter cette fenêtre.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="form" id="qiForm"><label class="field"><span>Idée</span><input class="input" id="qiT" maxlength="120" placeholder="Ex. Portrait d'un chauffeur de nuit" value="${esc(preset.titre || '')}"></label>
    <label class="field"><span>Marque</span><select class="input" id="qiM">${BRAND_KEYS.map(b => `<option value="${b}" ${b === (preset.marque || (ctx.univ !== 'groupe' ? ctx.univ : 'energies')) ? 'selected' : ''}>${BRANDS[b].nom}</option>`).join('')}</select></label>
    <label class="field"><span>Notes <em>(facultatif)</em></span><textarea class="input" id="qiN" style="min-height:80px">${esc(preset.notes || '')}</textarea></label></div>
    <div class="modal-foot"><button class="btn ghost" data-close>Fermer</button><button class="btn ghost mag" id="qiNext">${ic('plus')}Prochaine idée</button><button class="btn mag" id="qiGo">Enregistrer l'idée</button></div>`,
    { onClose: () => { if (count) ctx.refresh(true); } });
  const save = async () => {
    const t = $('#qiT', el); if (!t.value.trim()) { t.classList.add('bad'); t.focus(); return false; }
    if (busy) return false; busy = true;
    try {
      const s = await saveItem({ kind: 'contenu', marque: $('#qiM', el).value, titre: t.value.trim(), statut: preset.statut || 'idee', parent_id: preset.parent_id || null, data: { type: 'publication', cible: ['professionnels'], objectif: 'pedagogique', reseaux: ['linkedin'], textes: { linkedin: $('#qiN', el).value, instagram: '', principal: '' }, hashtags: [], visuels: [], utm: true } });
      await addJournal(s.id, 'action', 'Idée notée'); count++; return true;
    } catch (e) { return false; } finally { busy = false; }
  };
  $('#qiT', el).addEventListener('input', e => e.target.classList.remove('bad'));
  $('#qiGo', el).onclick = async () => { if (await save()) { toast(count > 1 ? `${count} idées enregistrées` : 'Idée enregistrée', 'idea'); close(); } };
  $('#qiNext', el).onclick = async () => {
    if (!await save()) return;
    const f = $('#qiForm', el);
    await f.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-14px)' }], { duration: 180, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).done;
    $('#qiT', el).value = ''; $('#qiN', el).value = '';
    f.getAnimations().forEach(a => a.cancel());
    f.animate([{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
    const c = $('#qiCount', el); c.textContent = `${count} idée${count > 1 ? 's' : ''} enregistrée${count > 1 ? 's' : ''}. Notez la suivante.`;
    c.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 400 });
    $('#qiT', el).focus();
  };
  $('#qiT', el).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#qiNext', el).click(); } });
}

/* =========================================================
   CALENDAR
   ========================================================= */
const cal = { mode: 'mois', ref: new Date(), filters: { marques: [...BRAND_KEYS], reseau: '', statut: '', type: '' } };
export function renderCalendar(el, ctx) {
  const univ = ctx.univ, isG = univ === 'groupe';
  const d = cal.ref; const f = cal.filters;
  let items = scope(univ).filter(c => c.date_debut);
  if (isG) items = items.filter(c => f.marques.includes(c.marque));
  if (f.reseau) items = items.filter(c => (c.data.reseaux || []).includes(f.reseau));
  if (f.statut) items = items.filter(c => c.statut === f.statut);
  if (f.type) items = items.filter(c => typeFamily(c.data.type) === f.type);
  const tfs = [...byKind('temps_fort').filter(t => isG || t.marque === univ || t.marque === 'groupe').map(t => ({ date: isoDay(new Date(t.date_debut)), fin: t.date_fin ? isoDay(new Date(t.date_fin)) : null, titre: t.titre })), ...holidays(d.getFullYear()), ...holidays(d.getFullYear() + 1)];
  const evts = byKind('evenement').filter(e => e.date_debut && (isG || e.marque === univ || e.marque === 'groupe'));
  let days = [], title = '';
  if (cal.mode === 'mois') { const first = new Date(d.getFullYear(), d.getMonth(), 1); const s0 = startOfWeek(first); for (let i = 0; i < 42; i++) days.push(addDays(s0, i)); if (days[35].getMonth() !== d.getMonth()) days = days.slice(0, 35); title = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
  else if (cal.mode === 'semaine') { const s0 = startOfWeek(d); for (let i = 0; i < 7; i++) days.push(addDays(s0, i)); title = `Semaine du ${fmtShort(days[0])}`; }
  const today = isoDay(new Date());
  const dayHtml = day => {
    const k = isoDay(day); const list = items.filter(c => isoDay(new Date(c.date_debut)) === k).sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));
    const tf = tfs.filter(t => t.date === k || (t.fin && k > t.date && k <= t.fin)); const ev = evts.filter(e => isoDay(new Date(e.date_debut)) <= k && isoDay(new Date(e.date_fin || e.date_debut)) >= k);
    const max = cal.mode === 'mois' ? 3 : 20;
    return `<div class="day ${day.getMonth() !== d.getMonth() && cal.mode === 'mois' ? 'out' : ''} ${k === today ? 'today' : ''} ${tf.length || ev.length ? 'hasTf' : ''}" data-day="${k}">
      <div class="dn"><b>${day.getDate()}</b>${cal.mode === 'semaine' ? `<span>${day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>` : ''}</div>
      ${tf.concat(ev.map(e => ({ titre: e.titre }))).slice(0, 1).map(t => `<span class="tf" title="${esc(t.titre)}">${esc(t.titre)}</span>`).join('')}
      ${list.slice(0, max).map(c => `<div class="ev" draggable="true" data-id="${c.id}" style="--bc:${bc(c.marque)}" title="${esc(c.titre)} · ${esc(statutLabel(c.statut))}">${c.statut === 'publie' ? ic('check') : ''}<span>${cal.mode === 'semaine' ? new Date(c.date_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' · ' : ''}${esc(c.titre)}</span></div>`).join('')}
      ${list.length > max ? `<button class="ev more" data-more="${k}">+ ${list.length - max}</button>` : ''}</div>`;
  };
  const listView = () => {
    const from = new Date(d.getFullYear(), d.getMonth(), 1), to = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const l = items.filter(c => new Date(c.date_debut) >= from && new Date(c.date_debut) < to).sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));
    title = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return l.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Contenu</th><th>Marque</th><th>Type</th><th>Réseaux</th><th>Étape</th></tr></thead><tbody>${l.map(c => `<tr class="click" data-open="${c.id}"><td>${fmtDT(c.date_debut)}</td><td><b>${esc(c.titre)}</b></td><td>${brandDot(c.marque)} ${esc(BRANDS[c.marque].court)}</td><td>${esc(typeLabel(c.data.type))}</td><td>${(c.data.reseaux || []).map(n => n === 'linkedin' ? 'LinkedIn' : 'Instagram').join(', ') || '-'}</td><td><span class="chip gray">${esc(statutLabel(c.statut))}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>Aucun contenu daté sur ce mois.</p></div>';
  };
  const body = cal.mode === 'liste' ? listView() : `<div class="cal ${cal.mode === 'semaine' ? 'week' : ''}">${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(x => `<div class="dow">${x}</div>`).join('')}${days.map(dayHtml).join('')}</div>`;
  el.innerHTML = `<div class="panel glass" data-st>
    <div class="cal-tools">
      <div class="cal-nav"><button class="icon-btn sm" id="cPrev" aria-label="Période précédente">${ic('left')}</button><h2 id="cTitle">${esc(title)}</h2><button class="icon-btn sm" id="cNext" aria-label="Période suivante">${ic('right')}</button><button class="btn text sm" id="cToday">Aujourd'hui</button></div>
      <div class="btn-row"><div class="seg glass glide" id="cMode"></div>${canCreate() ? `<button class="btn sm mag" id="cNew">${ic('plus')}Nouveau</button>` : ''}</div>
    </div>
    <div class="btn-row" style="margin-bottom:14px;justify-content:space-between">
      <div class="btn-row">${isG ? `<div class="tagsel" id="cBrands">${BRAND_KEYS.map(b => `<button type="button" data-v="${b}" class="${f.marques.includes(b) ? 'on' : ''}">${esc(BRANDS[b].court)}</button>`).join('')}</div>` : ''}</div>
      <div class="btn-row">
        <select class="input" id="cNet" style="min-height:38px;width:auto"><option value="">Tous réseaux</option>${RESEAUX.map(([k, l]) => `<option value="${k}" ${f.reseau === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select class="input" id="cType" style="min-height:38px;width:auto"><option value="">Tous types</option>${[['social', 'Réseaux sociaux'], ['web', 'Site et e-mail'], ['presse', 'Presse'], ['print', 'Print'], ['interne', 'Interne']].map(([k, l]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select class="input" id="cSt" style="min-height:38px;width:auto"><option value="">Toutes étapes</option>${STATUTS.filter(s => s[0] !== 'archive').map(([k, l]) => `<option value="${k}" ${f.statut === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
    </div>
    <div id="calBody">${body}</div>
    <div class="legend" style="margin-top:14px">${(isG ? BRAND_KEYS : [univ]).map(b => `<span>${brandDot(b)}${esc(BRANDS[b].nom)}</span>`).join('')}<span><i class="bdot" style="background:var(--warn)"></i>Temps forts, fériés, événements</span><span>Glissez un contenu pour le replanifier</span></div>
  </div>`;
  stagger(el);
  seg($('#cMode', el), [['mois', 'Mois', 'cal'], ['semaine', 'Semaine', 'week'], ['liste', 'Liste', 'list']], cal.mode, v => { cal.mode = v; redraw(); });
  const redraw = () => { const b = $('#calBody', el); renderCalendarBody(); function renderCalendarBody() { const tmp = document.createElement('div'); renderCalendar(tmp, ctx); swap(b, $('#calBody', tmp).innerHTML, { after: () => wireDnD() }); $('#cTitle', el).textContent = $('#cTitle', tmp).textContent; } };
  const move = n => { if (cal.mode === 'semaine') cal.ref = addDays(cal.ref, 7 * n); else cal.ref = new Date(cal.ref.getFullYear(), cal.ref.getMonth() + n, 1); redraw(); };
  $('#cPrev', el).onclick = () => move(-1); $('#cNext', el).onclick = () => move(1); $('#cToday', el).onclick = () => { cal.ref = new Date(); redraw(); };
  const cb = $('#cBrands', el); if (cb) cb.onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v; f.marques = f.marques.includes(v) ? f.marques.filter(x => x !== v) : [...f.marques, v]; b.classList.toggle('on', f.marques.includes(v)); redraw(); };
  $('#cNet', el).onchange = e => { f.reseau = e.target.value; redraw(); };
  $('#cType', el).onchange = e => { f.type = e.target.value; redraw(); };
  $('#cSt', el).onchange = e => { f.statut = e.target.value; redraw(); };
  const nb = $('#cNew', el); if (nb) nb.onclick = () => ctx.newContent();
  el.onclick = e => {
    const o = e.target.closest('[data-open],.ev[data-id]'); if (o) { ctx.open(o.dataset.open || o.dataset.id); return; }
    const m = e.target.closest('[data-more]'); if (m) { cal.mode = 'semaine'; cal.ref = new Date(m.dataset.more); ctx.refresh(); }
  };
  function wireDnD() {
    $$('.ev[data-id]', el).forEach(ev => {
      ev.ondragstart = e => { e.dataTransfer.setData('text/plain', ev.dataset.id); ev.classList.add('dragging'); };
      ev.ondragend = () => ev.classList.remove('dragging');
    });
    $$('.day[data-day]', el).forEach(day => {
      day.ondragover = e => { e.preventDefault(); day.classList.add('over'); };
      day.ondragleave = () => day.classList.remove('over');
      day.ondrop = async e => {
        e.preventDefault(); day.classList.remove('over');
        const c = getItem(e.dataTransfer.getData('text/plain')); if (!c) return;
        if (c.statut === 'publie') { toast('Un contenu publié ne peut pas être replanifié', 'alert'); return; }
        const old = new Date(c.date_debut); const nd = new Date(day.dataset.day + 'T00:00:00'); nd.setHours(old.getHours(), old.getMinutes());
        if (sameDay(old, nd)) return;
        try { await saveItem({ ...c, date_debut: nd.toISOString() }); addJournal(c.id, 'action', `Replanifié au ${fmtDT(nd)}`); toast(`Déplacé au ${fmtDate(nd)}`, 'cal'); redraw(); } catch (err) {}
      };
    });
  }
  wireDnD();
}

/* =========================================================
   BOARD (kanban)
   ========================================================= */
const board = { marques: [...BRAND_KEYS], q: '' };
export function renderBoard(el, ctx) {
  const cols = STATUTS.filter(s => s[0] !== 'archive');
  const items = contents().filter(c => board.marques.includes(c.marque) && (!board.q || (c.titre || '').toLowerCase().includes(board.q.toLowerCase())));
  el.innerHTML = `<div class="panel glass" data-st>
    <div class="cal-tools"><div class="btn-row"><div class="tagsel" id="kBrands">${BRAND_KEYS.map(b => `<button type="button" data-v="${b}" class="${board.marques.includes(b) ? 'on' : ''}">${esc(BRANDS[b].court)}</button>`).join('')}</div></div>
      <div class="btn-row"><input class="input" id="kQ" placeholder="Filtrer par titre" value="${esc(board.q)}" style="min-height:38px;width:220px">${canCreate() ? `<button class="btn ghost sm mag" id="kIdea">${ic('idea')}Idée</button><button class="btn sm mag" id="kNew">${ic('plus')}Nouveau contenu</button>` : ''}</div></div>
    <div class="kanban" id="kb">${cols.map(([k, l]) => {
      const list = items.filter(c => c.statut === k).sort((a, b) => new Date(a.date_debut || 8e15) - new Date(b.date_debut || 8e15));
      return `<div class="kcol" data-col="${k}"><h3>${esc(l)}<span class="n">${list.length}</span></h3>${list.map(card).join('')}</div>`;
    }).join('')}</div>
    <p class="small muted" style="margin-top:12px">Glissez les cartes d'une étape à l'autre. Le passage de « En validation » à « Validé » est réservé à la direction.</p>
  </div>`;
  stagger(el);
  $('#kBrands', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v; board.marques = board.marques.includes(v) ? board.marques.filter(x => x !== v) : [...board.marques, v]; ctx.refresh(true); };
  let qt; $('#kQ', el).oninput = e => { clearTimeout(qt); qt = setTimeout(() => { board.q = e.target.value; const pos = e.target.selectionStart; ctx.refresh(true); const n = $('#kQ', el); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 350); };
  const kn = $('#kNew', el); if (kn) kn.onclick = () => ctx.newContent();
  const ki = $('#kIdea', el); if (ki) ki.onclick = () => quickIdea(ctx);
  el.onclick = e => { const c = e.target.closest('.kcard'); if (c && !c._dragged) ctx.open(c.dataset.id); };
  $$('.kcard', el).forEach(k => { k.ondragstart = e => { e.dataTransfer.setData('text/plain', k.dataset.id); k.classList.add('dragging'); k._dragged = true; }; k.ondragend = () => { k.classList.remove('dragging'); setTimeout(() => k._dragged = false, 50); }; });
  $$('.kcol', el).forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = async e => {
      e.preventDefault(); col.classList.remove('over');
      const c = getItem(e.dataTransfer.getData('text/plain')); const to = col.dataset.col; if (!c || c.statut === to) return;
      const dir = isDirection();
      if (PRE_VALID.includes(c.statut) && !PRE_VALID.includes(to) && !dir) { toast('Seule la direction peut valider un contenu', 'alert'); return; }
      if (to === 'planifie' && !c.date_debut) { toast('Fixez une date de publication avant de planifier', 'alert'); return; }
      if (c.statut === 'validation' && to === 'redaction' && dir) { ctx.open(c.id); toast('Précisez les modifications attendues dans le contenu', 'msg'); return; }
      try {
        const s = await saveItem({ ...c, statut: to });
        await addJournal(c.id, 'action', `Déplacé vers « ${statutLabel(to)} »`);
        if (to === 'validation') addJournal(c.id, 'version', 'Version envoyée en validation', { textes: s.data.textes, hashtags: s.data.hashtags, score: s.data.score });
        if (c.statut === 'validation' && !PRE_VALID.includes(to)) addJournal(c.id, 'version', 'Version validée', { textes: s.data.textes, hashtags: s.data.hashtags, score: s.data.score });
        toast(`« ${c.titre} » : ${statutLabel(to)}`, 'board'); ctx.refresh(true);
      } catch (err) {}
    };
  });
}

/* =========================================================
   VALIDATION
   ========================================================= */
export function renderValidation(el, ctx) {
  const list = contents().filter(c => c.statut === 'validation').sort((a, b) => new Date(a.date_debut || 8e15) - new Date(b.date_debut || 8e15));
  const done = byKind('contenu').filter(c => ['a_planifier', 'planifie'].includes(c.statut)).slice(-5).reverse();
  el.innerHTML = `<div class="panel glass" data-st><div class="panel-head"><div><span class="label">${isDirection() ? 'Votre décision' : 'Chez la direction'}</span><h2 style="margin-top:4px">${list.length} contenu${list.length > 1 ? 's' : ''} en attente</h2><p>Les plus proches de leur date de publication apparaissent en premier.</p></div></div>
    <div class="rows">${list.map(c => {
      const urgent = c.date_debut && (new Date(c.date_debut) - new Date()) < 2 * 864e5;
      return `<div class="tile" style="padding:16px;display:flex;flex-direction:column;gap:10px;border-left:3px solid ${bc(c.marque)}">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div style="min-width:0"><b style="color:var(--head)">${esc(c.titre)}</b><div class="small muted">${esc(BRANDS[c.marque].nom)} · ${esc(typeLabel(c.data.type))} · ${c.date_debut ? fmtDT(c.date_debut) : 'sans date'}</div></div>
        <div class="btn-row">${urgent ? '<span class="chip err">Urgent</span>' : ''}${c.data.score != null ? `<span class="chip ${c.data.score >= 70 ? 'ok' : 'warn'}">Score ${c.data.score} · ${scoreLabel(c.data.score)}</span>` : ''}</div></div>
        <p style="font-size:13.5px;white-space:pre-wrap;max-height:120px;overflow:hidden;-webkit-mask:linear-gradient(#000 70%,transparent)">${esc(((c.data.textes || {})[(c.data.reseaux || [])[0]] || (c.data.textes || {}).principal || '').slice(0, 600))}</p>
        <div class="btn-row"><button class="btn sm mag" data-open="${c.id}">${isDirection() ? 'Relire et décider' : 'Ouvrir'}</button></div></div>`;
    }).join('') || '<div class="empty"><p>Aucun contenu en attente de validation.</p></div>'}</div></div>
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">Récemment validés</span><h2 style="margin-top:4px">Prêts à planifier</h2></div></div>
      <div class="rows">${done.map(c => `<div class="tile rowi click" data-open="${c.id}">${brandDot(c.marque)}<div class="t"><b>${esc(c.titre)}</b><span>${esc(statutLabel(c.statut))}${c.date_debut ? ' · ' + fmtDT(c.date_debut) : ''}</span></div><span class="a">${ic('right')}</span></div>`).join('') || '<div class="empty"><p>Rien pour le moment.</p></div>'}</div></div>`;
  stagger(el);
  el.onclick = e => { const o = e.target.closest('[data-open]'); if (o) ctx.open(o.dataset.open); };
}

/* =========================================================
   REQUESTS (briefs from other services)
   ========================================================= */
export function renderDemandes(el, ctx) {
  const list = byKind('demande').sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
  const url = location.origin + location.pathname + '#demande';
  const st = { nouvelle: ['Nouvelle', 'warn'], acceptee: ['Acceptée', 'ok'], refusee: ['Refusée', 'err'], convertie: ['Transformée en contenu', 'ok'] };
  el.innerHTML = `<div class="panel glass" data-st><div class="panel-head"><div><span class="label">Formulaire de brief</span><h2 style="margin-top:4px">Recevoir les demandes des autres services</h2><p>Partagez ce lien : les collègues remplissent un brief sans compte. La demande arrive ici.</p></div>
      <div class="btn-row"><button class="btn ghost sm mag" id="cpUrl">${ic('link')}Copier le lien du formulaire</button>${canCreate() ? `<button class="btn sm mag" id="newDem">${ic('plus')}Saisir une demande</button>` : ''}</div></div>
    <div class="rows">${list.map(d => `<div class="tile" style="padding:16px;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div style="min-width:0"><b style="color:var(--head)">${esc(d.titre)}</b><div class="small muted">${esc(d.data.demandeur || 'Demandeur')} · ${esc(d.data.service || '')} · reçue le ${fmtDate(d.cree_le)}${d.data.echeance ? ' · échéance ' + fmtDate(d.data.echeance) : ''}</div></div>
      <div class="btn-row">${brandDot(d.marque || 'groupe')}<span class="chip ${(st[d.statut] || st.nouvelle)[1]}">${(st[d.statut] || st.nouvelle)[0]}</span></div></div>
      <p style="font-size:13.5px;white-space:pre-wrap">${esc(d.data.besoin || '')}</p>
      ${d.data.cible ? `<p class="small muted">Cible : ${esc(d.data.cible)}${d.data.lien ? ` · <a href="${esc(d.data.lien)}" target="_blank" rel="noopener">pièce jointe</a>` : ''}</p>` : ''}
      ${canCreate() && d.statut === 'nouvelle' ? `<div class="btn-row"><button class="btn sm mag" data-conv="${d.id}">${ic('idea')}Transformer en contenu</button><button class="btn ghost sm" data-acc="${d.id}">Accepter</button><button class="btn text sm" data-ref="${d.id}">Refuser</button></div>` : ''}
    </div>`).join('') || '<div class="empty"><p>Aucune demande reçue.</p></div>'}</div></div>`;
  stagger(el);
  $('#cpUrl', el).onclick = () => navigator.clipboard.writeText(url).then(() => toast('Lien du formulaire copié', 'link'));
  const nd = $('#newDem', el); if (nd) nd.onclick = () => demandForm(ctx);
  el.onclick = async e => {
    const cv = e.target.closest('[data-conv]'), ac = e.target.closest('[data-acc]'), rf = e.target.closest('[data-ref]');
    const id = (cv || ac || rf || {}).dataset; if (!id) return; const d = getItem(cv ? id.conv : ac ? id.acc : id.ref);
    if (cv) { const s = await saveItem({ kind: 'contenu', marque: d.marque || 'groupe', titre: d.titre, statut: 'idee', parent_id: d.id, date_debut: d.data.echeance ? new Date(d.data.echeance + 'T09:00').toISOString() : null, data: { type: 'publication', cible: ['professionnels'], objectif: 'pedagogique', reseaux: ['linkedin'], textes: { linkedin: '', instagram: '', principal: '' }, hashtags: [], visuels: [], utm: true, brief: d.data } }); await saveItem({ ...d, statut: 'convertie' }); await addJournal(s.id, 'action', 'Créé depuis une demande'); toast('Demande transformée en idée', 'idea'); ctx.open(s.id); return; }
    await saveItem({ ...d, statut: ac ? 'acceptee' : 'refusee' }); toast(ac ? 'Demande acceptée' : 'Demande refusée'); ctx.refresh(true);
  };
}
export function demandFields() {
  return `<label class="field"><span>Objet de la demande</span><input class="input" data-q="titre" maxlength="120" placeholder="Ex. Annoncer l'ouverture du dépôt de Castres"></label>
    <div class="grid-f"><label class="field"><span>Votre nom</span><input class="input" data-q="demandeur" maxlength="80"></label><label class="field"><span>Service</span><input class="input" data-q="service" maxlength="80" placeholder="Ex. Exploitation, commercial"></label></div>
    <div class="grid-f"><label class="field"><span>Marque concernée</span><select class="input" data-q="marque">${BRAND_KEYS.map(b => `<option value="${b}">${BRANDS[b].nom}</option>`).join('')}</select></label><label class="field"><span>Échéance souhaitée</span><input class="input" type="date" data-q="echeance"></label></div>
    <label class="field"><span>Besoin</span><textarea class="input" data-q="besoin" maxlength="3000" placeholder="Contexte, message clé, ce que vous attendez (publication, affiche, note interne)."></textarea></label>
    <div class="grid-f"><label class="field"><span>Public visé</span><input class="input" data-q="cible" maxlength="120" placeholder="Ex. clients professionnels, chauffeurs"></label><label class="field"><span>Lien vers un document <em>(facultatif)</em></span><input class="input" data-q="lien" placeholder="https://"></label></div>`;
}
export function readDemand(box) {
  const v = k => ($(`[data-q="${k}"]`, box) || {}).value || '';
  const titre = v('titre').trim(), besoin = v('besoin').trim();
  if (titre.length < 3) { $('[data-q="titre"]', box).classList.add('bad'); return null; }
  if (besoin.length < 5) { $('[data-q="besoin"]', box).classList.add('bad'); return null; }
  return { kind: 'demande', marque: v('marque'), titre, statut: 'nouvelle', data: { demandeur: v('demandeur'), service: v('service'), echeance: v('echeance'), besoin, cible: v('cible'), lien: /^https?:\/\//.test(v('lien')) ? v('lien') : '' } };
}
function demandForm(ctx) {
  const { el, close } = modal(`<div class="modal-head"><div><span class="label">Demande</span><h2 style="margin-top:6px">Saisir une demande</h2></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div><div class="form">${demandFields()}</div><div class="modal-foot"><button class="btn ghost" data-close>Annuler</button><button class="btn mag" id="dGo">Enregistrer</button></div>`, { wide: true });
  $('#dGo', el).onclick = async () => { const r = readDemand(el); if (!r) { toast('Complétez l\'objet et le besoin', 'alert'); return; } await saveItem(r); close(); toast('Demande enregistrée', 'inbox'); ctx.refresh(true); };
}

/* =========================================================
   INTERNAL COMMUNICATION
   ========================================================= */
export function renderInterne(el, ctx) {
  const list = contents().filter(c => typeFamily(c.data.type) === 'interne' || (c.data.cible || []).some(x => ['salaries', 'chauffeurs', 'direction'].includes(x))).sort((a, b) => new Date(b.date_debut || 0) - new Date(a.date_debut || 0));
  const lect = list.filter(c => (c.data.interne || {}).lecture);
  const rate = lect.length ? Math.round(lect.reduce((a, c) => a + ((c.data.interne.lus || 0) / Math.max(1, c.data.interne.total || 1)), 0) / lect.length * 100) : 0;
  el.innerHTML = `<div class="grid g3" data-st>
    <div class="tile kpi"><span>Communications internes</span><b>${list.length}</b><span>en cours ou publiées</span></div>
    <div class="tile kpi"><span>Avec accusé de lecture</span><b>${lect.length}</b><span>suivies</span></div>
    <div class="tile kpi"><span>Taux de lecture moyen</span><b>${rate} %</b><span>sur les communications suivies</span></div></div>
    <div class="panel glass" data-st><div class="panel-head"><div><span class="label">Interne</span><h2 style="margin-top:4px">Notes, newsletters, affichage, chauffeurs</h2></div>${canCreate() ? `<button class="btn sm mag" id="iNew">${ic('plus')}Nouvelle communication interne</button>` : ''}</div>
    ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Communication</th><th>Marque</th><th>Type</th><th>Date</th><th>Étape</th><th class="num">Lecture</th></tr></thead><tbody>${list.map(c => { const i = c.data.interne || {}; const r = i.lecture ? Math.round((i.lus || 0) / Math.max(1, i.total || 1) * 100) : null; return `<tr class="click" data-open="${c.id}"><td><b>${esc(c.titre)}</b></td><td>${brandDot(c.marque)} ${esc(BRANDS[c.marque].court)}</td><td>${esc(typeLabel(c.data.type))}</td><td>${c.date_debut ? fmtDate(c.date_debut) : '-'}</td><td><span class="chip gray">${esc(statutLabel(c.statut))}</span></td><td class="num">${r == null ? '-' : `${i.lus || 0}/${i.total || 0} (${r} %)`}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><p>Aucune communication interne pour le moment.</p></div>'}</div>`;
  stagger(el);
  el.onclick = e => { const o = e.target.closest('[data-open]'); if (o) ctx.open(o.dataset.open); };
  const n = $('#iNew', el); if (n) n.onclick = () => ctx.newContent({ type: 'note_interne' });
}
