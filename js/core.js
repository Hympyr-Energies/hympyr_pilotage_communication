/* =========================================================
   CORE : config, helpers, data store, UI primitives
   ========================================================= */
export const SB_URL = 'https://cmvkijtlkzfwnzipgstc.supabase.co';
export const SB_KEY = 'sb_publishable_Q8HVlAGCLlpF5P3Gqsa_9g_fKDDD0bZ';
export let sb = null;
try { sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }); } catch (e) { sb = null; }

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const root = document.documentElement;
export const EASE = 'cubic-bezier(.22,1,.36,1)';
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clone = o => JSON.parse(JSON.stringify(o));
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
Object.defineProperty(Animation.prototype, 'done', {
  get() { const t = this.effect && this.effect.getTiming ? this.effect.getTiming() : {}; return Promise.race([this.finished.catch(() => {}), new Promise(r => setTimeout(r, (+t.duration || 300) + (+t.delay || 0) + 150))]); }
});

/* ---------- reference data ---------- */
export const BRANDS = {
  groupe: { nom: 'Hympyr', court: 'Groupe', color: '#5B636A' },
  energies: { nom: 'Hympyr Energies', court: 'Energies', color: '#28CB88' },
  transport: { nom: 'Hympyr Transport', court: 'Transport', color: '#286ACB' },
  granules: { nom: 'Hympyr Granulés', court: 'Granulés', color: '#CB7A28' }
};
export const BRAND_KEYS = ['groupe', 'energies', 'transport', 'granules'];
export const SUB_BRANDS = ['energies', 'transport', 'granules'];
export const STATUTS = [
  ['idee', 'Idée'], ['a_produire', 'À produire'], ['validation', 'En validation'],
  ['a_planifier', 'Validé, à planifier'], ['planifie', 'Planifié'], ['publie', 'Publié'], ['archive', 'Archivé']
];
export const statutLabel = k => k === 'redaction' ? 'À produire' : (STATUTS.find(s => s[0] === k) || [k, k])[1];
/* automatic stage : an idea with a broadcast date and time becomes « à produire » ; the old « en rédaction » stage is merged into it */
export function autoStatut(it) { if (!it || it.kind !== 'contenu') return it && it.statut; if (it.statut === 'redaction') return 'a_produire'; if (it.statut === 'idee' && it.date_debut) return 'a_produire'; return it.statut; }
/* edit queue : contents selected on the board, edited one after the other */
export const Q = { ids: (() => { try { return JSON.parse(sessionStorage.getItem('hc-queue') || '[]'); } catch (e) { return []; } })() };
export function setQueue(ids) { Q.ids = ids || []; try { sessionStorage.setItem('hc-queue', JSON.stringify(Q.ids)); } catch (e) {} }
export const PRE_VALID = ['idee', 'a_produire', 'redaction', 'validation'];
export const TYPES = [
  ['publication', 'Publication', 'social'], ['carrousel', 'Carrousel', 'social'], ['video', 'Vidéo', 'social'], ['story', 'Story', 'social'], ['reel', 'Reel', 'social'],
  ['article', 'Article de site', 'web'], ['newsletter', 'Newsletter', 'web'], ['communique', 'Communiqué de presse', 'presse'],
  ['affiche', 'Affiche', 'print'], ['flyer', 'Flyer', 'print'], ['brochure', 'Brochure', 'print'], ['signaletique', 'Signalétique', 'print'], ['presentation', 'Présentation', 'print'],
  ['note_interne', 'Note de service', 'interne'], ['newsletter_interne', 'Newsletter interne', 'interne'], ['affichage_interne', 'Affichage dépôts et sites', 'interne'], ['message_chauffeurs', 'Message aux chauffeurs', 'interne']
];
export const typeLabel = k => (TYPES.find(t => t[0] === k) || [k, k])[1];
export const typeFamily = k => (TYPES.find(t => t[0] === k) || [0, 0, 'social'])[2];
export const RESEAUX = [['linkedin', 'LinkedIn'], ['instagram', 'Instagram']];
export const OBJECTIFS = [
  ['pedagogique', 'Pédagogique'], ['viral', 'Viral'], ['emotionnel', 'Émotionnel'], ['storytelling', 'Storytelling'], ['commercial', 'Commercial'],
  ['notoriete', 'Notoriété'], ['employeur', 'Marque employeur'], ['institutionnel', 'Institutionnel'], ['recrutement', 'Recrutement'], ['rse', 'Engagement RSE']
];
export const objLabel = k => (OBJECTIFS.find(t => t[0] === k) || [k, k])[1];
export const CIBLES = [
  ['salaries', 'Salariés', 'interne'], ['chauffeurs', 'Chauffeurs', 'interne'], ['direction', 'Direction', 'interne'],
  ['particuliers', 'Clients particuliers', 'externe'], ['professionnels', 'Clients professionnels', 'externe'], ['partenaires', 'Partenaires', 'externe'],
  ['presse', 'Presse', 'externe'], ['collectivites', 'Collectivités', 'externe'], ['candidats', 'Candidats', 'externe']
];
export const cibleLabel = k => (CIBLES.find(t => t[0] === k) || [k, k])[1];

