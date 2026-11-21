"""Vergleich eigener Tageskurs vs. BTC_DAILY_PRICE (Coin Metrics PriceUSD, Schluss 00:00 UTC)."""
import csv, sys, statistics as st, collections
ref = {r['date']: float(r['price_usd']) for r in csv.DictReader(open(sys.argv[1]))}
col = sys.argv[3] if len(sys.argv) > 3 else 'close_usd'
mine = {r['date']: float(r[col]) for r in csv.DictReader(open(sys.argv[2]))}
common = sorted(set(ref) & set(mine))
dev = [(100 * (mine[d] / ref[d] - 1), d) for d in common]
a = [abs(x) for x, _ in dev]
print('Spalte %s: n=%d (%s..%s), fehlend ggü. Ref: %d Tage' % (col, len(dev), common[0], common[-1],
      len([d for d in ref if common[0] <= d <= common[-1] and d not in mine])))
print('  mittl.|Abw.|=%.2f%%  Median=%.2f%%  P95=%.2f%%  P99=%.2f%%  max=%.1f%%  Bias=%+.2f%%' % (
    st.mean(a), st.median(a), sorted(a)[int(.95 * len(a))], sorted(a)[int(.99 * len(a))], max(a), st.mean(x for x, _ in dev)))
by = collections.defaultdict(list)
for x, d in dev: by[d[:4]].append(x)
for y in sorted(by):
    b = [abs(x) for x in by[y]]
    print('   %s n=%3d mittl.|Abw.|=%.2f%% Median=%.2f%% max=%.1f%% Bias=%+.2f%%' % (y, len(b), st.mean(b), st.median(b), max(b), st.mean(by[y])))
print('  Top-8 Ausreißer:')
for x, d in sorted(dev, key=lambda t: -abs(t[0]))[:8]:
    print('   %s eigen=%.6g ref=%.6g %+.1f%%' % (d, mine[d], ref[d], x))
