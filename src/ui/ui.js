// DOM-Oberfläche: Topbar, Standorte, Baumenü, Inspektor, Ziele, Dock, Modals (Markt, Handy, Firma, Rangliste, Menü)
import { COINS, COIN, ALGO_LABEL } from '../data/coins.js';
import { PLACEABLE, PART, CATEGORIES, PLACEABLES, PARTS } from '../data/hardware.js';
import { FACILITIES, FACILITY, CHAPTERS, TECHS } from '../data/world.js';
import { fmtUSD, fmtNum, fmtCoin, fmtHash, fmtDate, fmtWatt } from '../sim/game.js';
import { toDay, BTC_HASH } from '../data/history.js';

const $ = (s) => document.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SPEEDS = [{ l: '⏸', v: 0 }, { l: '▶', v: 1 }, { l: '▶▶', v: 2 }, { l: '▶▶▶', v: 3 }, { l: '⏩', v: 4 }];
const FACE = { Deniz: '🎮', Mama: '👩', Papa: '👨‍🔧', 'Opa Heinz': '👴', 'Viktor Kral': '🕴️' };

export class UI {
  constructor(game, world) {
    this.g = game; this.w = world; this.cat = 'rigs'; this.marketCoin = 'BTC'; this.lastBuildDay = -1;
    this.dock(); this.speedBar();
    world.onSelect = (uid) => this.inspect(uid);
    world.onHover = (uid, pos) => this.tip(uid, pos);
    world.onFPError = () => this.toast('Der Rundgang braucht Maus-Steuerung (Pointer Lock) – auf diesem Gerät nicht verfügbar.', 'bad');
    world.onPlacing = (on) => this.hint(on ? 'Linksklick = platzieren · R = drehen · Shift = mehrfach · Rechtsklick/ESC = abbrechen' : null);
    world.onFP = (on) => { this.hint(on ? 'Rundgang: WASD laufen · Shift = rennen · Maus = umsehen · Klick = Gerät ansehen · ESC = zurück' : null); $('#crosshair').classList.toggle('hidden', !on); };
    $('#modal .modal-x').onclick = () => this.closeModal();
    $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    game.on('toast', (t, k, ms) => this.toast(t, k, ms));
    game.on('message', (m) => { this.toast(`${FACE[m.from] || '💬'} <b>${esc(m.from)}:</b> ${esc(m.text.length > 90 ? m.text.slice(0, 88) + '…' : m.text)}`, 'msg', 7000); this.dock(); });
    game.on('news', () => this.ticker());
    game.on('milestone', (t, sub) => this.milestone(t, sub));
    game.on('release', (it, text) => { this.toast(`🆕 ${esc(text)}`, 'info', 6000); this.ticker(); this.lastBuildDay = -99; });
    game.on('update', () => this.onDay());
    game.on('refresh', () => this.refresh());
    game.on('unlockable', (id) => { this.toast(`🔓 Neuer Standort verfügbar: <b>${FACILITY[id].name}</b> – siehe Ziele unten links`, 'good', 8000); this.goals(); this.sites(); });
    setInterval(() => this.top(), 200);
    this.refresh(); this.ticker();
  }

  refresh() { this.top(); this.sites(); this.build(true); this.goals(); this.dock(); if (this.inspUid) this.inspect(this.inspUid, true); }
  onDay() {
    this.sites(); this.goals();
    for (const t of TECHS) if (toDay(t.date) === this.g.s.day) { this.toast(`🔬 Neue Technologie verfügbar: <b>${esc(t.name)}</b>`, 'good', 7000); this.dock(); }
    if (this.g.s.day % 7 === 0) this.dock();
    if (this.g.s.day - this.lastBuildDay >= 7) this.build(true);
    if (this.inspUid) this.inspectStats();
    if (this.modalKind === 'market') this.market(true);
    if (this.modalKind === 'ranking') this.ranking();
    if (this.modalKind === 'company') this.company();
  }

  // ---------- Topbar ----------
  speedBar() {
    const el = $('#speed'); el.innerHTML = '';
    SPEEDS.forEach((s) => { const b = h(`<button title="Tempo ${s.v}">${s.l}</button>`); b.onclick = () => this.setSpeed(s.v); el.append(b); });
    this.setSpeed(this.g.s.speed ?? 0);
  }
  setSpeed(v) { this.g.s.speed = v; this.g.s.paused = v === 0; [...$('#speed').children].forEach((b, i) => b.classList.toggle('on', SPEEDS[i].v === v)); }
  top() {
    const g = this.g, s = g.s;
    const hr = Math.floor(s.frac * 24), mi = Math.floor((s.frac * 24 - hr) * 60);
    $('#date').innerHTML = `📅 ${fmtDate(s.day, true)}<span class="tod">${String(hr).padStart(2, '0')}:${String(mi).padStart(2, '0')}</span>`;
    const p = g.dailyProfit();
    const btc = g.price('BTC'), btc7 = g.price('BTC', s.day - 7) || btc;
    const ch = ((btc / btc7 - 1) * 100);
    let sh = g.algoHash('sha256'), shAlgo = 'sha256';
    if (!sh) { for (const a of ['scrypt', 'ethash', 'kawpow', 'kheavy', 'equihash', 'rx', 'cn']) { const v = g.algoHash(a); if (v) { sh = v; shAlgo = a; break; } } }
    const smc = g.summary[s.current]; $('#heat').classList.toggle('on', !!smc && smc.temp > 38 && !smc.tripped);
    $('#st-cash').innerHTML = `<div class="l">Kontostand</div><div class="v ${s.cash < 0 ? 'neg' : ''}">${fmtUSD(s.cash)}</div>`;
    $('#st-nw').innerHTML = `<div class="l">Vermögen</div><div class="v">${fmtUSD(g.netWorthFast())}</div>`;
    $('#st-profit').innerHTML = `<div class="l">Gewinn / Tag</div><div class="v ${p.net >= 0 ? 'pos' : 'neg'}">${p.net >= 0 ? '+' : ''}${fmtUSD(p.net)}</div>`;
    $('#st-btc').innerHTML = `<div class="l">Bitcoin</div><div class="v">${fmtUSD(btc)} <small class="${ch >= 0 ? 'pos' : 'neg'}">${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(1)}%</small></div>`;
    $('#st-hash').innerHTML = `<div class="l">${ALGO_LABEL[shAlgo]} Hashrate</div><div class="v">${fmtHash(sh, shAlgo)}</div>`;
  }