/* ---------- icons ---------- */
export const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
  board: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  radar: '<path d="M12 3 21 9.5 17.5 20h-11L3 9.5z"/><path d="M12 8l4.5 3.3-1.7 5.2H9.2l-1.7-5.2z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  msg: '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M9 21h6M10 17h4"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  mega: '<path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2z"/><path d="M16 8a5 5 0 0 1 0 8"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5-5-5.7"/>',
  euro: '<path d="M18 6a7 7 0 1 0 0 12"/><path d="M4 10h10M4 14h10"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  idea: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  select: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12.5 3 3 5.5-6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down2: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  week: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M9 4.5v16.5M15 4.5v16.5"/>',
  down: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.5L20 16M20 20v-4h-4"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'
};
export const ic = (n, c = 'i') => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${I[n] || ''}</svg>`;

/* ---------- dates ---------- */
export const pad = n => String(n).padStart(2, '0');
export const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toLocalInput = v => { if (!v) return ''; const d = new Date(v); return `${isoDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fromLocalInput = v => v ? new Date(v).toISOString() : null;
export const fmtDate = v => v ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
export const fmtDT = v => v ? `${fmtDate(v)} à ${new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')}` : '';
export const fmtShort = v => v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
export const startOfWeek = d => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const sameDay = (a, b) => isoDay(new Date(a)) === isoDay(new Date(b));
export const euro = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const num = n => (Number(n) || 0).toLocaleString('fr-FR');
export const pct = n => `${(Math.round((Number(n) || 0) * 10) / 10).toLocaleString('fr-FR')} %`;
export function holidays(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month - 1, day);
  const list = [[new Date(year, 0, 1), 'Jour de l\'an'], [addDays(easter, 1), 'Lundi de Pâques'], [new Date(year, 4, 1), 'Fête du travail'], [new Date(year, 4, 8), 'Victoire 1945'],
    [addDays(easter, 39), 'Ascension'], [addDays(easter, 50), 'Lundi de Pentecôte'], [new Date(year, 6, 14), 'Fête nationale'], [new Date(year, 7, 15), 'Assomption'],
    [new Date(year, 10, 1), 'Toussaint'], [new Date(year, 10, 11), 'Armistice'], [new Date(year, 11, 25), 'Noël']];
  return list.map(([d, t]) => ({ date: isoDay(d), titre: t }));
}

/* =========================================================
   DATA STORE
   ========================================================= */
export const S = { user: null, role: null, nom: '', items: [], members: [], listeners: new Set(), loaded: false };
export const onChange = fn => { S.listeners.add(fn); return () => S.listeners.delete(fn); };
const emit = () => S.listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });
export const byKind = (kind, marque) => S.items.filter(i => i.kind === kind && (!marque || i.marque === marque));
export const getItem = id => S.items.find(i => i.id === id);
export const contents = marque => byKind('contenu', marque).filter(c => c.statut !== 'archive');

