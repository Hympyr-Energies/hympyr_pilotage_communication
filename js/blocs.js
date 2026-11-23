/* =========================================================
   STRUCTURED FIELDS : one set of fields per content type,
   compiled to text for the analysis, rendered to HTML for the preview
   ========================================================= */
import { $, esc, clone, ic, toast, modal, seg, settings, typeFamily, typeLabel, BRANDS } from './core.js?v=7';
import { CTA_WORDS } from './analysis.js?v=7';

export const KINDS = {
  objet: { l: 'Objet de l\'e-mail', line: true, ph: 'Ce qui donne envie d\'ouvrir, en 50 caractères au plus' },
  pretexte: { l: 'Pré-en-tête', line: true, ph: 'La phrase affichée après l\'objet dans la boîte de réception' },
  h1: { l: 'Titre H1', line: true, ph: 'Le titre principal' },
  accroche: { l: 'Accroche', rows: 2, ph: 'La première phrase, celle qui arrête la lecture' },
  h2: { l: 'Intertitre H2', line: true, ph: 'Titre de partie' },
  h3: { l: 'Sous-titre H3', line: true, ph: 'Titre de sous-partie' },
  texte: { l: 'Texte', rows: 5, ph: 'Paragraphes. Listes avec « - » ou « 1. », gras avec **mot**, lien avec [texte](https://...), tableau avec | col | col |' },
  encadre: { l: 'Encadré', rows: 3, ph: 'À retenir, chiffres clés, contact...' },
  slide: { l: 'Diapositive', two: true, tph: 'Titre de la diapositive', ph: 'Texte de la diapositive, 40 mots au plus' },
  sequence: { l: 'Séquence', two: true, tph: 'Plan ou visuel, ex. 0 à 3 s : gros plan sur la cuve', ph: 'Texte à l\'écran ou voix off' },
  legende: { l: 'Légende', rows: 4, ph: 'Le texte publié avec le visuel' },
  cta: { l: 'Appel à l\'action', line: true, ph: 'Commencez par un verbe : Demandez votre devis, Appelez-nous...' }
};
const SINGLE = ['objet', 'pretexte', 'h1', 'accroche', 'legende', 'cta'];
const LONG_ADD = ['h2', 'h3', 'texte', 'encadre'];
const S_ = (base, add = [], o = {}) => ({ base, add, labels: {}, ...o });
const VIDEO = S_(['accroche', 'sequence', 'sequence', 'sequence', 'legende', 'cta'], ['sequence'], { hook: 'accroche', post: ['legende', 'cta'], labels: { accroche: 'Accroche (3 premières secondes)', legende: 'Texte de la publication' } });
const PRINT = S_(['h1', 'accroche', 'texte', 'cta'], ['texte'], { hook: 'h1', labels: { h1: 'Titre principal', accroche: 'Sous-titre' } });
export const STRUCT = {
  publication: S_(['accroche', 'texte', 'cta'], [], { hook: 'accroche' }),
  carrousel: S_(['accroche', 'slide', 'slide', 'slide', 'legende', 'cta'], ['slide'], { hook: 'accroche', post: ['accroche', 'legende', 'cta'], labels: { accroche: 'Accroche de la publication', legende: 'Texte de la publication' } }),
  video: VIDEO, reel: VIDEO,
  story: S_(['slide', 'slide', 'cta'], ['slide'], { hook: 'slide', labels: { slide: 'Écran', cta: 'Action (sticker ou lien)' } }),
  article: S_(['h1', 'accroche', 'h2', 'texte', 'h2', 'texte', 'cta'], LONG_ADD, { hook: 'h1', labels: { accroche: 'Chapô (accroche)' } }),
  newsletter: S_(['objet', 'pretexte', 'h1', 'accroche', 'h2', 'texte', 'cta'], LONG_ADD, { hook: 'objet', labels: { accroche: 'Introduction' } }),
  communique: S_(['h1', 'accroche', 'texte', 'h2', 'texte', 'encadre', 'cta'], LONG_ADD, { hook: 'h1', labels: { accroche: 'Chapô', encadre: 'À propos de Hympyr', cta: 'Contact presse' } }),
  affiche: PRINT, flyer: PRINT, signaletique: PRINT,
  brochure: S_(['h1', 'accroche', 'h2', 'texte', 'cta'], LONG_ADD, { hook: 'h1' }),
  presentation: S_(['h1', 'accroche', 'slide', 'slide', 'slide', 'cta'], ['slide'], { hook: 'h1', labels: { accroche: 'Sous-titre' } }),
  note_interne: S_(['h1', 'accroche', 'texte', 'cta'], LONG_ADD, { hook: 'h1', labels: { accroche: 'En bref', cta: 'Action attendue' } }),
  newsletter_interne: S_(['h1', 'accroche', 'h2', 'texte', 'cta'], LONG_ADD, { hook: 'h1', labels: { cta: 'Action attendue' } }),
  affichage_interne: S_(['h1', 'texte', 'cta'], ['texte'], { hook: 'h1', labels: { cta: 'Action attendue' } }),
  message_chauffeurs: S_(['accroche', 'texte', 'cta'], [], { hook: 'accroche', labels: { accroche: 'Message principal', cta: 'Action attendue' } })
};
export const struct = type => STRUCT[type] || STRUCT.publication;
export const label = (type, k) => struct(type).labels[k] || KINDS[k].l;
export const newBloc = k => KINDS[k].two ? { k, t: '', v: '' } : { k, v: '' };
const isSoc = type => typeFamily(type) === 'social';
const words = t => (String(t || '').match(/[\p{L}\p{N}'’-]+/gu) || []);
const PH = /\[[^\]\n]{1,80}\](?!\()/g;

/* fit any list of fields to a content type, without losing text */
export function merge(list, type) {
  const st = struct(type), allowed = new Set([...st.base, ...st.add]);
  const fb = allowed.has('texte') ? 'texte' : allowed.has('slide') ? 'slide' : allowed.has('sequence') ? 'sequence' : 'legende';
  const singles = {}, body = [];
  (list || []).forEach(b0 => {
    if (!b0 || !KINDS[b0.k]) return;
    let b = { ...b0 };
    if (!allowed.has(b.k)) { const v = [b.t, b.v].filter(x => (x || '').trim()).join('\n'); b = KINDS[fb].two ? { k: fb, t: '', v } : { k: fb, v }; }
    if (!(b.v || '').trim() && !(b.t || '').trim() && !SINGLE.includes(b.k)) return;
    if (SINGLE.includes(b.k)) { if (!singles[b.k]) { singles[b.k] = b; return; } const v = [b.v].join(''); b = KINDS[fb].two ? { k: fb, t: '', v } : { k: fb, v }; if (SINGLE.includes(fb)) { singles[fb].v = [singles[fb].v, v].filter(Boolean).join('\n\n'); return; } }
    body.push(b);
  });
  /* kinds that cannot be added (ex. text of a single post) collapse into one field */
  const out = []; let bodyDone = false;
  const collapsed = [];
  body.forEach(b => { const prev = collapsed[collapsed.length - 1]; if (!st.add.includes(b.k) && prev && prev.k === b.k && !KINDS[b.k].two) prev.v = [prev.v, b.v].filter(Boolean).join('\n\n'); else collapsed.push(b); });
  st.base.forEach(k => {
    if (SINGLE.includes(k)) { out.push(singles[k] || newBloc(k)); return; }
    if (bodyDone) return; bodyDone = true;
    if (collapsed.length) out.push(...collapsed); else st.base.filter(x => !SINGLE.includes(x)).forEach(x => out.push(newBloc(x)));
  });
  return out;
}

/* read a whole text (markdown or plain) into fields */
export function parseText(txt, type) {
  const st = struct(type), social = isSoc(type);
  const list = [], tags = [];
  let buf = [], pend = null, quote = [];
  const KEY = { objet: 'objet', 'pré-en-tête': 'pretexte', 'pre-en-tete': 'pretexte', 'préheader': 'pretexte', accroche: 'accroche', 'chapô': 'accroche', chapo: 'accroche', 'légende': 'legende', legende: 'legende', cta: 'cta', "appel à l'action": 'cta', 'action attendue': 'cta', titre: 'h1', h1: 'h1', h2: 'h2', h3: 'h3' };
  const flush = () => {
    if (quote.length) { list.push({ k: 'encadre', v: quote.join('\n').trim() }); quote = []; }
    const v = buf.join('\n').trim(); buf = [];
    if (pend) { if (KINDS[pend.k].two) list.push({ k: pend.k, t: pend.t || '', v }); else list.push({ k: pend.k, v: [pend.v, v].filter(Boolean).join('\n') }); pend = null; return; }
    if (v) list.push({ k: 'texte', v });
  };
  String(txt || '').replace(/\r/g, '').split('\n').forEach(raw => {
    const line = raw.replace(/\s+$/, ''), tr = line.trim(); let m;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(tr)) { flush(); return; }
    if (!tr) { flush(); return; }
    if (/^>\s?/.test(tr)) { if (buf.length || pend) flush(); quote.push(tr.replace(/^>\s?/, '')); return; }
    if (quote.length) flush();
    if ((m = tr.match(/^(#{1,3})\s+(.+)$/))) { flush(); list.push({ k: ['h1', 'h2', 'h3'][m[1].length - 1], v: m[2].replace(/\*\*/g, '').trim() }); return; }
    if ((m = tr.match(/^\**(diapositive|slide|écran|ecran|séquence|sequence|plan)\s*\d*\**\s*[:.-]\s*\**(.*?)\**$/i))) { flush(); pend = { k: /^(s[ée]quence|plan)$/i.test(m[1]) ? 'sequence' : 'slide', t: m[2].trim() }; return; }
    if (!buf.length && (m = tr.match(/^\**([^:*]{2,20}?)\**\s*:\s*(.*)$/)) && KEY[m[1].trim().toLowerCase()]) { flush(); pend = { k: KEY[m[1].trim().toLowerCase()], v: m[2].replace(/^\*\*|\*\*$/g, '').trim() }; return; }
    if ((m = tr.match(/^\**hashtags?\**\s*:\s*(.*)$/i))) { flush(); tags.push(...(m[1].match(/#?[\p{L}\p{N}_]+/gu) || [])); return; }
    if (/^(#[\p{L}\p{N}_]+[\s,]*)+$/u.test(tr)) { flush(); tags.push(...tr.match(/#[\p{L}\p{N}_]+/gu)); return; }
    buf.push(line);
  });
  flush();
  /* hook : first paragraph before any H2 */
  if (!list.some(b => b.k === 'accroche') && struct(type).base.includes('accroche')) {
    const i = list.findIndex(b => b.k === 'texte'); const h2 = list.findIndex(b => b.k === 'h2');
    if (i > -1 && (h2 < 0 || i < h2)) {
      const lines = list[i].v.split('\n'), isList = /^\s*([-*]|\d+[.)])\s/.test(lines[0]);
      if (!isList) { if (lines.length <= 2 || !social) { list[i] = { k: 'accroche', v: list[i].v }; } else { list.splice(i, 1, { k: 'accroche', v: lines[0] }, { k: 'texte', v: lines.slice(1).join('\n').trim() }); } }
    }
  }
  /* call to action : short last paragraph with an action verb */
  if (!list.some(b => b.k === 'cta')) {
    const last = list[list.length - 1];
    if (last && last.k === 'texte' && words(last.v).length <= 25 && !last.v.includes('\n') && CTA_WORDS.some(w => last.v.toLowerCase().includes(w))) last.k = 'cta';
  }
  /* consecutive paragraphs stay in one text field */
  const joined = [];
  list.forEach(b => { const p = joined[joined.length - 1]; if (b.k === 'texte' && p && p.k === 'texte') p.v += '\n\n' + b.v; else joined.push(b); });
  return { blocs: merge(joined, type), tags: [...new Set(tags.map(t => t.startsWith('#') ? t : '#' + t))] };
}

/* fields of one channel ; built from the existing text the first time */
export function ensureBlocs(c, net) {
  const d = c.data; d.blocs = d.blocs || {};
  if (!Array.isArray(d.blocs[net]) || !d.blocs[net].length) d.blocs[net] = parseText((d.textes || {})[net] || '', d.type).blocs;
  return d.blocs[net];
}
export function restructure(c, fromNet, toNet) {
  const d = c.data; d.blocs = d.blocs || {};
  const src = Array.isArray(d.blocs[fromNet]) && d.blocs[fromNet].length ? d.blocs[fromNet] : parseText((d.textes || {})[fromNet] || '', d.type).blocs;
  d.blocs[toNet] = merge(clone(src), d.type);
  Object.keys(d.blocs).forEach(n => { if (n !== toNet && Array.isArray(d.blocs[n]) && d.blocs[n].length) d.blocs[n] = merge(d.blocs[n], d.type); });
  Object.keys(d.blocs).forEach(n => { d.textes[n] = compile(c, n); });
}

/* text used by the analysis, the feed preview and the copy button */
export function compile(c, net) {
  const d = c.data, bl = (d.blocs || {})[net] || [], st = struct(d.type), v = s => (s || '').trim();
  if (isSoc(d.type)) {
    const keep = st.post || null;
    return bl.filter(b => !keep || keep.includes(b.k)).map(b => KINDS[b.k].two ? [v(b.t), v(b.v)].filter(Boolean).join('\n') : v(b.v)).filter(Boolean).join('\n\n');
  }
  let ns = 0, nq = 0;
  return bl.map(b => {
    const x = v(b.v); if (!x && !v(b.t)) return '';
    switch (b.k) {
      case 'objet': return 'Objet : ' + x;
      case 'pretexte': return 'Pré-en-tête : ' + x;
      case 'h1': return '# ' + x;
      case 'h2': return '## ' + x;
      case 'h3': return '### ' + x;
      case 'encadre': return x.split('\n').map(l => '> ' + l).join('\n');
      case 'slide': return `Diapositive ${++ns} : ${v(b.t)}${x ? '\n' + x : ''}`;
      case 'sequence': return `Séquence ${++nq} : ${v(b.t)}${x ? '\n' + x : ''}`;
      case 'legende': return 'Légende : ' + x;
      default: return x;
    }
  }).filter(Boolean).join('\n\n');
}
export function hookText(c, net) {
  const d = c.data, bl = (d.blocs || {})[net]; if (!bl) return null;
  const k = struct(d.type).hook; const b = bl.find(x => x.k === k); if (!b) return null;
  return (KINDS[k].two ? (b.t || b.v) : b.v) || '';
}
export const allText = c => [...Object.values((c.data || {}).textes || {}), ...Object.values((c.data || {}).blocs || {}).flat().map(b => `${b.t || ''}\n${b.v || ''}`)].join('\n');
export const fieldsText = (c, net) => ((c.data.blocs || {})[net] || []).filter(b => (b.v || b.t || '').trim()).map((b, i, a) => {
  const n = KINDS[b.k].two ? ' ' + (a.slice(0, i + 1).filter(x => x.k === b.k).length) : '';
  return `${label(c.data.type, b.k)}${n} :\n${KINDS[b.k].two ? [b.t, b.v].filter(x => (x || '').trim()).join('\n') : b.v}`;
}).join('\n\n');

/* quick check of one field */
export function fieldCheck(b, type, net) {
  const s = settings().seuils, st = struct(type), soc = isSoc(type), v = (b.v || '').trim(), t = (b.t || '').trim();
  if (!v && !t) return SINGLE.includes(b.k) ? { lv: 'empty', msg: 'À remplir' } : { lv: '', msg: '' };
  if ((v + t).match(PH)) return { lv: 'warn', msg: 'Passage entre crochets à compléter' };
  const w = words(v).length, ch = v.length, nn = soc && net !== 'principal' ? s[net] || s.linkedin : null;
  const ok = msg => ({ lv: 'ok', msg }), warn = msg => ({ lv: 'warn', msg });
  switch (b.k) {
    case 'accroche':
      if (st.hook === 'accroche' || soc) {
        if (w > s.accrocheMax) return warn(`${w} mots : visez ${s.accrocheMax} au plus`);
        if (nn && ch > nn.coupe) return warn(`${ch} caractères : coupée après ${nn.coupe}`);
        return ok(`${w} mots, s'affiche en entier`);
      }
      if (w < 12) return warn(`${w} mots : un peu court pour un chapô`);
      if (w > 60) return warn(`${w} mots : 60 au plus pour un chapô`);
      return ok(`${w} mots`);
    case 'h1': return ch > 70 ? warn(`${ch} caractères : 70 au plus pour Google`) : ch < 20 && st.labels.h1 == null ? warn(`${ch} caractères : titre très court`) : ok(`${ch} caractères`);
    case 'h2': case 'h3': return w > 12 ? warn(`${w} mots : un intertitre tient en 12 mots`) : ok(`${w} mots`);
    case 'objet': return ch > 50 ? warn(`${ch} caractères : tronqué sur mobile au-delà de 50`) : ok(`${ch} caractères`);
    case 'pretexte': return ch < 35 || ch > 110 ? warn(`${ch} caractères : visez 35 à 110`) : ok(`${ch} caractères`);
    case 'slide': { const tw = words(t).length; if (tw > 8) return warn(`Titre de ${tw} mots : 8 au plus`); if (w > 40) return warn(`${w} mots : 40 au plus par diapositive`); return ok(`${tw} + ${w} mots`); }
    case 'sequence': return w > 25 ? warn(`${w} mots : 25 au plus par séquence`) : ok(`${w} mots`);
    case 'legende': return net === 'instagram' && ch > 2200 ? warn(`${ch} caractères : Instagram coupe à 2 200`) : ok(`${w} mots, ${ch} caractères`);
    case 'cta': { const lw = v.toLowerCase(); return CTA_WORDS.some(k => lw.startsWith(k) || lw.includes(' ' + k)) || /^[\p{L}-]+(ez|er)\b/iu.test(v) ? ok('Verbe d\'action') : warn('Commencez par un verbe d\'action'); }
    default: { const long = v.split(/(?<=[.!?…])\s+|\n+/).filter(x => words(x).length > s.phraseMax).length; return long ? warn(`${w} mots, ${long} phrase${long > 1 ? 's' : ''} de plus de ${s.phraseMax} mots`) : ok(`${w} mots`); }
  }
}

/* ---------- HTML ---------- */
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*|#[^\s)]*)\)/g, (m, t, u) => `<a href="${u.replace(/&amp;/g, '&').replace(/"/g, '%22')}">${t}</a>`)
  .replace(/\[([^\]\n]{1,80})\](?!\()/g, '<mark>[$1]</mark>');
export function mdBlocks(v) {
  return String(v || '').trim().split(/\n\s*\n/).map(p => {
    const L = p.split('\n').map(x => x.trim()).filter(Boolean); if (!L.length) return '';
    /* group consecutive lines of the same kind : bullets, numbers, table rows, text */
    const kind = l => /^[-*•]\s+/.test(l) ? 'ul' : /^\d+[.)]\s+/.test(l) ? 'ol' : l.startsWith('|') ? 'tb' : 'p';
    const runs = []; L.forEach(l => { const k = kind(l), r = runs[runs.length - 1]; if (r && r.k === k) r.l.push(l); else runs.push({ k, l: [l] }); });
    return runs.map(({ k, l }) => {
      if (k === 'ul') return `<ul>${l.map(x => `<li>${inline(x.replace(/^[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
      if (k === 'ol') return `<ol>${l.map(x => `<li>${inline(x.replace(/^\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`;
      if (k === 'tb') {
        const rows = l.filter(x => !/^\|[\s:|-]+\|?$/.test(x)).map(x => x.replace(/^\||\|$/g, '').split('|').map(y => y.trim()));
        const [h, ...r] = rows; return `<table><thead><tr>${h.map(x => `<th>${inline(x)}</th>`).join('')}</tr></thead><tbody>${r.map(row => `<tr>${row.map(x => `<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      return `<p>${l.map(inline).join('<br>')}</p>`;
    }).join('');
  }).join('\n');
}
/* clean fragment : what you paste in a site, an e-mail tool or a slide */
export function fragment(c, net) {
  const d = c.data, bl = (d.blocs || {})[net] || [], href = (d.lien || '#').replace(/"/g, '%22');
  let ns = 0, nq = 0;
  return bl.map(b => {
    const v = (b.v || '').trim(), t = (b.t || '').trim(); if (!v && !t) return '';
    switch (b.k) {
      case 'objet': case 'pretexte': return '';
      case 'h1': return `<h1>${inline(v)}</h1>`;
      case 'h2': return `<h2>${inline(v)}</h2>`;
      case 'h3': return `<h3>${inline(v)}</h3>`;
      case 'accroche': return `<p class="chapo">${inline(v).replace(/\n/g, '<br>')}</p>`;
      case 'encadre': return `<aside class="encadre">\n${mdBlocks(v)}\n</aside>`;
      case 'slide': return `<section class="slide" data-n="${++ns}">${t ? `<h3>${inline(t)}</h3>` : ''}${mdBlocks(v)}</section>`;
      case 'sequence': return `<section class="sequence" data-n="${++nq}">${t ? `<h3>${inline(t)}</h3>` : ''}${mdBlocks(v)}</section>`;
      case 'cta': return `<p class="cta"><a href="${href}">${inline(v)}</a></p>`;
      case 'legende': return `<div class="legende">${mdBlocks(v)}</div>`;
      default: return mdBlocks(v);
    }
  }).filter(Boolean).join('\n');
}
/* full page used for the preview and the download */
export function htmlDoc(c, net, { mini } = {}) {
  const d = c.data, type = d.type, fam = typeFamily(type), col = (BRANDS[c.marque] || BRANDS.groupe).color, bl = (d.blocs || {})[net] || [];
  const get = k => ((bl.find(b => b.k === k) || {}).v || '').trim();
  const img = (d.visuels || []).find(x => /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(x.url || ''));
  const tags = (d.hashtags || []).join(' ');
  const brand = esc((BRANDS[c.marque] || BRANDS.groupe).nom);
  let body = '', layout = 'page';
  if (['carrousel', 'story', 'presentation'].includes(type)) {
    layout = type === 'story' ? 'story' : type === 'presentation' ? 'deck' : 'carousel';
    const slides = bl.filter(b => b.k === 'slide');
    const other = bl.filter(b => b.k !== 'slide');
    const intro = fragment({ ...c, data: { ...d, blocs: { [net]: other } } }, net);
    body = `${type === 'presentation' ? intro : ''}<div class="slides">${slides.map((s, i) => `<div class="sl"><span class="n">${i + 1} / ${slides.length}</span>${s.t ? `<h2>${inline(s.t)}</h2>` : ''}${mdBlocks(s.v)}<span class="b">${brand}</span></div>`).join('')}</div>${type !== 'presentation' ? `<div class="post">${intro}${tags ? `<p class="tags">${esc(tags)}</p>` : ''}</div>` : ''}`;
  } else if (['video', 'reel'].includes(type)) {
    layout = 'page';
    const seqs = bl.filter(b => b.k === 'sequence');
    body = `<p class="kicker">${esc(typeLabel(type))} · script</p>${get('accroche') ? `<p class="chapo"><strong>Accroche :</strong> ${inline(get('accroche'))}</p>` : ''}
      <table class="story"><thead><tr><th>#</th><th>Plan</th><th>Texte ou voix</th></tr></thead><tbody>${seqs.map((s, i) => `<tr><td>${i + 1}</td><td>${inline(s.t || '')}</td><td>${mdBlocks(s.v)}</td></tr>`).join('')}</tbody></table>
      <div class="post">${mdBlocks(get('legende'))}${get('cta') ? `<p class="cta"><a href="#">${inline(get('cta'))}</a></p>` : ''}${tags ? `<p class="tags">${esc(tags)}</p>` : ''}</div>`;
  } else if (fam === 'social' || type === 'message_chauffeurs') {
    layout = 'post';
    body = `<div class="post"><div class="ph"><span class="av"></span><div><b>${brand}</b><small>${esc(typeLabel(type))}</small></div></div>${fragment(c, net).replace('<p class="chapo">', '<p class="hook">')}${img ? `<img src="${esc(img.url)}" alt="${esc(img.alt || '')}">` : ''}${tags ? `<p class="tags">${esc(tags)}</p>` : ''}</div>`;
  } else if (type === 'newsletter') {
    layout = 'mail';
    body = `<div class="inbox"><b>${esc(get('objet') || 'Objet de l\'e-mail')}</b><span>${esc(get('pretexte') || 'Pré-en-tête')}</span></div><div class="mailcard"><div class="mh">${brand}</div>${img ? `<img src="${esc(img.url)}" alt="${esc(img.alt || '')}">` : ''}${fragment(c, net)}</div>`;
  } else if (fam === 'print' && type !== 'brochure') {
    layout = 'poster';
    body = `<div class="poster">${fragment(c, net)}<span class="b">${brand}</span></div>`;
  } else {
    body = `${img ? `<img class="hero" src="${esc(img.url)}" alt="${esc(img.alt || '')}">` : ''}${fragment(c, net)}`;
  }
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(get('h1') || c.titre || 'Aperçu')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--c:${col};--cd:color-mix(in srgb,${col} 62%,#0b0f12);--ink:#1D2226;--mut:#5B636A}
*{box-sizing:border-box}html{${mini ? 'zoom:.62;' : ''}}
body{margin:0;font-family:Poppins,system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.65;font-size:16px;overflow-wrap:anywhere}
main{max-width:760px;margin:0 auto;padding:48px 24px 64px}
h1{font-size:2.1rem;line-height:1.2;margin:0 0 18px;font-weight:700}
h2{font-size:1.4rem;line-height:1.3;margin:40px 0 12px;padding-left:14px;border-left:4px solid var(--c);font-weight:600}
h3{font-size:1.1rem;margin:28px 0 8px;font-weight:600}
p{margin:0 0 14px}.chapo{font-size:1.08rem;color:#3b4247}.kicker{text-transform:uppercase;letter-spacing:.08em;font-size:.75rem;color:var(--cd);font-weight:600}
ul,ol{padding-left:22px;margin:0 0 14px}li{margin:4px 0}a{color:var(--cd)}mark{background:#ffe9a8;padding:0 3px;border-radius:4px}
.encadre{background:color-mix(in srgb,var(--c) 9%,#fff);border:1px solid color-mix(in srgb,var(--c) 30%,#fff);border-radius:14px;padding:18px 20px;margin:24px 0}.encadre p:last-child,.encadre ul:last-child,.encadre ol:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;margin:20px 0;font-size:.92rem;border-radius:12px;overflow:hidden}th{background:var(--cd);color:#fff;text-align:left;font-weight:600}th,td{padding:10px 12px;border-bottom:1px solid #e6e8ea;vertical-align:top}td p{margin:0}
.cta{margin:32px 0 0}.cta a{display:inline-block;background:var(--cd);color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px}
.hero{width:100%;border-radius:16px;margin-bottom:28px}
.post{max-width:560px;margin:28px auto 0;border:1px solid #e6e8ea;border-radius:16px;padding:18px 20px}.post .ph{display:flex;gap:10px;align-items:center;margin-bottom:12px}.post .av{width:40px;height:40px;border-radius:50%;background:var(--c)}.post small{display:block;color:var(--mut)}.post img{width:100%;border-radius:10px;margin-top:6px}.hook{font-weight:600}.tags{color:var(--cd);font-size:.92rem}
.slides{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}.sl{position:relative;aspect-ratio:4/5;border-radius:18px;padding:26px 22px;background:linear-gradient(160deg,var(--cd),color-mix(in srgb,var(--c) 35%,#0b0f12));color:#fff;display:flex;flex-direction:column;gap:10px;overflow:hidden}.sl h2{border:0;padding:0;margin:18px 0 0;font-size:1.25rem;color:#fff}.sl p,.sl li{font-size:.92rem}.sl .n{font-size:.72rem;opacity:.8}.sl .b{margin-top:auto;font-size:.7rem;opacity:.8;font-weight:600}.sl mark{color:#1D2226}
body.story .slides{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}body.story .sl{aspect-ratio:9/16}body.deck .slides{grid-template-columns:1fr}body.deck .sl{aspect-ratio:16/9;padding:40px}
body.mail{background:#eef0f2}.inbox{background:#fff;border-radius:12px;padding:12px 16px;margin-bottom:18px;display:flex;flex-direction:column;font-size:.9rem}.inbox span{color:var(--mut)}.mailcard{background:#fff;border-radius:16px;padding:0 28px 32px;max-width:600px;margin:0 auto;overflow:hidden}.mailcard .mh{background:var(--cd);color:#fff;font-weight:600;margin:0 -28px 24px;padding:16px 28px}.mailcard img{width:100%;border-radius:10px;margin-bottom:18px}
.poster{aspect-ratio:1/1.414;max-width:520px;margin:0 auto;border-radius:6px;padding:44px 38px;background:linear-gradient(170deg,color-mix(in srgb,var(--c) 14%,#fff),#fff 60%);border:1px solid #e6e8ea;display:flex;flex-direction:column;box-shadow:0 20px 40px -24px rgba(0,0,0,.35)}.poster h1{font-size:2.3rem;color:var(--cd)}.poster .cta{margin-top:auto}.poster .b{margin-top:18px;font-weight:700;color:var(--cd)}
.story td:first-child{width:36px;color:var(--mut)}
</style></head><body class="${layout}"><main>${body || '<p style="color:#5B636A">Remplissez les champs pour voir le rendu.</p>'}</main></body></html>`;
}

/* preview window */
export function openHtmlPreview(c, net) {
  const frag = fragment(c, net), doc = htmlDoc(c, net);
  let view = 'rendu';
  const { el } = modal(`<div class="modal-head"><div><span class="label">Aperçu HTML · ${esc(typeLabel(c.data.type))}</span><h2 style="margin-top:6px">${esc(c.titre || 'Sans titre')}</h2><p>Rendu final et code prêt à coller dans le site, l'outil d'e-mailing ou un document.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="hp-bar"><div class="seg glass glide" id="hpSeg"></div><div class="btn-row"><button class="btn ghost sm mag" id="hpRich">${ic('copy')}Copier le texte mis en forme</button><button class="btn ghost sm mag" id="hpCode">${ic('copy')}Copier le HTML</button><button class="btn sm mag" id="hpDl">${ic('down')}Télécharger</button></div></div>
    <div class="hp-view" id="hpView"></div>`, { wide: true });
  el.closest('.modal').classList.add('hp');
  const box = $('#hpView', el);
  const show = () => {
    if (view === 'rendu') { box.innerHTML = '<iframe class="hp-frame" sandbox="allow-same-origin" title="Aperçu du rendu"></iframe>'; $('iframe', box).srcdoc = doc; }
    else box.innerHTML = `<pre class="hp-code"><code>${esc(frag)}</code></pre>`;
  };
  seg($('#hpSeg', el), [['rendu', 'Rendu'], ['code', 'Code HTML']], view, v => { view = v; show(); });
  show();
  $('#hpCode', el).onclick = () => navigator.clipboard.writeText(frag).then(() => toast('HTML copié', 'copy'));
  $('#hpRich', el).onclick = async () => {
    try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([frag], { type: 'text/html' }), 'text/plain': new Blob([compile(c, net)], { type: 'text/plain' }) })]); toast('Texte mis en forme copié : collez-le dans votre éditeur', 'copy'); }
    catch (e) { navigator.clipboard.writeText(frag).then(() => toast('HTML copié', 'copy')); }
  };
  $('#hpDl', el).onclick = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    a.download = ((c.titre || 'contenu').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'contenu') + '.html';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
}