  // ---------- Standorte ----------
  sites() {
    const el = $('#sites'); el.innerHTML = '';
    const g = this.g;
    for (const f of FACILITIES) {
      const un = g.s.unlocked.includes(f.id);
      const sm = g.summary[f.id] || (un ? g.facSummary(f.id) : null);
      if (!un) {
        if (g.canUnlock(f.id)) { const b = h(`<div class="site" title="Freischalten"><div class="n">🔓 ${f.short}</div><div class="m">${fmtUSD(f.cost)} · freischalten</div></div>`); b.onclick = () => this.company(); el.append(b); }
        else if (f.tier === g.s.unlocked.length) el.append(h(`<div class="site locked"><div class="n">🔒 ${f.short}</div><div class="m">${esc(f.place.split(',')[0])}</div></div>`));
        continue;
      }
      const kw = sm.watt / 1000, cap = sm.capKw, pct = Math.min(100, (kw / cap) * 100);
      const b = h(`<div class="site ${g.s.current === f.id ? 'on' : ''}"><div class="n">${f.tier === 0 ? '🛏️' : f.tier === 1 ? '🧺' : f.tier === 2 ? '🔧' : f.tier === 3 ? '🏭' : f.tier === 4 ? '🏢' : '🏔️'} ${f.short} ${sm.tripped ? '⚡' : ''}</div>
        <div class="m"><span>${kw < 10 ? kw.toFixed(2) : kw.toFixed(0)}/${cap} kW</span><span class="${sm.temp > 38 ? 'neg' : ''}">${sm.temp.toFixed(1)} °C</span></div>
        <div class="bar ${pct > 90 ? 'hot' : ''}"><div style="width:${pct}%"></div></div></div>`);
      b.onclick = () => { if (g.s.current !== f.id) this.switchSite(f.id); };
      el.append(b);
    }
    const br = g.brokenIn(g.s.current);
    if (br.n) { const b = h(`<div class="site fix" title="Alle defekten Geräte hier reparieren"><div class="n">🔧 ${br.n} defekt</div><div class="m">Alle reparieren: ${fmtUSD(br.c)}</div></div>`); b.onclick = () => { const n = g.repairAll(g.s.current); this.toast(n ? `🔧 ${n} Gerät(e) repariert` : 'Nicht genug Geld.', n ? 'good' : 'bad'); this.sites(); }; el.append(b); }
  }
  switchSite(id, cinematic = false) { this.g.s.current = id; this.w.loadFacility(id, { cinematic }); this.inspect(null); this.refresh(); }

  // ---------- Baumenü ----------
  build(force = false) {
    const el = $('#build'), g = this.g, fac = g.s.current;
    if (!force && el.childElementCount) return;
    this.lastBuildDay = g.s.day;
    el.innerHTML = '';
    const cats = h('<div class="cats"></div>');
    for (const c of CATEGORIES) { const b = h(`<button class="${this.cat === c.id ? 'on' : ''}"><span class="ic">${c.icon}</span>${c.name}</button>`); b.onclick = () => { this.cat = c.id; this.build(true); }; cats.append(b); }
    el.append(cats);
    const list = h('<div class="items"></div>');
    const items = g.shopList(this.cat, fac).sort((a, b) => b.releaseDay - a.releaseDay);
    if (!items.length) list.append(h('<div class="empty">Hier gibt es (noch) nichts zu kaufen.<br/>Größere Standorte schalten mehr frei.</div>'));
    for (const it of items) {
      const price = g.itemPrice(it); const isNew = g.s.day - it.releaseDay < 120;
      let s = esc(it.desc || '');
      if (it.kind === 'device') { const r = g.revenueFor({ [it.algo]: it.hash }, g.bestCoin({ [it.algo]: it.hash }, it.vram || 99) || 'BTC', it.vram || 99); const cost = it.watt / 1000 * 24 * g.elecPrice(fac); s = `${fmtHash(it.hash, it.algo)} · ${fmtWatt(it.watt)} · ${ALGO_LABEL[it.algo]}<br/>≈ <b class="${r - cost >= 0 ? 'pos' : 'neg'}">${r - cost >= 0 ? '+' : ''}${fmtUSD(r - cost)}/Tag</b> hier${it.hydro ? ' · nur in Rack/Container' : ''}`; }
      if (it.kind === 'cooling') s = `Kühlt ${fmtWatt(it.cool)} · verbraucht ${fmtWatt(it.watt)}`;
      if (it.kind === 'holder') s = esc(it.desc);
      const card = h(`<div class="item ${price > g.s.cash || it.hydro ? 'dis' : ''}"><div class="t"><span>${esc(it.name)}${isNew ? '<span class="new">NEU</span>' : ''}</span><span class="p">${fmtUSD(price)}</span></div><div class="s">${s}</div></div>`);
      card.onclick = () => {
        if (it.hydro) { this.toast('Hydro-Miner brauchen Wasserkühlung: in ein Rack oder einen Container einsetzen.', 'bad'); return; }
        if (price > g.s.cash) { this.toast('Nicht genug Geld.', 'bad'); return; }
        this.w.startPlacement(it.id);
      };
      list.append(card);
    }
    // Vorschau: was demnächst erscheint (echte Release-Daten)
    const soon = (this.cat === 'rigs' ? [...PLACEABLES.filter((p) => p.cat === 'rigs'), ...PARTS.filter((p) => p.type === 'gpu' || p.type === 'mobo')] : PLACEABLES.filter((p) => p.cat === this.cat))
      .filter((p) => p.releaseDay > g.s.day).sort((a, b) => a.releaseDay - b.releaseDay).slice(0, 3);
    if (soon.length) {
      list.append(h('<div style="font-size:11px;color:#7d8aa0;text-transform:uppercase;letter-spacing:.8px;margin:10px 4px 6px">Demnächst</div>'));
      for (const it of soon) {
        const spec = it.kind === 'device' ? `${fmtHash(it.hash, it.algo)} · ${fmtWatt(it.watt)}` : it.type === 'gpu' ? `${it.vram} GB · ${it.watt} W` : it.type === 'mobo' ? `${it.slots} GPU-Slots` : '';
        list.append(h(`<div class="item dis" style="cursor:default"><div class="t"><span>🔒 ${esc(it.name)}</span><span class="p" style="color:#7d8aa0">${it.release.slice(5, 7)}/${it.release.slice(0, 4)}</span></div><div class="s">${spec}</div></div>`));
      }
    }
    el.append(list);
  }

