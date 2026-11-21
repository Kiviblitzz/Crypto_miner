"""Vergleich eigene Hashrate (aus Blockchain) vs. BTC_DAILY_HASH_GH (Coin Metrics, 7-Tage-Mittel)."""
import csv, sys, statistics as st, collections
ref = {r['date']: float(r['hash_gh']) for r in csv.DictReader(open(sys.argv[1]))}
rows = list(csv.DictReader(open(sys.argv[2])))
dates = [r['date'] for r in rows]; day = [float(r['hash_gh_day']) for r in rows]
def roll(v, lo, hi):
    out = []
    for i in range(len(v)):
        if i + lo < 0 or i + hi >= len(v): out.append(None); continue
        out.append(sum(v[i + lo:i + hi + 1]) / (hi - lo + 1))
    return out
variants = {'Tag roh': day, '7T nachlaufend (d-6..d)': roll(day, -6, 0),
            '7T zentriert (d-3..d+3)': roll(day, -3, 3), '7T (d-7..d-1)': roll(day, -7, -1),
            '7T (d-5..d+1)': roll(day, -5, 1)}
best = None
for name, v in variants.items():
    dev = [100 * (v[i] / ref[d] - 1) for i, d in enumerate(dates) if d in ref and v[i]]
    mad = st.mean(abs(x) for x in dev)
    print('%-26s n=%d  mittl.|Abw.|=%.2f%%  Median=%.2f%%  P95=%.2f%%  max=%.1f%%  Bias=%+.2f%%' % (
        name, len(dev), mad, st.median(abs(x) for x in dev), sorted(abs(x) for x in dev)[int(.95 * len(dev))],
        max(abs(x) for x in dev), st.mean(dev)))
    if best is None or mad < best[1]: best = (name, mad, v)
name, _, v = best
print('\nBeste Variante:', name)
by = collections.defaultdict(list); out = []
for i, d in enumerate(dates):
    if d in ref and v[i]:
        x = 100 * (v[i] / ref[d] - 1); by[d[:4]].append(x); out.append((abs(x), d, v[i], ref[d], x))
for y in sorted(by):
    print(' %s  n=%3d  mittl.|Abw.|=%.2f%%  max=%.1f%%  Bias=%+.2f%%' % (y, len(by[y]), st.mean(abs(x) for x in by[y]),
          max(abs(x) for x in by[y]), st.mean(by[y])))
print('\nTop-10 Ausreißer (Datum, eigen GH/s, CM GH/s, Abw.):')
for a, d, mine, r, x in sorted(out, reverse=True)[:10]:
    print('  %s  %.4g  %.4g  %+.1f%%' % (d, mine, r, x))
if len(sys.argv) > 3:
    with open(sys.argv[3], 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['date', 'hash_gh_eigen', 'hash_gh_cm', 'abw_prozent'])
        for a, d, mine, r, x in sorted(out, key=lambda t: t[1]): w.writerow([d, '%.5g' % mine, r, '%.2f' % x])
