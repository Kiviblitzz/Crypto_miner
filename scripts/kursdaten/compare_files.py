"""Vergleicht zwei Dateien im btc_daily.js-Format (alt = Referenz, neu = Kandidat), nur lesend."""
import re, sys, datetime as dt, statistics as st, collections
def load(fn):
    s = open(fn).read()
    first = dt.date.fromisoformat(re.search(r"BTC_DAILY_FIRST = '([\d-]+)'", s).group(1))
    arr = lambda n: [float(x) for x in re.search(n + r' = \[([^\]]*)\]', s).group(1).split(',')]
    p, h = arr('BTC_DAILY_PRICE'), arr('BTC_DAILY_HASH_GH')
    return {(first + dt.timedelta(i)).isoformat(): (p[i], h[i]) for i in range(len(p))}
ref, new = load(sys.argv[1]), load(sys.argv[2])
common = sorted(set(ref) & set(new))
print('gemeinsame Tage: %d (%s..%s)' % (len(common), common[0], common[-1]))
for idx, name in ((0, 'Kurs'), (1, 'Hashrate')):
    dev = [(100 * (new[d][idx] / ref[d][idx] - 1), d) for d in common]
    a = [abs(x) for x, _ in dev]; by = collections.defaultdict(list)
    for x, d in dev: by[d[:4]].append(abs(x))
    print('%-9s mittl.|Abw.|=%.2f%%  Median=%.2f%%  P95=%.2f%%  max=%.1f%% (%s)  Tage >5%%: %d' % (
        name, st.mean(a), st.median(a), sorted(a)[int(.95 * len(a))], max(a), max(dev, key=lambda t: abs(t[0]))[1],
        sum(1 for x in a if x > 5)))
    print('          je Jahr mittl.|Abw.|: ' + '  '.join('%s:%.2f' % (y, st.mean(v)) for y, v in sorted(by.items())))