  // ---------- Inspektor ----------
  inspect(uid, keep = false) {
    const el = $('#inspector');
    this.inspUid = uid;
    if (!uid) { el.classList.add('hidden'); return; }
    const o = this.g.findObj(uid); if (!o) { el.classList.add('hidden'); this.inspUid = null; return; }
    el.classList.remove('hidden');
    const def = PLACEABLE[o.type], g = this.g;
    el.innerHTML = `<div class="insp-h"><h3>${esc(def.name)}</h3><span id="insp-badge"></span></div><div id="insp-stats"></div><div id="insp-ctrl"></div>`;
    this.inspectStats();
    const c = $('#insp-ctrl');
    if (def.kind === 'rig' || def.kind === 'device' || def.kind === 'holder') {
      const a = g.summary[g.facOf(uid)]?.per.get(uid);
      const sec = h(`<div class="sec"><h4>Coin</h4></div>`);
      const sel = h('<select></select>');
      const hashProf = this.hashProfile(o);
      sel.append(h(`<option value="auto">Auto (profitabelster Coin)</option>`));
      for (const cn of COINS) { if (!g.coinActive(cn.id)) continue; const r = hashProf ? g.revenueFor(hashProf.hash, cn.id, hashProf.vram) : 0; if (!r && cn.id !== o.coin) continue; sel.append(h(`<option value="${cn.id}">${cn.name} (${cn.id}) – ${fmtUSD(r)}/Tag</option>`)); }
      sel.value = o.coin; sel.onchange = () => { o.coin = sel.value; g.dayUpdate(true); };
      sec.append(sel);
      const ms = h(`<select style="margin-top:6px"><option value="auto">Betrieb: Auto (nur wenn profitabel)</option><option value="on">Betrieb: Immer an</option><option value="off">Betrieb: Aus</option></select>`);
      ms.value = o.mode || 'auto'; ms.onchange = () => { o.mode = ms.value; g.dayUpdate(true); this.w.updateStatus(); this.inspectStats(); };
      sec.append(ms); c.append(sec);
    }
    if (def.kind === 'rig') c.append(this.rigSlots(o));
    if (def.kind === 'holder') c.append(this.holderUI(o));
    const row = h('<div class="row sec"></div>');
    const st = g.summary[g.facOf(uid)]?.per.get(uid);
    if (o.broken || (o.items && o.items.some((i) => i.b))) { const rc = g.repairCost(o); const b = h(`<button class="btn good">🔧 Reparieren (${fmtUSD(rc)})</button>`); b.onclick = () => { if (!g.repair(uid)) this.toast('Nicht genug Geld.', 'bad'); else this.inspect(uid); }; row.append(b); }
    const mv = h('<button class="btn">✥ Verschieben</button>'); mv.onclick = () => this.w.startPlacement(o.type, uid); row.append(mv);
    const rt = h('<button class="btn">⟳ Drehen</button>'); rt.onclick = () => { const r0 = o.rot; o.rot = (o.rot + 1) % 4; if (!this.w.canPlace(def, o.x, o.z, o.rot, uid)) { o.rot = r0; this.toast('Kein Platz zum Drehen.', 'bad'); } this.w.syncObjects(); }; row.append(rt);
    if (def.kind !== 'decor') { const dp = h(`<button class="btn" title="Gleiches Objekt inkl. Teilen noch mal kaufen">⧉ Duplizieren (${fmtUSD(this.g.cloneCost ? this.g.cloneCost(o) : 0)})</button>`); dp.onclick = () => this.w.startPlacement(o.type, null, o); row.append(dp); }
    const sell = h(`<button class="btn danger">Verkaufen (+${fmtUSD(g.objectValue(o))})</button>`); sell.onclick = () => { g.removeObject(uid); this.inspect(null); }; row.append(sell);
    c.append(row);
  }
  hashProfile(o) {
    const def = PLACEABLE[o.type];
    if (def.kind === 'device') return { hash: { [def.algo]: def.hash }, vram: def.vram || 99 };
    if (def.kind === 'rig') { const a = this.g.analyze({ ...o, broken: false }); return a.units[0] ? { hash: a.units[0].hash, vram: a.units[0].vram } : null; }
    if (def.kind === 'holder') { const a = this.g.analyze({ ...o, items: (o.items || []).map((i) => ({ ...i, b: 0 })) }); return a.units[0] ? { hash: a.units[0].hash, vram: a.units[0].vram } : null; }
    return null;
  }
  inspectStats() {
    const uid = this.inspUid; if (!uid) return;
    const o = this.g.findObj(uid); if (!o) { this.inspect(null); return; }
    const g = this.g, def = PLACEABLE[o.type], facId = g.facOf(uid), sm = g.summary[facId]; if (!sm) return;
    const a = sm.per.get(uid) || g.analyze(o);
    const badge = $('#insp-badge');
    const st = sm.tripped ? ['bad', 'Kein Strom'] : a.status === 'broken' ? ['bad', 'Defekt'] : a.status === 'partial' ? ['warn', 'Teilweise defekt'] : a.status === 'psu' ? ['bad', 'Netzteil zu schwach'] : a.status === 'incomplete' ? ['warn', 'Unvollständig'] : a.status === 'empty' ? ['idle', 'Leer'] : a.status === 'idle' ? ['idle', 'Pausiert (unrentabel)'] : a.status === 'off' ? ['idle', 'Aus'] : def.kind === 'decor' ? ['idle', 'Deko'] : ['ok', sm.throttle < 1 ? 'Läuft (gedrosselt)' : 'Läuft'];
    if (badge) badge.innerHTML = `<span class="badge ${st[0]}">${st[1]}</span>`;
    let rev = 0, hs = [];
    for (const u of a.units) { rev += u.rev * sm.throttle; if (u.idle) hs.push(`<span style="color:#94a0b2">pausiert – wäre ${fmtUSD(u.potential)}/Tag mit ${u.coin ? COIN[u.coin].name : '–'}</span>`); else if (u.coin) hs.push(`${fmtHash(u.h * sm.throttle, u.algo)} → ${COIN[u.coin].name}`); else if (Object.keys(u.hash).length) hs.push('kein lohnender Coin'); if (u.note) hs.push(`<span class="neg">${u.note}</span>`); }
    const cost = (a.watt / 1000) * 24 * sm.elec;
    const rows = [];
    if (a.note) rows.push(['Hinweis', `<span class="neg">${esc(a.note)}</span>`]);
    if (hs.length) rows.push(['Leistung', hs.join('<br/>')]);
    if (def.kind !== 'decor') rows.push(['Verbrauch', fmtWatt(a.watt)]);
    if (def.kind === 'cooling') { rows.push(['Kühlleistung', fmtWatt(def.cool)]); rows.push(['Auslastung (Thermostat)', `${Math.round((a.util ?? 1) * 100)} %`]); }
    if (sm.elec === 0) rows.push(['Strom', '<span class="pos">zahlen (noch) deine Eltern 😇</span>']);
    if (a.units.length) { rows.push(['Ertrag / Tag', `<span class="pos">${fmtUSD(rev)}</span>`]); rows.push(['Strom / Tag', `<span class="neg">−${fmtUSD(cost)}</span>`]); rows.push(['Gewinn / Tag', `<b class="${rev - cost >= 0 ? 'pos' : 'neg'}">${fmtUSD(rev - cost)}</b>`]); }
    else if (def.kind === 'cooling') rows.push(['Strom / Tag', `<span class="neg">−${fmtUSD(cost)}</span>`]);
    rows.push(['Wiederverkauf', fmtUSD(g.objectValue(o))]);
    const el = $('#insp-stats'); if (el) el.innerHTML = `<div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>`;
  }
  rigSlots(o) {
    const g = this.g, p = o.parts, def = PLACEABLE[o.type];
    const sec = h('<div class="sec"><h4>Komponenten</h4></div>');
    const slot = (lab, id, onClick) => { const it = id ? PART[id] : null; const e = h(`<div class="slot ${it ? 'filled' : ''}"><span class="lab">${lab}</span><span class="nm">${it ? esc(it.name) : '<i style="color:#7d8aa0">leer – klicken</i>'}</span><span>${it ? '✎' : '＋'}</span></div>`); e.onclick = onClick; sec.append(e); };
    slot('Mainboard', p.mobo, () => this.partPicker(o, 'mobo'));
    slot('CPU', p.cpu, () => this.partPicker(o, 'cpu'));
    const watt = 25 + g.partIds(o).reduce((a, id) => a + (PART[id].watt || 0), 0);
    slot(`Netzteil`, p.psu, () => this.partPicker(o, 'psu'));
    if (p.psu) sec.append(h(`<div style="font-size:12px;color:${watt > PART[p.psu].cap ? '#ff6b6b' : '#94a0b2'};margin:-2px 0 6px 4px">Last: ${watt} W / ${PART[p.psu].cap} W</div>`));
    const cap = g.rigGpuCap(o);
    for (let i = 0; i < cap; i++) slot(`GPU ${i + 1}`, p.gpus[i], () => this.partPicker(o, 'gpu', Math.min(i, p.gpus.length)));
    if (!p.mobo) sec.append(h(`<div style="font-size:12px;color:#94a0b2">Erst ein Mainboard einbauen – es bestimmt die Zahl der GPU-Slots (Rahmen max. ${def.maxGpu}).</div>`));
    const row = h('<div class="row"></div>');
    if (!p.mobo || !p.cpu || !p.psu) { const b = h(`<button class="btn primary small">⚡ Basis-Teile einbauen</button>`); b.onclick = () => { const r = g.quickBase(o.uid); if (!r) this.toast('Nicht genug Geld.', 'bad'); this.inspect(o.uid); }; row.append(b); }
    if (p.mobo && p.gpus.length < cap) {
      const best = this.bestGpu(); if (best) { const n = cap - p.gpus.length; const b = h(`<button class="btn small">Mit ${esc(best.name)} füllen (${n}× ${fmtUSD(g.itemPrice(best))})</button>`); b.onclick = () => { g.fillGpus(o.uid, best.id); this.inspect(o.uid); }; row.append(b); }
    }
    sec.append(row);
    return sec;
  }
  bestGpu() {
    const g = this.g; let best = null, bv = -Infinity; const elec = g.elecPrice(g.s.current);
    for (const it of g.partList('gpu')) { const c = g.bestCoin(it.hash, it.vram); const r = c ? g.revenueFor(it.hash, c, it.vram) : 0; const v = (r - it.watt / 1000 * 24 * elec) / Math.max(50, g.itemPrice(it)); if (v > bv) { bv = v; best = it; } }
    return best;
  }
  partPicker(o, type, idx = 0) {
    const g = this.g, elec = g.elecPrice(g.facOf(o.uid));
    const cur = type === 'gpu' ? o.parts.gpus[idx] : o.parts[type];
    const names = { mobo: 'Mainboard', cpu: 'Prozessor', psu: 'Netzteil', gpu: 'Grafikkarte' };
    const body = h(`<div><h2>${names[type]} wählen</h2><p style="color:#94a0b2;margin-top:-6px">Preise vom ${fmtDate(g.s.day)}. Altes Teil wird für 50 % verkauft.</p><div class="list"></div></div>`);
    const list = body.querySelector('.list');
    if (cur) { const rm = h(`<div class="picker-row cur"><div><b>${esc(PART[cur].name)}</b><div class="s">eingebaut</div></div><div></div><button class="btn small danger">Ausbauen (+${fmtUSD(g.itemPrice(PART[cur]) * 0.5)})</button></div>`); rm.querySelector('button').onclick = () => { g.setPart(o.uid, type, null, idx); this.closeModal(); this.inspect(o.uid); }; list.append(rm); }
    const parts = g.partList(type);
    const bestId = type === 'gpu' ? this.bestGpu()?.id : null;
    for (const it of parts) {
      let s = `ab ${it.release.slice(0, 4)}`;
      if (type === 'gpu' || type === 'cpu') {
        const c = g.bestCoin(it.hash, it.vram || 99); const r = c ? g.revenueFor(it.hash, c, it.vram || 99) : 0; const cost = it.watt / 1000 * 24 * elec;
        const algos = Object.entries(it.hash).map(([a, v]) => `${ALGO_LABEL[a]} ${fmtHash(v, a)}`).slice(0, 3).join(' · ');
        s = `${it.watt} W${it.vram ? ` · ${it.vram} GB` : ''} · ${algos}<br/>Allein: ${c ? `<b class="${r - cost >= 0 ? 'pos' : 'neg'}">${fmtUSD(r - cost)}/Tag</b> mit ${COIN[c].name}` : 'kein lohnender Coin'}`;
      }
      if (type === 'psu') s = `${it.cap} W Kapazität`;
      if (type === 'mobo') s = `${it.slots} GPU-Slots (Rahmen: max. ${PLACEABLE[o.type].maxGpu})`;
      const price = g.itemPrice(it);
      const row = h(`<div class="picker-row ${it.id === cur ? 'cur' : ''}"><div><b>${esc(it.name)}</b>${it.id === bestId ? ' <span class="new">★ BESTER WERT</span>' : ''}${price > g.s.cash ? ' <span style="color:#ff6b6b;font-size:11px">zu teuer</span>' : ''}<div class="s">${s}</div></div><div class="p" style="color:#ffb000;font-weight:700">${fmtUSD(price)}</div><button class="btn small primary" ${price > g.s.cash ? 'disabled' : ''}>${cur ? 'Tauschen' : 'Kaufen'}</button></div>`);
      row.querySelector('button').onclick = () => { if (!g.setPart(o.uid, type, it.id, idx)) { this.toast('Nicht genug Geld.', 'bad'); return; } this.closeModal(); this.inspect(o.uid); };
      list.append(row);
    }
    this.openModal(body, 'narrow');
  }
  holderUI(o) {
    const g = this.g, def = PLACEABLE[o.type];
    const sec = h(`<div class="sec"><h4>Bestückung ${o.items.length} / ${def.slots}</h4></div>`);
    const groups = {};
    o.items.forEach((it) => { (groups[it.id] ||= { n: 0, b: 0 }); groups[it.id].n++; if (it.b) groups[it.id].b++; });
    for (const [id, gr] of Object.entries(groups)) {
      const d = PLACEABLE[id];
      const r = h(`<div class="slot filled"><span class="nm">${gr.n}× ${esc(d.name)}${gr.b ? ` <span class="neg">(${gr.b} defekt)</span>` : ''}</span><button class="btn small danger">Alle verkaufen</button></div>`);
      r.querySelector('button').onclick = (e) => { e.stopPropagation(); g.holderSellAll(o.uid, id); this.inspect(o.uid); };
      sec.append(r);
    }
    if (o.items.length < def.slots) {
      const devs = g.shopList('asic', g.facOf(o.uid)).filter((d) => def.id !== 'shelf' || !d.hydro).sort((a, b) => b.releaseDay - a.releaseDay);
      const sel = h('<select style="margin-top:6px"></select>');
      for (const d of devs) { const p = g.itemPrice(d); const r = g.revenueFor({ [d.algo]: d.hash }, g.bestCoin({ [d.algo]: d.hash }, d.vram || 99) || 'BTC', d.vram || 99) - d.watt / 1000 * 24 * g.elecPrice(g.facOf(o.uid)); sel.append(h(`<option value="${d.id}">${esc(d.name)} – ${fmtUSD(p)} (${r >= 0 ? '+' : ''}${fmtUSD(r)}/Tag)</option>`)); }
      sec.append(sel);
      const row = h('<div class="row"></div>');
      for (const n of [1, 5, 25, 'max']) { if (n !== 'max' && n > def.slots) continue; const b = h(`<button class="btn small ${n === 'max' ? 'primary' : ''}">${n === 'max' ? 'Auffüllen' : '+' + n}</button>`); b.onclick = () => { const k = g.holderAdd(o.uid, sel.value, n === 'max' ? def.slots : n); if (!k) this.toast('Nicht genug Geld oder kein Platz.', 'bad'); else this.toast(`${k}× ${PLACEABLE[sel.value].name} eingesetzt`, 'good', 2500); this.inspect(o.uid); }; row.append(b); }
      sec.append(row);
      if (!devs.length) sec.append(h('<div class="empty">Keine passenden Geräte im Handel.</div>'));
    }
    return sec;
  }

