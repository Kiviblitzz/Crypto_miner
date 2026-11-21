// Mini-Spiel bei Reparaturen (Fähigkeiten 2.0): „Löten“ – erst messen (das kaputte Bauteil finden), dann 2–3 Lötstellen setzen.
// Bedienung: Maus, Touch oder Tastatur (1–4/Pfeile + Leertaste/Enter zum Messen, Leertaste halten zum Löten). Kein Zeitdruck außer dem Wärmebalken.
// playMinigame(ui, { kind, easy, title }) → Promise<{ ok, clean, skipped }>. Esc oder „Abbrechen“ bricht nur das Mini-Spiel ab (skipped).
// Während des Spiels steht die Zeit (main.js prüft ui.mg), der Inspektor ist ausgeblendet und kommt danach wieder.
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export function playMinigame(ui, opt = {}) {
  return new Promise((resolve) => {
    const easy = !!opt.easy, joints = easy ? 2 : 3, zone = easy ? [0.52, 0.84] : [0.6, 0.8], heatT = easy ? 1.9 : 1.5, maxMiss = easy ? 3 : 2;
    const parts = [{ n: 'C1', v: '12,1 V' }, { n: 'C2', v: '12,0 V' }, { n: 'C3', v: '11,9 V' }, { n: 'C4', v: '12,1 V' }], bad = Math.floor(Math.random() * 4);
    const st = { phase: 'measure', sel: 0, probed: {}, joint: 0, heat: 0, hold: false, miss: 0, done: [], msg: '', msgT: 0, t0: performance.now(), end: null };
    const inspHidden = !document.getElementById('inspector')?.classList.contains('hidden');
    document.getElementById('inspector')?.classList.add('hidden');
    const el = h(`<div id="mg" role="dialog" aria-label="Mini-Spiel"><div class="mg-card"><div class="mg-h"><span class="mg-k">Selbst reparieren</span><b>${opt.title || 'Löten'}</b><span class="mg-p"></span></div><div class="mg-i"></div><canvas class="mg-c"></canvas><div class="mg-f"><span class="mg-s"></span><button class="btn small mg-x">Abbrechen <kbd>Esc</kbd></button></div></div></div>`);
    document.body.append(el);
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), info = el.querySelector('.mg-i'), prog = el.querySelector('.mg-p'), stat = el.querySelector('.mg-s');
    const W = 560, H = 300, dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = (i) => 95 + i * 123; // Bauteile auf der Platine
    let raf = 0, last = performance.now();
    const finish = (res) => {
      if (st.end) return; st.end = res; cancelAnimationFrame(raf); window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true);
      el.remove(); ui.mg = null; if (inspHidden) document.getElementById('inspector')?.classList.remove('hidden'); resolve(res);
    };
    ui.mg = { cancel: () => finish({ ok: false, clean: false, skipped: true }), st }; // st: für Tests lesbar
    el.querySelector('.mg-x').onclick = () => ui.mg?.cancel();
    const say = (m) => { st.msg = m; st.msgT = performance.now(); };
    const probe = (i) => {
      if (st.phase !== 'measure' || st.probed[i]) return; st.sel = i; st.probed[i] = 1; ui.audio?.tick?.();
      if (i === bad) { say(`${parts[i].n} zeigt 0,0 V – der ist durch!`); st.phase = 'found'; setTimeout(() => { if (!st.end) { st.phase = 'solder'; say(''); } }, 900); } else say(`${parts[i].n}: ${parts[i].v} – in Ordnung`);
    };
    const release = () => {
      if (st.phase !== 'solder' || !st.hold) return; st.hold = false; const x = st.heat;
      if (x >= zone[0] && x <= zone[1]) { st.done.push('ok'); st.joint++; ui.audio?.install?.(); say('Sauber!'); }
      else { st.miss++; ui.audio?.bad?.(); say(x < zone[0] ? 'Kalte Lötstelle – noch mal, länger halten.' : 'Zu heiß – das Pad verbrennt gleich. Noch mal.'); }
      st.heat = 0;
      if (st.miss > maxMiss) { st.phase = 'fail'; setTimeout(() => finish({ ok: false, clean: false, skipped: false }), 1300); return; }
      if (st.joint >= joints) { st.phase = 'win'; setTimeout(() => finish({ ok: true, clean: st.miss === 0, skipped: false }), 1100); }
    };
    // Eingaben: Maus/Touch auf der Platine, Tastatur (Esc bricht ab)
    const hit = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); const p = hit(e); if (st.phase === 'measure') { for (let i = 0; i < 4; i++) if (Math.abs(p.x - cx(i)) < 52 && p.y > 70 && p.y < 230) probe(i); } else if (st.phase === 'solder') st.hold = true; });
    cv.addEventListener('pointerup', (e) => { e.preventDefault(); release(); }); cv.addEventListener('pointercancel', () => { st.hold = false; st.heat = 0; });
    const kd = (e) => {
      e.stopImmediatePropagation(); if (e.key === 'Escape') { e.preventDefault(); ui.mg?.cancel(); return; }
      if (st.phase === 'measure') { if (e.key === 'ArrowLeft') st.sel = (st.sel + 3) % 4; else if (e.key === 'ArrowRight') st.sel = (st.sel + 1) % 4; else if (/^[1-4]$/.test(e.key)) probe(+e.key - 1); else if (e.key === ' ' || e.key === 'Enter') probe(st.sel); e.preventDefault(); return; }
      if (st.phase === 'solder' && (e.key === ' ' || e.key === 'Enter') && !e.repeat) { st.hold = true; e.preventDefault(); }
    };
    const ku = (e) => { e.stopImmediatePropagation(); if (e.key === ' ' || e.key === 'Enter') release(); };
    window.addEventListener('keydown', kd, true); window.addEventListener('keyup', ku, true);
    // Zeichnen
    const pcb = () => { ctx.fillStyle = '#0d3b24'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(214,180,90,.35)'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 40 + i * 45); ctx.bezierCurveTo(W * 0.3, 30 + i * 47, W * 0.6, 60 + i * 40, W, 46 + i * 44); ctx.stroke(); } ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % H, 3, 3); };
    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (st.phase === 'solder' && st.hold) { st.heat += dt / heatT; if (st.heat > 1.04) { st.hold = false; st.heat = 1.04; release(); } }
      pcb();
      if (st.phase === 'measure' || st.phase === 'found') {
        info.innerHTML = 'Miss die Kondensatoren durch: <b>antippen</b> oder <kbd>1</kbd>–<kbd>4</kbd>. Einer zeigt den falschen Wert.';
        for (let i = 0; i < 4; i++) {
          const x = cx(i), p = st.probed[i], isBad = p && i === bad, sel = st.sel === i;
          ctx.fillStyle = '#1f2a33'; ctx.fillRect(x - 30, 96, 60, 92); ctx.fillStyle = isBad ? '#7a3a2a' : '#2f6fb0'; ctx.beginPath(); ctx.ellipse(x, 120, 26, 12, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 26, 120, 52, 52); ctx.beginPath(); ctx.ellipse(x, 172, 26, 12, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, 113); ctx.lineTo(x + 10, 113); ctx.moveTo(x, 108); ctx.lineTo(x, 118); ctx.stroke();
          if (isBad) { ctx.fillStyle = '#d9b27a'; ctx.beginPath(); ctx.ellipse(x, 108, 16, 7, 0, 0, 7); ctx.fill(); } // aufgebläht
          ctx.fillStyle = '#e8edf4'; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText(parts[i].n, x, 214);
          if (p) { ctx.fillStyle = isBad ? '#ff6b5a' : '#7cf0a8'; ctx.font = '700 17px ui-monospace, monospace'; ctx.fillText(isBad ? '0,0 V' : parts[i].v, x, 80); }
          if (sel && st.phase === 'measure') { ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2.5; ctx.strokeRect(x - 40, 88, 80, 136); }
        }
        // Messspitzen
        const x = cx(st.sel); ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 8, 104); ctx.lineTo(x - 40, 30); ctx.stroke(); ctx.strokeStyle = '#202020'; ctx.beginPath(); ctx.moveTo(x + 8, 104); ctx.lineTo(x + 40, 30); ctx.stroke();
      } else {
        info.innerHTML = `Lötkolben auf das Pad: <b>gedrückt halten</b> (Maus, Finger oder <kbd>Leertaste</kbd>) und im <b style="color:#3ddc84">grünen Bereich</b> loslassen.`;
        // Nahaufnahme: Bauteil mit Pads
        ctx.fillStyle = '#2f6fb0'; ctx.fillRect(150, 70, 260, 70); ctx.fillStyle = '#e8edf4'; ctx.font = '700 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`${parts[bad].n} (neu)`, 280, 112);
        for (let j = 0; j < joints; j++) {
          const x = 190 + (j * 180) / Math.max(1, joints - 1), y = 175, done = j < st.joint, cur = j === st.joint && st.phase === 'solder';
          ctx.fillStyle = '#c9a14a'; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill(); ctx.strokeStyle = '#5a4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 140); ctx.lineTo(x, y); ctx.stroke();
          if (done) { const gr = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 16); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9aa3ad'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill(); }
          if (cur) { ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.stroke(); // Lötkolben
            ctx.strokeStyle = '#888'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 6, y - 10); ctx.lineTo(x + 70, y - 90); ctx.stroke(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x + 60, y - 78); ctx.lineTo(x + 110, y - 140); ctx.stroke();
            if (st.hold) { ctx.fillStyle = `rgba(255,${Math.round(200 - st.heat * 150)},80,${0.35 + st.heat * 0.4})`; ctx.beginPath(); ctx.arc(x, y, 10 + st.heat * 8, 0, 7); ctx.fill(); for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(220,220,220,${0.15 + 0.1 * k})`; ctx.beginPath(); ctx.arc(x + 10 + k * 6, y - 20 - ((now / 8 + k * 30) % 40), 4 + k, 0, 7); ctx.fill(); } } }
        }
        // Wärmebalken mit grünem Bereich
        const bx = 470, by = 40, bh = 220; ctx.fillStyle = '#10161d'; ctx.fillRect(bx, by, 34, bh); ctx.fillStyle = 'rgba(61,220,132,.55)'; ctx.fillRect(bx, by + bh * (1 - zone[1]), 34, bh * (zone[1] - zone[0]));
        ctx.fillStyle = st.heat > zone[1] ? '#ff5a4a' : st.heat >= zone[0] ? '#3ddc84' : '#ffb000'; ctx.fillRect(bx + 6, by + bh * (1 - Math.min(1, st.heat)), 22, bh * Math.min(1, st.heat));
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.strokeRect(bx, by, 34, bh); ctx.fillStyle = '#b7c0cc'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Wärme', bx + 17, by + bh + 18);
      }
      if (st.msg && now - st.msgT < 2200) { ctx.fillStyle = 'rgba(10,12,16,.78)'; ctx.fillRect(20, H - 46, W - 40, 32); ctx.fillStyle = st.phase === 'fail' ? '#ff8a7a' : '#ffe2a8'; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText(st.msg, W / 2, H - 24); }
      if (st.phase === 'win') { ctx.fillStyle = 'rgba(10,30,18,.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#7cf0a8'; ctx.font = '800 30px system-ui'; ctx.textAlign = 'center'; ctx.fillText(st.miss ? 'Repariert!' : 'Repariert – alles sauber!', W / 2, H / 2); }
      if (st.phase === 'fail') { ctx.fillStyle = 'rgba(40,10,10,.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#ff8a7a'; ctx.font = '800 26px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Das wird so nichts …', W / 2, H / 2); }
      prog.textContent = st.phase === 'measure' || st.phase === 'found' ? 'Schritt 1 von 2 · Messen' : `Schritt 2 von 2 · Lötstelle ${Math.min(joints, st.joint + 1)} von ${joints}`;
      stat.textContent = st.miss ? `${st.miss} ${st.miss === 1 ? 'Fehlversuch' : 'Fehlversuche'} · höchstens ${maxMiss}` : easy ? 'Mit Übung: breiter grüner Bereich' : 'Tipp: Die Fähigkeit „Löten“ macht es leichter';
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
  });
}
