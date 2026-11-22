"""Fallback ohne Einzelblock-Zeitstempel: nur Difficulty + Startzeit je 2016er-Periode
(z.B. bitcoinj-Checkpoints). H_k = D_k * 2^32 * 2016 / (t_{k+1}-t_k); jeder Tag bekommt
den zeitgewichteten Wert der Perioden, die ihn überdecken. Vergleich mit Coin Metrics."""
import csv, sys, datetime, statistics as st
P = list(csv.DictReader(open(sys.argv[1])))
ref = {r['date']: float(r['hash_gh']) for r in csv.DictReader(open(sys.argv[2]))}
seg = []  # (t0, t1, H in GH/s)
for a, b in zip(P, P[1:]):
    t0, t1 = int(a['start_time']), int(b['start_time'])
    seg.append((t0, t1, float(a['difficulty']) * 2**32 * 2016 / (t1 - t0) / 1e9))
def day_value(d):
    s = datetime.datetime(d.year, d.month, d.day, tzinfo=datetime.UTC).timestamp(); e = s + 86400
    acc = w = 0
    for t0, t1, h in seg:
        o = min(e, t1) - max(s, t0)
        if o > 0: acc += h * o; w += o
    return acc / w if w == 86400 else None
dev = []
for ds, r in ref.items():
    v = day_value(datetime.date.fromisoformat(ds))
    if v: dev.append((100 * (v / r - 1), ds))
a = [abs(x) for x, _ in dev]
print('Nur-Perioden-Methode: n=%d  mittl.|Abw.|=%.2f%%  Median=%.2f%%  P95=%.2f%%  max=%.1f%% (%s)' % (
    len(a), st.mean(a), st.median(a), sorted(a)[int(.95 * len(a))], max(a), max(dev, key=lambda t: abs(t[0]))[1]))