  // ---------- Ziele ----------
  goals() {
    const el = $('#goals'), g = this.g, s = g.s;
    const ch = CHAPTERS[s.chapter];
    el.innerHTML = '';
    // Freischaltbare Standorte
    for (const f of FACILITIES) if (g.canUnlock(f.id)) {
      const b = h(`<div style="margin-bottom:8px"><h3>🔓 ${esc(f.name)} verfügbar!</h3><div style="font-size:12px;color:#94a0b2">${esc(f.desc)}</div><button class="btn primary small" style="margin-top:6px">${f.cost ? `Für ${fmtUSD(f.cost)} übernehmen` : 'Einziehen'}</button></div>`);
      b.querySelector('button').onclick = () => this.unlock(f.id);
      el.append(b);
    }
    if (!ch) { el.append(h(`<div><h3>Endlosmodus</h3><div style="font-size:13px">Du hast MONOLITH überholt. Wachse weiter – der Markt hat kein Ende.</div></div>`)); return; }
    el.append(h(`<h3>${esc(ch.title)}</h3>`));
    for (const go of ch.goals) {
      const done = !!s.goals[go.id];
      const row = h(`<div class="goal ${done ? 'done' : ''}"><div class="ck">${done ? '✓' : ''}</div><div>${esc(go.text)}</div></div>`);
      if (!done && go.action) { const b = h(`<button class="btn small primary">${esc(go.action.label)}</button>`); b.disabled = s.cash < go.action.cost; b.onclick = () => { if (g.goalAction(go)) { this.toast('✔ Erledigt!', 'good'); this.goals(); } }; row.lastElementChild.append(h('<br/>'), b); }
      el.append(row);
    }
    const allDone = ch.goals.every((go) => s.goals[go.id]);
    if (allDone && s.day < toDay(ch.minDate)) el.append(h(`<div style="font-size:12px;color:#ffcc33;margin-top:6px">Alle Ziele erfüllt! Nächstes Kapitel ab ${fmtDate(toDay(ch.minDate))}.</div>`));
  }
  unlock(id) {
    const f = FACILITY[id];
    if (!this.g.unlockFacility(id)) { this.toast(`Du brauchst ${fmtUSD(f.cost)}.`, 'bad'); return; }
    this.switchSite(id, true);
    const ci = CHAPTERS.findIndex((c) => c.unlock === id);
    const next = CHAPTERS[ci + 1];
    this.onModalClose = () => { if (this.w.transition) this.w.transition.hold = false; };
    this.story(next?.title || f.name, `${next?.intro || ''}<br/><br/><b>${esc(f.name)}</b> – ${esc(f.place)}<br/>${f.w} × ${f.d} m · ${f.power[0].kw.toLocaleString('de-DE')} kW Anschluss${f.rent ? ` · Miete ${fmtUSD(f.rent)}/Monat` : ''}<br/><i>${esc(f.desc)}</i>`);
  }

