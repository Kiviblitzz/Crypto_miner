// Oberfläche für Papas Miner (Neben-Quest) und den Umzug ins Zimmer über dem Laden (Spiel: src/sim/papa.js, Welt: src/world/papa.js)
//   papaRig   – E an Papas Miner: Kamera fährt heran, Inspektor-Karte mit Teilen, Verbrauch, Netzteil; dort das Netzteil tauschen bzw. den Lüfter
//   papaTalk  – E bei Papa: im Kurssturz halten oder verkaufen, zum Abschluss sein Ehrenplatz
//   moveScene – nach dem Ja zum Umzug: Blende, Papas Lieferwagen, Aufwachen auf dem Feldbett in der Werkstatt
import { PART } from '../data/hardware.js';
import { PAPA_TXT } from '../data/papa.js';
import { PEOPLE } from '../data/story.js';
import { fmtUSD } from '../sim/game.js';
import { playMinigame } from './minigame.js';
import './papa.css';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pts = (n) => `+${n} ${n === 1 ? 'Punkt' : 'Punkte'}`;

// Inspektor-Karte für Papas Miner
export function papaRig(ui) {
  const g = ui.g, v = g.papaView(); if (!v) return;
  const r = v.rig, gpu = PART[r.gpus[0]], bad = v.st === 'psu' || v.st === 'heat';
  const rows = [['Mainboard', PART[r.mobo]?.name], ['Prozessor', PART[r.cpu]?.name], ['Grafikkarten', `${r.gpus.length}× ${gpu?.name || '–'}`], ['Netzteil', PART[r.psu]?.name], ['Verbrauch', `<span class="${v.st === 'psu' ? 'neg' : ''}">${v.need} W</span>`]];
  if (v.st === 'heat' || v.fan === 'neu') rows.push(['Temperatur', `<span class="${v.st === 'heat' ? 'neg' : ''}">${v.temp} °C</span>`]);
  const why = v.st === 'psu' ? `Netzteil zu schwach: ${v.need} W an ${v.cap} W.` : v.st === 'heat' ? 'Lüfter verstaubt. Bei 94 °C schaltet er ab.' : v.sign ? 'Schürft für Papa. Mit Schild.' : 'Schürft für Papa.';
  const n = h(`<div class="papa-rig"><div class="insp-h"><h3>Papas Miner</h3><span class="pr-badge ${bad ? 'bad' : 'ok'}">${esc(v.status)}</span></div><div class="kv">${rows.map(([k, x]) => `<div class="k">${k}</div><div class="v">${x}</div>`).join('')}</div><p class="pr-why">${esc(why)}</p><div class="pr-act"></div></div>`);
  const act = n.querySelector('.pr-act');
  if (v.st === 'psu') {
    act.append(h('<div class="pr-h">Neues Netzteil <span>Papa zahlt</span></div>'));
    const row = h('<div class="pr-psus"></div>'); act.append(row);
    for (const p of g.papaPsus()) {
      const b = h(`<button class="btn pr-psu"><b>${p.cap.toLocaleString('de-DE')} W</b><small>${p.cur ? 'wie das alte' : esc(ui.money(p.price))}</small></button>`);
      b.onclick = () => {
        const res = g.papaSetPsu(p.id); if (!res) return;
        if (!res.ok) { ui.audio?.papaBeep?.(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); const w = n.querySelector('.pr-why'); w.textContent = res.text; w.classList.add('neg'); return; } // im Fenster sichtbar (Meldungen liegen hinter dem Fenster)
        ui.closeModal(); ui.w.papaInstall?.('psu'); ui.audio?.install?.();
        setTimeout(() => papaCard(ui, res.text, [pts(res.pts), res.best ? 'genau passend' : '']), 900);
      };
      row.append(b);
    }
  } else if (v.st === 'heat') {
    const b = h('<button class="btn primary wide">Lüfter sauber machen</button>'); act.append(b);
    b.onclick = () => {
      ui.closeModal(); ui.openUI();
      playMinigame(ui, { kind: 'luefter', title: 'Papas Lüfter', easy: g.knows?.('luefter') }).then((res) => {
        if (res.skipped) { ui.resume(); return; }
        if (!res.ok) { ui.resume(); ui.toast('Noch mal – Papa wartet.', 'info', 2600); return; }
        const rr = g.papaCool(res); if (!rr?.ok) { ui.resume(); return; }
        papaCard(ui, rr.text + (rr.gift ? ` ${rr.gift}` : ''), [pts(rr.pts), rr.part ? `${PART[rr.part].name} fürs Lager` : '']);
      });
    };
  }
  ui.openModal(n, 'narrow', 'papa');
  ui.w.focusObject?.('papa'); ui.onModalClose = () => ui.w.focusObject?.(null); // Kamera an den Miner, beim Schließen zurück
}

