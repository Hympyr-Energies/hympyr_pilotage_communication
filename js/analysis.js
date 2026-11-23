/* =========================================================
   ANALYSIS ENGINE : built-in rules, adjustable levels
   ========================================================= */
import { esc, settings, byKind, OBJECTIFS } from './core.js?v=7';

export const CRITERES = [
  ['accroche', 'Accroche'], ['clarte', 'Clarté'], ['structure', 'Structure'], ['valeur', 'Valeur'],
  ['emotion', 'Émotion'], ['recit', 'Récit'], ['preuve', 'Preuve'], ['cta', 'Appel à l\'action'],
  ['ton', 'Ton de marque'], ['motscles', 'Mots-clés'], ['hashtags', 'Hashtags'], ['format', 'Format']
];
/* default weights (0 to 3) per objective */
export const DEFAULT_POIDS = {
  pedagogique:   { accroche: 2, clarte: 3, structure: 3, valeur: 3, emotion: 1, recit: 1, preuve: 2, cta: 2, ton: 2, motscles: 2, hashtags: 1, format: 2 },
  viral:         { accroche: 3, clarte: 2, structure: 2, valeur: 2, emotion: 3, recit: 1, preuve: 1, cta: 3, ton: 1, motscles: 1, hashtags: 2, format: 3 },
  emotionnel:    { accroche: 3, clarte: 2, structure: 1, valeur: 1, emotion: 3, recit: 2, preuve: 1, cta: 1, ton: 2, motscles: 1, hashtags: 1, format: 2 },
  storytelling:  { accroche: 3, clarte: 2, structure: 2, valeur: 1, emotion: 2, recit: 3, preuve: 1, cta: 1, ton: 2, motscles: 1, hashtags: 1, format: 2 },
  commercial:    { accroche: 3, clarte: 3, structure: 2, valeur: 3, emotion: 1, recit: 1, preuve: 3, cta: 3, ton: 2, motscles: 3, hashtags: 1, format: 2 },
  notoriete:     { accroche: 3, clarte: 2, structure: 2, valeur: 2, emotion: 2, recit: 2, preuve: 1, cta: 1, ton: 3, motscles: 3, hashtags: 2, format: 2 },
  employeur:     { accroche: 2, clarte: 2, structure: 2, valeur: 1, emotion: 3, recit: 3, preuve: 2, cta: 1, ton: 3, motscles: 1, hashtags: 2, format: 2 },
  institutionnel:{ accroche: 2, clarte: 3, structure: 3, valeur: 2, emotion: 1, recit: 1, preuve: 3, cta: 1, ton: 3, motscles: 2, hashtags: 1, format: 2 },
  recrutement:   { accroche: 3, clarte: 3, structure: 3, valeur: 2, emotion: 2, recit: 1, preuve: 1, cta: 3, ton: 2, motscles: 2, hashtags: 2, format: 2 },
  rse:           { accroche: 2, clarte: 2, structure: 2, valeur: 2, emotion: 2, recit: 2, preuve: 3, cta: 1, ton: 3, motscles: 2, hashtags: 1, format: 2 }
};
export const poids = () => { const s = settings(); const p = JSON.parse(JSON.stringify(DEFAULT_POIDS)); if (s.poids) for (const o in s.poids) p[o] = { ...p[o], ...s.poids[o] }; return p; };