export async function loadAll() {
  const out = []; let from = 0; const size = 1000;
  for (;;) {
    const { data, error } = await sb.from('comm_items').select('*').order('cree_le', { ascending: true }).range(from, from + size - 1);
    if (error) throw error;
    out.push(...data); if (data.length < size) break; from += size;
  }
  S.items = out.map(normalize);
  const m = await sb.from('comm_membres').select('email,nom,role,actif');
  S.members = m.data || [];
  S.loaded = true; emit();
}
function normalize(it) { it.data = it.data || {}; it.statut = autoStatut(it); return it; }
export async function saveItem(item, { silent } = {}) {
  const st = autoStatut(item), promoted = item.kind === 'contenu' && item.statut === 'idee' && st === 'a_produire';
  if (st !== item.statut) item = { ...item, statut: st };
  const row = { kind: item.kind, marque: item.marque || null, titre: item.titre || null, statut: item.statut || null, date_debut: item.date_debut || null, date_fin: item.date_fin || null, data: item.data || {}, parent_id: item.parent_id || null };
  let res;
  if (item.id) res = await sb.from('comm_items').update(row).eq('id', item.id).select().single();
  else res = await sb.from('comm_items').insert(row).select().single();
  if (res.error) { if (!silent) toast(errMsg(res.error), 'alert'); throw res.error; }
  const saved = normalize(res.data);
  const idx = S.items.findIndex(i => i.id === saved.id);
  if (idx > -1) S.items[idx] = saved; else S.items.push(saved);
  emit(); if (promoted && !silent) toast(`Date de diffusion fixée : « ${saved.titre || 'Sans titre'} » passe à produire`, 'board'); return saved;
}
export async function deleteItem(id) {
  const { error } = await sb.from('comm_items').delete().eq('id', id);
  if (error) { toast(errMsg(error), 'alert'); throw error; }
  S.items = S.items.filter(i => i.id !== id); emit();
}
export function errMsg(e) {
  const m = (e && (e.message || e.details)) || '';
  if (/direction/i.test(m) || /valid/i.test(m)) return m;
  if (/row-level|permission|policy/i.test(m)) return 'Action non autorisée pour votre rôle.';
  if (/fetch|network/i.test(m)) return 'Connexion impossible. Vérifiez votre réseau puis réessayez.';
  return 'Enregistrement impossible. Réessayez dans un instant.';
}
export async function journal(itemId) {
  const { data } = await sb.from('comm_journal').select('*').eq('item_id', itemId).order('cree_le', { ascending: false });
  return data || [];
}
export async function addJournal(itemId, type, texte, details = {}) {
  const { data, error } = await sb.from('comm_journal').insert({ item_id: itemId, type, texte, details, auteur: S.user.email }).select().single();
  if (error) { toast(errMsg(error), 'alert'); throw error; }
  return data;
}
export const memberName = email => { const m = S.members.find(x => (x.email || '').toLowerCase() === (email || '').toLowerCase()); return m && m.nom ? m.nom : (email || '').split('@')[0]; };
export const isDirection = () => S.role === 'direction' || S.role === 'admin';
export const canCreate = () => S.role === 'responsable' || S.role === 'admin';

/* ---------- settings (rules levels, objectives) ---------- */
export const DEFAULT_SETTINGS = {
  rythme: { energies: { linkedin: 2, instagram: 3 }, transport: { linkedin: 2, instagram: 2 }, granules: { linkedin: 1, instagram: 3 }, groupe: { linkedin: 1, instagram: 0 } },
  severite: 1,
  seuils: {
    linkedin: { min: 500, max: 1600, coupe: 210, hashMin: 3, hashMax: 5 },
    instagram: { min: 250, max: 1500, coupe: 125, hashMin: 5, hashMax: 15 },
    phraseMax: 22, accrocheMax: 14, paraMax: 4, lisibiliteCible: 55, exclamMax: 2
  },
  poids: null,
  equilibre: { min: 15, max: 55 }
};
export function settings() {
  const it = byKind('reglages')[0];
  const d = clone(DEFAULT_SETTINGS);
  if (!it) return d;
  const s = it.data || {};
  return { ...d, ...s, rythme: { ...d.rythme, ...(s.rythme || {}) }, seuils: { ...d.seuils, ...(s.seuils || {}), linkedin: { ...d.seuils.linkedin, ...((s.seuils || {}).linkedin || {}) }, instagram: { ...d.seuils.instagram, ...((s.seuils || {}).instagram || {}) } }, equilibre: { ...d.equilibre, ...(s.equilibre || {}) } };
}
export async function saveSettings(data) {
  const it = byKind('reglages')[0];
  return saveItem({ ...(it || { kind: 'reglages', marque: 'groupe', titre: 'Réglages' }), data });
}

/* =========================================================
   UI PRIMITIVES
   ========================================================= */
