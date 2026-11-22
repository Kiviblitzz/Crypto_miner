"""Skizze: erzeugt eine Datei im Format von src/data/btc_daily.js aus lizenzklaren Quellen.
  --timestamps  CSV height,time  (alle Blöcke ab Genesis; eigener Bitcoin-Core-Knoten oder
                bitcoin-data/block-arrival-times qa/block-timestamps, CC0)
  --price       CSV date,close_usd (UTC-Tagesschluss), mehrfach angebbar; erste Quelle mit Wert gewinnt
Hashrate: Difficulty nach Konsensregel aus den Zeitstempeln, Tageswert = Σ D·2^32 / 86400,
dann zentriertes 7-Tage-Mittel (d-3..d+3), an den Reihenrändern gekappt (so ist die heutige Datei gebaut).
Kurs: Lücken (kein Handel) werden mit dem letzten echten Schluss gefüllt und protokolliert.
Schreibt NUR an --out (nie ins Repo schreiben, Ausgabe prüfen, dann bewusst kopieren)."""
import argparse, csv, datetime as dt, math, sys

INTERVAL, TIMESPAN = 2016, 1209600
def c2t(c):
    s, w = c >> 24, c & 0x007fffff
    return w >> 8 * (3 - s) if s <= 3 else w << 8 * (s - 3)
def t2c(t):
    s = (t.bit_length() + 7) // 8
    c = t << 8 * (3 - s) if s <= 3 else t >> 8 * (s - 3)
    if c & 0x00800000: c >>= 8; s += 1
    return c | s << 24
LIMIT = c2t(0x1d00ffff)

def daily_hash(times):
    bits = [0x1d00ffff]
    for k in range(1, len(times) // INTERVAL + 1):
        span = min(max(times[k * INTERVAL - 1] - times[(k - 1) * INTERVAL], TIMESPAN // 4), TIMESPAN * 4)
        bits.append(t2c(min(c2t(bits[-1]) * span // TIMESPAN, LIMIT)))
    work = {}
    for h in range(1, len(times)):
        d = dt.datetime.fromtimestamp(times[h], dt.UTC).date()
        work[d] = work.get(d, 0.0) + LIMIT / c2t(bits[h // INTERVAL]) * 2**32
    last_full = dt.datetime.fromtimestamp(times[-1], dt.UTC).date() - dt.timedelta(days=1)
    return {d: w / 86400 / 1e9 for d, w in work.items() if d <= last_full}, last_full

def sig(x, n):
    if x == 0: return '0'
    s = ('%.' + str(n) + 'g') % x
    if 'e' in s: s = '%.0f' % float(s)
    if s.startswith('0.'): s = s[1:]
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--timestamps', required=True); ap.add_argument('--price', action='append', required=True)
    ap.add_argument('--start', required=True); ap.add_argument('--end'); ap.add_argument('--out', required=True)
    ap.add_argument('--source-note', default='Kurs: siehe Credits; Hashrate: aus Bitcoin-Blockchain (Difficulty, Block-Zeitstempel)')
    a = ap.parse_args()
    times = [int(r[1]) for r in csv.reader(open(a.timestamps)) if r and r[0].isdigit()]
    hd, hash_end = daily_hash(times)
    prices = [{r['date']: float(r['close_usd']) for r in csv.DictReader(open(p))} for p in a.price]
    start = dt.date.fromisoformat(a.start)
    end = min(dt.date.fromisoformat(a.end) if a.end else hash_end, hash_end)
    days = [start + dt.timedelta(i) for i in range((end - start).days + 1)]
    P, H, filled, last = [], [], [], None
    for d in days:
        v = next((p[d.isoformat()] for p in prices if d.isoformat() in p), None)
        if v is None:
            if last is None: sys.exit('Kein Kurs am Starttag %s' % d)
            v = last; filled.append(d.isoformat())
        P.append(v); last = v
        win = [hd.get(d + dt.timedelta(k), 0.0) for k in range(-3, 4) if start <= d + dt.timedelta(k) <= end]
        H.append(sum(win) / len(win))
    with open(a.out, 'w') as f:
        f.write('// Echte Tageswerte für Bitcoin (Kurs in USD, Netz-Hashrate in GH/s, 7-Tage-Mittel).\n')
        f.write('// %s. Erzeugt %s mit build_btc_daily.py.\n' % (a.source_note, dt.date.today()))
        f.write("export const BTC_DAILY_FIRST = '%s';\n" % start.isoformat())
        f.write('export const BTC_DAILY_PRICE = [%s];\n' % ','.join(sig(x, 4) for x in P))
        f.write('export const BTC_DAILY_HASH_GH = [%s];\n' % ','.join(sig(x, 3) for x in H))
    print('Tage %d (%s..%s), Kurs-Lücken mit Vortagesschluss gefüllt: %d %s' % (
        len(days), days[0], days[-1], len(filled), filled[:10]))

if __name__ == '__main__':
    main()