const L = {
  hook: ['pourquoi', 'comment', 'erreur', 'secret', 'jamais', 'personne', 'vous', 'stop', 'vraiment', 'savez-vous', 'imaginez', 'et si', 'combien', 'voici', 'ce que', 'la vérité'],
  cliches: ['dans un monde où', 'n\'hésitez pas', 'nous sommes heureux', 'nous sommes ravis', 'fiers de vous annoncer', 'fier de vous annoncer', 'plongeons', 'dans cet article', 'il est important de noter', 'en somme', 'en conclusion', 'incontournable', 'révolutionnaire', 'game changer', 'au cœur de', 'boostez', 'booster', 'synergie', 'n\'attendez plus', 'sans plus attendre', 'à l\'ère de', 'holistique', 'véritable révolution', 'plus que jamais', 'force est de constater', 'il va sans dire', 'last but not least', 'ne manquez pas', 'un incontournable', 'le saviez-vous'],
  jargon: ['scalable', 'disruptif', 'paradigme', 'best practice', 'roadmap', 'leverager', 'process', 'asap', 'kpi', 'brainstorming', 'deadline', 'feedback', 'challenge'],
  emotion: ['fier', 'fière', 'fierté', 'merci', 'ensemble', 'peur', 'joie', 'bonheur', 'émotion', 'rêve', 'passion', 'inquiét', 'colère', 'espoir', 'sourire', 'cœur', 'famille', 'confiance', 'chaleur', 'solidar', 'engag', 'surpr', 'touché', 'partag', 'heureux', 'difficile', 'courage', 'gratitude', 'émouv', 'fragile', 'humain', 'reconnaissan', 'soulag', 'frustr'],
  recit: ['il y a', 'ce jour-là', 'un jour', 'ce matin', 'hier', 'quand ', 'lorsque', 'puis', 'soudain', 'alors', 'à ce moment', 'au début', 'depuis', 'c\'était', 'nous avons', 'j\'ai', ' a commencé', 'ensuite', 'finalement', 'à l\'époque', 'cette année-là', 'raconte'],
  preuve: ['selon', 'étude', 'source', 'chiffre', 'données', 'témoign', 'client', 'résultat', 'mesur', 'certifi', 'label', 'norme', 'enquête', 'rapport'],
  valeur: ['comment', 'astuce', 'conseil', 'étape', 'méthode', 'guide', 'erreur', 'éviter', 'pourquoi', 'voici', 'bon à savoir', 'à retenir', 'checklist', 'règle', 'exemple', 'en pratique', 'résultat'],
  cta: ['découvrez', 'contactez', 'demandez', 'réservez', 'inscrivez', 'téléchargez', 'partagez', 'commentez', 'cliquez', 'appelez', 'rejoignez', 'postulez', 'simulez', 'calculez', 'écrivez', 'dites-nous', 'abonnez', 'suivez', 'lisez', 'essayez', 'commandez', 'retrouvez', 'venez', 'rendez-vous', 'en savoir plus', 'lien en bio', 'votre avis'],
  vert: ['écologique', 'vert ', 'verte', 'neutre en carbone', 'zéro carbone', 'zéro émission', '100 % naturel', '100% naturel', 'respectueux de l\'environnement', 'bon pour la planète', 'durable', 'biodégradable', 'éco-responsable', 'écoresponsable', 'propre', 'sans impact', 'neutralité carbone', 'compensé', 'green']
};
export const CTA_WORDS = L.cta;
const EMOJI = /\p{Extended_Pictographic}/u;
const words = t => t.match(/[\p{L}\p{N}'’-]+/gu) || [];
const sentences = t => t.split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(s => words(s).length);
const syl = w => { const lw = w.toLowerCase(); const g = lw.match(/[aeiouyàâäéèêëîïôöùûüœæ]+/g); let n = g ? g.length : 1; if (n > 1 && /[^aeiouyé]es?$/.test(lw)) n--; return Math.max(1, n); };
const has = (t, list) => list.filter(k => t.includes(k));
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(v)));
const near = (v, lo, hi, soft) => v >= lo && v <= hi ? 100 : clamp(100 - (v < lo ? (lo - v) : (v - hi)) / soft * 100);