export function animOut(el, y = -6, d = 180) {
  if (!el || el.hidden) return Promise.resolve();
  el.getAnimations().forEach(a => a.cancel());
  return el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${RM ? 0 : y}px)` }], { duration: RM ? 140 : d, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).done;
}
export function stagger(scope, sel = '[data-st]') {
  $$(sel, scope).filter(k => !k.hidden).slice(0, 10).forEach((k, i) => k.animate([{ opacity: 0, transform: `translateY(${RM ? 0 : 14}px)` }, { opacity: 1, transform: 'none' }], { duration: RM ? 200 : 520, delay: RM ? 0 : 40 + i * 50, easing: EASE, fill: 'backwards' }));
}
export async function swap(el, html, { y = 8, after } = {}) {
  const tok = (el._tok || 0) + 1; el._tok = tok;
  const h0 = el.getBoundingClientRect().height;
  await el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${RM ? 0 : -y / 2}px)` }], { duration: RM ? 110 : 150, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).done;
  if (el._tok !== tok) return;
  el.innerHTML = html; el.getAnimations().forEach(a => a.cancel());
  if (after) after(el);
  const h1 = el.getBoundingClientRect().height;
  if (Math.abs(h1 - h0) > 2 && !RM) { el.style.overflow = 'hidden'; el.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 380, easing: EASE }).done.then(() => { if (el._tok === tok) el.style.overflow = ''; }); }
  el.animate([{ opacity: 0, transform: `translateY(${RM ? 0 : y}px)` }, { opacity: 1, transform: 'none' }], { duration: RM ? 200 : 400, delay: RM ? 0 : 40, easing: EASE, fill: 'backwards' });
}
export function place(p, b, instant) {
  if (!p) return; if (!b || !b.offsetParent) { p.style.opacity = 0; return; }
  if (instant) p.classList.add('no-tr');
  p.style.width = b.offsetWidth + 'px'; p.style.height = b.offsetHeight + 'px'; p.style.transform = `translate(${b.offsetLeft}px,${b.offsetTop}px)`; p.style.opacity = 1;
  if (instant) { void p.offsetWidth; p.classList.remove('no-tr'); }
}
export function setupGlide(box, sel = 'button') {
  if (box._g) return; box._g = 1;
  const g = document.createElement('span'); g.className = 'glider'; box.prepend(g); let shown = false;
  box.addEventListener('pointerover', e => { const b = e.target.closest(sel); if (!b || !box.contains(b) || !FINE) return; if (b.classList.contains('on') && box._ind) { g.style.opacity = 0; shown = false; return; } place(g, b, !shown); shown = true; });
  box.addEventListener('pointerleave', () => { g.style.opacity = 0; shown = false; });
}
export function setupInd(box) { if (!box._ind) { const p = document.createElement('span'); p.className = 'ind'; box.prepend(p); box._ind = p; } return box._ind; }
/* segmented control: items = [[value,label,iconOrColor]] */
export function seg(box, items, active, onPick, { dots } = {}) {
  box.innerHTML = items.map(([v, l, x]) => `<button type="button" data-v="${esc(v)}" class="${v === active ? 'on' : ''}" role="tab" aria-selected="${v === active}">${dots ? `<i class="dot" style="background:${x}"></i>` : x ? ic(x) : ''}<span>${esc(l)}</span></button>`).join('');
  box._ind = null; box._g = 0; setupInd(box); setupGlide(box);
  requestAnimationFrame(() => place(box._ind, $('button.on', box), true));
  box.onclick = e => { const b = e.target.closest('button[data-v]'); if (!b || b.classList.contains('on')) return; segSet(box, b.dataset.v); onPick(b.dataset.v); };
}
export function segSet(box, v) {
  $$('button[data-v]', box).forEach(b => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  const b = $(`button[data-v="${CSS.escape(v)}"]`, box); place(box._ind, b, false);
  if (box.classList.contains('scroll') && b) box.scrollTo({ left: b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth' });
}
export function replaceInd(scope = document) { $$('.seg,.tabs', scope).forEach(b => { if (b._ind) place(b._ind, $('button.on', b), true); }); }
addEventListener('resize', () => replaceInd());

/* magnetic buttons */
let magEl = null;
if (FINE) {
  document.addEventListener('pointermove', e => {
    const el = e.target.closest('.btn,.icon-btn,.mag'); if (el !== magEl) { if (magEl) magEl.style.transform = ''; magEl = el; } if (!el) return;
    const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
    if (el.classList.contains('mag') && !RM) el.style.transform = `translate(${((x / r.width - .5) * 8).toFixed(2)}px,${((y / r.height - .5) * 6).toFixed(2)}px)`;
  }, { passive: true });
}
document.addEventListener('pointerdown', e => { const b = e.target.closest('.btn,.icon-btn'); if (!b) return; b.classList.add('pressed'); const up = () => { b.classList.remove('pressed'); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); }; addEventListener('pointerup', up); addEventListener('pointercancel', up); });

let toastT;
export function toast(m, i = 'check') { const t = $('#toast'); t.innerHTML = ic(i) + `<span>${esc(m)}</span>`; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }

/* modal : returns {el, close} */
export function modal(html, { wide, top, onClose } = {}) {
  const ov = document.createElement('div'); ov.className = 'overlay' + (top ? ' top' : '');
  ov.innerHTML = `<div class="modal glass ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  $('#layer').appendChild(ov);
  const m = $('.modal', ov);
  ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: EASE });
  m.animate([{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 440, easing: EASE });
  let closed = false;
  const close = async () => {
    if (closed) return; closed = true; removeEventListener('keydown', key);
    m.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(10px) scale(.98)' }], { duration: 200, fill: 'forwards' });
    await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).done;
    ov.remove(); onClose && onClose();
  };
  const key = e => { if (e.key === 'Escape' && $('#layer').lastElementChild === ov) close(); };
  addEventListener('keydown', key);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
  setTimeout(() => { const f = $('input,textarea,select', m); if (f) f.focus({ preventScroll: true }); }, 180);
  return { el: m, close };
}
export function confirmBox(title, text, { ok = 'Confirmer', danger } = {}) {
  return new Promise(res => {
    let r = false;
    const { el, close } = modal(`<div class="modal-head"><div><h2>${esc(title)}</h2><p>${esc(text)}</p></div></div><div class="modal-foot"><button class="btn ghost" data-close>Annuler</button><button class="btn ${danger ? 'danger' : ''}" data-ok>${esc(ok)}</button></div>`, { onClose: () => res(r) });
    $('[data-ok]', el).onclick = () => { r = true; close(); };
  });
}

/* theme : circular wave from top-right */
export function syncThemeLabel() { const b = $('#themeBtn'); if (b) b.setAttribute('aria-label', root.dataset.theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'); }
export function setTheme(next) {
  if (next === root.dataset.theme) return;
  const apply = () => { root.dataset.theme = next; store.set('hy-theme', next); syncThemeLabel(); };
  if (!document.startViewTransition || RM) { root.classList.add('soft-swap'); apply(); setTimeout(() => root.classList.remove('soft-swap'), 760); return; }
  root.classList.add('vt-theme');
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => { const r = Math.hypot(innerWidth, innerHeight); root.animate({ clipPath: ['circle(0px at 100% 0%)', `circle(${r}px at 100% 0%)`] }, { duration: 950, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }); }).catch(() => {});
  vt.finished.catch(() => {}).finally(() => root.classList.remove('vt-theme'));
}
export function logoHTML(b = root.dataset.brand) {
  return `<img class="on-light" src="assets/${b}-light.svg" alt="${esc(BRANDS[b].nom)}"><img class="on-dark" src="assets/${b}-dark.svg" alt="" aria-hidden="true">`;
}
export function brandDot(b) { return `<i class="bdot" style="background:${BRANDS[b] ? BRANDS[b].color : '#999'}" title="${esc(BRANDS[b] ? BRANDS[b].nom : '')}"></i>`; }
export function ring(value, max, label, { lg } = {}) {
  const C = 2 * Math.PI * 42, p = max ? Math.min(1, value / max) : 0;
  return `<div class="ring ${lg ? 'lg' : ''}"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="42"/><circle class="val" cx="50" cy="50" r="42" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-off="${(C - C * p).toFixed(1)}"/></svg><div class="c"><div><b>${esc(String(value))}${max && max !== 100 ? `<small style="font-size:.5em;color:var(--muted)">/${max}</small>` : ''}</b><span>${esc(label)}</span></div></div></div>`;
}
export function animateRings(scope) { requestAnimationFrame(() => requestAnimationFrame(() => $$('.ring .val[data-off]', scope).forEach(c => { c.style.strokeDashoffset = c.dataset.off; }))); }
export function animateBars(scope) { $$('.bar i[data-w]', scope).forEach(b => { b.style.width = '0'; }); requestAnimationFrame(() => requestAnimationFrame(() => $$('.bar i[data-w]', scope).forEach(b => { b.style.width = b.dataset.w; }))); }
export const uid = () => Math.random().toString(36).slice(2, 10);
export function download(name, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type }); const a = document.createElement('a'); const u = URL.createObjectURL(blob);
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
