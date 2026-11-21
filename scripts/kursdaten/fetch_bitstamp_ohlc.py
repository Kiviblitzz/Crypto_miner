"""Skizze (hier NICHT getestet: www.bitstamp.net ist aus dem Container gesperrt).
Holt Bitstamp-Tageskerzen BTC/USD über die offizielle öffentliche API und schreibt date,close_usd.
Erst nutzen, wenn die kommerzielle Nutzung mit Bitstamp geklärt ist (partners@bitstamp.net).
API: GET /api/v2/ohlc/btcusd/?step=86400&limit=1000&start=<unix>  (timestamp = Öffnung 00:00 UTC)."""
import csv, json, sys, time, urllib.request, datetime as dt
URL = 'https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=86400&limit=1000&start=%d'
def main(out, start='2011-08-01'):
    t = int(dt.datetime.fromisoformat(start).replace(tzinfo=dt.UTC).timestamp()); rows = {}
    while True:
        req = urllib.request.Request(URL % t, headers={'User-Agent': 'data-build-script'})
        data = json.load(urllib.request.urlopen(req, timeout=60))['data']['ohlc']
        new = [c for c in data if int(c['timestamp']) not in rows]
        for c in new:
            if float(c['volume']) > 0: rows[int(c['timestamp'])] = float(c['close'])
        if not new: break
        t = max(int(c['timestamp']) for c in data) + 86400
        time.sleep(1)  # höflich bleiben
    with open(out, 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['date', 'close_usd'])
        for ts in sorted(rows): w.writerow([dt.datetime.fromtimestamp(ts, dt.UTC).date().isoformat(), rows[ts]])
    print('Tage', len(rows))
if __name__ == '__main__':
    main(*sys.argv[1:])