/* main entry : returns {scores, global, issues, stats, marks} */
export function analyse({ texte = '', hashtags = [], reseau = 'linkedin', objectif = 'pedagogique', marque = 'groupe', lien = '', accroche = null }) {
  const s = settings(); const sev = Number(s.severite) || 1; const seu = s.seuils; const net = seu[reseau] || seu.linkedin;
  const t = texte.trim(); const low = ' ' + t.toLowerCase().replace(/’/g, '\'') + ' ';
  const W = words(t), S = sentences(t), paras = t.split(/\n\s*\n/).filter(p => p.trim());
  const first = (accroche != null && String(accroche).trim() ? String(accroche).replace(/^#+\s*/, '').split('\n')[0] : (t.split('\n').find(l => l.trim()) || '').replace(/^#+\s*/, '')).trim(); const firstW = words(first).length;
  const issues = []; const add = (crit, lv, msg) => issues.push({ crit, lv, msg });
  const sc = {};
  if (!W.length) {
    CRITERES.forEach(([k]) => sc[k] = 0);
    return { scores: sc, global: 0, issues: [{ crit: 'format', lv: 'haute', msg: 'Rédigez le texte pour lancer l\'analyse.' }], stats: { mots: 0, car: 0, phrases: 0, lisibilite: 0, hashtags: 0, emojis: 0 }, marks: [], weights: poids()[objectif] || poids().pedagogique };
  }
  const avgSent = W.length / Math.max(1, S.length);
  const sylPerWord = W.reduce((a, w) => a + syl(w), 0) / W.length;
  const lis = clamp(207 - 1.015 * avgSent - 73.6 * sylPerWord, 0, 100); /* Kandel-Moles */
  const longS = S.filter(x => words(x).length > seu.phraseMax);
  const nums = (t.match(/\d+([,.]\d+)?\s?(%|€|km|t|kg|l|h|ans|clients|jours)?/gi) || []).length;
  const emojis = [...t].filter(c => EMOJI.test(c)).length;
  const excl = (t.match(/!/g) || []).length;
  const caps = (t.match(/\b[A-ZÀ-Ý]{5,}\b/g) || []).filter(w => !/HYMPYR|ADBLUE|DALET|LINKEDIN/.test(w)).length;
  const tagsInText = (t.match(/#[\p{L}\p{N}_]+/gu) || []);
  const allTags = [...new Set([...hashtags, ...tagsInText].map(h => h.startsWith('#') ? h : '#' + h))];
  const lastPart = low.slice(-Math.min(low.length, 260));

  /* accroche */
  let a = 100;
  if (firstW > seu.accrocheMax) { a -= 30 * sev; add('accroche', 'haute', `La première ligne compte ${firstW} mots : visez ${seu.accrocheMax} au maximum pour qu'elle s'affiche entière avant « voir plus ».`); }
  const hookHits = has(' ' + first.toLowerCase() + ' ', L.hook).length + (/\?/.test(first) ? 1 : 0) + (/\d/.test(first) ? 1 : 0);
  if (!hookHits) { a -= 30 * sev; add('accroche', 'haute', 'L\'accroche ne contient ni question, ni chiffre, ni promesse : ajoutez un élément qui arrête la lecture.'); }
  if (has(first.toLowerCase(), L.cliches).length) { a -= 30 * sev; add('accroche', 'haute', 'L\'accroche commence par une formule convenue : entrez directement dans le sujet.'); }
  if (first.length > net.coupe) { a -= 15 * sev; add('accroche', 'moyenne', `La première ligne dépasse ${net.coupe} caractères et sera coupée sur ${reseau === 'instagram' ? 'Instagram' : 'LinkedIn'}.`); }
  sc.accroche = clamp(a);
  /* clarte */
  let c = near(lis, seu.lisibiliteCible, 100, 40);
  if (lis < seu.lisibiliteCible) add('clarte', lis < seu.lisibiliteCible - 15 ? 'haute' : 'moyenne', `Lisibilité de ${lis}/100 : raccourcissez les phrases et préférez des mots simples (cible : ${seu.lisibiliteCible}).`);
  if (longS.length) { c -= Math.min(40, longS.length * 10) * sev; add('clarte', 'moyenne', `${longS.length} phrase${longS.length > 1 ? 's dépassent' : ' dépasse'} ${seu.phraseMax} mots : coupez-les en deux.`); }
  const jar = has(low, L.jargon); if (jar.length) { c -= 10 * jar.length * sev; add('clarte', 'basse', `Jargon à remplacer : ${jar.join(', ')}.`); }
  sc.clarte = clamp(c);
  /* structure */
  let st = 100; const lines = t.split('\n').filter(l => l.trim());
  const bigPara = paras.filter(p => sentences(p.split('\n').filter(l => !/^\s*([-•–]|\d+[.)])\s/.test(l)).join('\n')).length > seu.paraMax);
  if (W.length > 80 && paras.length < 3) { st -= 40 * sev; add('structure', 'haute', 'Le texte forme un bloc : aérez-le en paragraphes de 1 à 3 phrases.'); }
  if (bigPara.length) { st -= 20 * sev; add('structure', 'moyenne', `${bigPara.length} paragraphe${bigPara.length > 1 ? 's' : ''} de plus de ${seu.paraMax} phrases : découpez-les.`); }
  const list = lines.filter(l => /^\s*([-•–]|\d+[.)])\s/.test(l)).length;
  if (W.length > 150 && !list) { st -= 15 * sev; add('structure', 'basse', 'Une liste à puces ou numérotée faciliterait la lecture rapide.'); }
  sc.structure = clamp(st);
  /* valeur */
  const val = has(low, L.valeur).length + list / 2 + (low.split(' vous').length - 1) / 2;
  sc.valeur = clamp(30 + val * 14);
  if (sc.valeur < 60) add('valeur', objectif === 'pedagogique' || objectif === 'commercial' ? 'haute' : 'moyenne', 'Le lecteur ne voit pas encore ce qu\'il gagne : ajoutez un conseil, une méthode ou un bénéfice concret.');
  const nous = (low.match(/\bnous\b|\bnotre\b|\bnos\b/g) || []).length, vous = (low.match(/\bvous\b|\bvotre\b|\bvos\b/g) || []).length;
  if (nous > vous * 2 && nous > 3) { sc.valeur = clamp(sc.valeur - 15 * sev); add('valeur', 'moyenne', 'Le texte parle surtout de nous : reformulez du point de vue du lecteur (« vous »).'); }
  /* emotion */
  const emo = has(low, L.emotion).length;
  sc.emotion = clamp(25 + emo * 18);
  if (sc.emotion < 55 && ['emotionnel', 'storytelling', 'employeur', 'viral'].includes(objectif)) add('emotion', 'haute', 'Peu de registre émotionnel : nommez un ressenti, une fierté, une difficulté surmontée.');
  /* recit */
  const rec = has(low, L.recit).length + (/(«|")/.test(t) ? 1 : 0);
  sc.recit = clamp(20 + rec * 16);
  if (sc.recit < 55 && ['storytelling', 'employeur', 'emotionnel'].includes(objectif)) add('recit', 'haute', 'Pas encore d\'histoire : posez une situation de départ, un tournant, un dénouement, avec une personne réelle.');
  /* preuve */
  const pr = nums + has(low, L.preuve).length;
  sc.preuve = clamp(25 + pr * 15);
  if (sc.preuve < 55 && ['commercial', 'institutionnel', 'rse', 'pedagogique'].includes(objectif)) add('preuve', 'haute', 'Aucune preuve tangible : ajoutez un chiffre, un résultat client ou une source.');
  /* cta */
  const ctaHits = has(lastPart, L.cta).length + (/\?\s*$/.test(t.split('#')[0].trim()) ? 1 : 0) + (lien ? 1 : 0);
  sc.cta = ctaHits ? clamp(70 + ctaHits * 15) : 20;
  if (!ctaHits) add('cta', ['commercial', 'recrutement', 'viral'].includes(objectif) ? 'haute' : 'moyenne', 'Le texte se termine sans appel à l\'action : invitez à commenter, découvrir, postuler ou contacter.');
  /* ton */
  let tn = 100; const cli = has(low, L.cliches);
  if (cli.length) { tn -= cli.length * 15 * sev; add('ton', 'haute', `Formules convenues à supprimer : ${cli.slice(0, 4).join(', ')}.`); }
  if (emojis) { tn -= 40; add('ton', 'haute', `${emojis} emoji${emojis > 1 ? 's' : ''} détecté${emojis > 1 ? 's' : ''} : la charte Hympyr les interdit dans toutes les créations.`); }
  if (excl > seu.exclamMax) { tn -= 10 * (excl - seu.exclamMax) * sev; add('ton', 'moyenne', `${excl} points d'exclamation : gardez-en ${seu.exclamMax} au maximum.`); }
  if (caps) { tn -= 10 * caps * sev; add('ton', 'basse', 'Mots en capitales : la charte réserve les capitales aux étiquettes courtes.'); }
  sc.ton = clamp(tn);
  /* mots-cles */
  const kws = byKind('motcle', marque).concat(marque !== 'groupe' ? [] : []).map(k => (k.titre || '').toLowerCase()).filter(Boolean);
  const kwFound = kws.filter(k => low.includes(k.toLowerCase()));
  const kwEarly = kws.filter(k => low.slice(0, 200).includes(k.toLowerCase()));
  sc.motscles = kws.length ? clamp((kwFound.length ? 50 : 10) + kwFound.length * 12 + (kwEarly.length ? 20 : 0)) : 60;
  if (kws.length && !kwFound.length) add('motscles', 'haute', `Aucun mot-clé de la marque : intégrez par exemple « ${kws.slice(0, 3).join(' », « ')} ».`);
  else if (kws.length && !kwEarly.length) add('motscles', 'moyenne', 'Placez un mot-clé dès les premières lignes pour le référencement interne au réseau.');
  /* hashtags */
  let hs = 100; const n = allTags.length;
  const bank = byKind('hashtag').filter(h => h.marque === marque || h.marque === 'groupe');
  const brandTags = bank.filter(h => (h.data || {}).categorie === 'marque').map(h => h.titre.toLowerCase());
  if (n < net.hashMin) { hs -= (net.hashMin - n) * 15 * sev; add('hashtags', 'moyenne', `${n} hashtag${n > 1 ? 's' : ''} : visez entre ${net.hashMin} et ${net.hashMax} sur ${reseau === 'instagram' ? 'Instagram' : 'LinkedIn'}.`); }
  if (n > net.hashMax) { hs -= (n - net.hashMax) * 12 * sev; add('hashtags', 'moyenne', `${n} hashtags : au-delà de ${net.hashMax}, la portée et la crédibilité baissent.`); }
  if (brandTags.length && !allTags.some(h => brandTags.includes(h.toLowerCase()))) { hs -= 20 * sev; add('hashtags', 'moyenne', `Ajoutez le hashtag de marque (${bank.find(h => (h.data || {}).categorie === 'marque').titre}).`); }
  const longTags = allTags.filter(h => h.length > 25); if (longTags.length) { hs -= 10; add('hashtags', 'basse', 'Hashtags trop longs : personne ne les recherche.'); }
  const cats = new Set(allTags.map(h => ((bank.find(b => b.titre.toLowerCase() === h.toLowerCase()) || {}).data || {}).categorie).filter(Boolean));
  if (n >= 3 && cats.size < 2) { hs -= 10; add('hashtags', 'basse', 'Mélangez hashtags de marque, de niche et larges pour toucher plusieurs audiences.'); }
  sc.hashtags = clamp(hs);
  /* format */
  const car = t.replace(/#[\p{L}\p{N}_]+/gu, '').length;
  sc.format = near(car, net.min, net.max, net.max * .6);
  if (car < net.min) add('format', 'moyenne', `${car} caractères : un peu court pour ${reseau === 'instagram' ? 'Instagram' : 'LinkedIn'} (repère : ${net.min} à ${net.max}).`);
  if (car > net.max) add('format', 'moyenne', `${car} caractères : au-delà de ${net.max}, l'attention chute. Resserrez.`);
  if (reseau === 'instagram' && /https?:\/\//.test(t)) add('format', 'basse', 'Les liens ne sont pas cliquables dans une légende Instagram : utilisez « lien en bio ».');
  /* green claims (compliance) */
  const vert = has(low, L.vert);
  if (vert.length && marque !== 'transport') { sc.ton = clamp(sc.ton - 15); add('ton', 'haute', `Allégation environnementale (${vert.slice(0, 3).join(', ')}) : justifiez-la par une preuve précise ou reformulez (loi Climat et Résilience).`); }

  /* global, weighted by objective */
  const w = poids()[objectif] || poids().pedagogique;
  let tot = 0, sw = 0; CRITERES.forEach(([k]) => { tot += sc[k] * (w[k] || 0); sw += (w[k] || 0); });
  let global = clamp(sw ? tot / sw : 0);
  /* charter violations cap the global score */
  if (emojis) global = Math.min(global, 40);
  if (vert.length && marque !== 'transport') global = Math.min(global, 60);
  if (cli.length >= 2) global = Math.min(global, 55);
  /* order issues : level then weight */
  const rank = { haute: 0, moyenne: 1, basse: 2 };
  issues.sort((x, y) => rank[x.lv] - rank[y.lv] || (w[y.crit] || 0) - (w[x.crit] || 0));
  /* marks for highlight view */
  const marks = [];
  longS.forEach(x => marks.push({ t: x, cls: 'long', title: 'Phrase longue' }));
  cli.forEach(x => marks.push({ t: x, cls: 'cli', title: 'Formule convenue' }));
  vert.forEach(x => marks.push({ t: x.trim(), cls: 'green', title: 'Allégation environnementale' }));
  kwFound.forEach(x => marks.push({ t: x, cls: 'kw', title: 'Mot-clé de la marque' }));
  return { scores: sc, global, issues, stats: { mots: W.length, car, phrases: S.length, lisibilite: lis, hashtags: n, emojis }, marks, weights: w };
}
export function scoreLabel(g) { return g >= 85 ? 'Excellent' : g >= 70 ? 'Solide' : g >= 50 ? 'À renforcer' : 'À retravailler'; }

/* highlighted text */
export function highlight(text, marks) {
  let html = esc(text);
  const seen = new Set();
  marks.sort((a, b) => b.t.length - a.t.length).forEach(m => {
    const key = m.t.toLowerCase(); if (!m.t || seen.has(key)) return; seen.add(key);
    const re = new RegExp('(' + esc(m.t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'gi');
    html = html.replace(re, `<mark class="${m.cls}" title="${m.title}">$1</mark>`);
  });
  return html;
}

/* radar svg : series = [{values:{k:v}, cls}] */
export function radarSVG(series, size = 360) {
  const cx = size / 2, cy = size / 2 + 4, R = size / 2 - 58, n = CRITERES.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100]; };
  let g = '';
  [25, 50, 75, 100].forEach(l => { g += `<polygon class="grid-l" points="${CRITERES.map((_, i) => pt(i, l).join(',')).join(' ')}"/>`; });
  CRITERES.forEach(([k, lab], i) => {
    const [x, y] = pt(i, 100); g += `<line class="axis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`;
    const [lx, ly] = pt(i, 122); const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
    g += `<text x="${lx}" y="${ly + 4}" text-anchor="${anchor}">${esc(lab)}</text>`;
  });
  series.forEach((s, si) => {
    const pts = CRITERES.map(([k], i) => pt(i, s.values[k] || 0).join(',')).join(' ');
    g += `<polygon class="${s.cls || 'area'}" data-series="${si}" points="${pts}"/>`;
    if (!s.cls || s.cls === 'area') CRITERES.forEach(([k], i) => { const [x, y] = pt(i, s.values[k] || 0); g += `<circle class="pt" cx="${x}" cy="${y}" r="3"/>`; });
  });
  return `<svg class="radar" viewBox="-64 -4 ${size + 128} ${size + 16}" role="img" aria-label="Diagramme radar des critères">${g}</svg>`;
}
/* animate radar from previous values */
export function animateRadar(svgEl, from, to, size = 360) {
  if (!svgEl) return;
  const poly = svgEl.querySelector('polygon.area'), dots = [...svgEl.querySelectorAll('circle.pt')];
  if (!poly) return;
  const cx = size / 2, cy = size / 2 + 4, R = size / 2 - 58, n = CRITERES.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100]; };
  const t0 = performance.now(), d = 600;
  const step = now => {
    const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3);
    const vals = CRITERES.map(([k]) => (from[k] || 0) + ((to[k] || 0) - (from[k] || 0)) * e);
    poly.setAttribute('points', vals.map((v, i) => pt(i, v).join(',')).join(' '));
    dots.forEach((c, i) => { const [x, y] = pt(i, vals[i]); c.setAttribute('cx', x); c.setAttribute('cy', y); });
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
export { OBJECTIFS };
