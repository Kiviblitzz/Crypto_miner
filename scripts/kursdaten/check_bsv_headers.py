"""Dritte Gegenprobe: Zeitstempel/Bits aus 80-Byte-Headerdateien (gemeinsame Historie bis Höhe 478558)
gegen die CC0-Zeitstempelliste; prüft auch die Hash-Verkettung."""
import struct, hashlib, sys, csv
times = [int(r[1]) for r in csv.reader(open(sys.argv[1]))]
prev = b'\0' * 32; h = 0; bad = 0
for fn in sys.argv[2:]:
    data = open(fn, 'rb').read()
    for i in range(0, len(data), 80):
        hdr = data[i:i + 80]
        if h > 478558: break
        assert hdr[4:36] == prev, 'Kette bricht bei %d' % h
        prev = hashlib.sha256(hashlib.sha256(hdr).digest()).digest()
        if struct.unpack('<I', hdr[68:72])[0] != times[h]: bad += 1
        h += 1
print('Header geprüft bis Höhe', h - 1, 'Zeitstempel-Abweichungen:', bad, 'letzter Hash', prev[::-1].hex())
