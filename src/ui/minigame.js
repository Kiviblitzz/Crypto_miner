// Mini-Spiele der Fähigkeiten 2.0 (Reparatur und Netzteil-Mod). Bedienung: Maus, Touch oder Tastatur. Kein Zeitdruck außer Wärme- und Takt-Balken.
//   loeten  – Kondensatoren durchmessen (das kaputte Bauteil finden), dann 2–3 Lötstellen setzen (Fähigkeit „Löten“: leichter)
//   stecken – Fehlersuche durch Stecken: Rig startet nicht → Karten/Riser einzeln abziehen, Test-Boot, das kaputte Teil tauschen, neu einstecken
//   chips   – Chip-Kette (Hashboard): Signal von Chip zu Chip messen, der erste ohne Signal ist hin → mit Heißluft tauschen
//   psu     – Netzteil-Mod: Ausgangsspannung am Poti einstellen, dann den Shunt brücken (Lötstellen)
// playMinigame(ui, { kind, easy, title, n }) → Promise<{ ok, clean, skipped }>. n = Zahl der Karten (Stecken).
// Esc oder „Abbrechen“ bricht nur das Mini-Spiel ab (skipped). Während des Spiels steht die Zeit (main.js prüft ui.mg),
// der Inspektor ist ausgeblendet und kommt danach wieder. ui.mg.st ist für Tests lesbar.
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const W = 560, H = 300;
const TITLE = { loeten: 'Löten', stecken: 'Fehlersuche', chips: 'Chip-Kette', psu: 'Netzteil-Mod' };

export function playMinigame(ui, opt = {}) {
  return new Promise((resolve) => {
    const kind = GAMES[opt.kind] ? opt.kind : 'loeten', easy = !!opt.easy;
    const st = { kind, phase: '', msg: '', msgT: 0, miss: 0, hold: false, heat: 0, joint: 0, t0: performance.now(), end: null };
    const inspHidden = !document.getElementById('inspector')?.classList.contains('hidden');
    document.getElementById('inspector')?.classList.add('hidden');
    const el = h(`<div id="mg" role="dialog" aria-label="Mini-Spiel"><div class="mg-card"><div class="mg-h"><span class="mg-k">${kind === 'psu' ? 'Umlöten' : 'Selbst reparieren'}</span><b>${opt.title || TITLE[kind]}</b><span class="mg-p"></span></div><div class="mg-i"></div><canvas class="mg-c"></canvas><div class="mg-f"><span class="mg-s"></span><button class="btn small mg-x">Abbrechen <kbd>Esc</kbd></button></div></div></div>`);
    document.body.append(el);
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), infoEl = el.querySelector('.mg-i'), progEl = el.querySelector('.mg-p'), statEl = el.querySelector('.mg-s');
    const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0, last = performance.now(), G = null;
    const finish = (res) => {
      if (st.end) return; st.end = res; cancelAnimationFrame(raf); window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true);
      el.remove(); ui.mg = null; if (inspHidden) document.getElementById('inspector')?.classList.remove('hidden'); resolve(res);
    };
    ui.mg = { cancel: () => finish({ ok: false, clean: false, skipped: true }), st };
    el.querySelector('.mg-x').onclick = () => ui.mg?.cancel();
    const say = (m) => { st.msg = m; st.msgT = performance.now(); };
    const A = { st, ctx, ui, easy, opt, say, sfx: (k) => ui.audio?.[k]?.(), win: (msg) => { st.phase = 'win'; st.winMsg = msg; setTimeout(() => finish({ ok: true, clean: st.miss === 0, skipped: false }), 1100); }, fail: () => { st.phase = 'fail'; setTimeout(() => finish({ ok: false, clean: false, skipped: false }), 1300); } };
    G = GAMES[kind](A);
    const hit = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); G.down(hit(e)); });
    cv.addEventListener('pointerup', (e) => { e.preventDefault(); G.up?.(hit(e)); }); cv.addEventListener('pointercancel', () => { st.hold = false; st.heat = 0; });
    const kd = (e) => { e.stopImmediatePropagation(); if (e.key === 'Escape') { e.preventDefault(); ui.mg?.cancel(); return; } if (G.key(e) !== false) e.preventDefault(); };
    const ku = (e) => { e.stopImmediatePropagation(); G.keyUp?.(e); };
    window.addEventListener('keydown', kd, true); window.addEventListener('keyup', ku, true);
    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const out = G.draw(now, dt) || {};
      infoEl.innerHTML = out.info || ''; progEl.textContent = out.prog || ''; statEl.textContent = out.stat || '';
      if (st.msg && now - st.msgT < 2200) { ctx.fillStyle = 'rgba(10,12,16,.78)'; ctx.fillRect(20, H - 46, W - 40, 32); ctx.fillStyle = st.phase === 'fail' ? '#ff8a7a' : '#ffe2a8'; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText(st.msg, W / 2, H - 24); }
      if (st.phase === 'win') { ctx.fillStyle = 'rgba(10,30,18,.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#7cf0a8'; ctx.font = '800 30px system-ui'; ctx.textAlign = 'center'; ctx.fillText(st.winMsg || (st.miss ? 'Repariert!' : 'Repariert – alles sauber!'), W / 2, H / 2); }
      if (st.phase === 'fail') { ctx.fillStyle = 'rgba(40,10,10,.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#ff8a7a'; ctx.font = '800 26px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Das wird so nichts …', W / 2, H / 2); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
  });
}