// Papa sagt etwas, darunter die Belohnung
export function papaCard(ui, line, gains = [], btns = null) {
  const s = ui.g.s, gl = gains.filter(Boolean);
  const n = h(`<div class="story talk papa-talk"><div class="tk-who"><span class="tk-av">${ui.face('papa')}</span><div class="tk-n"><b>Papa</b><small>${esc(PEOPLE.papa.role(s))}</small></div></div><p class="tk-line">„${esc(line)}“</p>${gl.length ? `<div class="pr-gain">${gl.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}<div class="tk-foot pr-foot"></div></div>`);
  const foot = n.querySelector('.pr-foot');
  if (btns) for (const [label, fn, prim] of btns) { const b = h(`<button class="btn ${prim ? 'primary' : ''}">${esc(label)}</button>`); b.onclick = fn; foot.append(b); }
  else { foot.append(h('<span></span>')); const b = h('<button class="btn primary">Bis später</button>'); b.onclick = () => ui.closeModal(); foot.append(b); }
  ui.openModal(n, 'narrow', 'talk');
  if (gl.length) ui.audio?.cash?.();
  ui.refresh?.();
}

// Gespräch mit Papa, wenn die Quest ihn braucht (true = erledigt, sonst das normale Gespräch)
export function papaTalk(ui) {
  const g = ui.g, P = g.s.papa, st = P?.st;
  if (st === 'panic') {
    const go = (hold) => () => { const r = g.papaDecide(hold); if (!r) { ui.closeModal(); return; } papaCard(ui, r.text, [pts(r.pts)]); };
    papaCard(ui, PAPA_TXT.panic(P.drop || 25), [], [[PAPA_TXT.sell, go(false)], [PAPA_TXT.hold, go(true)]]); // beide gleich: du entscheidest
    return true;
  }
  if (st === 'proud') { const r = g.papaFinish(); if (!r) return false; papaCard(ui, r.text, [pts(r.pts), `+${fmtUSD(r.cash)}`, 'Papa +1']); ui.w.papaKey = null; return true; }
  return false;
}

// Nach dem Ja: Papas Lieferwagen fährt, man wacht am nächsten Morgen auf dem Feldbett in der Werkstatt auf
export function moveScene(ui, info = {}) {
  if (ui.sleeping) return; ui.sleeping = true; const g = ui.g, s = g.s;
  ui.resume();
  const fx = h('<div id="sleepfx" class="moving"><div class="zz">Umzug</div><div class="clk"><i></i><i></i></div></div>'); document.body.append(fx);
  requestAnimationFrame(() => fx.classList.add('in'));
  setTimeout(() => {
    g.advanceDay(); s.frac = 0.29; ui.w.visFrac = 0.29;
    ui.switchSite('werkstatt', { bed: true, quiet: true });
    fx.classList.add('morning'); ui.audio?.alarm?.();
    setTimeout(() => {
      fx.classList.add('out'); setTimeout(() => { fx.remove(); ui.sleeping = false; }, 900);
      const n = info.crates || 0; ui.toast(`Erster Morgen über dem Laden${n ? ` · ${n === 1 ? 'eine Kiste' : `${n} Kisten`} am Rolltor` : ''}`, 'good', 5000);
    }, 1100);
  }, 2400);
}

// Hinweis am Fadenkreuz
export function papaPrompt(ui, p) {
  if (p.action === 'papaRig') return `<kbd>E</kbd>Papas Miner<div class="st">${esc(p.hint)}</div>`;
  if (p.action === 'crate') return `<kbd>E</kbd>Auspacken<span> · ${esc(p.name || 'Kiste')}</span>`;
  return '';
}
