"""Tagesschluss (UTC) aus 1-Minuten-OHLC (timestamp=Öffnungszeit, Sekunden).
Schluss = close der letzten Minute des Tages mit Umsatz (volume>0); zusätzlich VWAP des Tages.
Mehrere Eingabedateien (.csv oder .csv.gz) werden zusammengeführt (spätere überschreiben frühere)."""
import csv, gzip, sys, datetime
out = sys.argv[1]; day = {}
for fn in sys.argv[2:]:
    f = gzip.open(fn, 'rt') if fn.endswith('.gz') else open(fn)
    r = csv.reader(f); next(r)
    for ts, o, h, l, c, v in r:
        ts = int(float(ts)); v = float(v)
        if v <= 0: continue
        d = datetime.datetime.fromtimestamp(ts, datetime.UTC).date().isoformat()
        e = day.get(d)
        if e is None: e = day[d] = [0, 0.0, 0.0, 0.0]
        if ts >= e[0]: e[0], e[1] = ts, float(c)
        e[2] += v * (float(h) + float(l) + float(c)) / 3; e[3] += v
with open(out, 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['date', 'close_usd', 'last_trade_minute_utc', 'vwap_usd', 'volume_btc'])
    for d in sorted(day):
        ts, c, pv, v = day[d]
        w.writerow([d, c, datetime.datetime.fromtimestamp(ts, datetime.UTC).strftime('%H:%M'), '%.6g' % (pv / v), '%.4f' % v])
print('Tage', len(day), min(day), max(day))