// ---------- Bausteine ----------
const pcb = (ctx, col = '#0d3b24') => { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(214,180,90,.35)'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 40 + i * 45); ctx.bezierCurveTo(W * 0.3, 30 + i * 47, W * 0.6, 60 + i * 40, W, 46 + i * 44); ctx.stroke(); } ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % H, 3, 3); };
const txt = (ctx, s, x, y, col = '#e8edf4', font = '700 15px system-ui', al = 'center') => { ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al; ctx.fillText(s, x, y); };
const box = (ctx, x, y, w, hh, col, line = null) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, hh); if (line) { ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, hh); } };
const inR = (p, x, y, w, hh) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + hh;
// Halten und im grünen Bereich loslassen (Lötstellen, Poti): x läuft in heatT Sekunden von 0 nach 1
function holdZone(A, { zone, heatT, maxMiss, onHit, cold, hot }) {
  const st = A.st;
  return {
    press() { if (!st.hold) { st.hold = true; st.heat = 0; } },
    release() {
      if (!st.hold) return; st.hold = false; const x = st.heat; st.heat = 0;
      if (x >= zone[0] && x <= zone[1]) { A.sfx('install'); onHit(); }
      else { st.miss++; A.sfx('bad'); A.say(x < zone[0] ? cold : hot); if (st.miss > maxMiss) A.fail(); }
    },
    tick(dt) { if (st.hold) { st.heat += dt / heatT; if (st.heat > 1.04) { st.heat = 1.04; this.release(); } } },
    bar(ctx, bx = 470, by = 40, bh = 220, label = 'Wärme') {
      box(ctx, bx, by, 34, bh, '#10161d'); ctx.fillStyle = 'rgba(61,220,132,.55)'; ctx.fillRect(bx, by + bh * (1 - zone[1]), 34, bh * (zone[1] - zone[0]));
      ctx.fillStyle = st.heat > zone[1] ? '#ff5a4a' : st.heat >= zone[0] ? '#3ddc84' : '#ffb000'; ctx.fillRect(bx + 6, by + bh * (1 - Math.min(1, st.heat)), 22, bh * Math.min(1, st.heat));
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.strokeRect(bx, by, 34, bh); txt(ctx, label, bx + 17, by + bh + 18, '#b7c0cc', '600 12px system-ui');
    },
  };
}
// Lötstellen setzen (gemeinsam für Löten, Chip-Kette, Netzteil-Mod)
function solder(A, { joints, label, done, zone, heatT, maxMiss }) {
  const st = A.st; st.joint = 0;
  const z = holdZone(A, { zone, heatT, maxMiss, cold: 'Kalte Lötstelle – noch mal, länger halten.', hot: 'Zu heiß – das Pad verbrennt gleich. Noch mal.', onHit: () => { st.joint++; A.say('Sauber!'); if (st.joint >= joints) done(); } });
  return {
    z,
    draw(ctx, now) {
      ctx.fillStyle = '#2f6fb0'; ctx.fillRect(150, 70, 260, 70); txt(ctx, label, 280, 112, '#e8edf4', '700 16px system-ui');
      for (let j = 0; j < joints; j++) {
        const x = 190 + (j * 180) / Math.max(1, joints - 1), y = 175, ok = j < st.joint, cur = j === st.joint && st.phase === 'solder';
        ctx.fillStyle = '#c9a14a'; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill(); ctx.strokeStyle = '#5a4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 140); ctx.lineTo(x, y); ctx.stroke();
        if (ok) { const gr = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 16); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9aa3ad'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill(); }
        if (cur) {
          ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.stroke();
          ctx.strokeStyle = '#888'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 6, y - 10); ctx.lineTo(x + 70, y - 90); ctx.stroke(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x + 60, y - 78); ctx.lineTo(x + 110, y - 140); ctx.stroke();
          if (st.hold) { ctx.fillStyle = `rgba(255,${Math.round(200 - st.heat * 150)},80,${0.35 + st.heat * 0.4})`; ctx.beginPath(); ctx.arc(x, y, 10 + st.heat * 8, 0, 7); ctx.fill(); for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(220,220,220,${0.15 + 0.1 * k})`; ctx.beginPath(); ctx.arc(x + 10 + k * 6, y - 20 - ((now / 8 + k * 30) % 40), 4 + k, 0, 7); ctx.fill(); } }
        }
      }
      z.bar(ctx);
    },
    info: 'Lötkolben auf das Pad: <b>gedrückt halten</b> (Maus, Finger oder <kbd>Leertaste</kbd>) und im <b style="color:#3ddc84">grünen Bereich</b> loslassen.',
  };
}
const solderCfg = (easy) => ({ zone: easy ? [0.52, 0.84] : [0.6, 0.8], heatT: easy ? 1.9 : 1.5, maxMiss: easy ? 3 : 2 });
const hold = (e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat;
const missTxt = (st, max, easy, tip) => (st.miss ? `${st.miss} ${st.miss === 1 ? 'Fehlversuch' : 'Fehlversuche'} · höchstens ${max}` : easy ? 'Mit Übung: breiter grüner Bereich' : tip);

// ---------- Spiele ----------
const GAMES = {
  // Löten: erst messen, dann löten
  loeten(A) {
    const { st, ctx, easy } = A, cfg = solderCfg(easy), joints = easy ? 2 : 3;
    const parts = [{ n: 'C1', v: '12,1 V' }, { n: 'C2', v: '12,0 V' }, { n: 'C3', v: '11,9 V' }, { n: 'C4', v: '12,1 V' }], bad = Math.floor(Math.random() * 4);
    Object.assign(st, { phase: 'measure', sel: 0, probed: {}, bad });
    const cx = (i) => 95 + i * 123;
    const S = solder(A, { ...cfg, joints, label: `${parts[bad].n} (neu)`, done: () => A.win() });
    const probe = (i) => {
      if (st.phase !== 'measure' || st.probed[i]) return; st.sel = i; st.probed[i] = 1; A.sfx('tick');
      if (i === bad) { A.say(`${parts[i].n} zeigt 0,0 V – der ist durch!`); st.phase = 'found'; setTimeout(() => { if (!st.end) { st.phase = 'solder'; A.say(''); } }, 900); } else A.say(`${parts[i].n}: ${parts[i].v} – in Ordnung`);
    };
    return {
      down(p) { if (st.phase === 'measure') { for (let i = 0; i < 4; i++) if (Math.abs(p.x - cx(i)) < 52 && p.y > 70 && p.y < 230) probe(i); } else if (st.phase === 'solder') S.z.press(); },
      up() { if (st.phase === 'solder') S.z.release(); },
      key(e) { if (st.phase === 'measure') { if (e.key === 'ArrowLeft') st.sel = (st.sel + 3) % 4; else if (e.key === 'ArrowRight') st.sel = (st.sel + 1) % 4; else if (/^[1-4]$/.test(e.key)) probe(+e.key - 1); else if (e.key === ' ' || e.key === 'Enter') probe(st.sel); return; } if (st.phase === 'solder' && hold(e)) S.z.press(); },
      keyUp(e) { if (st.phase === 'solder' && (e.key === ' ' || e.key === 'Enter')) S.z.release(); },
      draw(now, dt) {
        if (st.phase === 'solder') S.z.tick(dt);
        pcb(ctx);
        if (st.phase === 'measure' || st.phase === 'found') {
          for (let i = 0; i < 4; i++) {
            const x = cx(i), p = st.probed[i], isBad = p && i === bad, sel = st.sel === i;
            ctx.fillStyle = '#1f2a33'; ctx.fillRect(x - 30, 96, 60, 92); ctx.fillStyle = isBad ? '#7a3a2a' : '#2f6fb0'; ctx.beginPath(); ctx.ellipse(x, 120, 26, 12, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 26, 120, 52, 52); ctx.beginPath(); ctx.ellipse(x, 172, 26, 12, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, 113); ctx.lineTo(x + 10, 113); ctx.moveTo(x, 108); ctx.lineTo(x, 118); ctx.stroke();
            if (isBad) { ctx.fillStyle = '#d9b27a'; ctx.beginPath(); ctx.ellipse(x, 108, 16, 7, 0, 0, 7); ctx.fill(); }
            txt(ctx, parts[i].n, x, 214);
            if (p) txt(ctx, isBad ? '0,0 V' : parts[i].v, x, 80, isBad ? '#ff6b5a' : '#7cf0a8', '700 17px ui-monospace, monospace');
            if (sel && st.phase === 'measure') { ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2.5; ctx.strokeRect(x - 40, 88, 80, 136); }
          }
          const x = cx(st.sel); ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 8, 104); ctx.lineTo(x - 40, 30); ctx.stroke(); ctx.strokeStyle = '#202020'; ctx.beginPath(); ctx.moveTo(x + 8, 104); ctx.lineTo(x + 40, 30); ctx.stroke();
          return { info: 'Miss die Kondensatoren durch: <b>antippen</b> oder <kbd>1</kbd>–<kbd>4</kbd>. Einer zeigt den falschen Wert.', prog: 'Schritt 1 von 2 · Messen', stat: missTxt(st, cfg.maxMiss, easy, 'Tipp: Die Fähigkeit „Löten“ macht es leichter') };
        }
        S.draw(ctx, now);
        return { info: S.info, prog: `Schritt 2 von 2 · Lötstelle ${Math.min(joints, st.joint + 1)} von ${joints}`, stat: missTxt(st, cfg.maxMiss, easy, 'Tipp: Die Fähigkeit „Löten“ macht es leichter') };
      },
    };
  },

  // Fehlersuche durch Stecken: Karten/Riser abziehen, Test-Boot, das kaputte Teil tauschen, dann neu einstecken (Takt)
  stecken(A) {
    const { st, ctx, easy } = A, n = Math.max(3, Math.min(8, A.opt.n || 4)), bad = Math.floor(Math.random() * n);
    const maxBoots = Math.ceil(Math.log2(n)) + (easy ? 3 : 2), maxMiss = easy ? 3 : 2, win = easy ? [0.36, 0.64] : [0.42, 0.58], speed = easy ? 1.7 : 2.3;
    const sus = new Set([bad]); if (easy) { const half = Math.ceil(n / 2); while (sus.size < half) sus.add(Math.floor(Math.random() * n)); } // Dioden: Verdächtige leuchten
    Object.assign(st, { phase: 'find', n, bad, plug: Array(n).fill(true), boots: 0, last: null, sel: 0, pos: 0, step: 0, t: 0 });
    const sw = (W - 60) / n, sx = (i) => 30 + i * sw, part = Math.random() < 0.6 ? 'Riser' : 'Karte';
    const BOOT = { x: 20, y: 236, w: 150, h: 44 };
    const toggle = (i) => { if (st.phase !== 'find') return; st.plug[i] = !st.plug[i]; st.sel = i; A.sfx('tick'); };
    const boot = () => {
      if (st.phase !== 'find') return; if (st.boots >= maxBoots) { A.say('Genug gebootet – jetzt tauschen, was du für kaputt hältst.'); return; }
      st.boots++; const on = st.plug.filter(Boolean).length, ok = !st.plug[bad]; st.last = { ok, on, plug: [...st.plug] }; A.sfx(ok ? 'install' : 'bad');
      A.say(ok ? (on ? `Bootet! ${on} ${on === 1 ? 'Karte läuft' : 'Karten laufen'} – unter den gesteckten ist es nicht.` : 'Bootet – ohne Karten sagt das wenig.') : 'Kein Bild – unter den gesteckten ist das kaputte Teil.');
    };
    const swap = (i) => {
      if (st.phase !== 'find') return; st.sel = i;
      if (i === bad) { A.sfx('install'); A.say(`Gefunden: Steckplatz ${i + 1} – ${part === 'Riser' ? 'der Riser ist durch' : 'die Karte ist tot'}.`); st.phase = 'plug'; st.t = 0; return; }
      st.miss++; A.sfx('bad'); A.say(`Steckplatz ${i + 1} war heil – der Rig hängt weiter.`); if (st.miss > maxMiss) A.fail();
    };
    const press = () => { // Takt: Stecker genau auf den Steckplatz
      if (st.phase !== 'plug') return; const p = st.pos;
      if (p >= win[0] && p <= win[1]) { st.step++; A.sfx('install'); A.say(st.step === 1 ? `${part === 'Riser' ? 'Neuer Riser' : 'Ersatzkarte'} sitzt. Jetzt das PCIe-Stromkabel.` : 'Eingerastet!'); if (st.step >= 2) A.win('Läuft wieder!'); }
      else { st.miss++; A.sfx('bad'); A.say('Daneben – der Stecker verkantet. Noch mal.'); if (st.miss > maxMiss) A.fail(); }
    };
    return {
      down(p) {
        if (st.phase === 'plug') { press(); return; } if (st.phase !== 'find') return;
        if (inR(p, BOOT.x, BOOT.y, BOOT.w, BOOT.h)) { boot(); return; }
        for (let i = 0; i < n; i++) { if (inR(p, sx(i) + 4, 200, sw - 8, 26)) { swap(i); return; } if (inR(p, sx(i) + 4, 50, sw - 8, 140)) { toggle(i); return; } }
      },
      key(e) {
        if (st.phase === 'plug') { if (hold(e)) press(); return; } if (st.phase !== 'find') return false;
        const d = /^Digit[1-8]$/.test(e.code || '') ? +e.code.slice(5) - 1 : /^[1-8]$/.test(e.key) ? +e.key - 1 : -1; if (d >= 0 && d < n) { if (e.shiftKey) swap(d); else toggle(d); return; } // ⇧+Zahl: e.key ist dann „!“ usw., deshalb e.code
        if (e.key === 'ArrowLeft') st.sel = (st.sel + n - 1) % n; else if (e.key === 'ArrowRight') st.sel = (st.sel + 1) % n; else if (e.key === ' ') toggle(st.sel); else if (e.key === 'b' || e.key === 'B' || e.key === 'Enter') boot(); else if (e.key === 't' || e.key === 'T') swap(st.sel); else return false;
      },
      draw(now, dt) {
        pcb(ctx, '#1b2430');
        if (st.phase === 'plug' || st.phase === 'win') {
          st.t += dt; st.pos = (Math.sin(st.t * speed * 2) + 1) / 2;
          const x0 = 80, x1 = 480, y = 150; box(ctx, x0, y - 6, x1 - x0, 12, '#10161d'); ctx.fillStyle = 'rgba(61,220,132,.55)'; ctx.fillRect(x0 + (x1 - x0) * win[0], y - 10, (x1 - x0) * (win[1] - win[0]), 20);
          box(ctx, x0 + (x1 - x0) * 0.5 - 40, y + 26, 80, 34, '#2a3442', '#6c7586'); txt(ctx, st.step ? 'PCIe 8-Pin' : 'Steckplatz', x0 + (x1 - x0) * 0.5, y + 48, '#cfd6e0', '600 13px system-ui');
          const px = x0 + (x1 - x0) * st.pos; box(ctx, px - 16, y - 46, 32, 34, '#c9a14a', '#5a4a2a'); txt(ctx, st.step ? '⚡' : '▮▮', px, y - 24, '#2a2a2a', '700 14px system-ui');
          txt(ctx, `${st.step + 1} von 2`, 280, 60, '#ffe2a8');
          return { info: 'Neues Teil einstecken: drücken (<kbd>Leertaste</kbd>, Klick oder Finger), wenn der Stecker über dem <b style="color:#3ddc84">grünen Bereich</b> steht.', prog: 'Schritt 2 von 2 · Einstecken', stat: missTxt(st, maxMiss, easy, 'Tipp: Die Fähigkeit „Fehlersuche“ macht es leichter') };
        }
        for (let i = 0; i < n; i++) {
          const x = sx(i), on = st.plug[i], sel = st.sel === i;
          box(ctx, x + 6, 160, sw - 12, 14, '#2a2f38'); // PCIe-Steckplatz
          if (on) { box(ctx, x + 10, 58, sw - 20, 100, '#3b4656', '#6c7586'); ctx.fillStyle = '#1e242c'; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(x + sw / 2, 88 + k * 40, Math.min(16, sw / 4), 0, 7); ctx.fill(); } ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + sw / 2, 158); ctx.lineTo(x + sw / 2, 172); ctx.stroke(); }
          else { ctx.setLineDash([5, 4]); ctx.strokeStyle = '#4a5260'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 10, 58, sw - 20, 100); ctx.setLineDash([]); txt(ctx, 'ab', x + sw / 2, 112, '#6c7586', '600 13px system-ui'); }
          if (easy && sus.has(i)) { ctx.fillStyle = (now / 400) % 2 < 1 ? '#ffb000' : '#7a5400'; ctx.beginPath(); ctx.arc(x + sw - 16, 50, 5, 0, 7); ctx.fill(); } // Diode: verdächtig
          txt(ctx, String(i + 1), x + sw / 2, 44, sel ? '#ffb000' : '#cfd6e0', '700 14px system-ui');
          box(ctx, x + 4, 200, sw - 8, 26, '#3a1e1e', '#8a4a4a'); txt(ctx, 'tauschen', x + sw / 2, 218, '#ffb4a8', '600 12px system-ui');
          if (sel) { ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, 30, sw - 4, 200); }
        }
        box(ctx, BOOT.x, BOOT.y, BOOT.w, BOOT.h, st.boots >= maxBoots ? '#222830' : '#1f3b5a', '#5d8fc4'); txt(ctx, `Test-Boot (${maxBoots - st.boots})`, BOOT.x + BOOT.w / 2, BOOT.y + 28, '#e8edf4', '700 15px system-ui');
        const L = st.last; box(ctx, 190, 236, 350, 44, '#0e1218', '#3b4252'); txt(ctx, L ? (L.ok ? `Letzter Boot: läuft (${L.on} gesteckt)` : 'Letzter Boot: kein Bild') : 'Noch nicht gebootet: alle gesteckt, kein Bild', 365, 264, L ? (L.ok ? '#7cf0a8' : '#ff8a7a') : '#b7c0cc', '600 14px system-ui');
        return { info: `Der Rig startet nicht. <b>Karte antippen</b> = abziehen/stecken (<kbd>1</kbd>–<kbd>${n}</kbd>), <b>Test-Boot</b> (<kbd>B</kbd>) zeigt, ob das kaputte Teil noch steckt. Dann <b>tauschen</b> (<kbd>⇧</kbd>+Zahl).${easy ? ' Gelbe Dioden: verdächtig.' : ''}`, prog: 'Schritt 1 von 2 · Fehler suchen', stat: missTxt(st, maxMiss, easy, 'Halbe-halbe abziehen – so reichen wenige Test-Boots') };
      },
    };
  },

  // Chip-Kette: das Signal läuft von Chip 1 bis 16; der erste Chip ohne Signal ist hin
  chips(A) {
    const { st, ctx, easy } = A, M = 16, bad = 1 + Math.floor(Math.random() * (M - 1)), maxMeas = Math.ceil(Math.log2(M)) + (easy ? 3 : 2), cfg = solderCfg(easy), maxMiss = cfg.maxMiss;
    Object.assign(st, { phase: 'find', bad, meas: {}, nMeas: 0, sel: 0 });
    const pos = (i) => { const r = Math.floor(i / 8), c = r ? 7 - (i % 8) : i % 8; return { x: 52 + c * 62, y: r ? 168 : 74 }; }; // Schlange: oben rechts, unten zurück
    const SWAP = { x: 380, y: 240, w: 160, h: 42 };
    const S = solder(A, { ...cfg, joints: 2, label: `Chip U${bad + 1} (neu, Heißluft)`, done: () => A.win('Alle 16 Chips antworten!') });
    const meas = (i) => { if (st.phase !== 'find') return; st.sel = i; if (st.meas[i] != null) return; if (st.nMeas >= maxMeas) { A.say('Messpunkte verbraucht – tausch den Chip, den du für tot hältst.'); return; } st.nMeas++; st.meas[i] = i < bad; A.sfx('tick'); A.say(i < bad ? `U${i + 1}: Signal da – der Fehler liegt dahinter.` : `U${i + 1}: kein Signal – der Fehler liegt hier oder davor.`); };
    const swap = () => { if (st.phase !== 'find') return; const i = st.sel; if (i === bad) { A.sfx('install'); A.say(`U${i + 1} ist der Übeltäter – raus damit.`); st.phase = 'found'; setTimeout(() => { if (!st.end) { st.phase = 'solder'; A.say(''); } }, 900); return; } st.miss++; A.sfx('bad'); A.say(`U${i + 1} war heil – die Kette hängt weiter.`); if (st.miss > maxMiss) A.fail(); };
    return {
      down(p) {
        if (st.phase === 'solder') { S.z.press(); return; } if (st.phase !== 'find') return;
        if (inR(p, SWAP.x, SWAP.y, SWAP.w, SWAP.h)) { swap(); return; }
        for (let i = 0; i < M; i++) { const q = pos(i); if (inR(p, q.x - 24, q.y - 24, 48, 48)) { if (st.sel === i && st.meas[i] != null) return; meas(i); return; } }
      },
      up() { if (st.phase === 'solder') S.z.release(); },
      key(e) {
        if (st.phase === 'solder') { if (hold(e)) S.z.press(); return; } if (st.phase !== 'find') return false;
        if (e.key === 'ArrowRight') st.sel = Math.min(M - 1, st.sel + 1); else if (e.key === 'ArrowLeft') st.sel = Math.max(0, st.sel - 1); else if (e.key === ' ' || e.key === 'Enter') meas(st.sel); else if (e.key === 't' || e.key === 'T') swap(); else return false;
      },
      keyUp(e) { if (st.phase === 'solder' && (e.key === ' ' || e.key === 'Enter')) S.z.release(); },
      draw(now, dt) {
        if (st.phase === 'solder') S.z.tick(dt);
        pcb(ctx, '#123a2c');
        if (st.phase === 'solder' || (st.phase === 'win' && st.joint)) { S.draw(ctx, now); return { info: S.info, prog: `Schritt 2 von 2 · Chip tauschen ${Math.min(2, st.joint + 1)} von 2`, stat: missTxt(st, maxMiss, easy, '') }; }
        ctx.strokeStyle = 'rgba(255,214,120,.45)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < M; i++) { const q = pos(i); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); } ctx.stroke();
        for (let i = 0; i < M; i++) {
          const q = pos(i), m = st.meas[i], sel = st.sel === i;
          box(ctx, q.x - 20, q.y - 20, 40, 40, '#20262e', m == null ? '#4a5260' : m ? '#3ddc84' : '#ff6b5a'); txt(ctx, `U${i + 1}`, q.x, q.y + 5, '#cfd6e0', '600 12px system-ui');
          if (m != null) txt(ctx, m ? '0,4 V' : '–', q.x, q.y - 26, m ? '#7cf0a8' : '#ff8a7a', '700 12px ui-monospace, monospace');
          if (sel) { ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2.5; ctx.strokeRect(q.x - 25, q.y - 25, 50, 50); }
        }
        txt(ctx, 'Signal →', 52, 40, '#ffe2a8', '600 12px system-ui', 'left');
        box(ctx, 20, 240, 340, 42, '#0e1218', '#3b4252'); txt(ctx, `Messpunkte: ${maxMeas - st.nMeas} von ${maxMeas} übrig`, 190, 266, '#b7c0cc', '600 14px system-ui');
        box(ctx, SWAP.x, SWAP.y, SWAP.w, SWAP.h, '#3a1e1e', '#8a4a4a'); txt(ctx, `U${st.sel + 1} tauschen`, SWAP.x + SWAP.w / 2, SWAP.y + 27, '#ffb4a8', '700 15px system-ui');
        return { info: 'Das Signal läuft von <b>U1</b> bis <b>U16</b>. Chip <b>antippen</b> = messen (<kbd>←</kbd><kbd>→</kbd> + <kbd>Leertaste</kbd>). Der <b>erste Chip ohne Signal</b> ist hin – den tauschen (<kbd>T</kbd>).', prog: 'Schritt 1 von 2 · Kette messen', stat: missTxt(st, maxMiss, easy, 'In der Mitte anfangen spart Messpunkte') };
      },
    };
  },

  // Netzteil-Mod: Spannung am Poti einstellen (halten, im Ziel loslassen), dann den Shunt brücken
  psu(A) {
    const { st, ctx, easy } = A, cfg = solderCfg(easy), joints = easy ? 2 : 3;
    Object.assign(st, { phase: 'volt' });
    const V = holdZone(A, { zone: easy ? [0.55, 0.78] : [0.6, 0.72], heatT: 2.2, maxMiss: cfg.maxMiss, cold: 'Zu wenig – das bringt kaum Leistung. Noch mal.', hot: 'Überspannungsschutz! Netzteil aus und noch mal.', onHit: () => { A.say(`${volt(st.vHit)} – passt!`); st.phase = 'found'; setTimeout(() => { if (!st.end) { st.phase = 'solder'; A.say(''); } }, 900); } });
    const volt = (x) => `${(12 + x * 1).toFixed(2).replace('.', ',')} V`;
    const S = solder(A, { ...cfg, joints, label: 'Shunt R12 (brücken)', done: () => A.win('Umgelötet!') });
    const press = () => { if (st.phase === 'volt') V.press(); else if (st.phase === 'solder') S.z.press(); };
    const release = () => { if (st.phase === 'volt') { st.vHit = st.heat; V.release(); } else if (st.phase === 'solder') S.z.release(); };
    return {
      down: press, up: release,
      key(e) { if (hold(e)) press(); else return false; },
      keyUp(e) { if (e.key === ' ' || e.key === 'Enter') release(); },
      draw(now, dt) {
        if (st.phase === 'volt') V.tick(dt); else if (st.phase === 'solder') S.z.tick(dt);
        pcb(ctx, '#2a2f38');
        if (st.phase === 'solder' || (st.phase === 'win' && st.joint)) { S.draw(ctx, now); return { info: S.info, prog: `Schritt 2 von 2 · Lötstelle ${Math.min(joints, st.joint + 1)} von ${joints}`, stat: missTxt(st, cfg.maxMiss, easy, 'Tipp: Die Fähigkeit „Löten“ macht es leichter') }; }
        // Multimeter und Poti
        box(ctx, 90, 50, 250, 150, '#e2c23a', '#8a7420'); box(ctx, 110, 66, 210, 64, '#b9c9a8'); txt(ctx, volt(Math.min(1, st.heat)), 215, 110, '#1a1f14', '700 34px ui-monospace, monospace');
        txt(ctx, 'Ziel: 12,60 – 12,70 V', 215, 160, '#3a3210', '700 14px system-ui'); txt(ctx, '12-V-Schiene', 215, 185, '#3a3210', '600 12px system-ui');
        ctx.fillStyle = '#5a5f68'; ctx.beginPath(); ctx.arc(400, 170, 26, 0, 7); ctx.fill(); ctx.strokeStyle = '#e8edf4'; ctx.lineWidth = 4; const a = -2.2 + Math.min(1, st.heat) * 4.4; ctx.beginPath(); ctx.moveTo(400, 170); ctx.lineTo(400 + Math.sin(a) * 20, 170 - Math.cos(a) * 20); ctx.stroke(); txt(ctx, 'Poti VR1', 400, 220, '#cfd6e0', '600 12px system-ui');
        V.bar(ctx, 470, 40, 220, 'Spannung');
        return { info: 'Poti drehen: <b>gedrückt halten</b> (Maus, Finger oder <kbd>Leertaste</kbd>), die Spannung steigt – im <b style="color:#3ddc84">grünen Bereich</b> loslassen.', prog: 'Schritt 1 von 2 · Spannung einstellen', stat: missTxt(st, cfg.maxMiss, easy, 'Tipp: Die Fähigkeit „Löten“ macht das Löten leichter') };
      },
    };
  },
};
export const MINIGAMES = Object.keys(GAMES);
