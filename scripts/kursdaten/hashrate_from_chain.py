"""Hashrate aus Blockchain-Fakten.
Eingabe: CSV height,time (Header-Zeitstempel aller Blöcke, z.B. aus Bitcoin Core REST/RPC
oder bitcoin-data/block-arrival-times qa/block-timestamps, CC0).
1) Difficulty je Periode wird nach der Konsensregel (Bitcoin Core pow.cpp) aus den Zeitstempeln
   nachgerechnet -> kein Fremddatensatz für Difficulty nötig.
2) Tageshashrate = Summe(Difficulty * 2^32 der Blöcke mit Zeitstempel an diesem UTC-Tag) / 86400.
3) 7-Tage-Mittel (nachlaufend: Tage d-6..d).
Ausgabe: CSV date,blocks,hash_gh_day,hash_gh_7d  sowie periods.csv (height,bits,difficulty).
Optionale Prüfung gegen bitcoinj-Checkpoints (Apache-2.0) und Electrum-Checkpoints (MIT)."""
import csv, json, sys, datetime, argparse

INTERVAL, TIMESPAN = 2016, 14 * 24 * 3600
def compact_to_target(c):
    size, word = c >> 24, c & 0x007fffff
    return word >> 8 * (3 - size) if size <= 3 else word << 8 * (size - 3)
def target_to_compact(t):
    size = (t.bit_length() + 7) // 8
    c = t << 8 * (3 - size) if size <= 3 else t >> 8 * (size - 3)
    if c & 0x00800000:
        c >>= 8; size += 1
    return c | size << 24
POW_LIMIT = compact_to_target(0x1d00ffff)  # = Difficulty 1

def difficulty(bits): return POW_LIMIT / compact_to_target(bits)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('timestamps'); ap.add_argument('out_daily'); ap.add_argument('out_periods')
    ap.add_argument('--bitcoinj'); ap.add_argument('--electrum')
    a = ap.parse_args()
    times = []
    for row in csv.reader(open(a.timestamps)):
        h, t = int(row[0]), int(row[1])
        assert h == len(times), 'Lücke bei Höhe %d' % h
        times.append(t)
    n = len(times)
    # 1) Difficulty je Periode nach Konsensregel
    bits = [0x1d00ffff]
    for k in range(1, n // INTERVAL + 1):
        first, last = (k - 1) * INTERVAL, k * INTERVAL - 1
        span = min(max(times[last] - times[first], TIMESPAN // 4), TIMESPAN * 4)
        new = compact_to_target(bits[-1]) * span // TIMESPAN
        bits.append(target_to_compact(min(new, POW_LIMIT)))
    with open(a.out_periods, 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['period', 'start_height', 'bits', 'difficulty', 'start_time'])
        for k, b in enumerate(bits):
            if k * INTERVAL < n:
                w.writerow([k, k * INTERVAL, '%08x' % b, '%.6f' % difficulty(b), times[k * INTERVAL]])
    # Prüfung gegen unabhängige Checkpoints
    if a.bitcoinj:
        bad = ok = 0
        for r in csv.DictReader(open(a.bitcoinj)):
            h = int(r['height']); k = h // INTERVAL
            if h < n and k < len(bits):
                if int(r['bits'], 16) == bits[k] and int(r['time']) == times[h]: ok += 1
                else: bad += 1; print('bitcoinj Abweichung', h, r['bits'], '%08x' % bits[k], r['time'], times[h])
        print('bitcoinj-Checkpoints: %d gleich, %d abweichend' % (ok, bad))
    if a.electrum:
        cp = json.load(open(a.electrum)); bad = ok = 0
        for idx, (_, tgt) in enumerate(cp):  # Eintrag idx = Target der Periode idx+1
            k = idx + 1
            if k < len(bits) and k * INTERVAL < n:
                if compact_to_target(bits[k]) == tgt: ok += 1
                else: bad += 1; print('electrum Abweichung Periode', k)
        print('Electrum-Checkpoints: %d gleich, %d abweichend' % (ok, bad))
    # 2) Tageswerte
    day_work, day_blocks = {}, {}
    for h in range(1, n):
        d = datetime.datetime.fromtimestamp(times[h], datetime.UTC).date()
        day_work[d] = day_work.get(d, 0.0) + difficulty(bits[h // INTERVAL]) * 2**32
        day_blocks[d] = day_blocks.get(d, 0) + 1
    d0, d1 = min(day_work), max(day_work)
    # letzter Tag ist unvollständig -> weglassen
    d1 = datetime.datetime.fromtimestamp(times[-1], datetime.UTC).date() - datetime.timedelta(days=1)
    days, d = [], d0
    while d <= d1:
        days.append(d); d += datetime.timedelta(days=1)
    daily = [day_work.get(d, 0.0) / 86400 / 1e9 for d in days]  # GH/s
    with open(a.out_daily, 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['date', 'blocks', 'hash_gh_day', 'hash_gh_7d'])
        for i, d in enumerate(days):
            m7 = sum(daily[i - 6:i + 1]) / 7 if i >= 6 else ''
            w.writerow([d.isoformat(), day_blocks.get(d, 0), '%.6g' % daily[i], ('%.6g' % m7) if m7 != '' else ''])
    print('Tage', len(days), days[0], '-', days[-1], 'Perioden', len(bits))

if __name__ == '__main__':
    main()