  // ---------- Dock ----------
  dock() {
    const el = $('#dock'), g = this.g;
    const unread = g.s.messages.filter((m) => !m.read).length;
    el.innerHTML = '';
    const btns = [
      ['📈', 'Markt', () => this.market()], ['📱', 'Handy', () => this.phone(), unread], ['🏢', 'Firma', () => this.company()], ['🔬', 'Technik', () => this.techs(), TECHS.filter((t) => !(g.s.techs || {})[t.id] && g.techAvailable(t) && g.s.cash >= t.cost).length],
      ['🏆', 'Rangliste', () => this.ranking()], ['🚶', 'Rundgang', () => this.w.enterFP()], ['⚙️', 'Menü', () => this.menu()],
    ];
    for (const [ic, l, fn, b] of btns) { const e = h(`<button><span class="ic">${ic}</span>${l}${b ? `<span class="bdg">${b}</span>` : ''}</button>`); e.onclick = fn; el.append(e); }
  }

  // ---------- Modals ----------
  openModal(node, cls = '', kind = null) { const m = $('#modal'); m.classList.remove('hidden'); const card = m.querySelector('.modal-card'); card.className = 'modal-card ' + cls; const b = m.querySelector('.modal-body'); b.innerHTML = ''; b.append(node); this.modalKind = kind; }
  closeModal() { $('#modal').classList.add('hidden'); this.modalKind = null; this.onModalClose?.(); this.onModalClose = null; }
  story(title, html, btn = 'Los geht’s') {
    const n = h(`<div class="story"><div class="ch">${esc(title)}</div><p>${html}</p><div class="row" style="justify-content:flex-end"><button class="btn primary">${btn}</button></div></div>`);
    n.querySelector('button').onclick = () => this.closeModal();
    this.openModal(n, 'narrow', 'story');
  }

