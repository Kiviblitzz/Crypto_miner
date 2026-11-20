// Finale-Sequenz (Sieg über MONOLITH / Verkauf an Kral), Neues Spiel+ und Endlosziele im Ziel-Panel
import { fmtUSD, fmtHash, fmtDate, fmtWatt, fmtCoin } from '../sim/game.js';
import { toDay } from '../data/history.js';
import { EVENT } from '../data/events.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { kralCall, KRAL_REPLIES, chronicle, epilog, soldLead, whatIf, CREDITS, REL_LABEL, playerAge } from '../data/finale.js';
import { ENDLESS_GOALS, EGOAL } from '../data/endless.js';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (x) => (x * 100).toPrecision(3).replace('.', ',');
const AV = { papa: 'P', mama: 'M', opa: 'O', deniz: 'D' };

// ---------- Kennzahlen ----------
function facts(g, mode, usd) {
  const s = g.s, sha = g.algoHash('sha256'), net = g.netHash('BTC');
  const years = ((s.day - toDay('2010-10-01')) / 365.25).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  const devs = s.unlocked.reduce((n, id) => n + s.fac[id].objects.reduce((k, o) => k + (o.items ? o.items.length : 1), 0), 0);
  const dec = (s.ev?.log || []).filter((e) => EVENT[String(e.id).split(':')[0]]).length;
  const ach = Object.keys(s.ach || {}).length;
  const rows = [
    ['Spielzeit', `${years} Jahre`], ['Hashrate', `${fmtHash(sha)} · ${pct(sha / net)} % des Netzes`],
    [mode === 'sold' ? 'Verkaufspreis' : 'Vermögen', fmtUSD(mode === 'sold' ? usd : g.netWorth())], ['Geräte · Standorte', `${devs.toLocaleString('de-DE')} · ${s.unlocked.length}`],
    ['Insgesamt geschürft', fmtUSD(s.stats.minedUSD)], ['Stromkosten', fmtUSD(s.stats.elec)],
    ['Entscheidungen', dec.toLocaleString('de-DE')], ['Erfolge', `${ach} von ${ACHIEVEMENTS.length}`],
  ];
  return `<div class="fin-facts">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
}

// ---------- Seiten ----------
function pageCall(ui, mode, usd, done) {
  const g = ui.g, s = g.s;
  const lines = kralCall(s, mode).map((l, i) => `<p class="fc-l" style="animation-delay:${0.35 + i * 0.55}s">„${esc(l)}“</p>`).join('');
  const head = mode === 'sold'
    ? `<div class="ch">Ende · Verkauft</div><div class="fin-hero">${esc(fmtUSD(usd))}</div><p class="fin-lead">${esc(soldLead(s, usd))}</p>`
    : `<div class="ch">Finale · ${fmtDate(s.day)}</div><div class="fin-hero">MONOLITH überholt!</div><p class="fin-lead">Hashwerk rechnet mit <b>${fmtHash(g.algoHash('sha256'))}</b> – mehr als MONOLITH, mehr als jeder andere. Dann klingelt dein Handy. Unbekannte Nummer, Vorwahl Zug.</p>`;
  const n = h(`<div>${head}<div class="fin-call"><div class="fc-head"><span class="fc-av">K</span><div><b>Viktor Kral</b><small>${s.ev?.done?.kralki ? 'KRAL Compute' : 'MONOLITH Hash AG'}${mode === 'sold' ? '' : ' · Anruf'}</small></div><span class="fc-dot"></span></div><div class="fc-lines">${lines}</div></div><div class="fin-reply"></div></div>`);
  const box = n.querySelector('.fin-reply');
  if (mode === 'sold') { done(true); return n; }
  KRAL_REPLIES.forEach((r, i) => {
    const b = h(`<button class="btn ${i ? '' : 'primary'}">${esc(r.label)}</button>`);
    b.onclick = () => { s.fin.kralReply = i + 1; box.innerHTML = `<p class="fin-react">${esc(r.react(s))}</p>`; done(true); };
    box.append(b);
  });
  if (s.fin.kralReply) { box.innerHTML = `<p class="fin-react">${esc(KRAL_REPLIES[s.fin.kralReply - 1].react(s))}</p>`; done(true); } else done(false);
  return n;
}
function pageChronicle(ui, mode, usd) {
  const g = ui.g, s = g.s;
  const list = chronicle(s, EVENT, 10);
  return h(`<div><div class="ch">Deine Geschichte</div><ol class="fin-chron">${list.map((e) => `<li><span class="d">${fmtDate(e.d)}</span><span class="t">${esc(e.t)}</span></li>`).join('')}</ol>${facts(g, mode, usd)}</div>`);
}
function pageFamily(ui, mode) {
  const s = ui.g.s, list = epilog(s, mode);
  return h(`<div><div class="ch">Familie Brandt · Lindental</div><div class="fin-fam">${list.map((p) => `<div class="ff"><span class="ff-av t${p.tier}">${AV[p.who]}</span><div><div class="ff-n"><b>${esc(p.name)}</b><small>${REL_LABEL[p.tier]}</small></div><p>${esc(p.text)}</p></div></div>`).join('')}</div></div>`);
}
function pageWhatIf(ui) {
  const w = whatIf(ui.g), [top, ...rest] = w;
  return h(`<div><div class="ch">Was wäre wenn …</div><div class="fin-wi"><div class="wi-big">${esc(top.big)}</div><p>${esc(top.text)}</p></div>${rest.slice(0, 2).map((x) => `<p class="wi-more">${esc(x.text)}</p>`).join('')}<p class="wi-note">Kurs heute: ${esc(fmtUSD(ui.g.price('BTC')))} pro Bitcoin.</p></div>`);
}
function pageCredits(ui, mode) {
  const s = ui.g.s;
  return h(`<div class="fin-credits"><div class="ch">Abspann</div><div class="cr-logo">HASH<span>WERK</span></div><div class="cr-sub">Vom Kinderzimmer zum Rechenzentrum · 01.10.2010 – ${fmtDate(s.day)}</div>
    ${CREDITS.map(([k, v], i) => `<div class="cr-row" style="animation-delay:${0.2 + i * 0.35}s"><small>${esc(k)}</small><span>${esc(v)}</span></div>`).join('')}
    <div class="cr-thanks" style="animation-delay:${0.3 + CREDITS.length * 0.35}s">Danke fürs Spielen.</div><div class="fin-end"></div></div>`);
}

// ---------- Ablauf ----------
export function showFinale(ui, mode = 'won', usd = 0) {
  const g = ui.g, s = g.s;
  if (mode === 'won') g.markWon();
  const pages = [
    (done) => pageCall(ui, mode, usd, done), () => pageChronicle(ui, mode, usd), () => pageFamily(ui, mode), () => pageWhatIf(ui), () => pageCredits(ui, mode),
  ];
  const root = h(`<div class="story finale"><div class="fin-steps">${pages.map(() => '<i></i>').join('')}</div><div class="fin-body"></div><div class="fin-nav"><button class="btn" data-a="back">Zurück</button><button class="btn primary" data-a="next">Weiter</button></div></div>`);
  const body = root.querySelector('.fin-body'), back = root.querySelector('[data-a=back]'), next = root.querySelector('[data-a=next]');
  let idx = 0;
  const render = () => {
    root.querySelectorAll('.fin-steps i').forEach((d, i) => d.classList.toggle('on', i <= idx));
    body.innerHTML = '';
    next.disabled = false; next.classList.remove('hidden'); back.classList.toggle('hidden', idx === 0);
    const node = pages[idx]((ok) => { next.disabled = !ok; next.classList.toggle('glow', !!ok && idx === 0); });
    body.append(node);
    if (idx === pages.length - 1) { next.classList.add('hidden'); endButtons(ui, mode, usd, node.querySelector('.fin-end')); }
    root.closest('.modal-card')?.scrollTo?.(0, 0);
  };
  back.onclick = () => { if (idx > 0) { idx--; render(); } };
  next.onclick = () => { if (idx < pages.length - 1) { idx++; render(); } };
  ui.openModal(root, 'narrow finale', 'story');
  // Schließen ohne Wahl: beim Sieg einfach weiterspielen, beim Verkauf den Vertrag zerreißen
  ui.onModalClose = mode === 'sold' ? () => { g.tearContract(); ui.toast('Vertrag zerrissen – Hashwerk bleibt in Lindental.', 'good', 6000); } : null;
  render();
  ui.audio?.fanfare?.();
}
function endButtons(ui, mode, usd, box) {
  const g = ui.g;
  const keep = h(`<button class="btn ${mode === 'won' ? 'primary' : ''} big">${mode === 'won' ? 'Endlos weiterspielen' : 'Doch weiterspielen'}</button>`);
  const ngp = h(`<button class="btn ${mode === 'won' ? '' : 'primary'} big">Neues Spiel+</button>`);
  const note = h(`<p class="fin-ngp">${mode === 'won' ? 'Endlos: neue Miner-Generationen, neue Ziele, kein Ende.' : 'Weiterspielen: Du zerreißt den Vertrag, Hashwerk bleibt deins.'}<br/><b>Neues Spiel+</b>: zurück in den Oktober 2010 – mit Opas Werkzeugkiste (alle Hardware dauerhaft 10 % billiger).</p>`);
  keep.onclick = () => { ui.onModalClose = null; if (mode === 'sold') { g.tearContract(); ui.toast('Du zerreißt den Vertrag. Deniz jubelt.', 'good', 6000); } ui.closeModal(); ui.goals?.(); };
  ngp.onclick = () => {
    if (!ngp.dataset.armed) { ngp.dataset.armed = '1'; ngp.textContent = 'Sicher? Spielstand wird überschrieben'; setTimeout(() => { if (ngp.isConnected) { delete ngp.dataset.armed; ngp.textContent = 'Neues Spiel+'; } }, 4500); return; }
    startNewGamePlus(ui, mode);
  };
  box.append(h('<div class="row fin-btns"></div>')); box.firstElementChild.append(keep, ngp); box.append(note);
}

// ---------- Neues Spiel+ ----------
export function startNewGamePlus(ui, ending) {
  const g = ui.g; ui.onModalClose = null; ui.closeModal();
  g.newGamePlus(ending); g.save();
  ui.w.setMode('ui'); ui.switchSite('kinder'); ui.w.syncLoose?.(); ui.speedBar(); ui.ticker();
  const p = g.s.fin.prev || {};
  const last = p.ending === 'sold' ? `Beim letzten Mal hast du Hashwerk am ${fmtDate(p.day)} an Kral verkauft.` : p.won ? `Beim letzten Mal hast du MONOLITH am ${fmtDate(p.won)} überholt.` : '';
  ui.story(`Neues Spiel+ ${g.s.ngPlus > 1 ? g.s.ngPlus : ''}`.trim(), `Oktober 2010, Lindental. Auf deinem Schreibtisch steht eine verbeulte Blechkiste mit einem Zettel: <i>„Für den Jungen. Gutes Werkzeug spart Geld. – Opa“</i><br/><br/><b>Opas Werkzeugkiste:</b> Alle Hardware kostet dauerhaft 10 % weniger.${last ? `<br/><br/><span style="color:var(--dim)">${esc(last)}</span>` : ''}`, 'Ab ins Jahr 2010');
  ui.onModalClose = () => setTimeout(() => ui.introPhone(() => { ui.setSpeed(1); ui.keysHint(); ui.tutorial(); }), 60);
}

// ---------- Endlosziele im Ziel-Panel ----------
function fmtProg(cur, tgt, kind) {
  if (kind === 'wait') return [`noch ${Math.max(0, Math.round(cur)).toLocaleString('de-DE')} Tage`, null];
  const f = { hash: fmtHash, usd: fmtUSD, watt: fmtWatt, btc: (v) => `${fmtCoin(v)} BTC`, days: (v) => `${Math.round(v)} Tage`, count: (v) => String(Math.round(v)) }[kind] || String;
  return [`${f(Math.max(0, cur))} / ${f(tgt)}`, Math.max(0, Math.min(100, tgt ? (cur / tgt) * 100 : 0))];
}
function egoalRow(ui, go, kicker) {
  const g = ui.g, s = g.s, st = (s.egoals.st[go.id] ||= {});
  const txt = typeof go.text === 'function' ? go.text(s, g, st) : go.text;
  const sub = go.sub ? go.sub(s, g, st) : '';
  let prog = '';
  if (go.progress) { const [a, pc] = fmtProg(...go.progress(s, g, st)); prog = `<div class="eg-prog">${esc(a)}</div>${pc != null ? `<div class="bar" style="width:180px"><div style="width:${pc}%;background:#ffb000"></div></div>` : ''}`; }
  const row = h(`<div class="goal egoal${go.action ? ' invest' : ''}"><div class="ck"></div><div><div class="eg-k">${esc(kicker)}</div>${esc(txt)}${prog}${sub ? `<div class="eg-sub">${esc(sub)}</div>` : ''}</div></div>`);
  if (go.action) { const b = h(`<button class="btn small primary"><kbd>G</kbd>${esc(go.action.label)}</button>`); b.disabled = !g.canAfford(go.action.cost); b.onclick = () => egoalKey(ui, go); row.lastElementChild.append(b); }
  return row;
}
export function endlessGoals(ui, el) {
  const g = ui.g, s = g.s; if (!s.egoals) { el.append(h('<div class="goal"><div class="ck"></div><div>Endlosmodus · wachs weiter</div></div>')); return; }
  const nDone = ENDLESS_GOALS.filter((x) => s.egoals.done[x.id]).length;
  const go = g.endlessGoal(), inv = g.endlessInvest();
  if (!go) { el.append(h(`<div class="goal egoal done-all"><div class="ck">✓</div><div>Alle Endlosziele geschafft<div class="eg-sub">Hashwerk ist Legende. Spiel weiter, so lange du magst.</div></div></div>`)); return; }
  el.append(egoalRow(ui, go, `Endlosziel ${nDone + 1} von ${ENDLESS_GOALS.length}`));
  if (inv && inv !== go) el.append(egoalRow(ui, inv, 'Investition'));
}
export function egoalKey(ui, pick = null) {
  const g = ui.g, cur = g.endlessGoal?.(), go = pick || (cur?.action ? cur : g.endlessInvest?.());
  if (!go?.action) { ui.toast('Nichts zu bezahlen.', 'info', 2000); return false; }
  if (!g.canAfford(go.action.cost)) { ui.toast(`Du brauchst ${fmtUSD(go.action.cost)}.`, 'bad'); return false; }
  if (g.endlessAction(go.id)) { ui.audio?.cash?.(); ui.goals(); ui.top?.(); return true; }
  return false;
}
// Endlosziel erreicht: Meilenstein, bei Stiftung/KRAL eine eigene Karte
export function egoalDone(ui, id) {
  const g = ui.g, s = g.s, go = EGOAL[id]; if (!go) return;
  const txt = typeof go.text === 'function' ? go.text(s, g, s.egoals.st[id] || {}) : go.text;
  ui.goals?.();
  if (go.card === 'stiftung') return setTimeout(() => stiftungCard(ui), 300);
  if (go.card === 'kral') return setTimeout(() => kralCard(ui), 300);
  ui.milestone(go.action ? 'Investition' : 'Endlosziel geschafft', txt);
}
function stiftungCard(ui) {
  const s = ui.g.s, r = s.rel || {}, age = new Date(s.day * 864e5).getUTCFullYear() - 1938;
  const L = [
    r.opa >= 3 ? `Die „Heinz-Brandt-Lehrwerkstatt“ bildet jedes Jahr zwanzig Elektrikerinnen und Elektriker aus. Opa (${age}) kommt jeden Dienstag und prüft die Kabelführung.` : 'Die neue Lehrwerkstatt trägt Opas Namen. Er hat sich lautstark beschwert – und dann doch die Eröffnungsrede gehalten.',
    r.papa >= 3 ? 'In jedem Ortsteil gibt es jetzt ein Reparatur-Café. Papa hat jede Werkbank selbst ausgesucht.' : 'Papa sitzt im Stiftungsrat und stimmt in jeder Sitzung für „mehr Lötkolben“.',
    r.mama >= 3 ? 'Der Schulgarten wird mit Abwärme aus der alten Werkstatt beheizt. Mama verteilt im Januar Tomaten.' : 'Mama hat die Stiftung erst für einen Scherz gehalten. Jetzt macht sie die Buchhaltung, „damit das ordentlich wird“.',
    'Im alten Kino gibt es einen Hackerspace mit dreißig Lötplätzen. Am Eingang steht eine Milchkiste mit zwei alten Grafikkarten. Deniz hat sie dort hingestellt.',
  ];
  const n = h(`<div class="story finale"><div class="ch">Epilog · ${fmtDate(s.day)}</div><div class="fin-hero">Die Lindental-Stiftung</div><p class="fin-lead">50 Millionen Dollar für die Stadt, in der alles mit einem alten PC unterm Dach anfing.</p><div class="fin-fam">${L.map((t, i) => `<div class="ff"><span class="ff-av t2">${'OPMD'[i]}</span><div><p>${esc(t)}</p></div></div>`).join('')}</div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn primary">Weiter</button></div></div>`);
  n.querySelector('button').onclick = () => ui.closeModal();
  ui.audio?.fanfare?.(); ui.openModal(n, 'narrow finale', 'story');
}
function kralCard(ui) {
  const g = ui.g, s = g.s;
  const n = h(`<div class="story finale"><div class="ch">Letztes Endlosziel · ${fmtDate(s.day)}</div><div class="fin-hero">KRAL Compute überholt</div>
    <div class="fin-call"><div class="fc-head"><span class="fc-av">K</span><div><b>Viktor Kral</b><small>KRAL Compute · Anruf</small></div><span class="fc-dot"></span></div><div class="fc-lines">
    <p class="fc-l" style="animation-delay:.3s">„Brandt. Sie schon wieder.“</p><p class="fc-l" style="animation-delay:.9s">„Ich habe meine Firma umbenannt, die Branche gewechselt und drei Rechenzentren gebaut. Und Sie überholen mich mit einer Halle am Fjord.“</p><p class="fc-l" style="animation-delay:1.5s">„Ich gebe auf. Nein – ich gratuliere. Das ist neu für mich.“</p></div></div>
    <p class="fin-lead">Alle Endlosziele geschafft. Du bist ${playerAge(s.day)}, und Hashwerk ist Legende. Spiel weiter, so lange du magst.</p>
    <div class="row fin-btns"><button class="btn primary big">Weiterspielen</button><button class="btn big">Abspann</button></div></div>`);
  const [a, b] = n.querySelectorAll('.fin-btns button');
  a.onclick = () => ui.closeModal();
  b.onclick = () => { ui.closeModal(); const c = h('<div class="story finale"></div>'); const pc = pageCredits(ui, 'won'); c.append(pc); const box = pc.querySelector('.fin-end'); const btn = h('<div class="row fin-btns"><button class="btn primary big">Weiterspielen</button></div>'); btn.querySelector('button').onclick = () => ui.closeModal(); box.append(btn); ui.openModal(c, 'narrow finale', 'story'); };
  ui.audio?.fanfare?.(); ui.openModal(n, 'narrow finale', 'story');
}