  market(update = false) {
    const g = this.g, s = g.s;
    if (update && this.modalKind !== 'market') return;
    const body = h(`<div><h2>📈 Markt & Wallet</h2><div class="grid2"><div class="coins"></div><div class="detail"></div></div></div>`);
    const list = body.querySelector('.coins');
    let total = 0;
    for (const c of COINS) {
      const p = g.price(c.id), p30 = g.price(c.id, s.day - 30), w = s.wallet[c.id]; const val = (w.ex + w.cold) * p; total += val;
      const started = s.day >= c.start;
      const ch = p30 ? (p / p30 - 1) * 100 : 0;
      const row = h(`<div class="coin ${this.marketCoin === c.id ? 'on' : ''} ${started ? '' : 'inactive'}"><div class="dot" style="background:${c.color}">${c.id}</div><div class="nm">${c.name}<small>${started ? `${fmtCoin(w.ex + w.cold)} ${c.id} · ${fmtUSD(val)}` : `Start ${fmtDate(c.start)}`}</small></div><div class="pr">${started ? fmtUSD(p) : '—'}<small class="${ch >= 0 ? 'pos' : 'neg'}">${started ? `${ch >= 0 ? '+' : ''}${ch.toFixed(1)} % (30 T.)` : ''}</small></div></div>`);
      row.onclick = () => { this.marketCoin = c.id; this.market(); };
      list.append(row);
    }
    list.append(h(`<div style="padding:8px 10px;color:#94a0b2;font-size:13px">Wallet gesamt: <b style="color:#fff">${fmtUSD(total)}</b></div>`));
    const sa = h(`<button class="btn small" style="margin:4px 10px">💰 Alles auf der Börse verkaufen</button>`); sa.onclick = () => { const u = g.sellAll(); this.audio?.cash(); this.toast(`Alles verkauft: ${fmtUSD(u)}`, 'good', 3000); this.market(); }; list.append(sa);
    const pc = h(`<label style="display:flex;gap:8px;align-items:center;padding:4px 10px;font-size:13px"><input type="checkbox" ${s.payoutCold ? 'checked' : ''}/> Neue Coins direkt in die Cold-Wallet (sicher vor Börsenpleiten)</label>`);
    pc.querySelector('input').onchange = (e) => { s.payoutCold = e.target.checked; };
    list.append(pc);
    const c = COIN[this.marketCoin], w = s.wallet[c.id], p = g.price(c.id);
    const det = body.querySelector('.detail');
    det.append(h(`<div style="display:flex;justify-content:space-between;align-items:baseline"><h3 style="margin:0">${c.name} <span style="color:#94a0b2">${c.id}</span></h3><div style="font-size:22px;font-weight:800">${fmtUSD(p)}</div></div>`));
    det.append(h(`<div style="color:#94a0b2;font-size:12px;margin:4px 0 8px">${esc(c.desc)} · Algo: ${ALGO_LABEL[c.algo(s.day)]} · Netz: ${s.day >= c.start ? fmtHash(g.netHash(c.id), c.algo(s.day)) : '—'}${c.end && s.day >= c.end ? ' · <b class="neg">Mining beendet</b>' : ''}</div>`));
    const cv = h('<canvas class="chart" width="1200" height="520"></canvas>'); det.append(cv);
    const range = h(`<div class="row" style="margin-top:6px"></div>`);
    for (const [l, d] of [['30 T', 30], ['1 J', 365], ['5 J', 1825], ['Alles', 99999]]) { const b = h(`<button class="btn small ${this.range === d ? 'primary' : ''}">${l}</button>`); b.onclick = () => { this.range = d; this.market(); }; range.append(b); }
    det.append(range);
    this.range ??= 365;
    requestAnimationFrame(() => this.chart(cv, c.id, this.range));
    const kv = h(`<div class="kv"><div class="k">Auf der Börse</div><div class="v">${fmtCoin(w.ex)} ${c.id} (${fmtUSD(w.ex * p)})</div><div class="k">In der Cold-Wallet</div><div class="v">${fmtCoin(w.cold)} ${c.id} (${fmtUSD(w.cold * p)})</div></div>`);
    det.append(kv);
    const r1 = h('<div class="row"></div>');
    for (const f of [0.25, 0.5, 1]) { const b = h(`<button class="btn small">${f * 100} % verkaufen</button>`); b.disabled = w.ex <= 0; b.onclick = () => { const u = g.sell(c.id, f); this.audio?.cash(); this.toast(`Verkauft für ${fmtUSD(u)}`, 'good', 2500); this.market(); }; r1.append(b); }
    const tc = h(`<button class="btn small">⇄ ${w.cold > 0 && w.ex === 0 ? 'Auf Börse holen' : 'In Cold-Wallet'}</button>`); tc.onclick = () => { g.transfer(c.id, !(w.cold > 0 && w.ex === 0)); this.market(); }; r1.append(tc);
    det.append(r1);
    const r2 = h(`<div class="row" style="align-items:center"><span style="font-size:13px">Kaufen für</span><input type="number" min="0" step="100" value="${Math.max(0, Math.round(Math.min(s.cash, 1000)))}"/><span>$</span><button class="btn small primary">Kaufen</button></div>`);
    r2.querySelector('button').onclick = () => { const v = +r2.querySelector('input').value; if (g.coinActive(c.id) || s.day >= c.start) { const u = g.buy(c.id, v); if (u) this.toast(`${fmtUSD(u)} in ${c.name} investiert`, 'good', 2500); this.market(); } };
    det.append(r2);
    const r3 = h(`<div class="sec"><h4>Auto-Verkauf neu geschürfter ${c.id}: <span id="as-v">${Math.round(s.autoSell[c.id] * 100)} %</span></h4><input type="range" min="0" max="100" step="5" value="${Math.round(s.autoSell[c.id] * 100)}"/><div style="font-size:12px;color:#94a0b2">Der Rest bleibt in der Wallet (HODL). Strom, Miete und Löhne werden vom Kontostand bezahlt!</div></div>`);
    r3.querySelector('input').oninput = (e) => { s.autoSell[c.id] = e.target.value / 100; r3.querySelector('#as-v').textContent = e.target.value + ' %'; };
    const all = h('<button class="btn small" style="margin-top:6px">Für alle Coins übernehmen</button>'); all.onclick = () => { for (const k of COINS) s.autoSell[k.id] = s.autoSell[c.id]; this.toast('Übernommen', 'good', 1500); }; r3.append(all);
    det.append(r3);
    this.openModal(body, '', 'market');
  }
  chart(cv, id, range) {
    const g = this.g, s = g.s, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const start = Math.max(COIN[id].start, s.day - range, toDay('2010-07-17')), end = s.day;
    if (end - start < 2) { ctx.fillStyle = '#94a0b2'; ctx.font = '28px sans-serif'; ctx.fillText('Noch keine Kursdaten', 40, 60); return; }
    const n = 300, pts = [];
    for (let i = 0; i <= n; i++) { const d = Math.round(start + (end - start) * (i / n)); pts.push([d, g.price(id, d)]); }
    const vals = pts.map((p) => p[1]).filter((v) => v > 0);
    const logScale = Math.max(...vals) / Math.min(...vals) > 30;
    const tf = (v) => (logScale ? Math.log10(Math.max(v, 1e-9)) : v);
    const mn = Math.min(...vals.map(tf)), mx = Math.max(...vals.map(tf));
    const pad = 60, x = (i) => pad + (i / n) * (W - pad * 1.4), y = (v) => H - 40 - ((tf(v) - mn) / (mx - mn || 1)) * (H - 80);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.fillStyle = '#7d8aa0'; ctx.font = '22px sans-serif'; ctx.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const v = mn + ((mx - mn) * k) / 4; const yy = H - 40 - (k / 4) * (H - 80); ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(W - 20, yy); ctx.stroke(); ctx.fillText(fmtUSD(logScale ? Math.pow(10, v) : v), 4, yy - 4); }
    ctx.fillText(fmtDate(start), pad, H - 8); ctx.fillText(fmtDate(end), W - 190, H - 8);
    const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, COIN[id].color + '66'); grad.addColorStop(1, COIN[id].color + '00');
    ctx.beginPath(); pts.forEach(([d, v], i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)))); ctx.lineTo(x(n), H - 40); ctx.lineTo(x(0), H - 40); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); pts.forEach(([d, v], i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)))); ctx.strokeStyle = COIN[id].color; ctx.lineWidth = 3; ctx.stroke();
    if (logScale) { ctx.fillStyle = '#7d8aa0'; ctx.fillText('log', W - 60, 28); }
  }

  phone() {
    const g = this.g;
    const msgs = [...g.s.messages].sort((a, b) => b.day - a.day);
    const body = h(`<div><h2>📱 Handy</h2><div class="phone"></div></div>`);
    const ph = body.querySelector('.phone');
    if (!msgs.length) ph.append(h('<div class="empty">Keine Nachrichten.</div>'));
    for (const m of msgs) { if (m.old) continue; ph.append(h(`<div class="msg f-${m.from.split(' ')[0]} ${m.read ? '' : 'unread'}"><div class="fr">${FACE[m.from] || '💬'} ${esc(m.from)}<span>${fmtDate(m.day)}</span></div>${esc(m.text)}</div>`)); }
    msgs.forEach((m) => (m.read = true));
    this.openModal(body, 'narrow', 'phone'); this.dock();
  }

  company() {
    const g = this.g, s = g.s;
    const body = h(`<div><h2>🏢 Firma & Standorte</h2><div class="cards"></div><div class="sec staff"></div></div>`);
    const cards = body.querySelector('.cards');
    for (const f of FACILITIES) {
      const un = s.unlocked.includes(f.id), can = g.canUnlock(f.id);
      const fs = s.fac[f.id], sm = g.summary[f.id];
      const c = h(`<div class="card ${!un && !can ? 'lock' : ''}"><h3>${un ? '' : can ? '🔓 ' : '🔒 '}${esc(f.name)}</h3><div class="sub">${esc(f.place)} · ${f.w}×${f.d} m</div>
        <div class="kv" style="margin:4px 0"><div class="k">Anschluss</div><div class="v">${fmtNum(f.power[fs.power].kw, 1)} kW</div>
        <div class="k">Strompreis</div><div class="v">${g.elecPrice(f.id) ? fmtUSD(g.elecPrice(f.id)) + '/kWh' : 'zahlen die Eltern'}</div>
        <div class="k">Miete</div><div class="v">${f.rent ? fmtUSD(f.rent) + '/Monat' : 'keine'}</div>
        ${un ? `<div class="k">Last</div><div class="v">${fmtWatt(sm.watt)}</div><div class="k">Temperatur</div><div class="v ${sm.temp > 38 ? 'neg' : ''}">${sm.temp.toFixed(1)} °C</div><div class="k">Geräte</div><div class="v">${fs.objects.length}</div>` : ''}</div></div>`);
      if (un) {
        const nx = f.power[fs.power + 1];
        if (nx) { const b = h(`<button class="btn small">⚡ ${esc(nx.label)}: ${fmtNum(nx.kw, 0)} kW (${fmtUSD(nx.cost)})</button>`); b.disabled = s.cash < nx.cost; b.onclick = () => { if (g.upgradePower(f.id)) { this.toast('Stromanschluss ausgebaut!', 'good'); this.company(); this.sites(); } }; c.append(b); }
        else c.append(h('<div style="font-size:12px;color:#94a0b2">Maximaler Anschluss erreicht.</div>'));
        if (s.current !== f.id) { const go = h('<button class="btn small" style="margin-left:6px">Hingehen</button>'); go.onclick = () => { this.closeModal(); this.switchSite(f.id); }; c.append(go); }
      } else if (can) { const b = h(`<button class="btn primary small">Übernehmen (${fmtUSD(f.cost)})</button>`); b.onclick = () => { this.closeModal(); this.unlock(f.id); }; c.append(b); }
      else { const ci = CHAPTERS.findIndex((ch) => ch.unlock === f.id); c.append(h(`<div style="font-size:12px;color:#94a0b2">Wird frei nach „${esc(CHAPTERS[ci]?.title || '')}" (frühestens ${fmtDate(toDay(CHAPTERS[ci]?.minDate || '2010-01-01'))}).</div>`)); }
      cards.append(c);
    }
    const st = body.querySelector('.staff');
    const allowed = s.flags.gmbh;
    st.innerHTML = `<h4>Personal</h4><div class="kv"><div class="k">Techniker</div><div class="v">${s.staff.tech}</div><div class="k">Gehalt je Techniker</div><div class="v">${fmtUSD(g.techSalary())}/Monat</div><div class="k">Wartungs-Abdeckung</div><div class="v">${Math.round(g.techCoverage() * 100)} % (je Techniker ~60 Geräte)</div></div><div style="font-size:12px;color:#94a0b2">Techniker reparieren ausgefallene Geräte automatisch (Teilekosten fallen an).${allowed ? '' : ' <b>Erst nach Gründung der Hashwerk GmbH.</b>'}</div>`;
    const row = h('<div class="row"></div>');
    for (const n of [1, 5]) { const b = h(`<button class="btn small good">+${n} einstellen</button>`); b.disabled = !allowed; b.onclick = () => { g.hireTech(n); this.company(); }; row.append(b); }
    const f1 = h('<button class="btn small danger">−1 entlassen</button>'); f1.disabled = !s.staff.tech; f1.onclick = () => { g.hireTech(-1); this.company(); }; row.append(f1);
    st.append(row);
    const p = g.dailyProfit();
    const nwc = h('<div class="sec"><h4>Vermögensverlauf (log)</h4><canvas class="nwchart" width="1100" height="260"></canvas></div>'); st.append(nwc); requestAnimationFrame(() => this.nwChart(nwc.querySelector('canvas')));
    st.append(h(`<div class="sec"><h4>Bilanz pro Tag</h4><div class="kv"><div class="k">Mining-Ertrag</div><div class="v pos">${fmtUSD(p.rev)}</div><div class="k">Strom, Miete, Löhne</div><div class="v neg">−${fmtUSD(p.cost)}</div><div class="k">Gesamt geschürft</div><div class="v">${fmtUSD(s.stats.minedUSD)}</div><div class="k">Stromkosten bisher</div><div class="v">${fmtUSD(s.stats.elec)}</div><div class="k">In Hardware investiert</div><div class="v">${fmtUSD(s.stats.spentHW)}</div></div></div>`));
    this.openModal(body, '', 'company');
  }

  techs() {
    const g = this.g, s = g.s;
    const body = h(`<div><h2>🔬 Technik & Forschung</h2><p style="color:#94a0b2;margin-top:-6px">Einmalige Investitionen mit dauerhafter Wirkung. Neue Technologien werden im Lauf der Geschichte verfügbar.</p><div class="cards"></div></div>`);
    const cards = body.querySelector('.cards');
    for (const t of TECHS) {
      const own = (s.techs || {})[t.id], av = g.techAvailable(t);
      const c = h(`<div class="card ${!av && !own ? 'lock' : ''}"><h3>${t.icon} ${esc(t.name)}</h3><div class="sub">${own ? `✅ Erforscht am ${fmtDate(own)}` : av ? `Kosten: <b style="color:#ffb000">${fmtUSD(t.cost)}</b>` : `🔒 ab ${fmtDate(toDay(t.date))}${t.minTier ? ` · braucht Standort „${FACILITIES.find((f) => f.tier === t.minTier).name}"` : ''}`}</div><div style="font-size:13px">${esc(t.desc)}</div></div>`);
      if (!own && av) { const b = h(`<button class="btn primary small" style="margin-top:8px">Erforschen</button>`); b.disabled = s.cash < t.cost; b.onclick = () => { if (g.buyTech(t.id)) { this.audio?.fanfare(); this.toast(`🔬 ${esc(t.name)} erforscht!`, 'good'); this.techs(); this.dock(); } }; c.append(b); }
      cards.append(c);
    }
    this.openModal(body, '', 'techs');
  }

  ranking() {
    const g = this.g, s = g.s, day = s.day;
    const net = g.netHash('BTC');
    const mine = g.algoHash('sha256');
    const entries = [
      ['GigaWatt Mining (USA)', toDay('2014-01-01'), 0.006], ['Sibir Energo (RU)', toDay('2016-01-01'), 0.0035], ['TexaHash Inc.', toDay('2019-01-01'), 0.0045],
      ['Nordlicht Hash (IS)', toDay('2014-06-01'), 0.0025], ['Pacific Rigs (CA)', toDay('2017-01-01'), 0.002], ['Hobby-Miner „ArtForz"', toDay('2010-06-01'), 0.03, toDay('2013-01-01')],
      ['Uni-Cluster Tokio', toDay('2010-09-01'), 0.012, toDay('2014-01-01')], ['Desert Hash (AE)', toDay('2021-06-01'), 0.003], ['Andes Mining (PY)', toDay('2022-01-01'), 0.0018],
    ].filter((e) => day >= e[1] && (!e[3] || day < e[3])).map((e) => ({ name: e[0], h: net * e[2] * (0.85 + 0.3 * Math.abs(Math.sin(e[1] + day / 200))) }));
    const mono = g.monolithHash(); if (mono) entries.push({ name: 'MONOLITH Hash AG', h: mono, rival: true });
    entries.push({ name: 'Hashwerk (Du)', h: mine, me: true });
    entries.sort((a, b) => b.h - a.h);
    const rank = entries.findIndex((e) => e.me) + 1;
    const body = h(`<div><h2>🏆 Rangliste der Bitcoin-Miner</h2><p style="color:#94a0b2;margin-top:-6px">Netz-Hashrate: <b style="color:#fff">${fmtHash(net)}</b> · Dein Anteil: <b style="color:#ffb000">${((mine / net) * 100).toPrecision(3)} %</b> · Platz <b>${rank}</b> von ${entries.length}</p>
      <table class="tbl"><tr><th>#</th><th>Miner</th><th>Hashrate</th><th>Anteil</th></tr>${entries.map((e, i) => `<tr class="${e.me ? 'me' : ''} ${e.rival ? 'rival' : ''}"><td>${i + 1}</td><td>${esc(e.name)}</td><td>${fmtHash(e.h)}</td><td>${((e.h / net) * 100).toPrecision(3)} %</td></tr>`).join('')}</table>
      <p style="font-size:12px;color:#94a0b2">Ziel im Endspiel: MONOLITH Hash AG überholen.</p></div>`);
    this.openModal(body, 'narrow', 'ranking');
  }

  menu() {
    const g = this.g;
    const body = h(`<div><h2>⚙️ Menü</h2><div class="row"><button class="btn primary" data-a="save">💾 Speichern</button><button class="btn" data-a="load">📂 Laden</button><button class="btn danger" data-a="new">Neues Spiel</button></div>
      <div class="sec"><h4>Grafik</h4><div class="row"><button class="btn small ${this.w.quality === 'high' ? 'primary' : ''}" data-q="high">Hoch (Bloom + Schatten)</button><button class="btn small ${this.w.quality === 'medium' ? 'primary' : ''}" data-q="medium">Mittel</button><button class="btn small ${this.w.quality === 'low' ? 'primary' : ''}" data-q="low">Niedrig</button></div></div>
      <div class="sec"><h4>Ton</h4><div class="row"><button class="btn small" data-a="mute">${this.audio?.muted ? '🔇 Ton an' : '🔊 Ton aus'}</button></div></div>
      <div class="sec"><h4>Steuerung</h4><div style="font-size:13px;line-height:1.8">Links = auswählen/bauen · Rechts ziehen = drehen · Mitte ziehen = schieben · Mausrad = Zoom<br/>WASD/Pfeile = Kamera bewegen · Q/E = drehen · R = beim Bauen drehen · Shift = mehrfach bauen<br/>Leertaste = Pause · 1–4 = Tempo · F = Rundgang · ESC = abbrechen</div></div>
      <div class="sec"><h4>Über</h4><div style="font-size:12px;color:#94a0b2">HASHWERK ist ein Fan-Projekt. Alle Marken- und Produktnamen sind fiktiv, die 3D-Modelle prozedural erzeugt. Kurse und Hashraten sind gerundete historische Werte bis November 2026 – danach simuliert. Kein Finanzrat.</div></div></div>`);
    body.querySelector('[data-a=save]').onclick = () => { this.toast(g.save() ? '💾 Gespeichert' : 'Speichern fehlgeschlagen', 'good', 2000); };
    body.querySelector('[data-a=load]').onclick = () => { if (g.load()) { this.closeModal(); this.switchSite(g.s.current); this.speedBar(); this.toast('Spielstand geladen', 'good'); } else this.toast('Kein Spielstand gefunden', 'bad'); };
    const nb = body.querySelector('[data-a=new]');
    nb.onclick = () => {
      if (!nb.dataset.armed) { nb.dataset.armed = '1'; nb.textContent = 'Sicher? Nochmal klicken = neu starten'; setTimeout(() => { if (nb.isConnected) { delete nb.dataset.armed; nb.textContent = 'Neues Spiel'; } }, 4000); return; }
      g.newGame(); this.closeModal(); this.switchSite('kinder'); this.speedBar(); this.ticker();
    };
    body.querySelector('[data-a=mute]').onclick = () => { this.audio?.setMuted(!this.audio.muted); this.menu(); };
    body.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { this.w.setQuality(b.dataset.q); this.menu(); }));
    this.openModal(body, 'narrow', 'menu');
  }

  // ---------- Ticker / Toasts / Hinweis ----------
  ticker() {
    const t = this.g.s.ticker.slice(0, 6);
    $('#tk-text').innerHTML = t.length ? t.map((n) => `<span class="d">${fmtDate(n.day)}</span>${esc(n.text)}`).join('<span class="sep">◆</span>') : '<span class="d">Lindental</span>Willkommen bei HASHWERK.';
  }
  toast(html, kind = 'info', ms = 4500) {
    if (kind === 'bad') this.audio?.bad(); else if (kind === 'msg') this.audio?.message();
    const el = h(`<div class="toast ${kind}">${html}</div>`); $('#toasts').append(el);
    while ($('#toasts').childElementCount > 5) $('#toasts').firstElementChild.remove();
    setTimeout(() => el.remove(), ms);
  }
  tip(uid, pos) {
    let el = document.getElementById('tip');
    if (!uid || !pos) { el?.remove(); return; }
    if (!el) { el = h('<div id="tip"></div>'); document.body.append(el); }
    const g = this.g, o = g.findObj(uid); if (!o) { el.remove(); return; }
    const def = PLACEABLE[o.type], sm = g.summary[g.facOf(uid)], a = sm?.per.get(uid);
    let line = '';
    if (a && a.units.length) { const rev = a.units.reduce((x, u) => x + u.rev, 0) * sm.throttle; const cost = a.watt / 1000 * 24 * sm.elec; line = `${fmtWatt(a.watt)} · <span class="${rev - cost >= 0 ? 'pos' : 'neg'}">${fmtUSD(rev - cost)}/Tag</span>`; }
    else if (def.kind === 'cooling') line = `kühlt ${fmtWatt(def.cool)}`;
    if (a?.status && a.status !== 'ok') line += `<br/><span class="neg">${{ broken: 'Defekt', partial: 'Teilweise defekt', psu: 'Netzteil überlastet', incomplete: 'Unvollständig', empty: 'Leer', idle: 'Pausiert (unrentabel)', off: 'Aus' }[a.status] || ''}</span>`;
    if (o.items) line += `<br/>${o.items.length}/${def.slots} belegt`;
    el.innerHTML = `<b>${esc(def.name)}</b><br/>${line}`;
    el.style.left = pos[0] + 'px'; el.style.top = pos[1] + 'px';
  }
  milestone(title, sub) {
    document.getElementById('milestone')?.remove();
    const el = h(`<div id="milestone"><div class="t1">MEILENSTEIN</div><div class="t2">🏆 ${esc(title)}</div><div class="t3">${esc(sub || '')}</div></div>`);
    document.body.append(el); setTimeout(() => el.remove(), 4300);
    this.audio?.fanfare();
  }
  nwChart(cv) {
    const hist = this.g.s.stats.history; const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H); if (hist.length < 3) { ctx.fillStyle = '#94a0b2'; ctx.font = '26px sans-serif'; ctx.fillText('Noch zu wenig Daten – spiel ein paar Wochen.', 30, 60); return; }
    const vals = hist.map((p) => Math.max(1, p.n)); const lg = (v) => Math.log10(v);
    const mn = lg(Math.min(...vals)), mx = lg(Math.max(...vals)) + 0.01;
    const x = (i) => 70 + (i / (hist.length - 1)) * (W - 90), y = (v) => H - 30 - ((lg(v) - mn) / (mx - mn)) * (H - 60);
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.fillStyle = '#7d8aa0'; ctx.font = '20px sans-serif';
    for (let k = 0; k <= 3; k++) { const v = mn + ((mx - mn) * k) / 3, yy = H - 30 - (k / 3) * (H - 60); ctx.beginPath(); ctx.moveTo(70, yy); ctx.lineTo(W - 10, yy); ctx.stroke(); ctx.fillText(fmtUSD(Math.pow(10, v)), 2, yy - 4); }
    ctx.fillText(fmtDate(hist[0].d), 70, H - 6); ctx.fillText(fmtDate(hist[hist.length - 1].d), W - 150, H - 6);
    ctx.beginPath(); hist.forEach((p, i) => (i ? ctx.lineTo(x(i), y(vals[i])) : ctx.moveTo(x(i), y(vals[i])))); ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 3; ctx.stroke();
  }
  hint(text) { const e = $('#hint'); if (!text) e.classList.add('hidden'); else { e.textContent = text; e.classList.remove('hidden'); } }
}
